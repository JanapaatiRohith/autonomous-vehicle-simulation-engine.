import { RISK_THRESHOLDS, RiskLevel } from '../types/risk';

/**
 * Calculates Time to Collision (TTC) in seconds.
 * Returns Infinity if relative closing speed is non-positive (objects diverging or stationary relative).
 */
export function calculateTTC(distance: number, closingSpeed: number): number {
  if (closingSpeed <= 0.05) {
    return Infinity;
  }
  return Math.max(0, distance / closingSpeed);
}

/**
 * Categorizes a TTC value into a standardized safety risk level.
 */
export function classifyTTC(ttc: number): RiskLevel {
  if (ttc <= RISK_THRESHOLDS.TTC_CRITICAL) return 'CRITICAL';
  if (ttc <= RISK_THRESHOLDS.TTC_HIGH) return 'HIGH';
  if (ttc <= RISK_THRESHOLDS.TTC_MEDIUM) return 'MEDIUM';
  return 'LOW';
}
