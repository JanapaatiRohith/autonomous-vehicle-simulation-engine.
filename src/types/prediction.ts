export interface PredictedWaypoint {
  t: number; // Time offset into future (e.g. 0.2, 0.4, ... 3.0s)
  x: number; // Predicted lateral position (m)
  y: number; // Predicted longitudinal position (m)
  heading: number; // Predicted heading (rad)
  sigmaX: number; // Lateral uncertainty radius (m)
  sigmaY: number; // Longitudinal uncertainty radius (m)
  uncertaintyRadius: number; // Maximum spatial uncertainty bound (m)
}

export interface ActorPrediction {
  actorId: string;
  actorType: string;
  horizon: number; // seconds (3.0s)
  dt: number; // seconds (0.2s)
  waypoints: PredictedWaypoint[];
  currentSpeed: number;
}
