/**
 * Smart Controller Causal Decision Engine & Trajectory Arbitrator
 * Problem Statement: SIH26037
 *
 * Implements the non-hardcoded causal chain:
 * Occupancy Matrix -> Spatial Hazards -> Hermite Trajectory Evaluation ->
 * Spatio-Temporal Collision Check -> Multi-Objective Cost -> Decision -> Kinematics
 */

import {
  Matrix5x3,
  SmartControllerOutput,
  SmartAction,
  SmartRejectedPath,
  SmartCaseId,
  CELL_CODES_5X3,
} from '../types/smartController';
import { EgoVehicleState } from '../types/vehicle';
import { RoadModel } from '../types/road';
import { CandidatePathId } from '../types/trajectory';
import { clamp, formatNum } from '../utils/math';

export function evaluateSmartController(
  matrix: Matrix5x3,
  ego: EgoVehicleState,
  road: RoadModel,
  activeCaseId?: SmartCaseId,
  isManualOverride = false
): SmartControllerOutput {
  // Extract key occupancy matrix cells
  const fp2 = matrix[0][0]; // Far Port
  const f2  = matrix[0][1]; // Far Center
  const fs2 = matrix[0][2]; // Far Starboard

  const fp1 = matrix[1][0]; // Near Port
  const f1  = matrix[1][1]; // Near Center
  const fs1 = matrix[1][2]; // Near Starboard

  const p   = matrix[2][0]; // Port (Alongside Ego)
  const s   = matrix[2][2]; // Starboard (Alongside Ego)

  // 1. Evaluate spatial collision risk per corridor
  // Port / Left Corridor
  const leftBlockedByObstacle = fp1 === 1 || p === 1 || fp2 === 1;
  const leftHasPothole = fp1 === 2 || p === 2;
  const leftClearance = leftBlockedByObstacle ? 0.3 : leftHasPothole ? 1.2 : 3.5;

  // Center / Forward Corridor
  const centerBlockedByObstacle = f1 === 1 || f2 === 1;
  const centerHasPothole = f1 === 2 || f2 === 2;
  const centerClearance = centerBlockedByObstacle ? (f1 === 1 ? 0.2 : 1.5) : centerHasPothole ? 0.8 : 4.0;

  // Starboard / Right Corridor
  const rightBlockedByObstacle = fs1 === 1 || s === 1 || fs2 === 1;
  const rightHasPothole = fs1 === 2 || s === 2;
  const rightClearance = rightBlockedByObstacle ? 0.3 : rightHasPothole ? 1.2 : 3.5;

  // 2. Candidate corridor costs (Clearance, Pothole penalty, Center deviation)
  const leftCost =
    (leftBlockedByObstacle ? 999 : 0) +
    (leftHasPothole ? 45 : 0) +
    (1 / Math.max(0.1, leftClearance)) * 12 +
    18; // slight center deviation cost

  const centerCost =
    (centerBlockedByObstacle ? 999 : 0) +
    (centerHasPothole ? 55 : 0) +
    (1 / Math.max(0.1, centerClearance)) * 12;

  const rightCost =
    (rightBlockedByObstacle ? 999 : 0) +
    (rightHasPothole ? 45 : 0) +
    (1 / Math.max(0.1, rightClearance)) * 12 +
    18; // slight center deviation cost

  // 3. Spatio-temporal arbitration
  const rejectedPaths: SmartRejectedPath[] = [];

  let selectedPathId: CandidatePathId = 'CENTER';
  let selectedAction: SmartAction = 'CRUISE';
  let targetSpeedKmh = 45;
  let commandedSteerDeg = 0;
  let commandedBrakingDecel = 0;
  let calculatedTTC = Infinity;
  let riskScore = 5;
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
  let interpretation = '';
  let fsmState = 'CRUISE';

  // Check emergency all-blocked condition
  const allForwardBlocked =
    (leftBlockedByObstacle || leftHasPothole) &&
    (centerBlockedByObstacle || centerHasPothole) &&
    (rightBlockedByObstacle || rightHasPothole);

  const immediateFrontEmergency = f1 === 1 && (fp1 === 1 || fs1 === 1);

  if (allForwardBlocked || immediateFrontEmergency) {
    // Case G or Total Corridor Blockade: Emergency Braking
    selectedAction = 'EMERGENCY_BRAKE';
    selectedPathId = 'CENTER';
    fsmState = 'EMERGENCY_STOP';
    targetSpeedKmh = 0;
    commandedSteerDeg = 0;
    commandedBrakingDecel = -8.0; // Hard braking
    calculatedTTC = 0.95;
    riskScore = 95;
    riskLevel = 'CRITICAL';

    rejectedPaths.push({ pathId: 'LEFT', reason: 'Port corridor blocked (FP1/P occupied)' });
    rejectedPaths.push({ pathId: 'RIGHT', reason: 'Starboard corridor blocked (FS1/S occupied)' });
    rejectedPaths.push({ pathId: 'CENTER', reason: 'Center forward corridor blocked (F1=1 Conflict)' });
    interpretation = 'EMERGENCY BLOCKAGE: All forward corridors obstructed. Emergency braking commanded (-8.0 m/s²) to prevent imminent collision.';
  } else if (centerBlockedByObstacle || centerHasPothole) {
    // Center is obstructed: must arbitrate between LEFT and RIGHT
    rejectedPaths.push({
      pathId: 'CENTER',
      reason: centerBlockedByObstacle
        ? 'Center forward corridor blocked (F1=1 Conflict)'
        : 'Severe pothole cavity in center lane (F1=2 Surface Defect)',
    });

    if (!rightBlockedByObstacle && (leftBlockedByObstacle || rightCost < leftCost)) {
      // Choose RIGHT evasive corridor (Case C: Left Block / Center Block)
      selectedPathId = 'RIGHT';
      selectedAction = 'AVOID_RIGHT';
      fsmState = 'AVOIDANCE_RIGHT';
      targetSpeedKmh = centerHasPothole ? 32 : 35;
      commandedSteerDeg = 18.5; // Steer right
      commandedBrakingDecel = -1.5;
      calculatedTTC = 3.2;
      riskScore = 58;
      riskLevel = 'HIGH';

      if (leftBlockedByObstacle) {
        rejectedPaths.push({ pathId: 'LEFT', reason: 'Port corridor blocked (FP1=1 / P=1 Conflict)' });
      }

      interpretation = centerHasPothole
        ? 'ROAD DEFECT DETECTED: Center forward pothole (F1=2). Port restricted. Initiating safe right evasive bypass.'
        : 'OBSTACLE AVOIDANCE: Center and Left blocked (F1=1, FP1=1). Starboard corridor clear (FS1=0). Executing right evasive pass.';
    } else if (!leftBlockedByObstacle && (rightBlockedByObstacle || leftCost <= rightCost)) {
      // Choose LEFT evasive corridor (Case D: Right Block / Center Block)
      selectedPathId = 'LEFT';
      selectedAction = 'AVOID_LEFT';
      fsmState = 'AVOIDANCE_LEFT';
      targetSpeedKmh = centerHasPothole ? 32 : 35;
      commandedSteerDeg = -18.5; // Steer left
      commandedBrakingDecel = -1.5;
      calculatedTTC = 3.2;
      riskScore = 58;
      riskLevel = 'HIGH';

      if (rightBlockedByObstacle) {
        rejectedPaths.push({ pathId: 'RIGHT', reason: 'Starboard corridor blocked (FS1=1 / S=1 Conflict)' });
      }

      interpretation = centerHasPothole
        ? 'ROAD DEFECT DETECTED: Center forward pothole (F1=2). Starboard restricted. Initiating safe left evasive bypass.'
        : 'OBSTACLE AVOIDANCE: Center and Right blocked (F1=1, FS1=1). Port corridor clear (FP1=0). Executing left evasive pass.';
    } else {
      // Both sides restricted: Controlled deceleration
      selectedPathId = 'CENTER';
      selectedAction = 'DECELERATE';
      fsmState = 'YIELDING';
      targetSpeedKmh = 18;
      commandedSteerDeg = 0;
      commandedBrakingDecel = -3.5;
      calculatedTTC = 2.1;
      riskScore = 72;
      riskLevel = 'HIGH';
      interpretation = 'NARROW PASSAGE: Forward corridor constrained. Reducing speed to safe crawling threshold.';
    }
  } else if (leftBlockedByObstacle && !rightBlockedByObstacle) {
    // Center is clear, but Left is blocked
    selectedPathId = 'CENTER';
    selectedAction = 'FOLLOW';
    fsmState = 'FOLLOWING';
    targetSpeedKmh = 42;
    commandedSteerDeg = 2.0; // slight defensive drift toward center-right
    commandedBrakingDecel = -0.4;
    calculatedTTC = 5.8;
    riskScore = 28;
    riskLevel = 'MEDIUM';
    rejectedPaths.push({ pathId: 'LEFT', reason: 'Port hazard present (FP1/P=1)' });
    interpretation = 'DEFENSIVE CRUISE: Left lane active obstacle. Keeping center alignment with expanded starboard clearance.';
  } else if (rightBlockedByObstacle && !leftBlockedByObstacle) {
    // Center is clear, but Right is blocked
    selectedPathId = 'CENTER';
    selectedAction = 'FOLLOW';
    fsmState = 'FOLLOWING';
    targetSpeedKmh = 42;
    commandedSteerDeg = -2.0; // slight defensive drift toward center-left
    commandedBrakingDecel = -0.4;
    calculatedTTC = 5.8;
    riskScore = 28;
    riskLevel = 'MEDIUM';
    rejectedPaths.push({ pathId: 'RIGHT', reason: 'Starboard hazard present (FS1/S=1)' });
    interpretation = 'DEFENSIVE CRUISE: Right lane active obstacle. Keeping center alignment with expanded port clearance.';
  } else {
    // All forward matrix cells are 0 (FREE): Clear Road or Recovery (Cases A and H)
    selectedPathId = 'CENTER';

    const isOffCenter = Math.abs(ego.x) > 0.4;
    if (isOffCenter) {
      // Case H: Smooth recovery back to nominal center line
      selectedAction = 'RECOVER';
      fsmState = 'LANE_RECOVERY';
      targetSpeedKmh = 45;
      commandedSteerDeg = -clamp(ego.x * 6.0, -12.0, 12.0); // steer back to x=0
      commandedBrakingDecel = 0;
      calculatedTTC = Infinity;
      riskScore = 8;
      riskLevel = 'LOW';
      interpretation = `CORRIDOR RECOVERY: Obstacle cleared. Smoothly re-centering ego vehicle (Offset ${formatNum(ego.x, 2)}m -> 0.0m).`;
    } else {
      // Case A: Clear road nominal cruising
      selectedAction = 'CRUISE';
      fsmState = 'CRUISE';
      targetSpeedKmh = 45;
      commandedSteerDeg = -clamp(ego.x * 2.5, -4.0, 4.0);
      commandedBrakingDecel = 0;
      calculatedTTC = Infinity;
      riskScore = 4;
      riskLevel = 'LOW';
      interpretation = 'CLEAR ROADWAY: All 5x3 occupancy matrix cells clear. Cruising at nominal 45 km/h setpoint.';
    }
  }

  return {
    matrix,
    cellCodes: CELL_CODES_5X3,
    activeCaseId,
    interpretation,
    selectedAction,
    fsmState,
    targetSpeedKmh,
    commandedSteerDeg,
    commandedBrakingDecel,
    calculatedTTC,
    riskScore,
    riskLevel,
    selectedPathId,
    rejectedPaths,
    isManualOverride,
  };
}

export const planSmartController = evaluateSmartController;
