import { CandidateTrajectory } from '../types/trajectory';
import { EgoVehicleState } from '../types/vehicle';
import { RoadModel } from '../types/road';
import { TrackedActor } from '../types/obstacle';
import { ActorPrediction } from '../types/prediction';
import { getDrivableBounds, getPotholesNear } from '../simulation/road';
import { euclideanDistance, formatNum } from '../utils/math';

/**
 * Performs spatio-temporal collision checking on candidate trajectories against road bounds,
 * dynamic predicted obstacle envelopes, static hazards, and potholes.
 */
export function checkTrajectoryCollisions(
  candidate: CandidateTrajectory,
  ego: EgoVehicleState,
  road: RoadModel,
  actors: TrackedActor[],
  predictions: Map<string, ActorPrediction>,
  safetyMargin = 1.8
): CandidateTrajectory {
  const points = candidate.points;
  let minObstacleClearance = 99.0;
  let minRoadEdgeClearance = 99.0;
  let clearanceSum = 0;
  let isBlocked = false;
  let isHighRisk = false;
  let blockingReason: string | undefined = undefined;
  let conflictActorId: string | undefined = undefined;

  const egoHalfW = ego.dimensions.width / 2;
  const nominalSpeed = Math.max(2.0, ego.speed);

  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    const arrivalTime = pt.cumulativeDistance / nominalSpeed;

    // 1. Road boundary collision check
    const bounds = getDrivableBounds(road, pt.y);
    const distToLeftEdge = pt.x - bounds.leftX - egoHalfW;
    const distToRightEdge = bounds.rightX - pt.x - egoHalfW;
    const edgeClearance = Math.min(distToLeftEdge, distToRightEdge);
    minRoadEdgeClearance = Math.min(minRoadEdgeClearance, edgeClearance);

    if (edgeClearance < 0.05) {
      isBlocked = true;
      blockingReason = `Road boundary violation (${formatNum(edgeClearance, 2)}m to edge)`;
      break;
    } else if (edgeClearance < 0.25) {
      isHighRisk = true;
    }

    // 2. Surface hazards: Potholes
    const potholes = getPotholesNear(road, pt.y, 2.5);
    for (const pothole of potholes) {
      const distToPothole = euclideanDistance(pt.x, pt.y, pothole.x, pothole.y);
      const potholeClearance = distToPothole - pothole.diameter / 2 - egoHalfW;
      minObstacleClearance = Math.min(minObstacleClearance, potholeClearance);

      if (potholeClearance < 0.2 && pothole.severity === 'SEVERE') {
        isBlocked = true;
        blockingReason = `Severe pothole conflict (${pothole.depth}cm depth)`;
        break;
      } else if (potholeClearance < 0.5) {
        isHighRisk = true;
      }
    }
    if (isBlocked) break;

    // 3. Spatio-temporal dynamic actors & prediction uncertainty envelopes
    for (const actor of actors) {
      // If actor is stationary and completely outside road boundary on the shoulder, skip
      const actorRoadBounds = getDrivableBounds(road, actor.y);
      if ((actor.x > actorRoadBounds.rightX + 0.5 || actor.x < actorRoadBounds.leftX - 0.5) && Math.abs(actor.vx) < 0.1) {
        continue;
      }

      const pred = predictions.get(actor.id);
      let actorFutureX = actor.x + actor.vx * arrivalTime;
      let actorFutureY = actor.y + actor.vy * arrivalTime;
      let uncertainty = 0.4;

      if (pred && pred.waypoints.length > 0) {
        const matchedWp = pred.waypoints.reduce((closest, wp) => {
          return Math.abs(wp.t - arrivalTime) < Math.abs(closest.t - arrivalTime) ? wp : closest;
        }, pred.waypoints[0]);

        actorFutureX = matchedWp.x;
        actorFutureY = matchedWp.y;
        uncertainty = matchedWp.uncertaintyRadius;
      }

      const distToFutureActor = euclideanDistance(pt.x, pt.y, actorFutureX, actorFutureY);
      const physicalFootprint = (actor.width + ego.dimensions.width) / 2;
      const clearance = distToFutureActor - physicalFootprint;

      minObstacleClearance = Math.min(minObstacleClearance, clearance);

      // Definite collision footprint conflict
      if (clearance < 0.35) {
        isBlocked = true;
        blockingReason = `Predicted collision with ${actor.type} at t=${formatNum(arrivalTime, 1)}s`;
        conflictActorId = actor.id;
        break;
      }
      // Uncertainty envelope overlap -> High Risk
      else if (clearance < safetyMargin + uncertainty * 0.4) {
        isHighRisk = true;
        if (!blockingReason) {
          blockingReason = `Close proximity to predicted ${actor.type} trajectory`;
        }
      }
    }

    if (isBlocked) break;
    clearanceSum += Math.max(0, minObstacleClearance);
  }

  const avgClearance = points.length > 0 ? clearanceSum / points.length : minObstacleClearance;
  const overallMinClearance = Math.min(minObstacleClearance, minRoadEdgeClearance);

  let status: CandidateTrajectory['status'] = 'SAFE';
  if (isBlocked) {
    status = 'BLOCKED';
  } else if (isHighRisk || (minObstacleClearance < safetyMargin && minObstacleClearance < 90)) {
    status = 'HIGH_RISK';
  }

  return {
    ...candidate,
    status,
    minimumClearance: Math.max(0, overallMinClearance),
    averageClearance: Math.max(0, avgClearance),
    blockingReason,
    conflictActorId,
  };
}
