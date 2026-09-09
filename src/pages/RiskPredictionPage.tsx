import React from 'react';
import { SimulationEngine } from '../simulation/engine';
import { useTheme } from '../context/ThemeContext';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine,
} from 'recharts';
import { TrendingUp, Clock, ShieldAlert, ShieldCheck, Ruler, Activity, Cpu } from 'lucide-react';
import { formatNum } from '../utils/math';

interface RiskPredictionPageProps {
  engine: SimulationEngine;
}

export const RiskPredictionPage: React.FC<RiskPredictionPageProps> = ({ engine }) => {
  const { chartColors, isDark } = useTheme();
  const timeSeries = engine.metrics.timeSeries;
  const risk = engine.riskState;
  const metrics = engine.metrics;

  const getRiskBadgeColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40';
      case 'HIGH':
        return 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/40';
      case 'MEDIUM':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40';
      default:
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* 1. TOP HEADER BAR */}
      <div className="surface-dark rounded-xl p-5 shadow-automotive border theme-border flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-telemetry font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
              SAFETY METRICS
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-telemetry theme-text-secondary theme-card border theme-border">
              NON-LINEAR UNCERTAINTY PROPAGATION
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight theme-text-primary font-sans flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-amber-500" />
            <span>RISK QUANTIFICATION & MOTION PREDICTION</span>
          </h1>
          <p className="text-xs theme-text-muted max-w-2xl font-sans">
            Continuous kinematic propagation, time-to-collision convergence curves, and predictive collision risk.
          </p>
        </div>

        <div className="flex items-center space-x-2 font-telemetry">
          <span className="text-xs theme-text-muted">STATUS:</span>
          <span className={`px-2.5 py-1 rounded text-xs font-bold border ${
            risk.overallRiskLevel === 'CRITICAL'
              ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/50'
              : risk.overallRiskLevel === 'HIGH'
              ? 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/50'
              : risk.overallRiskLevel === 'MEDIUM'
              ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/50'
              : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/50'
          }`}>
            {risk.overallRiskLevel} RISK
          </span>
        </div>
      </div>

      {/* 2. THREE LARGE METRIC CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Metric 1: RISK */}
        <div className="surface-light rounded-xl p-5 shadow-sm space-y-2 border theme-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold theme-text-primary uppercase tracking-wider flex items-center space-x-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <span>OVERALL RISK</span>
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getRiskBadgeColor(risk.overallRiskLevel)}`}>
              {risk.overallRiskLevel}
            </span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-4xl font-extrabold font-telemetry theme-text-primary">
              {risk.overallRiskScore}
            </span>
            <span className="text-xs font-mono theme-text-muted">/ 100</span>
          </div>
          <div className="text-[11px] font-sans theme-text-secondary truncate">
            {risk.primaryHazardDescription || 'Corridor nominal; no active threats.'}
          </div>
        </div>

        {/* Metric 2: TTC */}
        <div className="surface-light rounded-xl p-5 shadow-sm space-y-2 border theme-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold theme-text-primary uppercase tracking-wider flex items-center space-x-1.5">
              <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>TIME TO COLLISION</span>
            </span>
            <span className="text-[10px] font-mono font-semibold theme-text-muted">
              CRITICAL &lt; 1.5s
            </span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-4xl font-extrabold font-telemetry theme-text-primary">
              {isFinite(risk.minimumTTC) ? formatNum(risk.minimumTTC, 2) : '∞'}
            </span>
            <span className="text-xs font-mono theme-text-muted">sec</span>
          </div>
          <div className="text-[11px] font-sans theme-text-secondary">
            {isFinite(risk.minimumTTC) && risk.minimumTTC < 3.0
              ? `Rapid convergence detected (${formatNum(risk.minimumTTC, 1)}s window)`
              : 'Safe time headway maintained'}
          </div>
        </div>

        {/* Metric 3: MIN CLEARANCE */}
        <div className="surface-light rounded-xl p-5 shadow-sm space-y-2 border theme-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold theme-text-primary uppercase tracking-wider flex items-center space-x-1.5">
              <Ruler className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>MIN CLEARANCE</span>
            </span>
            <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border border-emerald-500/40 px-1.5 py-0.5 rounded font-bold">
              MARGIN: {formatNum(risk.dynamicSafetyMargin, 1)}m
            </span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-4xl font-extrabold font-telemetry theme-text-primary">
              {formatNum(metrics.minimumDistance, 2)}
            </span>
            <span className="text-xs font-mono theme-text-muted">m</span>
          </div>
          <div className="text-[11px] font-sans theme-text-secondary">
            Closest obstacle distance along path
          </div>
        </div>
      </div>

      {/* Real-time Explainability Card */}
      <div className="surface-light rounded-xl p-4 shadow-sm border-l-4 border-l-amber-500 border theme-border space-y-1">
        <div className="text-xs font-mono font-bold theme-text-primary uppercase tracking-wider flex items-center space-x-1.5">
          <ShieldCheck className="w-4 h-4 text-amber-500" />
          <span>NATURAL LANGUAGE EXPLAINABILITY ENGINE</span>
        </div>
        <p className="text-xs font-sans theme-text-primary leading-relaxed font-medium">
          {risk.explanation}
        </p>
      </div>

      {/* 3. TIME-SERIES CHARTS (2x2 GRID, RESTRAINED ACCENT COLORS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Chart 1: Risk over Time */}
        <div className="surface-light rounded-xl p-5 shadow-sm space-y-3 border theme-border">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold theme-text-primary flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>RISK SCORE EVOLUTION (0 - 100)</span>
            </span>
            <span className="text-[10px] font-telemetry theme-text-secondary">
              NOW: <strong>{risk.overallRiskScore}</strong>
            </span>
          </div>

          <div className="h-48 w-full">
            {timeSeries.length < 2 ? (
              <div className="h-full flex items-center justify-center theme-text-muted font-mono text-xs">
                Awaiting simulation telemetry data...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeSeries}>
                  <defs>
                    <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d97706" stopOpacity={isDark ? 0.35 : 0.2} />
                      <stop offset="95%" stopColor="#d97706" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis dataKey="time" stroke={chartColors.axis} tick={{ fontSize: 10, fill: chartColors.axis }} unit="s" />
                  <YAxis domain={[0, 100]} stroke={chartColors.axis} tick={{ fontSize: 10, fill: chartColors.axis }} />
                  <Tooltip contentStyle={{ backgroundColor: chartColors.tooltipBg, borderColor: chartColors.tooltipBorder, color: chartColors.tooltipText, fontSize: 11, borderRadius: 8 }} />
                  <ReferenceLine y={60} stroke="#f97316" strokeDasharray="3 3" label={{ value: 'HIGH', fill: '#f97316', fontSize: 9 }} />
                  <Area type="monotone" dataKey="risk" stroke="#d97706" strokeWidth={2} fill="url(#riskGrad)" name="Risk Score" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: TTC over Time */}
        <div className="surface-light rounded-xl p-5 shadow-sm space-y-3 border theme-border">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold theme-text-primary flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
              <span>TIME TO COLLISION (s)</span>
            </span>
            <span className="text-[10px] font-telemetry text-teal-600 dark:text-teal-400 font-bold">
              {isFinite(risk.minimumTTC) ? `${formatNum(risk.minimumTTC, 2)} s` : '∞'}
            </span>
          </div>

          <div className="h-48 w-full">
            {timeSeries.length < 2 ? (
              <div className="h-full flex items-center justify-center theme-text-muted font-mono text-xs">
                Awaiting simulation telemetry data...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis dataKey="time" stroke={chartColors.axis} tick={{ fontSize: 10, fill: chartColors.axis }} unit="s" />
                  <YAxis domain={[0, 8]} stroke={chartColors.axis} tick={{ fontSize: 10, fill: chartColors.axis }} unit="s" />
                  <Tooltip contentStyle={{ backgroundColor: chartColors.tooltipBg, borderColor: chartColors.tooltipBorder, color: chartColors.tooltipText, fontSize: 11, borderRadius: 8 }} />
                  <ReferenceLine y={1.5} stroke="#e11d48" strokeDasharray="3 3" label={{ value: 'CRITICAL (1.5s)', fill: '#e11d48', fontSize: 9 }} />
                  <Line type="monotone" dataKey="ttc" stroke="#0d9488" strokeWidth={2} dot={false} name="TTC (s)" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 3: Speed over Time */}
        <div className="surface-light rounded-xl p-5 shadow-sm space-y-3 border theme-border">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold theme-text-primary flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>VEHICLE SPEED (km/h)</span>
            </span>
            <span className="text-[10px] font-telemetry text-emerald-600 dark:text-emerald-400 font-bold">
              {formatNum(engine.ego.speed * 3.6, 1)} km/h
            </span>
          </div>

          <div className="h-48 w-full">
            {timeSeries.length < 2 ? (
              <div className="h-full flex items-center justify-center theme-text-muted font-mono text-xs">
                Awaiting simulation telemetry data...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis dataKey="time" stroke={chartColors.axis} tick={{ fontSize: 10, fill: chartColors.axis }} unit="s" />
                  <YAxis stroke={chartColors.axis} tick={{ fontSize: 10, fill: chartColors.axis }} />
                  <Tooltip contentStyle={{ backgroundColor: chartColors.tooltipBg, borderColor: chartColors.tooltipBorder, color: chartColors.tooltipText, fontSize: 11, borderRadius: 8 }} />
                  <Line type="monotone" dataKey="speed" stroke="#059669" strokeWidth={2} dot={false} name="Current (km/h)" />
                  <Line type="monotone" dataKey="targetSpeed" stroke={chartColors.axis} strokeDasharray="4 4" strokeWidth={1.5} dot={false} name="Target (km/h)" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 4: Distance over Time */}
        <div className="surface-light rounded-xl p-5 shadow-sm space-y-3 border theme-border">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold theme-text-primary flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
              <span>OBSTACLE PROXIMITY DISTANCE (m)</span>
            </span>
            <span className="text-[10px] font-telemetry text-sky-600 dark:text-sky-400 font-bold">
              MIN: {formatNum(metrics.minimumDistance, 2)} m
            </span>
          </div>

          <div className="h-48 w-full">
            {timeSeries.length < 2 ? (
              <div className="h-full flex items-center justify-center theme-text-muted font-mono text-xs">
                Awaiting simulation telemetry data...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis dataKey="time" stroke={chartColors.axis} tick={{ fontSize: 10, fill: chartColors.axis }} unit="s" />
                  <YAxis stroke={chartColors.axis} tick={{ fontSize: 10, fill: chartColors.axis }} unit="m" />
                  <Tooltip contentStyle={{ backgroundColor: chartColors.tooltipBg, borderColor: chartColors.tooltipBorder, color: chartColors.tooltipText, fontSize: 11, borderRadius: 8 }} />
                  <ReferenceLine y={risk.dynamicSafetyMargin} stroke="#d97706" strokeDasharray="3 3" label={{ value: 'Safety Margin', fill: '#d97706', fontSize: 9 }} />
                  <Line type="monotone" dataKey="minDistance" stroke="#0284c7" strokeWidth={2} dot={false} name="Distance (m)" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
