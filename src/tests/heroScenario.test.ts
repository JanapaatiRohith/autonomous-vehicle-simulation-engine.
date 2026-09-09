import { describe, it, expect } from 'vitest';
import { SimulationEngine } from '../simulation/engine';

describe('Hero Demo Integration Test (Scenario 5: Sudden Crossing)', () => {
  it('executes full autonomous perception-prediction-risk-planning-avoidance-recovery loop', () => {
    const sim = new SimulationEngine('SUDDEN_CROSSING', 'SEDAN', 'AUTONOMOUS', 45);

    let observedInitialState = false;
    let observedRiskIncrease = false;
    let observedPathReplanning = false;
    let observedDeceleration = false;
    let observedRecovery = false;

    const initialSpeed = sim.ego.speed;

    // Simulate 600 ticks (12.0 seconds of simulation time at 50Hz)
    for (let tick = 0; tick < 600; tick++) {
      sim.step();

      // 1. Initial state (cruising or cautious nominal speed before crossing)
      if (sim.simTime < 2.0 && (sim.ego.state === 'CRUISE' || sim.ego.state === 'CAUTIOUS')) {
        observedInitialState = true;
      }

      // 2. Animal crossing triggered at 2.5s -> High/Critical risk spike
      if (sim.simTime >= 2.6 && sim.riskState.overallRiskScore >= 50) {
        observedRiskIncrease = true;
      }

      // 3. Planner rejects blocked center path and commands evasive maneuver or emergency braking
      if (
        sim.simTime >= 2.6 &&
        (sim.plannerOutput.selectedPathId !== 'CENTER' ||
          sim.plannerOutput.decision === 'EMERGENCY_BRAKE' ||
          sim.plannerOutput.decision === 'AVOID_LEFT' ||
          sim.plannerOutput.decision === 'AVOID_RIGHT')
      ) {
        observedPathReplanning = true;
      }

      // 4. Vehicle speed decelerates significantly
      if (sim.simTime >= 2.8 && sim.ego.speed < initialSpeed * 0.85) {
        observedDeceleration = true;
      }

      // 5. Recovery after obstacle passes (speed accelerates back and returns to cruise/cautious/recover)
      if (sim.simTime > 7.0 && (sim.ego.state === 'CRUISE' || sim.ego.state === 'CAUTIOUS' || sim.ego.state === 'RECOVER' || sim.ego.speed > 8.0)) {
        observedRecovery = true;
      }
    }

    // Assertions verifying the complete autonomous pipeline
    expect(observedInitialState).toBe(true);
    expect(observedRiskIncrease).toBe(true);
    expect(observedPathReplanning).toBe(true);
    expect(observedDeceleration).toBe(true);
    expect(observedRecovery).toBe(true);

    const events = sim.eventLogger.getAllEvents();
    const collisionEvents = events.filter(e => e.message.includes('PHYSICAL CONTACT'));
    if (collisionEvents.length > 0) {
      console.log('FIRST COLLISION EVENT:', collisionEvents[0]);
    }
    expect(sim.metrics.collisionCount).toBe(0);
    expect(events.length).toBeGreaterThan(5);

    const hasHazardEvent = events.some(e => e.message.includes('HERO DEMO TRIGGER') || e.message.includes('animal'));
    expect(hasHazardEvent).toBe(true);
  });
});
