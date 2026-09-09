import React, { useRef, useEffect, useState } from 'react';
import { SimulationEngine } from '../simulation/engine';
import { formatNum } from '../utils/math';
import {
  LightingPreset,
  drawRoadSurface,
  drawScenarioEnvironment,
  drawPotholes,
  drawEgoVehicle,
  drawSurroundingActor,
  drawCandidateTrajectories,
  drawPredictionEnvelopes,
  drawDynamicSafetyBubble,
} from './canvas/renderAssets';
import { Sun, Cloud, Moon, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface SimulationCanvasProps {
  engine: SimulationEngine;
  width?: number;
  height?: number;
  isPresentationMode?: boolean;
}

export const SimulationCanvas: React.FC<SimulationCanvasProps> = ({
  engine,
  width = 980,
  height = 620,
  isPresentationMode = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [lighting, setLighting] = useState<LightingPreset>('DAYLIGHT');
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  // Smooth camera follow state
  const cameraRef = useRef<{ x: number; y: number }>({
    x: engine.ego.x,
    y: engine.ego.y,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      // Smooth follow camera with subtle lag
      const targetX = engine.ego.x;
      const targetY = engine.ego.y;
      cameraRef.current.x += (targetX - cameraRef.current.x) * 0.15;
      cameraRef.current.y += (targetY - cameraRef.current.y) * 0.15;

      drawSimulationScene(
        ctx,
        canvas.width,
        canvas.height,
        engine,
        cameraRef.current.x,
        cameraRef.current.y,
        lighting,
        zoomLevel
      );
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [engine, lighting, zoomLevel]);

  return (
    <div className={`relative rounded-xl overflow-hidden border theme-border bg-[#080b12] shadow-2xl transition-all ${isPresentationMode ? 'h-full' : ''}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full h-full block cursor-crosshair"
      />

      {/* Canvas Top-Left Engineering HUD */}
      <div className="absolute top-3 left-3 theme-hud border rounded-lg px-3 py-2 text-[11px] pointer-events-none space-y-0.5">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
          <span className="font-semibold tracking-wider">REAL-TIME DETERMINISTIC SIMULATION</span>
        </div>
        <div className="theme-text-muted font-telemetry text-[10px]">
          T: <span className="theme-text-primary font-bold">{formatNum(engine.simTime, 2)}s</span> | 50Hz PHYSICS | {engine.scenario.name}
        </div>
      </div>

      {/* Canvas Top-Right Camera & Lighting Controls */}
      <div className="absolute top-3 right-3 flex items-center space-x-2">
        {/* Lighting Selector */}
        <div className="theme-hud border rounded-lg p-1 flex items-center space-x-1">
          <button
            onClick={() => setLighting('DAYLIGHT')}
            title="Daylight Lighting"
            className={`p-1.5 rounded transition-all ${
              lighting === 'DAYLIGHT'
                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 shadow-sm font-bold'
                : 'theme-text-muted hover:theme-text-primary hover:bg-slate-500/10'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setLighting('OVERCAST')}
            title="Overcast Diffuse"
            className={`p-1.5 rounded transition-all ${
              lighting === 'OVERCAST'
                ? 'bg-slate-500/20 theme-text-primary shadow-sm font-bold'
                : 'theme-text-muted hover:theme-text-primary hover:bg-slate-500/10'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setLighting('EVENING')}
            title="Evening Twilight & Headlights"
            className={`p-1.5 rounded transition-all ${
              lighting === 'EVENING'
                ? 'bg-sky-500/20 text-sky-600 dark:text-sky-300 shadow-sm font-bold'
                : 'theme-text-muted hover:theme-text-primary hover:bg-slate-500/10'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="theme-hud border rounded-lg p-1 flex items-center space-x-1">
          <button
            onClick={() => setZoomLevel(z => Math.min(1.6, z + 0.2))}
            title="Zoom In"
            className="p-1.5 rounded theme-text-muted hover:theme-text-primary hover:bg-slate-500/10 transition-all"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoomLevel(z => Math.max(0.7, z - 0.2))}
            title="Zoom Out"
            className="p-1.5 rounded theme-text-muted hover:theme-text-primary hover:bg-slate-500/10 transition-all"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoomLevel(1.0)}
            title="Reset Zoom"
            className="p-1.5 rounded theme-text-muted hover:theme-text-primary hover:bg-slate-500/10 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Canvas Bottom Trajectory Status Legend */}
      <div className="absolute bottom-3 left-3 theme-hud border rounded-lg px-3 py-1.5 text-[10px] pointer-events-none flex items-center space-x-4 hidden md:flex">
        <div className="flex items-center space-x-1.5">
          <span className="w-3 h-0.5 bg-sky-500 rounded-full" />
          <span>Selected Corridor ({engine.plannerOutput.selectedPathId})</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-3 h-0.5 bg-rose-500/60 rounded-full border-t border-dashed" />
          <span>Blocked Path</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-3 h-0.5 bg-emerald-500/60 rounded-full border-t border-dashed" />
          <span>Safe Alternate</span>
        </div>
        <div className="flex items-center space-x-1.5 theme-text-muted">
          <span className="w-2.5 h-2.5 rounded-full border border-teal-500/40 bg-teal-500/10" />
          <span>Dynamic Margin ({formatNum(engine.riskState.dynamicSafetyMargin, 1)}m)</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Orchestrates all realistic canvas layers:
 * 1. Road Surface, Shoulders, and Terrain
 * 2. Potholes and Road Surface Defects
 * 3. Candidate Trajectories (Left, Center, Right)
 * 4. Prediction Uncertainty Envelopes
 * 5. Surrounding Traffic Actors (Auto-rickshaws, Bikes, Cattle, Trucks)
 * 6. Dynamic Safety Margin Bubble
 * 7. Ego Vehicle with Headlights and Steered Wheels
 */
function drawSimulationScene(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  engine: SimulationEngine,
  camX: number,
  camY: number,
  lighting: LightingPreset,
  zoom: number
) {
  const ego = engine.ego;
  const road = engine.road;

  // Base scale: 14 px/meter, scaled by user zoom
  const scale = 14.0 * zoom;

  // Camera coordinates: center horizontally, offset downward vertically to show forward corridor
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight * 0.72;

  const toScreenX = (x: number) => centerX + (x - camX) * scale;
  const toScreenY = (y: number) => centerY - (y - camY) * scale;

  // 1. Draw Road Surface, Shoulders, and Terrain
  drawRoadSurface(ctx, road, ego, canvasWidth, canvasHeight, scale, toScreenX, toScreenY, lighting);

  // 1.5 Draw Scenario-specific roadside environment (trees, kiosks, stalls, warning signage)
  drawScenarioEnvironment(ctx, engine.scenario.id, road, ego, scale, toScreenX, toScreenY);

  // 2. Draw Potholes
  const yStart = ego.y - 30;
  const yEnd = ego.y + 85;
  drawPotholes(ctx, road.potholes, yStart, yEnd, scale, toScreenX, toScreenY);

  // 3. Draw Candidate Trajectories
  drawCandidateTrajectories(
    ctx,
    engine.plannerOutput?.candidates,
    engine.plannerOutput?.selectedPathId,
    toScreenX,
    toScreenY
  );

  // 4. Draw Prediction Envelopes & Uncertainty Corridors
  drawPredictionEnvelopes(ctx, engine.predictions, engine.actors, scale, toScreenX, toScreenY);

  // 5. Draw Surrounding Actors (Auto-rickshaw, Motorcycle, Pedestrian, Cattle, etc.)
  for (const actor of engine.actors) {
    if (actor.y < yStart || actor.y > yEnd) continue;
    drawSurroundingActor(ctx, actor, scale, toScreenX, toScreenY, lighting);
  }

  // 6. Draw Dynamic Safety Margin Bubble
  drawDynamicSafetyBubble(ctx, ego, engine.riskState, scale, toScreenX, toScreenY);

  // 7. Draw Ego Vehicle
  drawEgoVehicle(ctx, ego, scale, toScreenX, toScreenY, lighting);
}
