import { euclideanDistance } from './math';

export interface Point2D {
  x: number;
  y: number;
}

export interface Box2D {
  x: number; // center x
  y: number; // center y
  length: number; // along heading
  width: number; // perpendicular to heading
  heading: number; // radians
}

/**
 * Returns the 4 corner points of an oriented bounding box.
 */
export function getBoxCorners(box: Box2D): Point2D[] {
  const cos = Math.cos(box.heading);
  const sin = Math.sin(box.heading);
  const halfL = box.length / 2;
  const halfW = box.width / 2;

  // Local corners: front-left, front-right, rear-right, rear-left
  const localCorners = [
    { dx: -halfW, dy: halfL },
    { dx: halfW, dy: halfL },
    { dx: halfW, dy: -halfL },
    { dx: -halfW, dy: -halfL },
  ];

  return localCorners.map(pt => ({
    x: box.x + pt.dx * cos - pt.dy * sin,
    y: box.y + pt.dx * sin + pt.dy * cos,
  }));
}

/**
 * Separating Axis Theorem (SAT) collision test between two oriented bounding boxes.
 */
export function checkOrientedBoxCollision(boxA: Box2D, boxB: Box2D, margin = 0): boolean {
  const cornersA = getBoxCorners({
    ...boxA,
    length: boxA.length + margin * 2,
    width: boxA.width + margin * 2,
  });
  const cornersB = getBoxCorners(boxB);

  const axes: Point2D[] = [];

  // Get normal axes of box A
  axes.push({
    x: -(cornersA[1].y - cornersA[0].y),
    y: cornersA[1].x - cornersA[0].x,
  });
  axes.push({
    x: -(cornersA[2].y - cornersA[1].y),
    y: cornersA[2].x - cornersA[1].x,
  });

  // Get normal axes of box B
  axes.push({
    x: -(cornersB[1].y - cornersB[0].y),
    y: cornersB[1].x - cornersB[0].x,
  });
  axes.push({
    x: -(cornersB[2].y - cornersB[1].y),
    y: cornersB[2].x - cornersB[1].x,
  });

  for (const axis of axes) {
    // Normalize axis
    const len = Math.sqrt(axis.x * axis.x + axis.y * axis.y);
    if (len < 1e-6) continue;
    const nx = axis.x / len;
    const ny = axis.y / len;

    // Project cornersA
    let minA = Infinity;
    let maxA = -Infinity;
    for (const p of cornersA) {
      const proj = p.x * nx + p.y * ny;
      if (proj < minA) minA = proj;
      if (proj > maxA) maxA = proj;
    }

    // Project cornersB
    let minB = Infinity;
    let maxB = -Infinity;
    for (const p of cornersB) {
      const proj = p.x * nx + p.y * ny;
      if (proj < minB) minB = proj;
      if (proj > maxB) maxB = proj;
    }

    // Check for separating axis gap
    if (maxA < minB || maxB < minA) {
      return false; // Separating axis found -> No collision
    }
  }

  return true; // Overlapping on all axes -> Collision!
}

/**
 * Distance from point P to line segment AB.
 */
export function pointToSegmentDistance(p: Point2D, a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq < 1e-6) {
    return euclideanDistance(p.x, p.y, a.x, a.y);
  }

  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;

  return euclideanDistance(p.x, p.y, projX, projY);
}

/**
 * Cubic Hermite Spline interpolation between two states:
 * P0(x0, y0) with tangent (dx0, dy0) at t=0
 * P1(x1, y1) with tangent (dx1, dy1) at t=1
 */
export function cubicHermite(
  p0: Point2D,
  m0: Point2D,
  p1: Point2D,
  m1: Point2D,
  t: number
): { point: Point2D; tangent: Point2D; curvature: number } {
  const t2 = t * t;
  const t3 = t2 * t;

  // Basis functions
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;

  // Position
  const x = h00 * p0.x + h10 * m0.x + h01 * p1.x + h11 * m1.x;
  const y = h00 * p0.y + h10 * m0.y + h01 * p1.y + h11 * m1.y;

  // First derivative (tangent)
  const dh00 = 6 * t2 - 6 * t;
  const dh10 = 3 * t2 - 4 * t + 1;
  const dh01 = -6 * t2 + 6 * t;
  const dh11 = 3 * t2 - 2 * t;

  const dx = dh00 * p0.x + dh10 * m0.x + dh01 * p1.x + dh11 * m1.x;
  const dy = dh00 * p0.y + dh10 * m0.y + dh01 * p1.y + dh11 * m1.y;

  // Second derivative (for curvature)
  const d2h00 = 12 * t - 6;
  const d2h10 = 6 * t - 4;
  const d2h01 = -12 * t + 6;
  const d2h11 = 6 * t - 2;

  const d2x = d2h00 * p0.x + d2h10 * m0.x + d2h01 * p1.x + d2h11 * m1.x;
  const d2y = d2h00 * p0.y + d2h10 * m0.y + d2h01 * p1.y + d2h11 * m1.y;

  // Curvature: kappa = |x' y'' - y' x''| / (x'^2 + y'^2)^(3/2)
  const speedSq = dx * dx + dy * dy;
  let curvature = 0;
  if (speedSq > 1e-6) {
    curvature = Math.abs(dx * d2y - dy * d2x) / Math.pow(speedSq, 1.5);
  }

  return {
    point: { x, y },
    tangent: { x: dx, y: dy },
    curvature,
  };
}
