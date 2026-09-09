import { EgoVehicleState } from '../types/vehicle';
import { CandidateTrajectory } from '../types/trajectory';
import { clamp, normalizeAngle, euclideanDistance } from '../utils/math';

/**
 * Pure Pursuit Steering Controller for path tracking.
 */
export function calculateSteeringCommand(
  ego: EgoVehicleState,
  trajectory: CandidateTrajectory
): number {
  const points = trajectory.points;
  if (!points || points.length === 0) {
    return 0;
  }

  // Speed-dependent lookahead distance (meters)
  const lookaheadDist = clamp(ego.speed * 0.55 + 4.5, 4.0, 18.0);

  // Find waypoint on trajectory closest to lookahead distance ahead
  let lookaheadPoint = points[points.length - 1];
  for (let i = 0; i < points.length; i++) {
    const dist = euclideanDistance(ego.x, ego.y, points[i].x, points[i].y);
    if (dist >= lookaheadDist && points[i].y >= ego.y) {
      lookaheadPoint = points[i];
      break;
    }
  }

  // Vector to lookahead point in vehicle frame
  const dx = lookaheadPoint.x - ego.x;
  const dy = lookaheadPoint.y - ego.y;

  // Angle from vehicle heading to target point
  // Heading: 0 is along +Y, positive heading rotates toward +X
  const angleToTarget = Math.atan2(dx, dy);
  const alpha = normalizeAngle(angleToTarget - ego.heading);

  // Pure pursuit curvature: kappa = 2 * sin(alpha) / lookaheadDist
  const actualDist = Math.max(1.0, euclideanDistance(ego.x, ego.y, lookaheadPoint.x, lookaheadPoint.y));
  const kappa = (2 * Math.sin(alpha)) / actualDist;

  // Steering angle: delta = arctan(wheelbase * kappa)
  const steerAngle = Math.atan(ego.dimensions.wheelbase * kappa);

  return clamp(steerAngle, -ego.dimensions.maxSteerAngle, ego.dimensions.maxSteerAngle);
}
