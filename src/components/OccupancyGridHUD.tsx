import React from 'react';
import { OccupancyGrid5x3 } from '../perception/occupancyGrid';
import { Grid, Car } from 'lucide-react';

interface OccupancyGridHUDProps {
  grid: OccupancyGrid5x3;
}

export const OccupancyGridHUD: React.FC<OccupancyGridHUDProps> = ({ grid }) => {
  const rowNames = ['FAR FRONT (20-40m)', 'MID FRONT (9-20m)', 'NEAR FRONT (2-9m)', 'SIDES (±2.5m)', 'REAR (-25 to -2m)'];

  const getCellColor = (isOccupied: boolean, riskLevel: string, isEgo: boolean) => {
    if (isEgo) return 'bg-teal-500/20 border-teal-500 text-teal-700 dark:text-teal-300 font-bold';
    if (!isOccupied) return 'theme-card border theme-border text-slate-400 dark:text-slate-600';

    switch (riskLevel) {
      case 'CRITICAL':
        return 'bg-rose-500/20 border-rose-500 text-rose-700 dark:text-rose-300 font-bold';
      case 'HIGH':
        return 'bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300 font-semibold';
      case 'MEDIUM':
        return 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-400';
      default:
        return 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-400';
    }
  };

  return (
    <div className="surface-dark rounded-xl p-4 space-y-3 shadow-automotive">
      <div className="flex items-center justify-between border-b theme-border pb-2.5">
        <div className="flex items-center space-x-2 theme-text-primary text-xs font-semibold tracking-wider">
          <Grid className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>5×3 LOCAL OCCUPANCY HUD</span>
        </div>
        <span className="text-[10px] font-telemetry theme-text-muted">EGO-CENTRIC FRAME</span>
      </div>

      <div className="grid grid-rows-5 gap-1.5 font-telemetry text-[10px]">
        {grid.map((rowCells, rIdx) => (
          <div key={rIdx} className="grid grid-cols-4 gap-1.5 items-center">
            {/* Row Label */}
            <div className="text-[9px] theme-text-muted truncate pr-1 font-sans">
              {rowNames[rIdx] || `R${rIdx}`}
            </div>

            {/* Columns (Left, Center, Right) */}
            {rowCells.map((cell, cIdx) => {
              const isEgo = rIdx === 3 && cIdx === 1;
              return (
                <div
                  key={cIdx}
                  className={`h-7 rounded border flex flex-col items-center justify-center text-center p-0.5 transition-colors ${getCellColor(
                    cell.isOccupied,
                    cell.riskLevel,
                    isEgo
                  )}`}
                >
                  {isEgo ? (
                    <div className="flex items-center space-x-1">
                      <Car className="w-3 h-3 text-teal-600 dark:text-teal-300" />
                      <span className="text-[9px] font-bold">EGO</span>
                    </div>
                  ) : cell.isOccupied ? (
                    <>
                      <span className="text-[8px] truncate leading-none font-sans font-semibold">{cell.actorType}</span>
                      <span className="text-[8px] font-bold theme-text-primary leading-none mt-0.5">
                        {cell.distance}m
                      </span>
                    </>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-700 text-[8px]">•</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Grid Footnote */}
      <div className="flex items-center justify-between text-[9px] font-telemetry theme-text-muted pt-1 border-t theme-border">
        <span>CORRIDORS: [LEFT, CENTER, RIGHT]</span>
        <span>AWARENESS SUBSYSTEM</span>
      </div>
    </div>
  );
};

