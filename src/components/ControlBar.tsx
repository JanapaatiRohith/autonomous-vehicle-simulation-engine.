import React from 'react';
import { SimulationEngine } from '../simulation/engine';
import { DrivingMode } from '../types/vehicle';
import { ActorType } from '../types/obstacle';
import { SimulationType } from '../types/config';
import { Play, Pause, RotateCcw, OctagonAlert, Sparkles, Maximize2, Minimize2 } from 'lucide-react';

interface ControlBarProps {
  engine: SimulationEngine;
  isRunning: boolean;
  drivingMode: DrivingMode;
  simulationType?: SimulationType;
  onSelectSimulationType?: (type: SimulationType) => void;
  onTogglePlay: () => void;
  onReset: () => void;
  onEmergencyStop: () => void;
  onSetMode: (mode: DrivingMode) => void;
  onInjectHazard: (type: ActorType) => void;
  onLaunchHeroDemo?: () => void;
  isPresentationMode?: boolean;
  onTogglePresentationMode?: () => void;
  renderMode?: '2D' | '3D';
  onToggleRenderMode?: (mode: '2D' | '3D') => void;
  onOpenConfig?: () => void;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  engine,
  isRunning,
  drivingMode,
  simulationType = 'ADAPTIVE_AUTONOMOUS',
  onSelectSimulationType,
  onTogglePlay,
  onReset,
  onEmergencyStop,
  onSetMode,
  onInjectHazard,
  onLaunchHeroDemo,
  isPresentationMode = false,
  onTogglePresentationMode,
  renderMode = '2D',
  onToggleRenderMode,
  onOpenConfig,
}) => {
  const modes: DrivingMode[] = ['AUTONOMOUS', 'CAUTIOUS', 'MANUAL', 'EMERGENCY_TEST'];
  const currentSimType = simulationType || engine.config?.simulationType || 'ADAPTIVE_AUTONOMOUS';

  return (
    <div className="surface-dark rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-automotive">
      {/* Primary Simulation Controls */}
      <div className="flex items-center space-x-2">
        <button
          onClick={onTogglePlay}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wider transition-all shadow-md active:scale-95 ${
            isRunning
              ? 'bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white font-bold'
          }`}
        >
          {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          <span>{isRunning ? 'PAUSE' : 'START SIMULATION'}</span>
        </button>

        <button
          onClick={onReset}
          className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-medium theme-card hover:theme-card-hover theme-text-secondary hover:theme-text-primary border theme-border transition-colors shadow-sm"
          title="Reset simulation to initial scenario state"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>RESET</span>
        </button>

        <button
          onClick={onEmergencyStop}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 border border-rose-500/40 shadow-sm transition-all active:scale-95"
          title="Trigger emergency vehicle halt"
        >
          <OctagonAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          <span>EMERGENCY STOP</span>
        </button>

        {onLaunchHeroDemo && (
          <button
            onClick={onLaunchHeroDemo}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-md transition-all active:scale-95"
            title="Launch Flagship Hero Scenario 5 (Sudden Animal Crossing)"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>HERO DEMO</span>
          </button>
        )}
      </div>

      {/* Simulation Type Selector: Adaptive Autonomous Driving vs Smart Controller / 5x3 Occupancy */}
      <div className="flex items-center space-x-1 theme-card border theme-border rounded-lg p-1 shadow-sm">
        <span className="text-[10px] font-mono theme-text-muted px-1.5 uppercase font-bold hidden sm:inline">
          TYPE:
        </span>
        <button
          onClick={() => onSelectSimulationType?.('ADAPTIVE_AUTONOMOUS')}
          className={`px-3 py-1 rounded text-[11px] font-medium transition-all ${
            currentSimType === 'ADAPTIVE_AUTONOMOUS'
              ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40 font-bold shadow-sm'
              : 'theme-text-muted hover:theme-text-primary'
          }`}
          title="Standard Adaptive Path Planning for Unstructured Indian Roads"
        >
          Adaptive Autonomous
        </button>
        <button
          onClick={() => onSelectSimulationType?.('SMART_CONTROLLER')}
          className={`px-3 py-1 rounded text-[11px] font-medium flex items-center space-x-1.5 transition-all ${
            currentSimType === 'SMART_CONTROLLER'
              ? 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/40 font-bold shadow-sm'
              : 'theme-text-muted hover:theme-text-primary'
          }`}
          title="5×3 Occupancy Matrix Spatial Controller & Causal Arbitrator"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
          <span>Smart Controller / 5×3 Occupancy</span>
        </button>
      </div>

      {/* Mode Selector */}
      <div className="flex items-center space-x-1 theme-card border theme-border rounded-lg p-1 shadow-sm">
        {modes.map(mode => (
          <button
            key={mode}
            onClick={() => onSetMode(mode)}
            className={`px-2.5 py-1 rounded text-[11px] font-sans transition-all ${
              drivingMode === mode
                ? 'bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/40 font-semibold shadow-sm'
                : 'theme-text-muted hover:theme-text-primary'
            }`}
          >
            {mode.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* 2D / 3D Renderer Switch & Config Button */}
      <div className="flex items-center space-x-2">
        {onToggleRenderMode && (
          <div className="flex items-center theme-card border theme-border rounded-lg p-0.5 shadow-sm">
            <button
              onClick={() => onToggleRenderMode('2D')}
              className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all ${
                renderMode === '2D'
                  ? 'bg-sky-500/20 text-sky-700 dark:text-cyan-300 border border-sky-500/40 shadow-sm'
                  : 'theme-text-muted hover:theme-text-primary'
              }`}
            >
              2D Canvas
            </button>
            <button
              onClick={() => onToggleRenderMode('3D')}
              className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all ${
                renderMode === '3D'
                  ? 'bg-gradient-to-r from-sky-600 to-teal-600 text-white dark:text-slate-950 font-bold shadow-sm'
                  : 'theme-text-muted hover:theme-text-primary'
              }`}
            >
              3D Three.js
            </button>
          </div>
        )}

        {/* Road Width Indicator Badge */}
        <div
          className="hidden sm:flex items-center px-2 py-1 rounded-lg theme-card border theme-border text-[11px] font-mono theme-text-secondary space-x-1"
          title={`Nominal Road Width: ${engine.road.nominalWidth}m`}
        >
          <span className="theme-text-muted">ROAD:</span>
          <span className="text-sky-600 dark:text-cyan-400 font-bold">{engine.road.nominalWidth.toFixed(1)}m</span>
        </div>

        {/* Config Modal Button */}
        {onOpenConfig && (
          <button
            onClick={onOpenConfig}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 dark:text-cyan-300 border border-sky-500/30 shadow-sm transition-all"
            title="Configure Road Width, Traffic Density, Speed, and Vehicle"
          >
            <span className="text-[11px]">CONFIGURE</span>
          </button>
        )}
      </div>

      {/* Hazard Injector Buttons & Presentation Mode Toggle */}
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1.5 overflow-x-auto">
          <span className="text-[10px] theme-text-muted uppercase tracking-wider hidden 2xl:inline">
            INJECT:
          </span>
          <button
            onClick={() => onInjectHazard('PEDESTRIAN')}
            className="px-2 py-1 rounded text-[10px] theme-card hover:theme-card-hover theme-text-secondary hover:theme-text-primary border theme-border transition-colors shadow-sm"
          >
            + Pedestrian
          </button>
          <button
            onClick={() => onInjectHazard('ANIMAL')}
            className="px-2 py-1 rounded text-[10px] theme-card hover:theme-card-hover text-amber-600 dark:text-amber-300 border theme-border transition-colors shadow-sm"
          >
            + Cow/Dog
          </button>
          <button
            onClick={() => onInjectHazard('MOTORCYCLE')}
            className="px-2 py-1 rounded text-[10px] theme-card hover:theme-card-hover theme-text-secondary hover:theme-text-primary border theme-border transition-colors shadow-sm"
          >
            + Bike
          </button>
          <button
            onClick={() => onInjectHazard('AUTO_RICKSHAW')}
            className="px-2 py-1 rounded text-[10px] theme-card hover:theme-card-hover text-teal-600 dark:text-teal-300 border theme-border transition-colors shadow-sm"
          >
            + Rickshaw
          </button>
          <button
            onClick={() => onInjectHazard('POTHOLE')}
            className="px-2 py-1 rounded text-[10px] theme-card hover:theme-card-hover text-rose-600 dark:text-rose-300 border theme-border transition-colors shadow-sm"
          >
            + Pothole
          </button>
        </div>

        {onTogglePresentationMode && (
          <button
            onClick={onTogglePresentationMode}
            className={`p-2 rounded-lg border text-xs flex items-center space-x-1.5 transition-all shadow-sm ${
              isPresentationMode
                ? 'bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/50'
                : 'theme-card text-slate-500 dark:text-slate-400 theme-border hover:theme-text-primary'
            }`}
            title="Toggle Presentation Mode (Enlarge Simulation)"
          >
            {isPresentationMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline text-[11px]">{isPresentationMode ? 'Exit' : 'Presentation'}</span>
          </button>
        )}
      </div>
    </div>
  );
};

