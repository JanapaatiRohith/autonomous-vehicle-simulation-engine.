import React, { useRef, useEffect, useState } from 'react';
import { SimulationEngine } from '../../simulation/engine';
import { Simulation3DScene, CameraViewMode } from './sceneManager';
import { Camera, Eye, Compass, RotateCcw, AlertTriangle, Radio } from 'lucide-react';
import { formatNum } from '../../utils/math';

interface ThreeSimulationCanvasProps {
  engine: SimulationEngine;
  width?: number;
  height?: number;
  isPresentationMode?: boolean;
}

export const ThreeSimulationCanvas: React.FC<ThreeSimulationCanvasProps> = ({
  engine,
  width = 980,
  height = 620,
  isPresentationMode = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<Simulation3DScene | null>(null);
  const [cameraMode, setCameraMode] = useState<CameraViewMode>('CHASE');
  const [fps, setFps] = useState<number>(60);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Create 3D Scene
    const scene = new Simulation3DScene(container, { antialias: true });
    sceneRef.current = scene;

    let animId: number;
    let lastTime = performance.now();
    let frameCount = 0;
    let fpsTimer = performance.now();

    const render = (time: number) => {
      const dt = Math.min(0.05, (time - lastTime) / 1000);
      lastTime = time;

      // Update 3D scene from real-time engine state
      scene.update(engine, dt);

      // Measure FPS
      frameCount++;
      if (time - fpsTimer >= 500) {
        setFps(Math.round((frameCount * 1000) / (time - fpsTimer)));
        frameCount = 0;
        fpsTimer = time;
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    // Handle container resize
    const handleResize = () => {
      if (container && scene) {
        scene.resize(container.clientWidth, container.clientHeight);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      scene.dispose();
      sceneRef.current = null;
    };
  }, [engine]);

  const handleCameraChange = (mode: CameraViewMode) => {
    setCameraMode(mode);
    if (sceneRef.current) {
      sceneRef.current.setCameraMode(mode);
    }
  };

  const isManual = engine.config.vehicleMode === 'MANUAL';

  return (
    <div
      ref={containerRef}
      className={`relative rounded-xl overflow-hidden border border-cyan-900/40 bg-[#080b12] shadow-2xl select-none transition-all ${
        isPresentationMode ? 'h-full' : ''
      }`}
      style={{ width: isPresentationMode ? '100%' : width, height: isPresentationMode ? '100%' : height }}
    >
      {/* 3D Top-Left Engineering HUD */}
      <div className="absolute top-3 left-3 theme-hud border rounded-lg px-3 py-2 text-[11px] pointer-events-none space-y-1 z-10">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse shadow-sm shadow-cyan-400/50" />
          <span className="font-semibold tracking-wider font-mono text-[11px]">
            THREE.JS 3D AUTONOMOUS ENGINE
          </span>
          <span className="px-1.5 py-0.5 rounded theme-card border theme-border text-[10px] text-sky-600 dark:text-cyan-300 font-mono font-bold">
            {fps} FPS
          </span>
        </div>
        <div className="theme-text-muted font-mono text-[10px] flex items-center space-x-2">
          <span>ROAD: <strong className="theme-text-primary">{formatNum(engine.road.nominalWidth, 1)}m</strong></span>
          <span>•</span>
          <span>CORRIDOR: <strong className="text-sky-600 dark:text-cyan-300">{engine.plannerOutput?.selectedPathId ?? 'CENTER'}</strong></span>
          <span>•</span>
          <span>ACTORS: <strong className="text-amber-600 dark:text-amber-300">{engine.actors.length}</strong></span>
        </div>
      </div>

      {/* Manual Mode Active Banner */}
      {isManual && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 font-bold text-xs px-3 py-1 rounded-full shadow-lg flex items-center space-x-2 pointer-events-none z-10 animate-pulse">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>MANUAL CONTROL ACTIVE: W/A/S/D • SPACE (EMERGENCY BRAKE)</span>
        </div>
      )}

      {/* 3D Top-Right Camera Controls */}
      <div className="absolute top-3 right-3 flex items-center space-x-2 z-10">
        <div className="theme-hud border rounded-lg p-1 flex items-center space-x-1">
          <button
            onClick={() => handleCameraChange('CHASE')}
            title="Chase Camera (Follow Ego Vehicle)"
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-mono transition-all ${
              cameraMode === 'CHASE'
                ? 'bg-sky-500/20 border border-sky-500/50 text-sky-700 dark:text-cyan-300 font-bold shadow-sm'
                : 'theme-text-muted hover:theme-text-primary hover:bg-slate-500/10'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Chase</span>
          </button>

          <button
            onClick={() => handleCameraChange('TOP_DOWN')}
            title="Top-Down Birds-Eye View"
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-mono transition-all ${
              cameraMode === 'TOP_DOWN'
                ? 'bg-sky-500/20 border border-sky-500/50 text-sky-700 dark:text-cyan-300 font-bold shadow-sm'
                : 'theme-text-muted hover:theme-text-primary hover:bg-slate-500/10'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Top-Down</span>
          </button>

          <button
            onClick={() => handleCameraChange('ORBIT')}
            title="Free Orbit Camera (Mouse Rotate & Pan)"
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-mono transition-all ${
              cameraMode === 'ORBIT'
                ? 'bg-sky-500/20 border border-sky-500/50 text-sky-700 dark:text-cyan-300 font-bold shadow-sm'
                : 'theme-text-muted hover:theme-text-primary hover:bg-slate-500/10'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Orbit</span>
          </button>
        </div>
      </div>

      {/* Bottom 3D Trajectory Ribbon Legend */}
      <div className="absolute bottom-3 left-3 theme-hud border rounded-lg px-3 py-1.5 text-[10px] pointer-events-none flex items-center space-x-4 hidden md:flex z-10">
        <div className="flex items-center space-x-1.5">
          <span className="w-3 h-1 bg-cyan-400 rounded shadow-sm shadow-cyan-400/50" />
          <span>Planned Path ({engine.plannerOutput?.selectedPathId ?? 'CENTER'})</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-3 h-1 bg-rose-500/80 rounded" />
          <span>Rejected / Blocked</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-3 h-1 bg-emerald-400/80 rounded" />
          <span>Safe Alternate</span>
        </div>
        <div className="flex items-center space-x-1.5 theme-text-muted">
          <span className="w-2.5 h-2.5 rounded-full border border-teal-400 bg-teal-400/20" />
          <span>Safety Margin ({formatNum(engine.riskState.dynamicSafetyMargin, 1)}m)</span>
        </div>
      </div>
    </div>
  );
};
