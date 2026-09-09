import React from 'react';
import { PlannerOutput, CandidatePathId } from '../types/trajectory';
import { GitBranch, CheckCircle2, AlertOctagon, AlertTriangle } from 'lucide-react';
import { formatNum } from '../utils/math';

interface PlannerPanelProps {
  planner: PlannerOutput;
}

export const PlannerPanel: React.FC<PlannerPanelProps> = ({ planner }) => {
  const candidateIds: CandidatePathId[] = ['LEFT', 'CENTER', 'RIGHT'];

  const decisionStyles: Record<string, string> = {
    CRUISE: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40',
    SLOW_DOWN: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40',
    FOLLOW: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/40',
    AVOID_LEFT: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/40 font-bold',
    AVOID_RIGHT: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/40 font-bold',
    BRAKE: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40',
    EMERGENCY_BRAKE: 'bg-rose-500/25 text-rose-700 dark:text-rose-300 border-rose-500/60 animate-pulse font-bold',
  };

  return (
    <div className="surface-dark rounded-xl p-4 space-y-3.5 shadow-automotive">
      <div className="flex items-center justify-between border-b theme-border pb-2.5">
        <div className="flex items-center space-x-2 theme-text-primary text-xs font-semibold tracking-wider">
          <GitBranch className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <span>ADAPTIVE PATH PLANNER</span>
        </div>
        <div
          className={`px-2.5 py-0.5 rounded text-[10px] font-mono border tracking-wider ${
            decisionStyles[planner.decision] || 'theme-card theme-text-secondary theme-border'
          }`}
        >
          {planner.decision.replace('_', ' ')}
        </div>
      </div>

      {/* Candidate Trajectories Cards */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        {candidateIds.map(id => {
          const cand = planner.candidates?.[id];
          if (!cand) return null;
          const isSelected = planner.selectedPathId === id;

          let statusBadge = (
            <span className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 text-[10px] font-medium">
              <CheckCircle2 className="w-3 h-3" />
              <span>SAFE</span>
            </span>
          );
          if (cand.status === 'BLOCKED') {
            statusBadge = (
              <span className="flex items-center space-x-1 text-rose-600 dark:text-rose-400 text-[10px] font-medium">
                <AlertOctagon className="w-3 h-3" />
                <span>BLOCKED</span>
              </span>
            );
          } else if (cand.status === 'HIGH_RISK') {
            statusBadge = (
              <span className="flex items-center space-x-1 text-amber-600 dark:text-amber-400 text-[10px] font-medium">
                <AlertTriangle className="w-3 h-3" />
                <span>HIGH RISK</span>
              </span>
            );
          }

          return (
            <div
              key={id}
              className={`p-2.5 rounded-lg border transition-all ${
                isSelected
                  ? 'theme-card border-teal-500 shadow-sm ring-1 ring-teal-500/40'
                  : 'theme-card border theme-border'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-[11px] theme-text-primary font-sans">{id}</span>
                {isSelected && (
                  <span className="px-1.5 py-0.2 rounded bg-teal-500 text-white dark:text-slate-950 text-[9px] font-bold font-telemetry">
                    ACTIVE
                  </span>
                )}
              </div>

              <div className="mt-1.5">{statusBadge}</div>

              <div className="mt-2 space-y-0.5 text-[10px] theme-text-muted font-telemetry">
                <div className="flex justify-between">
                  <span>CLEAR:</span>
                  <strong className="theme-text-primary">{formatNum(cand.minimumClearance, 1)}m</strong>
                </div>
                <div className="flex justify-between">
                  <span>COST:</span>
                  <strong className={cand.status === 'BLOCKED' ? 'text-rose-600 dark:text-rose-400' : 'theme-text-primary'}>
                    {cand.status === 'BLOCKED' ? '∞' : formatNum(cand.cost, 1)}
                  </strong>
                </div>
              </div>

              {cand.blockingReason && (
                <div className="text-[9px] text-rose-600 dark:text-rose-300 mt-1.5 leading-tight truncate font-sans" title={cand.blockingReason}>
                  {cand.blockingReason}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Dynamic Explainability Log */}
      <div className="theme-card border theme-border rounded-lg p-3 text-xs space-y-1">
        <div className="text-[10px] theme-text-muted font-semibold uppercase tracking-wider">DECISION REASONING:</div>
        <p className="text-teal-700 dark:text-teal-300 leading-relaxed text-[11px] font-sans">
          {planner.reasoning}
        </p>
      </div>
    </div>
  );
};

