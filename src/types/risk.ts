export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ActorRiskAssessment {
  actorId: string;
  distance: number; // Euclidean distance (m)
  closingSpeed: number; // m/s (rate of approach)
  timeToCollision: number; // Seconds (Infinity if not approaching)
  spatialOverlapRisk: number; // 0 to 1
  riskScore: number; // 0 to 100
  riskLevel: RiskLevel;
  criticalFactor: string; // Explanatory factor (e.g., 'Predicted crossing conflict in 1.4s')
}

export interface GlobalRiskState {
  overallRiskScore: number; // 0-100
  overallRiskLevel: RiskLevel;
  nearestActorDistance: number; // m
  nearestActorId: string | null;
  nearestActorType: string | null;
  minimumTTC: number; // s
  primaryHazardActorId: string | null;
  primaryHazardDescription: string;
  dynamicSafetyMargin: number; // m
  potholeInCorridor: boolean;
  laneConfidence: number; // 0 to 1
  explanation: string; // Human-explainable sentence for judges/operators
}

export const RISK_THRESHOLDS = {
  TTC_CRITICAL: 1.5, // Seconds
  TTC_HIGH: 2.8,
  TTC_MEDIUM: 4.5,
  DISTANCE_CRITICAL: 5.0, // Meters
  DISTANCE_HIGH: 12.0,
  DISTANCE_MEDIUM: 25.0,
  SCORE_LOW_MAX: 30,
  SCORE_MED_MAX: 60,
  SCORE_HIGH_MAX: 85,
};
