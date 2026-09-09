import React from 'react';
import {
  Matrix5x3,
  MatrixCellValue,
  CELL_CODES_5X3,
  CELL_NAMES,
  CellCode,
} from '../../types/smartController';
import { Car, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';

interface SmartMatrixGridProps {
  matrix: Matrix5x3;
  onToggleCell?: (row: number, col: number) => void;
  interactive?: boolean;
}

export const SmartMatrixGrid: React.FC<SmartMatrixGridProps> = ({
  matrix,
  onToggleCell,
  interactive = true,
}) => {
  return (
    <div className="space-y-2 select-none">
      <div className="flex items-center justify-between text-[11px] font-mono theme-text-muted px-1">
        <span>PORT [P]</span>
        <span>FORWARD [F]</span>
        <span>STARBOARD [S]</span>
      </div>

      <div className="grid grid-rows-5 gap-1.5 p-2 rounded-xl theme-card border theme-border shadow-inner">
        {CELL_CODES_5X3.map((rowCodes, r) => (
          <div key={r} className="grid grid-cols-3 gap-1.5">
            {rowCodes.map((code, c) => {
              const val = matrix[r][c];
              const isEgo = r === 2 && c === 1;

              let cellStyle = '';
              let valBadge = '';

              if (isEgo) {
                cellStyle = 'bg-teal-500/20 border-teal-500/60 text-teal-700 dark:text-teal-300 ring-1 ring-teal-500/40 shadow-sm';
                valBadge = 'EGO';
              } else if (val === 1) {
                // Obstacle
                cellStyle = 'bg-rose-500/25 border-rose-500 text-rose-700 dark:text-rose-300 font-bold animate-pulse shadow-sm';
                valBadge = '1: OBS';
              } else if (val === 2) {
                // Pothole
                cellStyle = 'bg-amber-500/25 border-amber-500 text-amber-700 dark:text-amber-300 font-bold shadow-sm';
                valBadge = '2: POT';
              } else {
                // Free (0)
                cellStyle = 'theme-surface border-slate-200 dark:border-slate-800/80 theme-text-muted hover:border-teal-500/40';
                valBadge = '0: FREE';
              }

              return (
                <button
                  key={code}
                  type="button"
                  disabled={!interactive || isEgo}
                  onClick={() => onToggleCell && onToggleCell(r, c)}
                  title={`${code} (${CELL_NAMES[code]}): ${val === 1 ? 'Obstacle' : val === 2 ? 'Pothole' : 'Free'}. Click to toggle.`}
                  className={`relative p-2 rounded-lg border text-center transition-all flex flex-col items-center justify-between min-h-[58px] ${cellStyle} ${
                    interactive && !isEgo ? 'cursor-pointer hover:scale-[1.03] active:scale-[0.98]' : 'cursor-default'
                  }`}
                >
                  {/* Top code label */}
                  <div className="flex items-center justify-between w-full text-[10px] font-mono">
                    <span className="font-bold opacity-85">{code}</span>
                    {val === 1 ? (
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                    ) : val === 2 ? (
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/40" />
                    )}
                  </div>

                  {/* Middle icon / symbol */}
                  <div className="my-0.5">
                    {isEgo ? (
                      <Car className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    ) : val === 1 ? (
                      <span className="text-[12px]">🚗</span>
                    ) : val === 2 ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    ) : (
                      <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">•</span>
                    )}
                  </div>

                  {/* Bottom state label */}
                  <span className="text-[9px] font-mono tracking-tight font-semibold">
                    {valBadge}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend & quick helper */}
      <div className="flex items-center justify-between text-[10px] font-mono theme-text-muted pt-1 px-1">
        <span className="flex items-center space-x-1">
          <span className="w-2 h-2 rounded bg-emerald-500/50" />
          <span>0: Free</span>
        </span>
        <span className="flex items-center space-x-1">
          <span className="w-2 h-2 rounded bg-rose-500" />
          <span>1: Obstacle</span>
        </span>
        <span className="flex items-center space-x-1">
          <span className="w-2 h-2 rounded bg-amber-500" />
          <span>2: Pothole</span>
        </span>
        {interactive && (
          <span className="text-[9px] text-teal-600 dark:text-teal-400 font-bold">
            (Click cell to toggle)
          </span>
        )}
      </div>
    </div>
  );
};
