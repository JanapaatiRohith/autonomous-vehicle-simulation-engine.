export interface Pothole {
  id: string;
  x: number; // Lateral offset from road centerline (m)
  y: number; // Longitudinal distance along road (m)
  diameter: number; // meters (e.g. 0.8 - 1.6m)
  depth: number; // cm (e.g. 5 - 18cm)
  severity: 'MILD' | 'MODERATE' | 'SEVERE';
}

export interface RoadSegment {
  yStart: number;
  yEnd: number;
  width: number; // meters
  leftEdgeOffset: number; // m from nominal centerline
  rightEdgeOffset: number; // m from nominal centerline
  hasCenterLine: boolean;
  laneConfidence: number; // 0.0 to 1.0 (Indian roads often have 0.0 to 0.4)
  surfaceCondition: 'DRY_ASPHALT' | 'POTHOLED' | 'UNPAVED_SHOULDER' | 'PATCHWORK';
}

export interface RoadModel {
  totalLength: number; // meters
  nominalWidth: number; // meters (e.g. 7.5m for standard 2-lane, or 5.5m for narrow)
  numLanes: number;
  leftBoundary: Array<{ y: number; x: number }>;
  rightBoundary: Array<{ y: number; x: number }>;
  centerLineMarkers: Array<{ y: number; confidence: number }>;
  potholes: Pothole[];
  segments: RoadSegment[];
}
