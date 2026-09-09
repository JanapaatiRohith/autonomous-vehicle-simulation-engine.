export type ActorType =
  | 'CAR'
  | 'MOTORCYCLE'
  | 'AUTO_RICKSHAW'
  | 'TRUCK'
  | 'BUS'
  | 'PEDESTRIAN'
  | 'ANIMAL'
  | 'STATIC_OBSTACLE'
  | 'POTHOLE';

export interface ActorDimensions {
  length: number; // meters
  width: number; // meters
}

export type ActorBehavior =
  | 'LANE_KEEPING'
  | 'SLOW_MOVING'
  | 'ERRATIC_WEAVING'
  | 'CROSSING'
  | 'CUT_IN'
  | 'STATIC'
  | 'STALLED';

export interface SurroundingActor {
  id: string;
  type: ActorType;
  x: number; // Lateral position in road frame (m)
  y: number; // Longitudinal position in road frame (m)
  speed: number; // m/s
  vx: number; // Lateral velocity component (m/s)
  vy: number; // Longitudinal velocity component (m/s)
  heading: number; // Radians (0 = along road positive Y)
  acceleration: number; // m/s²
  width: number; // meters
  length: number; // meters
  behavior: ActorBehavior;
  uncertainty: number; // 0.0 to 1.0 multiplier for prediction variance
  targetY?: number; // Destination coordinate for crossing actors
  targetX?: number;
  isTriggered?: boolean; // For scriptable events (e.g. sudden crossing)
  triggerDistance?: number; // Distance from ego vehicle to activate crossing
}

export interface TrackedActor extends SurroundingActor {
  distanceToEgo: number; // Euclidean distance (m)
  longitudinalDistance: number; // dy = actor.y - ego.y (m)
  lateralDistance: number; // dx = actor.x - ego.x (m)
  relativeSpeed: number; // Closing speed (m/s, >0 means closing in)
  closingSpeed: number; // Projected rate of decrease in Euclidean distance (m/s)
  history: Array<{ x: number; y: number; time: number }>; // Rolling history for tracking
  timeToCollision: number; // Seconds (Infinity if diverging)
  riskScore: number; // 0-100
}

export const ACTOR_DEFAULTS: Record<ActorType, { length: number; width: number; defaultSpeed: number; baseUncertainty: number }> = {
  CAR: { length: 4.5, width: 1.8, defaultSpeed: 12.0, baseUncertainty: 0.15 },
  MOTORCYCLE: { length: 2.1, width: 0.8, defaultSpeed: 11.0, baseUncertainty: 0.40 },
  AUTO_RICKSHAW: { length: 2.8, width: 1.3, defaultSpeed: 9.0, baseUncertainty: 0.35 },
  TRUCK: { length: 8.5, width: 2.5, defaultSpeed: 6.0, baseUncertainty: 0.10 },
  BUS: { length: 11.0, width: 2.6, defaultSpeed: 7.0, baseUncertainty: 0.10 },
  PEDESTRIAN: { length: 0.6, width: 0.6, defaultSpeed: 1.4, baseUncertainty: 0.50 },
  ANIMAL: { length: 1.8, width: 0.9, defaultSpeed: 2.0, baseUncertainty: 0.60 },
  STATIC_OBSTACLE: { length: 1.2, width: 1.2, defaultSpeed: 0.0, baseUncertainty: 0.02 },
  POTHOLE: { length: 1.4, width: 1.2, defaultSpeed: 0.0, baseUncertainty: 0.01 },
};
