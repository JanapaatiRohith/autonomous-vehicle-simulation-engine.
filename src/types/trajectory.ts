export type CandidatePathId = 'LEFT' | 'CENTER' | 'RIGHT';

export type CandidatePathStatus = 'SAFE' | 'HIGH_RISK' | 'BLOCKED';

export interface TrajectoryPoint {
  x: number; // Lateral offset from road centerline (m)
  y: number; // Longitudinal distance along road (m)
  heading: number; // Radians
  curvature: number; // 1/m
  targetSpeed: number; // m/s
  cumulativeDistance: number; // m
}

export interface CandidateTrajectory {
  id: CandidatePathId;
  name: string;
  points: TrajectoryPoint[];
  status: CandidatePathStatus;
  minimumClearance: number; // m to nearest obstacle / road boundary
  averageClearance: number; // m
  peakCurvature: number; // 1/m
  steeringEffort: number; // rad
  cost: number;
  blockingReason?: string;
  conflictActorId?: string;
}

export type PlannerDecision =
  | 'CRUISE'
  | 'SLOW_DOWN'
  | 'FOLLOW'
  | 'AVOID_LEFT'
  | 'AVOID_RIGHT'
  | 'BRAKE'
  | 'EMERGENCY_BRAKE';

export interface PlannerOutput {
  selectedPathId: CandidatePathId;
  candidates: Record<CandidatePathId, CandidateTrajectory>;
  decision: PlannerDecision;
  targetSpeed: number; // m/s
  reasoning: string;
  timestamp: number;
}
