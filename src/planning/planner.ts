import { EgoVehicleState } from '../types/vehicle';
import { RoadModel } from '../types/road';
import { TrackedActor } from '../types/obstacle';
import { ActorPrediction } from '../types/prediction';
import { GlobalRiskState } from '../types/risk';
import {
  CandidatePathId,
  CandidateTrajectory,
  PlannerDecision,
  PlannerOutput,
} from '../types/trajectory';
import { generateCandidateTrajectories } from './trajectoryGenerator';
import { checkTrajectoryCollisions } from './collisionChecker';
import { calculateTrajectoryCost } from './trajectoryCost';
import { formatNum, clamp } from '../utils/math';

/**
 * Core Adaptive Predictive Path Planner for Unstructured Indian Road Navigation.
 */
export function planPath(
  ego: EgoVehicleState,
  road: RoadModel,
  actors: TrackedActor[],
  predictions: Map<string, ActorPrediction>,
  riskState: GlobalRiskState,
  simTime: number
): PlannerOutput {
  // 1. Generate candidate trajectories (LEFT, CENTER, RIGHT)
  const rawCandidates = generateCandidateTrajectories(ego, road);

  // 2. Perform spatio-temporal collision checking & cost evaluation on all candidates
  const evaluatedCandidates: Record<CandidatePathId, CandidateTrajectory> = {} as any;
  const candidateIds: CandidatePathId[] = ['LEFT', 'CENTER', 'RIGHT'];

  for (const id of candidateIds) {
    const candidate = rawCandidates[id];
    const checked = checkTrajectoryCollisions(
      candidate,
      ego,
      road,
      actors,
      predictions,
      riskState.dynamicSafetyMargin
    );
    const cost = calculateTrajectoryCost(checked);
    evaluatedCandidates[id] = {
      ...checked,
      cost,
    };
  }

  // 3. Evaluate non-blocked candidates
  const validCandidates = candidateIds
    .map(id => evaluatedCandidates[id])
    .filter(c => c.status !== 'BLOCKED');

  let selectedPathId: CandidatePathId = 'CENTER';
  let decision: PlannerDecision = 'CRUISE';
  let targetSpeed = ego.targetSpeed;
  let reasoning = '';

  const nominalCruiseSpeed = ego.dimensions.maxSpeed * 0.65; // ~50 km/h nominal

  // 4. Decision logic
  if (validCandidates.length === 0 || (riskState.overallRiskLevel === 'CRITICAL' && riskState.minimumTTC < 1.3)) {
    // All candidates blocked or unavoidable emergency hazard ahead
    selectedPathId = candidateIds.reduce((best, id) => {
      return evaluatedCandidates[id].minimumClearance > evaluatedCandidates[best].minimumClearance ? id : best;
    }, 'CENTER' as CandidatePathId);

    decision = 'EMERGENCY_BRAKE';
    targetSpeed = 0.0;
    reasoning = `EMERGENCY BRAKE triggered: All candidate corridors blocked or critical TTC (${formatNum(riskState.minimumTTC)}s). Halting ego vehicle immediately.`;
  } else {
    const centerCandidate = evaluatedCandidates.CENTER;

    // Prefer CENTER nominal corridor when it is SAFE and environmental risk is LOW
    if (centerCandidate.status === 'SAFE' && (riskState.overallRiskLevel === 'LOW' || riskState.overallRiskLevel === 'MEDIUM')) {
      selectedPathId = 'CENTER';
      if (riskState.overallRiskLevel === 'MEDIUM') {
        decision = 'FOLLOW';
        targetSpeed = clamp(nominalCruiseSpeed * 0.75, 6.0, 11.0);
        reasoning = `CENTER path clear. Regulating speed behind forward traffic flow.`;
      } else {
        decision = 'CRUISE';
        targetSpeed = nominalCruiseSpeed;
        reasoning = `CENTER path optimal (Clearance ${formatNum(centerCandidate.minimumClearance)}m). Maintaining nominal cruise.`;
      }
    } else {
      // Sort valid candidates by lowest cost
      validCandidates.sort((a, b) => a.cost - b.cost);
      const winningCandidate = validCandidates[0];
      selectedPathId = winningCandidate.id;

      if (winningCandidate.id === 'CENTER') {
        decision = 'SLOW_DOWN';
        targetSpeed = clamp(nominalCruiseSpeed * 0.45, 3.5, 7.0);
        reasoning = `CENTER path restricted (${formatNum(winningCandidate.minimumClearance)}m clearance). Slowing down due to elevated environmental risk.`;
      } else {
        // Evasive lane change chosen (LEFT or RIGHT)
        decision = winningCandidate.id === 'LEFT' ? 'AVOID_LEFT' : 'AVOID_RIGHT';
        targetSpeed = clamp(nominalCruiseSpeed * 0.65, 5.0, 9.0);

        const centerReason = centerCandidate.blockingReason || (centerCandidate.status === 'BLOCKED' ? 'Blocked' : 'High risk');
        reasoning = `${winningCandidate.id} selected (Cost ${winningCandidate.cost}, Clearance ${formatNum(winningCandidate.minimumClearance)}m) because CENTER is ${centerCandidate.status} (${centerReason}). Evasive maneuver active.`;
      }
    }
  }

  return {
    selectedPathId,
    candidates: evaluatedCandidates,
    decision,
    targetSpeed,
    reasoning,
    timestamp: simTime,
  };
}
