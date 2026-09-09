import React, { useEffect, useState } from 'react';
import { SimulationEngine } from '../simulation/engine';
import { SimulationCanvas } from '../components/SimulationCanvas';
import { ThreeSimulationCanvas } from '../components/canvas3d/ThreeSimulationCanvas';
import { SimulationConfigModal } from '../components/SimulationConfigModal';
import { TelemetryPanel } from '../components/TelemetryPanel';
import { RiskGaugePanel } from '../components/RiskGaugePanel';
import { PlannerPanel } from '../components/PlannerPanel';
import { OccupancyGridHUD } from '../components/OccupancyGridHUD';
import { ControlBar } from '../components/ControlBar';
import { EventLogPanel } from '../components/EventLogPanel';
import { SmartControllerWorkbench } from '../components/smartController/SmartControllerWorkbench';
import { DrivingMode } from '../types/vehicle';
import { ActorType } from '../types/obstacle';
import { SimulationConfig } from '../types/config';
import { formatNum } from '../utils/math';
import { Compass, AlertTriangle, ShieldCheck } from 'lucide-react';

interface LiveSimulationPageProps {
  engine: SimulationEngine;
  isRunning: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  onEmergencyStop: () => void;
  onSetMode: (mode: DrivingMode) => void;
  onInjectHazard: (type: ActorType) => void;
  onLaunchHeroDemo?: () => void;
  isPresentationMode?: boolean;
  onTogglePresentationMode?: () => void;
}

export const LiveSimulationPage: React.FC<LiveSimulationPageProps> = ({
  engine,
  isRunning,
  onTogglePlay,
  onReset,
  onEmergencyStop,
  onSetMode,
  onInjectHazard,
  onLaunchHeroDemo,
  isPresentationMode = false,
  onTogglePresentationMode,
}) => {
  const [renderMode, setRenderMode] = useState<'2D' | '3D'>(
    engine.config?.renderMode || '3D'
  );
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [activeKeys, setActiveKeys] = useState<{ [key: string]: boolean }>({});

  // Manual keyboard controls listener (W/A/S/D and Arrow Keys, plus Space for Emergency Brake)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent page scrolling on arrow keys and space
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      const key = e.key.toLowerCase();
      setActiveKeys(prev => ({ ...prev, [key]: true }));

      if (e.key === ' ' || e.code === 'Space') {
        if (engine.ego.drivingMode === 'MANUAL') {
          engine.manualControls.emergencyBrake = true;
        } else {
          onEmergencyStop();
        }
        return;
      }

      if (engine.ego.drivingMode !== 'MANUAL') return;

      if (e.key === 'w' || e.key === 'ArrowUp') engine.manualControls.throttle = true;
      if (e.key === 's' || e.key === 'ArrowDown') engine.manualControls.brake = true;
      if (e.key === 'a' || e.key === 'ArrowLeft') engine.manualControls.steerLeft = true;
      if (e.key === 'd' || e.key === 'ArrowRight') engine.manualControls.steerRight = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      setActiveKeys(prev => ({ ...prev, [key]: false }));

      if (e.key === ' ' || e.code === 'Space') {
        engine.manualControls.emergencyBrake = false;
        return;
      }

      if (engine.ego.drivingMode !== 'MANUAL') return;

      if (e.key === 'w' || e.key === 'ArrowUp') engine.manualControls.throttle = false;
      if (e.key === 's' || e.key === 'ArrowDown') engine.manualControls.brake = false;
      if (e.key === 'a' || e.key === 'ArrowLeft') engine.manualControls.steerLeft = false;
      if (e.key === 'd' || e.key === 'ArrowRight') engine.manualControls.steerRight = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [engine, onEmergencyStop]);

  const handleApplyConfig = (newConfig: SimulationConfig, restart: boolean) => {
    engine.applyConfig(newConfig, restart);
    if (newConfig.renderMode) {
      setRenderMode(newConfig.renderMode);
    }
  };

  const isManual = engine.ego.drivingMode === 'MANUAL';

  return (
    <div className="space-y-3.5 max-w-[1720px] mx-auto pb-6">
      {/* Simulation Controls Header */}
      <ControlBar
        engine={engine}
        isRunning={isRunning}
        drivingMode={engine.ego.drivingMode}
        simulationType={engine.config.simulationType}
        onSelectSimulationType={type => engine.setSimulationType(type)}
        onTogglePlay={onTogglePlay}
        onReset={onReset}
        onEmergencyStop={onEmergencyStop}
        onSetMode={onSetMode}
        onInjectHazard={onInjectHazard}
        onLaunchHeroDemo={onLaunchHeroDemo}
        isPresentationMode={isPresentationMode}
        onTogglePresentationMode={onTogglePresentationMode}
        renderMode={renderMode}
        onToggleRenderMode={mode => {
          setRenderMode(mode);
          engine.config.renderMode = mode;
        }}
        onOpenConfig={() => setIsConfigOpen(true)}
      />

      {/* Manual Controls Helper Banner (When in Manual Mode) */}
      {isManual && (
        <div className="theme-card border border-amber-500/60 rounded-xl px-4 py-2.5 flex items-center justify-between shadow-md">
          <div className="flex items-center space-x-3">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-bold text-amber-600 dark:text-amber-300 font-mono tracking-wide">
              AUTHENTIC OPERATOR MANUAL DRIVE:
            </span>
            <div className="flex items-center space-x-1.5 text-xs font-mono">
              <span className={`px-2 py-0.5 rounded border ${activeKeys['w'] || activeKeys['arrowup'] ? 'bg-amber-400 text-slate-950 font-bold' : 'theme-surface theme-text-secondary border theme-border'}`}>W / ↑ Accel</span>
              <span className={`px-2 py-0.5 rounded border ${activeKeys['s'] || activeKeys['arrowdown'] ? 'bg-amber-400 text-slate-950 font-bold' : 'theme-surface theme-text-secondary border theme-border'}`}>S / ↓ Brake</span>
              <span className={`px-2 py-0.5 rounded border ${activeKeys['a'] || activeKeys['arrowleft'] ? 'bg-amber-400 text-slate-950 font-bold' : 'theme-surface theme-text-secondary border theme-border'}`}>A / ← Steer L</span>
              <span className={`px-2 py-0.5 rounded border ${activeKeys['d'] || activeKeys['arrowright'] ? 'bg-amber-400 text-slate-950 font-bold' : 'theme-surface theme-text-secondary border theme-border'}`}>D / → Steer R</span>
              <span className={`px-2 py-0.5 rounded border ${activeKeys[' '] ? 'bg-rose-500 text-white font-bold animate-pulse' : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/40'}`}>SPACE Emergency Brake</span>
            </div>
          </div>
          <div className="text-[11px] font-mono theme-text-muted">
            Road Width: <strong className="text-sky-600 dark:text-cyan-300 font-bold">{engine.road.nominalWidth.toFixed(1)}m</strong>
          </div>
        </div>
      )}

      {/* Presentation Mode: Projector Layout with Enlarged Simulation & Primary Readouts */}
      {isPresentationMode ? (
        <div className="space-y-3">
          {/* Top Big Presentation HUD Strip */}
          <div className="grid grid-cols-5 gap-3 font-telemetry">
            <div className="surface-dark rounded-xl p-3 text-center">
              <span className="text-[10px] theme-text-muted block font-sans uppercase">VEHICLE SPEED</span>
              <div className="text-3xl font-extrabold theme-text-primary mt-0.5">
                {formatNum(engine.ego.speed * 3.6, 1)} <span className="text-xs font-normal theme-text-muted">km/h</span>
              </div>
            </div>

            <div className="surface-dark rounded-xl p-3 text-center">
              <span className="text-[10px] theme-text-muted block font-sans uppercase">SITUATIONAL RISK</span>
              <div className={`text-3xl font-extrabold mt-0.5 ${engine.riskState.overallRiskLevel === 'CRITICAL' ? 'text-rose-600 dark:text-rose-400' : engine.riskState.overallRiskLevel === 'HIGH' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {engine.riskState.overallRiskScore} <span className="text-xs font-normal theme-text-muted font-sans">({engine.riskState.overallRiskLevel})</span>
              </div>
            </div>

            <div className="surface-dark rounded-xl p-3 text-center">
              <span className="text-[10px] theme-text-muted block font-sans uppercase">TIME TO COLLISION</span>
              <div className="text-3xl font-extrabold text-sky-600 dark:text-sky-300 mt-0.5">
                {isFinite(engine.riskState.minimumTTC) ? `${formatNum(engine.riskState.minimumTTC, 2)}s` : '∞'}
              </div>
            </div>

            <div className="surface-dark rounded-xl p-3 text-center">
              <span className="text-[10px] theme-text-muted block font-sans uppercase">SELECTED CORRIDOR</span>
              <div className="text-3xl font-extrabold text-teal-600 dark:text-teal-300 mt-0.5">
                {engine.plannerOutput.selectedPathId}
              </div>
            </div>

            <div className="surface-dark rounded-xl p-3 text-center">
              <span className="text-[10px] theme-text-muted block font-sans uppercase">PLANNER DECISION</span>
              <div className="text-2xl font-extrabold theme-text-primary mt-1 truncate">
                {engine.plannerOutput.decision.replace('_', ' ')}
              </div>
            </div>
          </div>

          {/* Large Canvas Viewport (3D or 2D) */}
          <div className="w-full h-[660px]">
            {renderMode === '3D' ? (
              <ThreeSimulationCanvas engine={engine} isPresentationMode={true} />
            ) : (
              <SimulationCanvas engine={engine} width={1680} height={660} isPresentationMode={true} />
            )}
          </div>

          {/* Timeline Event Log */}
          <EventLogPanel events={engine.eventLogger.getRecentEvents(30)} />
        </div>
      ) : (
        /* Standard Lab Layout: 75% Road Canvas, 25% Diagnostics */
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3.5">
          {/* Canvas Left (75% on large screens) */}
          <div className="xl:col-span-8 2xl:col-span-9 flex flex-col space-y-3.5">
            <div className="w-full h-[620px]">
              {renderMode === '3D' ? (
                <ThreeSimulationCanvas engine={engine} width={1180} height={620} />
              ) : (
                <SimulationCanvas engine={engine} width={1180} height={620} />
              )}
            </div>

            {/* Event Log Stream */}
            <EventLogPanel events={engine.eventLogger.getRecentEvents(30)} />
          </div>

          {/* Telemetry & Analysis Sidebar (25% on large screens) */}
          <div className="xl:col-span-4 2xl:col-span-3 space-y-3.5">
            <TelemetryPanel ego={engine.ego} />
            <RiskGaugePanel risk={engine.riskState} />
            <PlannerPanel planner={engine.plannerOutput} />
            <OccupancyGridHUD grid={engine.occupancyGrid} />
          </div>
        </div>
      )}

      {/* Smart Controller / 5×3 Occupancy Matrix Interactive Workbench */}
      {engine.config.simulationType === 'SMART_CONTROLLER' && (
        <SmartControllerWorkbench engine={engine} />
      )}

      {/* Real-time Environment & Vehicle Configurator Modal */}
      <SimulationConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        config={engine.config}
        onApply={handleApplyConfig}
      />
    </div>
  );
};

