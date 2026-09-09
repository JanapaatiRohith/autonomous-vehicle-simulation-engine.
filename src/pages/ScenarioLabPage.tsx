import React from 'react';
import { SimulationEngine } from '../simulation/engine';
import { ScenarioId } from '../types/scenario';
import { SCENARIO_DEFINITIONS } from '../simulation/scenarios';
import { ActorType } from '../types/obstacle';
import {
  Layers,
  Play,
  CheckCircle2,
  AlertTriangle,
  Compass,
  PlusCircle,
  Car,
  Bike,
  Footprints,
  Dog,
  Truck,
} from 'lucide-react';
import { formatNum } from '../utils/math';

interface ScenarioLabPageProps {
  engine: SimulationEngine;
  onSelectScenario: (id: ScenarioId) => void;
  onInjectHazard: (type: ActorType) => void;
}

/**
 * Miniature realistic environment scene thumbnail for each scenario.
 * Programmatically renders road textures, actors, roadside environment, and obstacles.
 */
const ScenarioThumbnail: React.FC<{ id: ScenarioId }> = ({ id }) => {
  switch (id) {
    case 'UNMARKED_NARROW_ROAD':
      return (
        <svg viewBox="0 0 320 160" className="w-full h-36 rounded-lg overflow-hidden bg-[#1c1917]">
          {/* Earth / Shoulder terrain */}
          <rect width="320" height="160" fill="#292524" />
          {/* Narrow degraded asphalt */}
          <polygon points="60,0 260,0 270,160 50,160" fill="#232730" />
          {/* Road edge wear */}
          <line x1="60" y1="0" x2="50" y2="160" stroke="#3e4657" strokeWidth="2" />
          <line x1="260" y1="0" x2="270" y2="160" stroke="#3e4657" strokeWidth="2" />
          {/* Faded broken centerline */}
          <line x1="160" y1="10" x2="160" y2="40" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeDasharray="6,8" />
          <line x1="160" y1="60" x2="160" y2="100" stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeDasharray="6,8" />
          <line x1="160" y1="120" x2="160" y2="155" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeDasharray="6,8" />
          {/* Potholes with inner depth cavity */}
          <ellipse cx="130" cy="55" rx="9" ry="6" fill="#0b0e14" stroke="#d97706" strokeWidth="1.2" strokeDasharray="2,2" />
          <ellipse cx="130" cy="55" rx="6" ry="4" fill="#000000" />
          <text x="144" y="58" fill="#cbd5e1" fontSize="8" fontFamily="monospace">12cm</text>
          <ellipse cx="205" cy="110" rx="12" ry="7" fill="#0b0e14" stroke="#e11d48" strokeWidth="1.2" strokeDasharray="2,2" />
          <ellipse cx="205" cy="110" rx="8" ry="4" fill="#000000" />
          {/* Parked tempo / delivery van on roadside */}
          <rect x="235" y="45" width="22" height="42" rx="3" fill="#475569" stroke="#334155" strokeWidth="1" />
          <rect x="238" y="50" width="16" height="12" fill="#1e293b" />
          {/* Auto-rickshaw ahead */}
          <g transform="translate(140, 20)">
            <ellipse cx="0" cy="0" rx="7" ry="12" fill="#ca8a04" />
            <polygon points="-7,5 7,5 0,-10" fill="#15803d" />
            <circle cx="0" cy="-6" r="3" fill="#0f172a" />
          </g>
          {/* Pedestrian on edge */}
          <circle cx="75" cy="85" r="3" fill="#fde047" />
          <line x1="75" y1="88" x2="75" y2="98" stroke="#0284c7" strokeWidth="3" />
          {/* Roadside poles / stall */}
          <rect x="20" y="30" width="20" height="14" fill="#78350f" rx="1" />
          <polygon points="16,30 44,30 40,24 20,24" fill="#dc2626" />
        </svg>
      );

    case 'UNSIGNALIZED_JUNCTION':
      return (
        <svg viewBox="0 0 320 160" className="w-full h-36 rounded-lg overflow-hidden bg-[#1c1917]">
          {/* Ground */}
          <rect width="320" height="160" fill="#292524" />
          {/* Vertical road */}
          <rect x="110" y="0" width="100" height="160" fill="#232730" />
          {/* Horizontal intersecting road */}
          <rect x="0" y="40" width="320" height="80" fill="#232730" />
          {/* Intersection box */}
          <rect x="110" y="40" width="100" height="80" fill="#1f232b" stroke="#3e4657" strokeWidth="1" />
          {/* Faded zebra markings */}
          <line x1="115" y1="36" x2="205" y2="36" stroke="rgba(255,255,255,0.25)" strokeWidth="3" strokeDasharray="4,6" />
          <line x1="115" y1="124" x2="205" y2="124" stroke="rgba(255,255,255,0.25)" strokeWidth="3" strokeDasharray="4,6" />
          {/* Cross-traffic Motorcycle entering from left */}
          <g transform="translate(60, 65)">
            <ellipse cx="0" cy="0" rx="12" ry="4" fill="#1e293b" />
            <circle cx="0" cy="0" r="3" fill="#3b82f6" />
            <polygon points="12,0 7,-3 7,3" fill="#f8fafc" />
          </g>
          {/* Cross Auto-rickshaw entering from right */}
          <g transform="translate(260, 95)">
            <ellipse cx="0" cy="0" rx="12" ry="7" fill="#ca8a04" />
            <polygon points="0,0 -10,-4 -10,4" fill="#15803d" />
          </g>
          {/* Pedestrian crossing intersection */}
          <circle cx="125" cy="50" r="3" fill="#fde047" />
          <line x1="125" y1="53" x2="125" y2="60" stroke="#059669" strokeWidth="2.5" />
          {/* Corner buildings / walls */}
          <rect x="15" y="5" width="80" height="28" fill="#475569" rx="2" />
          <rect x="225" y="128" width="80" height="28" fill="#475569" rx="2" />
        </svg>
      );

    case 'HIGHWAY_SLOW_VEHICLE':
      return (
        <svg viewBox="0 0 320 160" className="w-full h-36 rounded-lg overflow-hidden bg-[#18181b]">
          {/* Outer terrain */}
          <rect width="320" height="160" fill="#27272a" />
          {/* Wide 4-lane Highway */}
          <polygon points="20,0 300,0 310,160 10,160" fill="#1e232d" />
          {/* White highway border lines */}
          <line x1="35" y1="0" x2="25" y2="160" stroke="#64748b" strokeWidth="2" />
          <line x1="285" y1="0" x2="295" y2="160" stroke="#64748b" strokeWidth="2" />
          {/* Center divider barrier */}
          <line x1="160" y1="0" x2="160" y2="160" stroke="#0284c7" strokeWidth="3" />
          {/* Broken lane dividers */}
          <line x1="97" y1="0" x2="92" y2="160" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeDasharray="10,14" />
          <line x1="223" y1="0" x2="228" y2="160" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeDasharray="10,14" />
          {/* Slow commercial heavy truck ahead */}
          <g transform="translate(125, 45)">
            <rect x="-10" y="-22" width="20" height="44" rx="2" fill="#7c2d12" stroke="#451a03" strokeWidth="1.5" />
            <rect x="-9" y="-20" width="18" height="12" fill="#ea580c" />
            <text x="-8" y="-9" fill="#fef08a" fontSize="6" fontFamily="monospace" fontWeight="bold">SLOW</text>
          </g>
          {/* High speed passenger car overtaking */}
          <g transform="translate(200, 95)">
            <rect x="-8" y="-16" width="16" height="32" rx="3" fill="#0284c7" />
            <rect x="-6" y="-8" width="12" height="10" fill="#0f172a" />
            <line x1="-5" y1="16" x2="-5" y2="24" stroke="#38bdf8" strokeWidth="1.5" opacity="0.6" />
            <line x1="5" y1="16" x2="5" y2="24" stroke="#38bdf8" strokeWidth="1.5" opacity="0.6" />
          </g>
        </svg>
      );

    case 'DENSE_MARKET':
      return (
        <svg viewBox="0 0 320 160" className="w-full h-36 rounded-lg overflow-hidden bg-[#1c1917]">
          {/* Market ground */}
          <rect width="320" height="160" fill="#292524" />
          {/* Narrow corridor between stalls */}
          <polygon points="90,0 230,0 240,160 80,160" fill="#242833" />
          {/* Market Stalls on Left with colorful awnings */}
          <rect x="10" y="10" width="70" height="30" fill="#b45309" />
          <polygon points="10,40 80,40 75,48 10,48" fill="#dc2626" />
          <rect x="10" y="60" width="65" height="35" fill="#78350f" />
          <polygon points="10,95 75,95 70,103 10,103" fill="#2563eb" />
          <rect x="10" y="115" width="65" height="35" fill="#78350f" />
          <polygon points="10,150 75,150 70,158 10,158" fill="#16a34a" />
          {/* Market Stalls on Right */}
          <rect x="245" y="15" width="65" height="35" fill="#78350f" />
          <polygon points="245,50 310,50 310,58 245,58" fill="#f59e0b" />
          <rect x="245" y="70" width="65" height="35" fill="#78350f" />
          <polygon points="245,105 310,105 310,113 245,113" fill="#dc2626" />
          {/* Swarm of mixed vehicles & pedestrians */}
          {/* Auto */}
          <ellipse cx="140" cy="40" rx="8" ry="14" fill="#ca8a04" />
          {/* Motorcycle */}
          <ellipse cx="185" cy="65" rx="4" ry="11" fill="#3b82f6" />
          {/* Bicycle with rider */}
          <line x1="115" y1="85" x2="115" y2="105" stroke="#94a3b8" strokeWidth="2" />
          <circle cx="115" cy="95" r="3" fill="#fde047" />
          {/* Hand pushcart */}
          <rect x="195" y="110" width="16" height="24" fill="#a16207" stroke="#713f12" strokeWidth="1" />
          <circle cx="192" cy="122" r="3" fill="#475569" />
          <circle cx="214" cy="122" r="3" fill="#475569" />
          {/* Pedestrians everywhere */}
          <circle cx="125" cy="30" r="2.5" fill="#f8fafc" />
          <circle cx="170" cy="100" r="2.5" fill="#f8fafc" />
          <circle cx="150" cy="135" r="2.5" fill="#f8fafc" />
        </svg>
      );

    case 'SUDDEN_CROSSING':
    default:
      return (
        <svg viewBox="0 0 320 160" className="w-full h-36 rounded-lg overflow-hidden bg-[#1c1917]">
          {/* Natural grassy shoulder */}
          <rect width="320" height="160" fill="#1e241c" />
          {/* Clear asphalt corridor */}
          <polygon points="70,0 250,0 255,160 65,160" fill="#222630" />
          {/* Road edge */}
          <line x1="70" y1="0" x2="65" y2="160" stroke="#334155" strokeWidth="1.5" />
          <line x1="250" y1="0" x2="255" y2="160" stroke="#334155" strokeWidth="1.5" />
          {/* Faded centerline */}
          <line x1="160" y1="0" x2="160" y2="160" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeDasharray="8,10" />
          {/* Ego Vehicle cruising forward */}
          <g transform="translate(160, 125)">
            <rect x="-9" y="-18" width="18" height="36" rx="4" fill="#0d9488" stroke="#115e59" strokeWidth="1.5" />
            <rect x="-7" y="-8" width="14" height="12" fill="#0f172a" />
            {/* Forward Headlight Beams */}
            <polygon points="-7,-18 -20,-60 20,-60 7,-18" fill="rgba(254, 240, 138, 0.15)" />
            {/* Planned Trajectory Vector */}
            <line x1="0" y1="-18" x2="0" y2="-65" stroke="#0d9488" strokeWidth="2" strokeDasharray="3,3" />
          </g>
          {/* Sudden Animal (Stray Cattle) Crossing from Right Verge */}
          <g transform="translate(205, 55)">
            {/* Cow Body */}
            <ellipse cx="0" cy="0" rx="14" ry="8" fill="#d97706" />
            {/* Head & Horns */}
            <ellipse cx="-12" cy="-2" rx="6" ry="5" fill="#b45309" />
            <line x1="-14" y1="-7" x2="-18" y2="-11" stroke="#f8fafc" strokeWidth="1.5" />
            <line x1="-10" y1="-7" x2="-6" y2="-11" stroke="#f8fafc" strokeWidth="1.5" />
            {/* Animal Crossing Trajectory Vector */}
            <line x1="-14" y1="0" x2="-55" y2="0" stroke="#e11d48" strokeWidth="2" strokeDasharray="3,3" />
            <polygon points="-55,0 -48,-3 -48,3" fill="#e11d48" />
          </g>
          {/* Predictive Collision Conflict Zone */}
          <ellipse cx="160" cy="55" rx="16" ry="12" fill="rgba(225, 29, 72, 0.2)" stroke="#e11d48" strokeWidth="1.5" strokeDasharray="2,2" />
          <text x="142" y="40" fill="#f43f5e" fontSize="7" fontFamily="monospace" fontWeight="bold">CONFLICT ZONE</text>
        </svg>
      );
  }
};

export const ScenarioLabPage: React.FC<ScenarioLabPageProps> = ({
  engine,
  onSelectScenario,
  onInjectHazard,
}) => {
  const currentId = engine.scenario.id;
  const scenarios = Object.values(SCENARIO_DEFINITIONS);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* 1. TOP HEADER BAR */}
      <div className="theme-card rounded-xl p-5 shadow-automotive border theme-border flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-telemetry font-bold bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/40">
              VALIDATION SUITE
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-telemetry theme-text-muted theme-surface border theme-border">
              5 BENCHMARK SCENARIOS
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight theme-text-primary font-sans flex items-center space-x-2">
            <Layers className="w-5 h-5 text-purple-500 dark:text-purple-400" />
            <span>INDIAN ROAD SCENARIO TESTING LAB</span>
          </h1>
          <p className="text-xs theme-text-secondary max-w-2xl font-sans">
            Standardized evaluation tracks capturing edge erosion, missing lane markings, crossing cattle, and mixed dense traffic.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono theme-text-muted">ACTIVE:</span>
          <span className="px-3 py-1 rounded text-xs font-telemetry font-bold bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/40">
            {engine.scenario.name}
          </span>
        </div>
      </div>

      {/* 2. SCENARIOS GRID WITH MINIATURE REALISTIC PREVIEWS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {scenarios.map(sc => {
          const isSelected = currentId === sc.id;

          return (
            <div
              key={sc.id}
              className={`theme-card rounded-xl overflow-hidden shadow-sm border transition-all space-y-4 p-5 ${
                isSelected
                  ? 'ring-2 ring-teal-500 border-teal-500 shadow-automotive'
                  : 'border theme-border hover:theme-card-hover'
              }`}
            >
              {/* Miniature Realistic Environment Scene */}
              <div className="relative">
                <ScenarioThumbnail id={sc.id} />
                {isSelected && (
                  <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded bg-teal-600 text-white font-mono text-[10px] font-bold shadow-md flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3 inline" />
                    <span>CURRENTLY LOADED</span>
                  </div>
                )}
                {sc.id === 'SUDDEN_CROSSING' && !isSelected && (
                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded bg-amber-600 text-white font-mono text-[10px] font-bold shadow-md">
                    FLAGSHIP HERO
                  </div>
                )}
              </div>

              {/* Title & Difficulty */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-sans font-bold text-base theme-text-primary">{sc.name}</h3>
                  <span className="text-xs theme-text-secondary font-sans block mt-0.5">{sc.tagline}</span>
                </div>

                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                    sc.difficulty === 'EXTREME'
                      ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/40'
                      : sc.difficulty === 'HARD'
                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  {sc.difficulty}
                </span>
              </div>

              <p className="text-xs theme-text-secondary leading-relaxed font-sans">{sc.description}</p>

              {/* Road Specifications */}
              <div className="grid grid-cols-3 gap-2 text-center font-telemetry text-[10px] theme-surface p-2.5 rounded-lg border theme-border">
                <div>
                  <span className="theme-text-muted block uppercase">ROAD WIDTH</span>
                  <span className="theme-text-primary font-bold">{sc.roadWidth} m</span>
                </div>
                <div>
                  <span className="theme-text-muted block uppercase">LANE CONF.</span>
                  <span className="theme-text-primary font-bold">{(sc.laneConfidence * 100).toFixed(0)}%</span>
                </div>
                <div>
                  <span className="theme-text-muted block uppercase">SPEED SETPOINT</span>
                  <span className="text-teal-600 dark:text-teal-400 font-bold">{sc.defaultSpeedKmh} km/h</span>
                </div>
              </div>

              {/* Expected Autonomous Behavior */}
              <div className="theme-surface p-3 rounded-lg border theme-border text-xs">
                <strong className="text-teal-700 dark:text-teal-300 font-mono text-[10px] block uppercase mb-1 font-bold">
                  EXPECTED AUTONOMOUS BEHAVIOR:
                </strong>
                <p className="theme-text-secondary leading-snug">{sc.expectedBehavior}</p>
              </div>

              {/* Load Button */}
              <div className="pt-1 flex items-center justify-between">
                <button
                  onClick={() => onSelectScenario(sc.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all ${
                    isSelected
                      ? 'bg-teal-600 text-white shadow-sm hover:bg-teal-700'
                      : 'theme-surface border theme-border hover:theme-surface-hover theme-text-primary'
                  }`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{isSelected ? 'RELOAD SCENARIO' : 'LOAD SCENARIO'}</span>
                </button>

                <span className="text-[10px] font-mono theme-text-muted">
                  {sc.initialActors.length} HAZARDS • {sc.initialPotholes.length} POTHOLES
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. INTERACTIVE HAZARD STRESS INJECTION TRAY */}
      <div className="theme-card rounded-xl p-5 shadow-sm border theme-border space-y-3">
        <div className="flex items-center justify-between border-b theme-border pb-2">
          <h3 className="text-xs font-mono font-bold theme-text-primary uppercase tracking-wider flex items-center space-x-2">
            <PlusCircle className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>REAL-TIME DYNAMIC HAZARD INJECTION DECK</span>
          </h3>
          <span className="text-[10px] font-mono theme-text-secondary font-medium">
            STRESS TESTING ENGINE
          </span>
        </div>

        <p className="text-xs theme-text-secondary">
          Inject unpredictable obstacles directly into the forward sensor envelope of the simulation to evaluate reactive replanning and safety margin compliance.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
          <button
            onClick={() => onInjectHazard('ANIMAL')}
            className="p-2.5 rounded-lg border theme-border hover:border-rose-400 theme-surface hover:theme-surface-hover theme-text-primary text-xs font-mono font-bold flex items-center justify-center space-x-1.5 transition-colors"
          >
            <Dog className="w-3.5 h-3.5 text-rose-500" />
            <span>CROSSING ANIMAL</span>
          </button>
          <button
            onClick={() => onInjectHazard('AUTO_RICKSHAW')}
            className="p-2.5 rounded-lg border theme-border hover:border-amber-400 theme-surface hover:theme-surface-hover theme-text-primary text-xs font-mono font-bold flex items-center justify-center space-x-1.5 transition-colors"
          >
            <span className="text-xs">🛺</span>
            <span>AUTO-RICKSHAW</span>
          </button>
          <button
            onClick={() => onInjectHazard('MOTORCYCLE')}
            className="p-2.5 rounded-lg border theme-border hover:border-purple-400 theme-surface hover:theme-surface-hover theme-text-primary text-xs font-mono font-bold flex items-center justify-center space-x-1.5 transition-colors"
          >
            <Bike className="w-3.5 h-3.5 text-purple-500" />
            <span>WEAVING MOTO</span>
          </button>
          <button
            onClick={() => onInjectHazard('PEDESTRIAN')}
            className="p-2.5 rounded-lg border theme-border hover:border-sky-400 theme-surface hover:theme-surface-hover theme-text-primary text-xs font-mono font-bold flex items-center justify-center space-x-1.5 transition-colors"
          >
            <Footprints className="w-3.5 h-3.5 text-sky-500" />
            <span>SUDDEN PED</span>
          </button>
          <button
            onClick={() => onInjectHazard('TRUCK')}
            className="p-2.5 rounded-lg border theme-border hover:border-orange-400 theme-surface hover:theme-surface-hover theme-text-primary text-xs font-mono font-bold flex items-center justify-center space-x-1.5 transition-colors"
          >
            <Truck className="w-3.5 h-3.5 text-orange-500" />
            <span>SLOW TRUCK</span>
          </button>
        </div>
      </div>
    </div>
  );
};
