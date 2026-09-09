import React from 'react';
import { SimulationEvent } from '../types/events';
import { Terminal } from 'lucide-react';
import { formatNum } from '../utils/math';

interface EventLogPanelProps {
  events: SimulationEvent[];
}

export const EventLogPanel: React.FC<EventLogPanelProps> = ({ events }) => {
  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'ALERT':
        return <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/50">ALERT</span>;
      case 'WARNING':
        return <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/50">WARN</span>;
      case 'SUCCESS':
        return <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/50">PASS</span>;
      default:
        return <span className="px-1.5 py-0.2 rounded text-[9px] font-mono theme-card theme-text-secondary border theme-border">INFO</span>;
    }
  };

  return (
    <div className="surface-dark rounded-xl p-3.5 space-y-2 shadow-automotive">
      <div className="flex items-center justify-between border-b theme-border pb-2">
        <div className="flex items-center space-x-2 theme-text-primary text-xs font-semibold tracking-wider">
          <Terminal className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <span>REAL-TIME STATE TRANSITION & EVENT LOG</span>
        </div>
        <span className="text-[10px] font-telemetry theme-text-muted">{events.length} EVENTS RECORDED</span>
      </div>

      <div className="h-32 overflow-y-auto space-y-1 pr-1 font-telemetry text-[11px]">
        {events.length === 0 ? (
          <div className="theme-text-muted text-center py-6 font-sans">Awaiting simulation events...</div>
        ) : (
          events.slice(0, 35).map(event => (
            <div
              key={event.id}
              className="flex items-start space-x-2 py-1 px-2 rounded theme-card border theme-border hover:theme-card-hover transition-colors"
            >
              <span className="theme-text-muted text-[10px] whitespace-nowrap mt-0.5">
                {formatNum(event.simTime, 2)}s
              </span>
              <div className="mt-0.5 shrink-0">{getSeverityBadge(event.severity)}</div>
              <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400/90 whitespace-nowrap mt-0.5">
                [{event.category}]
              </span>
              <div className="theme-text-primary text-[11px] leading-tight flex-1 font-sans">
                {event.message}
                {event.detail && (
                  <p className="theme-text-muted text-[10px] mt-0.5 font-sans">{event.detail}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

