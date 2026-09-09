import { describe, it, expect } from 'vitest';
import { SimulationEngine } from '../simulation/engine';
import {
  createEmptyMatrix,
  cloneMatrix,
  toggleMatrixCell,
  setMatrixCell,
  getSmartCaseMatrix,
  matrixToSpatialHazards,
  countMatrixHazards,
} from '../smartController/matrixManager';
import { planSmartController } from '../smartController/smartPlanner';
import { SMART_CASES, SmartCaseId, Matrix5x3 } from '../types/smartController';

describe('Smart Controller 5×3 Occupancy Matrix & Causal Arbitrator', () => {
  describe('Matrix Data Structure & State Transitions', () => {
    it('initializes a clean 5×3 matrix with all cells set to 0 (FREE)', () => {
      const mat = createEmptyMatrix();
      expect(mat.length).toBe(5);
      mat.forEach(row => {
        expect(row.length).toBe(3);
        row.forEach(cell => expect(cell).toBe(0));
      });
    });

    it('implements cyclic cell toggling: 0 (FREE) -> 1 (OBSTACLE) -> 2 (POTHOLE) -> 0 (FREE)', () => {
      let mat = createEmptyMatrix();
      expect(mat[1][1]).toBe(0); // F1

      mat = toggleMatrixCell(mat, 1, 1);
      expect(mat[1][1]).toBe(1); // 1 = OBSTACLE

      mat = toggleMatrixCell(mat, 1, 1);
      expect(mat[1][1]).toBe(2); // 2 = POTHOLE

      mat = toggleMatrixCell(mat, 1, 1);
      expect(mat[1][1]).toBe(0); // 0 = FREE
    });

    it('correctly sets individual cells and counts hazards', () => {
      let mat = createEmptyMatrix();
      mat = setMatrixCell(mat, 1, 1, 1); // F1 obstacle
      mat = setMatrixCell(mat, 0, 0, 2); // FP2 pothole

      const counts = countMatrixHazards(mat);
      expect(counts.obstacles).toBe(1);
      expect(counts.potholes).toBe(1);
      expect(counts.total).toBe(2);
    });

    it('synthesizes physical spatial hazards from matrix cells for 3D/2D visual fidelity', () => {
      const engine = new SimulationEngine('SUDDEN_CROSSING', 'SEDAN', 'AUTONOMOUS', 45);
      let mat = createEmptyMatrix();
      mat[1][1] = 1; // Obstacle at F1 (+12m ahead, center)
      mat[1][0] = 2; // Pothole at FP1 (+12m ahead, port/left)

      const hazards = matrixToSpatialHazards(mat, engine.ego, engine.road);
      expect(hazards.actors.length).toBe(1);
      expect(hazards.potholes.length).toBe(1);

      // F1 obstacle is ahead of ego (y > ego.y) and close to center lane
      expect(hazards.actors[0].y).toBeGreaterThan(engine.ego.y);
      expect(Math.abs(hazards.actors[0].x - engine.ego.x)).toBeLessThanOrEqual(0.5);

      // FP1 pothole is on left port side (x < ego.x)
      expect(hazards.potholes[0].x).toBeLessThan(engine.ego.x);
      expect(hazards.potholes[0].y).toBeGreaterThan(engine.ego.y);
    });
  });

  describe('Predefined Cases A through H Causal Validation', () => {
    const engine = new SimulationEngine('SUDDEN_CROSSING', 'SEDAN', 'AUTONOMOUS', 45);

    it('Case A (Clear Road): selects CENTER, cruises with 0 steer and zero rejected corridors', () => {
      const centerEgo = { ...engine.ego, x: 0 };
      const matrix = getSmartCaseMatrix('CASE_A_CLEAR_ROAD');
      const output = planSmartController(matrix, centerEgo, engine.road);

      expect(output.selectedPathId).toBe('CENTER');
      expect(output.selectedAction).toBe('CRUISE');
      expect(output.commandedBrakingDecel).toBe(0);
      expect(Math.abs(output.commandedSteerDeg)).toBeLessThan(0.1);
      expect(output.targetSpeedKmh).toBe(45);
      expect(output.riskScore).toBeLessThanOrEqual(5);
      expect(output.riskLevel).toBe('LOW');
      expect(output.rejectedPaths.length).toBe(0);
    });

    it('Case B (Obstacle Ahead): rejects CENTER due to forward obstruction, chooses safe evasive corridor', () => {
      const matrix = getSmartCaseMatrix('CASE_B_OBSTACLE_AHEAD');
      const output = planSmartController(matrix, engine.ego, engine.road);

      // Must NOT choose CENTER
      expect(output.selectedPathId).not.toBe('CENTER');
      expect(['LEFT', 'RIGHT']).toContain(output.selectedPathId);
      expect(['AVOID_LEFT', 'AVOID_RIGHT']).toContain(output.selectedAction);

      // CENTER must be in rejected paths with clear spatial causality
      const centerRejection = output.rejectedPaths.find(p => p.pathId === 'CENTER');
      expect(centerRejection).toBeDefined();
      expect(centerRejection?.reason).toMatch(/blocked|conflict/i);

      // Commanded steering must reflect lateral avoidance maneuver
      expect(Math.abs(output.commandedSteerDeg)).toBeGreaterThan(2.0);
    });

    it('Case C (Left Block): rejects LEFT corridor, steers toward center or right clearance', () => {
      const matrix = getSmartCaseMatrix('CASE_C_LEFT_LANE_BLOCK');
      const output = planSmartController(matrix, engine.ego, engine.road);

      expect(output.selectedPathId).not.toBe('LEFT');
      const leftRejection = output.rejectedPaths.find(p => p.pathId === 'LEFT');
      expect(leftRejection).toBeDefined();
      expect(leftRejection?.reason).toMatch(/Port/i);

      // Vehicle must not steer left into port obstacle
      expect(output.commandedSteerDeg).toBeGreaterThanOrEqual(-0.5);
    });

    it('Case D (Right Block): rejects RIGHT corridor, steers toward center or left clearance', () => {
      const matrix = getSmartCaseMatrix('CASE_D_RIGHT_LANE_BLOCK');
      const output = planSmartController(matrix, engine.ego, engine.road);

      expect(output.selectedPathId).not.toBe('RIGHT');
      const rightRejection = output.rejectedPaths.find(p => p.pathId === 'RIGHT');
      expect(rightRejection).toBeDefined();
      expect(rightRejection?.reason).toMatch(/Starboard/i);

      // Vehicle must not steer right into starboard obstacle
      expect(output.commandedSteerDeg).toBeLessThanOrEqual(0.5);
    });

    it('Case E (Obstacle-Rich): successfully evaluates dense spatial hazards and rejects unsafe corridors', () => {
      const matrix = getSmartCaseMatrix('CASE_E_OBSTACLE_RICH');
      const output = planSmartController(matrix, engine.ego, engine.road);

      expect(output.rejectedPaths.length).toBeGreaterThanOrEqual(1);
      expect(output.riskScore).toBeGreaterThan(30);
      expect(['AVOID_LEFT', 'AVOID_RIGHT', 'EMERGENCY_BRAKE', 'SLOW_FOR_HAZARDS']).toContain(output.selectedAction);
    });

    it('Case F (Pothole Ahead): detects pothole and initiates evasive swerve or speed mitigation', () => {
      const matrix = getSmartCaseMatrix('CASE_F_POTHOLE');
      const output = planSmartController(matrix, engine.ego, engine.road);

      if (output.selectedPathId === 'CENTER') {
        // If proceeding center, speed must be reduced to mitigate suspension shock
        expect(output.targetSpeedKmh).toBeLessThanOrEqual(25);
        expect(output.commandedBrakingDecel).toBeLessThan(0);
      } else {
        // Swerves around pothole
        expect(['LEFT', 'RIGHT']).toContain(output.selectedPathId);
      }
    });

    it('Case G (Emergency Front Block): rejects all forward corridors and commands full emergency braking', () => {
      const matrix = getSmartCaseMatrix('CASE_G_EMERGENCY_FRONT');
      const output = planSmartController(matrix, engine.ego, engine.road);

      expect(output.selectedAction).toBe('EMERGENCY_BRAKE');
      expect(output.commandedBrakingDecel).toBeLessThanOrEqual(-6.0);
      expect(output.targetSpeedKmh).toBe(0);
      expect(output.riskScore).toBeGreaterThanOrEqual(90);
      expect(output.rejectedPaths.length).toBe(3); // ALL 3 corridors rejected!
    });

    it('Case H (Recovery to Center): smoothly steers back to road center line when road ahead is clear', () => {
      const offsetEgo = { ...engine.ego, x: -1.8 }; // Offset left
      const matrix = getSmartCaseMatrix('CASE_H_RECOVERY');
      const output = planSmartController(matrix, offsetEgo, engine.road);

      expect(output.selectedPathId).toBe('CENTER');
      expect(output.selectedAction).toBe('RECOVER');
      // Steering must steer right (positive) to recover from left offset
      expect(output.commandedSteerDeg).toBeGreaterThan(0.5);
    });
  });

  describe('Non-Hardcoded Emergent Arbitration & Engine Integration', () => {
    it('dynamically adapts when cell is manually toggled from clear to blocked', () => {
      const engine = new SimulationEngine('SUDDEN_CROSSING', 'SEDAN', 'AUTONOMOUS', 45);
      engine.setSimulationType('SMART_CONTROLLER');

      // Initially clear road
      engine.resetSmartMatrix();
      engine.step();
      expect(engine.smartControllerOutput.selectedPathId).toBe('CENTER');
      expect(['CRUISE', 'RECOVER', 'MAINTAIN_CENTER']).toContain(engine.smartControllerOutput.selectedAction);

      // Now inject obstacle at F1 (row 1, col 1)
      engine.setSmartCell(1, 1, 1);
      engine.step();

      // Controller must immediately reject CENTER and steer away
      expect(engine.smartControllerOutput.selectedPathId).not.toBe('CENTER');
      expect(['LEFT', 'RIGHT']).toContain(engine.smartControllerOutput.selectedPathId);
      expect(engine.smartControllerOutput.rejectedPaths.some(r => r.pathId === 'CENTER')).toBe(true);

      // Now clear cell back to 0
      engine.setSmartCell(1, 1, 0);
      engine.step();

      // Controller returns to CENTER cruise
      expect(engine.smartControllerOutput.selectedPathId).toBe('CENTER');
    });

    it('seamlessly switches between Adaptive Autonomous and Smart Controller simulation types without state pollution', () => {
      const engine = new SimulationEngine('SUDDEN_CROSSING', 'SEDAN', 'AUTONOMOUS', 45);

      // 1. Adaptive Autonomous Mode
      expect(engine.config.simulationType).toBe('ADAPTIVE_AUTONOMOUS');
      engine.step();
      const adaptivePath = engine.plannerOutput.selectedPathId;
      expect(adaptivePath).toBeDefined();

      // 2. Switch to Smart Controller
      engine.setSimulationType('SMART_CONTROLLER');
      expect(engine.config.simulationType).toBe('SMART_CONTROLLER');
      engine.setSmartCase('CASE_B_OBSTACLE_AHEAD');
      engine.step();
      expect(engine.smartControllerOutput.selectedAction).toMatch(/AVOID/);

      // 3. Switch back to Adaptive Autonomous
      engine.setSimulationType('ADAPTIVE_AUTONOMOUS');
      expect(engine.config.simulationType).toBe('ADAPTIVE_AUTONOMOUS');
      engine.step();
      expect(engine.plannerOutput.selectedPathId).toBeDefined();
    });
  });
});
