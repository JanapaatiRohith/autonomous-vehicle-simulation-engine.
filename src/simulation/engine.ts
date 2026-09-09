import { EgoVehicleState, DrivingMode, VehicleModelType } from '../types/vehicle';
import { RoadModel } from '../types/road';
import { SurroundingActor, TrackedActor, ActorType } from '../types/obstacle';
import { ActorPrediction } from '../types/prediction';
import { GlobalRiskState } from '../types/risk';
import { PlannerOutput } from '../types/trajectory';
import { ScenarioId, ScenarioDefinition } from '../types/scenario';
import { SCENARIO_DEFINITIONS } from './scenarios';
import { createIndianRoadModel } from './road';
import { createInitialEgoVehicle, stepEgoVehicleKinematics } from './vehicle';
import { stepSurroundingActors, createInjectedHazard } from './actors';
import { detectObjects } from '../perception/detector';
import { ActorTracker } from '../perception/tracker';
import { predictActorTrajectories } from '../prediction/predictor';
import { evaluateGlobalRisk } from '../risk/riskScore';
import { planPath } from '../planning/planner';
import { calculateSteeringCommand } from '../control/steeringController';
import { calculateSpeedCommand } from '../control/speedController';
import { determineVehicleState } from '../control/emergencyController';
import { compute5x3OccupancyGrid, OccupancyGrid5x3 } from '../perception/occupancyGrid';
import {
  Matrix5x3,
  MatrixCellValue,
  SmartCaseId,
  SmartControllerOutput,
} from '../types/smartController';
import {
  createEmptyMatrix,
  computeMatrixFromEnvironment,
  matrixToSpatialHazards,
  toggleMatrixCell,
  setMatrixCell,
  getSmartCaseMatrix,
} from '../smartController/matrixManager';
import { evaluateSmartController } from '../smartController/smartPlanner';
import { EventLogger } from '../analytics/eventLogger';
import { MetricsCollector, SimulationMetrics } from '../analytics/metrics';
import { checkOrientedBoxCollision } from '../utils/geometry';
import { euclideanDistance, clamp, formatNum } from '../utils/math';
import {
  SimulationConfig,
  DEFAULT_SIMULATION_CONFIG,
  generateActorsForConfig,
  generatePotholesForConfig,
  SimulationType,
} from '../types/config';

export type SimulationListener = () => void;

export interface ManualControls {
  throttle: boolean;
  brake: boolean;
  steerLeft: boolean;
  steerRight: boolean;
  emergencyBrake: boolean;
}

export class SimulationEngine {
  public scenario: ScenarioDefinition;
  public road: RoadModel;
  public ego: EgoVehicleState;
  public actors: SurroundingActor[] = [];
  public trackedActors: TrackedActor[] = [];
  public predictions: Map<string, ActorPrediction> = new Map();
  public riskState: GlobalRiskState;
  public plannerOutput: PlannerOutput;
  public occupancyGrid: OccupancyGrid5x3 = [];
  public smartMatrix: Matrix5x3 = createEmptyMatrix();
  public smartControllerOutput: SmartControllerOutput;
  public smartCaseId: SmartCaseId | undefined;
  public isSmartMatrixManualOverride = false;
  public metrics: SimulationMetrics;
  public eventLogger: EventLogger = new EventLogger();
  public config: SimulationConfig = { ...DEFAULT_SIMULATION_CONFIG };

  public isRunning = false;
  public simTime = 0;
  public dt = 0.02; // 50 Hz tick (20ms)
  public manualControls: ManualControls = {
    throttle: false,
    brake: false,
    steerLeft: false,
    steerRight: false,
    emergencyBrake: false,
  };

  private tracker = new ActorTracker();
  private metricsCollector = new MetricsCollector();
  private listeners: Set<SimulationListener> = new Set();
  private animFrameId: number | null = null;
  private lastTimestamp = 0;
  private heroDemoTriggered = false;

  constructor(
    scenarioId: ScenarioId = 'SUDDEN_CROSSING',
    vehicleType: VehicleModelType = 'SEDAN',
    drivingMode: DrivingMode = 'AUTONOMOUS',
    initialSpeedKmh?: number,
    initialConfig?: Partial<SimulationConfig>
  ) {
    this.scenario = SCENARIO_DEFINITIONS[scenarioId];
    if (initialConfig) {
      this.config = { ...this.config, ...initialConfig };
    }
    this.config.vehicleType = vehicleType;
    this.config.vehicleMode = drivingMode;
    if (initialSpeedKmh !== undefined) {
      this.config.initialSpeedKmh = initialSpeedKmh;
    } else {
      this.config.initialSpeedKmh = this.scenario.defaultSpeedKmh;
    }

    // Use scenario specific width and lane confidence unless explicitly overridden
    const width = initialConfig?.roadWidthM ?? this.scenario.roadWidth;
    this.config.roadWidthM = width;

    const laneConf =
      initialConfig?.laneMarkingCondition === 'CLEAR'
        ? 0.85
        : initialConfig?.laneMarkingCondition === 'MISSING'
        ? 0.05
        : this.scenario.laneConfidence;

    const potholes =
      initialConfig?.potholeCount !== undefined
        ? generatePotholesForConfig(this.config)
        : this.scenario.initialPotholes;

    this.road = createIndianRoadModel({
      nominalWidth: width,
      laneConfidence: laneConf,
      potholes,
      irregularBorders: true,
    });

    this.ego = createInitialEgoVehicle(vehicleType, drivingMode, this.config.initialSpeedKmh);

    if (initialConfig?.trafficDensity === 'CUSTOM') {
      this.actors = generateActorsForConfig(this.config);
    } else {
      this.actors = JSON.parse(JSON.stringify(this.scenario.initialActors));
    }

    // Initial dummy state
    this.riskState = {
      overallRiskScore: 0,
      overallRiskLevel: 'LOW',
      nearestActorDistance: 99.0,
      nearestActorId: null,
      nearestActorType: null,
      minimumTTC: Infinity,
      primaryHazardActorId: null,
      primaryHazardDescription: 'Corridor clear',
      dynamicSafetyMargin: 1.8,
      potholeInCorridor: false,
      laneConfidence: this.scenario.laneConfidence,
      explanation: 'System initialized. Road corridor nominal.',
    };

    this.plannerOutput = planPath(
      this.ego,
      this.road,
      [],
      new Map(),
      this.riskState,
      0
    );

    this.smartControllerOutput = evaluateSmartController(
      this.smartMatrix,
      this.ego,
      this.road,
      this.smartCaseId,
      this.isSmartMatrixManualOverride
    );

    this.metrics = this.metricsCollector.recordTick(
      0,
      this.ego.speed,
      this.ego.targetSpeed,
      0,
      99,
      99,
      0,
      'CENTER',
      false,
      false,
      0,
      this.road.totalLength,
      0
    );

    this.eventLogger.log(
      0,
      'INFO',
      'STATE',
      `ADAPT-INDIA simulation initialized with scenario: ${this.scenario.name}`
    );
  }

  public subscribe(listener: SimulationListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.eventLogger.log(this.simTime, 'SUCCESS', 'USER', 'Simulation started');
    this.lastTimestamp = performance.now();
    this.loop(this.lastTimestamp);
    this.notify();
  }

  public pause(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.eventLogger.log(this.simTime, 'INFO', 'USER', 'Simulation paused');
    this.notify();
  }

  public emergencyStop(): void {
    this.ego.targetSpeed = 0;
    this.plannerOutput.decision = 'EMERGENCY_BRAKE';
    this.ego.state = 'EMERGENCY_STOP';
    this.eventLogger.log(this.simTime, 'ALERT', 'CONTROL', 'MANUAL EMERGENCY STOP TRIGGERED BY OPERATOR');
    this.notify();
  }

  public reset(): void {
    this.pause();
    this.simTime = 0;
    this.heroDemoTriggered = false;
    this.tracker.reset();
    this.metricsCollector.reset();
    this.eventLogger.clear();

    const laneConf =
      this.config.laneMarkingCondition === 'CLEAR'
        ? 0.85
        : this.config.laneMarkingCondition === 'MISSING'
        ? 0.05
        : this.scenario.laneConfidence;

    this.road = createIndianRoadModel({
      nominalWidth: this.config.roadWidthM,
      laneConfidence: laneConf,
      potholes:
        this.config.potholeCount >= 0
          ? generatePotholesForConfig(this.config)
          : this.scenario.initialPotholes,
      irregularBorders: true,
    });

    this.ego = createInitialEgoVehicle(
      this.config.vehicleType,
      this.config.vehicleMode,
      this.config.initialSpeedKmh
    );

    if (this.config.trafficDensity === 'CUSTOM') {
      this.actors = generateActorsForConfig(this.config);
    } else {
      this.actors = JSON.parse(JSON.stringify(this.scenario.initialActors));
    }

    this.trackedActors = [];
    this.predictions.clear();

    this.eventLogger.log(
      0,
      'INFO',
      'STATE',
      `Simulation reset: Road width ${this.config.roadWidthM}m, Initial speed ${this.config.initialSpeedKmh}km/h (${this.scenario.name})`
    );
    this.step();
  }

  public setScenario(id: ScenarioId): void {
    this.scenario = SCENARIO_DEFINITIONS[id];
    this.config.roadWidthM = this.scenario.roadWidth;
    this.config.initialSpeedKmh = this.scenario.defaultSpeedKmh;
    this.reset();
  }

  public setDrivingMode(mode: DrivingMode): void {
    this.config.vehicleMode = mode;
    this.ego.drivingMode = mode;
    this.eventLogger.log(this.simTime, 'INFO', 'USER', `Driving mode changed to: ${mode}`);
    this.notify();
  }

  public setVehicleType(type: VehicleModelType): void {
    this.config.vehicleType = type;
    this.ego = createInitialEgoVehicle(type, this.ego.drivingMode, Math.round(this.ego.speed * 3.6));
    this.eventLogger.log(this.simTime, 'INFO', 'USER', `Vehicle model changed to: ${type}`);
    this.notify();
  }

  public setInitialSpeed(kmh: number): void {
    this.config.initialSpeedKmh = kmh;
    this.ego.speed = kmh / 3.6;
    this.ego.targetSpeed = this.ego.speed;
    this.eventLogger.log(this.simTime, 'INFO', 'USER', `Initial speed set to: ${kmh} km/h`);
    this.notify();
  }

  public applyConfig(newConfig: Partial<SimulationConfig>, restart = false): void {
    this.config = { ...this.config, ...newConfig };

    if (newConfig.vehicleMode !== undefined) {
      this.ego.drivingMode = newConfig.vehicleMode;
    }

    if (newConfig.initialSpeedKmh !== undefined) {
      this.ego.targetSpeed = newConfig.initialSpeedKmh / 3.6;
      if (!this.isRunning) {
        this.ego.speed = this.ego.targetSpeed;
      }
    }

    if (
      newConfig.roadWidthM !== undefined ||
      newConfig.laneMarkingCondition !== undefined ||
      newConfig.potholeCount !== undefined ||
      newConfig.potholeSeverity !== undefined
    ) {
      const laneConf =
        this.config.laneMarkingCondition === 'CLEAR'
          ? 0.85
          : this.config.laneMarkingCondition === 'MISSING'
          ? 0.05
          : this.scenario.laneConfidence;

      this.road = createIndianRoadModel({
        nominalWidth: this.config.roadWidthM,
        laneConfidence: laneConf,
        potholes:
          this.config.potholeCount > 0
            ? generatePotholesForConfig(this.config)
            : this.scenario.initialPotholes,
        irregularBorders: true,
      });

      // Keep ego safely inside updated road boundary
      const halfW = this.config.roadWidthM / 2;
      this.ego.x = clamp(this.ego.x, -halfW + 1.2, halfW - 1.2);
    }

    if (
      newConfig.trafficDensity !== undefined ||
      newConfig.numberOfVehicles !== undefined ||
      newConfig.numberOfMotorcycles !== undefined ||
      newConfig.numberOfAutos !== undefined ||
      newConfig.numberOfPedestrians !== undefined ||
      newConfig.numberOfAnimals !== undefined
    ) {
      this.actors = generateActorsForConfig(this.config, this.ego.y);
    }

    if (restart) {
      this.reset();
    } else {
      this.eventLogger.log(
        this.simTime,
        'INFO',
        'USER',
        `SimulationConfig synchronized: Road ${this.config.roadWidthM}m, Speed ${this.config.initialSpeedKmh}km/h, Mode ${this.config.vehicleMode}`
      );
      this.notify();
    }
  }

  public injectHazard(type: ActorType): void {
    const hazard = createInjectedHazard(type, this.ego, this.road);
    this.actors.push(hazard);
    this.eventLogger.log(
      this.simTime,
      'ALERT',
      'DETECTION',
      `Interactive Hazard Injected: ${type} at ${(hazard.y - this.ego.y).toFixed(1)}m ahead!`
    );
    this.notify();
  }

  public setSimulationType(type: SimulationType): void {
    this.config.simulationType = type;
    this.eventLogger.log(this.simTime, 'INFO', 'CONFIG', `Simulation Type switched to: ${type}`);
    this.step();
    this.notify();
  }

  public setSmartCase(caseId: SmartCaseId): void {
    this.smartCaseId = caseId;
    this.config.smartCaseId = caseId;
    this.isSmartMatrixManualOverride = true;
    this.smartMatrix = getSmartCaseMatrix(caseId);

    // Spawn corresponding spatial hazards in the road environment
    const hazards = matrixToSpatialHazards(this.smartMatrix, this.ego, this.road);
    this.actors = [
      ...this.actors.filter(a => !a.id.startsWith('matrix_actor_')),
      ...hazards.actors,
    ];
    this.road.potholes = [
      ...this.road.potholes.filter(p => !p.id.startsWith('matrix_pothole_')),
      ...hazards.potholes,
    ];

    this.step();
    this.eventLogger.log(this.simTime, 'INFO', 'SMART_CONTROLLER', `Smart Controller Case Activated: ${caseId}`);
    this.notify();
  }

  public toggleSmartCell(row: number, col: number): void {
    this.isSmartMatrixManualOverride = true;
    this.smartMatrix = toggleMatrixCell(this.smartMatrix, row, col);

    const hazards = matrixToSpatialHazards(this.smartMatrix, this.ego, this.road);
    this.actors = [
      ...this.actors.filter(a => !a.id.startsWith('matrix_actor_')),
      ...hazards.actors,
    ];
    this.road.potholes = [
      ...this.road.potholes.filter(p => !p.id.startsWith('matrix_pothole_')),
      ...hazards.potholes,
    ];

    this.step();
    this.notify();
  }

  public setSmartCell(row: number, col: number, val: MatrixCellValue): void {
    this.isSmartMatrixManualOverride = true;
    this.smartMatrix = setMatrixCell(this.smartMatrix, row, col, val);

    const hazards = matrixToSpatialHazards(this.smartMatrix, this.ego, this.road);
    this.actors = [
      ...this.actors.filter(a => !a.id.startsWith('matrix_actor_')),
      ...hazards.actors,
    ];
    this.road.potholes = [
      ...this.road.potholes.filter(p => !p.id.startsWith('matrix_pothole_')),
      ...hazards.potholes,
    ];

    this.step();
    this.notify();
  }

  public resetSmartMatrix(): void {
    this.smartCaseId = undefined;
    this.smartMatrix = createEmptyMatrix();
    this.isSmartMatrixManualOverride = false;
    this.actors = this.actors.filter(a => !a.id.startsWith('matrix_actor_'));
    this.road.potholes = this.road.potholes.filter(p => !p.id.startsWith('matrix_pothole_'));
    this.step();
    this.eventLogger.log(this.simTime, 'INFO', 'SMART_CONTROLLER', '5x3 Matrix reset to all FREE (0)');
    this.notify();
  }

  public toggleSmartMatrixAutoSync(): void {
    this.isSmartMatrixManualOverride = !this.isSmartMatrixManualOverride;
    if (!this.isSmartMatrixManualOverride) {
      this.actors = this.actors.filter(a => !a.id.startsWith('matrix_actor_'));
      this.road.potholes = this.road.potholes.filter(p => !p.id.startsWith('matrix_pothole_'));
    }
    this.step();
    this.notify();
  }

  /**
   * Main deterministic simulation tick (50 Hz).
   */
  public step(): void {
    this.simTime += this.dt;

    // Check Hero Demo sudden crossing trigger
    if (
      this.scenario.heroDemoTriggerDelaySec &&
      !this.heroDemoTriggered &&
      this.simTime >= this.scenario.heroDemoTriggerDelaySec
    ) {
      this.heroDemoTriggered = true;
      const heroActor = this.actors.find(a => a.id === 'hero_crossing_animal');
      if (heroActor) {
        heroActor.isTriggered = true;
        heroActor.vx = -1.8; // Move across ego path
        this.eventLogger.log(
          this.simTime,
          'ALERT',
          'DETECTION',
          'HERO DEMO TRIGGER: Stray animal suddenly enters forward road corridor!'
        );
      }
    }

    // 1. Update surrounding actors
    this.actors = stepSurroundingActors(this.actors, this.ego, this.road, this.dt, this.simTime);

    // 2. Detect nearby objects (simulated sensor interface)
    const detections = detectObjects(this.actors, this.ego);

    // 3. Track objects (rolling history, closing speed, TTC)
    this.trackedActors = this.tracker.update(detections, this.ego, this.simTime, this.dt);

    // 4. Predict short-term motion (3.0s horizon, uncertainty expansion)
    this.predictions = predictActorTrajectories(this.trackedActors);

    // 5. Evaluate multi-factor risk and dynamic safety margin
    const prevRiskLevel = this.riskState.overallRiskLevel;
    this.riskState = evaluateGlobalRisk(this.trackedActors, this.ego, this.road, this.predictions);

    if (prevRiskLevel !== this.riskState.overallRiskLevel) {
      this.eventLogger.log(
        this.simTime,
        this.riskState.overallRiskLevel === 'CRITICAL'
          ? 'ALERT'
          : this.riskState.overallRiskLevel === 'HIGH'
          ? 'WARNING'
          : 'INFO',
        'RISK',
        `Risk level transitioned: ${prevRiskLevel} → ${this.riskState.overallRiskLevel} (${this.riskState.overallRiskScore}/100)`
      );
    }

    // 6. 5x3 local occupancy grid calculation
    this.occupancyGrid = compute5x3OccupancyGrid(this.trackedActors, this.ego);

    if (this.config.simulationType === 'SMART_CONTROLLER') {
      // SMART CONTROLLER / 5x3 OCCUPANCY MATRIX PIPELINE
      if (!this.isSmartMatrixManualOverride) {
        this.smartMatrix = computeMatrixFromEnvironment(this.trackedActors, this.road.potholes, this.ego);
      }

      this.smartControllerOutput = evaluateSmartController(
        this.smartMatrix,
        this.ego,
        this.road,
        this.smartCaseId,
        this.isSmartMatrixManualOverride
      );

      // Causal propagation to plannerOutput
      const prevPathId = this.plannerOutput.selectedPathId;
      const prevDecision = this.plannerOutput.decision;

      this.plannerOutput = {
        ...this.plannerOutput,
        selectedPathId: this.smartControllerOutput.selectedPathId,
        decision: this.smartControllerOutput.selectedAction as any,
        targetSpeed: this.smartControllerOutput.targetSpeedKmh / 3.6,
        reasoning: this.smartControllerOutput.interpretation,
      };

      if (this.plannerOutput.candidates) {
        for (const rej of this.smartControllerOutput.rejectedPaths) {
          if (this.plannerOutput.candidates[rej.pathId]) {
            this.plannerOutput.candidates[rej.pathId].status = 'BLOCKED';
            this.plannerOutput.candidates[rej.pathId].blockingReason = rej.reason;
          }
        }
        if (this.plannerOutput.candidates[this.smartControllerOutput.selectedPathId]) {
          this.plannerOutput.candidates[this.smartControllerOutput.selectedPathId].status = 'SAFE';
        }
      }

      if (prevPathId !== this.plannerOutput.selectedPathId) {
        this.eventLogger.log(
          this.simTime,
          'WARNING',
          'PLANNER',
          `Smart Controller Trajectory switched: ${prevPathId} → ${this.plannerOutput.selectedPathId}`,
          this.plannerOutput.reasoning
        );
      }

      if (prevDecision !== this.plannerOutput.decision) {
        this.eventLogger.log(
          this.simTime,
          this.plannerOutput.decision === 'EMERGENCY_BRAKE' ? 'ALERT' : 'INFO',
          'PLANNER',
          `Smart Controller Action updated: ${prevDecision} → ${this.plannerOutput.decision}`
        );
      }
    } else {
      // 7. Generate candidates & plan optimal path (Adaptive Autonomous Driving)
      const prevPathId = this.plannerOutput.selectedPathId;
      const prevDecision = this.plannerOutput.decision;

      this.plannerOutput = planPath(
        this.ego,
        this.road,
        this.trackedActors,
        this.predictions,
        this.riskState,
        this.simTime
      );

      if (prevPathId !== this.plannerOutput.selectedPathId) {
        this.eventLogger.log(
          this.simTime,
          'WARNING',
          'PLANNER',
          `Trajectory replanned: ${prevPathId} → ${this.plannerOutput.selectedPathId}`,
          this.plannerOutput.reasoning
        );
      }

      if (prevDecision !== this.plannerOutput.decision) {
        this.eventLogger.log(
          this.simTime,
          this.plannerOutput.decision === 'EMERGENCY_BRAKE' ? 'ALERT' : 'INFO',
          'PLANNER',
          `Planner decision updated: ${prevDecision} → ${this.plannerOutput.decision}`
        );
      }
    }

    // 8. Vehicle Control (Steering & Speed)
    let commandedSteer = 0;
    let commandedAccel = 0;

    if (this.ego.drivingMode === 'MANUAL') {
      // Manual keyboard inputs
      if (this.manualControls.emergencyBrake) {
        commandedAccel = this.ego.dimensions.maxBraking * 1.1; // Hard emergency braking
        commandedSteer = 0;
      } else {
        if (this.manualControls.throttle) commandedAccel = this.ego.dimensions.maxAcceleration * 0.85;
        else if (this.manualControls.brake) commandedAccel = this.ego.dimensions.maxBraking * 0.85;
        else commandedAccel = -0.6; // Gentle engine coasting drag

        if (this.manualControls.steerLeft) commandedSteer = -0.42;
        else if (this.manualControls.steerRight) commandedSteer = 0.42;
        else commandedSteer = 0;
      }
    } else if (this.config.simulationType === 'SMART_CONTROLLER') {
      // Smart Controller Steering & Speed
      commandedSteer = (this.smartControllerOutput.commandedSteerDeg * Math.PI) / 180;
      if (this.smartControllerOutput.commandedBrakingDecel < 0) {
        commandedAccel = this.smartControllerOutput.commandedBrakingDecel;
      } else {
        commandedAccel = calculateSpeedCommand(this.ego, this.plannerOutput.targetSpeed, this.plannerOutput.decision, this.dt);
      }
    } else {
      // Autonomous / Cautious / Emergency Test
      const selectedCandidate = this.plannerOutput.candidates[this.plannerOutput.selectedPathId];
      commandedSteer = calculateSteeringCommand(this.ego, selectedCandidate);

      let targetSpeed = this.plannerOutput.targetSpeed;
      if (this.ego.drivingMode === 'CAUTIOUS') {
        targetSpeed *= 0.75; // 25% lower speed in cautious mode
      }

      commandedAccel = calculateSpeedCommand(this.ego, targetSpeed, this.plannerOutput.decision, this.dt);
    }

    // 9. Update ego kinematics
    this.ego = stepEgoVehicleKinematics(this.ego, commandedSteer, commandedAccel, this.dt);

    // 10. Update high-level vehicle state
    const prevVehicleState = this.ego.state;
    this.ego.state = determineVehicleState(
      this.ego.state,
      this.plannerOutput.decision,
      this.ego.speed,
      this.riskState.overallRiskLevel
    );

    if (prevVehicleState !== this.ego.state) {
      this.eventLogger.log(
        this.simTime,
        this.ego.state === 'EMERGENCY_STOP' ? 'ALERT' : 'INFO',
        'STATE',
        `Vehicle operational state: ${prevVehicleState} → ${this.ego.state}`
      );
    }

    // 11. Check physical collisions (Ground truth verification)
    let isCollision = false;
    const egoBox = {
      x: this.ego.x,
      y: this.ego.y,
      length: this.ego.dimensions.length,
      width: this.ego.dimensions.width,
      heading: this.ego.heading,
    };

    for (const actor of this.actors) {
      const actorBox = {
        x: actor.x,
        y: actor.y,
        length: actor.length,
        width: actor.width,
        heading: actor.heading,
      };

      if (checkOrientedBoxCollision(egoBox, actorBox)) {
        isCollision = true;
        this.eventLogger.log(
          this.simTime,
          'ALERT',
          'STATE',
          `PHYSICAL CONTACT DETECTED with ${actor.type} at y=${formatNum(this.ego.y)}m!`
        );
        break;
      }
    }

    // 12. Record metrics
    this.metrics = this.metricsCollector.recordTick(
      this.simTime,
      this.ego.speed,
      this.ego.targetSpeed,
      this.riskState.overallRiskScore,
      this.riskState.nearestActorDistance,
      this.riskState.minimumTTC,
      this.ego.steeringAngle,
      this.plannerOutput.selectedPathId,
      isCollision,
      this.plannerOutput.decision === 'EMERGENCY_BRAKE',
      this.plannerOutput.candidates[this.plannerOutput.selectedPathId]?.peakCurvature || 0,
      this.road.totalLength,
      this.ego.distanceTraveled
    );

    this.notify();
  }

  /**
   * requestAnimationFrame display loop decoupled from fixed physics tick.
   */
  private loop = (timestamp: number) => {
    if (!this.isRunning) return;

    // Catch up fixed physics steps
    const elapsed = Math.min(0.1, (timestamp - this.lastTimestamp) / 1000);
    this.lastTimestamp = timestamp;

    const numTicks = Math.max(1, Math.round(elapsed / this.dt));
    for (let i = 0; i < numTicks; i++) {
      this.step();
    }

    this.animFrameId = requestAnimationFrame(this.loop);
  };
}
