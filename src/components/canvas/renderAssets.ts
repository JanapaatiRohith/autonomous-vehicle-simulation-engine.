import { EgoVehicleState, VehicleModelType } from '../../types/vehicle';
import { RoadModel, Pothole } from '../../types/road';
import { SurroundingActor } from '../../types/obstacle';
import { CandidateTrajectory } from '../../types/trajectory';
import { ActorPrediction } from '../../types/prediction';
import { GlobalRiskState } from '../../types/risk';
import { getDrivableBounds } from '../../simulation/road';
import { formatNum } from '../../utils/math';

export type LightingPreset = 'DAYLIGHT' | 'OVERCAST' | 'EVENING';

export interface CameraState {
  x: number;
  y: number;
  zoom: number; // e.g. 1.0
}

/**
 * 1. REALISTIC ROAD & UNPAVED SHOULDER RENDERING
 * Implements asphalt texture, subtle aggregates, irregular dirt shoulders, roadside vegetation,
 * eroded road edges, faded centerlines, and wear patches.
 */
export function drawRoadSurface(
  ctx: CanvasRenderingContext2D,
  road: RoadModel,
  ego: EgoVehicleState,
  canvasWidth: number,
  canvasHeight: number,
  scale: number,
  toScreenX: (x: number) => number,
  toScreenY: (y: number) => number,
  lighting: LightingPreset
) {
  const yStart = ego.y - 35;
  const yEnd = ego.y + 90;

  // Background / Distant terrain & shoulder base
  let terrainColor = '#1c1917'; // warm stone/earth in daylight
  let asphaltBase = '#232730'; // natural dark charcoal asphalt
  let shoulderColor = '#292524'; // unpaved gravel verge

  if (lighting === 'OVERCAST') {
    terrainColor = '#1e2229';
    asphaltBase = '#1f232b';
    shoulderColor = '#252930';
  } else if (lighting === 'EVENING') {
    terrainColor = '#0f1117';
    asphaltBase = '#151922';
    shoulderColor = '#191b22';
  }

  // Draw terrain canvas fill
  ctx.fillStyle = terrainColor;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Draw unpaved shoulder strip extending 2m past road bounds
  ctx.fillStyle = shoulderColor;
  ctx.beginPath();
  for (let y = yStart; y <= yEnd; y += 4) {
    const bounds = getDrivableBounds(road, y);
    const sx = toScreenX(bounds.leftX - 1.8);
    const sy = toScreenY(y);
    if (y === yStart) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  }
  for (let y = yEnd; y >= yStart; y -= 4) {
    const bounds = getDrivableBounds(road, y);
    const sx = toScreenX(bounds.rightX + 1.8);
    const sy = toScreenY(y);
    ctx.lineTo(sx, sy);
  }
  ctx.closePath();
  ctx.fill();

  // Draw gravel shoulder texture (subtle stippling effect)
  ctx.strokeStyle = lighting === 'EVENING' ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let y = Math.floor(yStart); y <= yEnd; y += 10) {
    const bounds = getDrivableBounds(road, y);
    // left gravel dot
    ctx.strokeRect(toScreenX(bounds.leftX - 1.0), toScreenY(y), 2, 2);
    // right gravel dot
    ctx.strokeRect(toScreenX(bounds.rightX + 0.8), toScreenY(y + 3), 2, 2);
  }

  // Draw primary asphalt drivable corridor
  ctx.fillStyle = asphaltBase;
  ctx.beginPath();
  for (let y = yStart; y <= yEnd; y += 3) {
    const bounds = getDrivableBounds(road, y);
    const sx = toScreenX(bounds.leftX);
    const sy = toScreenY(y);
    if (y === yStart) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  }
  for (let y = yEnd; y >= yStart; y -= 3) {
    const bounds = getDrivableBounds(road, y);
    const sx = toScreenX(bounds.rightX);
    const sy = toScreenY(y);
    ctx.lineTo(sx, sy);
  }
  ctx.closePath();
  ctx.fill();

  // Subtle asphalt surface patches & wear lines
  ctx.fillStyle = lighting === 'EVENING' ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.08)';
  for (let y = Math.floor(yStart / 20) * 20; y <= yEnd; y += 22) {
    const bounds = getDrivableBounds(road, y);
    const patchX = toScreenX(bounds.leftX + 1.2 + (y % 3));
    const patchY = toScreenY(y);
    const patchW = 18 * (scale / 14);
    const patchH = 35 * (scale / 14);
    ctx.fillRect(patchX, patchY, patchW, patchH);
  }

  // Eroded natural road borders (irregular asphalt edge)
  ctx.strokeStyle = lighting === 'EVENING' ? '#2d3340' : '#3e4657';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Faded Indian centerline markings
  const confidence = road.segments[0]?.laneConfidence ?? 0.35;
  const alpha = Math.max(0.08, confidence * 0.55);
  ctx.strokeStyle = `rgba(241, 245, 249, ${alpha})`;
  ctx.lineWidth = 1.6 * (scale / 14);
  ctx.setLineDash([12 * (scale / 14), 16 * (scale / 14)]);

  ctx.beginPath();
  for (let y = yStart; y <= yEnd; y += 6) {
    const bounds = getDrivableBounds(road, y);
    const cx = (bounds.leftX + bounds.rightX) / 2;
    const sx = toScreenX(cx);
    const sy = toScreenY(y);
    if (y === yStart) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

/**
 * 2. REALISTIC POTHOLE RENDERING
 * Irregular dark asphalt cavity, inner shadow, depth impression, crack lines,
 * and subtle engineering detection badge.
 */
export function drawPotholes(
  ctx: CanvasRenderingContext2D,
  potholes: Pothole[],
  yStart: number,
  yEnd: number,
  scale: number,
  toScreenX: (x: number) => number,
  toScreenY: (y: number) => number
) {
  for (const pothole of potholes) {
    if (pothole.y < yStart || pothole.y > yEnd) continue;

    const px = toScreenX(pothole.x);
    const py = toScreenY(pothole.y);
    const radius = (pothole.diameter / 2) * scale;

    ctx.save();
    ctx.translate(px, py);

    // 1. Asphalt fracture outer perimeter (irregular polygon)
    ctx.fillStyle = '#161920';
    ctx.beginPath();
    const numPoints = 8;
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const r = radius * (1.1 + Math.sin(i * 2.5) * 0.15);
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    // 2. Inner deep cavity (rough texture & shadow)
    ctx.fillStyle = '#0a0c10';
    ctx.beginPath();
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const r = radius * (0.85 + Math.cos(i * 3.1) * 0.12);
      const x = Math.cos(angle) * r - 1;
      const y = Math.sin(angle) * r - 1;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    // 3. Depth contour gradient shadow
    const innerGrad = ctx.createRadialGradient(-2, -2, 1, 0, 0, radius);
    innerGrad.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
    innerGrad.addColorStop(1, 'rgba(30, 35, 45, 0.2)');
    ctx.fillStyle = innerGrad;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.85, 0, Math.PI * 2);
    ctx.fill();

    // 4. Subtle hazard highlight ring
    ctx.strokeStyle = pothole.severity === 'SEVERE' ? 'rgba(225, 29, 72, 0.65)' : 'rgba(217, 119, 6, 0.6)';
    ctx.lineWidth = 1.4;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(0, 0, radius + 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Depth label
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '9px monospace';
    ctx.fillText(`${pothole.depth}cm`, -12, -radius - 5);

    ctx.restore();
  }
}

/**
 * 3. REALISTIC EGO VEHICLE TOP-DOWN RENDERING
 * Distinguishes Sedan, SUV, and Compact EV with body silhouettes, tinted glass,
 * directional front wheels, LED headlights, brake lights, and headlights beam.
 */
export function drawEgoVehicle(
  ctx: CanvasRenderingContext2D,
  ego: EgoVehicleState,
  scale: number,
  toScreenX: (x: number) => number,
  toScreenY: (y: number) => number,
  lighting: LightingPreset
) {
  const ex = toScreenX(ego.x);
  const ey = toScreenY(ego.y);
  const l = ego.dimensions.length * scale;
  const w = ego.dimensions.width * scale;

  ctx.save();
  ctx.translate(ex, ey);
  // Heading: 0 rad = facing along +Y. Rotation around center.
  // In screen coords, positive Y is down, so +heading turns right.
  ctx.rotate(ego.heading);

  // --- A. Ground Soft Shadow (Ambient Occlusion) ---
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.ellipse(3, 4, (w / 2) * 1.1, (l / 2) * 1.05, 0, 0, Math.PI * 2);
  ctx.fill();

  // --- B. Headlight Projection Cones ---
  const beamLength = lighting === 'EVENING' ? 40 * scale : 25 * scale;
  const beamWidth = 14 * scale;
  const beamGrad = ctx.createLinearGradient(0, -l / 2, 0, -l / 2 - beamLength);

  if (lighting === 'EVENING') {
    beamGrad.addColorStop(0, 'rgba(255, 255, 240, 0.45)');
    beamGrad.addColorStop(0.3, 'rgba(255, 248, 220, 0.22)');
    beamGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  } else {
    beamGrad.addColorStop(0, 'rgba(240, 249, 255, 0.2)');
    beamGrad.addColorStop(0.5, 'rgba(240, 249, 255, 0.08)');
    beamGrad.addColorStop(1, 'rgba(240, 249, 255, 0)');
  }

  ctx.fillStyle = beamGrad;
  ctx.beginPath();
  ctx.moveTo(-w * 0.35, -l / 2);
  ctx.lineTo(-beamWidth / 2, -l / 2 - beamLength);
  ctx.lineTo(beamWidth / 2, -l / 2 - beamLength);
  ctx.lineTo(w * 0.35, -l / 2);
  ctx.closePath();
  ctx.fill();

  // --- C. Steered Front Wheels ---
  const wheelL = 0.85 * scale;
  const wheelW = 0.3 * scale;
  const steer = ego.steeringAngle;

  // Front-Left Wheel
  ctx.save();
  ctx.translate(-w / 2 + 1, -l * 0.32);
  ctx.rotate(steer);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-wheelW / 2, -wheelL / 2, wheelW, wheelL);
  ctx.restore();

  // Front-Right Wheel
  ctx.save();
  ctx.translate(w / 2 - 1, -l * 0.32);
  ctx.rotate(steer);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-wheelW / 2, -wheelL / 2, wheelW, wheelL);
  ctx.restore();

  // Rear-Left Wheel
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-w / 2 + 1 - wheelW / 2, l * 0.28 - wheelL / 2, wheelW, wheelL);
  // Rear-Right Wheel
  ctx.fillRect(w / 2 - 1 - wheelW / 2, l * 0.28 - wheelL / 2, wheelW, wheelL);

  // --- D. Vehicle Body Chassis ---
  let bodyColor = '#1e3a5f'; // Slate Navy Blue for Sedan
  let roofColor = '#14253d';

  if (ego.vehicleType === 'SUV') {
    bodyColor = '#2e3846'; // Graphite Charcoal for SUV
    roofColor = '#1e242e';
  } else if (ego.vehicleType === 'COMPACT_EV') {
    bodyColor = '#0f4c5c'; // Muted Teal for Compact EV
    roofColor = '#0a303b';
  }

  ctx.fillStyle = bodyColor;
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1.2;

  // Rounded chassis contour
  const r = 4;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -l / 2, w, l, [r, r, r, r]);
  ctx.fill();
  ctx.stroke();

  // --- E. Glass / Windshield & Roof Silhouette ---
  ctx.fillStyle = '#0b1320';
  // Front Windshield
  ctx.beginPath();
  ctx.moveTo(-w * 0.38, -l * 0.15);
  ctx.lineTo(-w * 0.32, -l * 0.32);
  ctx.lineTo(w * 0.32, -l * 0.32);
  ctx.lineTo(w * 0.38, -l * 0.15);
  ctx.closePath();
  ctx.fill();

  // Roof
  ctx.fillStyle = roofColor;
  ctx.fillRect(-w * 0.36, -l * 0.15, w * 0.72, l * 0.35);

  // Rear Window
  ctx.fillStyle = '#0b1320';
  ctx.beginPath();
  ctx.moveTo(-w * 0.36, l * 0.2);
  ctx.lineTo(-w * 0.3, l * 0.34);
  ctx.lineTo(w * 0.3, l * 0.34);
  ctx.lineTo(w * 0.36, l * 0.2);
  ctx.closePath();
  ctx.fill();

  // Side mirrors
  ctx.fillStyle = bodyColor;
  ctx.fillRect(-w / 2 - 3, -l * 0.25, 3, 4);
  ctx.fillRect(w / 2, -l * 0.25, 3, 4);

  // --- F. Headlights & Brake Lights ---
  // Front LED Headlights
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(-w * 0.42, -l / 2, 4, 3);
  ctx.fillRect(w * 0.42 - 4, -l / 2, 4, 3);

  // Rear Brake Lights (Illuminated brightly when braking)
  const isBraking = ego.acceleration < -1.0;
  ctx.fillStyle = isBraking ? '#ef4444' : '#991b1b';
  ctx.fillRect(-w * 0.42, l / 2 - 3, 5, 3);
  ctx.fillRect(w * 0.42 - 5, l / 2 - 3, 5, 3);

  if (isBraking) {
    // Brake light glow
    ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
    ctx.beginPath();
    ctx.arc(-w * 0.35, l / 2 + 2, 6, 0, Math.PI * 2);
    ctx.arc(w * 0.35, l / 2 + 2, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * 4. REALISTIC SURROUNDING VEHICLES & INDIAN ROAD ACTORS
 */
export function drawSurroundingActor(
  ctx: CanvasRenderingContext2D,
  actor: SurroundingActor,
  scale: number,
  toScreenX: (x: number) => number,
  toScreenY: (y: number) => number,
  lighting: LightingPreset
) {
  const ax = toScreenX(actor.x);
  const ay = toScreenY(actor.y);
  const l = actor.length * scale;
  const w = actor.width * scale;

  ctx.save();
  ctx.translate(ax, ay);
  ctx.rotate(actor.heading);

  // Ground shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.ellipse(2, 3, w * 0.55, l * 0.52, 0, 0, Math.PI * 2);
  ctx.fill();

  switch (actor.type) {
    case 'AUTO_RICKSHAW':
      drawAutoRickshaw(ctx, w, l);
      break;

    case 'MOTORCYCLE':
      drawMotorcycle(ctx, w, l, actor.speed);
      break;

    case 'PEDESTRIAN':
      drawPedestrian(ctx, w, l, actor.speed);
      break;

    case 'ANIMAL':
      drawAnimal(ctx, w, l, actor.speed);
      break;

    case 'TRUCK':
    case 'BUS':
      drawHeavyVehicle(ctx, w, l, actor.type);
      break;

    default: // Standard car / static vehicle
      drawStandardCar(ctx, w, l);
      break;
  }

  ctx.restore();

  // Speed & Type Badge (clean technical text)
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
  const label = `${actor.type.replace('_', ' ')} ${formatNum(actor.speed * 3.6, 0)} km/h`;
  ctx.fillText(label, ax - 24, ay - l / 2 - 5);
}

/**
 * Auto-Rickshaw Vector Model (Distinct Indian Three-Wheeler)
 */
function drawAutoRickshaw(ctx: CanvasRenderingContext2D, w: number, l: number) {
  // Classic Indian Green & Yellow CNG or Black & Yellow theme
  const roofColor = '#eab308'; // Indian auto yellow roof
  const bodyColor = '#15803d'; // CNG Green lower body

  // Tapered nose silhouette (three-wheel geometry)
  ctx.fillStyle = bodyColor;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(0, -l / 2); // Single front wheel center
  ctx.lineTo(w / 2, -l * 0.15);
  ctx.lineTo(w / 2, l / 2);
  ctx.lineTo(-w / 2, l / 2);
  ctx.lineTo(-w / 2, -l * 0.15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Windshield
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.moveTo(0, -l * 0.42);
  ctx.lineTo(w * 0.35, -l * 0.18);
  ctx.lineTo(-w * 0.35, -l * 0.18);
  ctx.closePath();
  ctx.fill();

  // Yellow Canvas Roof
  ctx.fillStyle = roofColor;
  ctx.beginPath();
  ctx.roundRect(-w * 0.42, -l * 0.15, w * 0.84, l * 0.6, [2, 2, 2, 2]);
  ctx.fill();

  // Rear Cabin Passenger Openings
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-w * 0.38, l * 0.28, w * 0.76, l * 0.16);

  // Single Front Wheel
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-2, -l / 2 - 2, 4, 6);
  // Rear Wheels
  ctx.fillRect(-w / 2 - 1, l * 0.25, 3, 8);
  ctx.fillRect(w / 2 - 2, l * 0.25, 3, 8);
}

/**
 * Motorcycle Vector Model with Seated Rider Silhouette
 */
function drawMotorcycle(ctx: CanvasRenderingContext2D, w: number, l: number, speed: number) {
  // Inline chassis frame
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, -l / 2);
  ctx.lineTo(0, l / 2);
  ctx.stroke();

  // Front Wheel
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-2, -l / 2 - 1, 4, 7);
  // Rear Wheel
  ctx.fillRect(-2, l / 2 - 6, 4, 7);

  // Fuel Tank & Handlebars
  ctx.fillStyle = '#dc2626'; // Red tank
  ctx.beginPath();
  ctx.ellipse(0, -l * 0.15, 3, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-w * 0.45, -l * 0.28);
  ctx.lineTo(w * 0.45, -l * 0.28);
  ctx.stroke();

  // Seated Rider (Head / Helmet and Shoulders)
  ctx.fillStyle = '#3b82f6'; // Jacket
  ctx.beginPath();
  ctx.ellipse(0, l * 0.05, 5, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f8fafc'; // Helmet
  ctx.beginPath();
  ctx.arc(0, -l * 0.05, 4, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Pedestrian Silhouette Model
 */
function drawPedestrian(ctx: CanvasRenderingContext2D, w: number, l: number, speed: number) {
  // Dynamic stride based on speed
  const stride = speed > 0.3 ? 4 : 1;

  // Legs
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-2, 0);
  ctx.lineTo(-2, stride);
  ctx.moveTo(2, 0);
  ctx.lineTo(2, -stride);
  ctx.stroke();

  // Torso / Shirt
  ctx.fillStyle = '#0284c7';
  ctx.beginPath();
  ctx.ellipse(0, 0, 5, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = '#fde047';
  ctx.beginPath();
  ctx.arc(0, 0, 3.2, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Animal / Cattle Quadruped Silhouette
 */
function drawAnimal(ctx: CanvasRenderingContext2D, w: number, l: number, speed: number) {
  // Cattle Body (Torso)
  ctx.fillStyle = '#d97706'; // Warm tan / brown cow
  ctx.beginPath();
  ctx.ellipse(0, 0, w * 0.45, l * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head and Horns
  ctx.fillStyle = '#b45309';
  ctx.beginPath();
  ctx.ellipse(0, -l * 0.38, w * 0.28, l * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();

  // Horns
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-w * 0.3, -l * 0.4);
  ctx.lineTo(-w * 0.45, -l * 0.48);
  ctx.moveTo(w * 0.3, -l * 0.4);
  ctx.lineTo(w * 0.45, -l * 0.48);
  ctx.stroke();

  // Four Legs
  ctx.fillStyle = '#78350f';
  ctx.fillRect(-w * 0.4, -l * 0.25, 2.5, 4);
  ctx.fillRect(w * 0.35, -l * 0.25, 2.5, 4);
  ctx.fillRect(-w * 0.4, l * 0.2, 2.5, 4);
  ctx.fillRect(w * 0.35, l * 0.2, 2.5, 4);
}

/**
 * Heavy Commercial Vehicle (Truck or Bus)
 */
function drawHeavyVehicle(ctx: CanvasRenderingContext2D, w: number, l: number, type: string) {
  const isBus = type === 'BUS';

  ctx.fillStyle = isBus ? '#2563eb' : '#b45309'; // Blue bus or Ochre/Orange truck
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.2;

  ctx.beginPath();
  ctx.roundRect(-w / 2, -l / 2, w, l, [3, 3, 3, 3]);
  ctx.fill();
  ctx.stroke();

  // Windshield
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-w * 0.44, -l / 2 + 2, w * 0.88, l * 0.12);

  if (isBus) {
    // Passenger windows along body
    ctx.fillStyle = '#0f172a';
    for (let y = -l * 0.28; y < l * 0.4; y += l * 0.15) {
      ctx.fillRect(-w * 0.46, y, 3, l * 0.1);
      ctx.fillRect(w * 0.46 - 3, y, 3, l * 0.1);
    }
  } else {
    // Truck open or tarpaulin cargo bed
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-w * 0.42, -l * 0.25, w * 0.84, l * 0.7);
  }
}

/**
 * Standard Passenger Car
 */
function drawStandardCar(ctx: CanvasRenderingContext2D, w: number, l: number) {
  ctx.fillStyle = '#475569';
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.roundRect(-w / 2, -l / 2, w, l, [4, 4, 4, 4]);
  ctx.fill();
  ctx.stroke();

  // Windshield & roof
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-w * 0.38, -l * 0.25, w * 0.76, l * 0.5);
  ctx.fillStyle = '#334155';
  ctx.fillRect(-w * 0.34, -l * 0.12, w * 0.68, l * 0.3);
}

/**
 * 5. CANDIDATE TRAJECTORIES & PREDICTED PATH RENDERING
 */
export function drawCandidateTrajectories(
  ctx: CanvasRenderingContext2D,
  candidates: Record<string, CandidateTrajectory> | undefined,
  selectedPathId: string | undefined,
  toScreenX: (x: number) => number,
  toScreenY: (y: number) => number
) {
  if (!candidates) return;

  const pathIds = ['LEFT', 'CENTER', 'RIGHT'];

  for (const id of pathIds) {
    const candidate = candidates[id];
    if (!candidate || !candidate.points || candidate.points.length === 0) continue;

    const isSelected = selectedPathId === id;

    ctx.beginPath();
    for (let i = 0; i < candidate.points.length; i++) {
      const pt = candidate.points[i];
      const sx = toScreenX(pt.x);
      const sy = toScreenY(pt.y);
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }

    if (isSelected) {
      // Selected Path: Refined Glowing Teal/Sky
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 3.2;
      ctx.stroke();
    } else if (candidate.status === 'BLOCKED') {
      // Blocked Path: Muted Rose/Coral dashed
      ctx.strokeStyle = 'rgba(225, 29, 72, 0.45)';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      // Safe alternate: Refined Soft Emerald dashed
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

/**
 * 6. PREDICTION ENVELOPE & UNCERTAINTY CORRIDOR
 */
export function drawPredictionEnvelopes(
  ctx: CanvasRenderingContext2D,
  predictions: Map<string, ActorPrediction> | undefined,
  actors: SurroundingActor[],
  scale: number,
  toScreenX: (x: number) => number,
  toScreenY: (y: number) => number
) {
  if (!predictions) return;

  for (const actor of actors) {
    const pred = predictions.get(actor.id);
    if (!pred || pred.waypoints.length === 0) continue;

    const sx = toScreenX(actor.x);
    const sy = toScreenY(actor.y);

    // Dotted future path centerline
    ctx.strokeStyle = 'rgba(217, 119, 6, 0.5)';
    ctx.lineWidth = 1.4;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    for (const wp of pred.waypoints) {
      ctx.lineTo(toScreenX(wp.x), toScreenY(wp.y));
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Translucent uncertainty envelope expansion
    for (let i = 2; i < pred.waypoints.length; i += 3) {
      const wp = pred.waypoints[i];
      const wpx = toScreenX(wp.x);
      const wpy = toScreenY(wp.y);
      const rx = wp.sigmaX * scale;
      const ry = wp.sigmaY * scale;

      ctx.fillStyle = 'rgba(217, 119, 6, 0.08)';
      ctx.strokeStyle = 'rgba(217, 119, 6, 0.25)';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.ellipse(wpx, wpy, Math.max(3, rx), Math.max(3, ry), wp.heading, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
}

/**
 * 7. DYNAMIC SAFETY MARGIN BUBBLE
 */
export function drawDynamicSafetyBubble(
  ctx: CanvasRenderingContext2D,
  ego: EgoVehicleState,
  riskState: GlobalRiskState,
  scale: number,
  toScreenX: (x: number) => number,
  toScreenY: (y: number) => number
) {
  const marginRadius = (riskState.dynamicSafetyMargin ?? 1.8) * scale;
  const egoScreenX = toScreenX(ego.x);
  const egoScreenY = toScreenY(ego.y);

  let fillColor = 'rgba(13, 148, 136, 0.06)'; // Muted teal
  let strokeColor = 'rgba(13, 148, 136, 0.35)';

  if (riskState.overallRiskLevel === 'CRITICAL') {
    fillColor = 'rgba(225, 29, 72, 0.12)';
    strokeColor = 'rgba(225, 29, 72, 0.5)';
  } else if (riskState.overallRiskLevel === 'HIGH') {
    fillColor = 'rgba(217, 119, 6, 0.1)';
    strokeColor = 'rgba(217, 119, 6, 0.45)';
  }

  ctx.fillStyle = fillColor;
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(egoScreenX, egoScreenY, marginRadius + (ego.dimensions.length / 2) * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

/**
 * 8. SCENARIO-SPECIFIC ENVIRONMENT & ROADSIDE ASSETS (2D)
 * Enhances visual identity of each scenario:
 * - UNMARKED_NARROW_ROAD: roadside eucalyptus trees, unpaved edge erosion, mud patches
 * - UNSIGNALIZED_JUNCTION: intersecting cross street road markings and pedestrian stop lines
 * - HIGHWAY_SLOW_VEHICLE: orange construction barricades, traffic cones, highway milepost markers
 * - DENSE_MARKET: colorful roadside market stalls with fabric awnings and fruit crates
 * - SUDDEN_CROSSING: roadside warning diamond signpost & dusk trees
 */
export function drawScenarioEnvironment(
  ctx: CanvasRenderingContext2D,
  scenarioId: string,
  road: RoadModel,
  ego: EgoVehicleState,
  scale: number,
  toScreenX: (x: number) => number,
  toScreenY: (y: number) => number
) {
  const yStart = ego.y - 30;
  const yEnd = ego.y + 80;
  const halfW = road.nominalWidth / 2;

  if (scenarioId === 'UNMARKED_NARROW_ROAD') {
    // Roadside trees and wooden fence markers
    for (let y = Math.floor(yStart / 18) * 18; y <= yEnd; y += 18) {
      const txL = toScreenX(-halfW - 2.8);
      const tyL = toScreenY(y);
      ctx.fillStyle = '#1e381b';
      ctx.beginPath();
      ctx.arc(txL, tyL, 16 * (scale / 14), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2f552a';
      ctx.beginPath();
      ctx.arc(txL, tyL, 11 * (scale / 14), 0, Math.PI * 2);
      ctx.fill();

      const txR = toScreenX(halfW + 2.8);
      const tyR = toScreenY(y + 9);
      ctx.fillStyle = '#1e381b';
      ctx.beginPath();
      ctx.arc(txR, tyR, 15 * (scale / 14), 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (scenarioId === 'UNSIGNALIZED_JUNCTION') {
    // 4-Way Cross street visual at y = 45m
    if (45 >= yStart && 45 <= yEnd) {
      const juncY = toScreenY(45);
      const juncH = 12 * scale;
      ctx.fillStyle = '#1e232c';
      ctx.fillRect(0, juncY - juncH / 2, 2000, juncH);

      // White cross-walk dashes
      ctx.fillStyle = 'rgba(241, 245, 249, 0.6)';
      for (let x = -halfW; x <= halfW; x += 1.2) {
        ctx.fillRect(toScreenX(x), juncY - juncH / 2 - 4, 0.7 * scale, 3);
        ctx.fillRect(toScreenX(x), juncY + juncH / 2 + 1, 0.7 * scale, 3);
      }
    }
  } else if (scenarioId === 'HIGHWAY_SLOW_VEHICLE') {
    // Traffic cones along lane taper at y = 35 to 70m
    for (let y = 35; y <= 70; y += 6) {
      if (y >= yStart && y <= yEnd) {
        const cx = toScreenX(halfW - 1.2);
        const cy = toScreenY(y);
        ctx.fillStyle = '#f97316'; // orange cone
        ctx.beginPath();
        ctx.arc(cx, cy, 5 * (scale / 14), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx, cy, 2.5 * (scale / 14), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (scenarioId === 'DENSE_MARKET') {
    // Roadside market stalls with colorful awnings
    const stallColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
    for (let y = Math.floor(yStart / 14) * 14; y <= yEnd; y += 14) {
      const c1 = stallColors[Math.abs(Math.floor(y / 14)) % stallColors.length];
      ctx.fillStyle = c1;
      const s1X = toScreenX(-halfW - 2.2);
      const s1Y = toScreenY(y);
      ctx.fillRect(s1X, s1Y - 8, 20 * (scale / 14), 16 * (scale / 14));

      const c2 = stallColors[(Math.abs(Math.floor(y / 14)) + 2) % stallColors.length];
      ctx.fillStyle = c2;
      const s2X = toScreenX(halfW + 0.6);
      const s2Y = toScreenY(y + 7);
      ctx.fillRect(s2X, s2Y - 8, 20 * (scale / 14), 16 * (scale / 14));
    }
  } else if (scenarioId === 'SUDDEN_CROSSING') {
    // Cattle crossing signpost at y = 18m
    if (18 >= yStart && 18 <= yEnd) {
      const sx = toScreenX(halfW + 1.8);
      const sy = toScreenY(18);
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(-7, -7, 14, 14);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-7, -7, 14, 14);
      ctx.restore();
    }
  }
}

