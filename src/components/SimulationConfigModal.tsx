import React, { useState } from 'react';
import {
  SimulationConfig,
  VehicleModelOption,
  VehicleDriveMode,
  TrafficDensityLevel,
  RoadSurfaceCondition,
  LaneMarkingCondition,
  WeatherCondition,
  TimeOfDayOption,
  PotholeSeverityOption,
} from '../types/config';
import {
  X,
  Sliders,
  RotateCcw,
  Play,
  Gauge,
  Maximize2,
  Users,
  AlertTriangle,
  CloudRain,
  Sun,
  Shield,
  Layers,
} from 'lucide-react';

interface SimulationConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SimulationConfig;
  onApply: (newConfig: SimulationConfig, restart: boolean) => void;
}

export const SimulationConfigModal: React.FC<SimulationConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onApply,
}) => {
  const [localConfig, setLocalConfig] = useState<SimulationConfig>({ ...config });

  if (!isOpen) return null;

  const update = <K extends keyof SimulationConfig>(key: K, value: SimulationConfig[K]) => {
    setLocalConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleApply = (restart: boolean) => {
    onApply(localConfig, restart);
    onClose();
  };

  const roadWidths = [6.0, 8.0, 10.0, 12.0, 14.0];
  const speedPresets = [15, 30, 45, 60, 75];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[92vh] surface-dark border theme-border rounded-2xl shadow-2xl flex flex-col overflow-hidden theme-text-primary">
        {/* Header */}
        <div className="px-6 py-4 border-b theme-border theme-card flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-600 dark:text-cyan-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold theme-text-primary tracking-wide flex items-center space-x-2">
                <span>SIMULATION ENVIRONMENT & VEHICLE CONFIGURATOR</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-sky-500/15 border border-sky-500/40 text-sky-700 dark:text-cyan-300 font-mono">
                  LIVE CONTROLS
                </span>
              </h2>
              <p className="text-xs theme-text-muted">
                Directly controls road geometry, candidate trajectory offsets, traffic density, and vehicle kinematics.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg theme-card hover:theme-card-hover theme-text-muted hover:theme-text-primary border theme-border transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {/* SECTION 1: VEHICLE & CONTROL MODE */}
          <div className="theme-card border theme-border rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b theme-border pb-2">
              <span className="font-semibold text-sky-600 dark:text-cyan-300 text-xs tracking-wider uppercase flex items-center space-x-2">
                <Shield className="w-4 h-4 text-sky-600 dark:text-cyan-400" />
                <span>Vehicle Model & Autonomous Driving Mode</span>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Vehicle Type */}
              <div>
                <label className="block text-xs theme-text-muted mb-1.5 font-medium">Ego Vehicle Profile</label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: 'SEDAN', label: 'Autonomous Sedan', sub: '4.4m × 1.8m' },
                      { id: 'COMPACT_EV', label: 'Compact EV', sub: '3.8m × 1.6m' },
                      { id: 'SUV', label: 'Autonomous SUV', sub: '4.7m × 1.9m' },
                      { id: 'AUTO_RICKSHAW', label: 'Auto-Rickshaw', sub: '2.6m × 1.3m' },
                    ] as { id: VehicleModelOption; label: string; sub: string }[]
                  ).map(v => (
                    <button
                      key={v.id}
                      onClick={() => update('vehicleType', v.id)}
                      className={`p-2.5 rounded-lg text-left border text-xs transition-all ${
                        localConfig.vehicleType === v.id
                          ? 'bg-sky-500/20 border-sky-500 text-sky-700 dark:text-cyan-200 shadow-sm font-semibold'
                          : 'theme-card border theme-border theme-text-secondary hover:theme-card-hover'
                      }`}
                    >
                      <div className="font-semibold theme-text-primary">{v.label}</div>
                      <div className="text-[10px] theme-text-muted font-mono">{v.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Vehicle Control Mode */}
              <div>
                <label className="block text-xs theme-text-muted mb-1.5 font-medium">Control Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'AUTONOMOUS', label: 'Full Autonomous', desc: 'ADAPT-INDIA Pipeline' },
                      { id: 'ASSISTED', label: 'ADAS Assisted', desc: 'Auto Emergency Brake' },
                      { id: 'MANUAL', label: 'Manual Drive', desc: 'W/A/S/D Keyboard' },
                    ] as { id: VehicleDriveMode; label: string; desc: string }[]
                  ).map(m => (
                    <button
                      key={m.id}
                      onClick={() => update('vehicleMode', m.id)}
                      className={`p-2.5 rounded-lg text-left border text-xs transition-all ${
                        localConfig.vehicleMode === m.id
                          ? 'bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-200 shadow-sm font-semibold'
                          : 'theme-card border theme-border theme-text-secondary hover:theme-card-hover'
                      }`}
                    >
                      <div className="font-semibold theme-text-primary">{m.label}</div>
                      <div className="text-[10px] theme-text-muted">{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: ROAD WIDTH & GEOMETRY */}
          <div className="theme-card border theme-border rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b theme-border pb-2">
              <span className="font-semibold text-sky-600 dark:text-cyan-300 text-xs tracking-wider uppercase flex items-center space-x-2">
                <Maximize2 className="w-4 h-4 text-sky-600 dark:text-cyan-400" />
                <span>Road Width & Lateral Drivable Geometry</span>
              </span>
              <span className="text-xs font-mono text-sky-700 dark:text-cyan-400 font-bold bg-sky-500/15 px-2 py-0.5 rounded border border-sky-500/40">
                {localConfig.roadWidthM.toFixed(1)} METERS
              </span>
            </div>

            <div>
              <div className="grid grid-cols-5 gap-2 mb-3">
                {roadWidths.map(w => (
                  <button
                    key={w}
                    onClick={() => update('roadWidthM', w)}
                    className={`py-2 px-3 rounded-lg border text-center font-mono text-xs transition-all ${
                      localConfig.roadWidthM === w
                        ? 'bg-sky-500/20 border-sky-500 text-sky-700 dark:text-cyan-200 font-bold shadow-sm'
                        : 'theme-card border theme-border theme-text-secondary hover:theme-card-hover'
                    }`}
                  >
                    <div className="text-sm font-bold theme-text-primary">{w}m</div>
                    <div className="text-[10px] theme-text-muted">
                      {w === 6 ? 'Single Lane' : w === 8 ? 'Narrow 2L' : w === 10 ? 'Standard 2L' : w === 12 ? 'Wide 3L' : 'Expressway 4L'}
                    </div>
                  </button>
                ))}
              </div>
              <div className="text-[11px] theme-text-secondary theme-surface p-2.5 rounded-lg border theme-border flex items-center justify-between">
                <span>
                  Dynamic Spline Offset Scaling: candidate avoidance corridor expands from <strong>±1.6m</strong> (6m road) up to <strong>±3.4m</strong> (14m road).
                </span>
                <span className="theme-text-muted font-mono">Drivable bounds: [{-localConfig.roadWidthM / 2}m to +{localConfig.roadWidthM / 2}m]</span>
              </div>
            </div>
          </div>

          {/* SECTION 3: SPEED & VELOCITY CONTROLS */}
          <div className="theme-card border theme-border rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b theme-border pb-2">
              <span className="font-semibold text-sky-600 dark:text-cyan-300 text-xs tracking-wider uppercase flex items-center space-x-2">
                <Gauge className="w-4 h-4 text-sky-600 dark:text-cyan-400" />
                <span>Vehicle Cruising Speed Target</span>
              </span>
              <span className="text-xs font-mono text-sky-700 dark:text-cyan-400 font-bold bg-sky-500/15 px-2 py-0.5 rounded border border-sky-500/40">
                {localConfig.initialSpeedKmh} KM/H ({(localConfig.initialSpeedKmh / 3.6).toFixed(1)} M/S)
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="0"
                  max="80"
                  step="5"
                  value={localConfig.initialSpeedKmh}
                  onChange={e => update('initialSpeedKmh', Number(e.target.value))}
                  className="flex-1 accent-sky-500 cursor-pointer h-2 bg-slate-200 dark:bg-slate-800 rounded-lg"
                />
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs theme-text-muted">Presets:</span>
                {speedPresets.map(sp => (
                  <button
                    key={sp}
                    onClick={() => update('initialSpeedKmh', sp)}
                    className={`px-2.5 py-1 rounded text-xs font-mono border transition-all ${
                      localConfig.initialSpeedKmh === sp
                        ? 'bg-sky-500/20 border-sky-500 text-sky-700 dark:text-cyan-300 font-bold'
                        : 'theme-card border theme-border theme-text-secondary hover:theme-card-hover'
                    }`}
                  >
                    {sp} km/h
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 4: TRAFFIC DENSITY & ACTOR COUNTS */}
          <div className="theme-card border theme-border rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b theme-border pb-2">
              <span className="font-semibold text-sky-600 dark:text-cyan-300 text-xs tracking-wider uppercase flex items-center space-x-2">
                <Users className="w-4 h-4 text-sky-600 dark:text-cyan-400" />
                <span>Unstructured Traffic Density & Actor Distribution</span>
              </span>
            </div>

            {/* Density Presets */}
            <div className="grid grid-cols-4 gap-2 mb-2">
              {(
                [
                  { id: 'LOW', label: 'Low', desc: 'Light village traffic' },
                  { id: 'MEDIUM', label: 'Medium', desc: 'Typical suburban' },
                  { id: 'HIGH', label: 'High', desc: 'Dense city bazaar' },
                  { id: 'EXTREME', label: 'Extreme', desc: 'Hyper-unstructured peak' },
                ] as { id: TrafficDensityLevel; label: string; desc: string }[]
              ).map(d => (
                <button
                  key={d.id}
                  onClick={() => {
                    update('trafficDensity', d.id);
                    if (d.id === 'LOW') {
                      update('numberOfVehicles', 1);
                      update('numberOfMotorcycles', 1);
                      update('numberOfAutos', 1);
                      update('numberOfPedestrians', 1);
                      update('numberOfAnimals', 1);
                    } else if (d.id === 'MEDIUM') {
                      update('numberOfVehicles', 2);
                      update('numberOfMotorcycles', 3);
                      update('numberOfAutos', 2);
                      update('numberOfPedestrians', 2);
                      update('numberOfAnimals', 1);
                    } else if (d.id === 'HIGH') {
                      update('numberOfVehicles', 4);
                      update('numberOfMotorcycles', 5);
                      update('numberOfAutos', 3);
                      update('numberOfPedestrians', 4);
                      update('numberOfAnimals', 2);
                    } else {
                      update('numberOfVehicles', 6);
                      update('numberOfMotorcycles', 8);
                      update('numberOfAutos', 5);
                      update('numberOfPedestrians', 6);
                      update('numberOfAnimals', 3);
                    }
                  }}
                  className={`p-2 rounded-lg border text-center text-xs transition-all ${
                    localConfig.trafficDensity === d.id
                      ? 'bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300 font-bold shadow-sm'
                      : 'theme-card border theme-border theme-text-secondary hover:theme-card-hover'
                  }`}
                >
                  <div className="font-bold theme-text-primary">{d.label}</div>
                  <div className="text-[10px] theme-text-muted">{d.desc}</div>
                </button>
              ))}
            </div>

            {/* Fine-Grained Sliders */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-2">
              {[
                { label: 'Cars / Trucks', key: 'numberOfVehicles', max: 8 },
                { label: 'Motorcycles', key: 'numberOfMotorcycles', max: 10 },
                { label: 'Auto-Rickshaws', key: 'numberOfAutos', max: 6 },
                { label: 'Pedestrians', key: 'numberOfPedestrians', max: 8 },
                { label: 'Cattle / Animals', key: 'numberOfAnimals', max: 4 },
              ].map(item => {
                const val = localConfig[item.key as keyof SimulationConfig] as number;
                return (
                  <div key={item.key} className="theme-surface p-2.5 rounded-lg border theme-border">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="theme-text-muted">{item.label}</span>
                      <span className="font-mono text-sky-600 dark:text-cyan-300 font-bold">{val}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={item.max}
                      value={val}
                      onChange={e => update(item.key as keyof SimulationConfig, Number(e.target.value))}
                      className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 5: POTHOLES & ROAD SURFACE DEFECTS */}
          <div className="theme-card border theme-border rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b theme-border pb-2">
              <span className="font-semibold text-rose-600 dark:text-rose-400 text-xs tracking-wider uppercase flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>Potholes & Surface Hazards</span>
              </span>
              <span className="text-xs font-mono text-rose-600 dark:text-rose-400 font-bold bg-rose-500/15 px-2 py-0.5 rounded border border-rose-500/40">
                {localConfig.potholeCount < 0 ? 'SCENARIO DEFAULT' : `${localConfig.potholeCount} POTHOLES`}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs theme-text-muted mb-1.5 font-medium">Pothole Density</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="range"
                    min="-1"
                    max="6"
                    value={localConfig.potholeCount}
                    onChange={e => update('potholeCount', Number(e.target.value))}
                    className="flex-1 accent-rose-500 cursor-pointer h-2 bg-slate-200 dark:bg-slate-800 rounded-lg"
                  />
                  <span className="font-mono text-xs w-28 text-right theme-text-secondary">
                    {localConfig.potholeCount < 0 ? 'Default' : `${localConfig.potholeCount} active`}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs theme-text-muted mb-1.5 font-medium">Pothole Severity</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['LOW', 'MEDIUM', 'HIGH'] as PotholeSeverityOption[]).map(sev => (
                    <button
                      key={sev}
                      onClick={() => update('potholeSeverity', sev)}
                      className={`p-2 rounded-lg border text-xs font-semibold uppercase font-mono transition-all ${
                        localConfig.potholeSeverity === sev
                          ? 'bg-rose-500/20 border-rose-500 text-rose-700 dark:text-rose-300'
                          : 'theme-card border theme-border theme-text-secondary hover:theme-card-hover'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 6: ROAD CONDITIONS & WEATHER */}
          <div className="theme-card border theme-border rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b theme-border pb-2">
              <span className="font-semibold text-sky-600 dark:text-cyan-300 text-xs tracking-wider uppercase flex items-center space-x-2">
                <CloudRain className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span>Road Friction & Weather Environment</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Road Surface */}
              <div>
                <label className="block text-xs theme-text-muted mb-1.5 font-medium">Road Surface Condition</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { id: 'GOOD', label: 'Good (μ=0.9)' },
                      { id: 'WORN', label: 'Worn (μ=0.7)' },
                      { id: 'POOR', label: 'Poor (μ=0.5)' },
                      { id: 'UNSTRUCTURED', label: 'Muddy (μ=0.35)' },
                    ] as { id: RoadSurfaceCondition; label: string }[]
                  ).map(c => (
                    <button
                      key={c.id}
                      onClick={() => update('roadCondition', c.id)}
                      className={`p-2 rounded border text-xs text-center transition-all ${
                        localConfig.roadCondition === c.id
                          ? 'bg-sky-500/20 border-sky-500 text-sky-700 dark:text-sky-200 font-semibold'
                          : 'theme-card border theme-border theme-text-secondary hover:theme-card-hover'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lane Markings */}
              <div>
                <label className="block text-xs theme-text-muted mb-1.5 font-medium">Lane Markings</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['CLEAR', 'FADED', 'MISSING'] as LaneMarkingCondition[]).map(l => (
                    <button
                      key={l}
                      onClick={() => update('laneMarkingCondition', l)}
                      className={`p-2 rounded border text-xs text-center transition-all ${
                        localConfig.laneMarkingCondition === l
                          ? 'bg-sky-500/20 border-sky-500 text-sky-700 dark:text-cyan-200 font-semibold'
                          : 'theme-card border theme-border theme-text-secondary hover:theme-card-hover'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Weather & Time */}
              <div>
                <label className="block text-xs theme-text-muted mb-1.5 font-medium">Atmosphere & Sky</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { id: 'DAY', label: 'Daylight' },
                      { id: 'SUNSET', label: 'Dusk' },
                      { id: 'EVENING', label: 'Night' },
                    ] as { id: TimeOfDayOption; label: string }[]
                  ).map(t => (
                    <button
                      key={t.id}
                      onClick={() => update('timeOfDay', t.id)}
                      className={`p-2 rounded border text-xs text-center transition-all ${
                        localConfig.timeOfDay === t.id
                          ? 'bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-200 font-semibold'
                          : 'theme-card border theme-border theme-text-secondary hover:theme-card-hover'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t theme-border theme-card flex items-center justify-between">
          <button
            onClick={() => {
              setLocalConfig({
                ...config,
                roadWidthM: 10.0,
                initialSpeedKmh: 45,
                vehicleType: 'SEDAN',
                vehicleMode: 'AUTONOMOUS',
                trafficDensity: 'MEDIUM',
                potholeCount: -1,
                roadCondition: 'WORN',
                laneMarkingCondition: 'CLEAR',
                timeOfDay: 'DAY',
              });
            }}
            className="flex items-center space-x-1.5 text-xs theme-text-muted hover:theme-text-primary transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => handleApply(false)}
              className="px-4 py-2 rounded-xl theme-card hover:theme-card-hover theme-text-primary text-xs font-semibold border theme-border transition-all flex items-center space-x-1.5"
            >
              <span>APPLY REAL-TIME</span>
            </button>

            <button
              onClick={() => handleApply(true)}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 text-white dark:text-slate-950 font-bold text-xs shadow-lg transition-all flex items-center space-x-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>APPLY & RESTART SIMULATION</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
