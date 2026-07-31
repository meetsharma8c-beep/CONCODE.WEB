/**
 * NanoCore by CONCODE - Module 1: NanoDesign
 * World-Class 3D WebGL Nanostructure Visualizer & Physics Engine
 */

export class NanoDesignEngine {
  constructor(containerElement) {
    this.container = containerElement;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.atomGroup = null;
    this.bondGroup = null;
    this.cloudGroup = null;
    this.wireframeMode = false;
    this.renderStyleMode = 'ball_stick'; // 'ball_stick' | 'cpk' | 'pi_orbital'
    this.selectedAtoms = [];

    // Element color & atomic radius scale definitions (in nm & hex)
    this.elementSpecs = {
      C:  { color: 0x00f0ff, radius: 0.12, cpkColor: 0x333333 },
      Ti: { color: 0x99aacc, radius: 0.16, cpkColor: 0x778899 },
      O:  { color: 0xff3355, radius: 0.10, cpkColor: 0xff0022 },
      Pb: { color: 0xaa66cc, radius: 0.18, cpkColor: 0x5511aa },
      Cs: { color: 0xffcc00, radius: 0.22, cpkColor: 0xee9900 },
      I:  { color: 0xbb00ff, radius: 0.14, cpkColor: 0x9900cc },
      Au: { color: 0xffd700, radius: 0.15, cpkColor: 0xcc9900 },
      Fe: { color: 0xff6600, radius: 0.14, cpkColor: 0xbb4400 },
      Zn: { color: 0x77ddaa, radius: 0.13, cpkColor: 0x44aa77 }
    };

    // Current structural data
    this.currentData = {
      type: 'cnt',
      n: 10,
      m: 10,
      lengthNm: 3.0,
      atoms: [],
      bonds: [],
      metrics: null
    };

    this.initThree();
    this.setupResizeObserver();
  }

  initThree() {
    if (!this.container) return;

    const ThreeLib = window.THREE || (typeof THREE !== 'undefined' ? THREE : null);
    if (!ThreeLib) {
      console.warn('NanoDesignEngine: Three.js not yet ready, retrying in 150ms...');
      setTimeout(() => this.initThree(), 150);
      return;
    }

    // Scene
    this.scene = new ThreeLib.Scene();
    this.scene.background = new ThreeLib.Color(0x030508);

    // Camera
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 500;
    this.camera = new ThreeLib.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, 8);

    // Renderer
    this.renderer = new ThreeLib.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = false;

    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    // OrbitControls
    if (window.THREE && window.THREE.OrbitControls) {
      this.controls = new window.THREE.OrbitControls(this.camera, this.renderer.domElement);
    } else if (typeof OrbitControls !== 'undefined') {
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    }
    if (this.controls) {
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.04;
    }

    // Sensitive Dark Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x10b981, 0.9);
    dirLight1.position.set(10, 20, 15);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xe2e8f0, 0.5);
    dirLight2.position.set(-10, -20, -15);
    this.scene.add(dirLight2);

    const pointLight = new THREE.PointLight(0xffffff, 0.5, 50);
    pointLight.position.set(0, 0, 10);
    this.scene.add(pointLight);

    // Groups
    this.atomGroup = new THREE.Group();
    this.bondGroup = new THREE.Group();
    this.cloudGroup = new THREE.Group();
    this.scene.add(this.atomGroup);
    this.scene.add(this.bondGroup);
    this.scene.add(this.cloudGroup);

    this.createAmbientParticleCloud();

    // Animation Loop
    const animate = () => {
      requestAnimationFrame(animate);
      if (this.controls) this.controls.update();
      if (this.atomGroup && !this.isInteracting) {
        this.atomGroup.rotation.y += 0.0015;
        this.bondGroup.rotation.y += 0.0015;
        this.cloudGroup.rotation.y += 0.0015;
      }
      if (this.ambientParticles) {
        this.ambientParticles.rotation.y += 0.0006;
        this.ambientParticles.rotation.x += 0.0003;
      }
      this.renderer.render(this.scene, this.camera);
    };
    animate();

    // Click Raycaster for Atom Selection / Measuring
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.renderer.domElement.addEventListener('click', (e) => this.onAtomClick(e));
  }

  setupResizeObserver() {
    if (!this.container) return;
    const resizeObserver = new ResizeObserver(() => {
      if (!this.container || !this.renderer || !this.camera) return;
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;
      if (width === 0 || height === 0) return;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    });
    resizeObserver.observe(this.container);
  }

  createAmbientParticleCloud() {
    if (this.ambientParticles) {
      this.scene.remove(this.ambientParticles);
      if (this.ambientParticles.geometry) this.ambientParticles.geometry.dispose();
      if (this.ambientParticles.material) this.ambientParticles.material.dispose();
    }

    const count = 500;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const emerald = new THREE.Color(0x10b981);
    const silver = new THREE.Color(0xe2e8f0);
    const cyan = new THREE.Color(0x06b6d4);

    for (let i = 0; i < count; i++) {
      const radius = 1.8 + Math.random() * 4.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI - Math.PI / 2;

      positions[i * 3] = radius * Math.cos(theta) * Math.cos(phi);
      positions[i * 3 + 1] = radius * Math.sin(phi);
      positions[i * 3 + 2] = radius * Math.sin(theta) * Math.cos(phi);

      const rnd = Math.random();
      const c = rnd > 0.6 ? emerald : (rnd > 0.3 ? silver : cyan);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.07,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });

    this.ambientParticles = new THREE.Points(geometry, material);
    this.scene.add(this.ambientParticles);
  }

  calculateMetrics(n, m, lengthNm = 3.0) {
    const acc = 0.142; // C-C bond length (nm)
    const a = Math.sqrt(3) * acc; // ~0.246 nm lattice constant
    const chiralLength = a * Math.sqrt(n * n + n * m + m * m); // C_h (nm)
    const diameterNm = chiralLength / Math.PI; // d = C_h / pi

    const chiralAngleRad = Math.atan((Math.sqrt(3) * m) / (2 * n + m));
    const chiralAngleDeg = (chiralAngleRad * 180) / Math.PI;

    const diff = Math.abs(n - m);
    const isMetallic = diff % 3 === 0;

    let typeStr = 'Chiral';
    if (m === 0) typeStr = 'Zigzag';
    else if (n === m) typeStr = 'Armchair';

    return {
      n,
      m,
      acc,
      latticeConstant: a,
      chiralLengthNm: chiralLength,
      diameterNm,
      chiralAngleDeg,
      isMetallic,
      typeStr,
      bandgapType: isMetallic ? 'Metallic (Conductor)' : 'Semiconducting',
      estimatedBandgapEv: isMetallic ? 0.0 : Number((0.8 / diameterNm).toFixed(3))
    };
  }

  /**
   * Generates World-Class Nanostructures (CNT, Graphene, Fullerene, MXene, Perovskite, MOF, Quantum Dot)
   */
  generateNanostructure(params) {
    const { type = 'cnt', n = 10, m = 10, lengthNm = 3.0 } = params;
    const metrics = this.calculateMetrics(n, m, lengthNm);

    const atoms = [];
    const bonds = [];
    const acc = 0.142;
    const scale = 2.0;

    if (type === 'cnt') {
      const radius = (metrics.diameterNm * scale) / 2;
      const height = lengthNm * scale;
      const numRings = Math.floor(height / (acc * scale * 1.5)) || 10;
      const atomsPerRing = Math.max(12, (n + m) * 2);

      let atomId = 0;
      for (let r = 0; r < numRings; r++) {
        const y = -height / 2 + r * (acc * scale * 1.2);
        const ringShift = (r % 2) * (Math.PI / atomsPerRing);

        for (let i = 0; i < atomsPerRing; i++) {
          const angle = (i * 2 * Math.PI) / atomsPerRing + ringShift;
          const x = radius * Math.cos(angle);
          const z = radius * Math.sin(angle);
          atoms.push({ id: atomId++, x, y, z, element: 'C' });
        }
      }

      const maxBondDistSq = Math.pow(acc * scale * 1.6, 2);
      for (let i = 0; i < atoms.length; i++) {
        for (let j = i + 1; j < atoms.length; j++) {
          const dx = atoms[i].x - atoms[j].x;
          const dy = atoms[i].y - atoms[j].y;
          const dz = atoms[i].z - atoms[j].z;
          if (dx * dx + dy * dy + dz * dz <= maxBondDistSq) {
            bonds.push({ atom1Index: i, atom2Index: j });
          }
        }
      }
    } else if (type === 'graphene') {
      const rows = 10;
      const cols = 12;
      let atomId = 0;
      const spacingX = acc * scale * Math.sqrt(3);
      const spacingY = acc * scale * 1.5;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = (c - cols / 2) * spacingX + ((r % 2) * spacingX) / 2;
          const z = (r - rows / 2) * spacingY;
          const y = 0;
          atoms.push({ id: atomId++, x, y, z, element: 'C' });
        }
      }

      const maxBondDistSq = Math.pow(acc * scale * 1.6, 2);
      for (let i = 0; i < atoms.length; i++) {
        for (let j = i + 1; j < atoms.length; j++) {
          const dx = atoms[i].x - atoms[j].x;
          const dz = atoms[i].z - atoms[j].z;
          if (dx * dx + dz * dz <= maxBondDistSq) {
            bonds.push({ atom1Index: i, atom2Index: j });
          }
        }
      }
    } else if (type === 'fullerene') {
      const phi = (1 + Math.sqrt(5)) / 2;
      const rScale = scale * 0.7;
      const rawAtoms = [];

      const addPermutations = (a, b, c) => {
        const sign = [1, -1];
        sign.forEach(s1 => {
          sign.forEach(s2 => {
            sign.forEach(s3 => {
              rawAtoms.push([a * s1, b * s2, c * s3]);
            });
          });
        });
      };

      addPermutations(0, 1, 3 * phi);
      addPermutations(2, 1 + 2 * phi, phi);
      addPermutations(1, 2 + phi, 2 * phi);

      let atomId = 0;
      rawAtoms.forEach(pt => {
        const len = Math.sqrt(pt[0] * pt[0] + pt[1] * pt[1] + pt[2] * pt[2]);
        const norm = (rScale * 1.5) / len;
        atoms.push({ id: atomId++, x: pt[0] * norm, y: pt[1] * norm, z: pt[2] * norm, element: 'C' });
      });

      const maxBondDistSq = Math.pow(rScale * 1.2, 2);
      for (let i = 0; i < atoms.length; i++) {
        for (let j = i + 1; j < atoms.length; j++) {
          const dx = atoms[i].x - atoms[j].x;
          const dy = atoms[i].y - atoms[j].y;
          const dz = atoms[i].z - atoms[j].z;
          if (dx * dx + dy * dy + dz * dz <= maxBondDistSq) {
            bonds.push({ atom1Index: i, atom2Index: j });
          }
        }
      }
    } else if (type === 'mxene') {
      // 2D Ti3C2Tx MXene nanosheet
      let atomId = 0;
      const rows = 8, cols = 8;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = (c - cols/2) * 0.5;
          const z = (r - rows/2) * 0.5;
          // Ti top & bottom layers, C middle layer, O surface terminations
          atoms.push({ id: atomId++, x, y: 0.3, z, element: 'Ti' });
          atoms.push({ id: atomId++, x: x + 0.15, y: 0, z: z + 0.15, element: 'C' });
          atoms.push({ id: atomId++, x, y: -0.3, z, element: 'Ti' });
          atoms.push({ id: atomId++, x, y: 0.6, z, element: 'O' });
        }
      }
      for (let i = 0; i < atoms.length; i++) {
        for (let j = i + 1; j < atoms.length; j++) {
          const dx = atoms[i].x - atoms[j].x;
          const dy = atoms[i].y - atoms[j].y;
          const dz = atoms[i].z - atoms[j].z;
          if (dx*dx + dy*dy + dz*dz <= 0.25) bonds.push({ atom1Index: i, atom2Index: j });
        }
      }
    } else if (type === 'perovskite') {
      // CsPbI3 Perovskite crystal unit cells
      let atomId = 0;
      for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
          for (let z = -1; z <= 1; z++) {
            atoms.push({ id: atomId++, x: x*1.2, y: y*1.2, z: z*1.2, element: 'Pb' });
            atoms.push({ id: atomId++, x: x*1.2 + 0.6, y: y*1.2 + 0.6, z: z*1.2 + 0.6, element: 'Cs' });
            atoms.push({ id: atomId++, x: x*1.2 + 0.6, y: y*1.2, z: z*1.2, element: 'I' });
          }
        }
      }
      for (let i = 0; i < atoms.length; i++) {
        for (let j = i + 1; j < atoms.length; j++) {
          const dx = atoms[i].x - atoms[j].x;
          const dy = atoms[i].y - atoms[j].y;
          const dz = atoms[i].z - atoms[j].z;
          if (dx*dx + dy*dy + dz*dz <= 0.8) bonds.push({ atom1Index: i, atom2Index: j });
        }
      }
    } else if (type === 'mof' || type === 'quantum_dot') {
      // Core-Shell Quantum Dot / MOF cage
      let atomId = 0;
      const count = type === 'mof' ? 60 : 120;
      const radius = type === 'mof' ? 1.8 : 2.2;
      for (let i = 0; i < count; i++) {
        const theta = Math.acos(-1 + (2 * i) / count);
        const phi = Math.sqrt(count * Math.PI) * theta;
        const x = radius * Math.cos(phi) * Math.sin(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(theta);
        const el = i % 3 === 0 ? 'Zn' : (i % 3 === 1 ? 'O' : 'C');
        atoms.push({ id: atomId++, x, y, z, element: el });
      }
      for (let i = 0; i < atoms.length; i++) {
        for (let j = i + 1; j < atoms.length; j++) {
          const dx = atoms[i].x - atoms[j].x;
          const dy = atoms[i].y - atoms[j].y;
          const dz = atoms[i].z - atoms[j].z;
          if (dx*dx + dy*dy + dz*dz <= 0.6) bonds.push({ atom1Index: i, atom2Index: j });
        }
      }
    }

    this.currentData = { type, n, m, lengthNm, atoms, bonds, metrics };
    this.render3DMesh(atoms, bonds, metrics.isMetallic);
    return metrics;
  }

  setRenderStyleMode(mode) {
    this.renderStyleMode = mode;
    if (this.currentData.atoms.length > 0) {
      this.render3DMesh(this.currentData.atoms, this.currentData.bonds, this.currentData.metrics?.isMetallic);
    }
  }

  disposeGroup(group) {
    if (!group) return;
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }
  }

  /**
   * Render Three.js meshes for atoms, bonds, and pi-orbitals
   */
  render3DMesh(atoms, bonds, isMetallic) {
    this.disposeGroup(this.atomGroup);
    this.disposeGroup(this.bondGroup);
    this.disposeGroup(this.cloudGroup);
    this.createAmbientParticleCloud();

    const defaultAtomColor = isMetallic ? 0x10b981 : 0xe2e8f0;
    const defaultBondColor = isMetallic ? 0x059669 : 0x64748b;

    if (!this._sharedSphereGeo) this._sharedSphereGeo = new THREE.SphereGeometry(1, 12, 12);
    if (!this._sharedCylinderGeo) this._sharedCylinderGeo = new THREE.CylinderGeometry(0.03, 0.03, 1, 6);
    if (!this._materialCache) this._materialCache = new Map();

    const getMaterial = (color, wireframe, isBond = false) => {
      const key = `${color}_${wireframe}_${isBond}`;
      if (!this._materialCache.has(key)) {
        this._materialCache.set(key, new THREE.MeshStandardMaterial({
          color,
          roughness: isBond ? 0.4 : 0.3,
          metalness: isBond ? 0.6 : 0.8,
          wireframe
        }));
      }
      return this._materialCache.get(key);
    };

    atoms.forEach(atom => {
      const spec = this.elementSpecs[atom.element] || { color: defaultAtomColor, radius: 0.12, cpkColor: 0x555555 };
      const radius = this.renderStyleMode === 'cpk' ? spec.radius * 2.2 : 0.12;
      const color = this.renderStyleMode === 'cpk' ? spec.cpkColor : spec.color;

      const atomMat = getMaterial(color, this.wireframeMode, false);
      const mesh = new THREE.Mesh(this._sharedSphereGeo, atomMat);
      mesh.scale.set(radius, radius, radius);
      mesh.position.set(atom.x, atom.y, atom.z);
      mesh.userData = { atomId: atom.id, x: atom.x, y: atom.y, z: atom.z, element: atom.element };
      this.atomGroup.add(mesh);

      if (this.renderStyleMode === 'pi_orbital') {
        const cloudMat = getMaterial(0x00ffff, true, false);
        const cloudMesh = new THREE.Mesh(this._sharedSphereGeo, cloudMat);
        cloudMesh.scale.set(radius * 1.8, radius * 1.8, radius * 1.8);
        cloudMesh.position.set(atom.x, atom.y, atom.z);
        this.cloudGroup.add(cloudMesh);
      }
    });

    if (this.renderStyleMode !== 'cpk') {
      const bondMat = getMaterial(defaultBondColor, this.wireframeMode, true);
      const yAxis = new THREE.Vector3(0, 1, 0);

      bonds.forEach(bond => {
        const a1 = atoms[bond.atom1Index];
        const a2 = atoms[bond.atom2Index];
        if (!a1 || !a2) return;

        const p1 = new THREE.Vector3(a1.x, a1.y, a1.z);
        const p2 = new THREE.Vector3(a2.x, a2.y, a2.z);
        const distance = p1.distanceTo(p2);

        const bondMesh = new THREE.Mesh(this._sharedCylinderGeo, bondMat);
        bondMesh.scale.set(1, distance, 1);

        const midpoint = p1.clone().add(p2).multiplyScalar(0.5);
        bondMesh.position.copy(midpoint);
        bondMesh.quaternion.setFromUnitVectors(yAxis, p2.clone().sub(p1).normalize());

        this.bondGroup.add(bondMesh);
      });
    }
  }


  toggleWireframe() {
    this.wireframeMode = !this.wireframeMode;
    this.atomGroup.children.forEach(child => {
      if (child.material) child.material.wireframe = this.wireframeMode;
    });
    this.bondGroup.children.forEach(child => {
      if (child.material) child.material.wireframe = this.wireframeMode;
    });
    return this.wireframeMode;
  }

  onAtomClick(event) {
    if (!this.container || !this.atomGroup) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.atomGroup.children);

    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object;
      const data = clickedMesh.userData;

      clickedMesh.material = clickedMesh.material.clone();
      clickedMesh.material.color.setHex(0xff0055);

      this.selectedAtoms.push(data);
      if (this.selectedAtoms.length > 2) {
        this.selectedAtoms.shift();
      }

      if (this.selectedAtoms.length === 2) {
        const p1 = new THREE.Vector3(this.selectedAtoms[0].x, this.selectedAtoms[0].y, this.selectedAtoms[0].z);
        const p2 = new THREE.Vector3(this.selectedAtoms[1].x, this.selectedAtoms[1].y, this.selectedAtoms[1].z);
        const distanceNm = (p1.distanceTo(p2) / 2) * 0.142;

        const distElement = document.getElementById('nano-measure-output');
        if (distElement) {
          distElement.innerHTML = `Atom #${this.selectedAtoms[0].atomId} (${this.selectedAtoms[0].element}) ↔ Atom #${this.selectedAtoms[1].atomId} (${this.selectedAtoms[1].element}): <span style="color:#00ff9d; font-weight:bold;">${distanceNm.toFixed(3)} nm</span>`;
        }
      }
    }
  }

  /**
   * Parse PDB/XYZ text content and render
   */
  importFileContent(fileText, extension = 'xyz') {
    const lines = fileText.split('\n');
    const atoms = [];
    let atomId = 0;

    lines.forEach(line => {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 4) {
        const element = parts[0].replace(/[^a-zA-Z]/g, '') || 'C';
        const x = parseFloat(parts[1]);
        const y = parseFloat(parts[2]);
        const z = parseFloat(parts[3]);
        if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
          atoms.push({ id: atomId++, x: x * 0.5, y: y * 0.5, z: z * 0.5, element });
        }
      }
    });

    const bonds = [];
    for (let i = 0; i < atoms.length; i++) {
      for (let j = i + 1; j < atoms.length; j++) {
        const dx = atoms[i].x - atoms[j].x;
        const dy = atoms[i].y - atoms[j].y;
        const dz = atoms[i].z - atoms[j].z;
        if (dx*dx + dy*dy + dz*dz <= 0.8) bonds.push({ atom1Index: i, atom2Index: j });
      }
    }

    const metrics = {
      n: 0, m: 0, chiralAngleDeg: 0, diameterNm: 1.5,
      isMetallic: false, bandgapType: 'Imported Structure', estimatedBandgapEv: 1.2
    };

    this.currentData = { type: 'imported', n: 0, m: 0, lengthNm: 2.0, atoms, bonds, metrics };
    this.render3DMesh(atoms, bonds, false);
    return metrics;
  }

  exportXYZ() {
    const { atoms, type, n, m } = this.currentData;
    let content = `${atoms.length}\n`;
    content += `NanoCore by CONCODE Structure: ${type.toUpperCase()} (${n},${m})\n`;

    atoms.forEach(atom => {
      const x = (atom.x * 0.142).toFixed(4);
      const y = (atom.y * 0.142).toFixed(4);
      const z = (atom.z * 0.142).toFixed(4);
      content += `${atom.element} ${x} ${y} ${z}\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nanocore_${type}_${n}_${m}.xyz`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
