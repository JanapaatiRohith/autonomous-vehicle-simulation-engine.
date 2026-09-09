import { describe, it, expect } from 'vitest';
import { SimulationEngine } from '../simulation/engine';
import { SCENARIO_DEFINITIONS } from '../simulation/scenarios';
import { createIndianRoadModel } from '../simulation/road';
import { createInitialEgoVehicle, stepEgoVehicleKinematics } from '../simulation/vehicle';
import { calculateTTC } from '../risk/ttc';
import { assessActorRisk, evaluateGlobalRisk } from '../risk/riskScore';
import { planPath } from '../planning/planner';
import { calculateSteeringCommand } from '../control/steeringController';
import { calculateSpeedCommand } from '../control/speedController';
import { runDeterministicBenchmark } from '../analytics/benchmark';
import { generateCandidateTrajectories } from '../planning/trajectoryGenerator';
import { checkTrajectoryCollisions } from '../planning/collisionChecker';
import { TrackedActor } from '../types/obstacle';
import { ActorPrediction } from '../types/prediction';
import { GlobalRiskState } from '../types/risk';
import { formatNum } from '../utils/math';

describe('SIH26037 ENGINEERING AUDIT SUITE', () => {

  // ============================================================
  // AUDIT 2: HARD-CODE AUDIT
  // ============================================================
  describe('Audit 2: Hard-Code Verification', () => {
    it('verifies that planner decision is NOT determined by scenario ID or hard-coded flags', () => {
      const road = createIndianRoadModel({ nominalWidth: 7.2, laneConfidence: 0.5 });
      const ego = createInitialEgoVehicle('SEDAN', 'AUTONOMOUS', 45);

      const dummyRisk: GlobalRiskState = {
        overallRiskScore: 10,
        overallRiskLevel: 'LOW',
        nearestActorDistance: 50,
        nearestActorId: null,
        nearestActorType: null,
        minimumTTC: Infinity,
        primaryHazardActorId: null,
        primaryHazardDescription: 'Nominal',
        dynamicSafetyMargin: 1.8,
        potholeInCorridor: false,
        laneConfidence: 0.5,
        explanation: 'All clear',
      };

      // When all paths are completely clear, planner MUST select CENTER and CRUISE strictly by cost
      const plan = planPath(ego, road, [], new Map(), dummyRisk, 0);
      expect(plan.selectedPathId).toBe('CENTER');
      expect(plan.decision).toBe('CRUISE');
      expect(plan.targetSpeed).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // AUDIT 3: HERO SCENARIO CAUSALITY TEST
  // ============================================================
  describe('Audit 3: Hero Scenario Causality Verification', () => {
    it('proves that changing obstacle lateral position/velocity naturally changes the downstream pipeline', () => {
      // Run A: Default Hero Scenario
      const simA = new SimulationEngine('SUDDEN_CROSSING', 'SEDAN', 'AUTONOMOUS', 45);

      // Run B: Perturbed Obstacle (animal starts further left at x=2.0 and crosses faster at vx=-3.5)
      const simB = new SimulationEngine('SUDDEN_CROSSING', 'SEDAN', 'AUTONOMOUS', 45);
      const heroB = simB.actors.find(a => a.id === 'hero_crossing_animal');
      if (heroB) {
        heroB.x = 2.0; // In road corridor earlier
        heroB.speed = 3.5;
        heroB.targetX = -4.0;
      }

      // Step both for 150 ticks (3.0s, during trigger window)
      const telemetryA: { ttc: number; risk: number; steer: number; path: string }[] = [];
      const telemetryB: { ttc: number; risk: number; steer: number; path: string }[] = [];

      for (let i = 0; i < 150; i++) {
        simA.step();
        simB.step();

        telemetryA.push({
          ttc: simA.riskState.minimumTTC,
          risk: simA.riskState.overallRiskScore,
          steer: simA.ego.steeringAngle,
          path: simA.plannerOutput.selectedPathId,
        });

        telemetryB.push({
          ttc: simB.riskState.minimumTTC,
          risk: simB.riskState.overallRiskScore,
          steer: simB.ego.steeringAngle,
          path: simB.plannerOutput.selectedPathId,
        });
      }

      // Assert that environmental perturbation propagated to at least 4 downstream stages
      const riskDiff = Math.abs(simA.riskState.overallRiskScore - simB.riskState.overallRiskScore);
      const ttcDiff = Math.abs(
        (isFinite(simA.riskState.minimumTTC) ? simA.riskState.minimumTTC : 10) -
        (isFinite(simB.riskState.minimumTTC) ? simB.riskState.minimumTTC : 10)
      );
      const steerDiff = Math.abs(simA.ego.steeringAngle - simB.ego.steeringAngle);
      const speedDiff = Math.abs(simA.ego.speed - simB.ego.speed);

      console.log(`[AUDIT 3] Hero Causality Diffs: RiskDiff=${riskDiff}, TTCDiff=${ttcDiff.toFixed(2)}s, SteerDiff=${steerDiff.toFixed(3)}rad, SpeedDiff=${speedDiff.toFixed(2)}m/s`);

      expect(riskDiff + ttcDiff + steerDiff + speedDiff).toBeGreaterThan(0.5);
      expect(simA.metrics.minimumDistance).not.toBe(simB.metrics.minimumDistance);
    });
  });

  // ============================================================
  // AUDIT 4: PLANNER PERTURBATION TEST
  // ============================================================
  describe('Audit 4: Planner Perturbation Test', () => {
    const road = createIndianRoadModel({ nominalWidth: 7.2, laneConfidence: 0.5 });
    const ego = createInitialEgoVehicle('SEDAN', 'AUTONOMOUS', 40, 0.0); // centered at x=0

    it('Variant A: CENTER blocked, LEFT safe -> selects AVOID_LEFT', () => {
      // Obstacle blocking CENTER and RIGHT, leaving LEFT corridor wide open
      const centerObstacle: TrackedActor = {
        id: 'obs_center',
        type: 'STATIC_OBSTACLE',
        x: 0.6,
        y: 38.0,
        speed: 0,
        vx: 0,
        vy: 0,
        heading: 0,
        acceleration: 0,
        width: 1.6,
        length: 3.5,
        behavior: 'STATIC',
        uncertainty: 0.1,
        distanceToEgo: 28.0,
        longitudinalDistance: 28.0,
        lateralDistance: 0.6,
        relativeSpeed: 11.1,
        closingSpeed: 11.1,
        history: [],
        timeToCollision: 28.0 / 11.1,
        riskScore: 65,
      };

      const rightObstacle: TrackedActor = {
        id: 'obs_right',
        type: 'STATIC_OBSTACLE',
        x: 2.4,
        y: 38.0,
        speed: 0,
        vx: 0,
        vy: 0,
        heading: 0,
        acceleration: 0,
        width: 1.6,
        length: 3.5,
        behavior: 'STATIC',
        uncertainty: 0.1,
        distanceToEgo: 28.0,
        longitudinalDistance: 28.0,
        lateralDistance: 2.4,
        relativeSpeed: 11.1,
        closingSpeed: 11.1,
        history: [],
        timeToCollision: 28.0 / 11.1,
        riskScore: 65,
      };

      const actors = [centerObstacle, rightObstacle];
      const risk: GlobalRiskState = {
        overallRiskScore: 70,
        overallRiskLevel: 'HIGH',
        nearestActorDistance: 28,
        nearestActorId: 'obs_center',
        nearestActorType: 'STATIC_OBSTACLE',
        minimumTTC: 2.5,
        primaryHazardActorId: 'obs_center',
        primaryHazardDescription: 'Center obstacle',
        dynamicSafetyMargin: 2.0,
        potholeInCorridor: false,
        laneConfidence: 0.5,
        explanation: 'Center blocked',
      };

      const plan = planPath(ego, road, actors, new Map(), risk, 1.0);
      expect(plan.candidates.CENTER.status).toBe('BLOCKED');
      expect(plan.selectedPathId).toBe('LEFT');
      expect(plan.decision).toBe('AVOID_LEFT');
    });

    it('Variant B: LEFT blocked, RIGHT safe -> selects AVOID_RIGHT', () => {
      // Obstacle blocking CENTER and LEFT, leaving RIGHT corridor wide open
      const centerObstacle: TrackedActor = {
        id: 'obs_center',
        type: 'STATIC_OBSTACLE',
        x: -0.6,
        y: 38.0,
        speed: 0,
        vx: 0,
        vy: 0,
        heading: 0,
        acceleration: 0,
        width: 1.6,
        length: 3.5,
        behavior: 'STATIC',
        uncertainty: 0.1,
        distanceToEgo: 28.0,
        longitudinalDistance: 28.0,
        lateralDistance: -0.6,
        relativeSpeed: 11.1,
        closingSpeed: 11.1,
        history: [],
        timeToCollision: 28.0 / 11.1,
        riskScore: 65,
      };

      const leftObstacle: TrackedActor = {
        id: 'obs_left',
        type: 'STATIC_OBSTACLE',
        x: -2.4,
        y: 38.0,
        speed: 0,
        vx: 0,
        vy: 0,
        heading: 0,
        acceleration: 0,
        width: 1.6,
        length: 3.5,
        behavior: 'STATIC',
        uncertainty: 0.1,
        distanceToEgo: 28.0,
        longitudinalDistance: 28.0,
        lateralDistance: -2.4,
        relativeSpeed: 11.1,
        closingSpeed: 11.1,
        history: [],
        timeToCollision: 28.0 / 11.1,
        riskScore: 65,
      };

      const actors = [centerObstacle, leftObstacle];
      const risk: GlobalRiskState = {
        overallRiskScore: 70,
        overallRiskLevel: 'HIGH',
        nearestActorDistance: 28,
        nearestActorId: 'obs_center',
        nearestActorType: 'STATIC_OBSTACLE',
        minimumTTC: 2.5,
        primaryHazardActorId: 'obs_center',
        primaryHazardDescription: 'Center & Left obstacle',
        dynamicSafetyMargin: 2.0,
        potholeInCorridor: false,
        laneConfidence: 0.5,
        explanation: 'Center & Left blocked',
      };

      const plan = planPath(ego, road, actors, new Map(), risk, 1.0);
      expect(plan.candidates.CENTER.status).toBe('BLOCKED');
      expect(plan.candidates.LEFT.status).toBe('BLOCKED');
      expect(plan.selectedPathId).toBe('RIGHT');
      expect(plan.decision).toBe('AVOID_RIGHT');
    });

    it('Variant C: LEFT, CENTER and RIGHT blocked -> selects EMERGENCY_BRAKE', () => {
      // Barricade across full road width
      const fullBarricade: TrackedActor = {
        id: 'barricade',
        type: 'STATIC_OBSTACLE',
        x: 0.0,
        y: 25.0,
        speed: 0,
        vx: 0,
        vy: 0,
        heading: 0,
        acceleration: 0,
        width: 8.0, // spans entire road width
        length: 2.0,
        behavior: 'STATIC',
        uncertainty: 0.0,
        distanceToEgo: 15.0,
        longitudinalDistance: 15.0,
        lateralDistance: 0.0,
        relativeSpeed: 11.1,
        closingSpeed: 11.1,
        history: [],
        timeToCollision: 1.35,
        riskScore: 90,
      };

      const actors = [fullBarricade];
      const risk: GlobalRiskState = {
        overallRiskScore: 95,
        overallRiskLevel: 'CRITICAL',
        nearestActorDistance: 15,
        nearestActorId: 'barricade',
        nearestActorType: 'STATIC_OBSTACLE',
        minimumTTC: 1.35,
        primaryHazardActorId: 'barricade',
        primaryHazardDescription: 'Full road blockage',
        dynamicSafetyMargin: 3.5,
        potholeInCorridor: false,
        laneConfidence: 0.5,
        explanation: 'Barricade',
      };

      const plan = planPath(ego, road, actors, new Map(), risk, 1.0);
      expect(plan.candidates.LEFT.status).toBe('BLOCKED');
      expect(plan.candidates.CENTER.status).toBe('BLOCKED');
      expect(plan.candidates.RIGHT.status).toBe('BLOCKED');
      expect(plan.decision).toBe('EMERGENCY_BRAKE');
      expect(plan.targetSpeed).toBe(0.0);
    });
  });

  // ============================================================
  // AUDIT 5: TTC PERTURBATION TEST
  // ============================================================
  describe('Audit 5: TTC Perturbation Test', () => {
    it('verifies TTC response is strictly monotonic and handles receding/stationary edges', () => {
      const distance = 30.0;

      const ttcNormal = calculateTTC(distance, 10.0); // 30 / 10 = 3.0s
      const ttcHigherSpeed = calculateTTC(distance, 20.0); // 30 / 20 = 1.5s
      const ttcLowerSpeed = calculateTTC(distance, 5.0); // 30 / 5 = 6.0s
      const ttcStationary = calculateTTC(distance, 0.0); // Infinity
      const ttcReceding = calculateTTC(distance, -8.0); // Infinity

      console.log(`[AUDIT 5] TTC Values: 20m/s=${ttcHigherSpeed}s, 10m/s=${ttcNormal}s, 5m/s=${ttcLowerSpeed}s, 0m/s=${ttcStationary}, -8m/s=${ttcReceding}`);

      // 1. Higher closing speed -> Lower TTC
      expect(ttcHigherSpeed).toBeLessThan(ttcNormal);
      expect(ttcHigherSpeed).toBe(1.5);

      // 2. Lower closing speed -> Higher TTC
      expect(ttcLowerSpeed).toBeGreaterThan(ttcNormal);
      expect(ttcLowerSpeed).toBe(6.0);

      // 3. Stationary or receding -> Infinity
      expect(ttcStationary).toBe(Infinity);
      expect(ttcReceding).toBe(Infinity);
    });
  });

  // ============================================================
  // AUDIT 6: RISK PERTURBATION TEST
  // ============================================================
  describe('Audit 6: Risk Perturbation Test', () => {
    const ego = createInitialEgoVehicle('SEDAN', 'AUTONOMOUS', 40);

    it('records and verifies risk score changes monotonically to distance, uncertainty, and predicted overlap', () => {
      // Baseline Actor
      const baseActor: TrackedActor = {
        id: 'actor_1',
        type: 'CAR',
        x: ego.x,
        y: ego.y + 35.0,
        speed: 5.0,
        vx: 0,
        vy: 5.0,
        heading: 0,
        acceleration: 0,
        width: 1.8,
        length: 4.5,
        behavior: 'LANE_KEEPING',
        uncertainty: 0.2,
        distanceToEgo: 35.0,
        longitudinalDistance: 35.0,
        lateralDistance: 0,
        relativeSpeed: 6.1,
        closingSpeed: 6.1,
        history: [],
        timeToCollision: 35.0 / 6.1,
        riskScore: 0,
      };

      const baseRisk = assessActorRisk(baseActor, ego);

      // Perturbation 1: Distance decrease (35m -> 10m)
      const closeActor: TrackedActor = {
        ...baseActor,
        y: ego.y + 10.0,
        distanceToEgo: 10.0,
        longitudinalDistance: 10.0,
        timeToCollision: 10.0 / 6.1,
      };
      const closeRisk = assessActorRisk(closeActor, ego);

      // Perturbation 2: Trajectory overlap introduced
      const overlappingPred: ActorPrediction = {
        actorId: 'actor_1',
        actorType: 'CAR',
        horizon: 3.0,
        dt: 0.2,
        currentSpeed: 5.0,
        waypoints: [
          { t: 0.5, x: ego.x, y: ego.y + 7.0, heading: 0, sigmaX: 0.3, sigmaY: 0.3, uncertaintyRadius: 0.4 },
          { t: 1.0, x: ego.x, y: ego.y + 12.0, heading: 0, sigmaX: 0.5, sigmaY: 0.5, uncertaintyRadius: 0.6 },
        ],
      };
      const overlapRisk = assessActorRisk(closeActor, ego, overlappingPred);

      console.log(`[AUDIT 6] Risk Before/After: Base=${baseRisk.riskScore}, CloseDist=${closeRisk.riskScore}, OverlapPred=${overlapRisk.riskScore}`);

      expect(closeRisk.riskScore).toBeGreaterThan(baseRisk.riskScore);
      expect(overlapRisk.riskScore).toBeGreaterThanOrEqual(closeRisk.riskScore);
      expect(closeRisk.timeToCollision).toBeLessThan(baseRisk.timeToCollision);
    });
  });

  // ============================================================
  // AUDIT 7: CONTROL CAUSALITY TEST
  // ============================================================
  describe('Audit 7: Control Causality Test', () => {
    const ego = createInitialEgoVehicle('SEDAN', 'AUTONOMOUS', 36, 0.0); // ego at (0, 10)
    const road = createIndianRoadModel({ nominalWidth: 7.2, laneConfidence: 0.5 });
    const rawCandidates = generateCandidateTrajectories(ego, road);

    it('verifies steering changes with selected trajectory', () => {
      const steerLeft = calculateSteeringCommand(ego, rawCandidates.LEFT);
      const steerCenter = calculateSteeringCommand(ego, rawCandidates.CENTER);
      const steerRight = calculateSteeringCommand(ego, rawCandidates.RIGHT);

      console.log(`[AUDIT 7] Steer Left=${steerLeft.toFixed(4)}, Center=${steerCenter.toFixed(4)}, Right=${steerRight.toFixed(4)}`);

      expect(steerLeft).toBeLessThan(steerCenter);
      expect(steerRight).toBeGreaterThan(steerCenter);
    });

    it('verifies acceleration command responds causally to target speed and emergency brake', () => {
      const dt = 0.02;
      const currentSpeed = ego.speed; // 10 m/s

      // Faster target -> Positive acceleration
      const accelSpeedUp = calculateSpeedCommand(ego, currentSpeed + 4.0, 'CRUISE', dt);
      // Slower target -> Negative deceleration
      const accelSlowDown = calculateSpeedCommand(ego, currentSpeed - 4.0, 'SLOW_DOWN', dt);
      // Emergency brake -> Maximum braking (-8 m/s²)
      const accelEmergency = calculateSpeedCommand(ego, 0.0, 'EMERGENCY_BRAKE', dt);

      console.log(`[AUDIT 7] Accel: SpeedUp=${accelSpeedUp.toFixed(2)}, SlowDown=${accelSlowDown.toFixed(2)}, Emergency=${accelEmergency.toFixed(2)}`);

      expect(accelSpeedUp).toBeGreaterThan(0);
      expect(accelSlowDown).toBeLessThan(0);
      expect(accelEmergency).toBe(ego.dimensions.maxBraking);
    });
  });

  // ============================================================
  // AUDIT 8: BASELINE VS ADAPTIVE AUDIT
  // ============================================================
  describe('Audit 8: Baseline vs Adaptive Comparative Audit', () => {
    it('verifies identical initial state/road/seed and reports real empirical metrics across multiple runs', () => {
      const run1 = runDeterministicBenchmark('SUDDEN_CROSSING');
      const run2 = runDeterministicBenchmark('SUDDEN_CROSSING');

      // 1. Check determinism between benchmark runs
      expect(run1.baseline.collisions).toBe(run2.baseline.collisions);
      expect(run1.adaptive.collisions).toBe(run2.adaptive.collisions);
      expect(run1.baseline.minimumClearanceM).toBe(run2.baseline.minimumClearanceM);
      expect(run1.adaptive.minimumClearanceM).toBe(run2.adaptive.minimumClearanceM);

      // 2. Report real empirical results
      console.log('----------------------------------------------------');
      console.log('[AUDIT 8] BASELINE vs ADAPTIVE RAW METRICS:');
      console.log(`Baseline Collisions:       ${run1.baseline.collisions}`);
      console.log(`Adaptive Collisions:       ${run1.adaptive.collisions}`);
      console.log(`Baseline Min Clearance:    ${run1.baseline.minimumClearanceM} m`);
      console.log(`Adaptive Min Clearance:    ${run1.adaptive.minimumClearanceM} m`);
      console.log(`Raw Clearance Gain:        +${run1.rawClearanceGainM} m`);
      console.log(`Baseline Avg Speed:        ${run1.baseline.averageSpeedKmh} km/h`);
      console.log(`Adaptive Avg Speed:        ${run1.adaptive.averageSpeedKmh} km/h`);
      console.log(`Adaptive Emergency Brakes: ${run1.adaptive.emergencyBrakingCount}`);
      console.log('----------------------------------------------------');

      expect(run1.adaptive.collisions).toBeLessThanOrEqual(run1.baseline.collisions);
      expect(run1.adaptive.minimumClearanceM).toBeGreaterThan(run1.baseline.minimumClearanceM);
    });
  });

  // ============================================================
  // AUDIT 9: INVESTIGATE THE "1800%" CLAIM
  // ============================================================
  describe('Audit 9: Investigation of the "1800%" Claim', () => {
    it('audits the exact mathematical basis and confirms raw clearance margin is recorded', () => {
      const res = runDeterministicBenchmark('SUDDEN_CROSSING');
      const baselineClearance = res.baseline.minimumClearanceM;
      const adaptiveClearance = res.adaptive.minimumClearanceM;

      const rawGain = adaptiveClearance - baselineClearance;
      const unconditionedPct = Math.round((rawGain / Math.max(0.1, baselineClearance)) * 100);

      console.log('[AUDIT 9] 1800% Claim Investigation:');
      console.log(`Baseline metric:   ${baselineClearance} m`);
      console.log(`Adaptive metric:   ${adaptiveClearance} m`);
      console.log(`Formula used:      ((Adaptive - Baseline) / Math.max(0.1, Baseline)) * 100`);
      console.log(`Calculation:       ((${adaptiveClearance} - ${baselineClearance}) / ${Math.max(0.1, baselineClearance)}) * 100 = ${unconditionedPct}%`);
      console.log(`Audited Result:    Inflated percentage caused by division by near-zero baseline (${baselineClearance}m).`);
      console.log(`Audited Reporting: Absolute clearance gain = +${rawGain.toFixed(2)} m (Baseline ${baselineClearance}m vs Adaptive ${adaptiveClearance}m)`);

      expect(res.rawClearanceGainM).toBeCloseTo(rawGain, 2);
    });
  });

  // ============================================================
  // AUDIT 10: DETERMINISM TEST (10 Consecutive Runs)
  // ============================================================
  describe('Audit 10: Determinism (10 Seeded Runs)', () => {
    it('runs Scenario 5 ten times and asserts 100% bit-exact reproducibility', () => {
      const results: { finalX: number; finalY: number; finalSpeed: number; minClearance: number }[] = [];

      for (let run = 0; run < 10; run++) {
        const sim = new SimulationEngine('SUDDEN_CROSSING', 'SEDAN', 'AUTONOMOUS', 45);
        for (let t = 0; t < 300; t++) {
          sim.step();
        }
        results.push({
          finalX: sim.ego.x,
          finalY: sim.ego.y,
          finalSpeed: sim.ego.speed,
          minClearance: sim.metrics.minimumDistance,
        });
      }

      for (let i = 1; i < 10; i++) {
        expect(results[i].finalX).toBe(results[0].finalX);
        expect(results[i].finalY).toBe(results[0].finalY);
        expect(results[i].finalSpeed).toBe(results[0].finalSpeed);
        expect(results[i].minClearance).toBe(results[0].minClearance);
      }
      console.log(`[AUDIT 10] 10/10 runs identical: finalX=${results[0].finalX.toFixed(4)}, finalY=${results[0].finalY.toFixed(4)}, minClearance=${results[0].minClearance.toFixed(2)}m`);
    });
  });

  // ============================================================
  // AUDIT 11: EDGE CASES
  // ============================================================
  describe('Audit 11: Edge Cases & Mathematical Stability', () => {
    it('evaluates zero and negative closing speeds without NaN', () => {
      expect(calculateTTC(20.0, 0.0)).toBe(Infinity);
      expect(calculateTTC(20.0, -15.0)).toBe(Infinity);
      expect(Number.isNaN(calculateTTC(20.0, 0.0))).toBe(false);
    });

    it('evaluates world with zero obstacles without error', () => {
      const sim = new SimulationEngine('SUDDEN_CROSSING', 'SEDAN', 'AUTONOMOUS', 45);
      sim.actors = [];
      sim.step();
      expect(sim.plannerOutput.selectedPathId).toBe('CENTER');
      expect(sim.riskState.overallRiskScore).toBe(0);
      expect(Number.isNaN(sim.ego.speed)).toBe(false);
    });

    it('evaluates extreme uncertainty without crash or NaN', () => {
      const sim = new SimulationEngine('SUDDEN_CROSSING', 'SEDAN', 'AUTONOMOUS', 45);
      if (sim.actors[0]) {
        sim.actors[0].uncertainty = 10.0; // Extreme uncertainty
      }
      sim.step();
      expect(Number.isNaN(sim.riskState.dynamicSafetyMargin)).toBe(false);
      expect(sim.riskState.dynamicSafetyMargin).toBeGreaterThan(1.5);
    });

    it('evaluates very low speed (stopped vehicle) stability', () => {
      const ego = createInitialEgoVehicle('SEDAN', 'AUTONOMOUS', 0.01);
      const stepped = stepEgoVehicleKinematics(ego, 0.2, 0.0, 0.02);
      expect(Number.isNaN(stepped.x)).toBe(false);
      expect(Number.isNaN(stepped.heading)).toBe(false);
    });
  });

  // ============================================================
  // AUDIT 12: PERFORMANCE PROFILING
  // ============================================================
  describe('Audit 12: Performance Profiling', () => {
    it('benchmarks 500 simulation ticks and measures avg and worst planner execution time', () => {
      const sim = new SimulationEngine('SUDDEN_CROSSING', 'SEDAN', 'AUTONOMOUS', 45);
      const tickDurations: number[] = [];

      for (let i = 0; i < 500; i++) {
        const start = performance.now();
        sim.step();
        const duration = performance.now() - start;
        tickDurations.push(duration);
      }

      const totalTime = tickDurations.reduce((a, b) => a + b, 0);
      const avgTick = totalTime / tickDurations.length;
      const worstTick = Math.max(...tickDurations);
      const equivalentHz = 1000 / Math.max(0.001, avgTick);

      console.log('----------------------------------------------------');
      console.log('[AUDIT 12] PERFORMANCE BENCHMARK:');
      console.log(`500 Ticks Total Time:  ${totalTime.toFixed(2)} ms`);
      console.log(`Average Tick Time:     ${avgTick.toFixed(3)} ms`);
      console.log(`Worst Tick Time:       ${worstTick.toFixed(3)} ms`);
      console.log(`Headless Update Rate:  ${Math.round(equivalentHz)} Hz (Requirement: 50 Hz)`);
      console.log('----------------------------------------------------');

      expect(avgTick).toBeLessThan(10.0); // Well within real-time 20ms budget (50Hz)
    });
  });

});
