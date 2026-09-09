import { RawSensorDetection } from './detector';
import { TrackedActor } from '../types/obstacle';
import { EgoVehicleState } from '../types/vehicle';
import { euclideanDistance } from '../utils/math';

export class ActorTracker {
  private tracks: Map<string, TrackedActor> = new Map();

  /**
   * Updates multi-object tracking using latest sensor detections.
   */
  update(
    detections: RawSensorDetection[],
    ego: EgoVehicleState,
    simTime: number,
    dt: number
  ): TrackedActor[] {
    const activeIds = new Set<string>();
    const updatedList: TrackedActor[] = [];

    // Ego velocity vector in road frame
    const egoVx = ego.speed * Math.sin(ego.heading);
    const egoVy = ego.speed * Math.cos(ego.heading);

    for (const det of detections) {
      const actor = det.actor;
      activeIds.add(actor.id);

      const dx = actor.x - ego.x;
      const dy = actor.y - ego.y;
      const distance = euclideanDistance(ego.x, ego.y, actor.x, actor.y);

      // Relative velocity: how fast ego is moving toward actor
      const relVx = egoVx - actor.vx;
      const relVy = egoVy - actor.vy;

      // Rate of distance decrease (closing speed)
      let closingSpeed = 0;
      if (distance > 0.1) {
        closingSpeed = (dx * relVx + dy * relVy) / distance;
      }

      // Time To Collision (TTC)
      let ttc = Infinity;
      if (closingSpeed > 0.05 && dy > -2.0) {
        ttc = distance / closingSpeed;
      }

      // Track history
      let existing = this.tracks.get(actor.id);
      let history: Array<{ x: number; y: number; time: number }> = [];

      if (existing) {
        history = [...existing.history, { x: actor.x, y: actor.y, time: simTime }];
        if (history.length > 12) history.shift();
      } else {
        history = [{ x: actor.x, y: actor.y, time: simTime }];
      }

      const tracked: TrackedActor = {
        ...actor,
        distanceToEgo: distance,
        longitudinalDistance: dy,
        lateralDistance: dx,
        relativeSpeed: Math.sqrt(relVx * relVx + relVy * relVy),
        closingSpeed,
        history,
        timeToCollision: ttc,
        riskScore: 0, // Will be computed by risk engine
      };

      this.tracks.set(actor.id, tracked);
      updatedList.push(tracked);
    }

    // Clean up tracks no longer detected
    for (const id of Array.from(this.tracks.keys())) {
      if (!activeIds.has(id)) {
        this.tracks.delete(id);
      }
    }

    return updatedList;
  }

  /**
   * Clears all tracking state on simulation reset.
   */
  reset(): void {
    this.tracks.clear();
  }
}
