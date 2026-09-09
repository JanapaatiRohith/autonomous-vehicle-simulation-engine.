/**
 * Math utilities for robotics, trajectory calculations, and vehicle kinematics.
 */

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

/**
 * Normalizes an angle into [-PI, PI].
 */
export function normalizeAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

/**
 * Computes 2D Euclidean distance between (x1, y1) and (x2, y2).
 */
export function euclideanDistance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Converts km/h to m/s.
 */
export function kmhToMs(kmh: number): number {
  return kmh / 3.6;
}

/**
 * Converts m/s to km/h.
 */
export function msToKmh(ms: number): number {
  return ms * 3.6;
}

/**
 * Converts radians to degrees.
 */
export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * Converts degrees to radians.
 */
export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Safely format numbers with fixed decimal places without throwing NaN.
 */
export function formatNum(num: number | undefined | null, decimals = 1): string {
  if (num === undefined || num === null || isNaN(num) || !isFinite(num)) {
    return '---';
  }
  return num.toFixed(decimals);
}
