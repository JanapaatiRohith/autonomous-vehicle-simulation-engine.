/**
 * Smart Controller / 5x3 Occupancy Matrix Type Definitions
 * Problem Statement: SIH26037
 */

import { CandidatePathId } from './trajectory';

export type MatrixCellValue = 0 | 1 | 2;
// 0 = FREE
// 1 = OBSTACLE
// 2 = POTHOLE

export type Matrix5x3 = [
  [MatrixCellValue, MatrixCellValue, MatrixCellValue],
  [MatrixCellValue, MatrixCellValue, MatrixCellValue],
  [MatrixCellValue, MatrixCellValue, MatrixCellValue],
  [MatrixCellValue, MatrixCellValue, MatrixCellValue],
  [MatrixCellValue, MatrixCellValue, MatrixCellValue]
];

export type CellCode =
  | 'FP2' | 'F2' | 'FS2'
  | 'FP1' | 'F1' | 'FS1'
  | 'P'   | 'EGO'| 'S'
  | 'AP1' | 'A1' | 'AS1'
  | 'AP2' | 'A2' | 'AS2';

export const CELL_CODES_5X3: CellCode[][] = [
  ['FP2', 'F2', 'FS2'],
  ['FP1', 'F1', 'FS1'],
  ['P',   'EGO', 'S'],
  ['AP1', 'A1', 'AS1'],
  ['AP2', 'A2', 'AS2'],
];

export const CELL_NAMES: Record<CellCode, string> = {
  FP2: 'Far Port (Ahead Left 2)',
  F2:  'Far Forward (Ahead Center 2)',
  FS2: 'Far Starboard (Ahead Right 2)',
  FP1: 'Near Port (Ahead Left 1)',
  F1:  'Near Forward (Ahead Center 1)',
  FS1: 'Near Starboard (Ahead Right 1)',
  P:   'Port (Lateral Left)',
  EGO: 'Ego Vehicle Reference',
  S:   'Starboard (Lateral Right)',
  AP1: 'Aft Port (Behind Left 1)',
  A1:  'Aft Forward (Behind Center 1)',
  AS1: 'Aft Starboard (Behind Right 1)',
  AP2: 'Far Aft Port (Behind Left 2)',
  A2:  'Far Aft (Behind Center 2)',
  AS2: 'Far Aft Starboard (Behind Right 2)',
};

/**
 * Spatial boundaries in Ego-relative coordinate frame (meters).
 * y: longitudinal distance ahead (+)/behind (-)
 * x: lateral distance left (-)/right (+)
 */
export interface CellSpatialBounds {
  code: CellCode;
  row: number;
  col: number;
  yMin: number;
  yMax: number;
  xMin: number;
  xMax: number;
  nominalX: number;
  nominalY: number;
}

export const CELL_SPATIAL_BOUNDS: Record<CellCode, CellSpatialBounds> = {
  FP2: { code: 'FP2', row: 0, col: 0, yMin: 18, yMax: 35, xMin: -4.5, xMax: -1.2, nominalX: -2.5, nominalY: 26 },
  F2:  { code: 'F2',  row: 0, col: 1, yMin: 18, yMax: 35, xMin: -1.2, xMax: 1.2,  nominalX: 0.0,  nominalY: 26 },
  FS2: { code: 'FS2', row: 0, col: 2, yMin: 18, yMax: 35, xMin: 1.2,  xMax: 4.5,  nominalX: 2.5,  nominalY: 26 },

  FP1: { code: 'FP1', row: 1, col: 0, yMin: 4.5, yMax: 18, xMin: -4.5, xMax: -1.2, nominalX: -2.5, nominalY: 11 },
  F1:  { code: 'F1',  row: 1, col: 1, yMin: 4.5, yMax: 18, xMin: -1.2, xMax: 1.2,  nominalX: 0.0,  nominalY: 11 },
  FS1: { code: 'FS1', row: 1, col: 2, yMin: 4.5, yMax: 18, xMin: 1.2,  xMax: 4.5,  nominalX: 2.5,  nominalY: 11 },

  P:   { code: 'P',   row: 2, col: 0, yMin: -3.5, yMax: 4.5, xMin: -4.5, xMax: -1.2, nominalX: -2.5, nominalY: 0 },
  EGO: { code: 'EGO', row: 2, col: 1, yMin: -2.5, yMax: 2.5, xMin: -1.1, xMax: 1.1,  nominalX: 0.0,  nominalY: 0 },
  S:   { code: 'S',   row: 2, col: 2, yMin: -3.5, yMax: 4.5, xMin: 1.2,  xMax: 4.5,  nominalX: 2.5,  nominalY: 0 },

  AP1: { code: 'AP1', row: 3, col: 0, yMin: -16, yMax: -3.5, xMin: -4.5, xMax: -1.2, nominalX: -2.5, nominalY: -10 },
  A1:  { code: 'A1',  row: 3, col: 1, yMin: -16, yMax: -3.5, xMin: -1.2, xMax: 1.2,  nominalX: 0.0,  nominalY: -10 },
  AS1: { code: 'AS1', row: 3, col: 2, yMin: -16, yMax: -3.5, xMin: 1.2,  xMax: 4.5,  nominalX: 2.5,  nominalY: -10 },

  AP2: { code: 'AP2', row: 4, col: 0, yMin: -32, yMax: -16, xMin: -4.5, xMax: -1.2, nominalX: -2.5, nominalY: -24 },
  A2:  { code: 'A2',  row: 4, col: 1, yMin: -32, yMax: -16, xMin: -1.2, xMax: 1.2,  nominalX: 0.0,  nominalY: -24 },
  AS2: { code: 'AS2', row: 4, col: 2, yMin: -32, yMax: -16, xMin: 1.2,  xMax: 4.5,  nominalX: 2.5,  nominalY: -24 },
};

export type SmartCaseId =
  | 'CASE_A_CLEAR_ROAD'
  | 'CASE_B_OBSTACLE_AHEAD'
  | 'CASE_C_LEFT_LANE_BLOCK'
  | 'CASE_D_RIGHT_LANE_BLOCK'
  | 'CASE_E_OBSTACLE_RICH'
  | 'CASE_F_POTHOLE'
  | 'CASE_G_EMERGENCY_FRONT'
  | 'CASE_H_RECOVERY';

export interface SmartCaseDefinition {
  id: SmartCaseId;
  name: string;
  shortName: string;
  tagline: string;
  expectedBehavior: string;
  matrix: Matrix5x3;
}

export const SMART_CASES: Record<SmartCaseId, SmartCaseDefinition> = {
  CASE_A_CLEAR_ROAD: {
    id: 'CASE_A_CLEAR_ROAD',
    name: 'Case A: Clear Road',
    shortName: 'Clear Road',
    tagline: 'All matrix cells clear; ego cruises at nominal setpoint',
    expectedBehavior: 'Normal cruise & acceleration along center corridor. Zero collision risk.',
    matrix: [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ],
  },
  CASE_B_OBSTACLE_AHEAD: {
    id: 'CASE_B_OBSTACLE_AHEAD',
    name: 'Case B: Obstacle Ahead',
    shortName: 'Obstacle Ahead',
    tagline: 'Dynamic obstacle detected in forward lane (F1=1)',
    expectedBehavior: 'Risk increases, speed reduces, planner evaluates safe left/right evasive detour or follow behavior.',
    matrix: [
      [0, 0, 0],
      [0, 1, 0],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ],
  },
  CASE_C_LEFT_LANE_BLOCK: {
    id: 'CASE_C_LEFT_LANE_BLOCK',
    name: 'Case C: Left Lane Block',
    shortName: 'Left Block',
    tagline: 'Left & Center corridors blocked (F1=1, FP1=1, P=1)',
    expectedBehavior: 'Left path rejected. Right path selected. Ego vehicle physically steers right.',
    matrix: [
      [0, 0, 0],
      [1, 1, 0],
      [1, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ],
  },
  CASE_D_RIGHT_LANE_BLOCK: {
    id: 'CASE_D_RIGHT_LANE_BLOCK',
    name: 'Case D: Right Lane Block',
    shortName: 'Right Block',
    tagline: 'Right & Center corridors blocked (F1=1, FS1=1, S=1)',
    expectedBehavior: 'Right path rejected. Left path selected. Ego vehicle physically steers left.',
    matrix: [
      [0, 0, 0],
      [0, 1, 1],
      [0, 0, 1],
      [0, 0, 0],
      [0, 0, 0],
    ],
  },
  CASE_E_OBSTACLE_RICH: {
    id: 'CASE_E_OBSTACLE_RICH',
    name: 'Case E: Obstacle-Rich',
    shortName: 'Obstacle-Rich',
    tagline: 'Multiple surrounding obstacles (FP2=1, FS2=1, FP1=1, F2=1)',
    expectedBehavior: 'Multiple candidates rejected, risk escalates, controlled avoidance or graduated deceleration.',
    matrix: [
      [1, 1, 1],
      [1, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ],
  },
  CASE_F_POTHOLE: {
    id: 'CASE_F_POTHOLE',
    name: 'Case F: Pothole',
    shortName: 'Pothole Ahead',
    tagline: 'Severe road surface defect in center forward lane (F1=2)',
    expectedBehavior: 'Vehicle detects road defect, penalizes center path, reduces speed and bypasses.',
    matrix: [
      [0, 0, 0],
      [0, 2, 0],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ],
  },
  CASE_G_EMERGENCY_FRONT: {
    id: 'CASE_G_EMERGENCY_FRONT',
    name: 'Case G: Emergency Front Obstacle',
    shortName: 'Emergency Stop',
    tagline: 'Imminent frontal blockage across all forward lanes (FP1=1, F1=1, FS1=1)',
    expectedBehavior: 'All candidates blocked. Immediate hard emergency braking (-8 m/s²).',
    matrix: [
      [0, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ],
  },
  CASE_H_RECOVERY: {
    id: 'CASE_H_RECOVERY',
    name: 'Case H: Recovery',
    shortName: 'Recovery',
    tagline: 'Corridors clear after obstacle pass',
    expectedBehavior: 'Smoothly realigns to center corridor, resumes nominal cruise speed.',
    matrix: [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ],
  },
};

export type SmartAction =
  | 'CRUISE'
  | 'FOLLOW'
  | 'DECELERATE'
  | 'AVOID_LEFT'
  | 'AVOID_RIGHT'
  | 'EMERGENCY_BRAKE'
  | 'RECOVER';

export interface SmartRejectedPath {
  pathId: CandidatePathId;
  reason: string;
}

export interface SmartControllerOutput {
  matrix: Matrix5x3;
  cellCodes: CellCode[][];
  activeCaseId?: SmartCaseId;
  interpretation: string;
  selectedAction: SmartAction;
  fsmState: string;
  targetSpeedKmh: number;
  commandedSteerDeg: number;
  commandedBrakingDecel: number;
  calculatedTTC: number;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  selectedPathId: CandidatePathId;
  rejectedPaths: SmartRejectedPath[];
  isManualOverride: boolean;
}
