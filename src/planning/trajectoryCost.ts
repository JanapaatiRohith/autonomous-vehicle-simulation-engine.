import { CandidateTrajectory } from '../types/trajectory';

export interface TrajectoryCostWeights {
  clearanceWeight: number;
  riskWeight: number;
  curvatureWeight: number;
  steeringWeight: number;
  centerDeviationWeight: number;
}

export const DEFAULT_COST_WEIGHTS: TrajectoryCostWeights = {
  clearanceWeight: 30.0,
  riskWeight: 45.0,
  curvatureWeight: 12.0,
  steeringWeight: 10.0,
  centerDeviationWeight: 4.0, // slight preference for staying centered when clear
};

/**
 * Calculates the multi-objective optimization cost for a candidate trajectory.
 * Lower cost = superior and safer trajectory.
 */
export function calculateTrajectoryCost(
  candidate: CandidateTrajectory,
  weights: TrajectoryCostWeights = DEFAULT_COST_WEIGHTS
): number {
  if (candidate.status === 'BLOCKED') {
    return 9999.0;
  }

  // 1. Clearance penalty: inversely proportional to minimum clearance
  const safeClearance = Math.max(0.2, candidate.minimumClearance);
  const clearanceCost = weights.clearanceWeight / safeClearance;

  // 2. Risk penalty
  const riskCost = candidate.status === 'HIGH_RISK' ? weights.riskWeight : 0.0;

  // 3. Smoothness / curvature penalty
  const curvatureCost = candidate.peakCurvature * weights.curvatureWeight * 10.0;

  // 4. Steering change / jerk penalty
  const steerCost = candidate.steeringEffort * weights.steeringWeight * 5.0;

  // 5. Lateral deviation penalty (stay in nominal path when safe)
  const deviationCost = (candidate.id === 'CENTER' ? 0.0 : 1.0) * weights.centerDeviationWeight;

  const totalCost = clearanceCost + riskCost + curvatureCost + steerCost + deviationCost;
  return Math.round(totalCost * 10) / 10;
}
