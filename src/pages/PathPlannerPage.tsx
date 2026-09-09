import React, { useEffect, useRef, useState } from 'react';
import { SimulationEngine } from '../simulation/engine';
import { CandidatePathId } from '../types/trajectory';
import { DEFAULT_COST_WEIGHTS } from '../planning/trajectoryCost';
import {
  drawRoadSurface,
  drawPotholes,
  drawEgoVehicle,
  drawSurroundingActor,
  drawCandidateTrajectories,
  drawPredictionEnvelopes,
} from '../components/canvas/renderAssets';
import {
  GitBranch,
  CheckCircle2,
  AlertOctagon,
  Sliders,
  ShieldCheck,
  Compass,
  Zap,
} from 'lucide-react';
import { formatNum } from '../utils/math';

interface PathPlannerPageProps {
  engine: SimulationEngine;
}

export const PathPlannerPage: React.FC<PathPlannerPageProps> = ({ engine }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const planner = engine.plannerOutput;
  const ego = engine.ego;
  const road = engine.road;
  const candidates = planner.candidates;
  const candidateIds: CandidatePathId[] = ['LEFT', 'CENTER', 'RIGHT'];

  // Render large trajectory planning canvas
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const scale = 16; // pixels per meter

      // Center camera longitudinally ahead of ego
      const camY = ego.y + 16;
      const toScreenX = (x: number) => width / 2 + x * scale;
      const toScreenY = (y: number) => height / 2 - (y - camY) * scale;

      // 1. Draw Road Surface
      drawRoadSurface(ctx, road, ego, width, height, scale, toScreenX, toScreenY, 'DAYLIGHT');

      // 2. Draw Potholes
      drawPotholes(ctx, road.potholes, ego.y - 15, ego.y + 45, scale, toScreenX, toScreenY);

      // 3. Draw Surrounding Actors
      engine.actors.forEach(actor => {
        drawSurroundingActor(ctx, actor, scale, toScreenX, toScreenY, 'DAYLIGHT');
      });

      // 4. Draw Prediction Uncertainty Envelopes
      if (engine.predictions && engine.predictions.size > 0) {
        drawPredictionEnvelopes(ctx, engine.predictions, engine.actors, scale, toScreenX, toScreenY);
      }

      // 5. Draw Candidate Trajectories (LEFT, CENTER, RIGHT)
      if (candidates) {
        drawCandidateTrajectories(ctx, candidates, planner.selectedPathId, toScreenX, toScreenY);
      }

      // 6. Draw Ego Vehicle
      drawEgoVehicle(ctx, ego, scale, toScreenX, toScreenY, 'DAYLIGHT');

      // Trajectory Label Overlay at top-left
      ctx.fillStyle = 'rgba(10, 13, 20, 0.75)';
      ctx.fillRect(12, 12, 220, 80);
      ctx.strokeStyle = '#1e2533';
      ctx.strokeRect(12, 12, 220, 80);

      ctx.fillStyle = '#f1f5f9';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('TRAJECTORY OPTIMIZATION', 20, 28);

      ctx.font = '10px monospace';
      ctx.fillStyle = '#0d9488';
      ctx.fillText('— ACTIVE: ' + planner.selectedPathId, 20, 46);

      ctx.fillStyle = '#e11d48';
      ctx.fillText('┄ BLOCKED CANDIDATE', 20, 62);

      ctx.fillStyle = '#059669';
      ctx.fillText('┄ SAFE ALTERNATIVE', 20, 78);

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [ego, road, candidates, planner.selectedPathId, engine.actors, engine.predictions]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Top Header Bar */}
      <div className="theme-card rounded-xl p-5 shadow-automotive border theme-border flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-telemetry font-bold bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/40">
              TRAJECTORY GENERATOR
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-telemetry theme-text-muted theme-surface border theme-border">
              C¹ CONTINUOUS HERMITE SPLINES
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight theme-text-primary font-sans flex items-center space-x-2">
            <GitBranch className="w-5 h-5 text-teal-500 dark:text-teal-400" />
            <span>PATH PLANNING & TRAJECTORY ARBITRATION</span>
          </h1>
          <p className="text-xs theme-text-secondary max-w-2xl font-sans">
            Multi-candidate trajectory synthesis, clearance-maximizing cost optimization, and spatio-temporal obstacle avoidance.
          </p>
        </div>

        <div className="flex items-center space-x-3 font-telemetry">
          <div className="theme-surface px-3.5 py-2 rounded-lg border theme-border text-right">
            <span className="text-[10px] theme-text-muted block uppercase">SELECTED PATH</span>
            <span className="text-base font-bold text-teal-600 dark:text-teal-300">{planner.selectedPathId}</span>
          </div>
          <div className="theme-surface px-3.5 py-2 rounded-lg border theme-border text-right">
            <span className="text-[10px] theme-text-muted block uppercase">DECISION</span>
            <span className="text-base font-bold theme-text-primary">{planner.decision}</span>
          </div>
        </div>
      </div>

      {/* Main Trajectory Planning Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 7 Cols: Large Trajectory Visualization Canvas */}
        <div className="lg:col-span-7 bg-[#090d15] border theme-border rounded-2xl overflow-hidden shadow-automotive relative flex flex-col min-h-[500px]">
          <canvas
            ref={canvasRef}
            width={680}
            height={560}
            className="w-full h-full object-cover flex-1 block"
          />

          <div className="absolute bottom-3 right-3 theme-hud px-3 py-1.5 rounded-lg border text-[10px] font-telemetry shadow-hud">
            HORIZON: 3.0s (35m) • 50 Hz REPLAN
          </div>
        </div>

        {/* Right 5 Cols: Candidate Trajectories (LEFT, CENTER, RIGHT) */}
        <div className="lg:col-span-5 space-y-3 flex flex-col justify-between">
          {candidateIds.map(id => {
            const cand = candidates?.[id];
            if (!cand) return null;
            const isSelected = planner.selectedPathId === id;

            return (
              <div
                key={id}
                className={`p-4 rounded-xl border transition-all space-y-3 ${
                  isSelected
                    ? 'theme-card border-teal-500 ring-2 ring-teal-500/40 shadow-automotive'
                    : 'theme-card border theme-border hover:theme-card-hover'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-sm theme-text-primary">{cand.name}</span>
                    <span className="text-[10px] font-mono theme-text-muted">[{id}]</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {isSelected && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-500 text-white dark:text-slate-950">
                        EXECUTED PATH
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                        cand.status === 'SAFE'
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40'
                          : cand.status === 'BLOCKED'
                          ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40'
                          : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40'
                      }`}
                    >
                      {cand.status}
                    </span>
                  </div>
                </div>

                {/* Candidate Specs Grid */}
                <div className="grid grid-cols-4 gap-2 text-center font-telemetry text-[11px] theme-surface p-2.5 rounded-lg border theme-border">
                  <div>
                    <span className="text-[9px] theme-text-muted block uppercase">COST</span>
                    <span className={`font-bold ${cand.status === 'BLOCKED' ? 'text-rose-600 dark:text-rose-400' : 'text-teal-600 dark:text-teal-300'}`}>
                      {cand.status === 'BLOCKED' ? '∞' : formatNum(cand.cost, 1)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] theme-text-muted block uppercase">MIN CLR</span>
                    <span className="font-bold theme-text-primary">{formatNum(cand.minimumClearance, 2)}m</span>
                  </div>
                  <div>
                    <span className="text-[9px] theme-text-muted block uppercase">CURVATURE</span>
                    <span className="font-bold theme-text-primary">{formatNum(cand.peakCurvature, 3)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] theme-text-muted block uppercase">STEER</span>
                    <span className="font-bold theme-text-primary">{formatNum((cand.steeringEffort * 180) / Math.PI, 1)}°</span>
                  </div>
                </div>

                {cand.blockingReason && (
                  <div className="text-[11px] font-sans text-rose-700 dark:text-rose-300 bg-rose-500/10 p-2 rounded border border-rose-500/30">
                    <strong className="text-[10px] font-mono uppercase text-rose-600 dark:text-rose-400 block mb-0.5">CONFLICT DETECTED:</strong>
                    {cand.blockingReason}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* WHY THIS PATH? Explainability Section */}
      <div className="surface-light rounded-xl p-6 shadow-sm border theme-border space-y-3">
        <div className="flex items-center justify-between border-b theme-border pb-2">
          <h2 className="text-xs font-mono font-bold theme-text-primary uppercase tracking-wider flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>WHY THIS PATH? — AUTONOMOUS DECISION EXPLANATION</span>
          </h2>
          <span className="text-[10px] font-mono theme-text-secondary font-medium">
            DYNAMIC ARBITRATION LOGIC
          </span>
        </div>

        <div className="surface-light-card p-4 rounded-xl border theme-border">
          <p className="text-sm font-sans theme-text-primary leading-relaxed font-medium">
            {planner.reasoning}
          </p>
        </div>
      </div>

      {/* Multi-Objective Cost Function Architecture */}
      <div className="surface-light rounded-xl p-6 shadow-sm border theme-border space-y-4">
        <div className="flex items-center justify-between border-b theme-border pb-2">
          <h3 className="text-xs font-mono font-bold theme-text-primary uppercase tracking-wider flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>MULTI-OBJECTIVE TRAJECTORY COST WEIGHTS</span>
          </h3>
          <span className="text-[10px] font-mono theme-text-secondary font-medium">
            J = Σ wᵢ · Cᵢ
          </span>
        </div>

        <p className="text-xs font-sans theme-text-secondary">
          Optimization cost evaluates inverse minimum obstacle clearance, kinematic collision risk penalty, peak curvature, steering angle deflection, and nominal road center alignment.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center font-telemetry">
          <div className="surface-light-card p-3 rounded-xl border theme-border">
            <span className="text-[10px] font-mono theme-text-muted block uppercase">w₁ CLEARANCE</span>
            <span className="text-lg font-bold text-teal-600 dark:text-teal-400">{DEFAULT_COST_WEIGHTS.clearanceWeight}</span>
          </div>
          <div className="surface-light-card p-3 rounded-xl border theme-border">
            <span className="text-[10px] font-mono theme-text-muted block uppercase">w₂ RISK PENALTY</span>
            <span className="text-lg font-bold text-amber-600 dark:text-amber-400">{DEFAULT_COST_WEIGHTS.riskWeight}</span>
          </div>
          <div className="surface-light-card p-3 rounded-xl border theme-border">
            <span className="text-[10px] font-mono theme-text-muted block uppercase">w₃ CURVATURE</span>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{DEFAULT_COST_WEIGHTS.curvatureWeight}</span>
          </div>
          <div className="surface-light-card p-3 rounded-xl border theme-border">
            <span className="text-[10px] font-mono theme-text-muted block uppercase">w₄ STEERING EFFORT</span>
            <span className="text-lg font-bold text-purple-600 dark:text-purple-400">{DEFAULT_COST_WEIGHTS.steeringWeight}</span>
          </div>
          <div className="surface-light-card p-3 rounded-xl border theme-border">
            <span className="text-[10px] font-mono theme-text-muted block uppercase">w₅ CENTER ALIGN</span>
            <span className="text-lg font-bold theme-text-primary">{DEFAULT_COST_WEIGHTS.centerDeviationWeight}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
