import React from 'react';
import { GlobalRiskState } from '../types/risk';
import { ShieldAlert, Clock, Target, AlertCircle } from 'lucide-react';
import { formatNum } from '../utils/math';

interface RiskGaugePanelProps {
  risk: GlobalRiskState;
}

export const RiskGaugePanel: React.FC<RiskGaugePanelProps> = ({ risk }) => {
  const score = risk.overallRiskScore;

  // Calm, sophisticated automotive risk color mapping
  const levelStyles: Record<string, { badge: string; ring: string; text: string }> = {
    LOW: {
      badge: 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border-emerald-500/40',
      ring: '#059669',
      text: 'text-emerald-600 dark:text-emerald-400',
    },
    MEDIUM: {
      badge: 'text-amber-700 dark:text-amber-300 bg-amber-500/15 border-amber-500/40',
      ring: '#d97706',
      text: 'text-amber-600 dark:text-amber-400',
    },
    HIGH: {
      badge: 'text-orange-700 dark:text-orange-300 bg-orange-500/15 border-orange-500/40',
      ring: '#ea580c',
      text: 'text-orange-600 dark:text-orange-400',
    },
    CRITICAL: {
      badge: 'text-rose-700 dark:text-rose-300 bg-rose-500/20 border-rose-500/50 animate-pulse',
      ring: '#e11d48',
      text: 'text-rose-600 dark:text-rose-400',
    },
  };

  const style = levelStyles[risk.overallRiskLevel] || levelStyles.LOW;

  return (
    <div className="surface-dark rounded-xl p-4 space-y-3.5 shadow-automotive">
      {/* Header */}
      <div className="flex items-center justify-between border-b theme-border pb-2.5">
        <div className="flex items-center space-x-2 theme-text-primary text-xs font-semibold tracking-wider">
          <ShieldAlert className="w-4 h-4 text-amber-500" />
          <span>SITUATIONAL RISK ENGINE</span>
        </div>
        <div className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold border tracking-wider ${style.badge}`}>
          {risk.overallRiskLevel}
        </div>
      </div>

      {/* Main Score Bar & Circular Gauge */}
      <div className="flex items-center space-x-4 theme-card border theme-border rounded-xl p-3.5 shadow-inner">
        {/* SVG Radial Gauge */}
        <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-slate-200 dark:text-slate-800/90"
              strokeWidth="3.5"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              strokeWidth="3.5"
              strokeDasharray={`${score}, 100`}
              strokeLinecap="round"
              stroke={style.ring}
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              className="transition-all duration-300"
            />
          </svg>
          <div className="absolute font-telemetry font-bold text-base theme-text-primary">
            {score}
          </div>
        </div>

        {/* Hazard details */}
        <div className="space-y-1 text-xs flex-1 min-w-0">
          <div className="text-[10px] theme-text-muted uppercase tracking-wider font-semibold">PRIMARY THREAT</div>
          <div className="theme-text-primary font-medium truncate text-xs">
            {risk.primaryHazardDescription}
          </div>
          <div className="text-[10px] theme-text-secondary flex items-center space-x-2 pt-0.5 font-telemetry">
            <span>SAFETY MARGIN: <strong className="text-teal-600 dark:text-teal-300 font-bold">{formatNum(risk.dynamicSafetyMargin, 1)}m</strong></span>
            <span>•</span>
            <span>LANE CONF: <strong className="theme-text-primary">{(risk.laneConfidence * 100).toFixed(0)}%</strong></span>
          </div>
        </div>
      </div>

      {/* TTC and Nearest Object Readouts */}
      <div className="grid grid-cols-2 gap-2.5 text-xs">
        <div className="theme-card border theme-border rounded-lg p-2.5">
          <div className="flex items-center space-x-1.5 theme-text-muted text-[10px]">
            <Clock className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>TIME TO COLLISION</span>
          </div>
          <div className={`text-xl font-extrabold font-telemetry mt-1 ${isFinite(risk.minimumTTC) && risk.minimumTTC < 2.0 ? 'text-rose-600 dark:text-rose-400' : 'theme-text-primary'}`}>
            {isFinite(risk.minimumTTC) ? `${formatNum(risk.minimumTTC, 2)} s` : '∞'}
          </div>
          <div className="text-[9px] theme-text-muted font-sans">
            {isFinite(risk.minimumTTC) ? 'Rate of convergence' : 'Corridor clear'}
          </div>
        </div>

        <div className="theme-card border theme-border rounded-lg p-2.5">
          <div className="flex items-center space-x-1.5 theme-text-muted text-[10px]">
            <Target className="w-3.5 h-3.5 text-amber-500" />
            <span>NEAREST HAZARD</span>
          </div>
          <div className="text-xl font-extrabold font-telemetry theme-text-primary mt-1">
            {formatNum(risk.nearestActorDistance, 1)}
            <span className="text-xs font-normal theme-text-muted ml-1 font-sans">m</span>
          </div>
          <div className="text-[9px] theme-text-secondary truncate font-sans">
            {risk.nearestActorType ? risk.nearestActorType.replace('_', ' ') : 'No close obstacle'}
          </div>
        </div>
      </div>
    </div>
  );
};

