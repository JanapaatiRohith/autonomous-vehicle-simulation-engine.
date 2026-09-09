import { EgoVehicleState } from '../types/vehicle';
import { PlannerDecision } from '../types/trajectory';
import { clamp } from '../utils/math';

/**
 * Adaptive Speed Controller with proportional response and emergency deceleration profiling.
 */
export function calculateSpeedCommand(
  ego: EgoVehicleState,
  targetSpeed: number,
  decision: PlannerDecision,
  dt: number
): number {
  const currentSpeed = ego.speed;
  const dims = ego.dimensions;

  // Emergency braking priority override
  if (decision === 'EMERGENCY_BRAKE') {
    return dims.maxBraking; // Maximum emergency deceleration (e.g. -8.0 m/s²)
  }

  // Speed error
  const speedError = targetSpeed - currentSpeed;

  let kp = 1.8; // Proportional acceleration gain
  if (speedError < 0) {
    // Braking response
    kp = decision === 'BRAKE' || decision === 'SLOW_DOWN' ? 2.5 : 1.8;
  }

  const rawAccel = speedError * kp;
  return clamp(rawAccel, dims.maxBraking, dims.maxAcceleration);
}
