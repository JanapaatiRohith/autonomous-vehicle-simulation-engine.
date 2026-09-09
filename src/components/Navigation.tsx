import React from 'react';
import {
  Activity,
  Compass,
  Radar,
  TrendingUp,
  GitBranch,
  Layers,
  BarChart3,
  Cpu,
  ShieldAlert,
  Sparkles,
  Maximize2,
  Minimize2,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export type PageId =
  | 'MISSION_CONTROL'
  | 'LIVE_SIMULATION'
  | 'ENVIRONMENT_ANALYSIS'
  | 'RISK_PREDICTION'
  | 'PATH_PLANNER'
  | 'SCENARIO_LAB'
  | 'ANALYTICS_BENCHMARK'
  | 'SYSTEM_ARCHITECTURE';

interface NavigationProps {
  activePage: PageId;
  onSelectPage: (page: PageId) => void;
  isRunning: boolean;
  overallRiskLevel: string;
  onLaunchHeroDemo?: () => void;
  isPresentationMode?: boolean;
  onTogglePresentationMode?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activePage,
  onSelectPage,
  isRunning,
  overallRiskLevel,
  onLaunchHeroDemo,
  isPresentationMode = false,
  onTogglePresentationMode,
}) => {
  const { isDark, toggleTheme } = useTheme();

  const navItems: Array<{ id: PageId; label: string; icon: React.ReactNode; badge?: string }> = [
    { id: 'MISSION_CONTROL', label: 'Mission Control', icon: <Compass className="w-4 h-4" /> },
    {
      id: 'LIVE_SIMULATION',
      label: 'Live Simulation',
      icon: <Activity className="w-4 h-4" />,
      badge: isRunning ? 'RUNNING' : 'PAUSED',
    },
    { id: 'ENVIRONMENT_ANALYSIS', label: 'Environment', icon: <Radar className="w-4 h-4" /> },
    { id: 'RISK_PREDICTION', label: 'Risk & Prediction', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'PATH_PLANNER', label: 'Path Planner', icon: <GitBranch className="w-4 h-4" /> },
    { id: 'SCENARIO_LAB', label: 'Scenario Lab', icon: <Layers className="w-4 h-4" /> },
    { id: 'ANALYTICS_BENCHMARK', label: 'Benchmark & Analytics', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'SYSTEM_ARCHITECTURE', label: 'Architecture & MathWorks', icon: <Cpu className="w-4 h-4" /> },
  ];

  return (
    <header className="theme-header border-b theme-border sticky top-0 z-50 px-4 py-2 flex flex-wrap items-center justify-between gap-3 shadow-sm transition-colors duration-200">
      {/* Brand & Technical Platform Identifier */}
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded-lg bg-cyan-600/10 dark:bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-600 dark:text-cyan-300 font-telemetry font-bold text-xs shadow-sm">
          AI
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold tracking-wider text-sm font-sans theme-text-primary">
              ADAPT-INDIA
            </span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-telemetry font-semibold bg-slate-200 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
              SIH26037
            </span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-telemetry text-cyan-600 dark:text-cyan-300 bg-cyan-500/10 dark:bg-cyan-950/60 border border-cyan-500/30 dark:border-cyan-800/80">
              MathWorks
            </span>
          </div>
          <p className="text-[10px] theme-text-muted font-sans truncate max-w-xs md:max-w-md">
            Adaptive Path Planning & Collision Avoidance on Unstructured Indian Roads
          </p>
        </div>
      </div>

      {/* Nav Tabs (Hidden in Presentation Mode for max screen real-estate) */}
      {!isPresentationMode && (
        <nav className="flex items-center space-x-1 overflow-x-auto py-0.5">
          {navItems.map(item => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectPage(item.id)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border border-cyan-500/40 shadow-sm font-semibold'
                    : 'theme-text-muted hover:theme-text-primary hover:bg-slate-500/10 border border-transparent'
                }`}
              >
                <span>{item.icon}</span>
                <span className="whitespace-nowrap">{item.label}</span>
                {item.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-telemetry ${
                      item.badge === 'RUNNING'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 animate-pulse'
                        : 'bg-slate-200 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-800'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      )}

      {/* Quick Launch Hero Demo, Theme Switcher, Risk Pill & Presentation Mode */}
      <div className="flex items-center space-x-2">
        {onLaunchHeroDemo && (
          <button
            onClick={onLaunchHeroDemo}
            className="flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-300 border border-amber-500/40 shadow-sm transition-all"
            title="Instantly launch Flagship Hero Demonstration (Scenario 5)"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span className="hidden sm:inline">HERO DEMO</span>
          </button>
        )}

        {/* Theme Toggle Button */}
        <button
          id="theme-toggle-btn"
          onClick={toggleTheme}
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all shadow-sm ${
            isDark
              ? 'bg-slate-900 text-amber-300 border-slate-700 hover:bg-slate-800 hover:border-slate-600'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
          }`}
          title={isDark ? 'Switch to Bright Theme' : 'Switch to Dark Theme'}
        >
          {isDark ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline text-[11px] font-semibold">Bright</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-sky-600" />
              <span className="hidden md:inline text-[11px] font-semibold">Dark</span>
            </>
          )}
        </button>

        {/* Risk Level Badge */}
        <div
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[11px] font-telemetry border ${
            overallRiskLevel === 'CRITICAL'
              ? 'bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-300'
              : overallRiskLevel === 'HIGH'
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-300'
              : overallRiskLevel === 'MEDIUM'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-500 dark:text-amber-400'
              : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>RISK: {overallRiskLevel}</span>
        </div>

        {onTogglePresentationMode && (
          <button
            onClick={onTogglePresentationMode}
            className="p-1.5 rounded-lg border theme-border theme-text-secondary hover:theme-text-primary hover:bg-slate-500/10 transition-all shadow-sm"
            title="Toggle Presentation Mode (Enlarge Simulation Workspace)"
          >
            {isPresentationMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        )}
      </div>
    </header>
  );
};
