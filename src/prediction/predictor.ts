import { TrackedActor } from '../types/obstacle';
import { ActorPrediction, PredictedWaypoint } from '../types/prediction';
import { calculateUncertaintyEnvelope } from './uncertainty';

export const PREDICTION_HORIZON = 3.0; // seconds
export const PREDICTION_DT = 0.2; // seconds (15 steps)

/**
 * Generates deterministic short-term motion predictions with expanding uncertainty envelopes.
 */
export function predictActorTrajectories(
  actors: TrackedActor[],
  horizon = PREDICTION_HORIZON,
  dt = PREDICTION_DT
): Map<string, ActorPrediction> {
  const predictions = new Map<string, ActorPrediction>();

  for (const actor of actors) {
    const waypoints: PredictedWaypoint[] = [];
    const numSteps = Math.round(horizon / dt);

    for (let i = 1; i <= numSteps; i++) {
      const t = i * dt;

      // Kinematic propagation: constant velocity with slight heading evolution
      let predX = actor.x + actor.vx * t;
      let predY = actor.y + actor.vy * t;

      // Handle crossing actor target boundary
      if (actor.behavior === 'CROSSING' && actor.targetX !== undefined) {
        if ((actor.vx > 0 && predX > actor.targetX) || (actor.vx < 0 && predX < actor.targetX)) {
          predX = actor.targetX;
        }
      }

      // Uncertainty expansion
      const uncertainty = calculateUncertaintyEnvelope(actor.type, t, actor.uncertainty);

      waypoints.push({
        t,
        x: predX,
        y: predY,
        heading: actor.heading,
        sigmaX: uncertainty.sigmaX,
        sigmaY: uncertainty.sigmaY,
        uncertaintyRadius: uncertainty.radius,
      });
    }

    predictions.set(actor.id, {
      actorId: actor.id,
      actorType: actor.type,
      horizon,
      dt,
      waypoints,
      currentSpeed: actor.speed,
    });
  }

  return predictions;
}
