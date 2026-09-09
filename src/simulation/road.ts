import { RoadModel, RoadSegment, Pothole } from '../types/road';
import { lerp, clamp } from '../utils/math';

/**
 * Evaluates the left and right drivable road boundaries at longitudinal distance y.
 */
export function getDrivableBounds(
  road: RoadModel,
  y: number
): { leftX: number; rightX: number; width: number; laneConfidence: number } {
  // Find applicable road segment
  const segment = road.segments.find(s => y >= s.yStart && y <= s.yEnd) || road.segments[0];

  if (!segment) {
    const halfW = road.nominalWidth / 2;
    return { leftX: -halfW, rightX: halfW, width: road.nominalWidth, laneConfidence: 0.5 };
  }

  // Linear interpolation along boundary points if available
  let leftX = -segment.leftEdgeOffset;
  let rightX = segment.rightEdgeOffset;

  // Search boundary polylines
  if (road.leftBoundary.length > 1) {
    leftX = interpolatePolyline(road.leftBoundary, y, -segment.leftEdgeOffset);
  }
  if (road.rightBoundary.length > 1) {
    rightX = interpolatePolyline(road.rightBoundary, y, segment.rightEdgeOffset);
  }

  return {
    leftX,
    rightX,
    width: Math.abs(rightX - leftX),
    laneConfidence: segment.laneConfidence,
  };
}

function interpolatePolyline(polyline: Array<{ y: number; x: number }>, y: number, fallback: number): number {
  if (polyline.length === 0) return fallback;
  if (y <= polyline[0].y) return polyline[0].x;
  if (y >= polyline[polyline.length - 1].y) return polyline[polyline.length - 1].x;

  for (let i = 0; i < polyline.length - 1; i++) {
    const p1 = polyline[i];
    const p2 = polyline[i + 1];
    if (y >= p1.y && y <= p2.y) {
      const span = p2.y - p1.y;
      const t = span > 0 ? (y - p1.y) / span : 0;
      return lerp(p1.x, p2.x, t);
    }
  }
  return fallback;
}

/**
 * Checks if a point (x, y) is within the drivable road boundaries with an optional safety margin.
 */
export function isPointInRoad(road: RoadModel, x: number, y: number, margin = 0.3): boolean {
  const bounds = getDrivableBounds(road, y);
  return x >= bounds.leftX + margin && x <= bounds.rightX - margin;
}

/**
 * Returns distance from point (x, y) to closest road boundary.
 * Negative value means outside road boundary!
 */
export function getRoadEdgeClearance(road: RoadModel, x: number, y: number): number {
  const bounds = getDrivableBounds(road, y);
  const distToLeft = x - bounds.leftX;
  const distToRight = bounds.rightX - x;
  return Math.min(distToLeft, distToRight);
}

/**
 * Queries potholes near longitudinal position y within longitudinal window.
 */
export function getPotholesNear(road: RoadModel, y: number, window = 35): Pothole[] {
  return road.potholes.filter(p => Math.abs(p.y - y) <= window);
}

/**
 * Factory for creating standard Indian road models.
 */
export function createIndianRoadModel(options: {
  length?: number;
  nominalWidth?: number;
  irregularBorders?: boolean;
  laneConfidence?: number;
  potholes?: Pothole[];
}): RoadModel {
  const length = options.length ?? 400;
  const nominalWidth = options.nominalWidth ?? 7.0; // 2 lanes typical in India (each 3.5m or narrow 3.0m)
  const halfW = nominalWidth / 2;
  const laneConfidence = options.laneConfidence ?? 0.3; // Frequently faded or missing markings

  const leftBoundary: Array<{ y: number; x: number }> = [];
  const rightBoundary: Array<{ y: number; x: number }> = [];
  const centerLineMarkers: Array<{ y: number; confidence: number }> = [];

  // Generate boundary polylines with realistic Indian road irregularities (uneven shoulder, debris, encroaching verge)
  const step = 20;
  for (let y = 0; y <= length; y += step) {
    let leftOffset = -halfW;
    let rightOffset = halfW;

    if (options.irregularBorders) {
      // Sinusoidal/irregular variation of road edges simulating unpaved shoulders & encroachment
      leftOffset += Math.sin(y * 0.05) * 0.45 + Math.cos(y * 0.12) * 0.25;
      rightOffset += Math.sin(y * 0.04 + 1.2) * 0.5 - Math.cos(y * 0.09) * 0.3;
    }

    leftBoundary.push({ y, x: leftOffset });
    rightBoundary.push({ y, x: rightOffset });

    // Lane confidence varies; often missing in sections
    const conf = Math.max(0, Math.min(1, laneConfidence + (Math.sin(y * 0.03) > 0.3 ? 0.3 : -0.2)));
    centerLineMarkers.push({ y, confidence: conf });
  }

  const segments: RoadSegment[] = [
    {
      yStart: 0,
      yEnd: length,
      width: nominalWidth,
      leftEdgeOffset: halfW,
      rightEdgeOffset: halfW,
      hasCenterLine: true,
      laneConfidence,
      surfaceCondition: options.potholes && options.potholes.length > 0 ? 'POTHOLED' : 'DRY_ASPHALT',
    },
  ];

  return {
    totalLength: length,
    nominalWidth,
    numLanes: 2,
    leftBoundary,
    rightBoundary,
    centerLineMarkers,
    potholes: options.potholes ?? [],
    segments,
  };
}
