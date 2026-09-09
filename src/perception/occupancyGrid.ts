import { TrackedActor } from '../types/obstacle';
import { EgoVehicleState } from '../types/vehicle';
import { RiskLevel } from '../types/risk';

export interface OccupancyCell {
  row: number; // 0 (far front) to 4 (rear)
  col: number; // 0 (left), 1 (center), 2 (right)
  rowLabel: string;
  colLabel: string;
  isOccupied: boolean;
  actorType?: string;
  distance?: number;
  riskLevel: RiskLevel;
}

export type OccupancyGrid5x3 = OccupancyCell[][];

export const ROW_LABELS = ['FAR_FRONT', 'MID_FRONT', 'NEAR_FRONT', 'SIDES', 'REAR'];
export const COL_LABELS = ['LEFT', 'CENTER', 'RIGHT'];

/**
 * Computes a 5x3 local environmental occupancy grid relative to the ego vehicle pose.
 * Gives an instantaneous compact situational awareness representation.
 */
export function compute5x3OccupancyGrid(
  actors: TrackedActor[],
  ego: EgoVehicleState
): OccupancyGrid5x3 {
  // Initialize empty 5x3 grid
  const grid: OccupancyGrid5x3 = [];

  for (let r = 0; r < 5; r++) {
    const rowCells: OccupancyCell[] = [];
    for (let c = 0; c < 3; c++) {
      rowCells.push({
        row: r,
        col: c,
        rowLabel: ROW_LABELS[r],
        colLabel: COL_LABELS[c],
        isOccupied: false,
        riskLevel: 'LOW',
      });
    }
    grid.push(rowCells);
  }

  // Populate grid based on tracked actors in ego frame
  for (const actor of actors) {
    const dy = actor.longitudinalDistance;
    const dx = actor.lateralDistance;

    // Determine row (longitudinal)
    let rowIndex = -1;
    if (dy >= 20 && dy <= 40) rowIndex = 0; // Far Front
    else if (dy >= 9 && dy < 20) rowIndex = 1; // Mid Front
    else if (dy >= 2 && dy < 9) rowIndex = 2; // Near Front
    else if (dy >= -2.5 && dy < 2) rowIndex = 3; // Sides
    else if (dy >= -25 && dy < -2.5) rowIndex = 4; // Rear

    if (rowIndex === -1) continue;

    // Determine col (lateral)
    let colIndex = -1;
    if (dx < -1.1 && dx >= -4.5) colIndex = 0; // Left
    else if (dx >= -1.1 && dx <= 1.1) colIndex = 1; // Center
    else if (dx > 1.1 && dx <= 4.5) colIndex = 2; // Right

    if (colIndex === -1) continue;

    const cell = grid[rowIndex][colIndex];
    cell.isOccupied = true;
    cell.actorType = actor.type;
    cell.distance = Math.round(actor.distanceToEgo * 10) / 10;

    // Set risk based on distance & TTC
    if (actor.riskScore > 80 || actor.distanceToEgo < 5.0) {
      cell.riskLevel = 'CRITICAL';
    } else if (actor.riskScore > 50 || actor.distanceToEgo < 12.0) {
      cell.riskLevel = 'HIGH';
    } else if (actor.distanceToEgo < 25.0) {
      cell.riskLevel = 'MEDIUM';
    } else {
      cell.riskLevel = 'LOW';
    }
  }

  return grid;
}
