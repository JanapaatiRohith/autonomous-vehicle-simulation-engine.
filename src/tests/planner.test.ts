import { describe, it, expect } from 'vitest';
import { planPath } from '../planning/planner';
import { createIndianRoadModel } from '../simulation/road';
import { createInitialEgoVehicle } from '../simulation/vehicle';
import { predictActorTrajectories } from '../prediction/predictor';
import { TrackedActor } from '../types/obstacle';
import { GlobalRiskState } from '../types/risk';

describe('Adaptive Path Planner', () => {
  const road = createIndianRoadModel({ nominalWidth: 7.2 });
  const ego = createInitialEgoVehicle('SEDAN', 'AUTONOMOUS', 45);

  const baseRisk: GlobalRiskState = {
    overallRiskScore: 10,
    overallRiskLevel: 'LOW',
    nearestActorDistance: 50,
    nearestActorId: null,
    nearestActorType: null,
    minimumTTC: Infinity,
    primaryHazardActorId: null,
    primaryHazardDescription: 'Nominal',
    dynamicSafetyMargin: 1.8,
    potholeInCorridor: false,
    laneConfidence: 0.5,
    explanation: 'Clear',
  };

  it('selects CENTER path with CRUISE decision when road corridor is clear', () => {
    const plan = planPath(ego, road, [], new Map(), baseRisk, 0);

    expect(plan.selectedPathId).toBe('CENTER');
    expect(plan.decision).toBe('CRUISE');
    expect(plan.candidates.CENTER.status).toBe('SAFE');
  });

  it('rejects CENTER path and selects evasive path or emergency brake when obstacle blocks center', () => {
    const blockedActor: TrackedActor = {
      id: 'blocker',
      type: 'STATIC_OBSTACLE',
      x: ego.x,
      y: ego.y + 18,
      speed: 0,
      vx: 0,
      vy: 0,
      heading: 0,
      acceleration: 0,
      width: 1.8,
      length: 2.0,
      behavior: 'STATIC',
      uncertainty: 0.1,
      distanceToEgo: 18,
      longitudinalDistance: 18,
      lateralDistance: 0,
      relativeSpeed: ego.speed,
      closingSpeed: ego.speed,
      history: [],
      timeToCollision: 18 / ego.speed,
      riskScore: 75,
    };

    const predictions = predictActorTrajectories([blockedActor]);

    const elevatedRisk: GlobalRiskState = {
      ...baseRisk,
      overallRiskScore: 75,
      overallRiskLevel: 'HIGH',
      minimumTTC: 18 / ego.speed,
      dynamicSafetyMargin: 2.2,
    };

    const plan = planPath(ego, road, [blockedActor], predictions, elevatedRisk, 0);

    // Center path must be rejected (BLOCKED or HIGH_RISK)
    expect(plan.candidates.CENTER.status).toBe('BLOCKED');
    expect(plan.selectedPathId).not.toBe('CENTER');
  });
});
