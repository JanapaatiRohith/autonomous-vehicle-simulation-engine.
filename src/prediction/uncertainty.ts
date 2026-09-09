import { ActorType } from '../types/obstacle';

export interface UncertaintyParams {
  baseSigmaX: number; // Lateral base uncertainty (m)
  baseSigmaY: number; // Longitudinal base uncertainty (m)
  growthRateX: number; // Growth factor with time
  growthRateY: number; // Growth factor with time
}

export const UNCERTAINTY_PROFILES: Record<ActorType, UncertaintyParams> = {
  PEDESTRIAN: { baseSigmaX: 0.4, baseSigmaY: 0.3, growthRateX: 0.7, growthRateY: 0.4 },
  ANIMAL: { baseSigmaX: 0.5, baseSigmaY: 0.4, growthRateX: 0.8, growthRateY: 0.5 },
  MOTORCYCLE: { baseSigmaX: 0.35, baseSigmaY: 0.4, growthRateX: 0.6, growthRateY: 0.45 },
  AUTO_RICKSHAW: { baseSigmaX: 0.3, baseSigmaY: 0.35, growthRateX: 0.5, growthRateY: 0.4 },
  CAR: { baseSigmaX: 0.2, baseSigmaY: 0.3, growthRateX: 0.35, growthRateY: 0.35 },
  TRUCK: { baseSigmaX: 0.15, baseSigmaY: 0.25, growthRateX: 0.2, growthRateY: 0.25 },
  BUS: { baseSigmaX: 0.15, baseSigmaY: 0.25, growthRateX: 0.2, growthRateY: 0.25 },
  STATIC_OBSTACLE: { baseSigmaX: 0.05, baseSigmaY: 0.05, growthRateX: 0.01, growthRateY: 0.01 },
  POTHOLE: { baseSigmaX: 0.02, baseSigmaY: 0.02, growthRateX: 0.005, growthRateY: 0.005 },
};

/**
 * Calculates the expanding uncertainty envelope radii at future time t (seconds).
 * Spatio-temporal dispersion grows non-linearly with prediction horizon.
 */
export function calculateUncertaintyEnvelope(
  type: ActorType,
  t: number,
  actorUncertaintyMultiplier = 1.0
): { sigmaX: number; sigmaY: number; radius: number } {
  const params = UNCERTAINTY_PROFILES[type] || UNCERTAINTY_PROFILES.CAR;
  const timeGrowth = Math.pow(Math.max(0, t), 1.15);

  const sigmaX = (params.baseSigmaX + params.growthRateX * timeGrowth) * (0.8 + 0.4 * actorUncertaintyMultiplier);
  const sigmaY = (params.baseSigmaY + params.growthRateY * timeGrowth) * (0.8 + 0.4 * actorUncertaintyMultiplier);
  const radius = Math.max(sigmaX, sigmaY);

  return { sigmaX, sigmaY, radius };
}
