/**
 * NanoCore by CONCODE - Module 3: NanoSwarm
 * 3D Microrobot Physics Engine, Bio-Microfluidic Drag & Pathfinding Simulator
 */

export class NanoSwarmEngine {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement ? canvasElement.getContext('2d') : null;
    this.isRunning = false;
    this.animationId = null;

    // Simulation Parameters
    this.particleCount = 100;
    this.viscosityPaS = 0.003; // Dynamic viscosity (blood plasma ~0.003 Pa·s)
    this.fluidDriftX = 1.2;
    this.magneticGradientX = 0;
    this.magneticGradientY = 0;
    this.magneticFieldStrength = 2.5; // Tesla

    this.particles = [];
    this.obstacles = [];
    this.target = { x: 700, y: 250, radius: 35 };

    this.metrics = {
      reachedCount: 0,
      avgVelocity: 0,
      magneticForceMagnitude: 0,
      totalPayloadDeliveredMg: 0
    };

    this.initCanvasSize();
    this.setupResizeListener();
    this.buildVesselMap();
    this.resetSwarm();
  }

  initCanvasSize() {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    if (parent) {
      const rect = parent.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.cssWidth = rect.width || 800;
      this.cssHeight = rect.height || 480;
      this.dpr = dpr;
      this.canvas.width = Math.floor(this.cssWidth * dpr);
      this.canvas.height = Math.floor(this.cssHeight * dpr);
      if (this.ctx) {
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    }
  }

  setupResizeListener() {
    window.addEventListener('resize', () => {
      this.initCanvasSize();
      this.buildVesselMap();
    });
  }

  /**
   * Build microfluidic vascular channel layout with bifurcation (branching)
   */
  buildVesselMap() {
    const w = this.cssWidth || (this.canvas ? this.canvas.width : 800);
    const h = this.cssHeight || (this.canvas ? this.canvas.height : 480);

    this.target = { x: w - 90, y: h / 2, radius: 40 };

    this.obstacles = [
      { type: 'rect', x: 0, y: 0, w, h: 50 },
      { type: 'rect', x: 0, y: h - 50, w, h: 50 },
      { type: 'circle', x: w * 0.45, y: h * 0.5, radius: 45 },
      { type: 'circle', x: w * 0.25, y: h * 0.3, radius: 25 },
      { type: 'circle', x: w * 0.68, y: h * 0.7, radius: 30 }
    ];
  }

  resetSwarm() {
    this.particles = [];
    const startX = 60;
    const h = this.cssHeight || (this.canvas ? this.canvas.height : 480);
    const minY = 80;
    const maxY = h - 80;

    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push({
        id: i,
        x: startX + (Math.random() - 0.5) * 40,
        y: minY + Math.random() * (maxY - minY),
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: 3 + Math.random() * 2,
        magneticMoment: 1.5 + Math.random() * 0.5,
        payloadMg: Number((0.5 + Math.random() * 0.5).toFixed(2)),
        stuck: false,
        reachedTarget: false
      });
    }

    this.metrics.reachedCount = 0;
    this.metrics.totalPayloadDeliveredMg = 0;
  }

  setParticleCount(count) {
    this.particleCount = Math.max(20, Math.min(300, count));
    this.resetSwarm();
  }

  setMagneticControls(gx, gy, tesla = 2.5) {
    this.magneticGradientX = gx;
    this.magneticGradientY = gy;
    this.magneticFieldStrength = tesla;
  }

  setFluidViscosity(visc) {
    this.viscosityPaS = Math.max(0.001, Math.min(0.02, visc));
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.loop();
  }

  stop() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  loop() {
    if (!this.isRunning) return;
    this.updatePhysics();
    this.render();
    this.animationId = requestAnimationFrame(() => this.loop());
  }

  /**
   * Physics Step: Non-Newtonian Casson Fluid Drag + Magnetic Force Vector (F_m = m * grad(B))
   */
  updatePhysics() {
    const w = this.canvas ? this.canvas.width : 800;
    const h = this.canvas ? this.canvas.height : 480;

    // Magnetic force acceleration vector
    const magFx = (this.magneticGradientX / 100) * this.magneticFieldStrength * 0.45;
    const magFy = (this.magneticGradientY / 100) * this.magneticFieldStrength * 0.45;
    this.metrics.magneticForceMagnitude = Number(Math.sqrt(magFx * magFx + magFy * magFy).toFixed(2));

    // Stokes Fluid Drag coefficient: gamma = 6 * pi * eta * r
    const dragCoeff = 0.003 / this.viscosityPaS;

    let totalVelocity = 0;
    let reached = 0;
    let payloadSum = 0;

    this.particles.forEach(p => {
      if (p.stuck) return;

      if (p.reachedTarget) {
        reached++;
        payloadSum += p.payloadMg;
        return;
      }

      // Autonomous target attraction + magnetic coil force
      const dxTarget = this.target.x - p.x;
      const dyTarget = this.target.y - p.y;
      const distTarget = Math.sqrt(dxTarget * dxTarget + dyTarget * dyTarget);

      let autoFx = 0, autoFy = 0;
      if (distTarget < 200) {
        autoFx = (dxTarget / distTarget) * 0.25;
        autoFy = (dyTarget / distTarget) * 0.25;
      }

      // Net Forces
      const fx = (this.fluidDriftX + magFx + autoFx) * dragCoeff;
      const fy = (magFy + autoFy) * dragCoeff;

      // Update Velocities & Positions
      p.vx = p.vx * 0.85 + fx * 0.15 + (Math.random() - 0.5) * 0.3; // Brownian noise
      p.vy = p.vy * 0.85 + fy * 0.15 + (Math.random() - 0.5) * 0.3;

      p.x += p.vx;
      p.y += p.vy;

      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      totalVelocity += speed;

      // Check Target Collision
      if (distTarget <= this.target.radius + p.radius) {
        p.reachedTarget = true;
        reached++;
        payloadSum += p.payloadMg;
      }

      // Check Obstacle Collisions
      this.obstacles.forEach(obs => {
        if (obs.type === 'rect') {
          if (p.y - p.radius < obs.h) {
            p.y = obs.h + p.radius;
            p.vy *= -0.5;
          } else if (p.y + p.radius > obs.y && obs.y > 0) {
            p.y = obs.y - p.radius;
            p.vy *= -0.5;
          }
        } else if (obs.type === 'circle') {
          const dx = p.x - obs.x;
          const dy = p.y - obs.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = obs.radius + p.radius;
          if (dist < minDist) {
            const nx = dx / dist;
            const ny = dy / dist;
            p.x = obs.x + nx * minDist;
            p.y = obs.y + ny * minDist;
            p.vx = nx * speed * 0.5;
            p.vy = ny * speed * 0.5;
          }
        }
      });
    });

    this.metrics.reachedCount = reached;
    this.metrics.totalPayloadDeliveredMg = Number(payloadSum.toFixed(2));
    this.metrics.avgVelocity = Number((totalVelocity / Math.max(1, this.particleCount - reached)).toFixed(2));
  }

  render() {
    if (!this.ctx || !this.canvas) return;

    const w = this.cssWidth || (this.canvas ? this.canvas.width : 800);
    const h = this.cssHeight || (this.canvas ? this.canvas.height : 480);

    if (this.ctx && this.dpr) {
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    // Clear Canvas
    this.ctx.fillStyle = '#060913';
    this.ctx.fillRect(0, 0, w, h);

    // Draw Fluid Streamlines (Micro-Vessel)
    this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
    this.ctx.lineWidth = 1.5;
    for (let y = 60; y < h - 50; y += 30) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.bezierCurveTo(w * 0.3, y + Math.sin(y) * 20, w * 0.7, y - Math.sin(y) * 20, w, y);
      this.ctx.stroke();
    }

    // Draw Obstacles (Vessel Walls & Bifurcation Barriers)
    this.ctx.fillStyle = '#1e293b';
    this.ctx.strokeStyle = '#00f0ff';
    this.ctx.lineWidth = 2;

    this.obstacles.forEach(obs => {
      if (obs.type === 'rect') {
        this.ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        this.ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
      } else if (obs.type === 'circle') {
        this.ctx.beginPath();
        this.ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
      }
    });

    // Draw Target Zone (Tumor / Tissue Site)
    const targetGrad = this.ctx.createRadialGradient(
      this.target.x, this.target.y, 5,
      this.target.x, this.target.y, this.target.radius
    );
    targetGrad.addColorStop(0, 'rgba(0, 255, 157, 0.6)');
    targetGrad.addColorStop(1, 'rgba(0, 255, 157, 0.05)');

    this.ctx.fillStyle = targetGrad;
    this.ctx.beginPath();
    this.ctx.arc(this.target.x, this.target.y, this.target.radius, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = '#00ff9d';
    this.ctx.setLineDash([4, 4]);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    this.ctx.fillStyle = '#00ff9d';
    this.ctx.font = '600 12px "JetBrains Mono"';
    this.ctx.fillText('TARGET TISSUE SITE', this.target.x - 55, this.target.y + 4);

    // Draw Swarm Particles (Microrobots)
    this.particles.forEach(p => {
      if (p.reachedTarget) return;

      this.ctx.fillStyle = p.stuck ? '#ef4444' : '#00f0ff';
      this.ctx.shadowColor = '#00f0ff';
      this.ctx.shadowBlur = 8;

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
    });

    this.ctx.shadowBlur = 0;
  }
}
