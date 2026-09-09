import React from 'react';
import { EgoVehicleState } from '../types/vehicle';
import { Gauge, Compass, Zap, ArrowLeftRight } from 'lucide-react';
import { formatNum } from '../utils/math';

interface TelemetryPanelProps {
  ego: EgoVehicleState;
}

export const TelemetryPanel: React.FC<TelemetryPanelProps> = ({ ego }) => {
  const speedKmh = ego.speed * 3.6;
  const targetSpeedKmh = ego.targetSpeed * 3.6;
  const steerDeg = (ego.steeringAngle * 180) / Math.PI;
  const headingDeg = (ego.heading * 180) / Math.PI;

  const stateColors: Record<string, string> = {
    CRUISE: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40',
    FOLLOW: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/40',
    CAUTIOUS: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40',
    AVOID: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/40',
    BRAKE: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40',
    EMERGENCY_STOP: 'bg-rose-500/25 text-rose-700 dark:text-rose-300 border-rose-500/60 animate-pulse',
    RECOVER: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/40',
  };

  // Speedometer Needle Calculation (0 to 80 km/h mapped to -135deg to +135deg)
  const maxDialSpeed = 80;
  const clampedSpeed = Math.min(maxDialSpeed, Math.max(0, speedKmh));
  const needleAngle = -135 + (clampedSpeed / maxDialSpeed) * 270;

  // Target Speed Marker Angle
  const clampedTarget = Math.min(maxDialSpeed, Math.max(0, targetSpeedKmh));
  const targetAngle = -135 + (clampedTarget / maxDialSpeed) * 270;

  // Steer bar percentage (-35deg to +35deg mapped to 0% to 100%)
  const clampedSteer = Math.max(-35, Math.min(35, steerDeg));
  const steerPercent = ((clampedSteer + 35) / 70) * 100;

  return (
    <div className="surface-dark rounded-xl p-4 space-y-4 shadow-automotive">
      {/* Header */}
      <div className="flex items-center justify-between border-b theme-border pb-2.5">
        <div className="flex items-center space-x-2 theme-text-primary text-xs font-semibold tracking-wider">
          <Gauge className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          <span>VEHICLE TELEMETRY</span>
        </div>
        <div
          className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold border tracking-wider ${
            stateColors[ego.state] || 'theme-card theme-text-secondary theme-border'
          }`}
        >
          {ego.state}
        </div>
      </div>

      {/* Automotive Instrument Cluster Speedometer */}
      <div className="theme-card border theme-border rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
        {/* SVG Dial Gauge with Tick Marks & Needle */}
        <div className="relative w-48 h-32 flex items-center justify-center">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 200 120">
            {/* Background Dial Arc */}
            <path
              d="M 25 110 A 80 80 0 1 1 175 110"
              fill="none"
              stroke="currentColor"
              className="text-slate-300 dark:text-slate-800"
              strokeWidth="6"
              strokeLinecap="round"
            />
            {/* Target Speed Arc Guide */}
            <path
              d="M 25 110 A 80 80 0 1 1 175 110"
              fill="none"
              stroke="#0284c7"
              strokeWidth="2"
              strokeDasharray="2 6"
              opacity="0.6"
            />

            {/* Tick labels: 0, 20, 40, 60, 80 */}
            <text x="32" y="115" className="fill-slate-400 dark:fill-slate-500 text-[9px]" textAnchor="middle" fontFamily="monospace">0</text>
            <text x="45" y="55" className="fill-slate-400 dark:fill-slate-500 text-[9px]" textAnchor="middle" fontFamily="monospace">20</text>
            <text x="100" y="24" className="fill-slate-400 dark:fill-slate-500 text-[9px]" textAnchor="middle" fontFamily="monospace">40</text>
            <text x="155" y="55" className="fill-slate-400 dark:fill-slate-500 text-[9px]" textAnchor="middle" fontFamily="monospace">60</text>
            <text x="168" y="115" className="fill-slate-400 dark:fill-slate-500 text-[9px]" textAnchor="middle" fontFamily="monospace">80</text>

            {/* Target Speed Marker on Dial Edge */}
            <g transform={`rotate(${targetAngle} 100 100)`}>
              <polygon points="100,20 97,25 103,25" fill="#0284c7" />
            </g>

            {/* Needle Pivot & Needle Line */}
            <g transform={`rotate(${needleAngle} 100 100)`} className="needle-transition">
              <line x1="100" y1="100" x2="100" y2="28" stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="100" cy="100" r="5" fill="#0284c7" />
            </g>
          </svg>
        </div>

        {/* Digital Speedometer Center Readout */}
        <div className="text-center mt-[-10px]">
          <div className="text-3xl font-extrabold font-telemetry tracking-tight theme-text-primary">
            {formatNum(speedKmh, 1)}
            <span className="text-xs font-normal theme-text-muted ml-1.5 font-sans">km/h</span>
          </div>
          <div className="text-[11px] theme-text-secondary flex items-center justify-center space-x-2 mt-0.5">
            <span>TARGET: <strong className="text-sky-600 dark:text-sky-400 font-telemetry">{formatNum(targetSpeedKmh, 1)}</strong></span>
            <span>•</span>
            <span>Δ: <strong className={`font-telemetry ${speedKmh - targetSpeedKmh > 2 ? 'text-amber-600 dark:text-amber-400' : 'theme-text-secondary'}`}>{(speedKmh - targetSpeedKmh).toFixed(1)}</strong></span>
          </div>
        </div>
      </div>

      {/* Steering Bar Indicator */}
      <div className="theme-card border theme-border rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="theme-text-secondary flex items-center space-x-1 text-[11px]">
            <ArrowLeftRight className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>STEERING ANGLE</span>
          </span>
          <span className="font-telemetry font-bold text-teal-600 dark:text-teal-300">{formatNum(steerDeg, 1)}°</span>
        </div>

        {/* Automotive Horizontal Steer Track */}
        <div className="relative w-full h-3 bg-slate-200 dark:bg-slate-900 rounded-full border theme-border flex items-center px-1">
          {/* Center Zero Marker */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-400 dark:bg-slate-700 transform -translate-x-1/2" />
          {/* Moving Indicator Dot */}
          <div
            className="w-3.5 h-3.5 rounded-full bg-teal-500 border border-teal-300 shadow-sm transition-all duration-75"
            style={{ marginLeft: `calc(${steerPercent}% - 7px)` }}
          />
        </div>
        <div className="flex justify-between text-[9px] theme-text-muted font-telemetry">
          <span>LEFT -35°</span>
          <span>CENTER 0°</span>
          <span>RIGHT +35°</span>
        </div>
      </div>

      {/* Acceleration & Inertial Telemetry */}
      <div className="grid grid-cols-2 gap-2.5 text-xs">
        <div className="theme-card border theme-border rounded-lg p-2.5 space-y-1">
          <div className="flex items-center justify-between theme-text-secondary text-[11px]">
            <span className="flex items-center space-x-1">
              <Zap className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              <span>ACCEL</span>
            </span>
            <span className={`font-telemetry font-bold ${ego.acceleration >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {formatNum(ego.acceleration, 2)} m/s²
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-900 h-1.5 rounded-full overflow-hidden flex border theme-border">
            <div
              className="bg-rose-500 h-full transition-all duration-100"
              style={{
                width: ego.acceleration < 0 ? `${Math.min(50, Math.abs(ego.acceleration / 8) * 50)}%` : '0%',
                marginLeft: 'auto',
              }}
            />
            <div
              className="bg-emerald-500 h-full transition-all duration-100"
              style={{
                width: ego.acceleration > 0 ? `${Math.min(50, (ego.acceleration / 3.5) * 50)}%` : '0%',
              }}
            />
          </div>
        </div>

        <div className="theme-card border theme-border rounded-lg p-2.5 space-y-1">
          <div className="flex items-center justify-between theme-text-secondary text-[11px]">
            <span className="flex items-center space-x-1">
              <Compass className="w-3 h-3 text-sky-600 dark:text-sky-400" />
              <span>HEADING</span>
            </span>
            <span className="font-telemetry font-bold theme-text-primary">{formatNum(headingDeg, 1)}°</span>
          </div>
          <div className="text-[10px] theme-text-muted font-telemetry">
            Y-aligned standard
          </div>
        </div>
      </div>

      {/* World Coordinates */}
      <div className="theme-card border theme-border rounded-lg p-2.5 text-[11px] font-telemetry grid grid-cols-2 gap-2 text-center theme-text-secondary">
        <div>
          <span className="theme-text-muted block text-[9px] font-sans">LATERAL POSE (X)</span>
          <span>{formatNum(ego.x, 2)} m</span>
        </div>
        <div>
          <span className="theme-text-muted block text-[9px] font-sans">LONGITUDINAL (Y)</span>
          <span>{formatNum(ego.y, 1)} m</span>
        </div>
      </div>
    </div>
  );
};

