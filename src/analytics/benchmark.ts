import { ScenarioId } from '../types/scenario';
import { SCENARIO_DEFINITIONS } from '../simulation/scenarios';
import { createIndianRoadModel } from '../simulation/road';
import { createInitialEgoVehicle, stepEgoVehicleKinematics } from '../simulation/vehicle';
import { stepSurroundingActors } from '../simulation/actors';
import { detectObjects } from '../perception/detector';
import { ActorTracker } from '../perception/tracker';
import { predictActorTrajectories } from '../prediction/predictor';
import { evaluateGlobalRisk } from '../risk/riskScore';
import { planPath } from '../planning/planner';
import { calculateSteeringCommand } from '../control/steeringController';
import { calculateSpeedCommand } from '../control/speedController';
import { checkOrientedBoxCollision } from '../utils/geometry';
import { euclideanDistance } from '../utils/math';

export interface BenchmarkMetrics {
  scenarioId: ScenarioId;
  mode: 'BASELINE_REACTIVE' | 'ADAPTIVE_PREDICTIVE';
  collisions: number;
  nearMisses: number;
  minimumClearanceM: number;
  minimumTTCSeconds: number;
  averageSpeedKmh: number;
  emergencyBrakingCount: number;
  scenarioCompleted: boolean;
  completionTimeSec: number;
}

export interface BenchmarkComparison {
  baseline: BenchmarkMetrics;
  adaptive: BenchmarkMetrics;
  safetyImprovementPct: number;
  clearanceGainPct: number;
  rawClearanceGainM: number;
}

/**
 * Runs a deterministic headless simulation of a scenario for both Baseline Reactive and
 * Adaptive Predictive algorithms to provide rigorous empirical benchmark comparisons.
 */
export function runDeterministicBenchmark(scenarioId: ScenarioId = 'SUDDEN_CROSSING'): BenchmarkComparison {
  const scenario = SCENARIO_DEFINITIONS[scenarioId];
  const dt = 0.04; // 25 Hz simulation rate
  const maxDuration = 12.0; // seconds

  // --- 1. Run Baseline Reactive ---
  const baseline = runSimulationInstance(scenario, 'BASELINE_REACTIVE', dt, maxDuration);

  // --- 2. Run Adaptive Predictive ---
  const adaptive = runSimulationInstance(scenario, 'ADAPTIVE_PREDICTIVE', dt, maxDuration);

  // Calculate raw and comparative metrics
  const rawClearanceGainM = Math.round((adaptive.minimumClearanceM - baseline.minimumClearanceM) * 100) / 100;

  const safetyImprovementPct =
    baseline.collisions > 0
      ? Math.round(((baseline.collisions - adaptive.collisions) / baseline.collisions) * 100)
      : (baseline.minimumClearanceM >= 0.5
          ? Math.round((rawClearanceGainM / baseline.minimumClearanceM) * 100)
          : 0);

  // Note on SIH26037 Engineering Audit:
  // When baseline clearance is near zero (e.g. 0.10m grazing), computing (1.90 - 0.10)/0.10 * 100 yields an
  // inflated 1800% figure due to division by an infinitesimal baseline.
  // We record rawClearanceGainM (+1.80m) as the primary engineering truth.
  const clearanceGainPct =
    baseline.minimumClearanceM >= 0.5
      ? Math.round((rawClearanceGainM / baseline.minimumClearanceM) * 100)
      : Math.round(rawClearanceGainM * 100);

  return {
    baseline,
    adaptive,
    safetyImprovementPct: Math.max(0, safetyImprovementPct),
    clearanceGainPct,
    rawClearanceGainM,
  };
}

function runSimulationInstance(
  scenario: typeof SCENARIO_DEFINITIONS[ScenarioId],
  mode: 'BASELINE_REACTIVE' | 'ADAPTIVE_PREDICTIVE',
  dt: number,
  maxDuration: number
): BenchmarkMetrics {
  const road = createIndianRoadModel({
    nominalWidth: scenario.roadWidth,
    laneConfidence: scenario.laneConfidence,
    potholes: scenario.initialPotholes,
    irregularBorders: true,
  });

  let ego = createInitialEgoVehicle('SEDAN', 'AUTONOMOUS', scenario.defaultSpeedKmh);
  let actors = JSON.parse(JSON.stringify(scenario.initialActors));
  const tracker = new ActorTracker();

  let collisions = 0;
  let nearMisses = 0;
  let minClearance = 99.0;
  let minTTC = 99.0;
  let speedSum = 0;
  let ticks = 0;
  let emergencyBrakeCount = 0;
  let simTime = 0;

  while (simTime < maxDuration) {
    simTime += dt;
    ticks++;

    // Step actors
    actors = stepSurroundingActors(actors, ego, road, dt, simTime);

    // Detections & tracking
    const detections = detectObjects(actors, ego);
    const trackedActors = tracker.update(detections, ego, simTime, dt);

    let commandedSteer = 0;
    let commandedAccel = 0;

    if (mode === 'BASELINE_REACTIVE') {
      // BASELINE: Simplistic reactive behavior
      // Only looks at immediate obstacle directly in front (< 14m)
      const directObstacle = trackedActors.find(
        a => a.longitudinalDistance > 0 && a.longitudinalDistance < 14 && Math.abs(a.lateralDistance) < 1.4
      );

      if (directObstacle) {
        // Late reactive swerve without speed adaptation or prediction
        commandedSteer = directObstacle.lateralDistance > 0 ? -0.4 : 0.4;
        commandedAccel = -3.5; // Mild reactive braking
      } else {
        commandedSteer = -ego.x * 0.15; // lane keep
        commandedAccel = (ego.dimensions.maxSpeed * 0.55 - ego.speed) * 1.2;
      }
    } else {
      // ADAPTIVE: Full predictive risk-aware planning
      const predictions = predictActorTrajectories(trackedActors);
      const riskState = evaluateGlobalRisk(trackedActors, ego, road, predictions);
      const plan = planPath(ego, road, trackedActors, predictions, riskState, simTime);

      const selectedCandidate = plan.candidates[plan.selectedPathId];
      commandedSteer = calculateSteeringCommand(ego, selectedCandidate);
      commandedAccel = calculateSpeedCommand(ego, plan.targetSpeed, plan.decision, dt);

      if (plan.decision === 'EMERGENCY_BRAKE') {
        emergencyBrakeCount++;
      }
    }

    // Step ego kinematics
    ego = stepEgoVehicleKinematics(ego, commandedSteer, commandedAccel, dt);
    speedSum += ego.speed;

    // Check collisions
    const egoBox = {
      x: ego.x,
      y: ego.y,
      length: ego.dimensions.length,
      width: ego.dimensions.width,
      heading: ego.heading,
    };

    for (const actor of actors) {
      const actorBox = {
        x: actor.x,
        y: actor.y,
        length: actor.length,
        width: actor.width,
        heading: actor.heading,
      };

      const dist = euclideanDistance(ego.x, ego.y, actor.x, actor.y) - (ego.dimensions.width + actor.width) / 2;
      if (dist < minClearance) minClearance = dist;
      if (dist < 0.6 && dist > 0) nearMisses++;

      if (checkOrientedBoxCollision(egoBox, actorBox)) {
        collisions++;
      }
    }

    for (const actor of trackedActors) {
      if (isFinite(actor.timeToCollision) && actor.timeToCollision < minTTC) {
        minTTC = actor.timeToCollision;
      }
    }
  }

  return {
    scenarioId: scenario.id,
    mode,
    collisions,
    nearMisses,
    minimumClearanceM: minClearance === 99.0 ? 0 : Math.round(minClearance * 10) / 10,
    minimumTTCSeconds: minTTC === 99.0 ? 0 : Math.round(minTTC * 10) / 10,
    averageSpeedKmh: Math.round((speedSum / Math.max(1, ticks)) * 3.6 * 10) / 10,
    emergencyBrakingCount: emergencyBrakeCount,
    scenarioCompleted: collisions === 0,
    completionTimeSec: maxDuration,
  };
}
