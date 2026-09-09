import { RiskLevel } from '../types/risk';
import { clamp } from '../utils/math';

/**
 * Calculates dynamic safety margin envelope around ego vehicle.
 * Expands as risk, uncertainty, and vehicle speed increase.
 */
export function calculateDynamicSafetyMargin(
  riskLevel: RiskLevel,
  speedMs: number,
  averageUncertainty = 0.3
): number {
  // Base physical clearance margin (m)
  const baseMargin = 1.6;

  // Speed-dependent expansion (0.08m per m/s of speed)
  const speedExpansion = speedMs * 0.08;

  // Risk-level dependent expansion
  let riskExpansion = 0.0;
  switch (riskLevel) {
    case 'LOW':
      riskExpansion = 0.0;
      break;
    case 'MEDIUM':
      riskExpansion = 0.8;
      break;
    case 'HIGH':
      riskExpansion = 1.7;
      break;
    case 'CRITICAL':
      riskExpansion = 2.8;
      break;
  }

  // Uncertainty expansion
  const uncertaintyExpansion = averageUncertainty * 1.2;

  const totalMargin = baseMargin + speedExpansion + riskExpansion + uncertaintyExpansion;
  return clamp(totalMargin, 1.5, 6.0);
}
