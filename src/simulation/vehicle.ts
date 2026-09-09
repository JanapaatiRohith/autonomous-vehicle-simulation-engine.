import {
  EgoVehicleState,
  VehicleModelType,
  DrivingMode,
  VEHICLE_CONFIGS,
} from '../types/vehicle';
import { clamp, normalizeAngle, kmhToMs } from '../utils/math';

/**
 * Creates the initial ego vehicle state.
 */
export function createInitialEgoVehicle(
  vehicleType: VehicleModelType = 'SEDAN',
  drivingMode: DrivingMode = 'AUTONOMOUS',
  initialSpeedKmh = 40,
  initialX = 1.75 // Default in right lane for Indian left-hand drive (or lane center)
): EgoVehicleState {
  const dimensions = VEHICLE_CONFIGS[vehicleType];
  const speed = kmhToMs(initialSpeedKmh);

  return {
    x: initialX,
    y: 10.0, // Starting longitudinal position
    speed,
    targetSpeed: speed,
    acceleration: 0,
    heading: 0, // Facing along positive Y (straight down the road)
    steeringAngle: 0,
    dimensions,
    vehicleType,
    drivingMode,
    state: 'CRUISE',
    distanceTraveled: 0,
  };
}

/**
 * Updates ego vehicle pose using a deterministic kinematic bicycle model.
 *
 * Equations:
 * dx/dt = v * -sin(heading) [or sin(heading) depending on coordinate convention]
 * dy/dt = v * cos(heading)
 * dHeading/dt = (v / L) * tan(steeringAngle)
 * dv/dt = acceleration
 */
export function stepEgoVehicleKinematics(
  ego: EgoVehicleState,
  commandedSteer: number,
  commandedAccel: number,
  dt: number
): EgoVehicleState {
  const dims = ego.dimensions;

  // Clamp commanded inputs to vehicle physical capabilities
  const clampedSteer = clamp(commandedSteer, -dims.maxSteerAngle, dims.maxSteerAngle);
  const clampedAccel = clamp(commandedAccel, dims.maxBraking, dims.maxAcceleration);

  // Steer angle slewing rate limit (e.g. max 0.8 rad/s)
  const maxSteerRate = 1.2; // rad/s
  const steerDiff = clampedSteer - ego.steeringAngle;
  const steerChange = clamp(steerDiff, -maxSteerRate * dt, maxSteerRate * dt);
  const newSteering = ego.steeringAngle + steerChange;

  // Update speed
  const newSpeed = clamp(ego.speed + clampedAccel * dt, 0, dims.maxSpeed);

  // Bicycle kinematics
  // Heading convention: 0 rad = facing positive Y (+longitudinal). Positive heading turns to right (+X).
  const beta = Math.atan(0.5 * Math.tan(newSteering)); // Slip angle at center of mass
  const effectiveHeading = ego.heading + beta;

  const dx = newSpeed * Math.sin(effectiveHeading) * dt;
  const dy = newSpeed * Math.cos(effectiveHeading) * dt;

  const yawRate = (newSpeed / dims.wheelbase) * Math.sin(beta) * 2;
  const newHeading = normalizeAngle(ego.heading + yawRate * dt);

  const newDistance = ego.distanceTraveled + Math.sqrt(dx * dx + dy * dy);

  return {
    ...ego,
    x: ego.x + dx,
    y: ego.y + dy,
    speed: newSpeed,
    acceleration: clampedAccel,
    heading: newHeading,
    steeringAngle: newSteering,
    distanceTraveled: newDistance,
  };
}
