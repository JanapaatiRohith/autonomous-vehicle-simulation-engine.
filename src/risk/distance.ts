import { euclideanDistance } from '../utils/math';

export function calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
  return euclideanDistance(x1, y1, x2, y2);
}

export function calculateClearanceToBox(
  px: number,
  py: number,
  bx: number,
  by: number,
  bLength: number,
  bWidth: number
): number {
  const dx = Math.max(0, Math.abs(px - bx) - bWidth / 2);
  const dy = Math.max(0, Math.abs(py - by) - bLength / 2);
  return Math.sqrt(dx * dx + dy * dy);
}
