import React from 'react';
import {
  Cpu,
  ArrowDown,
  ArrowRight,
  ShieldCheck,
  Layers,
  GitBranch,
  Terminal,
  ExternalLink,
  Code2,
  Workflow,
  Sparkles,
} from 'lucide-react';

export const SystemArchitecturePage: React.FC = () => {
  const pipelineFlow = [
    {
      id: 1,
      title: 'ENVIRONMENT',
      subtitle: 'Unstructured Road Space',
      desc: 'Variable road width (5.5m - 8.0m), missing lane markings, unpaved shoulders, and potholes.',
      badge: 'INPUT',
      color: 'border-slate-300 text-slate-800 bg-slate-50',
    },
    {
      id: 2,
      title: 'PERCEPTION',
      subtitle: 'Forward Sensor Envelope',
      desc: 'Simulated radar/vision field of view with range-based detection confidence and actor classification.',
      badge: 'SENSOR',
      color: 'border-teal-300 text-teal-900 bg-teal-50',
    },
    {
      id: 3,
      title: 'TRACKING',
      subtitle: 'Multi-Object State Estimation',
      desc: 'Historical state trajectory, velocity estimation (vx, vy), and relative closing speed calculation.',
      badge: 'ESTIMATION',
      color: 'border-teal-300 text-teal-900 bg-teal-50',
    },
    {
      id: 4,
      title: 'PREDICTION',
      subtitle: 'Spatio-Temporal Horizon',
      desc: 'Kinematic motion propagation (3.0s horizon) with non-linear uncertainty expansion σ(t) = σ₀ + α·t¹.¹⁵.',
      badge: 'PROJECTION',
      color: 'border-purple-300 text-purple-900 bg-purple-50',
    },
    {
      id: 5,
      title: 'RISK ENGINE',
      subtitle: 'TTC & Threat Quantification',
      desc: 'Time-to-collision (TTC), dynamic safety margins (1.5m - 6.0m), and overall risk score (0-100).',
      badge: 'SAFETY',
      color: 'border-amber-300 text-amber-900 bg-amber-50',
    },
    {
      id: 6,
      title: 'DRIVABLE SPACE',
      subtitle: 'Corridor Boundary Model',
      desc: 'Continuous interpolation of road edges, drivable width assessment, and pothole avoidance regions.',
      badge: 'BOUNDARY',
      color: 'border-emerald-300 text-emerald-900 bg-emerald-50',
    },
    {
      id: 7,
      title: 'TRAJECTORY GENERATION',
      subtitle: 'Hermite Candidate Splines',
      desc: 'Synthesis of C¹-continuous candidate paths (LEFT, CENTER, RIGHT) with boundary curvature limits.',
      badge: 'SYNTHESIS',
      color: 'border-sky-300 text-sky-900 bg-sky-50',
    },
    {
      id: 8,
      title: 'COLLISION CHECK',
      subtitle: 'Spatio-Temporal Interference',
      desc: 'Intersection checking against predicted obstacle uncertainty envelopes and detected road potholes.',
      badge: 'VERIFICATION',
      color: 'border-rose-300 text-rose-900 bg-rose-50',
    },
    {
      id: 9,
      title: 'PATH OPTIMIZATION',
      subtitle: 'Multi-Objective Cost Scoring',
      desc: 'Minimization of J = w₁·(1/clearance) + w₂·risk + w₃·curvature + w₄·steerEffort + w₅·centerDev.',
      badge: 'OPTIMIZATION',
      color: 'border-teal-300 text-teal-900 bg-teal-50',
    },
    {
      id: 10,
      title: 'CONTROL',
      subtitle: 'Pure Pursuit & Longitudinal PID',
      desc: 'Dynamic lookahead steering controller, adaptive cruise throttle, and graduated emergency braking.',
      badge: 'EXECUTION',
      color: 'border-blue-300 text-blue-900 bg-blue-50',
    },
    {
      id: 11,
      title: 'EGO VEHICLE',
      subtitle: 'Bicycle Kinematics Update',
      desc: 'Kinematic bicycle model updating longitudinal position, lateral coordinate, yaw heading, and speed.',
      badge: 'PHYSICS',
      color: 'border-indigo-300 text-indigo-900 bg-indigo-50',
    },
    {
      id: 12,
      title: 'REPLANNING',
      subtitle: '50 Hz Closed-Loop Cycle',
      desc: 'Real-time deterministic tick cycle updating decisions every 20ms in response to evolving hazards.',
      badge: 'LOOP',
      color: 'border-emerald-300 text-emerald-900 bg-emerald-50',
    },
  ];

  const futureMathworks = [
    {
      name: 'MATLAB®',
      role: 'Offline Mathematical Validation & Batch Analysis',
      integration:
        'Offline algorithmic validation, Monte Carlo batch simulation of non-Gaussian road actor interactions, and statistical safety envelope certification.',
      status: 'FUTURE INTEGRATION (NOT USED IN CURRENT PROTOTYPE)',
    },
    {
      name: 'SIMULINK® & STATEFLOW®',
      role: 'Model-Based Design & Supervisory State Machine',
      integration:
        'Model-Based Design (MBD) of supervisory state machines, SIL / HIL testing harness, ISO 26262 ASIL-D functional safety compliance, and automatic MISRA C code generation.',
      status: 'FUTURE INTEGRATION (NOT USED IN CURRENT PROTOTYPE)',
    },
    {
      name: 'ROADRUNNER® & ROADRUNNER SCENARIO',
      role: 'Photorealistic 3D Road Modeling',
      integration:
        'High-fidelity 3D modeling of degraded Indian road sections, unpaved shoulders, irregular potholes, and ASAM OpenDRIVE / OpenSCENARIO asset export.',
      status: 'FUTURE INTEGRATION (NOT USED IN CURRENT PROTOTYPE)',
    },
    {
      name: 'AUTOMATED DRIVING TOOLBOX™',
      role: 'High-Fidelity Synthetic Sensor Pipeline',
      integration:
        'Physics-based synthetic sensor models (Automotive Radar, Mono/Stereo Camera, LiDAR point clouds), multi-object cuboid tracker filters, and driving scenario designers.',
      status: 'FUTURE INTEGRATION (NOT USED IN CURRENT PROTOTYPE)',
    },
    {
      name: 'NAVIGATION TOOLBOX™',
      role: 'Industrial Motion Planning Toolchain',
      integration:
        'TEB (Timed Elastic Band), Lattice planners, Hybrid A*, clothoid curve generation, costmap layers, and dynamic obstacle inflation grids.',
      status: 'FUTURE INTEGRATION (NOT USED IN CURRENT PROTOTYPE)',
    },
    {
      name: 'VEHICLE DYNAMICS BLOCKSET™',
      role: '14-DOF High-Fidelity Physics',
      integration:
        '14-DOF vehicle chassis dynamics, non-linear Pacejka Magic Formula tire slip models, suspension damping, and powertrain torque response curves.',
      status: 'FUTURE INTEGRATION (NOT USED IN CURRENT PROTOTYPE)',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* 1. TOP HEADER BAR */}
      <div className="theme-card rounded-xl p-5 shadow-automotive border theme-border flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-telemetry font-bold bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/40">
              SYSTEM ARCHITECTURE
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-telemetry theme-text-muted theme-surface border theme-border">
              SIH26037 ENGINEERING DESIGN
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight theme-text-primary font-sans flex items-center space-x-2">
            <Workflow className="w-5 h-5 text-teal-500 dark:text-teal-400" />
            <span>END-TO-END AUTONOMOUS PIPELINE & TOOLCHAIN ROADMAP</span>
          </h1>
          <p className="text-xs theme-text-secondary max-w-2xl font-sans">
            Formal architectural trace of data transformations from environment modeling to vehicle kinematics, and alignment with future MathWorks toolchains.
          </p>
        </div>

        <div className="flex items-center space-x-2 font-telemetry text-xs">
          <span className="theme-text-muted">UPDATE RATE:</span>
          <span className="px-2.5 py-1 rounded bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/40 font-bold">
            50 Hz DETERMINISTIC
          </span>
        </div>
      </div>

      {/* 2. PIPELINE FLOW DIAGRAM */}
      <div className="theme-card rounded-xl p-6 shadow-sm border theme-border space-y-6">
        <div className="flex items-center justify-between border-b theme-border pb-3">
          <div>
            <h2 className="text-xs font-mono font-bold theme-text-primary uppercase tracking-wider flex items-center space-x-2">
              <GitBranch className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>12-STAGE DETERMINISTIC AUTONOMOUS DRIVING PIPELINE</span>
            </h2>
            <p className="text-xs theme-text-secondary mt-0.5">
              Closed-loop control cycle executing deterministically at 50 Hz without hardcoded decisions.
            </p>
          </div>
          <span className="text-[10px] font-mono text-teal-700 dark:text-teal-300 bg-teal-500/20 border border-teal-500/40 px-2 py-0.5 rounded font-bold">
            ZERO HARDCODING
          </span>
        </div>

        {/* 12-Stage Visual Flow Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pipelineFlow.map((stage, idx) => (
            <div
              key={stage.id}
              className="theme-surface p-4 rounded-xl border theme-border shadow-sm space-y-2 relative transition-all hover:shadow-md hover:border-teal-500/50"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold theme-text-primary flex items-center space-x-1.5">
                  <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-700 dark:text-teal-300 flex items-center justify-center text-[10px] font-bold border border-teal-500/40">
                    {stage.id}
                  </span>
                  <span>{stage.title}</span>
                </span>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border theme-border theme-card theme-text-secondary">
                  {stage.badge}
                </span>
              </div>

              <div className="text-[11px] font-mono font-semibold text-teal-700 dark:text-teal-300">
                {stage.subtitle}
              </div>

              <p className="text-xs theme-text-secondary font-sans leading-relaxed">
                {stage.desc}
              </p>

              {idx < pipelineFlow.length - 1 && (
                <div className="hidden lg:block absolute -bottom-3 right-4 text-slate-400 dark:text-slate-600 z-10">
                  <ArrowDown className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 3. FUTURE MATHWORKS VALIDATION ARCHITECTURE */}
      <div className="theme-card rounded-xl p-6 shadow-sm border theme-border space-y-6">
        <div className="flex items-center justify-between border-b theme-border pb-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40">
                FUTURE INTEGRATION
              </span>
              <h2 className="text-xs font-mono font-bold theme-text-primary uppercase tracking-wider flex items-center space-x-2">
                <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>FUTURE MATHWORKS TOOLCHAIN INTEGRATION ROADMAP</span>
              </h2>
            </div>
            <p className="text-xs theme-text-secondary mt-1">
              Modular architecture specifically designed to facilitate direct industrial MathWorks software-in-the-loop (SIL) and hardware-in-the-loop (HIL) transition.
            </p>
          </div>
          <span className="text-[10px] font-mono theme-text-muted font-medium hidden sm:inline">
            PROTOTYPE $\rightarrow$ PRODUCTION PIPELINE
          </span>
        </div>

        {/* Warning / Clarification Callout */}
        <div className="theme-surface p-3.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-xs text-amber-800 dark:text-amber-200 space-y-1">
          <strong className="font-mono text-[10px] uppercase block text-amber-700 dark:text-amber-300">
            ENGINEERING CLARIFICATION:
          </strong>
          <p className="leading-relaxed theme-text-secondary">
            The modules listed below represent the planned industrial validation pathway with MathWorks toolchains for Phase 2 implementation. The current prototype functions autonomously in native TypeScript/Canvas with verified mathematical equivalents.
          </p>
        </div>

        {/* MathWorks Tool Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {futureMathworks.map((mw, idx) => (
            <div
              key={idx}
              className="theme-surface p-4 rounded-xl border theme-border space-y-2 hover:border-teal-500/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-mono font-bold text-sm theme-text-primary">{mw.name}</h3>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded theme-card theme-text-muted border theme-border">
                  ROADMAP
                </span>
              </div>

              <div className="text-xs font-mono font-semibold text-teal-700 dark:text-teal-300">
                {mw.role}
              </div>

              <p className="text-xs theme-text-secondary font-sans leading-relaxed">
                {mw.integration}
              </p>

              <div className="pt-1">
                <span className="text-[10px] font-mono text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 block">
                  {mw.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
