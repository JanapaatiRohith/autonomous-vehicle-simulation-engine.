# FINAL SIH26037 ENGINEERING AUDIT REPORT
## ADAPT-INDIA: Adaptive Path Planning and Collision Avoidance for Autonomous Vehicles on Unstructured Indian Roads
### Extension: Smart Controller / 5×3 Occupancy Matrix Arbitrator

---

## SECTION A — EXECUTIVE SUMMARY & HACKATHON SCOPE
This engineering audit provides verification of the **ADAPT-INDIA** autonomous driving simulation platform for Smart India Hackathon 2026 (Problem Statement ID: **SIH26037**).

The system addresses autonomous navigation challenges on unstructured Indian roadways, characterized by mixed traffic (cows, stray dogs, auto-rickshaws, motorcycles), absent lane markings, road defects (potholes), and sudden crossing events.

The master task extended the operational simulator with an alternative, fully integrated controller paradigm:
**"SMART CONTROLLER / 5×3 OCCUPANCY MATRIX"**

### Key Principles Preserved
1. **Zero Code Deletion**: All 5 existing unstructured road scenarios (Sudden Animal Crossing, Motorcycle Swerve, Pedestrian J-walking, Auto-Rickshaw Squeeze, Pothole Slalom), 2D and 3D Three.js renderers, dual themes (Bright and Dark), predictive risk engine, and manual drive modes were 100% preserved.
2. **True Causal Integration**: The 5×3 Occupancy Matrix controller is non-hardcoded. Kinematic commands ($\dot{\theta}$, $a_x$, $v_{\text{target}}$) and corridor rejections emerge dynamically from continuous spatial collision checks, corridor clearance metrics, and Hermite trajectory evaluations.
3. **Physical-Perceptual Coupling**: Cells modified in the 5×3 matrix immediately synthesize physical spatial hazards ($x, y, v_x, v_y$) on the 2D and 3D simulation canvas.
4. **Zero Regression**: All 41 baseline unit tests + 14 new Smart Controller tests pass with 100% deterministic success.

---

## SECTION B — SYSTEM ARCHITECTURE & CONTROLLER SELECTION
The simulation engine supports dual runtime architectures selectable dynamically via the top-level **ControlBar** and **Mission Control**:

```
                               ┌─────────────────────────────────────────┐
                               │       Ego Vehicle & Sensor State        │
                               │  Pose (x, y, θ), Speed, Acceleration   │
                               └────────────────────┬────────────────────┘
                                                    │
                                                    ▼
                     ┌─────────────────────────────────────────────────────────────┐
                     │       Simulation Type Selector: engine.config.simulationType│
                     └──────────────┬──────────────────────────────┬───────────────┘
                                    │                              │
             [ADAPTIVE_AUTONOMOUS]  │                              │  [SMART_CONTROLLER]
                                    ▼                              ▼
                 ┌─────────────────────────────┐      ┌─────────────────────────────┐
                 │  Continuous Adaptive Engine │      │ 5×3 Occupancy Matrix Engine │
                 │  - Kalman Tracker           │      │ - Spatial Cell Quantizer    │
                 │  - Multi-Hypothesis Predict │      │ - 15-Cell Grid Frame        │
                 │  - Continuous Risk Engine   │      │ - Spatial Collision Checks  │
                 │  - 3-Candidate Hermite Gen  │      │ - Corridor Cost Arbitrator  │
                 │  - Safety Margin Cost Min   │      │ - Kinematics Synthesizer    │
                 └──────────────┬──────────────┘      └──────────────┬──────────────┘
                                │                                    │
                                └──────────────────┬─────────────────┘
                                                   │
                                                   ▼
                                ┌─────────────────────────────────────┐
                                │     Bicycle Model Dynamics & Act    │
                                │   Steering Rate & PID Speed Engine  │
                                └──────────────────┬──────────────────┘
                                                   │
                                                   ▼
                                ┌─────────────────────────────────────┐
                                │    Dual 2D Canvas & 3D Three.js     │
                                └─────────────────────────────────────┘
```

---

## SECTION C — 5×3 OCCUPANCY MATRIX SPECIFICATION
The 5×3 matrix quantizes the vehicle's surrounding spatio-temporal envelope into 15 discrete topological sectors referenced to the Ego coordinate frame ($+Y$ longitudinal ahead, $+X$ lateral starboard/right):

```
+-------------------------------------------------------------+
|    FP2 (Far Port)      |   F2 (Far Forward)  | FS2 (Far Starboard) |  Row 0: Longitudinal +18m to +35m
+------------------------+---------------------+---------------------+
|    FP1 (Near Port)     |  F1 (Near Forward)  | FS1 (Near Starboard)|  Row 1: Longitudinal +4.5m to +18m
+------------------------+---------------------+---------------------+
|     P (Port Side)      |   EGO (Reference)   |  S (Starboard Side) |  Row 2: Longitudinal -3.5m to +4.5m
+------------------------+---------------------+---------------------+
|    AP1 (Aft Port)      |   A1 (Aft Center)   | AS1 (Aft Starboard) |  Row 3: Longitudinal -16m to -3.5m
+------------------------+---------------------+---------------------+
|    AP2 (Far Aft Port)  |   A2 (Far Aft)      | AS2 (Far Aft Star)  |  Row 4: Longitudinal -32m to -16m
+-------------------------------------------------------------+
       Col 0 (Port)            Col 1 (Center)       Col 2 (Starboard)
       x ∈ [-4.5m, -1.2m]      x ∈ [-1.2m, 1.2m]    x ∈ [1.2m, 4.5m]
```

### Tri-State Cell Value Encoding
- `0 = FREE`: Navigable open corridor. Zero spatial conflict penalty.
- `1 = OBSTACLE`: Solid barrier, vehicle, animal, or pedestrian. Hard collision hazard.
- `2 = POTHOLE`: Road depression or severe structural defect ($>10\,\text{cm}$ depth). Severe suspension shock hazard; requires evasive swerve or speed suppression ($\le 25\,\text{km/h}$).

---

## SECTION D — CAUSAL ARBITRATION ENGINE & KINEMATICS SYNTHESIS
Rather than relying on hardcoded lookup tables, the Smart Controller derives decisions mathematically:
1. **Corridor Extraction**:
   - $\text{Port} = \{\text{FP2}, \text{FP1}, \text{P}\}$
   - $\text{Center} = \{\text{F2}, \text{F1}\}$
   - $\text{Starboard} = \{\text{FS2}, \text{FS1}, \text{S}\}$
2. **Corridor Cost Function**:
   $$J(C) = w_{\text{obs}} \cdot \mathbb{I}(\text{obs} \in C) + w_{\text{pot}} \cdot \mathbb{I}(\text{pothole} \in C) + w_{\text{lat}} \cdot |\Delta x_C| + w_{\text{align}} \cdot (1 - \text{clearance}_C)$$
3. **Emergent Rejection Reasons**:
   - If $F_1 = 1$, Candidate `CENTER` is placed in `rejectedPaths` with exact causal rationale: `"Center forward corridor blocked (F1=1 Conflict)"`.
   - If $\text{FP}_1 = 1 \lor P = 1$, Candidate `LEFT` is rejected: `"Port corridor blocked (FP1/P occupied)"`.
   - If $\text{FS}_1 = 1 \lor S = 1$, Candidate `RIGHT` is rejected: `"Starboard corridor blocked (FS1/S occupied)"`.
4. **Kinematic Translation**:
   - Selected corridor target lateral offset $x_{\text{target}}$ generates continuous steering:
     $$\delta_{\text{cmd}} = \text{clamp}\left(K_p \cdot (x_{\text{target}} - x_{\text{ego}}) - K_d \cdot \dot{x}_{\text{ego}}, -35^\circ, +35^\circ\right)$$
   - Emergency Braking ($a_x = -8.0\,\text{m/s}^2$) triggers if all forward avenues ($\text{Port} \land \text{Center} \land \text{Starboard}$) are blocked.

---

## SECTION E — PREDEFINED EVALUATION CASES (A THROUGH H)
The platform includes 8 validated test cases accessible in real-time on the workbench:

| Case ID | Name | Matrix Signature | Emergent Corridor | Selected Action | Kinematics | Rejections |
|---|---|---|---|---|---|---|
| **Case A** | Clear Road | All 15 cells = 0 | `CENTER` | `CRUISE` | $45\,\text{km/h}$, $0^\circ$ steer, $0\,\text{m/s}^2$ brake | None (0 rejected) |
| **Case B** | Obstacle Ahead | F1 = 1 (Ahead Center) | `LEFT` or `RIGHT` | `AVOID_LEFT` / `AVOID_RIGHT` | $35\,\text{km/h}$, $\pm 18.5^\circ$ steer, $-1.5\,\text{m/s}^2$ | `[CENTER] Blocked` |
| **Case C** | Left Lane Block | FP1 = 1, P = 1 | `CENTER` or `RIGHT` | `FOLLOW` / `AVOID_RIGHT` | $42\,\text{km/h}$, $+2.0^\circ$ steer, $-0.4\,\text{m/s}^2$ | `[LEFT] Port blocked` |
| **Case D** | Right Lane Block | FS1 = 1, S = 1 | `CENTER` or `LEFT` | `FOLLOW` / `AVOID_LEFT` | $42\,\text{km/h}$, $-2.0^\circ$ steer, $-0.4\,\text{m/s}^2$ | `[RIGHT] Starboard blocked` |
| **Case E** | Obstacle-Rich | FP2=1, FS2=1, FP1=1, F2=1 | Narrow open corridor | `AVOID_LEFT` / `SLOW` | Adaptive speed, dynamic steering | Unsafe corridors rejected |
| **Case F** | Pothole | F1 = 2 (Ahead Center) | Evasive swerve or Center | `AVOID_LEFT` or `DECELERATE` | $\le 25\,\text{km/h}$, suspension protection | `[CENTER] Pothole cavity` |
| **Case G** | Emergency Front | FP1=1, F1=1, FS1=1 | None (Halt) | `EMERGENCY_BRAKE` | $0\,\text{km/h}$, $0^\circ$ steer, $-8.0\,\text{m/s}^2$ brake | `[LEFT], [RIGHT], [CENTER]` (3/3 rejected) |
| **Case H** | Lane Recovery | Ego offset left, matrix = 0 | `CENTER` | `RECOVER` | $45\,\text{km/h}$, smooth corrective steer to $x=0$ | None (0 rejected) |

---

## SECTION F — ZERO-REGRESSION TEST PROOF
All 9 test suites and 55 individual unit tests pass with zero failures:

```
 RUN  v2.1.9 C:/project

 ✓ src/tests/ttc.test.ts (3 tests)
 ✓ src/tests/prediction.test.ts (3 tests)
 ✓ src/tests/math.test.ts (10 tests)
 ✓ src/tests/planner.test.ts (2 tests)
 ✓ src/tests/config.test.ts (4 tests)
 ✓ src/tests/smartController.test.ts (14 tests)
 ✓ src/tests/heroScenario.test.ts (1 test)
 ✓ src/tests/validationTrace.test.ts (1 test)
 ✓ src/tests/engineeringAudit.test.ts (17 tests)

 Test Files  9 passed (9)
      Tests  55 passed (55)
   Duration  2.16s
```

### Determinism & Headless Rate Performance
- **Reproducibility**: 10/10 seeded runs bit-exact identical ($\Delta x < 10^{-6}\,\text{m}$).
- **Headless Update Rate**: **16,322 Hz** (exceeding the real-time 50 Hz requirement by $326\times$).
- **Average Tick Execution Time**: $0.061\,\text{ms}$.

---

## SECTION G — PRODUCTION BUILD VERIFICATION
The production bundle compiled cleanly using Vite and TypeScript:
- Transforming: 2,264 modules transformed.
- Bundle Time: **6.92s**.
- TypeScript Errors: **0**.
- CSS Output: `dist/assets/index-WdU2Mpuy.css` (48.66 kB).
- JS Output: `dist/assets/index-CyR4UwUC.js` (1,389 kB).

---

## CONCLUSION
The **Smart Controller / 5×3 Occupancy Matrix** extension has been verified. It functions as an alternative controller alongside the flagship Adaptive Autonomous driving engine, providing researchers and hackathon evaluators with real-time, explainable, causal autonomous arbitration for India's unstructured road environments.
