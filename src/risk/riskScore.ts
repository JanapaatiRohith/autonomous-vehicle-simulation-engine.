import { TrackedActor } from '../types/obstacle';
import { EgoVehicleState } from '../types/vehicle';
import { RoadModel } from '../types/road';
import { ActorPrediction } from '../types/prediction';
import {
  RiskLevel,
  ActorRiskAssessment,
  GlobalRiskState,
  RISK_THRESHOLDS,
} from '../types/risk';
import { calculateTTC } from './ttc';
import { calculateDynamicSafetyMargin } from './safetyMargin';
import { getPotholesNear, getDrivableBounds } from '../simulation/road';
import { clamp, formatNum } from '../utils/math';

/**
 * Assesses risk for a single tracked actor relative to ego vehicle.
 */
export function assessActorRisk(
  actor: TrackedActor,
  ego: EgoVehicleState,
  prediction?: ActorPrediction
): ActorRiskAssessment {
  const distance = actor.distanceToEgo;
  const closingSpeed = actor.closingSpeed;
  const ttc = actor.timeToCollision;

  // 1. TTC risk component (0 - 45 points)
  let ttcScore = 0;
  if (isFinite(ttc)) {
    if (ttc <= RISK_THRESHOLDS.TTC_CRITICAL) {
      ttcScore = 45;
    } else if (ttc <= RISK_THRESHOLDS.TTC_HIGH) {
      ttcScore = 30 + (1 - (ttc - RISK_THRESHOLDS.TTC_CRITICAL) / (RISK_THRESHOLDS.TTC_HIGH - RISK_THRESHOLDS.TTC_CRITICAL)) * 15;
    } else if (ttc <= RISK_THRESHOLDS.TTC_MEDIUM) {
      ttcScore = 15 + (1 - (ttc - RISK_THRESHOLDS.TTC_HIGH) / (RISK_THRESHOLDS.TTC_MEDIUM - RISK_THRESHOLDS.TTC_HIGH)) * 15;
    } else {
      ttcScore = Math.max(0, 15 * (1 - (ttc - RISK_THRESHOLDS.TTC_MEDIUM) / 5.0));
    }
  }

  // 2. Proximity risk component (0 - 35 points)
  let proximityScore = 0;
  if (distance <= RISK_THRESHOLDS.DISTANCE_CRITICAL) {
    proximityScore = 35;
  } else if (distance <= RISK_THRESHOLDS.DISTANCE_HIGH) {
    proximityScore = 20 + (1 - (distance - RISK_THRESHOLDS.DISTANCE_CRITICAL) / (RISK_THRESHOLDS.DISTANCE_HIGH - RISK_THRESHOLDS.DISTANCE_CRITICAL)) * 15;
  } else if (distance <= RISK_THRESHOLDS.DISTANCE_MEDIUM) {
    proximityScore = 5 + (1 - (distance - RISK_THRESHOLDS.DISTANCE_HIGH) / (RISK_THRESHOLDS.DISTANCE_MEDIUM - RISK_THRESHOLDS.DISTANCE_HIGH)) * 15;
  }

  // 3. Predicted trajectory overlap risk (0 - 20 points)
  let overlapScore = 0;
  let criticalFactor = 'Nominal distance';

  if (prediction && prediction.waypoints.length > 0) {
    for (const wp of prediction.waypoints) {
      // Check if predicted future actor position conflicts with ego vehicle's projected path corridor
      const egoFutureY = ego.y + ego.speed * wp.t;
      const dy = Math.abs(wp.y - egoFutureY);
      const dx = Math.abs(wp.x - ego.x);

      if (dy < 4.0 && dx < 2.0 + wp.uncertaintyRadius) {
        overlapScore = Math.max(overlapScore, Math.max(0, 20 * (1 - wp.t / 3.0)));
        criticalFactor = `Predicted ${actor.type} path intersects ego corridor in ${formatNum(wp.t)}s`;
        break;
      }
    }
  }

  const rawScore = ttcScore + proximityScore + overlapScore;
  const score = clamp(Math.round(rawScore), 0, 100);

  let riskLevel: RiskLevel = 'LOW';
  if (score > RISK_THRESHOLDS.SCORE_HIGH_MAX) riskLevel = 'CRITICAL';
  else if (score > RISK_THRESHOLDS.SCORE_MED_MAX) riskLevel = 'HIGH';
  else if (score > RISK_THRESHOLDS.SCORE_LOW_MAX) riskLevel = 'MEDIUM';

  if (score > 60 && criticalFactor === 'Nominal distance') {
    criticalFactor = `Rapid closing approach (TTC ${formatNum(ttc)}s, dist ${formatNum(distance)}m)`;
  }

  return {
    actorId: actor.id,
    distance,
    closingSpeed,
    timeToCollision: ttc,
    spatialOverlapRisk: overlapScore / 20,
    riskScore: score,
    riskLevel,
    criticalFactor,
  };
}

/**
 * Aggregates all environmental, actor, road, and surface risks into a single unified global risk state.
 */
export function evaluateGlobalRisk(
  actors: TrackedActor[],
  ego: EgoVehicleState,
  road: RoadModel,
  predictions: Map<string, ActorPrediction>
): GlobalRiskState {
  let highestScore = 0;
  let primaryHazardActorId: string | null = null;
  let primaryHazardType: string | null = null;
  let primaryHazardDescription = 'Clear forward road corridor';
  let minTtc = Infinity;
  let nearestDist = Infinity;
  let nearestActorId: string | null = null;
  let nearestActorType: string | null = null;

  for (const actor of actors) {
    const pred = predictions.get(actor.id);
    const assessment = assessActorRisk(actor, ego, pred);

    if (actor.distanceToEgo < nearestDist) {
      nearestDist = actor.distanceToEgo;
      nearestActorId = actor.id;
      nearestActorType = actor.type;
    }

    if (isFinite(assessment.timeToCollision) && assessment.timeToCollision < minTtc) {
      minTtc = assessment.timeToCollision;
    }

    if (assessment.riskScore > highestScore) {
      highestScore = assessment.riskScore;
      primaryHazardActorId = actor.id;
      primaryHazardType = actor.type;
      primaryHazardDescription = assessment.criticalFactor;
    }
  }

  // Check surface hazards: Potholes ahead in path
  const potholesAhead = getPotholesNear(road, ego.y + 12, 12).filter(p => {
    return Math.abs(p.x - ego.x) < 1.4 && p.y > ego.y;
  });

  const potholeInCorridor = potholesAhead.length > 0;
  if (potholeInCorridor) {
    highestScore = Math.max(highestScore, 58); // Moderate-high risk for potholes
    if (!primaryHazardActorId) {
      primaryHazardDescription = `Severe pothole detected in forward corridor (${potholesAhead[0].depth}cm depth)`;
    }
  }

  // Road boundary check
  const bounds = getDrivableBounds(road, ego.y);
  const leftMargin = ego.x - bounds.leftX;
  const rightMargin = bounds.rightX - ego.x;
  const roadEdgeDist = Math.min(leftMargin, rightMargin);

  if (roadEdgeDist < 0.6) {
    highestScore = Math.max(highestScore, 75);
    primaryHazardDescription = `Critically close to irregular road edge (${formatNum(roadEdgeDist)}m clearance)`;
  }

  let overallLevel: RiskLevel = 'LOW';
  if (highestScore > RISK_THRESHOLDS.SCORE_HIGH_MAX) overallLevel = 'CRITICAL';
  else if (highestScore > RISK_THRESHOLDS.SCORE_MED_MAX) overallLevel = 'HIGH';
  else if (highestScore > RISK_THRESHOLDS.SCORE_LOW_MAX) overallLevel = 'MEDIUM';

  const dynamicSafetyMargin = calculateDynamicSafetyMargin(
    overallLevel,
    ego.speed,
    primaryHazardActorId ? 0.45 : 0.2
  );

  // Generate dynamic explainability sentence
  let explanation = '';
  if (overallLevel === 'CRITICAL') {
    explanation = `CRITICAL RISK (${highestScore}/100): ${primaryHazardDescription}. Emergency evasion/braking active!`;
  } else if (overallLevel === 'HIGH') {
    explanation = `HIGH RISK (${highestScore}/100): ${primaryHazardDescription}. Target speed reduced to avoid collision.`;
  } else if (overallLevel === 'MEDIUM') {
    explanation = `MODERATE RISK (${highestScore}/100): Approaching ${primaryHazardType || 'hazard'} with TTC ${formatNum(minTtc)}s. Adjusting safety margin.`;
  } else {
    explanation = `NOMINAL STATUS: Road corridor clear. Cruising at target speed with ${formatNum(dynamicSafetyMargin, 1)}m safety margin.`;
  }

  return {
    overallRiskScore: highestScore,
    overallRiskLevel: overallLevel,
    nearestActorDistance: nearestDist === Infinity ? 99.9 : nearestDist,
    nearestActorId,
    nearestActorType,
    minimumTTC: minTtc,
    primaryHazardActorId,
    primaryHazardDescription,
    dynamicSafetyMargin,
    potholeInCorridor,
    laneConfidence: bounds.laneConfidence,
    explanation,
  };
}
