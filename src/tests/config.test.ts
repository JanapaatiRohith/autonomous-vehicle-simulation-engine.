import { describe, it, expect } from 'vitest';
import { SimulationEngine } from '../simulation/engine';
import { DEFAULT_SIMULATION_CONFIG, generateActorsForConfig } from '../types/config';
import { generateCandidateTrajectories } from '../planning/trajectoryGenerator';

describe('Simulation Config & User Control Rigorous Validation', () => {
  it('dynamically adapts road width geometry and candidate trajectory lateral offsets', () => {
    const engine = new SimulationEngine('SUDDEN_CROSSING', 'SEDAN', 'AUTONOMOUS', 45);

    // 1. Configure to Narrow 6m Road
    engine.applyConfig({
      ...engine.config,
      roadWidthM: 6.0,
    });

    expect(engine.road.nominalWidth).toBe(6.0);
    // Left and right drivable boundaries must match half-width: [-3.0, 3.0]
    expect(engine.road.segments[0].leftEdgeOffset).toBeCloseTo(3.0);
    expect(engine.road.segments[0].rightEdgeOffset).toBeCloseTo(3.0);

    // Trajectory generator must generate tighter evasive offsets for 6m road
    const candidatesNarrow = generateCandidateTrajectories(
      engine.ego,
      engine.road
    );
    const leftOffsetNarrow = Math.abs(candidatesNarrow.LEFT.points[candidatesNarrow.LEFT.points.length - 1].x - engine.ego.x);
    expect(leftOffsetNarrow).toBeLessThanOrEqual(1.8);

    // 2. Configure to Wide 14m Highway
    engine.applyConfig({
      ...engine.config,
      roadWidthM: 14.0,
    });

    expect(engine.road.nominalWidth).toBe(14.0);
    expect(engine.road.segments[0].leftEdgeOffset).toBeCloseTo(7.0);
    expect(engine.road.segments[0].rightEdgeOffset).toBeCloseTo(7.0);

    const candidatesWide = generateCandidateTrajectories(
      engine.ego,
      engine.road
    );
    const leftOffsetWide = Math.abs(candidatesWide.LEFT.points[candidatesWide.LEFT.points.length - 1].x - engine.ego.x);
    expect(leftOffsetWide).toBeGreaterThan(2.8);
    expect(leftOffsetWide).toBeGreaterThan(leftOffsetNarrow);
  });

  it('genuinely modifies initial speed target and ego dynamics', () => {
    const engine = new SimulationEngine('SUDDEN_CROSSING', 'SEDAN', 'AUTONOMOUS', 45);

    // Override initial speed to 70 km/h with restart
    engine.applyConfig(
      {
        ...engine.config,
        initialSpeedKmh: 70,
      },
      true // restart
    );

    expect(engine.config.initialSpeedKmh).toBe(70);
    expect(engine.ego.targetSpeed).toBeCloseTo(70 / 3.6, 0);
    expect(engine.ego.speed).toBeGreaterThan(18.0);
    expect(engine.ego.speed).toBeLessThanOrEqual(70 / 3.6 + 0.1);
  });

  it('responds causally to authentic manual driving controls (WASD & Space Emergency Brake)', () => {
    const engine = new SimulationEngine('SUDDEN_CROSSING', 'SEDAN', 'MANUAL', 30);
    expect(engine.ego.drivingMode).toBe('MANUAL');

    // 1. Throttle test
    engine.manualControls.throttle = true;
    engine.manualControls.brake = false;
    const initialSpeed = engine.ego.speed;

    // Advance 10 ticks (0.2s)
    for (let i = 0; i < 10; i++) {
      engine.step();
    }

    expect(engine.ego.speed).toBeGreaterThan(initialSpeed);
    expect(engine.ego.acceleration).toBeGreaterThan(0);

    // 2. Steering test (Steer Left)
    engine.manualControls.steerLeft = true;
    engine.manualControls.steerRight = false;
    const initialHeading = engine.ego.heading;

    for (let i = 0; i < 15; i++) {
      engine.step();
    }

    // Vehicle must turn left (heading becomes negative or changes significantly)
    expect(engine.ego.steeringAngle).toBeLessThan(0);
    expect(engine.ego.heading).toBeLessThan(initialHeading);

    // 3. Emergency Brake Spacebar test
    engine.manualControls.throttle = false;
    engine.manualControls.emergencyBrake = true;
    const speedBeforeBrake = engine.ego.speed;

    for (let i = 0; i < 10; i++) {
      engine.step();
    }

    expect(engine.ego.acceleration).toBe(-8.0); // Maximum emergency decel
    expect(engine.ego.speed).toBeLessThan(speedBeforeBrake);
  });

  it('generates custom unstructured traffic actors based on user configuration', () => {
    const customConfig = {
      ...DEFAULT_SIMULATION_CONFIG,
      roadWidthM: 10.0,
      numberOfVehicles: 2,
      numberOfMotorcycles: 3,
      numberOfAutos: 2,
      numberOfPedestrians: 2,
      numberOfAnimals: 1,
    };

    const actors = generateActorsForConfig(customConfig, 10);
    expect(actors.length).toBe(10);

    const vehicleTypes = actors.map(a => a.type);
    expect(vehicleTypes.filter(t => t === 'CAR' || t === 'TRUCK').length).toBe(2);
    expect(vehicleTypes.filter(t => t === 'MOTORCYCLE').length).toBe(3);
    expect(vehicleTypes.filter(t => t === 'AUTO_RICKSHAW').length).toBe(2);
    expect(vehicleTypes.filter(t => t === 'PEDESTRIAN').length).toBe(2);
    expect(vehicleTypes.filter(t => t === 'ANIMAL').length).toBe(1);
  });
});
