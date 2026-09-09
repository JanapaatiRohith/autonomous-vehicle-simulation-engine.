import { SurroundingActor, ActorType, ACTOR_DEFAULTS } from '../types/obstacle';
import { EgoVehicleState } from '../types/vehicle';
import { RoadModel } from '../types/road';
import { clamp, euclideanDistance } from '../utils/math';

/**
 * Steps the state of all surrounding actors according to their behavior models.
 */
export function stepSurroundingActors(
  actors: SurroundingActor[],
  ego: EgoVehicleState,
  road: RoadModel,
  dt: number,
  simTime: number
): SurroundingActor[] {
  return actors.map(actor => {
    let { x, y, speed, vx, vy, heading, behavior, uncertainty, isTriggered, triggerDistance } = actor;

    // Check trigger condition for scriptable hazard crossing
    if (triggerDistance !== undefined && !isTriggered) {
      const distToEgo = euclideanDistance(x, y, ego.x, ego.y);
      if (distToEgo <= triggerDistance) {
        isTriggered = true;
      }
    }

    switch (behavior) {
      case 'STATIC':
      case 'STALLED':
        // Zero movement
        vx = 0;
        vy = 0;
        speed = 0;
        break;

      case 'SLOW_MOVING':
        // Moves steadily along road, e.g. overloaded truck or tractor
        vy = speed;
        vx = Math.sin(simTime * 0.5) * 0.1; // Gentle drifting
        y += vy * dt;
        x += vx * dt;
        heading = Math.atan2(vx, vy);
        break;

      case 'LANE_KEEPING':
        // Moving along road with slight lane keeping
        vy = speed;
        vx = Math.sin(simTime * 0.8 + Number(actor.id.charCodeAt(0) || 0)) * 0.2;
        y += vy * dt;
        x += vx * dt;
        heading = Math.atan2(vx, vy);
        break;

      case 'ERRATIC_WEAVING':
        // Indian two-wheeler or auto-rickshaw weaving dynamically
        const weaveFreq = 1.6;
        const weaveAmp = 1.2;
        vx = Math.cos(simTime * weaveFreq) * weaveAmp;
        vy = speed;
        x += vx * dt;
        y += vy * dt;
        heading = Math.atan2(vx, vy);
        break;

      case 'CROSSING':
        // Pedestrian or cattle crossing the street
        if (isTriggered !== false) {
          // If triggered or unconstrained, cross laterally towards targetX
          const targetX = actor.targetX ?? -2.5;
          const dir = Math.sign(targetX - x);
          vx = dir * speed;
          vy = 0.2; // Slight diagonal advance
          x += vx * dt;
          y += vy * dt;
          heading = Math.atan2(vx, vy);

          // If reached target shoulder, stop or slow down
          if (Math.abs(targetX - x) < 0.2) {
            vx = 0;
            vy = 0;
            behavior = 'STATIC';
          }
        }
        break;

      case 'CUT_IN':
        // Moving vehicle aggressively cutting into ego's lane
        if (isTriggered !== false) {
          const targetX = ego.x;
          const dx = targetX - x;
          vx = clamp(dx * 1.5, -3.0, 3.0);
          vy = speed;
          x += vx * dt;
          y += vy * dt;
          heading = Math.atan2(vx, vy);
        }
        break;
    }

    return {
      ...actor,
      x,
      y,
      speed,
      vx,
      vy,
      heading,
      behavior,
      isTriggered,
    };
  });
}

/**
 * Creates and injects an interactive hazard directly into the simulation world.
 */
let hazardCounter = 100;
export function createInjectedHazard(
  type: ActorType,
  ego: EgoVehicleState,
  road: RoadModel,
  distanceAhead = 24.0
): SurroundingActor {
  hazardCounter++;
  const id = `inj_${type.toLowerCase()}_${hazardCounter}`;
  const defaults = ACTOR_DEFAULTS[type];

  // Position hazard directly ahead or slightly on shoulder crossing into path
  let x = ego.x;
  let y = ego.y + distanceAhead;
  let vx = 0;
  let vy = 0;
  let behavior: SurroundingActor['behavior'] = 'STATIC';
  let targetX = ego.x;

  if (type === 'PEDESTRIAN' || type === 'ANIMAL') {
    // Starts at road shoulder and crosses across ego lane
    x = ego.x > 0 ? 3.6 : -3.6;
    targetX = ego.x > 0 ? -1.5 : 1.5;
    behavior = 'CROSSING';
    vx = (targetX - x) * 0.4;
  } else if (type === 'MOTORCYCLE' || type === 'AUTO_RICKSHAW') {
    x = ego.x + 1.2;
    behavior = 'ERRATIC_WEAVING';
    vy = defaults.defaultSpeed * 0.6;
  } else if (type === 'TRUCK') {
    x = ego.x;
    behavior = 'SLOW_MOVING';
    vy = 3.5;
  } else if (type === 'POTHOLE') {
    x = ego.x;
    behavior = 'STATIC';
  }

  return {
    id,
    type,
    x,
    y,
    speed: defaults.defaultSpeed,
    vx,
    vy,
    heading: 0,
    acceleration: 0,
    width: defaults.width,
    length: defaults.length,
    behavior,
    uncertainty: defaults.baseUncertainty,
    targetX,
    isTriggered: true,
  };
}
