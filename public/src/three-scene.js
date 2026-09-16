/**
 * Three.js Cinematic 3D CONCODE Ecosystem
 * Faithfully recreates the isometric architectural infographic.
 * Central plinth, 4 corner platforms, pipelines, particles, atmospheric effects.
 */

let scene, camera, renderer, clock;
let centralGroup;
let radarDish;
let starField;
let pipelines = [];
let particles = [];
let floatingObjects = [];
let drones = [];
let orbs = [];

// Detailed animation elements
let lightColumns = {};
let scanRings = {};
let serverLeds = [];
let centralOrbitRings = [];
let devopsBeam;
let orchestratorPanel = null;
let logoNucleus = null;
let nucleusLight = null;
let holographicCage = null;
let dirLight;
let platformLights = [];
let pulseRings = [];
let holographicMaterials = [];


// Logo animation component references
let eyeOuter, innerShield, backplate, iris, leftBracket, rightBracket, slash;
let logoTextSprite, taglineSprite;

// Mouse interaction state
let mouseX = 0, mouseY = 0;
let isDragging = false;
let dragStartX = 0, dragStartY = 0;
let dragAngleOffset = 0, dragElevOffset = 0;
let cameraAngle = 0;
let cameraElevation = 20; // Start at elevated perspective
let autoRotateSpeed = 0.04;
let cameraRadius = 30;

// Section-based viewports (camera focuses on the matching platform in background)
const SECTION_VIEWPORTS = {
  hero: {
    lookAt: new THREE.Vector3(0, 0, 0),
    radius: 30,
    elevation: 20,
    angleOffset: 0
  },
  services: { // UI/UX Studio (Top-Left: -12, 0, -10)
    lookAt: new THREE.Vector3(-12, 1, -10),
    radius: 12,
    elevation: 8,
    angleOffset: -Math.PI / 4
  },
  work: { // DevOps (Top-Right: 12, 0, -10)
    lookAt: new THREE.Vector3(12, 1, -10),
    radius: 12,
    elevation: 8,
    angleOffset: Math.PI / 4
  },
  process: { // API Gateway (Bottom-Left: -12, 0, 10)
    lookAt: new THREE.Vector3(-12, 1, 10),
    radius: 12,
    elevation: 8,
    angleOffset: -3 * Math.PI / 4
  },
  pricing: { // Data Migration (Bottom-Right: 12, 0, 10)
    lookAt: new THREE.Vector3(12, 1, 10),
    radius: 12,
    elevation: 8,
    angleOffset: 3 * Math.PI / 4
  },
  contact: { // Overview
    lookAt: new THREE.Vector3(0, 0, 0),
    radius: 36,
    elevation: 22,
    angleOffset: 0
  }
};

let activeSection = 'hero';
let currentLookAt = new THREE.Vector3(0, -1, 0);

function setActiveSection(sectionId) {
  // Locked to hero perspective for steady background rendering
  activeSection = 'hero';
}

// Platform positions (isometric layout matching the reference)
const PLATFORMS = {
  design:  { x: -12, y: 0, z: -10, color: 0x00f0ff, label: 'UI/UX DESIGN STUDIO' },
  ops:     { x:  12, y: 0, z: -10, color: 0x00ff77, label: 'DEVOPS & INFRASTRUCTURE' },
  core:    { x: -12, y: 0, z:  10, color: 0xffaa00, label: 'SCALABLE API GATEWAY' },
  data:    { x:  12, y: 0, z:  10, color: 0xff3300, label: 'LEGACY DATA MIGRATION' }
};

function getHologramMaterial(colorHex, baseOpacity = 0.25, wireframe = false) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(colorHex) },
      uOpacity: { value: baseOpacity },
      uScanlineFrequency: { value: 12.0 },
      uScanlineSpeed: { value: 3.0 },
      uGlowPower: { value: 1.8 },
      uGlowIntensity: { value: 1.4 }
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      varying vec3 vWorldPosition;
      
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uTime;
      uniform float uScanlineFrequency;
      uniform float uScanlineSpeed;
      uniform float uGlowPower;
      uniform float uGlowIntensity;
      
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      varying vec3 vWorldPosition;
      
      void main() {
        // Fresnel edge glow
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewPosition);
        float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), uGlowPower) * uGlowIntensity;
        
        // Scanlines based on world Y position
        float scanline = sin(vWorldPosition.y * uScanlineFrequency - uTime * uScanlineSpeed) * 0.5 + 0.5;
        scanline = pow(scanline, 2.0) * 0.5 + 0.5;
        
        // Flicker effect
        float flicker = 0.94 + 0.06 * sin(uTime * 40.0) * cos(uTime * 20.0);
        
        // Combine
        vec3 finalColor = uColor * (0.35 + fresnel * 0.75);
        float finalOpacity = uOpacity * scanline * (0.25 + fresnel * 0.75) * flicker;
        
        gl_FragColor = vec4(finalColor, finalOpacity);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    wireframe: wireframe
  });
  holographicMaterials.push(material);
  return material;
}

let animFrameId = null;

function init3DScene() {
  if (typeof THREE === 'undefined') {
    console.warn('[ThreeScene] THREE is not loaded; 3D canvas disabled.');
    return;
  }
  const canvas = document.getElementById('webgl-canvas');
  if (!canvas) return;

  // WebGL Context Loss & Restoration Guards
  if (!canvas._hasContextGuard) {
    canvas._hasContextGuard = true;
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      console.warn('[ThreeScene] WebGL context lost.');
      if (animFrameId) cancelAnimationFrame(animFrameId);
    }, false);

    canvas.addEventListener('webglcontextrestored', () => {
      console.log('[ThreeScene] WebGL context restored. Re-mounting scene.');
      init3DScene();
    }, false);
  }

  clock = new THREE.Clock();
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x020810, 0.009);

  // Camera — elevated isometric-like perspective
  camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.5, 200);
  camera.position.set(0, 22, 30);
  camera.lookAt(0, -1, 0);

  renderer = new THREE.WebGLRenderer({ 
    canvas, 
    antialias: true, 
    alpha: true,
    powerPreference: 'high-performance',
    precision: 'highp',
    depth: true,
    stencil: false
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;

  // === LIGHTING ===
  setupLighting();

  // === BUILD SCENE ===
  buildGridFloor();
  buildCursorFabricMesh();
  buildStarfield();
  buildCentralPlinth();
  buildDesignStudio();
  buildDevOpsPlatform();
  buildApiGateway();
  buildDataMigration();
  buildAllPipelines();

  // Mouse / touch interactivity
  setupInteraction(canvas);

  window.addEventListener('resize', onWindowResize);
  animate();
}

// ==========================================
// LIGHTING
// ==========================================
function setupLighting() {
  // Ambient — deep blue undertone
  const ambient = new THREE.AmbientLight(0x0a1830, 1.5);
  scene.add(ambient);

  // Key directional light — from top-right
  dirLight = new THREE.DirectionalLight(0xd0f4ff, 0.6);
  dirLight.position.set(15, 25, 10);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  scene.add(dirLight);

  // Rim light from opposite side
  const rimLight = new THREE.DirectionalLight(0x2040ff, 0.3);
  rimLight.position.set(-15, 10, -10);
  scene.add(rimLight);

  // Central plinth glow — cyan
  const plinthCyanLight = new THREE.PointLight(0x00f0ff, 2, 20, 2);
  plinthCyanLight.position.set(0, 3, 0);
  scene.add(plinthCyanLight);

  // Central plinth glow — orange at base
  const plinthOrangeLight = new THREE.PointLight(0xff7700, 1.5, 15, 2);
  plinthOrangeLight.position.set(0, -0.5, 0);
  scene.add(plinthOrangeLight);

  // Platform accent lights
  platformLights = [];
  Object.values(PLATFORMS).forEach(p => {
    const light = new THREE.PointLight(p.color, 0.8, 12, 2);
    light.position.set(p.x, 2, p.z);
    scene.add(light);
    platformLights.push({ light, baseIntensity: 0.8, speed: 2 + Math.random() * 2, offset: Math.random() * 5 });
  });
}

function createRadialFadeTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  
  const grad = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.65, 'rgba(255, 255, 255, 0.9)');
  grad.addColorStop(0.85, 'rgba(255, 255, 255, 0.45)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);
  
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// ==========================================
// GRID FLOOR
// ==========================================
function buildGridFloor() {
  // Circular ground plane expanded significantly to spread the base color
  const groundGeom = new THREE.CircleGeometry(160, 64);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x030712,
    roughness: 0.95,
    metalness: 0.1,
    alphaMap: createRadialFadeTexture(),
    transparent: true
  });
  const ground = new THREE.Mesh(groundGeom, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.5;
  ground.receiveShadow = true;
  scene.add(ground);

  // Expanded fading grid lines helper (size 280 with 280 grid lines)
  const gridHelper = new THREE.GridHelper(280, 280, 0x0a2040, 0x061020);
  gridHelper.position.y = -1.49;
  
  // Custom shader for grid lines to fade out smoothly at the boundaries
  gridHelper.material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(0x0a2040) }
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vWorldPosition;
      uniform vec3 uColor;
      void main() {
        float dist = length(vWorldPosition.xz);
        // Start fading at radius 70 and completely disappear at 135
        float fade = 1.0 - smoothstep(70.0, 135.0, dist);
        gl_FragColor = vec4(uColor, fade * 0.45);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  
  scene.add(gridHelper);
}

// ==========================================
// INTERACTIVE CURSOR-SENSITIVE FABRIC MESH
// ==========================================
let fabricMesh = null;
let fabricGeometry = null;
let fabricOriginalPositions = null;
let fabricRaycaster = new THREE.Raycaster();
let fabricMouse2D = new THREE.Vector2(-999, -999);
let fabricWorldMouse = new THREE.Vector3(0, -1.45, 0);

function buildCursorFabricMesh() {
  // Expanded 260x260 mesh with proportional subdivisions (120x120) to cover the full viewport
  fabricGeometry = new THREE.PlaneGeometry(260, 260, 120, 120);
  fabricGeometry.rotateX(-Math.PI / 2);
  fabricGeometry.translate(0, -1.45, 0);

  const posAttr = fabricGeometry.attributes.position;
  fabricOriginalPositions = new Float32Array(posAttr.array.length);
  fabricOriginalPositions.set(posAttr.array);

  const fabricMaterial = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    wireframe: true,
    transparent: true,
    opacity: 0.32,
    roughness: 0.2,
    metalness: 0.8,
    emissive: 0x030d22,
    emissiveIntensity: 0.5,
    alphaMap: createRadialFadeTexture(),
    blending: THREE.AdditiveBlending
  });

  fabricMesh = new THREE.Mesh(fabricGeometry, fabricMaterial);
  scene.add(fabricMesh);

  window.addEventListener('mousemove', (e) => {
    fabricMouse2D.x = (e.clientX / window.innerWidth) * 2 - 1;
    fabricMouse2D.y = -(e.clientY / window.innerHeight) * 2 + 1;
  });

  document.addEventListener('mouseleave', () => {
    fabricMouse2D.set(-999, -999);
  });
}

function updateCursorFabricPhysics(elapsed) {
  if (!fabricMesh || !fabricGeometry || !camera) return;

  // Only perform vertex updates when mouse is actively inside window
  if (fabricMouse2D.x <= -900) return;

  fabricRaycaster.setFromCamera(fabricMouse2D, camera);
  const intersects = fabricRaycaster.intersectObject(fabricMesh);
  if (intersects.length > 0) {
    fabricWorldMouse.lerp(intersects[0].point, 0.1);
  }

  const posAttr = fabricGeometry.attributes.position;
  const positions = posAttr.array;
  const orig = fabricOriginalPositions;
  const count = posAttr.count;
  const mouseX = fabricWorldMouse.x;
  const mouseZ = fabricWorldMouse.z;
  const radius = 18;
  const radiusSq = radius * radius;

  let hasChanges = false;
  for (let i = 0; i < count; i++) {
    const idx = i * 3;
    const origX = orig[idx];
    const origY = orig[idx + 1];
    const origZ = orig[idx + 2];

    const dx = origX - mouseX;
    const dz = origZ - mouseZ;
    const distSq = dx * dx + dz * dz;

    let targetY = origY;

    if (distSq < radiusSq) {
      const dist = Math.sqrt(distSq);
      const force = 1.0 - dist / radius;
      // Gentle, dampened tactile wave interaction on mouse hover
      targetY += Math.sin(dist * 0.45 - elapsed * 2.8) * (force * force) * 0.75;
    }

    const currentY = positions[idx + 1];
    if (Math.abs(targetY - currentY) > 0.001) {
      positions[idx + 1] = currentY + (targetY - currentY) * 0.07;
      hasChanges = true;
    }
  }

  if (hasChanges) {
    posAttr.needsUpdate = true;
  }
}

// ==========================================
// STARFIELD
// ==========================================
function buildStarfield() {
  const count = 800;
  const geom = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * 120;
    positions[i * 3 + 1] = Math.random() * 50 + 5;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 120;
    sizes[i] = Math.random() * 0.2 + 0.05;
  }

  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.15,
    transparent: true,
    opacity: 0.6,
    sizeAttenuation: true
  });

  starField = new THREE.Points(geom, mat);
  scene.add(starField);
}

// Helper: Create a dual-layered mechanical bar with metallic casing & glowing core
function createDualLayerBar(w, h, d, glowColor, metalColor) {
  const barGroup = new THREE.Group();
  
  // 1. Outer holographic casing
  const outerGeom = new THREE.BoxGeometry(w, h, d);
  const outerMat = getHologramMaterial(glowColor, 0.08);
  const outerMesh = new THREE.Mesh(outerGeom, outerMat);
  barGroup.add(outerMesh);
  
  // 2. Inner glowing core (slightly thinned but slightly taller to peek out)
  const innerGeom = new THREE.BoxGeometry(w * 0.7, h + 0.08, d * 0.7);
  const innerMat = new THREE.MeshBasicMaterial({
    color: glowColor,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending
  });
  const innerMesh = new THREE.Mesh(innerGeom, innerMat);
  barGroup.add(innerMesh);

  // 3. Glowing edge outline
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(outerGeom),
    new THREE.LineBasicMaterial({ color: glowColor, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending })
  );
  barGroup.add(edges);
  
  return barGroup;
}

// ==========================================
// CENTRAL PLINTH — CONCODE LOGO
// The signature eye/shield emblem with </>
// ==========================================
function buildCentralPlinth() {
  centralGroup = new THREE.Group();

  // ─── Structured Triangular Base Disk ───
  const cragGeom = new THREE.IcosahedronGeometry(4.8, 1);
  const cragPos = cragGeom.attributes.position;
  for (let i = 0; i < cragPos.count; i++) {
    const x = cragPos.getX(i);
    const z = cragPos.getZ(i);
    const y = cragPos.getY(i);
    const angle = Math.atan2(z, x);
    const dist = Math.sqrt(x * x + z * z);
    
    // Structured symmetrical radial facets (8-fold geometric symmetry)
    const facetElev = Math.cos(angle * 8) * 0.18;
    if (y < 0) {
      cragPos.setY(i, -0.7);
    } else {
      cragPos.setY(i, 0.35 + facetElev * (dist / 4.8));
    }
  }
  cragGeom.computeVertexNormals();
  const cragMat = getHologramMaterial(0x00f0ff, 0.1);
  const crag = new THREE.Mesh(cragGeom, cragMat);
  crag.position.y = -1.2;
  
  // Structured razor-sharp triangular wireframe overlay
  const cragWireMat = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
    wireframe: true,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending
  });
  const cragWire = new THREE.Mesh(cragGeom, cragWireMat);
  crag.add(cragWire);
  centralGroup.add(crag);

  // ─── Outer Shield / Eye Frame ───
  // Primary holographic torus — the eye outline
  const shieldMat = getHologramMaterial(0x00f0ff, 0.15);

  // Stretched torus segments forming a split C-bracket frame
  const leftTorusGeom = new THREE.TorusGeometry(3.2, 0.45, 16, 64, Math.PI * 0.72);
  eyeOuter = new THREE.Mesh(leftTorusGeom, shieldMat);
  eyeOuter.rotation.x = Math.PI / 2;
  eyeOuter.rotation.z = Math.PI * 0.64; // align on left
  eyeOuter.position.y = 1.5;
  const leftEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(leftTorusGeom),
    new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending })
  );
  eyeOuter.add(leftEdges);
  centralGroup.add(eyeOuter);

  const rightTorusGeom = new THREE.TorusGeometry(3.2, 0.45, 16, 64, Math.PI * 0.72);
  innerShield = new THREE.Mesh(rightTorusGeom, shieldMat);
  innerShield.rotation.x = Math.PI / 2;
  innerShield.rotation.z = -Math.PI * 0.36; // align on right
  innerShield.position.y = 1.5;
  const rightEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(rightTorusGeom),
    new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending })
  );
  innerShield.add(rightEdges);
  centralGroup.add(innerShield);

  // 3D Eye Lashes (7 lashes)
  const lashesGroup = new THREE.Group();
  lashesGroup.position.set(0, 1.5, 0);
  const lashMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending });
  const lashGeom = new THREE.CylinderGeometry(0.03, 0.08, 0.7, 8);
  for (let i = 0; i < 7; i++) {
    const lash = new THREE.Mesh(lashGeom, lashMat);
    const angle = (i - 3) * 0.20;
    lash.position.set(Math.sin(angle) * 3.2, Math.cos(angle) * 1.6 + 1.2, 0);
    lash.rotation.z = -angle * 0.75;
    lashesGroup.add(lash);
  }
  centralGroup.add(lashesGroup);

  // Shield backplate — solid disc behind the code symbol
  const backplateGeom = new THREE.CylinderGeometry(2.8, 2.8, 0.1, 48);
  const backplateMat = getHologramMaterial(0x005577, 0.08);
  backplate = new THREE.Mesh(backplateGeom, backplateMat);
  backplate.position.y = 1.5;
  backplate.scale.set(1.25, 1, 0.8);
  const bpEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(backplateGeom),
    new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending })
  );
  backplate.add(bpEdges);
  centralGroup.add(backplate);

  // ─── Glowing Cyan Inner Ring (iris) ───
  const irisGeom = new THREE.TorusGeometry(2.0, 0.1, 12, 48);
  const irisMat = getHologramMaterial(0x00f0ff, 0.25);
  iris = new THREE.Mesh(irisGeom, irisMat);
  iris.rotation.x = Math.PI / 2;
  iris.position.y = 1.5;
  const irisEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(irisGeom),
    new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending })
  );
  iris.add(irisEdges);
  centralGroup.add(iris);

  // ─── Central </> Code Symbol ───
  // Left bracket < (two angled bars forming a chevron)
  leftBracket = new THREE.Group();
  const lb1 = createDualLayerBar(0.18, 0.75, 0.4, 0x00f0ff);
  lb1.position.set(-0.2, 0.35, 0);
  lb1.rotation.z = Math.PI / 4.5;
  leftBracket.add(lb1);
  const lb2 = createDualLayerBar(0.18, 0.75, 0.4, 0x00f0ff);
  lb2.position.set(-0.2, -0.35, 0);
  lb2.rotation.z = -Math.PI / 4.5;
  leftBracket.add(lb2);
  leftBracket.position.set(-1.1, 1.5, 0);
  centralGroup.add(leftBracket);

  // Center slash /
  slash = createDualLayerBar(0.15, 1.6, 0.35, 0x00f0ff);
  slash.position.set(0, 1.5, 0);
  slash.rotation.z = -Math.PI / 6;
  centralGroup.add(slash);

  // Right bracket > (two angled bars)
  rightBracket = new THREE.Group();
  const rb1 = createDualLayerBar(0.18, 0.75, 0.4, 0x00f0ff);
  rb1.position.set(0.2, 0.35, 0);
  rb1.rotation.z = -Math.PI / 4.5;
  rightBracket.add(rb1);
  const rb2 = createDualLayerBar(0.18, 0.75, 0.4, 0x00f0ff);
  rb2.position.set(0.2, -0.35, 0);
  rb2.rotation.z = Math.PI / 4.5;
  rightBracket.add(rb2);
  rightBracket.position.set(1.1, 1.5, 0);
  centralGroup.add(rightBracket);

  // ─── Glowing Central Core Nucleus Sphere & Point Light ───
  const nucGeom = new THREE.SphereGeometry(0.32, 32, 32);
  const nucMat = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending
  });
  logoNucleus = new THREE.Mesh(nucGeom, nucMat);
  logoNucleus.position.set(0, 1.5, 0);
  
  const nucShellGeom = new THREE.SphereGeometry(0.5, 32, 32);
  const nucShellMat = new THREE.MeshBasicMaterial({
    color: 0x00aaff,
    transparent: true,
    opacity: 0.25,
    blending: THREE.AdditiveBlending
  });
  const nucShell = new THREE.Mesh(nucShellGeom, nucShellMat);
  logoNucleus.add(nucShell);
  
  nucleusLight = new THREE.PointLight(0x00f0ff, 2.5, 8, 2);
  nucleusLight.position.set(0, 1.5, 0);
  centralGroup.add(nucleusLight);
  centralGroup.add(logoNucleus);

  // ─── Rotating Holographic Wireframe Geodesic Cage ───
  const cageGeom = new THREE.IcosahedronGeometry(2.1, 1);
  const cageMat = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
    wireframe: true,
    transparent: true,
    opacity: 0.16,
    blending: THREE.AdditiveBlending
  });
  holographicCage = new THREE.Mesh(cageGeom, cageMat);
  holographicCage.position.set(0, 1.5, 0);
  
  const cagePointsMat = new THREE.PointsMaterial({
    color: 0x00ffff,
    size: 0.15,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending
  });
  const cagePoints = new THREE.Points(cageGeom, cagePointsMat);
  holographicCage.add(cagePoints);
  centralGroup.add(holographicCage);

  // Energy waves disabled

  // ─── Glowing Platform Disc ───
  const discGeom = new THREE.CylinderGeometry(2.5, 2.5, 0.06, 16, 2);
  const discMat = getHologramMaterial(0x00f0ff, 0.08);
  const disc = new THREE.Mesh(discGeom, discMat);
  disc.position.y = 1.0; // Rest perfectly under the eye torus frame bottom (1.05) to avoid clipping
  const discWireMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending });
  disc.add(new THREE.Mesh(discGeom, discWireMat));
  centralGroup.add(disc);

  // ─── Orange Base Emission Ring ───
  const orangeRingGeom = new THREE.TorusGeometry(4.5, 0.2, 8, 48);
  const orangeRingMat = getHologramMaterial(0xff7700, 0.15);
  const orangeRing = new THREE.Mesh(orangeRingGeom, orangeRingMat);
  orangeRing.rotation.x = Math.PI / 2;
  orangeRing.position.y = -0.8;
  centralGroup.add(orangeRing);

  // Secondary orange glow ring (wider, dimmer)
  const outerGlowGeom = new THREE.TorusGeometry(5.2, 0.1, 8, 48);
  const outerGlowMat = getHologramMaterial(0xff5500, 0.08);
  const outerGlow = new THREE.Mesh(outerGlowGeom, outerGlowMat);
  outerGlow.rotation.x = Math.PI / 2;
  outerGlow.position.y = -1.0;
  centralGroup.add(outerGlow);

  // ─── "CONCODE" 3D Block Text Label (below plinth) ───
  logoTextSprite = build3DText(centralGroup, 'CONCODE', 0, -2.4, 3.2, 0x00f0ff);

  // ─── "WE CODE. YOU GROW." Tagline ───
  taglineSprite = buildLogoText(centralGroup, 'WE CODE. YOU GROW.', 0, -3.4, 3.2, 0xff7700, 22, 640);

  // ─── Agency Orchestrator Holographic Dashboard ───
  buildOrchestratorPanel(centralGroup);

  // ─── Center Drones ───
  buildDrone(centralGroup, -3.5, 3.2, 2.5, 0x00f0ff);
  buildDrone(centralGroup, 3.5, 2.8, -2.5, 0xff7700);

  // ─── Holographic Orbital Rings ───
  const ring1Geom = new THREE.TorusGeometry(4.0, 0.04, 8, 64);
  const ring1Mat = getHologramMaterial(0x00f0ff, 0.2);
  const orbitRing1 = new THREE.Mesh(ring1Geom, ring1Mat);
  orbitRing1.position.y = 1.5;
  orbitRing1.rotation.x = Math.PI / 3;
  orbitRing1.rotation.y = Math.PI / 6;
  centralGroup.add(orbitRing1);
  centralOrbitRings.push({ mesh: orbitRing1, axisX: 0.15, axisY: 0.4, axisZ: 0.08 });

  const ring2Geom = new THREE.TorusGeometry(4.4, 0.03, 8, 64);
  const ring2Mat = getHologramMaterial(0xff7700, 0.15);
  const orbitRing2 = new THREE.Mesh(ring2Geom, ring2Mat);
  orbitRing2.position.y = 1.5;
  orbitRing2.rotation.x = -Math.PI / 4;
  orbitRing2.rotation.y = -Math.PI / 4;
  centralGroup.add(orbitRing2);
  centralOrbitRings.push({ mesh: orbitRing2, axisX: -0.22, axisY: -0.3, axisZ: 0.15 });

  scene.add(centralGroup);
}

// ─── Floating Holographic Orchestrator Dashboard Panel ───
function buildOrchestratorPanel(parent) {
  const panelGroup = new THREE.Group();
  panelGroup.position.set(0, 3.8, 0.5); // Float above the logo eye structure

  // Panel size
  const w = 5.6;
  const h = 3.2;
  const geom = new THREE.PlaneGeometry(w, h);

  // Create canvas texture
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 288;
  const ctx = canvas.getContext('2d');

  // Semi-transparent blue cyber backplate
  ctx.fillStyle = 'rgba(6, 15, 28, 0.85)';
  ctx.fillRect(0, 0, 512, 288);

  // Cyan border frame
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 6;
  ctx.strokeRect(0, 0, 512, 288);

  // Header segment
  ctx.fillStyle = 'rgba(0, 240, 255, 0.12)';
  ctx.fillRect(0, 0, 512, 54);
  ctx.beginPath();
  ctx.moveTo(0, 54);
  ctx.lineTo(512, 54);
  ctx.stroke();

  // Header Title text
  ctx.font = 'bold 20px "Share Tech Mono", monospace';
  ctx.fillStyle = '#00f0ff';
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 8;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('AGENCY ORCHESTRATOR', 256, 27);

  // Clear shadow for sub-items
  ctx.shadowBlur = 0;

  // Grid separation lines
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(256, 54);
  ctx.lineTo(256, 288);
  ctx.moveTo(0, 171);
  ctx.lineTo(512, 171);
  ctx.stroke();

  // Sub-items rendering
  // Col 1, Row 1
  ctx.font = 'bold 13px "Share Tech Mono", monospace';
  ctx.fillStyle = '#d0e8f4';
  ctx.fillText('CLIENT ONBOARDING', 128, 90);
  ctx.font = '11px "Share Tech Mono", monospace';
  ctx.fillStyle = '#ffaa00';
  ctx.fillText('PORTAL ACTIVE', 128, 125);

  // Col 2, Row 1
  ctx.font = 'bold 13px "Share Tech Mono", monospace';
  ctx.fillStyle = '#d0e8f4';
  ctx.fillText('SERVICE DEFINITION', 384, 90);
  ctx.font = '11px "Share Tech Mono", monospace';
  ctx.fillStyle = '#00ff77';
  ctx.fillText('ENGINE ONLINE', 384, 125);

  // Col 1, Row 2
  ctx.font = 'bold 13px "Share Tech Mono", monospace';
  ctx.fillStyle = '#d0e8f4';
  ctx.fillText('PROJECT LIFECYCLE', 128, 205);
  ctx.font = '11px "Share Tech Mono", monospace';
  ctx.fillStyle = '#00f0ff';
  ctx.fillText('TRACKER ACTIVE', 128, 240);

  // Col 2, Row 2
  ctx.font = 'bold 13px "Share Tech Mono", monospace';
  ctx.fillStyle = '#d0e8f4';
  ctx.fillText('SYSTEM MONITORING', 384, 205);
  ctx.font = '11px "Share Tech Mono", monospace';
  ctx.fillStyle = '#00ff77';
  ctx.fillText('ALL NODES SECURE', 384, 240);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;

  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.88,
    side: THREE.DoubleSide
  });

  const mesh = new THREE.Mesh(geom, mat);
  panelGroup.add(mesh);

  // Glowing wireframe overlay edges
  const edges = new THREE.EdgesGeometry(geom);
  const glowBorder = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x00f0ff }));
  mesh.add(glowBorder);

  // Slight angle tilt
  panelGroup.rotation.x = -Math.PI / 10;

  // Store references for runtime updates
  orchestratorPanel = {
    canvas,
    ctx,
    texture,
    lastUpdate: 0
  };

  parent.add(panelGroup);

  // Floating bobbing motion hook
  floatingObjects.push({
    mesh: panelGroup,
    baseY: 3.8,
    speed: 0.6,
    offset: 1.2
  });
}

function updateOrchestratorPanel(elapsed) {
  if (!orchestratorPanel) return;
  
  // Limit updating frequency to save CPU cycles (10 FPS)
  if (elapsed - orchestratorPanel.lastUpdate < 0.1) return;
  orchestratorPanel.lastUpdate = elapsed;

  const ctx = orchestratorPanel.ctx;
  const canvas = orchestratorPanel.canvas;
  const texture = orchestratorPanel.texture;

  // Clear & Draw base
  ctx.fillStyle = 'rgba(6, 15, 28, 0.9)';
  ctx.fillRect(0, 0, 512, 288);

  // Border frame
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 6;
  ctx.strokeRect(0, 0, 512, 288);

  // Header segment
  ctx.fillStyle = 'rgba(0, 240, 255, 0.12)';
  ctx.fillRect(0, 0, 512, 54);
  ctx.beginPath();
  ctx.moveTo(0, 54);
  ctx.lineTo(512, 54);
  ctx.stroke();

  // Header Title
  ctx.font = 'bold 20px "Share Tech Mono", monospace';
  ctx.fillStyle = '#00f0ff';
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 8;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('AGENCY ORCHESTRATOR', 256, 27);
  ctx.shadowBlur = 0;

  // Grid separation lines
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(256, 54);
  ctx.lineTo(256, 288);
  ctx.moveTo(0, 171);
  ctx.lineTo(512, 171);
  ctx.stroke();

  // Draw Dynamic Items
  ctx.font = 'bold 13px "Share Tech Mono", monospace';
  ctx.fillStyle = '#d0e8f4';
  ctx.textAlign = 'center';

  // 1. Client Onboarding
  ctx.fillText('CLIENT ONBOARDING', 128, 90);
  ctx.font = '11px "Share Tech Mono", monospace';
  ctx.fillStyle = '#ffaa00';
  ctx.fillText('PORTAL ACTIVE', 128, 115);
  // Pulsing loading progress bar
  const barW = 100;
  const barProgress = (elapsed * 0.25) % 1.0;
  ctx.fillStyle = 'rgba(255, 170, 0, 0.2)';
  ctx.fillRect(128 - barW / 2, 128, barW, 6);
  ctx.fillStyle = '#ffaa00';
  ctx.fillRect(128 - barW / 2, 128, barW * barProgress, 6);

  // 2. Service Definition
  ctx.font = 'bold 13px "Share Tech Mono", monospace';
  ctx.fillStyle = '#d0e8f4';
  ctx.fillText('SERVICE DEFINITION', 384, 90);
  ctx.font = '11px "Share Tech Mono", monospace';
  ctx.fillStyle = '#00ff77';
  ctx.fillText('ENGINE ONLINE', 384, 115);
  // Flickering hex hash code
  const hashSeed = Math.floor(elapsed * 5) % 9999;
  const mockHash = '0x' + hashSeed.toString(16).toUpperCase().padStart(4, 'F');
  ctx.fillStyle = 'rgba(0, 255, 119, 0.8)';
  ctx.fillText(`HASH: ${mockHash}`, 384, 134);

  // 3. Project Lifecycle
  ctx.font = 'bold 13px "Share Tech Mono", monospace';
  ctx.fillStyle = '#d0e8f4';
  ctx.fillText('PROJECT LIFECYCLE', 128, 205);
  ctx.font = '11px "Share Tech Mono", monospace';
  ctx.fillStyle = '#00f0ff';
  ctx.fillText('TRACKER ACTIVE', 128, 230);
  ctx.fillText(`UPTIME: ${Math.floor(elapsed)} SEC`, 128, 248);

  // 4. System Monitoring
  ctx.font = 'bold 13px "Share Tech Mono", monospace';
  ctx.fillStyle = '#d0e8f4';
  ctx.fillText('SYSTEM MONITORING', 384, 205);
  ctx.font = '11px "Share Tech Mono", monospace';
  ctx.fillStyle = '#00ff77';
  ctx.fillText('ALL NODES SECURE', 384, 224);
  // Waveform graph
  ctx.strokeStyle = 'rgba(0, 255, 119, 0.7)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  const graphStart = 384 - 60;
  ctx.moveTo(graphStart, 250);
  for (let gx = 0; gx <= 120; gx += 5) {
    const gy = 246 + Math.sin(elapsed * 4 + gx * 0.1) * 8;
    ctx.lineTo(graphStart + gx, gy);
  }
  ctx.stroke();

  // Flag texture update
  texture.needsUpdate = true;
}

// Helper: Render text as a canvas-based sprite label
function buildLogoText(parent, text, x, y, z, color, fontSize, canvasW) {
  const canvas = document.createElement('canvas');
  canvas.width = canvasW || 512;
  canvas.height = 80;
  const ctx = canvas.getContext('2d');

  const hex = '#' + new THREE.Color(color).getHexString();
  ctx.shadowColor = hex;
  ctx.shadowBlur = 12;
  ctx.font = `bold ${fontSize || 32}px "Outfit", "Inter", sans-serif`;
  ctx.fillStyle = hex;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, 42);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;

  const mat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 0.9
  });
  const sprite = new THREE.Sprite(mat);
  sprite.position.set(x, y, z);
  sprite.scale.set(8, 1, 1);
  parent.add(sprite);
  return sprite;
}

// Helper: Recreate 3D sculpted steel block letters for CONCODE
function build3DText(parent, textStr, x, y, z, color) {
  const textGroup = new THREE.Group();
  textGroup.position.set(x, y, z);

  const mat = getHologramMaterial(color, 0.2);

  const letterSpacing = 0.65;
  const startX = -((textStr.length - 1) * letterSpacing) / 2;

  for (let idx = 0; idx < textStr.length; idx++) {
    const char = textStr[idx];
    const charGroup = new THREE.Group();
    charGroup.position.x = startX + idx * letterSpacing;

    // Intercept additions to automatically append holographic wireframe outlines
    const originalAdd = charGroup.add.bind(charGroup);
    charGroup.add = function(mesh) {
      if (mesh instanceof THREE.Mesh) {
        const edges = new THREE.LineSegments(
          new THREE.EdgesGeometry(mesh.geometry),
          new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending })
        );
        mesh.add(edges);
      }
      originalAdd(mesh);
    };

    if (char === 'C') {
      const vL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 0.2), mat);
      vL.position.set(-0.16, 0, 0);
      charGroup.add(vL);
      const hT = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.2), mat);
      hT.position.set(0.04, 0.24, 0);
      charGroup.add(hT);
      const hB = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.2), mat);
      hB.position.set(0.04, -0.24, 0);
      charGroup.add(hB);
    } else if (char === 'O') {
      const vL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 0.2), mat);
      vL.position.set(-0.16, 0, 0);
      charGroup.add(vL);
      const vR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 0.2), mat);
      vR.position.set(0.16, 0, 0);
      charGroup.add(vR);
      const hT = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.2), mat);
      hT.position.set(0, 0.24, 0);
      charGroup.add(hT);
      const hB = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.2), mat);
      hB.position.set(0, -0.24, 0);
      charGroup.add(hB);
    } else if (char === 'N') {
      const vL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 0.2), mat);
      vL.position.set(-0.16, 0, 0);
      charGroup.add(vL);
      const vR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 0.2), mat);
      vR.position.set(0.16, 0, 0);
      charGroup.add(vR);
      const diag = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.68, 0.2), mat);
      diag.position.set(0, 0, 0);
      diag.rotation.z = -0.42;
      charGroup.add(diag);
    } else if (char === 'D') {
      const vL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 0.2), mat);
      vL.position.set(-0.16, 0, 0);
      charGroup.add(vL);
      const vR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.44, 0.2), mat);
      vR.position.set(0.16, 0, 0);
      charGroup.add(vR);
      const hT = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.2), mat);
      hT.position.set(0, 0.24, 0);
      charGroup.add(hT);
      const hB = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.2), mat);
      hB.position.set(0, -0.24, 0);
      charGroup.add(hB);
    } else if (char === 'E') {
      const vL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 0.2), mat);
      vL.position.set(-0.16, 0, 0);
      charGroup.add(vL);
      const hT = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.2), mat);
      hT.position.set(0.04, 0.24, 0);
      charGroup.add(hT);
      const hM = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.2), mat);
      hM.position.set(-0.02, 0, 0);
      charGroup.add(hM);
      const hB = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.2), mat);
      hB.position.set(0.04, -0.24, 0);
      charGroup.add(hB);
    }
    textGroup.add(charGroup);
  }

  parent.add(textGroup);
  return textGroup;
}

// ==========================================
// CORNER 1: UI/UX DESIGN STUDIO (top-left)
// ==========================================
function buildDesignStudio() {
  const cfg = PLATFORMS.design;
  const group = new THREE.Group();
  group.position.set(cfg.x, 0, cfg.z);

  // Platform base
  const base = createPlatformBase(4.5, 0.4, 4.5, cfg.color);
  group.add(base);
  addPlatformDetails(group, 'design', cfg.color);

  // Holographic floating screens (3 at different angles)
  const screenMat = getHologramMaterial(cfg.color, 0.15);
  const screenEdgeMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });

  for (let i = 0; i < 3; i++) {
    const w = 1.2 + Math.random() * 0.5;
    const h = 0.8 + Math.random() * 0.3;
    const screenGeom = new THREE.PlaneGeometry(w, h);
    const screen = new THREE.Mesh(screenGeom, screenMat);

    // Edge glow
    const edges = new THREE.EdgesGeometry(screenGeom);
    const edgeLine = new THREE.LineSegments(edges, screenEdgeMat);
    screen.add(edgeLine);

    const angle = (i - 1) * 0.5;
    screen.position.set(-0.8 + i * 0.9, 1.5 + i * 0.3, -0.3 + Math.random() * 0.6);
    screen.rotation.y = angle;
    screen.rotation.x = -0.15;

    group.add(screen);
    floatingObjects.push({ mesh: screen, baseY: screen.position.y, speed: 0.8 + Math.random() * 0.5, offset: i * 1.5 });
  }

  // Code bracket icon on main screen — small < / >
  const bracketMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
  const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.05), bracketMat);
  bracket.position.set(-0.8, 2.2, -0.3);
  bracket.rotation.z = Math.PI / 6;
  group.add(bracket);

  // Floating wireframe cube
  const cubeGeom = new THREE.BoxGeometry(0.7, 0.7, 0.7);
  const cubeMat = getHologramMaterial(0x00f0ff, 0.1);
  const cube = new THREE.Mesh(cubeGeom, cubeMat);
  const cubeEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(cubeGeom),
    new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending })
  );
  cube.add(cubeEdges);
  cube.position.set(1.5, 2.5, 0.8);
  group.add(cube);
  floatingObjects.push({ mesh: cube, baseY: 2.5, speed: 1.2, offset: 0, rotate: true });

  // Small drone
  buildDrone(group, -1.5, 3.2, -1.0, 0x00f0ff);

  // Holographic label
  buildLabel(group, cfg.label, 0, 3.8, 0, cfg.color);

  // Sub-labels
  buildSmallLabel(group, 'INTERACTIVE PROTOTYPING LAB', -0.5, 0.8, -1.8, 0x00f0ff);
  buildSmallLabel(group, 'RESPONSIVE FRAMEWORK', 0.5, 0.5, 1.8, 0x00f0ff);

  scene.add(group);
}

// ==========================================
// CORNER 2: DEVOPS & INFRASTRUCTURE (top-right)
// ==========================================
function buildDevOpsPlatform() {
  const cfg = PLATFORMS.ops;
  const group = new THREE.Group();
  group.position.set(cfg.x, 0, cfg.z);

  // Platform base
  const base = createPlatformBase(5, 0.4, 5, cfg.color);
  group.add(base);
  addPlatformDetails(group, 'ops', cfg.color);

  // Dual rockets
  for (let i = 0; i < 2; i++) {
    const rocket = buildRocket(cfg.color);
    rocket.position.set(-1.2 + i * 2.4, 0, -1.0);
    rocket.scale.set(1.2, 1.2, 1.2);
    group.add(rocket);
  }

  // Satellite dish on mast
  const mastGeom = new THREE.CylinderGeometry(0.06, 0.06, 1.5, 8);
  const mastMat = getHologramMaterial(cfg.color, 0.15);
  const mast = new THREE.Mesh(mastGeom, mastMat);
  const mastEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(mastGeom),
    new THREE.LineBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending })
  );
  mast.add(mastEdges);
  mast.position.set(0, 0.75, 1.2);
  group.add(mast);

  // Dish
  const dishGeom = new THREE.SphereGeometry(0.6, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const dishMat = getHologramMaterial(cfg.color, 0.15);
  radarDish = new THREE.Mesh(dishGeom, dishMat);
  const dishEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(dishGeom),
    new THREE.LineBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending })
  );
  radarDish.add(dishEdges);
  radarDish.position.set(0, 1.6, 1.2);
  radarDish.rotation.x = Math.PI / 4;
  
  // Glowing satellite transmission cone (disabled to prevent distracting straight light beam)
  /*
  const beamConeGeom = new THREE.ConeGeometry(0.35, 3.0, 16, 1, true);
  beamConeGeom.translate(0, 1.5, 0); // Offset so the base is at the dish center
  const beamConeMat = new THREE.MeshBasicMaterial({
    color: 0x00ff77,
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  devopsBeam = new THREE.Mesh(beamConeGeom, beamConeMat);
  radarDish.add(devopsBeam);
  */

  group.add(radarDish);

  // Solar panel arms on satellite
  for (let side = -1; side <= 1; side += 2) {
    const armGeom = new THREE.BoxGeometry(0.8, 0.02, 0.4);
    const armMat = getHologramMaterial(cfg.color, 0.12);
    const arm = new THREE.Mesh(armGeom, armMat);
    const armEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(armGeom),
      new THREE.LineBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending })
    );
    arm.add(armEdges);
    arm.position.set(side * 0.8, 1.5, 1.2);
    group.add(arm);

    // Solar cells
    const cellGeom = new THREE.BoxGeometry(0.6, 0.04, 0.3);
    const cellMat = getHologramMaterial(0x00aaff, 0.2);
    const cell = new THREE.Mesh(cellGeom, cellMat);
    const cellEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(cellGeom),
      new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending })
    );
    cell.add(cellEdges);
    cell.position.set(side * 0.8, 1.52, 1.2);
    group.add(cell);
  }

  // Monitoring screens (small floating rectangles)
  const monitorMat = getHologramMaterial(cfg.color, 0.2);
  for (let i = 0; i < 2; i++) {
    const monGeom = new THREE.PlaneGeometry(0.8, 0.5);
    const mon = new THREE.Mesh(monGeom, monitorMat);
    const monEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(monGeom),
      new THREE.LineBasicMaterial({ color: 0x00ff77, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending })
    );
    mon.add(monEdges);
    mon.position.set(1.5, 1.5 + i * 0.7, -0.5 + i * 0.3);
    mon.rotation.y = -0.4;
    group.add(mon);
    floatingObjects.push({ mesh: mon, baseY: mon.position.y, speed: 0.6, offset: i * 2 });
  }

  // Label
  buildLabel(group, cfg.label, 0, 4.2, 0, cfg.color);
  buildSmallLabel(group, 'CI/CD PIPELINE', 1.0, 0.5, -2.0, 0x00ff77);
  buildSmallLabel(group, 'KUBERNETES CLUSTER', -1.0, 0.5, 2.0, 0x00ff77);

  // Small drone
  buildDrone(group, 0, 3.5, -1.5, 0x00ff77);

  scene.add(group);
}

// ==========================================
// CORNER 3: SCALABLE API GATEWAY (bottom-left)
// ==========================================
function buildApiGateway() {
  const cfg = PLATFORMS.core;
  const group = new THREE.Group();
  group.position.set(cfg.x, 0, cfg.z);

  // Platform base
  const base = createPlatformBase(5, 0.4, 5, cfg.color);
  group.add(base);
  addPlatformDetails(group, 'core', cfg.color);

  // Fortress monolith server stacks (3 boxes)
  const monolithMat = getHologramMaterial(cfg.color, 0.15);

  for (let i = 0; i < 3; i++) {
    const h = 1.5 + i * 0.5;
    const monolith = new THREE.Mesh(new THREE.BoxGeometry(0.9, h, 0.9), monolithMat);
    monolith.position.set(-1.0 + i * 1.0, h / 2, -0.5);

    // Neon edge glow
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(0.9, h, 0.9)),
      new THREE.LineBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending })
    );
    monolith.add(edges);

    // Blinking server LEDs on the front face (z = +0.455 relative to stack)
    const ledCols = [-0.25, 0.25];
    const ledRows = Math.floor(h / 0.22);
    for (let r = 0; r < ledRows; r++) {
      const ledY = 0.15 + r * 0.22;
      ledCols.forEach(ledX => {
        const ledGeom = new THREE.SphereGeometry(0.035, 4, 4);
        const ledColor = Math.random() < 0.4 ? 0x00ff77 : (Math.random() < 0.5 ? 0xffaa00 : 0x00f0ff);
        const ledMat = new THREE.MeshBasicMaterial({
          color: ledColor,
          transparent: true,
          opacity: 0.8
        });
        const ledMesh = new THREE.Mesh(ledGeom, ledMat);
        
        // Position on the monolith front face relative to the monolith mesh
        ledMesh.position.set(ledX, ledY - h/2, 0.455);
        monolith.add(ledMesh);
        
        // Store in global array to animate (blink) in render loop
        serverLeds.push({
          mesh: ledMesh,
          blinkSpeed: 1.5 + Math.random() * 3.5,
          offset: Math.random() * Math.PI * 2
        });
      });
    }

    group.add(monolith);
  }

  // Glowing API orb
  const orbGeom = new THREE.SphereGeometry(0.6, 24, 24);
  const orbMat = getHologramMaterial(0x00ccff, 0.35);
  const orb = new THREE.Mesh(orbGeom, orbMat);
  orb.position.set(-1.5, 1.5, 1.2);
  group.add(orb);
  orbs.push({ mesh: orb, baseOpacity: 0.35 });

  // Orb glow halo
  const haloGeom = new THREE.RingGeometry(0.7, 1.0, 32);
  const haloMat = getHologramMaterial(0x00ccff, 0.15);
  const halo = new THREE.Mesh(haloGeom, haloMat);
  halo.position.set(-1.5, 1.5, 1.2);
  halo.rotation.x = Math.PI / 2;
  group.add(halo);

  // Security vault door (cylinder)
  const vaultGeom = new THREE.CylinderGeometry(0.5, 0.5, 0.15, 24);
  const vaultMat = getHologramMaterial(cfg.color, 0.15);
  const vault = new THREE.Mesh(vaultGeom, vaultMat);
  const vaultEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(vaultGeom),
    new THREE.LineBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending })
  );
  vault.add(vaultEdges);
  vault.rotation.x = Math.PI / 2;
  vault.position.set(1.5, 0.5, 1.5);
  group.add(vault);

  // Vault handle
  const handleGeom = new THREE.TorusGeometry(0.15, 0.03, 8, 16);
  const handleMat = getHologramMaterial(0xffaa00, 0.2);
  const handle = new THREE.Mesh(handleGeom, handleMat);
  const handleEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(handleGeom),
    new THREE.LineBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending })
  );
  handle.add(handleEdges);
  handle.position.set(1.5, 0.5, 1.59);
  group.add(handle);

  // Label
  buildLabel(group, cfg.label, 0, 3.5, 0, cfg.color);
  buildSmallLabel(group, 'MICROSERVICES', -1.5, 0.5, -2.0, 0xffaa00);
  buildSmallLabel(group, 'AUTH & SECURITY VAULT', 1.5, 0.5, 2.0, 0xffaa00);

  // Small drone
  buildDrone(group, 1.5, 3.0, -1.0, 0xffaa00);

  scene.add(group);
}

// ==========================================
// CORNER 4: LEGACY DATA MIGRATION (bottom-right)
// ==========================================
function buildDataMigration() {
  const cfg = PLATFORMS.data;
  const group = new THREE.Group();
  group.position.set(cfg.x, 0, cfg.z);

  // Platform base
  const base = createPlatformBase(5, 0.4, 5, cfg.color);
  group.add(base);
  addPlatformDetails(group, 'data', cfg.color);

  // Crystal city columns — translucent blue towers
  const crystalMat = getHologramMaterial(cfg.color, 0.25);

  const crystalPositions = [
    { x: -0.8, z: -0.6, h: 2.5, r: 0.18 },
    { x: -0.3, z: -0.3, h: 3.2, r: 0.22 },
    { x:  0.3, z: -0.5, h: 2.8, r: 0.2  },
    { x:  0.8, z: -0.2, h: 2.0, r: 0.15 },
    { x: -0.5, z:  0.3, h: 1.8, r: 0.16 },
    { x:  0.2, z:  0.5, h: 2.2, r: 0.18 },
    { x:  0.7, z:  0.4, h: 1.5, r: 0.14 },
    { x: -0.2, z:  0.8, h: 1.2, r: 0.12 }
  ];

  crystalPositions.forEach((c, i) => {
    const geom = new THREE.CylinderGeometry(c.r * 0.7, c.r, c.h, 6);
    // Clone material so each has its own instance if needed, or share the single custom material
    const crystal = new THREE.Mesh(geom, crystalMat);
    crystal.position.set(c.x - 0.5, c.h / 2, c.z + 0.5);

    // Edge glow
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geom),
      new THREE.LineBasicMaterial({ color: 0x40a0ff, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending })
    );
    crystal.add(edges);
    group.add(crystal);

    floatingObjects.push({
      mesh: crystal,
      baseH: c.h,
      baseY: c.h / 2,
      speed: 0.6 + Math.random() * 0.5,
      offset: i * 0.8,
      isDatabaseColumn: true
    });
  });

  // Central processor cube
  const procGeom = new THREE.BoxGeometry(1, 1, 1);
  const procMat = getHologramMaterial(cfg.color, 0.15);
  const processor = new THREE.Mesh(procGeom, procMat);
  processor.position.set(1.5, 0.7, -1.0);
  const procEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(procGeom),
    new THREE.LineBasicMaterial({ color: 0xff3300, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending })
  );
  processor.add(procEdges);
  group.add(processor);

  // Small orbiting cubes around the processor
  for (let i = 0; i < 3; i++) {
    const miniGeom = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const miniMat = getHologramMaterial(cfg.color, 0.35);
    const miniCube = new THREE.Mesh(miniGeom, miniMat);
    miniCube.position.set(1.5, 0.7, -1.0);
    group.add(miniCube);
    floatingObjects.push({ mesh: miniCube, baseY: 0.7, speed: 1.5 + i * 0.3, offset: i * 2.1, orbit: { cx: 1.5, cz: -1.0, radius: 0.6 + i * 0.2 } });
  }

  // Label
  buildLabel(group, cfg.label, 0, 4.5, 0, cfg.color);
  buildSmallLabel(group, 'DATA LAKE & WAREHOUSE', -1.0, 0.5, 2.0, 0xff3300);
  buildSmallLabel(group, 'HIGH-SPEED CACHE', 1.5, 0.5, 1.5, 0xff3300);

  // Small drone
  buildDrone(group, -1.5, 3.2, 1.5, 0xff3300);

  scene.add(group);
}

// ==========================================
// PIPELINE CONNECTIONS
// ==========================================
function buildAllPipelines() {
  Object.keys(PLATFORMS).forEach(key => {
    const p = PLATFORMS[key];
    // Main pipeline from platform to center
    buildPipeline(p.x, 0.3, p.z, 0, 0.3, 0, p.color);

    // Branch pipe (secondary aesthetic detail)
    const midX = p.x * 0.5;
    const midZ = p.z * 0.5;
    buildPipeline(p.x, 0.3, p.z, midX, 1.5, midZ, p.color, 0.04);
  });
}

function buildPipeline(x1, y1, z1, x2, y2, z2, color, radius) {
  const r = radius || 0.1;
  const p1 = new THREE.Vector3(x1, y1, z1);
  const mid = new THREE.Vector3((x1 + x2) * 0.5, Math.max(y1, y2) + 0.5, (z1 + z2) * 0.5);
  const p2 = new THREE.Vector3(x2, y2, z2);

  const path = new THREE.QuadraticBezierCurve3(p1, mid, p2);
  const tubeGeom = new THREE.TubeGeometry(path, 24, r, 8, false);

  // Outer shell — semi-transparent metallic
  const shellMat = new THREE.MeshStandardMaterial({
    color: 0x0a1f35,
    roughness: 0.1,
    metalness: 0.9,
    transparent: true,
    opacity: 0.35
  });
  const shell = new THREE.Mesh(tubeGeom, shellMat);
  scene.add(shell);

  // Inner glow core
  const glowGeom = new THREE.TubeGeometry(path, 24, r * 0.5, 6, false);
  const glowMat = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.2
  });
  const glow = new THREE.Mesh(glowGeom, glowMat);
  scene.add(glow);

  pipelines.push({ path, color, shell, glow, intensity: 0.5 });
}

// ==========================================
// HELPERS FOR ADVANCED DETAILS
// ==========================================
function createVerticalGradientTexture(colorHex) {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  
  const grad = ctx.createLinearGradient(0, 256, 0, 0); // bottom to top
  grad.addColorStop(0, colorHex);
  grad.addColorStop(0.15, colorHex);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 16, 256);
  
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

function addPlatformDetails(group, key, color) {
  // 1. Light Column (disabled)

  // 2. Scan Ring
  const ringGeom = new THREE.RingGeometry(2.35, 2.45, 32);
  const ringMat = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const ring = new THREE.Mesh(ringGeom, ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.05;
  group.add(ring);
  scanRings[key] = ring;
}

// ==========================================
// HELPER: Create platform base
// ==========================================
function createPlatformBase(w, h, d, colorHex) {
  const baseGeom = new THREE.BoxGeometry(w, h, d);
  const baseMat = getHologramMaterial(colorHex || 0x00f0ff, 0.06);
  const baseMesh = new THREE.Mesh(baseGeom, baseMat);
  baseMesh.position.y = -h / 2 - 0.1;

  // Add an inner wireframe overlay
  const wireframeMat = getHologramMaterial(colorHex || 0x00f0ff, 0.1, true);
  const wireframeMesh = new THREE.Mesh(baseGeom, wireframeMat);
  baseMesh.add(wireframeMesh);

  // Glowing edge wireframe
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(baseGeom),
    new THREE.LineBasicMaterial({ color: colorHex || 0x00f0ff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending })
  );
  baseMesh.add(edges);

  return baseMesh;
}

// ==========================================
// HELPER: Build a rocket
// ==========================================
function buildRocket(colorHex = 0x00ff77) {
  const rocketGroup = new THREE.Group();

  // Launch pad
  const padGeom = new THREE.CylinderGeometry(0.4, 0.45, 0.1, 12);
  const padMat = getHologramMaterial(colorHex, 0.12);
  const pad = new THREE.Mesh(padGeom, padMat);
  const padEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(padGeom),
    new THREE.LineBasicMaterial({ color: colorHex, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending })
  );
  pad.add(padEdges);
  pad.position.y = 0.05;
  rocketGroup.add(pad);

  // Body
  const bodyGeom = new THREE.CylinderGeometry(0.18, 0.2, 1.4, 8);
  const bodyMat = getHologramMaterial(colorHex, 0.18);
  const body = new THREE.Mesh(bodyGeom, bodyMat);
  const bodyEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(bodyGeom),
    new THREE.LineBasicMaterial({ color: colorHex, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending })
  );
  body.add(bodyEdges);
  body.position.y = 0.8;
  rocketGroup.add(body);

  // Nose cone
  const noseGeom = new THREE.ConeGeometry(0.18, 0.4, 8);
  const noseMat = getHologramMaterial(0xff3333, 0.25);
  const nose = new THREE.Mesh(noseGeom, noseMat);
  const noseEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(noseGeom),
    new THREE.LineBasicMaterial({ color: 0xff3333, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending })
  );
  nose.add(noseEdges);
  nose.position.y = 1.7;
  rocketGroup.add(nose);

  // Fins (4 fins)
  const finMat = getHologramMaterial(colorHex, 0.15);
  for (let i = 0; i < 4; i++) {
    const finGeom = new THREE.BoxGeometry(0.02, 0.3, 0.15);
    const fin = new THREE.Mesh(finGeom, finMat);
    const finEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(finGeom),
      new THREE.LineBasicMaterial({ color: colorHex, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending })
    );
    fin.add(finEdges);
    const angle = (i / 4) * Math.PI * 2;
    fin.position.set(Math.cos(angle) * 0.2, 0.2, Math.sin(angle) * 0.2);
    fin.rotation.y = angle;
    rocketGroup.add(fin);
  }

  // Thruster flame
  const flameGeom = new THREE.ConeGeometry(0.12, 0.3, 8);
  const flameMat = new THREE.MeshBasicMaterial({
    color: 0xffaa00,
    transparent: true,
    opacity: 0.7
  });
  const flame = new THREE.Mesh(flameGeom, flameMat);
  flame.position.y = -0.05;
  flame.rotation.x = Math.PI;
  rocketGroup.add(flame);
  floatingObjects.push({ mesh: flame, baseY: -0.05, speed: 8, offset: Math.random() * 5, scaleFlicker: true });

  return rocketGroup;
}

// ==========================================
// HELPER: Build a small drone
// ==========================================
function buildDrone(parent, x, y, z, color) {
  const droneGroup = new THREE.Group();

  // Body
  const bodyGeom = new THREE.SphereGeometry(0.15, 8, 6);
  const bodyMat = getHologramMaterial(color, 0.2);
  const body = new THREE.Mesh(bodyGeom, bodyMat);
  const bodyEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(bodyGeom),
    new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending })
  );
  body.add(bodyEdges);
  droneGroup.add(body);

  // Rotors (4 arms)
  const armMat = getHologramMaterial(color, 0.15);
  for (let i = 0; i < 4; i++) {
    const armGeom = new THREE.BoxGeometry(0.4, 0.02, 0.03);
    const arm = new THREE.Mesh(armGeom, armMat);
    const armEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(armGeom),
      new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending })
    );
    arm.add(armEdges);
    arm.rotation.y = (i / 4) * Math.PI * 2;
    droneGroup.add(arm);

    // Rotor disc
    const rotorGeom = new THREE.CircleGeometry(0.08, 8);
    const rotorMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
    const rotor = new THREE.Mesh(rotorGeom, rotorMat);
    const angle = (i / 4) * Math.PI * 2;
    rotor.position.set(Math.cos(angle) * 0.2, 0.03, Math.sin(angle) * 0.2);
    rotor.rotation.x = -Math.PI / 2;
    droneGroup.add(rotor);
  }

  // Light underneath
  const lightGeom = new THREE.SphereGeometry(0.04, 6, 6);
  const lightMat = new THREE.MeshBasicMaterial({ color: color });
  const light = new THREE.Mesh(lightGeom, lightMat);
  light.position.y = -0.12;
  droneGroup.add(light);

  droneGroup.position.set(x, y, z);
  parent.add(droneGroup);
  drones.push({ mesh: droneGroup, baseX: x, baseY: y, baseZ: z, speed: 0.5 + Math.random() * 0.5, offset: Math.random() * Math.PI * 2 });

  return droneGroup;
}

// ==========================================
// HELPER: Holographic label (using sprite)
// ==========================================
function buildLabel(parent, text, x, y, z, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'transparent';
  ctx.fillRect(0, 0, 512, 64);

  // Glow effect
  const hex = '#' + new THREE.Color(color).getHexString();
  ctx.shadowColor = hex;
  ctx.shadowBlur = 8;

  ctx.font = 'bold 28px "Share Tech Mono", monospace';
  ctx.fillStyle = hex;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 32);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;

  const spriteMat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 0.85
  });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.position.set(x, y, z);
  sprite.scale.set(5, 0.6, 1);
  parent.add(sprite);
}

function buildSmallLabel(parent, text, x, y, z, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 48;
  const ctx = canvas.getContext('2d');

  const hex = '#' + new THREE.Color(color).getHexString();
  ctx.shadowColor = hex;
  ctx.shadowBlur = 4;
  ctx.font = '18px "Share Tech Mono", monospace';
  ctx.fillStyle = hex;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 24);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;

  const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.6 });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.position.set(x, y, z);
  sprite.scale.set(4, 0.4, 1);
  parent.add(sprite);
}

// ==========================================
// PARTICLE FLOW SYSTEM
// ==========================================
// ==========================================
// PARTICLE FLOW SYSTEM
// ==========================================
function spawnFlowParticle(pipeline) {
  const particleGeom = new THREE.SphereGeometry(0.06, 6, 6);
  const particleMat = new THREE.MeshBasicMaterial({
    color: pipeline.color,
    transparent: true,
    opacity: 0.85
  });
  const mesh = new THREE.Mesh(particleGeom, particleMat);
  scene.add(mesh);

  particles.push({
    mesh,
    path: pipeline.path,
    progress: 0,
    speed: 0.005 + Math.random() * 0.008
  });
}

// ==========================================
// INTERACTIVE CAMERA SYSTEM
// ==========================================
function setupInteraction(canvas) {
  // Listen for mousemove to implement subtle camera parallax offset
  window.addEventListener('mousemove', (e) => {
    if (!isDragging) {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2; // -1 to 1
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2; // -1 to 1
    }
  });

  // Mouse drag to rotate camera
  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragAngleOffset = cameraAngle;
    dragElevOffset = cameraElevation;
  });

  window.addEventListener('mousemove', (e) => {
    if (isDragging) {
      const deltaX = e.clientX - dragStartX;
      const deltaY = e.clientY - dragStartY;
      
      // Speed factor of drag rotation
      cameraAngle = dragAngleOffset - deltaX * 0.005;
      cameraElevation = Math.max(-Math.PI / 4, Math.min(Math.PI / 3, dragElevOffset + deltaY * 0.005));
    }
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  // Touch support for mobile devices
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      isDragging = true;
      dragStartX = e.touches[0].clientX;
      dragStartY = e.touches[0].clientY;
      dragAngleOffset = cameraAngle;
      dragElevOffset = cameraElevation;
    }
  }, { passive: true });

  canvas.addEventListener('touchmove', (e) => {
    if (isDragging && e.touches.length === 1) {
      const deltaX = e.touches[0].clientX - dragStartX;
      const deltaY = e.touches[0].clientY - dragStartY;
      
      cameraAngle = dragAngleOffset - deltaX * 0.008;
      cameraElevation = Math.max(-Math.PI / 4, Math.min(Math.PI / 3, dragElevOffset + deltaY * 0.008));
    }
  }, { passive: true });

  canvas.addEventListener('touchend', () => {
    isDragging = false;
  });

  // Handle scroll-based canvas fading
  const canvasFade = document.getElementById('canvas-fade');
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    const fadeStart = 40;
    const fadeEnd = window.innerHeight * 0.9;
    const progress = Math.max(0, Math.min(1, (scrollY - fadeStart) / (fadeEnd - fadeStart)));
    
    if (canvasFade) {
      canvasFade.style.opacity = progress * 0.65; // Keeps 3D models visible in background of all tabs
    }
  }, { passive: true });
}

// Pause rendering ONLY when tab is truly hidden to save GPU/CPU energy
let isTabVisible = !document.hidden;
document.addEventListener('visibilitychange', () => {
  isTabVisible = !document.hidden;
  if (isTabVisible && clock) {
    clock.getDelta(); // Reset delta to prevent leaps
  }
});

// User activity tracker for zero-lag idle power saving
let lastUserActivityTime = performance.now();
function recordUserActivity() {
  lastUserActivityTime = performance.now();
}
window.addEventListener('scroll', recordUserActivity, { passive: true });
window.addEventListener('mousemove', recordUserActivity, { passive: true });
window.addEventListener('keydown', recordUserActivity, { passive: true });
window.addEventListener('touchstart', recordUserActivity, { passive: true });

// ==========================================
// ANIMATION LOOP (Full GPU Hardware-Accelerated 60/120 FPS Rendering)
// ==========================================
function animate() {
  animFrameId = requestAnimationFrame(animate);
  // Sleep GPU pipeline when tab is backgrounded
  if (!isTabVisible) return;

  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  // GPU Shader Time Uniform Updates
  for (let i = 0; i < holographicMaterials.length; i++) {
    const mat = holographicMaterials[i];
    if (mat.uniforms && mat.uniforms.uTime) {
      mat.uniforms.uTime.value = elapsed;
    }
  }

  // Interactive Cursor-Sensitive Fabric Mesh Physics
  updateCursorFabricPhysics(elapsed);

  const viewport = SECTION_VIEWPORTS[activeSection] || SECTION_VIEWPORTS.hero;

  // Smoothly interpolate camera target look-at coordinates
  currentLookAt.lerp(viewport.lookAt, 0.05);

  // Handle auto-rotation vs. interactive drag camera positioning
  const isMobile = window.innerWidth < 768;
  const radiusMultiplier = isMobile ? (window.innerWidth < 480 ? 1.85 : 1.45) : 1.0;
  const elevationMultiplier = isMobile ? 1.25 : 1.0;

  if (!isDragging) {
    cameraAngle += autoRotateSpeed * delta;
    cameraElevation += ((viewport.elevation * elevationMultiplier) - cameraElevation) * 0.05;
    cameraRadius += ((viewport.radius * radiusMultiplier) - cameraRadius) * 0.05;
  }

  // Calculate final angle and position incorporating section-specific viewports
  const finalAngle = isDragging ? cameraAngle : cameraAngle + viewport.angleOffset;
  const finalElevation = isDragging ? cameraElevation : cameraElevation;

  // Camera organic hover sway (calibrated subtle mouse parallax)
  const swayTime = elapsed * 0.4;
  const targetX = currentLookAt.x + Math.sin(finalAngle) * cameraRadius + mouseX * 0.8 + Math.sin(swayTime) * 0.5;
  const targetZ = currentLookAt.z + Math.cos(finalAngle) * cameraRadius + mouseX * 0.8 + Math.cos(swayTime * 1.3) * 0.5;
  const targetY = currentLookAt.y + finalElevation - mouseY * 0.8 + Math.sin(swayTime * 0.7) * 0.4;

  camera.position.x += (targetX - camera.position.x) * 0.05;
  camera.position.z += (targetZ - camera.position.z) * 0.05;
  camera.position.y += (targetY - camera.position.y) * 0.05;
  camera.lookAt(currentLookAt);

  // Central plinth slow rotation
  if (centralGroup) {
    centralGroup.rotation.y = elapsed * 0.12;
  }

  // Keep directional light stationary to prevent expensive shadow map re-calculations on every frame
  /*
  if (dirLight) {
    const lightAngle = elapsed * 0.04;
    dirLight.position.x = 15 * Math.cos(lightAngle) - 10 * Math.sin(lightAngle);
    dirLight.position.z = 15 * Math.sin(lightAngle) + 10 * Math.cos(lightAngle);
  }
  */

  // ─── 2-Second Eye Blinking Cycle ───
  const blinkCycle = elapsed % 2.0;
  let eyeBlinkY = 1.0;
  if (blinkCycle > 1.84) {
    const t = (blinkCycle - 1.84) / 0.16; // 0 to 1
    eyeBlinkY = 0.08 + 0.92 * (0.5 + 0.5 * Math.cos(t * Math.PI * 2));
  }

  // ─── Logo Component Animations ───
  if (eyeOuter) {
    // Sway the outer frame & blink
    eyeOuter.rotation.z = Math.sin(elapsed * 1.5) * 0.08;
    eyeOuter.scale.y = eyeBlinkY;
  }
  if (innerShield) {
    // Sway in counter-phase & blink
    innerShield.rotation.z = -Math.sin(elapsed * 1.5) * 0.05;
    innerShield.scale.y = eyeBlinkY;
  }
  if (iris) {
    // Rapid rotation and breathing scale of iris glow core
    iris.rotation.z = -elapsed * 0.6;
    iris.scale.set(1.0 + Math.sin(elapsed * 3.5) * 0.05, (1.0 + Math.sin(elapsed * 3.5) * 0.05) * eyeBlinkY, 1.0);
    iris.material.opacity = 0.55 + Math.sin(elapsed * 3.5) * 0.15;
  }
  if (leftBracket && rightBracket) {
    // Brackets pulse/push outward and inward like a heartbeat
    const pulseOffset = Math.sin(elapsed * 2.5) * 0.08;
    leftBracket.position.x = -1.1 - pulseOffset;
    rightBracket.position.x = 1.1 + pulseOffset;
  }
  if (slash) {
    // Slash sways and pulses thickness
    slash.rotation.z = -Math.PI / 6 + Math.sin(elapsed * 1.8) * 0.04;
    const slashScale = 1.0 + Math.sin(elapsed * 3.0) * 0.05;
    slash.scale.set(1.0, slashScale, 1.0);
  }
  if (logoNucleus) {
    // Float/bob the core nucleus vertically
    logoNucleus.position.y = 1.5 + Math.sin(elapsed * 1.5) * 0.12;
    // Nucleus scaling pulse
    const nucScale = 1.0 + Math.sin(elapsed * 4) * 0.1;
    logoNucleus.scale.set(nucScale, nucScale, nucScale);
  }
  if (nucleusLight) {
    // Pulsate light intensity for dynamic glow
    nucleusLight.intensity = 2.5 + Math.sin(elapsed * 5) * 0.8;
    if (logoNucleus) {
      nucleusLight.position.y = logoNucleus.position.y;
    }
  }
  if (holographicCage) {
    // Rotate the geodesic cage on multiple axes and pulse opacity
    holographicCage.rotation.y = elapsed * 0.35;
    holographicCage.rotation.x = Math.sin(elapsed * 0.2) * 0.15;
    holographicCage.rotation.z = elapsed * 0.15;
    holographicCage.material.opacity = 0.12 + Math.abs(Math.sin(elapsed * 2.0)) * 0.14;
    if (logoNucleus) {
      holographicCage.position.y = logoNucleus.position.y;
    }
  }
  if (logoTextSprite && taglineSprite) {
    // Floating label text bobbing
    logoTextSprite.position.y = -2.4 + Math.sin(elapsed * 1.2) * 0.06;
    taglineSprite.position.y = -3.4 + Math.sin(elapsed * 1.2 + 0.5) * 0.06;
    
    // Pulse tagline sprite opacity for glow effect
    taglineSprite.material.opacity = 0.75 + Math.sin(elapsed * 2.0) * 0.15;
  }

  // Radar dish tracking scan (sweeps back and forth)
  if (radarDish) {
    radarDish.rotation.y = Math.sin(elapsed * 0.45) * 0.75;
    radarDish.rotation.x = 0.3 + Math.cos(elapsed * 0.3) * 0.18;
  }

  // Starfield slow drift + glittering twinkle
  if (starField) {
    starField.rotation.y = elapsed * 0.01;
    starField.material.size = 0.12 + Math.abs(Math.sin(elapsed * 2.8) * Math.cos(elapsed * 1.5)) * 0.06;
    starField.material.opacity = 0.45 + Math.sin(elapsed * 1.2) * 0.15;
  }

  // Core energy wave rings disabled

  // Floating objects — bobbing, multi-axis rotation, orbiting
  floatingObjects.forEach(obj => {
    if (obj.isDatabaseColumn) {
      const scaleY = 1.0 + Math.sin(elapsed * obj.speed + obj.offset) * 0.18;
      obj.mesh.scale.set(1.0, scaleY, 1.0);
      obj.mesh.position.y = (obj.baseH * scaleY) / 2;
      return;
    }

    if (obj.scaleFlicker) {
      // Realistic vertical flame flickering and width pulse
      const scaleY = 0.7 + Math.sin(elapsed * obj.speed + obj.offset) * 0.45;
      const scaleXZ = 0.85 + Math.cos(elapsed * (obj.speed * 1.3) + obj.offset) * 0.15;
      obj.mesh.scale.set(scaleXZ, scaleY, scaleXZ);
      obj.mesh.material.opacity = 0.45 + Math.sin(elapsed * 18 + obj.offset) * 0.35;
      return;
    }

    if (obj.orbit) {
      // Orbiting cubes
      const angle = elapsed * obj.speed + obj.offset;
      obj.mesh.position.x = obj.orbit.cx + Math.cos(angle) * obj.orbit.radius;
      obj.mesh.position.z = obj.orbit.cz + Math.sin(angle) * obj.orbit.radius;
      obj.mesh.position.y = obj.baseY + Math.sin(elapsed * 1.5 + obj.offset) * 0.15;
      obj.mesh.rotation.x = elapsed * 0.5;
      obj.mesh.rotation.z = elapsed * 0.3;
      return;
    }

    // Standard bobbing
    obj.mesh.position.y = obj.baseY + Math.sin(elapsed * obj.speed + obj.offset) * 0.12;

    if (obj.rotate) {
      // Zero-G tumbling rotation
      obj.mesh.rotation.y = elapsed * (obj.speed * 0.4) + obj.offset;
      obj.mesh.rotation.x = Math.sin(elapsed * 0.4 + obj.offset) * 0.18;
      obj.mesh.rotation.z = Math.cos(elapsed * 0.3 + obj.offset) * 0.18;
    }
  });

  // Drone hover with roll & pitch tilt physics
  drones.forEach(d => {
    d.mesh.position.y = d.baseY + Math.sin(elapsed * d.speed + d.offset) * 0.2;
    d.mesh.position.x = d.baseX + Math.sin(elapsed * d.speed * 0.7 + d.offset) * 0.3;
    
    // Tilt physics based on movement direction
    d.mesh.rotation.z = -Math.cos(elapsed * d.speed * 0.7 + d.offset) * 0.15; // roll
    d.mesh.rotation.x = Math.cos(elapsed * d.speed + d.offset) * 0.1; // pitch
    d.mesh.rotation.y = elapsed * 0.5;
  });

  // Orb pulse
  orbs.forEach(o => {
    const pulse = 0.3 + Math.sin(elapsed * 2) * 0.2;
    o.mesh.material.opacity = pulse;
    const s = 0.9 + Math.sin(elapsed * 1.5) * 0.1;
    o.mesh.scale.set(s, s, s);
  });

  // Pipeline core glow pulses
  pipelines.forEach((pipe, idx) => {
    pipe.glow.material.opacity = 0.15 + Math.sin(elapsed * 4.5 + idx) * 0.1;
  });

  // Pipeline particle flow
  particles.forEach((part, index) => {
    part.progress += part.speed;
    if (part.progress >= 1) {
      scene.remove(part.mesh);
      particles.splice(index, 1);
    } else {
      const pos = part.path.getPointAt(part.progress);
      part.mesh.position.copy(pos);
      // Fade out near end
      part.mesh.material.opacity = Math.min(0.85, (1 - part.progress) * 2);
    }
  });

  // Spawn particles periodically
  pipelines.forEach(pipe => {
    if (Math.random() < 0.04) {
      spawnFlowParticle(pipe);
    }
  });

  // Dynamic updates for active platform details (light columns & scan rings)
  Object.keys(PLATFORMS).forEach(key => {
    const isCurrentActive = (activeSection === 'services' && key === 'design') ||
                            (activeSection === 'work' && key === 'ops') ||
                            (activeSection === 'process' && key === 'core') ||
                            (activeSection === 'pricing' && key === 'data');
    
    // Light columns disabled
    
    // Animate scan ring
    const ring = scanRings[key];
    if (ring) {
      const targetOpacity = isCurrentActive ? 0.65 : 0.0;
      ring.material.opacity += (targetOpacity - ring.material.opacity) * 0.08;
      if (isCurrentActive) {
        const ringScale = 1.0 + (elapsed * 0.7) % 0.5;
        ring.scale.setScalar(ringScale);
        ring.rotation.z = elapsed * 0.4;
      } else {
        ring.scale.setScalar(1.0);
      }
    }
  });

  // Blink server LEDs on core monolith stacks
  serverLeds.forEach(led => {
    led.mesh.material.opacity = 0.2 + Math.max(0, Math.sin(elapsed * led.blinkSpeed + led.offset)) * 0.8;
  });

  // Pulse platform accent lights
  platformLights.forEach(p => {
    p.light.intensity = p.baseIntensity + Math.sin(elapsed * p.speed + p.offset) * 0.3;
  });

  // Pulse satellite transmission cone beam
  if (devopsBeam) {
    const scaleFactor = 1.0 + Math.sin(elapsed * 12) * 0.06;
    devopsBeam.scale.set(scaleFactor, 1.0, scaleFactor);
    devopsBeam.material.opacity = 0.12 + Math.sin(elapsed * 20) * 0.04;
  }

  // Rotate holographic central logo orbital rings
  centralOrbitRings.forEach(ring => {
    ring.mesh.rotation.x += ring.axisX * delta;
    ring.mesh.rotation.y += ring.axisY * delta;
    ring.mesh.rotation.z += ring.axisZ * delta;
  });

  // Dynamic canvas dashboard texture update
  updateOrchestratorPanel(elapsed);

  renderer.render(scene, camera);
}

// ==========================================
// RESIZE
// ==========================================
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ==========================================
// INIT ON LOAD (Immediate + Event fallback)
// ==========================================
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  init3DScene();
} else {
  document.addEventListener('DOMContentLoaded', init3DScene);
}
window.addEventListener('load', () => {
  if (!scene) init3DScene();
});
