# ADAPT-INDIA
### Adaptive Path Planning & Spatio-Temporal Collision Avoidance for Autonomous Vehicles on Unstructured Indian Roads
**Smart India Hackathon 2026 | Problem Statement ID: SIH26037**

---

## 📌 Executive Summary
**ADAPT-INDIA** is a high-fidelity, deterministic autonomous driving research and simulation platform built specifically for the chaos, density, and unpredictability of Indian roadway environments.

Unlike Western autonomous stacks that rely heavily on pristine lane markings, structured lane discipline, and predictable traffic, ADAPT-INDIA navigates:
- **Unstructured Road Corridors**: Missing or fading center lines, irregular asphalt edges, and variable road widths (6m to 14m).
- **Mixed & Highly Dynamic Traffic**: Stray cattle, dogs, high-agility motorcycles, three-wheel auto-rickshaws, and jaywalking pedestrians.
- **Surface Obstacles & Defects**: Deep potholes, bumps, road construction, and stalled vehicles.

---

## 🚀 Key Features

### 1. Dual Controller & Planning Architecture
Switch between two distinct autonomous controller paradigms directly in the UI:
1. **Adaptive Autonomous Driving**:
   - Continuous spatio-temporal risk-field engine.
   - Dynamic Kalman tracking with velocity uncertainty cones.
   - Multi-hypothesis trajectory prediction.
   - Quintic Hermite spline candidate trajectory generation (Left, Center, Right).
   - Multi-objective cost minimization balancing clearance, comfort, and progression.
2. **Smart Controller / 5×3 Occupancy Matrix Arbitrator**:
   - 15-cell topological grid referenced to the ego vehicle (Port, Forward, Starboard from -32m rear to +35m ahead).
   - Tri-state cell values: `0 = FREE`, `1 = OBSTACLE`, `2 = POTHOLE`.
   - Causal, non-hardcoded trajectory arbitration.
   - Predefined evaluation suite: **Cases A through H**.
   - Interactive cell toggling (`0 -> 1 -> 2 -> 0`) with live physical hazard synthesis in 2D and 3D.

### 2. Dual Realistic Renderers
- **3D Three.js Realistic Viewport**: Procedural 3D models of Sedans, SUVs, Auto-rickshaws, Motorcycles, Cattle, and Pedestrians with 3-axis camera controls (Chase, Top-Down, Orbit).
- **2D Sub-pixel Overhead Canvas**: Diagnostic view displaying lidar-like safety bubbles, sensor envelopes, and trajectory ribbons.

### 3. Dual Theme Design System
- **Bright Theme**: High-contrast, tailored ivory and slate styling optimized for presentation projectors and audit reviews.
- **Dark Theme**: Low-glare mission control deck for night telemetry and research monitoring.

### 4. Deterministic Physics & Audit Proof
- **Bit-Exact Reproducibility**: 100% identical outputs across seeded runs ($\Delta x < 10^{-6}\,\text{m}$).
- **Headless Performance**: Up to **16,000+ Hz** update rate (over $300\times$ faster than the 50 Hz real-time requirement).
- **Comprehensive Unit Testing**: 55 automated tests covering TTC, kinematics, prediction, planning, and matrix arbitration.

---

## 🏗️ 5×3 Occupancy Matrix Specification

```
+-------------------------------------------------------------+
|    FP2 (Far Port)      |   F2 (Far Forward)  | FS2 (Far Starboard) |  Row 0: +18m to +35m Ahead
+------------------------+---------------------+---------------------+
|    FP1 (Near Port)     |  F1 (Near Forward)  | FS1 (Near Starboard)|  Row 1: +4.5m to +18m Ahead
+------------------------+---------------------+---------------------+
|     P (Port Side)      |   EGO (Reference)   |  S (Starboard Side) |  Row 2: -3.5m to +4.5m Lateral
+------------------------+---------------------+---------------------+
|    AP1 (Aft Port)      |   A1 (Aft Center)   | AS1 (Aft Starboard) |  Row 3: -16m to -3.5m Rear
+------------------------+---------------------+---------------------+
|    AP2 (Far Aft Port)  |   A2 (Far Aft)      | AS2 (Far Aft Star)  |  Row 4: -32m to -16m Far Rear
+-------------------------------------------------------------+
       Col 0 (Port)            Col 1 (Center)       Col 2 (Starboard)
       x ∈ [-4.5m, -1.2m]      x ∈ [-1.2m, 1.2m]    x ∈ [1.2m, 4.5m]
```

---

## 🛠️ Quick Start & Local Execution

### Prerequisites
- Node.js (v18 or higher)
- npm or pnpm

### Installation
```bash
# Clone the repository
git clone https://github.com/JanapaatiRohith/adapt-india.git
cd adapt-india

# Install dependencies
npm install

# Start development server
npm run dev
```

Open your browser at `http://localhost:5173/`.

### Run Automated Tests
```bash
# Run all 55 Vitest unit tests
npm test
```

### Production Build
```bash
npm run build
```

---

## 📄 License & Attribution
Developed for Smart India Hackathon 2026.
Problem Statement: SIH26037 — Adaptive Path Planning and Collision Avoidance for Autonomous Vehicles on Unstructured Indian Roads.
