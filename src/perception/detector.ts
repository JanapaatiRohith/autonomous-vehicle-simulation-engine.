import { SurroundingActor } from '../types/obstacle';
import { EgoVehicleState } from '../types/vehicle';
import { euclideanDistance } from '../utils/math';

export interface SensorSpecs {
  forwardRange: number; // meters (e.g. 80m)
  rearRange: number; // meters (e.g. 20m)
  lateralRange: number; // meters (e.g. 15m)
  fieldOfViewDeg: number; // degrees
}

export const DEFAULT_SENSOR_SPECS: SensorSpecs = {
  forwardRange: 80.0,
  rearRange: 20.0,
  lateralRange: 16.0,
  fieldOfViewDeg: 120.0,
};

export interface RawSensorDetection {
  actor: SurroundingActor;
  detectedDistance: number;
  detectedAngleRad: number;
  confidence: number;
}

/**
 * Simulated Environment Perception & Sensor Interface.
 * Filters ground-truth world actors based on sensor field of view and range limits.
 * Ready for future substitution with MATLAB Automated Driving Toolbox synthetic sensor streams.
 */
export function detectObjects(
  actors: SurroundingActor[],
  ego: EgoVehicleState,
  specs: SensorSpecs = DEFAULT_SENSOR_SPECS
): RawSensorDetection[] {
  const detections: RawSensorDetection[] = [];

  for (const actor of actors) {
    const dx = actor.x - ego.x;
    const dy = actor.y - ego.y;
    const dist = euclideanDistance(ego.x, ego.y, actor.x, actor.y);

    // Range filtering
    if (dy >= 0 && dy > specs.forwardRange) continue;
    if (dy < 0 && Math.abs(dy) > specs.rearRange) continue;
    if (Math.abs(dx) > specs.lateralRange) continue;

    // Angle filtering relative to vehicle heading
    const angleToActor = Math.atan2(dx, dy); // 0 = straight ahead
    const relativeAngle = angleToActor - ego.heading;
    const maxHalfFov = (specs.fieldOfViewDeg * Math.PI) / 360;

    if (Math.abs(relativeAngle) > maxHalfFov && dy > 5.0) {
      continue;
    }

    // Detection confidence decays with distance
    const confidence = Math.max(0.65, 1.0 - (dist / specs.forwardRange) * 0.35);

    detections.push({
      actor,
      detectedDistance: dist,
      detectedAngleRad: relativeAngle,
      confidence,
    });
  }

  return detections;
}
