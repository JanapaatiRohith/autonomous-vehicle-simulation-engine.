import { EgoVehicleState } from '../types/vehicle';
import { RoadModel } from '../types/road';
import { CandidatePathId, CandidateTrajectory, TrajectoryPoint } from '../types/trajectory';
import { getDrivableBounds } from '../simulation/road';
import { cubicHermite } from '../utils/geometry';
import { clamp } from '../utils/math';

export interface TrajectoryGeneratorOptions {
  lookaheadDistance?: number;
  sampleStep?: number;
  lateralOffsetMeters?: number;
}

/**
 * Generates smooth candidate trajectories (LEFT, CENTER, RIGHT) using cubic Hermite splines.
 * Designed to achieve smooth yet decisive lateral clearance within 16-24m when avoiding hazards.
 */
export function generateCandidateTrajectories(
  ego: EgoVehicleState,
  road: RoadModel,
  options: TrajectoryGeneratorOptions = {}
): Record<CandidatePathId, CandidateTrajectory> {
  const totalLookahead = options.lookaheadDistance ?? clamp(ego.speed * 1.8 + 18, 24, 45);
  const sampleCount = 30;

  const egoX = ego.x;
  const egoY = ego.y;
  const egoHeading = ego.heading;

  const targetBounds = getDrivableBounds(road, egoY + totalLookahead);
  const roadWidth = targetBounds.width;
  // Lateral shift scales with road width: ~1.6m for narrow road, ~3.2m for wide highway
  const lateralShift = options.lateralOffsetMeters ?? clamp(roadWidth * 0.26, 1.6, 3.4);

  const candidateConfigs: Array<{ id: CandidatePathId; name: string; targetOffsetX: number }> = [
    { id: 'LEFT', name: 'Left Evasive / Overtake', targetOffsetX: -lateralShift },
    { id: 'CENTER', name: 'Center Nominal Path', targetOffsetX: 0.0 },
    { id: 'RIGHT', name: 'Right Shoulder / Bypass', targetOffsetX: lateralShift },
  ];

  const result: Partial<Record<CandidatePathId, CandidateTrajectory>> = {};

  for (const config of candidateConfigs) {
    // Clamp targetX to stay within drivable road bounds
    const targetX = clamp(
      egoX + config.targetOffsetX,
      targetBounds.leftX + 1.1,
      targetBounds.rightX - 1.1
    );
    const targetY = egoY + totalLookahead;

    // Fast lateral transition tangent for decisive evasion
    const m0 = {
      x: Math.sin(egoHeading) * totalLookahead + config.targetOffsetX * 1.4,
      y: Math.cos(egoHeading) * totalLookahead,
    };
    const m1 = {
      x: 0,
      y: totalLookahead,
    };

    const p0 = { x: egoX, y: egoY };
    const p1 = { x: targetX, y: targetY };

    const points: TrajectoryPoint[] = [];
    let peakCurvature = 0;
    let cumulativeDist = 0;
    let prevPt = p0;

    for (let i = 0; i <= sampleCount; i++) {
      const t = i / sampleCount;
      const evalResult = cubicHermite(p0, m0, p1, m1, t);

      const pt = evalResult.point;
      const tangent = evalResult.tangent;
      const curvature = evalResult.curvature;

      if (curvature > peakCurvature) {
        peakCurvature = curvature;
      }

      if (i > 0) {
        const dx = pt.x - prevPt.x;
        const dy = pt.y - prevPt.y;
        cumulativeDist += Math.sqrt(dx * dx + dy * dy);
      }
      prevPt = pt;

      const heading = Math.atan2(tangent.x, tangent.y);

      points.push({
        x: pt.x,
        y: pt.y,
        heading,
        curvature,
        targetSpeed: ego.targetSpeed,
        cumulativeDistance: cumulativeDist,
      });
    }

    const steeringEffort = Math.abs(points[Math.floor(points.length / 4)].heading - egoHeading);

    result[config.id] = {
      id: config.id,
      name: config.name,
      points,
      status: 'SAFE',
      minimumClearance: 99.0,
      averageClearance: 99.0,
      peakCurvature,
      steeringEffort,
      cost: 0,
    };
  }

  return result as Record<CandidatePathId, CandidateTrajectory>;
}
