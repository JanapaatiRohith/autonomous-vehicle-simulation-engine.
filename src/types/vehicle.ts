export type DrivingMode = 'MANUAL' | 'CAUTIOUS' | 'AUTONOMOUS' | 'EMERGENCY_TEST';

export type VehicleModelType = 'SEDAN' | 'SUV' | 'COMPACT_EV';

export type VehicleState =
  | 'CRUISE'
  | 'FOLLOW'
  | 'CAUTIOUS'
  | 'AVOID'
  | 'BRAKE'
  | 'EMERGENCY_STOP'
  | 'RECOVER';

export interface VehicleDimensions {
  length: number; // meters
  width: number; // meters
  wheelbase: number; // meters
  maxSteerAngle: number; // radians (~0.6 rad / ~35 deg)
  maxAcceleration: number; // m/s²
  maxBraking: number; // m/s² (negative, e.g. -8.0)
  maxSpeed: number; // m/s (~80 km/h = ~22.2 m/s)
}

export interface EgoVehicleState {
  x: number; // Global X (meters, lateral across road)
  y: number; // Global Y (meters, longitudinal along road)
  speed: number; // Current speed (m/s)
  targetSpeed: number; // Target speed commanded by planner (m/s)
  acceleration: number; // Longitudinal acceleration (m/s²)
  heading: number; // Orientation angle (radians, 0 = straight up along positive Y)
  steeringAngle: number; // Front wheel angle (radians)
  dimensions: VehicleDimensions;
  vehicleType: VehicleModelType;
  drivingMode: DrivingMode;
  state: VehicleState;
  distanceTraveled: number; // meters
}

export const VEHICLE_CONFIGS: Record<VehicleModelType, VehicleDimensions> = {
  SEDAN: {
    length: 4.6,
    width: 1.85,
    wheelbase: 2.7,
    maxSteerAngle: 0.61, // ~35 deg
    maxAcceleration: 3.2,
    maxBraking: -8.0,
    maxSpeed: 25.0, // 90 km/h
  },
  SUV: {
    length: 4.8,
    width: 1.95,
    wheelbase: 2.85,
    maxSteerAngle: 0.55, // ~31 deg
    maxAcceleration: 2.6,
    maxBraking: -7.5,
    maxSpeed: 23.0, // 83 km/h
  },
  COMPACT_EV: {
    length: 3.8,
    width: 1.7,
    wheelbase: 2.4,
    maxSteerAngle: 0.65, // ~37 deg
    maxAcceleration: 3.8,
    maxBraking: -8.5,
    maxSpeed: 22.2, // 80 km/h
  },
};
