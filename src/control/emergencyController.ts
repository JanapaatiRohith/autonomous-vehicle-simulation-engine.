import { VehicleState } from '../types/vehicle';
import { PlannerDecision } from '../types/trajectory';
import { RiskLevel } from '../types/risk';

/**
 * State machine managing ego vehicle operational modes and emergency recovery transitions.
 */
export function determineVehicleState(
  currentState: VehicleState,
  decision: PlannerDecision,
  currentSpeed: number,
  riskLevel: RiskLevel
): VehicleState {
  if (decision === 'EMERGENCY_BRAKE') {
    if (currentSpeed < 0.2) {
      return 'EMERGENCY_STOP';
    }
    return 'BRAKE';
  }

  // Handle recovery from full emergency stop
  if (currentState === 'EMERGENCY_STOP') {
    if (riskLevel === 'LOW' || riskLevel === 'MEDIUM') {
      return 'RECOVER';
    }
    return 'EMERGENCY_STOP'; // Keep stopped until hazard clears
  }

  if (currentState === 'RECOVER') {
    if (currentSpeed > 5.0 && riskLevel === 'LOW') {
      return 'CRUISE';
    }
    return 'RECOVER';
  }

  // Active avoidance
  if (decision === 'AVOID_LEFT' || decision === 'AVOID_RIGHT') {
    return 'AVOID';
  }

  // Braking / slowing down
  if (decision === 'BRAKE' || decision === 'SLOW_DOWN') {
    return 'BRAKE';
  }

  if (decision === 'FOLLOW') {
    return 'FOLLOW';
  }

  if (riskLevel === 'MEDIUM' || riskLevel === 'HIGH') {
    return 'CAUTIOUS';
  }

  return 'CRUISE';
}
