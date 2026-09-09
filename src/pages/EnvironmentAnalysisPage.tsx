import React from 'react';
import { SimulationEngine } from '../simulation/engine';
import { getDrivableBounds } from '../simulation/road';
import {
  Radar,
  Table,
  Layers,
  AlertTriangle,
  Compass,
  CheckCircle2,
  Car,
  Bike,
  Footprints,
  Dog,
  Truck,
} from 'lucide-react';
import { formatNum } from '../utils/math';
import { ActorType } from '../types/obstacle';

interface EnvironmentAnalysisPageProps {
  engine: SimulationEngine;
}

// Small recognizable actor silhouette icon helper
const ActorIcon: React.FC<{ type: ActorType }> = ({ type }) => {
  switch (type) {
    case 'AUTO_RICKSHAW':
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/40">
          🛺 AUTO
        </span>
      );
    case 'MOTORCYCLE':
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/40">
          <Bike className="w-3 h-3 mr-1 inline" /> MOTO
        </span>
      );
    case 'PEDESTRIAN':
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/40">
          <Footprints className="w-3 h-3 mr-1 inline" /> PED
        </span>
      );
    case 'ANIMAL':
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/40">
          <Dog className="w-3 h-3 mr-1 inline" /> ANIMAL
        </span>
      );
    case 'TRUCK':
    case 'BUS':
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/40">
          <Truck className="w-3 h-3 mr-1 inline" /> HEAVY
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold theme-card theme-text-secondary border theme-border">
          <Car className="w-3 h-3 mr-1 inline" /> CAR
        </span>
      );
  }
};

export const EnvironmentAnalysisPage: React.FC<EnvironmentAnalysisPageProps> = ({ engine }) => {
  const tracked = engine.trackedActors;
  const road = engine.road;
  const ego = engine.ego;
  const bounds = getDrivableBounds(road, ego.y);

  // Traffic counts
  const counts = {
    cars: engine.actors.filter(a => a.type === 'CAR').length,
    bikes: engine.actors.filter(a => a.type === 'MOTORCYCLE').length,
    autos: engine.actors.filter(a => a.type === 'AUTO_RICKSHAW').length,
    peds: engine.actors.filter(a => a.type === 'PEDESTRIAN').length,
    animals: engine.actors.filter(a => a.type === 'ANIMAL').length,
    heavy: engine.actors.filter(a => a.type === 'TRUCK' || a.type === 'BUS').length,
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* 1. TOP STATUS / HEADER BAR */}
      <div className="surface-dark rounded-xl p-5 shadow-automotive border theme-border flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-telemetry font-bold bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
              PERCEPTION SUBSYSTEM
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-telemetry theme-text-secondary theme-card border theme-border">
              RADAR + VISION FUSION
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight theme-text-primary font-sans flex items-center space-x-2">
            <Radar className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <span>ENVIRONMENTAL ANALYSIS & ROAD PROFILE</span>
          </h1>
          <p className="text-xs theme-text-muted max-w-2xl font-sans">
            Multi-object tracking, spatial proximity metrics, and dynamic drivable corridor evaluation across unstructured surfaces.
          </p>
        </div>

        <div className="flex items-center space-x-3 font-telemetry">
          <div className="theme-card px-3.5 py-2 rounded-lg border theme-border text-right">
            <span className="text-[10px] theme-text-muted block uppercase">TRACKED TARGETS</span>
            <span className="text-base font-bold text-teal-600 dark:text-teal-300">{tracked.length}</span>
          </div>
          <div className="theme-card px-3.5 py-2 rounded-lg border theme-border text-right">
            <span className="text-[10px] theme-text-muted block uppercase">ACTIVE POTHOLES</span>
            <span className="text-base font-bold text-amber-600 dark:text-amber-300">{road.potholes.length}</span>
          </div>
        </div>
      </div>

      {/* 2. ROAD GEOMETRY & SURFACE ANALYSIS */}
      <div className="surface-light rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b theme-border pb-3">
          <h2 className="text-xs font-mono font-bold theme-text-primary uppercase tracking-wider flex items-center space-x-2">
            <Compass className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>ROAD PROFILE & BOUNDARY METRICS</span>
          </h2>
          <span className="text-[11px] font-mono theme-text-secondary">SURFACE: DRY ASPHALT WITH DEGRADATION</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="surface-light-card p-4 rounded-xl space-y-1">
            <span className="text-[10px] font-mono uppercase theme-text-muted block font-semibold">ROAD WIDTH</span>
            <div className="text-2xl font-bold font-telemetry theme-text-primary">
              {formatNum(road.nominalWidth, 1)} <span className="text-xs font-normal theme-text-muted font-sans">m</span>
            </div>
            <span className="text-[10px] theme-text-muted block font-medium">Nominal cross-section</span>
          </div>

          <div className="surface-light-card p-4 rounded-xl space-y-1">
            <span className="text-[10px] font-mono uppercase text-teal-600 dark:text-teal-400 block font-semibold">DRIVABLE WIDTH</span>
            <div className="text-2xl font-bold font-telemetry text-teal-600 dark:text-teal-300">
              {formatNum(bounds.width, 2)} <span className="text-xs font-normal theme-text-muted font-sans">m</span>
            </div>
            <span className="text-[10px] theme-text-muted block font-medium">
              [{formatNum(bounds.leftX, 1)}m, {formatNum(bounds.rightX, 1)}m]
            </span>
          </div>

          <div className="surface-light-card p-4 rounded-xl space-y-1">
            <span className="text-[10px] font-mono uppercase text-amber-600 dark:text-amber-400 block font-semibold">LANE CONFIDENCE</span>
            <div className="text-2xl font-bold font-telemetry text-amber-600 dark:text-amber-400">
              {(bounds.laneConfidence * 100).toFixed(0)}%
            </div>
            <span className="text-[10px] theme-text-muted block font-medium">Faded / Absent Paint</span>
          </div>

          <div className="surface-light-card p-4 rounded-xl space-y-1">
            <span className="text-[10px] font-mono uppercase text-emerald-600 dark:text-emerald-400 block font-semibold">ROAD EDGE DISTANCE</span>
            <div className="text-2xl font-bold font-telemetry text-emerald-600 dark:text-emerald-400">
              {formatNum(Math.min(ego.x - bounds.leftX, bounds.rightX - ego.x), 2)}{' '}
              <span className="text-xs font-normal theme-text-muted font-sans">m</span>
            </div>
            <span className="text-[10px] theme-text-muted block font-medium">Clearance to verge</span>
          </div>
        </div>
      </div>

      {/* 3. OBJECT PERCEPTION & TRACKING TABLE */}
      <div className="surface-light rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b theme-border pb-3">
          <h2 className="text-xs font-mono font-bold theme-text-primary uppercase tracking-wider flex items-center space-x-2">
            <Table className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>PERCEIVED OBJECT TRACKING INVENTORY</span>
          </h2>
          <span className="text-[11px] font-mono theme-text-secondary font-medium">
            50 Hz UPDATE CYCLE
          </span>
        </div>

        {tracked.length === 0 ? (
          <div className="py-12 text-center theme-text-muted font-mono text-xs surface-light-card rounded-lg">
            No surrounding dynamic obstacles detected in forward sensor envelope.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border theme-border">
            <table className="w-full text-left font-sans text-xs">
              <thead className="theme-card theme-text-muted font-mono text-[10px] uppercase border-b theme-border">
                <tr>
                  <th className="px-3.5 py-2.5">ID</th>
                  <th className="px-3.5 py-2.5">TYPE</th>
                  <th className="px-3.5 py-2.5">DISTANCE</th>
                  <th className="px-3.5 py-2.5">SPEED</th>
                  <th className="px-3.5 py-2.5">RELATIVE VELOCITY</th>
                  <th className="px-3.5 py-2.5">TTC</th>
                  <th className="px-3.5 py-2.5">RISK</th>
                </tr>
              </thead>
              <tbody className="divide-y theme-border theme-surface">
                {tracked.map(track => {
                  const ttc = track.timeToCollision;
                  const isPrimary = engine.riskState.primaryHazardActorId === track.id;
                  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
                  if (track.riskScore >= 70 || ttc < 2.0) riskLevel = 'CRITICAL';
                  else if (track.riskScore >= 45 || ttc < 3.5) riskLevel = 'HIGH';
                  else if (track.riskScore >= 20 || ttc < 5.0) riskLevel = 'MEDIUM';

                  return (
                    <tr key={track.id} className="hover:theme-card-hover transition-colors">
                      <td className="px-3.5 py-2.5 font-mono text-[11px] font-bold theme-text-primary">
                        <div className="flex items-center space-x-1.5">
                          <span>{track.id}</span>
                          {isPrimary && (
                            <span className="px-1 py-0.2 rounded text-[8px] font-mono font-bold bg-rose-500 text-white">
                              PRIMARY
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <ActorIcon type={track.type} />
                      </td>
                      <td className="px-3.5 py-2.5 font-telemetry font-bold theme-text-primary">
                        {formatNum(track.distanceToEgo, 1)} m
                      </td>
                      <td className="px-3.5 py-2.5 font-telemetry theme-text-secondary">
                        {formatNum(track.speed * 3.6, 1)} km/h
                      </td>
                      <td className="px-3.5 py-2.5 font-telemetry theme-text-secondary">
                        {track.closingSpeed > 0 ? `+${formatNum(track.closingSpeed, 1)}` : formatNum(track.closingSpeed, 1)} m/s
                      </td>
                      <td className="px-3.5 py-2.5 font-telemetry">
                        <span
                          className={`font-bold ${
                            ttc < 2.5
                              ? 'text-rose-600 dark:text-rose-400'
                              : ttc < 4.5
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'theme-text-muted'
                          }`}
                        >
                          {isFinite(ttc) ? `${formatNum(ttc, 2)} s` : '∞'}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            riskLevel === 'CRITICAL'
                              ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/40'
                              : riskLevel === 'HIGH'
                              ? 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/40'
                              : riskLevel === 'MEDIUM'
                              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/40'
                              : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40'
                          }`}
                        >
                          {riskLevel} ({Math.round(track.riskScore)})
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. POTHOLES & ROAD DEFECTS INVENTORY */}
      <div className="surface-light rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b theme-border pb-3">
          <h2 className="text-xs font-mono font-bold theme-text-primary uppercase tracking-wider flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>ROAD DAMAGE & POTHOLE REGISTRY</span>
          </h2>
          <span className="text-[11px] font-mono theme-text-secondary font-medium">
            3D SPATIO-TEMPORAL ROAD HAZARDS
          </span>
        </div>

        {road.potholes.length === 0 ? (
          <div className="py-8 text-center theme-text-muted font-mono text-xs surface-light-card rounded-lg">
            No active surface potholes on current road segment.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 font-mono text-xs">
            {road.potholes.map(pot => {
              const relY = pot.y - ego.y;
              return (
                <div
                  key={pot.id}
                  className="surface-light-card p-3.5 rounded-xl border theme-border space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold theme-text-primary">{pot.id}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        pot.severity === 'SEVERE'
                          ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/40'
                          : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {pot.severity}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] theme-text-secondary">
                    <div>
                      <span className="theme-text-muted block text-[9px]">LATERAL (X)</span>
                      <span className="font-telemetry font-bold theme-text-primary">{formatNum(pot.x, 2)} m</span>
                    </div>
                    <div>
                      <span className="theme-text-muted block text-[9px]">AHEAD (Y)</span>
                      <span className="font-telemetry font-bold theme-text-primary">
                        {relY >= 0 ? `+${formatNum(relY, 1)}` : formatNum(relY, 1)} m
                      </span>
                    </div>
                    <div>
                      <span className="theme-text-muted block text-[9px]">DIAMETER</span>
                      <span className="font-telemetry font-bold theme-text-primary">{formatNum(pot.diameter, 2)} m</span>
                    </div>
                    <div>
                      <span className="theme-text-muted block text-[9px]">DEPTH</span>
                      <span className="font-telemetry font-bold theme-text-primary">{pot.depth} cm</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. TRAFFIC AGENTS COMPOSITION */}
      <div className="surface-light rounded-xl p-5 shadow-sm space-y-3">
        <h3 className="text-xs font-mono font-bold theme-text-secondary uppercase tracking-wider">
          SURROUNDING TRAFFIC AGENT DISTRIBUTION
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 font-mono text-center">
          <div className="surface-light-card p-3 rounded-lg">
            <span className="text-[10px] theme-text-muted block">CARS</span>
            <span className="text-lg font-bold theme-text-primary">{counts.cars}</span>
          </div>
          <div className="surface-light-card p-3 rounded-lg">
            <span className="text-[10px] theme-text-muted block">MOTORCYCLES</span>
            <span className="text-lg font-bold text-purple-600 dark:text-purple-400">{counts.bikes}</span>
          </div>
          <div className="surface-light-card p-3 rounded-lg">
            <span className="text-[10px] theme-text-muted block">AUTO-RICKSHAWS</span>
            <span className="text-lg font-bold text-amber-600 dark:text-amber-400">{counts.autos}</span>
          </div>
          <div className="surface-light-card p-3 rounded-lg">
            <span className="text-[10px] theme-text-muted block">PEDESTRIANS</span>
            <span className="text-lg font-bold text-sky-600 dark:text-sky-400">{counts.peds}</span>
          </div>
          <div className="surface-light-card p-3 rounded-lg">
            <span className="text-[10px] theme-text-muted block">ANIMALS</span>
            <span className="text-lg font-bold text-rose-600 dark:text-rose-400">{counts.animals}</span>
          </div>
          <div className="surface-light-card p-3 rounded-lg">
            <span className="text-[10px] theme-text-muted block">COMMERCIAL</span>
            <span className="text-lg font-bold text-orange-600 dark:text-orange-400">{counts.heavy}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
