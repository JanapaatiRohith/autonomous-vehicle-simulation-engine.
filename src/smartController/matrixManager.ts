/**
 * 5x3 Occupancy Matrix Manager
 * Handles forward perception mapping, inverse spatial synthesis, and cell manipulations.
 * Problem Statement: SIH26037
 */

import {
  Matrix5x3,
  MatrixCellValue,
  CellCode,
  CELL_CODES_5X3,
  CELL_SPATIAL_BOUNDS,
  SmartCaseId,
  SMART_CASES,
} from '../types/smartController';
import { TrackedActor, SurroundingActor } from '../types/obstacle';
import { EgoVehicleState } from '../types/vehicle';
import { RoadModel, Pothole } from '../types/road';

export function createEmptyMatrix(): Matrix5x3 {
  return [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
}

export function cloneMatrix(m: Matrix5x3): Matrix5x3 {
  return [
    [...m[0]],
    [...m[1]],
    [...m[2]],
    [...m[3]],
    [...m[4]],
  ];
}

/**
 * Computes 5x3 occupancy matrix directly from live tracked actors & potholes in ego frame.
 * 0 = FREE, 1 = OBSTACLE, 2 = POTHOLE
 */
export function computeMatrixFromEnvironment(
  actors: TrackedActor[],
  potholes: Pothole[],
  ego: EgoVehicleState
): Matrix5x3 {
  const matrix = createEmptyMatrix();

  // 1. Map dynamic actors into matrix cells
  for (const actor of actors) {
    const dy = actor.longitudinalDistance; // relative to ego y
    const dx = actor.lateralDistance;      // relative to ego x

    const row = getRowIndexFromDy(dy);
    const col = getColIndexFromDx(dx);

    if (row >= 0 && col >= 0) {
      // Don't overwrite EGO cell (row 2, col 1) unless it's a direct overlap
      matrix[row][col] = 1;
    }
  }

  // 2. Map road potholes into matrix cells (potholes have value 2)
  for (const pot of potholes) {
    const dy = pot.y - ego.y;
    const dx = pot.x - ego.x;

    const row = getRowIndexFromDy(dy);
    const col = getColIndexFromDx(dx);

    if (row >= 0 && col >= 0) {
      // Pothole takes precedence if cell is free, or marks cell as 2
      if (matrix[row][col] === 0) {
        matrix[row][col] = 2;
      }
    }
  }

  // Center cell [2][1] is EGO position itself
  matrix[2][1] = 0;

  return matrix;
}

function getRowIndexFromDy(dy: number): number {
  if (dy >= 18 && dy <= 35) return 0;   // FP2, F2, FS2 (Far Ahead)
  if (dy >= 4.5 && dy < 18) return 1;   // FP1, F1, FS1 (Near Ahead)
  if (dy >= -3.5 && dy < 4.5) return 2; // P, EGO, S    (Lateral)
  if (dy >= -16 && dy < -3.5) return 3; // AP1, A1, AS1 (Near Aft)
  if (dy >= -32 && dy < -16) return 4;  // AP2, A2, AS2 (Far Aft)
  return -1;
}

function getColIndexFromDx(dx: number): number {
  if (dx < -1.1 && dx >= -4.5) return 0; // Port (Left)
  if (dx >= -1.1 && dx <= 1.1) return 1; // Forward (Center)
  if (dx > 1.1 && dx <= 4.5) return 2;   // Starboard (Right)
  return -1;
}

/**
 * Converts a 5x3 occupancy matrix into spatial obstacles and potholes in world coordinates.
 * Allows interactive matrix edits to physically manifest in the 3D and 2D environments.
 */
export function matrixToSpatialHazards(
  matrix: Matrix5x3,
  ego: EgoVehicleState,
  road: RoadModel
): { actors: SurroundingActor[]; potholes: Pothole[] } {
  const actors: SurroundingActor[] = [];
  const potholes: Pothole[] = [];

  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 3; c++) {
      // Skip ego reference cell
      if (r === 2 && c === 1) continue;

      const val = matrix[r][c];
      if (val === 0) continue;

      const code = CELL_CODES_5X3[r][c];
      const bounds = CELL_SPATIAL_BOUNDS[code];

      // World coordinates derived from ego pose
      const worldX = ego.x + bounds.nominalX;
      const worldY = ego.y + bounds.nominalY;

      if (val === 1) {
        // Value 1 = Obstacle
        const vy = Math.max(0, ego.speed * 0.4);
        actors.push({
          id: `matrix_actor_${code}`,
          type: r <= 1 && c === 1 ? 'CAR' : c === 0 ? 'AUTO_RICKSHAW' : 'CAR',
          x: worldX,
          y: worldY,
          speed: vy,
          vx: 0,
          vy,
          heading: 0,
          acceleration: 0,
          behavior: 'SLOW_MOVING',
          uncertainty: 0.25,
          length: 3.8,
          width: 1.8,
        });
      } else if (val === 2) {
        // Value 2 = Pothole
        potholes.push({
          id: `matrix_pothole_${code}`,
          x: worldX,
          y: worldY,
          diameter: 1.2,
          depth: 12,
          severity: 'SEVERE',
        });
      }
    }
  }

  return { actors, potholes };
}

/**
 * Toggles a cell's value sequentially: 0 (FREE) -> 1 (OBSTACLE) -> 2 (POTHOLE) -> 0.
 */
export function toggleMatrixCell(matrix: Matrix5x3, row: number, col: number): Matrix5x3 {
  // Never toggle EGO reference cell
  if (row === 2 && col === 1) return matrix;

  const next = cloneMatrix(matrix);
  const cur = next[row][col];
  next[row][col] = ((cur + 1) % 3) as MatrixCellValue;
  return next;
}

export function setMatrixCell(
  matrix: Matrix5x3,
  row: number,
  col: number,
  val: MatrixCellValue
): Matrix5x3 {
  if (row === 2 && col === 1) return matrix;
  const next = cloneMatrix(matrix);
  next[row][col] = val;
  return next;
}

export function getSmartCaseMatrix(caseId: SmartCaseId): Matrix5x3 {
  return cloneMatrix(SMART_CASES[caseId].matrix);
}

export function countMatrixHazards(matrix: Matrix5x3): { obstacles: number; potholes: number; total: number } {
  let obstacles = 0;
  let potholes = 0;
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 3; c++) {
      if (matrix[r][c] === 1) obstacles++;
      else if (matrix[r][c] === 2) potholes++;
    }
  }
  return { obstacles, potholes, total: obstacles + potholes };
}
