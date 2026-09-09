import React from 'react';
import { SimulationEngine } from '../../simulation/engine';
import { SmartMatrixGrid } from './SmartMatrixGrid';
import {
  SMART_CASES,
  SmartCaseId,
} from '../../types/smartController';
import {
  Cpu,
  RotateCcw,
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  GitBranch,
  ShieldCheck,
  Zap,
  Gauge,
  Compass,
  Layers,
} from 'lucide-react';
import { formatNum } from '../../utils/math';

interface SmartControllerWorkbenchProps {
  engine: SimulationEngine;
}

export const SmartControllerWorkbench: React.FC<SmartControllerWorkbenchProps> = ({ engine }) => {
  const output = engine.smartControllerOutput;
  const matrix = engine.smartMatrix;
  const activeCaseId = engine.smartCaseId;
  const isOverride = engine.isSmartMatrixManualOverride;

  const casesList = Object.values(SMART_CASES);

  return (
    <div className="theme-card rounded-2xl p-5 shadow-automotive border theme-border space-y-5">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b theme-border pb-3.5">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40">
              SMART CONTROLLER ENGINE
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono theme-surface theme-text-muted border theme-border">
              5×3 OCCUPANCY MATRIX ARBITRATOR
            </span>
          </div>
          <h2 className="text-base font-bold theme-text-primary flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span>5×3 SPATIAL OCCUPANCY MATRIX & CAUSAL PLANNER</span>
          </h2>
        </div>

        <div className="flex items-center space-x-2 font-mono text-xs">
          <span className="theme-text-muted">MODE:</span>
          <span
            className={`px-2.5 py-1 rounded-lg border font-bold ${
              isOverride
                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40'
                : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40'
            }`}
          >
            {isOverride ? 'MANUAL / CASE OVERRIDE' : 'LIVE PERCEPTION SYNC'}
          </span>
        </div>
      </div>

      {/* Main 3-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Column 1 (4 cols): Live 5x3 Matrix Grid & Cell Actions */}
        <div className="lg:col-span-4 space-y-3 theme-surface p-4 rounded-xl border theme-border shadow-sm">
          <div className="flex items-center justify-between border-b theme-border pb-2">
            <h3 className="text-xs font-mono font-bold theme-text-primary uppercase tracking-wider flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>LIVE 5×3 MATRIX</span>
            </h3>
            <button
              onClick={() => engine.resetSmartMatrix()}
              className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono theme-card hover:theme-card-hover theme-text-primary border theme-border transition-colors"
              title="Reset all cells to 0 (FREE)"
            >
              <RotateCcw className="w-3 h-3" />
              <span>RESET</span>
            </button>
          </div>

          <SmartMatrixGrid
            matrix={matrix}
            interactive={true}
            onToggleCell={(r, c) => engine.toggleSmartCell(r, c)}
          />

          {/* Quick Injection Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
            <button
              onClick={() => engine.setSmartCell(1, 1, 1)}
              className="p-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold transition-colors"
            >
              + Obstacle (F1=1)
            </button>
            <button
              onClick={() => engine.setSmartCell(1, 1, 2)}
              className="p-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold transition-colors"
            >
              + Pothole (F1=2)
            </button>
          </div>

          <button
            onClick={() => engine.toggleSmartMatrixAutoSync()}
            className="w-full py-1.5 px-2 rounded-lg border theme-border theme-card hover:theme-card-hover text-xs font-mono theme-text-secondary transition-colors"
          >
            {isOverride ? 'SWITCH TO AUTO PERCEPTION' : 'LOCK MANUAL OVERRIDE'}
          </button>
        </div>

        {/* Column 2 (4 cols): Predefined Smart Controller Cases (A-H) */}
        <div className="lg:col-span-4 space-y-2.5 theme-surface p-4 rounded-xl border theme-border shadow-sm max-h-[480px] overflow-y-auto">
          <div className="border-b theme-border pb-2">
            <h3 className="text-xs font-mono font-bold theme-text-primary uppercase tracking-wider flex items-center space-x-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>TEST CASES (A TO H)</span>
            </h3>
            <p className="text-[10px] theme-text-muted mt-0.5">
              Click any case to test emergent autonomous arbitration.
            </p>
          </div>

          <div className="space-y-1.5">
            {casesList.map(sc => {
              const isSelected = activeCaseId === sc.id;
              return (
                <button
                  key={sc.id}
                  onClick={() => engine.setSmartCase(sc.id)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all space-y-1 ${
                    isSelected
                      ? 'theme-card border-cyan-500 ring-2 ring-cyan-500/40 shadow-sm'
                      : 'theme-card border theme-border hover:theme-card-hover'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold theme-text-primary">
                      {sc.name}
                    </span>
                    {isSelected && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-cyan-500 text-slate-950">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] theme-text-secondary leading-snug font-sans">
                    {sc.tagline}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Column 3 (4 cols): Live Causal Arbitration Telemetry */}
        <div className="lg:col-span-4 space-y-3 theme-surface p-4 rounded-xl border theme-border shadow-sm font-telemetry">
          <div className="border-b theme-border pb-2">
            <h3 className="text-xs font-mono font-bold theme-text-primary uppercase tracking-wider flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>CAUSAL ARBITRATION TELEMETRY</span>
            </h3>
            <span className="text-[10px] theme-text-muted">
              Non-hardcoded emergent vehicle response
            </span>
          </div>

          {/* Action & FSM */}
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="theme-card p-2 rounded-lg border theme-border">
              <span className="text-[9px] font-mono theme-text-muted block uppercase">ACTION</span>
              <span
                className={`font-bold font-mono text-xs ${
                  output.selectedAction === 'EMERGENCY_BRAKE'
                    ? 'text-rose-600 dark:text-rose-400'
                    : output.selectedAction === 'AVOID_LEFT' || output.selectedAction === 'AVOID_RIGHT'
                    ? 'text-cyan-600 dark:text-cyan-300'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {output.selectedAction}
              </span>
            </div>

            <div className="theme-card p-2 rounded-lg border theme-border">
              <span className="text-[9px] font-mono theme-text-muted block uppercase">FSM STATE</span>
              <span className="font-bold font-mono text-xs theme-text-primary truncate block">
                {output.fsmState}
              </span>
            </div>
          </div>

          {/* Kinematics Telemetry */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="theme-card p-2 rounded-lg border theme-border">
              <span className="text-[9px] font-mono theme-text-muted block uppercase">TARGET SPEED</span>
              <span className="font-bold text-teal-600 dark:text-teal-300">
                {output.targetSpeedKmh} <span className="text-[9px] font-normal">km/h</span>
              </span>
            </div>

            <div className="theme-card p-2 rounded-lg border theme-border">
              <span className="text-[9px] font-mono theme-text-muted block uppercase">STEERING</span>
              <span
                className={`font-bold ${
                  output.commandedSteerDeg > 0
                    ? 'text-cyan-600 dark:text-cyan-400'
                    : output.commandedSteerDeg < 0
                    ? 'text-purple-600 dark:text-purple-400'
                    : 'theme-text-primary'
                }`}
              >
                {output.commandedSteerDeg > 0 ? `+${formatNum(output.commandedSteerDeg, 1)}°` : `${formatNum(output.commandedSteerDeg, 1)}°`}
              </span>
            </div>

            <div className="theme-card p-2 rounded-lg border theme-border">
              <span className="text-[9px] font-mono theme-text-muted block uppercase">BRAKING DECEL</span>
              <span
                className={`font-bold ${
                  output.commandedBrakingDecel < -4
                    ? 'text-rose-600 dark:text-rose-400'
                    : output.commandedBrakingDecel < 0
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'theme-text-muted'
                }`}
              >
                {formatNum(output.commandedBrakingDecel, 1)} <span className="text-[9px] font-normal">m/s²</span>
              </span>
            </div>
          </div>

          {/* Selected & Rejected Corridors */}
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg theme-card border theme-border">
              <span className="font-mono text-[10px] theme-text-muted">SELECTED CORRIDOR:</span>
              <span className="font-mono font-bold text-cyan-600 dark:text-cyan-300 flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-500 inline" />
                <span>{output.selectedPathId}</span>
              </span>
            </div>

            {output.rejectedPaths.length > 0 && (
              <div className="space-y-1">
                <span className="text-[9px] font-mono theme-text-muted block uppercase">REJECTED PATHS:</span>
                {output.rejectedPaths.map(rej => (
                  <div
                    key={rej.pathId}
                    className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-[10px] font-sans text-rose-700 dark:text-rose-300"
                  >
                    <strong className="font-mono mr-1">[{rej.pathId}]</strong>
                    <span>{rej.reason}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reasoning */}
          <div className="p-2.5 rounded-lg theme-card border theme-border space-y-1">
            <span className="text-[9px] font-mono theme-text-muted uppercase block font-semibold">
              CONTROLLER INTERPRETATION:
            </span>
            <p className="text-[11px] font-sans theme-text-secondary leading-snug">
              {output.interpretation}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
