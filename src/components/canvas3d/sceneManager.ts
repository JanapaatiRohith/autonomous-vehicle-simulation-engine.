import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SimulationEngine } from '../../simulation/engine';
import { SurroundingActor } from '../../types/obstacle';
import { EgoVehicleState } from '../../types/vehicle';
import { CandidateTrajectory } from '../../types/trajectory';
import { Pothole } from '../../types/road';

export type CameraViewMode = 'CHASE' | 'TOP_DOWN' | 'ORBIT';

export interface Scene3DOptions {
  antialias?: boolean;
}

/**
 * Procedural 3D Scene Manager for ADAPT-INDIA Autonomous Driving Simulation.
 * Translates 2D simulation coordinates (x: lateral, y: longitudinal) to 3D space:
 * - 3D X = Simulation X (Right = +X, Left = -X)
 * - 3D Y = Height above road (Up = +Y)
 * - 3D Z = Simulation Y (Forward = +Z)
 */
export class Simulation3DScene {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public controls: OrbitControls;

  public cameraMode: CameraViewMode = 'CHASE';

  // Scene elements
  private roadGroup: THREE.Group;
  private roadMesh: THREE.Mesh | null = null;
  private shoulderLeftMesh: THREE.Mesh | null = null;
  private shoulderRightMesh: THREE.Mesh | null = null;
  private markingsGroup: THREE.Group;
  private sceneryGroup: THREE.Group;
  private potholesGroup: THREE.Group;

  // Dynamic actors
  private egoGroup: THREE.Group;
  private egoLiDAR: THREE.Mesh;
  private egoBrakeLights: THREE.Mesh[] = [];
  private egoHeadlightSpots: THREE.SpotLight[] = [];
  private safetyBubbleMesh: THREE.Mesh;

  private actorMeshes: Map<string, THREE.Group> = new Map();
  private trajectoryRibbonsGroup: THREE.Group;
  private predictionVolumesGroup: THREE.Group;

  // Environment & Lights
  private ambientLight: THREE.AmbientLight;
  private dirLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;

  // State tracking
  private currentRoadWidth: number = 10.0;
  private currentScenarioId: string = '';
  private currentScenarioEnv: string = '';

  // Camera smooth damp tracking
  private camFollowPos = new THREE.Vector3(0, 4.5, -12);
  private camFollowTarget = new THREE.Vector3(0, 1.2, 8);

  constructor(container: HTMLElement, options: Scene3DOptions = {}) {
    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0c1017');
    this.scene.fog = new THREE.FogExp2(0x0c1017, 0.008);

    // 2. Camera
    const aspect = container.clientWidth / Math.max(1, container.clientHeight);
    this.camera = new THREE.PerspectiveCamera(52, aspect, 0.2, 500);
    this.camera.position.set(0, 5, -12);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: options.antialias ?? true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    container.appendChild(this.renderer.domElement);

    // 4. Orbit Controls (for ORBIT mode)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05; // Don't clip under ground
    this.controls.minDistance = 3.0;
    this.controls.maxDistance = 120.0;
    this.controls.enabled = false; // Disabled by default in CHASE mode

    // 5. Lighting
    this.ambientLight = new THREE.AmbientLight(0xdbeafe, 0.85);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 0.6);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xfffaed, 1.6);
    this.dirLight.position.set(25, 45, -20);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 1;
    this.dirLight.shadow.camera.far = 150;
    const shadowD = 40;
    this.dirLight.shadow.camera.left = -shadowD;
    this.dirLight.shadow.camera.right = shadowD;
    this.dirLight.shadow.camera.top = shadowD;
    this.dirLight.shadow.camera.bottom = -shadowD;
    this.dirLight.shadow.bias = -0.0005;
    this.scene.add(this.dirLight);

    // 6. Terrain Ground Plane
    const groundGeo = new THREE.PlaneGeometry(300, 500);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x161c24,
      roughness: 0.95,
      metalness: 0.05,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.08;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // 7. Groups
    this.roadGroup = new THREE.Group();
    this.markingsGroup = new THREE.Group();
    this.sceneryGroup = new THREE.Group();
    this.potholesGroup = new THREE.Group();
    this.trajectoryRibbonsGroup = new THREE.Group();
    this.predictionVolumesGroup = new THREE.Group();

    this.scene.add(this.roadGroup);
    this.scene.add(this.markingsGroup);
    this.scene.add(this.sceneryGroup);
    this.scene.add(this.potholesGroup);
    this.scene.add(this.trajectoryRibbonsGroup);
    this.scene.add(this.predictionVolumesGroup);

    // 8. Build Ego Vehicle Model
    const { group: egoGroup, lidar, brakeLights, headlights } = this.buildEgoVehicleModel();
    this.egoGroup = egoGroup;
    this.egoLiDAR = lidar;
    this.egoBrakeLights = brakeLights;
    this.egoHeadlightSpots = headlights;
    this.scene.add(this.egoGroup);

    // 9. Dynamic Safety Bubble (Ring on ground around ego)
    const bubbleGeo = new THREE.RingGeometry(1.8, 2.1, 48);
    const bubbleMat = new THREE.MeshBasicMaterial({
      color: 0x14b8a6,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.55,
    });
    this.safetyBubbleMesh = new THREE.Mesh(bubbleGeo, bubbleMat);
    this.safetyBubbleMesh.rotation.x = -Math.PI / 2;
    this.safetyBubbleMesh.position.y = 0.03;
    this.scene.add(this.safetyBubbleMesh);

    // Initial road mesh construction
    this.rebuildRoadMesh(this.currentRoadWidth);
  }

  // =========================================================================
  // ROAD GENERATION & DYNAMIC WIDTH SCALING
  // =========================================================================

  public rebuildRoadMesh(roadWidthM: number) {
    this.currentRoadWidth = roadWidthM;

    // Clear existing road meshes
    while (this.roadGroup.children.length > 0) {
      const child = this.roadGroup.children[0] as THREE.Mesh;
      this.roadGroup.remove(child);
      child.geometry?.dispose();
      if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
      else child.material?.dispose();
    }
    while (this.markingsGroup.children.length > 0) {
      const child = this.markingsGroup.children[0] as THREE.Mesh;
      this.markingsGroup.remove(child);
      child.geometry?.dispose();
      if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
      else child.material?.dispose();
    }

    const roadLength = 350; // Long road stretch centered around vehicle
    const halfW = roadWidthM / 2;

    // 1. Asphalt Main Surface
    const roadGeo = new THREE.PlaneGeometry(roadWidthM, roadLength, 1, 1);
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x222731, // realistic dark slate asphalt
      roughness: 0.88,
      metalness: 0.12,
    });
    this.roadMesh = new THREE.Mesh(roadGeo, roadMat);
    this.roadMesh.rotation.x = -Math.PI / 2;
    this.roadMesh.position.set(0, 0, roadLength / 2 - 40);
    this.roadMesh.receiveShadow = true;
    this.roadGroup.add(this.roadMesh);

    // 2. Unpaved Dirt Shoulders (Extending 3.0m on left and right)
    const shoulderW = 3.2;
    const shoulderGeo = new THREE.PlaneGeometry(shoulderW, roadLength);
    const shoulderMat = new THREE.MeshStandardMaterial({
      color: 0x362c24, // gravel / red-brown Indian roadside mud & dirt
      roughness: 0.95,
      metalness: 0.05,
    });

    // Left shoulder
    this.shoulderLeftMesh = new THREE.Mesh(shoulderGeo, shoulderMat);
    this.shoulderLeftMesh.rotation.x = -Math.PI / 2;
    this.shoulderLeftMesh.position.set(-halfW - shoulderW / 2, -0.01, roadLength / 2 - 40);
    this.shoulderLeftMesh.receiveShadow = true;
    this.roadGroup.add(this.shoulderLeftMesh);

    // Right shoulder
    this.shoulderRightMesh = new THREE.Mesh(shoulderGeo, shoulderMat);
    this.shoulderRightMesh.rotation.x = -Math.PI / 2;
    this.shoulderRightMesh.position.set(halfW + shoulderW / 2, -0.01, roadLength / 2 - 40);
    this.shoulderRightMesh.receiveShadow = true;
    this.roadGroup.add(this.shoulderRightMesh);

    // 3. Centerline & Border Markings
    const markMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc, opacity: 0.8, transparent: true });
    const edgeMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, opacity: 0.75, transparent: true }); // Yellow edge line

    // Dashed Centerline (Only if road is wide enough: >= 7m)
    if (roadWidthM >= 7.0) {
      const dashLength = 4.0;
      const gapLength = 4.0;
      const dashWidth = 0.16;
      for (let z = -20; z < roadLength - 20; z += dashLength + gapLength) {
        const dashGeo = new THREE.PlaneGeometry(dashWidth, dashLength);
        const dashMesh = new THREE.Mesh(dashGeo, markMat);
        dashMesh.rotation.x = -Math.PI / 2;
        dashMesh.position.set(0, 0.01, z);
        this.markingsGroup.add(dashMesh);
      }
    }

    // Outer Boundary Lines (Left and Right edges of asphalt)
    const edgeLineWidth = 0.15;
    const leftEdgeGeo = new THREE.PlaneGeometry(edgeLineWidth, roadLength);
    const leftEdgeMesh = new THREE.Mesh(leftEdgeGeo, edgeMat);
    leftEdgeMesh.rotation.x = -Math.PI / 2;
    leftEdgeMesh.position.set(-halfW + 0.12, 0.01, roadLength / 2 - 40);
    this.markingsGroup.add(leftEdgeMesh);

    const rightEdgeGeo = new THREE.PlaneGeometry(edgeLineWidth, roadLength);
    const rightEdgeMesh = new THREE.Mesh(rightEdgeGeo, edgeMat);
    rightEdgeMesh.rotation.x = -Math.PI / 2;
    rightEdgeMesh.position.set(halfW - 0.12, 0.01, roadLength / 2 - 40);
    this.markingsGroup.add(rightEdgeMesh);
  }

  // =========================================================================
  // ENVIRONMENT SCENERY BUILDER (SCENARIO-SPECIFIC ASSETS)
  // =========================================================================

  public buildScenarioScenery(scenarioId: string, roadWidthM: number) {
    if (this.currentScenarioEnv === scenarioId && this.currentRoadWidth === roadWidthM) return;
    this.currentScenarioEnv = scenarioId;

    // Clear existing scenery
    while (this.sceneryGroup.children.length > 0) {
      const obj = this.sceneryGroup.children[0];
      this.sceneryGroup.remove(obj);
    }

    const halfW = roadWidthM / 2;

    switch (scenarioId) {
      case 'UNMARKED_NARROW_ROAD':
      case 'rural_single_lane':
        // Rural road: Thatched huts, eucalyptus/acacia trees, fence posts
        this.ambientLight.color.setHex(0xfef3c7);
        this.scene.fog?.color.setHex(0x1a1a1e);
        this.buildRuralScenery(halfW);
        break;

      case 'DENSE_MARKET':
      case 'dense_urban_market':
        // Dense market: Colorful roadside stalls, awnings, lamp posts, merchandise crates
        this.ambientLight.color.setHex(0xe2e8f0);
        this.scene.fog?.color.setHex(0x0f172a);
        this.buildMarketScenery(halfW);
        break;

      case 'HIGHWAY_SLOW_VEHICLE':
      case 'highway_merge_workzone':
        // Highway: Crash barriers, orange traffic cones, steel light masts, warning signs
        this.ambientLight.color.setHex(0xffffff);
        this.scene.fog?.color.setHex(0x111827);
        this.buildHighwayScenery(halfW);
        break;

      case 'UNSIGNALIZED_JUNCTION':
      case 'four_way_junction':
        // Junction: Cross street, traffic poles, corner shops
        this.ambientLight.color.setHex(0xf1f5f9);
        this.scene.fog?.color.setHex(0x0b1120);
        this.buildJunctionScenery(halfW);
        break;

      case 'SUDDEN_CROSSING':
      case 'sudden_crossing_animal':
      default:
        // Hero scenario: Twilight/dusk atmosphere, roadside vegetation, street posts
        this.ambientLight.color.setHex(0xfdba74); // sunset tint
        this.dirLight.color.setHex(0xffedd5);
        this.scene.fog?.color.setHex(0x18101e);
        this.buildHeroScenery(halfW);
        break;
    }
  }

  private buildRuralScenery(halfW: number) {
    // Trees along left and right
    for (let z = 0; z < 250; z += 24) {
      const treeLeft = this.createTree(1.8 + Math.sin(z) * 0.5);
      treeLeft.position.set(-halfW - 5.5 - (z % 5) * 0.4, 0, z);
      this.sceneryGroup.add(treeLeft);

      const treeRight = this.createTree(2.0 + Math.cos(z) * 0.4);
      treeRight.position.set(halfW + 5.5 + (z % 7) * 0.4, 0, z + 12);
      this.sceneryGroup.add(treeRight);

      // Add wooden fence posts
      if (z % 16 === 0) {
        const post = this.createFencePost();
        post.position.set(-halfW - 3.4, 0, z);
        this.sceneryGroup.add(post);
      }
    }

    // Add a rural roadside hut
    const hut = this.createRuralHut();
    hut.position.set(halfW + 8.5, 0, 45);
    hut.rotation.y = -Math.PI / 4;
    this.sceneryGroup.add(hut);
  }

  private buildMarketScenery(halfW: number) {
    // Roadside market stalls with colorful canopies
    const canopyColors = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0x8b5cf6];
    for (let z = 10; z < 180; z += 18) {
      const stallLeft = this.createMarketStall(canopyColors[(z / 18) % canopyColors.length]);
      stallLeft.position.set(-halfW - 2.8, 0, z);
      stallLeft.rotation.y = Math.PI / 2;
      this.sceneryGroup.add(stallLeft);

      const stallRight = this.createMarketStall(canopyColors[((z / 18) + 2) % canopyColors.length]);
      stallRight.position.set(halfW + 2.8, 0, z + 9);
      stallRight.rotation.y = -Math.PI / 2;
      this.sceneryGroup.add(stallRight);

      // Street lamp
      const lamp = this.createStreetLamp();
      lamp.position.set(-halfW - 3.8, 0, z + 15);
      this.sceneryGroup.add(lamp);
    }
  }

  private buildHighwayScenery(halfW: number) {
    // Metal highway guardrails on both sides
    for (let z = 0; z < 250; z += 6) {
      const railLeft = this.createGuardrailPost();
      railLeft.position.set(-halfW - 0.5, 0, z);
      this.sceneryGroup.add(railLeft);

      const railRight = this.createGuardrailPost();
      railRight.position.set(halfW + 0.5, 0, z);
      this.sceneryGroup.add(railRight);

      // Highway high-mast lights every 36m
      if (z % 36 === 0) {
        const mast = this.createHighwayLightMast();
        mast.position.set(halfW + 3.5, 0, z);
        this.sceneryGroup.add(mast);
      }
    }

    // Construction Zone Barricades & Traffic Cones around z = 40 to 75
    for (let z = 40; z <= 75; z += 5) {
      const cone = this.createTrafficCone();
      cone.position.set(halfW - 1.2, 0, z);
      this.sceneryGroup.add(cone);
    }
  }

  private buildJunctionScenery(halfW: number) {
    // Cross street plane at z = 45
    const crossGeo = new THREE.PlaneGeometry(45, 12);
    const crossMat = new THREE.MeshStandardMaterial({ color: 0x222731, roughness: 0.9 });
    const cross = new THREE.Mesh(crossGeo, crossMat);
    cross.rotation.x = -Math.PI / 2;
    cross.position.set(0, 0.005, 45);
    this.sceneryGroup.add(cross);

    // Corner traffic poles
    const pole1 = this.createStreetLamp();
    pole1.position.set(-halfW - 2.5, 0, 36);
    this.sceneryGroup.add(pole1);

    const pole2 = this.createStreetLamp();
    pole2.position.set(halfW + 2.5, 0, 54);
    this.sceneryGroup.add(pole2);
  }

  private buildHeroScenery(halfW: number) {
    // Natural trees and roadside warning signage
    for (let z = 0; z < 220; z += 20) {
      const treeL = this.createTree(2.2);
      treeL.position.set(-halfW - 5.0, 0, z);
      this.sceneryGroup.add(treeL);

      const treeR = this.createTree(1.9);
      treeR.position.set(halfW + 5.0, 0, z + 10);
      this.sceneryGroup.add(treeR);
    }

    // Add animal crossing warning signpost at z = 18
    const sign = this.createWarningSign('CATTLE_CROSSING');
    sign.position.set(halfW + 2.2, 0, 18);
    this.sceneryGroup.add(sign);
  }

  // Scenery Asset Helpers
  private createTree(scale: number = 2.0): THREE.Group {
    const tree = new THREE.Group();
    const trunkGeo = new THREE.CylinderGeometry(0.22 * scale, 0.3 * scale, 2.2 * scale, 7);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x452f20, roughness: 0.9 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1.1 * scale;
    trunk.castShadow = true;
    tree.add(trunk);

    const folMat = new THREE.MeshStandardMaterial({ color: 0x2d4a22, roughness: 0.8 });
    const folGeo1 = new THREE.ConeGeometry(1.6 * scale, 2.5 * scale, 7);
    const fol1 = new THREE.Mesh(folGeo1, folMat);
    fol1.position.y = 2.8 * scale;
    fol1.castShadow = true;
    tree.add(fol1);

    const folGeo2 = new THREE.ConeGeometry(1.2 * scale, 2.0 * scale, 7);
    const fol2 = new THREE.Mesh(folGeo2, folMat);
    fol2.position.y = 4.0 * scale;
    fol2.castShadow = true;
    tree.add(fol2);

    return tree;
  }

  private createRuralHut(): THREE.Group {
    const hut = new THREE.Group();
    const wallGeo = new THREE.BoxGeometry(4.5, 2.4, 4.0);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xa88764, roughness: 0.95 });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.y = 1.2;
    wall.castShadow = true;
    hut.add(wall);

    const roofGeo = new THREE.ConeGeometry(3.6, 2.0, 4);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x78562d, roughness: 0.9 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 3.2;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    hut.add(roof);

    return hut;
  }

  private createMarketStall(canopyColor: number): THREE.Group {
    const stall = new THREE.Group();
    const baseGeo = new THREE.BoxGeometry(2.6, 1.0, 1.8);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.5;
    stall.add(base);

    const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.4, 4);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x737373 });
    [[-1.2, -0.8], [1.2, -0.8], [-1.2, 0.8], [1.2, 0.8]].forEach(([px, pz]) => {
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(px, 1.2, pz);
      stall.add(pole);
    });

    const canopyGeo = new THREE.BoxGeometry(2.8, 0.08, 2.2);
    const canopyMat = new THREE.MeshStandardMaterial({ color: canopyColor, roughness: 0.6 });
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 2.3, 0);
    canopy.rotation.x = 0.15;
    stall.add(canopy);

    return stall;
  }

  private createStreetLamp(): THREE.Group {
    const lamp = new THREE.Group();
    const mastGeo = new THREE.CylinderGeometry(0.08, 0.12, 6.0, 8);
    const mastMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7 });
    const mast = new THREE.Mesh(mastGeo, mastMat);
    mast.position.y = 3.0;
    lamp.add(mast);

    const headGeo = new THREE.BoxGeometry(0.4, 0.15, 0.8);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 6.0, 0.3);
    lamp.add(head);

    return lamp;
  }

  private createHighwayLightMast(): THREE.Group {
    const mast = new THREE.Group();
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.22, 10.0, 8);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 5.0;
    mast.add(pole);
    return mast;
  }

  private createGuardrailPost(): THREE.Group {
    const rail = new THREE.Group();
    const postGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 6);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7 });
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.y = 0.4;
    rail.add(post);

    const beamGeo = new THREE.BoxGeometry(0.06, 0.25, 6.0);
    const beam = new THREE.Mesh(beamGeo, postMat);
    beam.position.set(0, 0.55, 0);
    rail.add(beam);
    return rail;
  }

  private createTrafficCone(): THREE.Group {
    const cone = new THREE.Group();
    const baseGeo = new THREE.BoxGeometry(0.4, 0.05, 0.4);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x1f2937 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.025;
    cone.add(base);

    const bodyGeo = new THREE.ConeGeometry(0.18, 0.75, 12);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf97316 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.4;
    cone.add(body);
    return cone;
  }

  private createFencePost(): THREE.Group {
    const post = new THREE.Group();
    const postGeo = new THREE.CylinderGeometry(0.06, 0.08, 1.2, 6);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
    const mesh = new THREE.Mesh(postGeo, postMat);
    mesh.position.y = 0.6;
    post.add(mesh);
    return post;
  }

  private createWarningSign(type: string): THREE.Group {
    const sign = new THREE.Group();
    const postGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.5, 6);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x64748b });
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.y = 1.25;
    sign.add(post);

    const boardGeo = new THREE.BoxGeometry(0.8, 0.8, 0.04);
    const boardMat = new THREE.MeshStandardMaterial({ color: 0xfacc15 });
    const board = new THREE.Mesh(boardGeo, boardMat);
    board.position.set(0, 2.2, 0);
    board.rotation.z = Math.PI / 4; // Diamond shape warning
    sign.add(board);
    return sign;
  }

  // =========================================================================
  // DETAILED PROCEDURAL VEHICLE MODELS
  // =========================================================================

  private buildEgoVehicleModel(): {
    group: THREE.Group;
    lidar: THREE.Mesh;
    brakeLights: THREE.Mesh[];
    headlights: THREE.SpotLight[];
  } {
    const ego = new THREE.Group();

    // 1. Lower Chassis
    const chassisGeo = new THREE.BoxGeometry(1.85, 0.55, 4.4);
    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // Modern electric blue metallic
      metalness: 0.6,
      roughness: 0.35,
    });
    const chassis = new THREE.Mesh(chassisGeo, chassisMat);
    chassis.position.y = 0.45;
    chassis.castShadow = true;
    ego.add(chassis);

    // 2. Cabin / Glass Greenhouse
    const cabinGeo = new THREE.BoxGeometry(1.5, 0.62, 2.4);
    const cabinMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.8,
      roughness: 0.1,
    });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 0.95, -0.2);
    cabin.castShadow = true;
    ego.add(cabin);

    // 3. Autonomous Sensor Pod on Roof (LiDAR Puck)
    const lidarGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.22, 16);
    const lidarMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4, // glowing cyan sensor puck
      emissive: 0x0891b2,
      emissiveIntensity: 0.6,
      metalness: 0.8,
    });
    const lidar = new THREE.Mesh(lidarGeo, lidarMat);
    lidar.position.set(0, 1.38, -0.2);
    ego.add(lidar);

    // 4. Four Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 16);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
    const wheelPositions = [
      [-0.95, 0.35, 1.4],
      [0.95, 0.35, 1.4],
      [-0.95, 0.35, -1.4],
      [0.95, 0.35, -1.4],
    ];
    wheelPositions.forEach(([wx, wy, wz]) => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, wy, wz);
      wheel.castShadow = true;
      ego.add(wheel);
    });

    // 5. Headlights & Spotlights projecting on road forward (+Z direction)
    const headMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });
    const hlLeftMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.05), headMat);
    hlLeftMesh.position.set(-0.65, 0.55, 2.21);
    ego.add(hlLeftMesh);

    const hlRightMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.05), headMat);
    hlRightMesh.position.set(0.65, 0.55, 2.21);
    ego.add(hlRightMesh);

    const spotLeft = new THREE.SpotLight(0xffffff, 2.2, 45, Math.PI / 6, 0.4);
    spotLeft.position.set(-0.65, 0.6, 2.2);
    spotLeft.target.position.set(-0.65, 0, 15);
    ego.add(spotLeft);
    ego.add(spotLeft.target);

    const spotRight = new THREE.SpotLight(0xffffff, 2.2, 45, Math.PI / 6, 0.4);
    spotRight.position.set(0.65, 0.6, 2.2);
    spotRight.target.position.set(0.65, 0, 15);
    ego.add(spotRight);
    ego.add(spotRight.target);

    // 6. Brake Lights at rear (-Z direction)
    const brakeMat = new THREE.MeshBasicMaterial({ color: 0x991b1b });
    const blLeft = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.05), brakeMat);
    blLeft.position.set(-0.65, 0.55, -2.21);
    ego.add(blLeft);

    const blRight = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.05), brakeMat);
    blRight.position.set(0.65, 0.55, -2.21);
    ego.add(blRight);

    return {
      group: ego,
      lidar,
      brakeLights: [blLeft, blRight],
      headlights: [spotLeft, spotRight],
    };
  }

  /**
   * Procedural Model: Iconic Indian Auto-Rickshaw (Bajaj 3-Wheeler)
   */
  private createAutoRickshawModel(): THREE.Group {
    const auto = new THREE.Group();

    // 1. Lower chassis (Dark green / black)
    const lowerGeo = new THREE.BoxGeometry(1.3, 0.6, 2.6);
    const lowerMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.6 }); // deep green
    const lower = new THREE.Mesh(lowerGeo, lowerMat);
    lower.position.y = 0.45;
    lower.castShadow = true;
    auto.add(lower);

    // 2. Yellow distinctive rounded roof canopy
    const roofGeo = new THREE.BoxGeometry(1.26, 0.55, 2.4);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.5 }); // vibrant auto yellow
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 1.25, -0.05);
    roof.castShadow = true;
    auto.add(roof);

    // 3. Front Windscreen Glass
    const screenGeo = new THREE.BoxGeometry(1.1, 0.45, 0.06);
    const screenMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(0, 1.05, 1.15);
    auto.add(screen);

    // 4. Wheels: 1 front wheel (center), 2 rear wheels
    const wheelGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.18, 14);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x18181b });

    const frontWheel = new THREE.Mesh(wheelGeo, wheelMat);
    frontWheel.rotation.z = Math.PI / 2;
    frontWheel.position.set(0, 0.25, 1.05);
    frontWheel.castShadow = true;
    auto.add(frontWheel);

    const rearWheelL = new THREE.Mesh(wheelGeo, wheelMat);
    rearWheelL.rotation.z = Math.PI / 2;
    rearWheelL.position.set(-0.68, 0.25, -0.85);
    rearWheelL.castShadow = true;
    auto.add(rearWheelL);

    const rearWheelR = new THREE.Mesh(wheelGeo, wheelMat);
    rearWheelR.rotation.z = Math.PI / 2;
    rearWheelR.position.set(0.68, 0.25, -0.85);
    rearWheelR.castShadow = true;
    auto.add(rearWheelR);

    // Single headlight
    const hlMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 12), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
    hlMesh.rotation.x = Math.PI / 2;
    hlMesh.position.set(0, 0.65, 1.32);
    auto.add(hlMesh);

    return auto;
  }

  /**
   * Procedural Model: Motorcycle / Scooter with Rider
   */
  private createMotorcycleModel(): THREE.Group {
    const bike = new THREE.Group();

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.12, 14);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x18181b });

    const frontWheel = new THREE.Mesh(wheelGeo, wheelMat);
    frontWheel.rotation.z = Math.PI / 2;
    frontWheel.position.set(0, 0.3, 0.85);
    frontWheel.castShadow = true;
    bike.add(frontWheel);

    const rearWheel = new THREE.Mesh(wheelGeo, wheelMat);
    rearWheel.rotation.z = Math.PI / 2;
    rearWheel.position.set(0, 0.3, -0.85);
    rearWheel.castShadow = true;
    bike.add(rearWheel);

    // Frame & Fuel Tank
    const frameGeo = new THREE.BoxGeometry(0.26, 0.35, 1.2);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.6 }); // red bike
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(0, 0.5, 0);
    bike.add(frame);

    // Handlebars
    const barGeo = new THREE.BoxGeometry(0.7, 0.04, 0.04);
    const bar = new THREE.Mesh(barGeo, new THREE.MeshStandardMaterial({ color: 0x94a3b8 }));
    bar.position.set(0, 0.95, 0.7);
    bike.add(bar);

    // Seated Rider (Torso + Helmet)
    const riderTorsoGeo = new THREE.BoxGeometry(0.42, 0.55, 0.3);
    const riderTorsoMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a }); // blue jacket
    const riderTorso = new THREE.Mesh(riderTorsoGeo, riderTorsoMat);
    riderTorso.position.set(0, 0.98, -0.1);
    riderTorso.rotation.x = 0.2; // leaning slightly forward
    riderTorso.castShadow = true;
    bike.add(riderTorso);

    // Helmet
    const helmetGeo = new THREE.SphereGeometry(0.18, 12, 12);
    const helmetMat = new THREE.MeshStandardMaterial({ color: 0xf97316 }); // safety orange helmet
    const helmet = new THREE.Mesh(helmetGeo, helmetMat);
    helmet.position.set(0, 1.42, 0.02);
    helmet.castShadow = true;
    bike.add(helmet);

    return bike;
  }

  /**
   * Procedural Model: Indian Stray Cattle / Cow
   */
  private createCattleModel(): THREE.Group {
    const cow = new THREE.Group();

    // Body
    const bodyGeo = new THREE.BoxGeometry(0.9, 0.9, 1.9);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xd6c7b2, roughness: 0.9 }); // light brown / white hide
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.95;
    body.castShadow = true;
    cow.add(body);

    // Head
    const headGeo = new THREE.BoxGeometry(0.5, 0.55, 0.65);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.set(0, 1.25, 1.15);
    head.castShadow = true;
    cow.add(head);

    // Horns
    const hornGeo = new THREE.ConeGeometry(0.06, 0.35, 6);
    const hornMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
    const hornL = new THREE.Mesh(hornGeo, hornMat);
    hornL.rotation.z = -Math.PI / 4;
    hornL.position.set(-0.25, 1.58, 1.15);
    cow.add(hornL);

    const hornR = new THREE.Mesh(hornGeo, hornMat);
    hornR.rotation.z = Math.PI / 4;
    hornR.position.set(0.25, 1.58, 1.15);
    cow.add(hornR);

    // 4 Legs
    const legGeo = new THREE.CylinderGeometry(0.09, 0.08, 0.75, 6);
    const legPositions = [
      [-0.32, 0.38, 0.65],
      [0.32, 0.38, 0.65],
      [-0.32, 0.38, -0.65],
      [0.32, 0.38, -0.65],
    ];
    legPositions.forEach(([lx, ly, lz]) => {
      const leg = new THREE.Mesh(legGeo, bodyMat);
      leg.position.set(lx, ly, lz);
      leg.castShadow = true;
      cow.add(leg);
    });

    return cow;
  }

  /**
   * Procedural Model: Pedestrian in Indian Attire
   */
  private createPedestrianModel(): THREE.Group {
    const ped = new THREE.Group();

    // Torso (Kurta / Shirt)
    const torsoGeo = new THREE.BoxGeometry(0.42, 0.65, 0.26);
    const torsoMat = new THREE.MeshStandardMaterial({ color: 0x059669 }); // emerald kurta
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 1.12;
    torso.castShadow = true;
    ped.add(torso);

    // Head
    const headGeo = new THREE.SphereGeometry(0.14, 10, 10);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x9a6b4a });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.62;
    head.castShadow = true;
    ped.add(head);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.15, 0.78, 0.2);
    const legMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9 }); // white dhoti/pants
    const legL = new THREE.Mesh(legGeo, legMat);
    legL.position.set(-0.11, 0.4, 0);
    ped.add(legL);

    const legR = new THREE.Mesh(legGeo, legMat);
    legR.position.set(0.11, 0.4, 0);
    ped.add(legR);

    return ped;
  }

  /**
   * Procedural Model: Indian Commercial Truck / Bus
   */
  private createTruckModel(): THREE.Group {
    const truck = new THREE.Group();

    // Cabin
    const cabGeo = new THREE.BoxGeometry(2.3, 2.2, 2.2);
    const cabMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 }); // Tata truck orange/yellow
    const cab = new THREE.Mesh(cabGeo, cabMat);
    cab.position.set(0, 1.6, 2.2);
    cab.castShadow = true;
    truck.add(cab);

    // Windshield
    const wsGeo = new THREE.BoxGeometry(2.0, 0.8, 0.05);
    const wsMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });
    const ws = new THREE.Mesh(wsGeo, wsMat);
    ws.position.set(0, 2.0, 3.32);
    truck.add(ws);

    // Cargo Body
    const cargoGeo = new THREE.BoxGeometry(2.4, 2.2, 4.8);
    const cargoMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.6 }); // blue cargo container
    const cargo = new THREE.Mesh(cargoGeo, cargoMat);
    cargo.position.set(0, 1.7, -1.3);
    cargo.castShadow = true;
    truck.add(cargo);

    // 6 Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.32, 16);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111827 });
    const wheelPositions = [
      [-1.15, 0.48, 2.2],
      [1.15, 0.48, 2.2],
      [-1.15, 0.48, -1.2],
      [1.15, 0.48, -1.2],
      [-1.15, 0.48, -2.6],
      [1.15, 0.48, -2.6],
    ];
    wheelPositions.forEach(([wx, wy, wz]) => {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, wy, wz);
      w.castShadow = true;
      truck.add(w);
    });

    return truck;
  }

  /**
   * Procedural Model: Surrounding Sedan Car
   */
  private createSedanModel(): THREE.Group {
    const car = new THREE.Group();
    const chassisGeo = new THREE.BoxGeometry(1.8, 0.6, 4.2);
    const chassisMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.5 });
    const chassis = new THREE.Mesh(chassisGeo, chassisMat);
    chassis.position.y = 0.48;
    car.add(chassis);

    const cabinGeo = new THREE.BoxGeometry(1.4, 0.55, 2.2);
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 0.95, -0.2);
    car.add(cabin);

    const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 14);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x18181b });
    [[-0.9, 0.32, 1.2], [0.9, 0.32, 1.2], [-0.9, 0.32, -1.2], [0.9, 0.32, -1.2]].forEach(([x, y, z]) => {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(x, y, z);
      car.add(w);
    });

    return car;
  }

  // =========================================================================
  // 3D TRAJECTORY RIBBONS & PREDICTION VOLUMES
  // =========================================================================

  private updateTrajectoryRibbons(
    candidates?: CandidateTrajectory[],
    selectedPathId?: string
  ) {
    // Clear previous ribbons
    while (this.trajectoryRibbonsGroup.children.length > 0) {
      const m = this.trajectoryRibbonsGroup.children[0] as THREE.Mesh;
      this.trajectoryRibbonsGroup.remove(m);
      m.geometry?.dispose();
    }

    if (!candidates || candidates.length === 0) return;

    candidates.forEach(cand => {
      const isSelected = cand.id === selectedPathId;
      const isBlocked = cand.status === 'BLOCKED' || cand.status === 'HIGH_RISK';

      let color = 0x10b981; // emerald (safe)
      let opacity = 0.4;
      let width = 0.35;

      if (isSelected) {
        color = 0x06b6d4; // bright glowing cyan for selected path
        opacity = 0.95;
        width = 0.55;
      } else if (isBlocked) {
        color = 0xef4444; // crimson red for blocked
        opacity = 0.5;
        width = 0.28;
      }

      // Convert candidate points to 3D curve
      const points: THREE.Vector3[] = cand.points.map(
        wp => new THREE.Vector3(wp.x, 0.05, wp.y)
      );

      if (points.length < 2) return;

      const curve = new THREE.CatmullRomCurve3(points);
      const tubeGeo = new THREE.TubeGeometry(curve, 32, width / 2, 8, false);
      const tubeMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
      });

      const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
      this.trajectoryRibbonsGroup.add(tubeMesh);
    });
  }

  private updatePredictionVolumes(actors: SurroundingActor[]) {
    // Clear previous predictions
    while (this.predictionVolumesGroup.children.length > 0) {
      const m = this.predictionVolumesGroup.children[0] as THREE.Mesh;
      this.predictionVolumesGroup.remove(m);
      m.geometry?.dispose();
    }

    actors.forEach(actor => {
      const speed = Math.hypot(actor.vx, actor.vy);
      if (speed > 0.5) {
        const horizonSec = 2.5;
        const targetX = actor.x + actor.vx * horizonSec;
        const targetZ = actor.y + actor.vy * horizonSec;

        const dir = new THREE.Vector3(targetX - actor.x, 0, targetZ - actor.y);
        const dist = dir.length();
        if (dist > 1.0) {
          const coneGeo = new THREE.ConeGeometry(0.8, dist, 12);
          const coneMat = new THREE.MeshBasicMaterial({
            color: 0xf59e0b, // Amber uncertainty cone
            transparent: true,
            opacity: 0.25,
            wireframe: true,
          });
          const cone = new THREE.Mesh(coneGeo, coneMat);

          cone.position.set(actor.x + dir.x * 0.5, 0.1, actor.y + dir.z * 0.5);
          cone.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            dir.clone().normalize()
          );
          this.predictionVolumesGroup.add(cone);
        }
      }
    });
  }

  // =========================================================================
  // POTHOLE MESHES
  // =========================================================================

  private updatePotholes(potholes: Pothole[]) {
    if (this.potholesGroup.children.length !== potholes.length) {
      while (this.potholesGroup.children.length > 0) {
        const p = this.potholesGroup.children[0] as THREE.Mesh;
        this.potholesGroup.remove(p);
        p.geometry?.dispose();
      }

      potholes.forEach(ph => {
        const radius = ph.diameter / 2;
        const geo = new THREE.CylinderGeometry(radius, radius * 0.8, 0.08, 16);
        const mat = new THREE.MeshStandardMaterial({
          color: 0x090b0e,
          roughness: 0.98,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(ph.x, 0.02, ph.y);

        const rimGeo = new THREE.RingGeometry(radius, radius + 0.1, 16);
        const rimMat = new THREE.MeshBasicMaterial({
          color: 0xef4444,
          transparent: true,
          opacity: 0.6,
          side: THREE.DoubleSide,
        });
        const rim = new THREE.Mesh(rimGeo, rimMat);
        rim.rotation.x = -Math.PI / 2;
        rim.position.y = 0.04;
        mesh.add(rim);

        this.potholesGroup.add(mesh);
      });
    }
  }

  // =========================================================================
  // MAIN FRAME UPDATE & CAMERA MODES
  // =========================================================================

  public update(engine: SimulationEngine, dt: number) {
    const ego = engine.ego;
    const road = engine.road;
    const risk = engine.riskState;

    // Check if road width changed dynamically
    if (Math.abs(road.nominalWidth - this.currentRoadWidth) > 0.01) {
      this.rebuildRoadMesh(road.nominalWidth);
    }

    // Check if scenario environment changed
    this.buildScenarioScenery(engine.scenario.id, road.nominalWidth);

    // 1. Update Ego Vehicle Pose
    this.egoGroup.position.set(ego.x, 0, ego.y);
    this.egoGroup.rotation.y = -ego.heading;

    this.egoLiDAR.rotation.y += 0.25;

    // Update Brake Lights
    const isBraking = ego.acceleration < -1.0;
    const brakeColor = isBraking ? 0xef4444 : 0x450a0a;
    this.egoBrakeLights.forEach(bl => {
      (bl.material as THREE.MeshBasicMaterial).color.setHex(brakeColor);
    });

    // 2. Update Dynamic Safety Bubble
    const bubbleRadius = Math.max(1.8, risk.dynamicSafetyMargin);
    this.safetyBubbleMesh.position.set(ego.x, 0.03, ego.y);
    this.safetyBubbleMesh.scale.set(bubbleRadius / 2.0, bubbleRadius / 2.0, 1);

    const bubbleMat = this.safetyBubbleMesh.material as THREE.MeshBasicMaterial;
    if (risk.overallRiskLevel === 'CRITICAL') {
      bubbleMat.color.setHex(0xef4444);
      bubbleMat.opacity = 0.85;
    } else if (risk.overallRiskLevel === 'HIGH') {
      bubbleMat.color.setHex(0xf97316);
      bubbleMat.opacity = 0.7;
    } else if (risk.overallRiskLevel === 'MEDIUM') {
      bubbleMat.color.setHex(0xf59e0b);
      bubbleMat.opacity = 0.55;
    } else {
      bubbleMat.color.setHex(0x14b8a6);
      bubbleMat.opacity = 0.4;
    }

    // 3. Update Dynamic Surrounding Actors
    this.updateActors(engine.actors);

    // 4. Update Trajectory Ribbons & Prediction Cones
    this.updateTrajectoryRibbons(
      engine.plannerOutput?.candidates ? Object.values(engine.plannerOutput.candidates) : [],
      engine.plannerOutput?.selectedPathId
    );
    this.updatePredictionVolumes(engine.actors);

    // 5. Update Potholes
    this.updatePotholes(road.potholes);

    // 6. Update Directional Sun Light position to follow vehicle
    this.dirLight.position.set(ego.x + 25, 45, ego.y - 20);
    this.dirLight.target.position.set(ego.x, 0, ego.y + 20);
    this.dirLight.target.updateMatrixWorld();

    // 7. Camera Controls & View Mode
    if (this.cameraMode === 'CHASE') {
      this.controls.enabled = false;

      const camDist = 11.5;
      const camHeight = 4.2;
      const lookAhead = 10.0;

      const targetCamX = ego.x - Math.sin(-ego.heading) * camDist;
      const targetCamZ = ego.y - Math.cos(-ego.heading) * camDist;

      this.camFollowPos.x += (targetCamX - this.camFollowPos.x) * 0.12;
      this.camFollowPos.y = camHeight;
      this.camFollowPos.z += (targetCamZ - this.camFollowPos.z) * 0.12;

      this.camera.position.copy(this.camFollowPos);

      const targetLookX = ego.x + Math.sin(-ego.heading) * lookAhead;
      const targetLookZ = ego.y + Math.cos(-ego.heading) * lookAhead;
      this.camFollowTarget.x += (targetLookX - this.camFollowTarget.x) * 0.15;
      this.camFollowTarget.y = 1.1;
      this.camFollowTarget.z += (targetLookZ - this.camFollowTarget.z) * 0.15;

      this.camera.lookAt(this.camFollowTarget);

    } else if (this.cameraMode === 'TOP_DOWN') {
      this.controls.enabled = false;
      this.camera.position.set(ego.x, 38.0, ego.y + 12.0);
      this.camera.lookAt(ego.x, 0, ego.y + 12.0);

    } else if (this.cameraMode === 'ORBIT') {
      this.controls.enabled = true;
      this.controls.target.set(ego.x, 1.0, ego.y);
      this.controls.update();
    }

    // 8. Render Scene
    this.renderer.render(this.scene, this.camera);
  }

  private updateActors(actors: SurroundingActor[]) {
    const presentActorIds = new Set<string>();

    for (const actor of actors) {
      presentActorIds.add(actor.id);
      let meshGroup = this.actorMeshes.get(actor.id);

      if (!meshGroup) {
        switch (actor.type) {
          case 'AUTO_RICKSHAW':
            meshGroup = this.createAutoRickshawModel();
            break;
          case 'MOTORCYCLE':
            meshGroup = this.createMotorcycleModel();
            break;
          case 'ANIMAL':
            meshGroup = this.createCattleModel();
            break;
          case 'PEDESTRIAN':
            meshGroup = this.createPedestrianModel();
            break;
          case 'TRUCK':
          case 'BUS':
            meshGroup = this.createTruckModel();
            break;
          case 'CAR':
          default:
            meshGroup = this.createSedanModel();
            break;
        }
        this.scene.add(meshGroup);
        this.actorMeshes.set(actor.id, meshGroup);
      }

      meshGroup.position.set(actor.x, 0, actor.y);
      meshGroup.rotation.y = -actor.heading;
    }

    for (const [id, mesh] of this.actorMeshes.entries()) {
      if (!presentActorIds.has(id)) {
        this.scene.remove(mesh);
        this.actorMeshes.delete(id);
      }
    }
  }

  public setCameraMode(mode: CameraViewMode) {
    this.cameraMode = mode;
    if (mode === 'ORBIT') {
      this.controls.enabled = true;
    } else {
      this.controls.enabled = false;
    }
  }

  public resize(width: number, height: number) {
    if (width <= 0 || height <= 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public dispose() {
    this.renderer.dispose();
    if (this.renderer.domElement && this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
