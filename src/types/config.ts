import { VehicleModelType, DrivingMode } from './vehicle';
import { SurroundingActor, ActorType } from './obstacle';
import { Pothole } from './road';

export type TrafficDensityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CUSTOM';
export type PotholeSeverityOption = 'LOW' | 'MEDIUM' | 'HIGH';
export type RoadSurfaceCondition = 'GOOD' | 'WORN' | 'POOR' | 'UNSTRUCTURED';
export type LaneMarkingCondition = 'CLEAR' | 'FADED' | 'MISSING';
export type WeatherCondition = 'CLEAR' | 'OVERCAST' | 'EVENING';
export type TimeOfDayOption = 'DAY' | 'SUNSET' | 'EVENING';
export type VehicleModelOption = VehicleModelType;
export type VehicleDriveMode = DrivingMode;
export type SimulationType = 'ADAPTIVE_AUTONOMOUS' | 'SMART_CONTROLLER';

export interface SimulationConfig {
  simulationType: SimulationType;
  smartCaseId?: string;
  vehicleType: VehicleModelType;
  vehicleMode: DrivingMode;
  initialSpeedKmh: number;
  roadWidthM: number; // 6, 8, 10, 12, 14 (default: 10)
  laneWidthM: number;
  trafficDensity: TrafficDensityLevel;
  numberOfVehicles: number;
  numberOfMotorcycles: number;
  numberOfAutos: number;
  numberOfPedestrians: number;
  numberOfAnimals: number;
  potholeCount: number; // 0, 1, 2, 3, 5, 10
  potholeSeverity: PotholeSeverityOption;
  roadCondition: RoadSurfaceCondition;
  laneMarkingCondition: LaneMarkingCondition;
  weather: WeatherCondition;
  timeOfDay: TimeOfDayOption;
  simulationSpeed: number; // 0.5, 1.0, 2.0
  randomSeed: number;
  renderMode: '2D' | '3D';
}

export const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
  simulationType: 'ADAPTIVE_AUTONOMOUS',
  vehicleType: 'SEDAN',
  vehicleMode: 'AUTONOMOUS',
  initialSpeedKmh: 45,
  roadWidthM: 10.0, // Default 10m broad realistic road
  laneWidthM: 3.5,
  trafficDensity: 'MEDIUM',
  numberOfVehicles: 3,
  numberOfMotorcycles: 2,
  numberOfAutos: 2,
  numberOfPedestrians: 2,
  numberOfAnimals: 1,
  potholeCount: -1, // -1 means preserve scenario defaults until user configures custom count
  potholeSeverity: 'MEDIUM',
  roadCondition: 'WORN',
  laneMarkingCondition: 'FADED',
  weather: 'CLEAR',
  timeOfDay: 'DAY',
  simulationSpeed: 1.0,
  randomSeed: 505,
  renderMode: '2D',
};

/**
 * Generates dynamic obstacles based on configured counts and road width.
 */
export function generateActorsForConfig(
  config: SimulationConfig,
  baseY = 20
): SurroundingActor[] {
  const actors: SurroundingActor[] = [];
  let idCounter = 1;

  const halfRoad = config.roadWidthM / 2;
  const lane1X = -halfRoad * 0.45;
  const lane2X = halfRoad * 0.45;

  let carCount = config.numberOfVehicles;
  let bikeCount = config.numberOfMotorcycles;
  let autoCount = config.numberOfAutos;
  let pedCount = config.numberOfPedestrians;
  let animalCount = config.numberOfAnimals;

  if (config.trafficDensity === 'LOW') {
    carCount = 1;
    bikeCount = 1;
    autoCount = 1;
    pedCount = 1;
    animalCount = 0;
  } else if (config.trafficDensity === 'HIGH') {
    carCount = 5;
    bikeCount = 4;
    autoCount = 4;
    pedCount = 4;
    animalCount = 2;
  }

  // 1. Cars
  for (let i = 0; i < carCount; i++) {
    actors.push({
      id: `car_${idCounter++}`,
      type: 'CAR',
      x: i % 2 === 0 ? lane1X : lane2X,
      y: baseY + 18 + i * 22,
      vx: 0,
      vy: 10.5,
      speed: 10.5,
      heading: 0,
      acceleration: 0,
      width: 1.8,
      length: 4.5,
      behavior: 'LANE_KEEPING',
      uncertainty: 0.2,
    });
  }

  // 2. Motorcycles
  for (let i = 0; i < bikeCount; i++) {
    actors.push({
      id: `bike_${idCounter++}`,
      type: 'MOTORCYCLE',
      x: (i % 2 === 0 ? lane1X : lane2X) + 0.8,
      y: baseY + 12 + i * 18,
      vx: 0,
      vy: 12.0,
      speed: 12.0,
      heading: 0,
      acceleration: 0,
      width: 0.8,
      length: 1.9,
      behavior: 'ERRATIC_WEAVING',
      uncertainty: 0.35,
    });
  }

  // 3. Auto-Rickshaws
  for (let i = 0; i < autoCount; i++) {
    actors.push({
      id: `auto_${idCounter++}`,
      type: 'AUTO_RICKSHAW',
      x: i % 2 === 0 ? lane1X - 0.4 : lane2X + 0.4,
      y: baseY + 25 + i * 20,
      vx: 0,
      vy: 8.5,
      speed: 8.5,
      heading: 0,
      acceleration: 0,
      width: 1.4,
      length: 2.7,
      behavior: 'LANE_KEEPING',
      uncertainty: 0.3,
    });
  }

  // 4. Pedestrians
  for (let i = 0; i < pedCount; i++) {
    actors.push({
      id: `ped_${idCounter++}`,
      type: 'PEDESTRIAN',
      x: (i % 2 === 0 ? -halfRoad + 0.6 : halfRoad - 0.6),
      y: baseY + 30 + i * 25,
      vx: i % 2 === 0 ? 0.6 : -0.6,
      vy: 0,
      speed: 1.2,
      heading: i % 2 === 0 ? Math.PI / 2 : -Math.PI / 2,
      acceleration: 0,
      width: 0.6,
      length: 0.6,
      behavior: 'CROSSING',
      uncertainty: 0.45,
    });
  }

  // 5. Animals
  for (let i = 0; i < animalCount; i++) {
    actors.push({
      id: `animal_${idCounter++}`,
      type: 'ANIMAL',
      x: halfRoad - 0.5,
      y: baseY + 42 + i * 35,
      vx: -0.5,
      vy: 0,
      speed: 0.8,
      heading: -Math.PI / 2,
      acceleration: 0,
      width: 0.9,
      length: 1.9,
      behavior: 'CROSSING',
      uncertainty: 0.6,
    });
  }

  return actors;
}

/**
 * Generates potholes according to configured count and severity.
 */
export function generatePotholesForConfig(config: SimulationConfig): Pothole[] {
  const potholes: Pothole[] = [];
  const halfRoad = config.roadWidthM / 2;

  const depths: Record<'LOW' | 'MEDIUM' | 'HIGH', number> = {
    LOW: 6,
    MEDIUM: 11,
    HIGH: 16,
  };
  const severities: Record<'LOW' | 'MEDIUM' | 'HIGH', 'MILD' | 'MODERATE' | 'SEVERE'> = {
    LOW: 'MILD',
    MEDIUM: 'MODERATE',
    HIGH: 'SEVERE',
  };

  const depth = depths[config.potholeSeverity];
  const severity = severities[config.potholeSeverity];

  for (let i = 0; i < config.potholeCount; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const lateralX = side * (halfRoad * 0.35 + (i * 0.2));
    const longitudinalY = 28 + i * 26;

    potholes.push({
      id: `pothole_cfg_${i + 1}`,
      x: lateralX,
      y: longitudinalY,
      diameter: 0.8 + (i % 3) * 0.25,
      depth,
      severity,
    });
  }

  return potholes;
}
