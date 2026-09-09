import React, { useEffect, useRef, useState } from 'react';
import { SimulationEngine } from '../simulation/engine';
import { DrivingMode, VehicleModelType, VEHICLE_CONFIGS, EgoVehicleState } from '../types/vehicle';
import { ScenarioId } from '../types/scenario';
import { SCENARIO_DEFINITIONS } from '../simulation/scenarios';
import {
  drawRoadSurface,
  drawPotholes,
  drawEgoVehicle,
  drawSurroundingActor,
  LightingPreset,
} from '../components/canvas/renderAssets';
import { SurroundingActor } from '../types/obstacle';
import { RoadModel } from '../types/road';
import { Play, Shield, ChevronRight, Sun, Cloud, Moon } from 'lucide-react';

interface MissionControlPageProps {
  engine: SimulationEngine;
  onLaunchSimulation: () => void;
  onSelectScenario: (id: ScenarioId) => void;
  onSelectMode: (mode: DrivingMode) => void;
  onSelectVehicle: (veh: VehicleModelType) => void;
  onSelectSpeed: (speedKmh: number) => void;
}

export const MissionControlPage: React.FC<MissionControlPageProps> = ({
  engine,
  onLaunchSimulation,
  onSelectScenario,
  onSelectMode,
  onSelectVehicle,
  onSelectSpeed,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [lighting, setLighting] = useState<LightingPreset>('DAYLIGHT');
  const [selectedSpeed, setSelectedSpeed] = useState<number>(() => Math.round(engine.ego.targetSpeed * 3.6) || 45);

  const currentScenario = engine.scenario;
  const currentVehicle = engine.ego.vehicleType;
  const currentMode = engine.ego.drivingMode;

  const scenarios: Array<{ id: ScenarioId; name: string; tag: string }> = [
    { id: 'UNMARKED_NARROW_ROAD', name: 'Unmarked Road', tag: 'Degraded Edge' },
    { id: 'UNSIGNALIZED_JUNCTION', name: 'Urban Junction', tag: '4-Way Conflict' },
    { id: 'HIGHWAY_SLOW_VEHICLE', name: 'Highway Merge', tag: 'High Speed' },
    { id: 'DENSE_MARKET', name: 'Dense Market', tag: 'Mixed Traffic' },
    { id: 'SUDDEN_CROSSING', name: 'Sudden Crossing', tag: 'Flagship Hero' },
  ];

  const vehicles: Array<{ id: VehicleModelType; label: string; desc: string }> = [
    { id: 'SEDAN', label: 'Sedan', desc: 'Wheelbase 2.7m • Balanced dynamics' },
    { id: 'SUV', label: 'SUV', desc: 'Wheelbase 2.85m • Wider safety envelope' },
    { id: 'COMPACT_EV', label: 'Compact EV', desc: 'Wheelbase 2.4m • High steering agility' },
  ];

  const modes: Array<{ id: DrivingMode; label: string; desc: string }> = [
    { id: 'MANUAL', label: 'Manual', desc: 'Direct operator steering & throttle control' },
    { id: 'CAUTIOUS', label: 'Cautious', desc: 'Conservative speed & wide safety margin' },
    { id: 'AUTONOMOUS', label: 'Autonomous', desc: 'Full perception, prediction, risk & planning loop' },
    { id: 'EMERGENCY_TEST', label: 'Emergency Test', desc: 'Hazard injection suite for stress validation' },
  ];

  // Draw realistic hero preview canvas
  useEffect(() => {
    let animId: number;
    let tick = 0;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Synthetic road model for hero scene
    const heroRoad: RoadModel = {
      totalLength: 300,
      nominalWidth: 7.2,
      numLanes: 2,
      leftBoundary: [],
      rightBoundary: [],
      centerLineMarkers: [],
      segments: [
        {
          yStart: 0,
          yEnd: 300,
          width: 7.2,
          leftEdgeOffset: -3.6,
          rightEdgeOffset: 3.6,
          hasCenterLine: true,
          laneConfidence: currentScenario.laneConfidence,
          surfaceCondition: 'DRY_ASPHALT',
        },
      ],
      potholes: currentScenario.initialPotholes.length > 0 ? currentScenario.initialPotholes : [
        { id: 'hero_pot_1', x: 1.2, y: 32, diameter: 0.9, depth: 9, severity: 'MODERATE' },
        { id: 'hero_pot_2', x: -1.5, y: 48, diameter: 1.2, depth: 14, severity: 'SEVERE' },
      ],
    };

    const render = () => {
      tick++;
      const width = canvas.width;
      const height = canvas.height;

      // Camera coordinates centered ahead of ego
      const egoY = 15;
      const camY = egoY + 14;
      const scale = 14; // pixels per meter

      const toScreenX = (x: number) => width / 2 + x * scale;
      const toScreenY = (y: number) => height / 2 - (y - camY) * scale;

      const heroEgo: EgoVehicleState = {
        ...engine.ego,
        vehicleType: currentVehicle,
        dimensions: VEHICLE_CONFIGS[currentVehicle],
        x: 0,
        y: egoY,
        heading: 0,
        steeringAngle: Math.sin(tick * 0.02) * 0.025,
        speed: selectedSpeed / 3.6,
      };

      // Surrounding actors showcasing authentic Indian traffic
      const heroActors: SurroundingActor[] = [
        {
          id: 'hero_auto',
          type: 'AUTO_RICKSHAW',
          x: -1.8,
          y: egoY + 22,
          vx: 0,
          vy: 8.5,
          speed: 8.5,
          heading: 0,
          acceleration: 0,
          behavior: 'LANE_KEEPING',
          uncertainty: 0.3,
          width: 1.4,
          length: 2.7,
        },
        {
          id: 'hero_bike',
          type: 'MOTORCYCLE',
          x: 2.2,
          y: egoY + 12 + Math.sin(tick * 0.03) * 0.4,
          vx: 0,
          vy: 11.0,
          speed: 11.0,
          heading: 0,
          acceleration: 0,
          behavior: 'ERRATIC_WEAVING',
          uncertainty: 0.4,
          width: 0.8,
          length: 1.9,
        },
        {
          id: 'hero_ped',
          type: 'PEDESTRIAN',
          x: -3.2,
          y: egoY + 36,
          vx: 0.5,
          vy: 0,
          speed: 1.2,
          heading: Math.PI / 2,
          acceleration: 0,
          behavior: 'CROSSING',
          uncertainty: 0.5,
          width: 0.6,
          length: 0.6,
        },
        {
          id: 'hero_animal',
          type: 'ANIMAL',
          x: 3.4,
          y: egoY + 44,
          vx: -0.4,
          vy: 0,
          speed: 0.8,
          heading: -Math.PI / 2,
          acceleration: 0,
          behavior: 'CROSSING',
          uncertainty: 0.6,
          width: 0.9,
          length: 1.9,
        },
      ];

      // 1. Draw realistic road surface
      drawRoadSurface(ctx, heroRoad, heroEgo, width, height, scale, toScreenX, toScreenY, lighting);

      // 2. Draw potholes
      drawPotholes(ctx, heroRoad.potholes, egoY - 20, egoY + 60, scale, toScreenX, toScreenY);

      // 3. Draw surrounding actors
      heroActors.forEach(actor => {
        drawSurroundingActor(ctx, actor, scale, toScreenX, toScreenY, lighting);
      });

      // 4. Draw ego vehicle
      drawEgoVehicle(ctx, heroEgo, scale, toScreenX, toScreenY, lighting);

      // 5. Cinematic subtle vignette
      const grad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        width * 0.2,
        width / 2,
        height / 2,
        width * 0.65
      );
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, lighting === 'EVENING' ? 'rgba(5,7,12,0.65)' : 'rgba(10,13,20,0.45)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [currentVehicle, currentScenario, lighting, selectedSpeed]);

  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setSelectedSpeed(val);
    onSelectSpeed(val);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Hero Scene & Command Deck Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left / Center 7 Cols: Cinematic Indian Road Hero Scene */}
        <div className="lg:col-span-7 relative rounded-2xl overflow-hidden border theme-border bg-[#090d15] shadow-automotive flex flex-col min-h-[460px]">
          {/* Canvas viewport */}
          <canvas
            ref={canvasRef}
            width={720}
            height={560}
            className="w-full h-full object-cover flex-1 block"
          />

          {/* Natural Lighting Selector Pill */}
          <div className="absolute top-4 right-4 flex items-center theme-hud border rounded-lg p-1 space-x-1 shadow-hud z-10">
            <button
              onClick={() => setLighting('DAYLIGHT')}
              className={`p-1.5 rounded text-xs transition-colors flex items-center space-x-1.5 ${
                lighting === 'DAYLIGHT'
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/40 font-bold'
                  : 'theme-text-muted hover:theme-text-primary'
              }`}
              title="Natural Daylight"
            >
              <Sun className="w-3.5 h-3.5" />
              <span className="text-[10px]">DAY</span>
            </button>
            <button
              onClick={() => setLighting('OVERCAST')}
              className={`p-1.5 rounded text-xs transition-colors flex items-center space-x-1.5 ${
                lighting === 'OVERCAST'
                  ? 'bg-slate-500/20 theme-text-primary border theme-border font-bold'
                  : 'theme-text-muted hover:theme-text-primary'
              }`}
              title="Overcast Diffuse"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span className="text-[10px]">DIFFUSE</span>
            </button>
            <button
              onClick={() => setLighting('EVENING')}
              className={`p-1.5 rounded text-xs transition-colors flex items-center space-x-1.5 ${
                lighting === 'EVENING'
                  ? 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/40 font-bold'
                  : 'theme-text-muted hover:theme-text-primary'
              }`}
              title="Evening Ambience"
            >
              <Moon className="w-3.5 h-3.5" />
              <span className="text-[10px]">EVENING</span>
            </button>
          </div>

          {/* Hero Scene Bottom Telemetry Strip */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/95 via-slate-950/80 to-transparent p-4 flex items-end justify-between border-t border-slate-800/40">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>ENVIRONMENT SIMULATOR ENGINE ACTIVE</span>
              </span>
              <p className="text-xs text-slate-300 font-sans">
                Unstructured asphalt corridor with mixed traffic, stray cattle, and real potholes
              </p>
            </div>
            <div className="text-right font-telemetry">
              <span className="text-[10px] text-slate-400 block uppercase">SIMULATED CRUISE</span>
              <span className="text-lg font-bold text-slate-100">{selectedSpeed} <span className="text-xs text-slate-400 font-normal">km/h</span></span>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Automotive Mission Command Deck */}
        <div className="lg:col-span-5 surface-dark rounded-2xl p-5 shadow-automotive flex flex-col justify-between space-y-3.5">
          {/* Header Title */}
          <div className="space-y-1 border-b theme-border pb-3">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-telemetry font-bold bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
                SIH26037
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-telemetry theme-text-secondary theme-card border theme-border">
                RESEARCH PLATFORM
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight theme-text-primary font-sans">
              ADAPT-INDIA
            </h1>
            <p className="text-xs theme-text-muted font-sans leading-relaxed">
              Adaptive Path Planning and Spatio-Temporal Collision Avoidance for Autonomous Vehicles on Unstructured Indian Roads
            </p>
          </div>

          {/* Vehicle Selection */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-mono font-bold theme-text-primary uppercase tracking-wider">
                VEHICLE
              </label>
              <span className="text-[10px] font-mono theme-text-muted">SELECT CHASSIS DYNAMICS</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {vehicles.map(v => {
                const isSelected = currentVehicle === v.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => onSelectVehicle(v.id)}
                    className={`py-2 px-3 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'theme-card border-teal-500 ring-1 ring-teal-500 text-teal-700 dark:text-teal-200 shadow-sm'
                        : 'theme-card border theme-border hover:theme-card-hover theme-text-secondary'
                    }`}
                  >
                    <div className="font-mono text-xs font-bold theme-text-primary">{v.label}</div>
                    <div className="text-[9px] theme-text-muted truncate mt-0.5">{v.desc.split('•')[0]}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Controller Architecture Selection */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-mono font-bold theme-text-primary uppercase tracking-wider">
                CONTROLLER PIPELINE
              </label>
              <span className="text-[10px] font-mono theme-text-muted">SELECT ALGORITHM</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => engine.setSimulationType('ADAPTIVE_AUTONOMOUS')}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  engine.config.simulationType === 'ADAPTIVE_AUTONOMOUS'
                    ? 'theme-card border-cyan-500 ring-1 ring-cyan-500 text-cyan-700 dark:text-cyan-200 shadow-sm'
                    : 'theme-card border theme-border hover:theme-card-hover theme-text-secondary'
                }`}
              >
                <div className="font-mono text-xs font-bold theme-text-primary">Adaptive Autonomous</div>
                <div className="text-[9px] theme-text-muted line-clamp-1 mt-0.5">Continuous Risk & Hermite Planner</div>
              </button>
              <button
                type="button"
                onClick={() => engine.setSimulationType('SMART_CONTROLLER')}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  engine.config.simulationType === 'SMART_CONTROLLER'
                    ? 'theme-card border-purple-500 ring-1 ring-purple-500 text-purple-700 dark:text-purple-200 shadow-sm'
                    : 'theme-card border theme-border hover:theme-card-hover theme-text-secondary'
                }`}
              >
                <div className="font-mono text-xs font-bold theme-text-primary">Smart Controller / 5×3</div>
                <div className="text-[9px] theme-text-muted line-clamp-1 mt-0.5">5×3 Occupancy Matrix Arbitrator</div>
              </button>
            </div>
          </div>

          {/* Driving Mode Selection */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-mono font-bold theme-text-primary uppercase tracking-wider">
                MODE
              </label>
              <span className="text-[10px] font-mono theme-text-muted">PLANNING STATE</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {modes.map(m => {
                const isSelected = currentMode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => onSelectMode(m.id)}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'theme-card border-sky-500 ring-1 ring-sky-500 text-sky-700 dark:text-sky-200 shadow-sm'
                        : 'theme-card border theme-border hover:theme-card-hover theme-text-secondary'
                    }`}
                  >
                    <div className="font-mono text-xs font-bold theme-text-primary">{m.label}</div>
                    <div className="text-[9px] theme-text-muted line-clamp-1 mt-0.5">{m.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scenario Selection */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-mono font-bold theme-text-primary uppercase tracking-wider">
                SCENARIO
              </label>
              <span className="text-[10px] font-mono theme-text-muted">5 EVALUATION TRACKS</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {scenarios.map(sc => {
                const isSelected = currentScenario.id === sc.id;
                return (
                  <button
                    key={sc.id}
                    onClick={() => onSelectScenario(sc.id)}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'theme-card border-amber-500 ring-1 ring-amber-500 text-amber-700 dark:text-amber-200 shadow-sm'
                        : 'theme-card border theme-border hover:theme-card-hover theme-text-secondary'
                    }`}
                  >
                    <div className="font-mono text-xs font-bold truncate theme-text-primary">{sc.name}</div>
                    <div className="text-[9px] theme-text-muted truncate">{sc.tag}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cruise Speed Slider */}
          <div className="space-y-1.5 theme-card p-3 rounded-xl border theme-border">
            <div className="flex justify-between items-center">
              <span className="text-xs font-mono font-bold theme-text-primary uppercase">
                TARGET SPEED
              </span>
              <span className="text-sm font-telemetry font-bold text-teal-600 dark:text-teal-300">
                {selectedSpeed} <span className="text-[10px] theme-text-muted font-normal">km/h</span>
              </span>
            </div>
            <input
              type="range"
              min="20"
              max="75"
              step="5"
              value={selectedSpeed}
              onChange={handleSpeedChange}
              className="w-full accent-teal-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[9px] font-mono theme-text-muted">
              <span>20 km/h (Cautious)</span>
              <span>45 km/h (Nominal)</span>
              <span>75 km/h (Highway)</span>
            </div>
          </div>

          {/* Launch Action Button */}
          <div className="pt-2">
            <button
              onClick={onLaunchSimulation}
              className="w-full flex items-center justify-center space-x-3 py-3.5 px-6 rounded-xl bg-teal-600 hover:bg-teal-500 text-white dark:text-slate-950 font-mono font-bold text-sm shadow-automotive transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>START SIMULATION</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
