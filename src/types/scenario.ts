import { SurroundingActor } from './obstacle';
import { Pothole, RoadSegment } from './road';

export type ScenarioId =
  | 'UNMARKED_NARROW_ROAD'
  | 'UNSIGNALIZED_JUNCTION'
  | 'HIGHWAY_SLOW_VEHICLE'
  | 'DENSE_MARKET'
  | 'SUDDEN_CROSSING';

export interface ScenarioDefinition {
  id: ScenarioId;
  name: string;
  tagline: string;
  description: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'EXTREME';
  defaultSpeedKmh: number;
  roadWidth: number;
  laneConfidence: number;
  expectedBehavior: string;
  seed: number;
  initialActors: SurroundingActor[];
  initialPotholes: Pothole[];
  roadSegments: RoadSegment[];
  heroDemoTriggerDelaySec?: number;
}
