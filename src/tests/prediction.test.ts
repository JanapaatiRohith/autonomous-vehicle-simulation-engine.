import { describe, it, expect } from 'vitest';
import { predictActorTrajectories, PREDICTION_HORIZON, PREDICTION_DT } from '../prediction/predictor';
import { calculateUncertaintyEnvelope } from '../prediction/uncertainty';
import { TrackedActor } from '../types/obstacle';

describe('Predictor & Uncertainty Engine', () => {
  it('generates waypoints matching the 3.0s horizon and 0.2s interval', () => {
    const mockActor: TrackedActor = {
      id: 'ped_1',
      type: 'PEDESTRIAN',
      x: 0,
      y: 20,
      speed: 1.5,
      vx: 0,
      vy: 1.5,
      heading: 0,
      acceleration: 0,
      width: 0.6,
      length: 0.6,
      behavior: 'SLOW_MOVING',
      uncertainty: 0.5,
      distanceToEgo: 20,
      longitudinalDistance: 20,
      lateralDistance: 0,
      relativeSpeed: 10,
      closingSpeed: 10,
      history: [],
      timeToCollision: 2.0,
      riskScore: 60,
    };

    const predictions = predictActorTrajectories([mockActor]);
    const pred = predictions.get('ped_1');

    expect(pred).toBeDefined();
    expect(pred?.waypoints.length).toBe(Math.round(PREDICTION_HORIZON / PREDICTION_DT)); // 15 steps

    // Check last waypoint at t=3.0s
    const lastWp = pred?.waypoints[pred.waypoints.length - 1];
    expect(lastWp?.t).toBeCloseTo(3.0);
    expect(lastWp?.y).toBeCloseTo(20 + 1.5 * 3.0); // 24.5m
  });

  it('grows uncertainty non-linearly over the prediction horizon', () => {
    const early = calculateUncertaintyEnvelope('PEDESTRIAN', 0.4);
    const late = calculateUncertaintyEnvelope('PEDESTRIAN', 2.8);

    expect(late.radius).toBeGreaterThan(early.radius);
  });

  it('allocates larger lateral uncertainty to pedestrian than truck', () => {
    const ped = calculateUncertaintyEnvelope('PEDESTRIAN', 2.0);
    const truck = calculateUncertaintyEnvelope('TRUCK', 2.0);

    expect(ped.sigmaX).toBeGreaterThan(truck.sigmaX);
  });
});
