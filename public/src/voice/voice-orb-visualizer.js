/**
 * ==========================================================================
 * CONCODE AI — Holographic Quantum Fluid Voice Visualizer
 * Dynamic 60FPS Fluid Wave Sphere & Audio-Reactive Quantum Core Organism.
 * Renders multi-harmonic radial wave ripples, glowing particle nucleus,
 * and liquid spectral lighting.
 * ==========================================================================
 */

class VoiceOrbVisualizer {
  constructor(canvasElement, listenerModule = null) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    this.listener = listenerModule;

    this.state = 'PASSIVE'; // 'PASSIVE' | 'ACTIVATED' | 'PROCESSING' | 'SPEAKING' | 'ERROR'
    this.animFrameId = null;
    this.phase = 0;
    this.particles = [];
    this.particleCount = 28;

    this.initCanvasDpr();
    this.initParticles();
    this.startRenderLoop();
  }

  /**
   * DPR Scaling for high-density Retina displays
   */
  initCanvasDpr() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width || 80;
    this.height = rect.height || 80;

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  /**
   * Initializes floating quantum particles
   */
  initParticles() {
    this.particles = [];
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push({
        angle: Math.random() * Math.PI * 2,
        dist: 6 + Math.random() * 22,
        radius: 0.8 + Math.random() * 1.8,
        speed: (0.008 + Math.random() * 0.02) * (Math.random() > 0.5 ? 1 : -1),
        pulseOffset: Math.random() * Math.PI * 2,
        alpha: 0.3 + Math.random() * 0.7
      });
    }
  }

  /**
   * Updates state transition
   */
  setState(newState) {
    if (this.state === newState) return;
    this.state = newState;
  }

  /**
   * Main 60FPS fluid render loop
   */
  startRenderLoop() {
    const render = () => {
      this.ctx.clearRect(0, 0, this.width, this.height);
      const cx = this.width / 2;
      const cy = this.height / 2;

      // Extract microphone audio energy
      const audioData = this.listener ? this.listener.getAudioData() : new Uint8Array(0);
      let audioEnergy = 0;
      if (audioData && audioData.length > 0) {
        let sum = 0;
        for (let i = 0; i < audioData.length; i++) sum += audioData[i];
        audioEnergy = sum / audioData.length / 255; // Normalized 0..1
      }

      this.phase += 0.03 + audioEnergy * 0.08;

      // 1. Ambient Glow Aura Field
      this.drawGlowAura(cx, cy, audioEnergy);

      // 2. Multi-Layer Fluid Wave Mesh
      this.drawFluidWaveMesh(cx, cy, audioEnergy);

      // 3. Quantum Nucleus Core
      this.drawQuantumCore(cx, cy, audioEnergy);

      // 4. Orbiting Energy Particles
      this.drawOrbitParticles(cx, cy, audioEnergy);

      this.animFrameId = requestAnimationFrame(render);
    };

    render();
  }

  /**
   * 1. Ambient Fluid Glow Aura Field
   */
  drawGlowAura(cx, cy, energy) {
    const pulse = Math.sin(this.phase * 0.5) * 2 + energy * 8;
    const radius = 22 + pulse;
    const grad = this.ctx.createRadialGradient(cx, cy, 2, cx, cy, radius + 14);

    let colorStop0 = 'rgba(0, 240, 255, 0.9)';
    let colorStop1 = 'rgba(168, 85, 247, 0.4)';

    if (this.state === 'PASSIVE') {
      colorStop0 = 'rgba(16, 185, 129, 0.85)';
      colorStop1 = 'rgba(6, 182, 212, 0.3)';
    } else if (this.state === 'PROCESSING') {
      colorStop0 = 'rgba(236, 72, 153, 0.95)';
      colorStop1 = 'rgba(168, 85, 247, 0.5)';
    } else if (this.state === 'SPEAKING') {
      colorStop0 = 'rgba(251, 191, 36, 0.95)';
      colorStop1 = 'rgba(245, 158, 11, 0.5)';
    }

    grad.addColorStop(0, colorStop0);
    grad.addColorStop(0.6, colorStop1);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    this.ctx.fillStyle = grad;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius + 14, 0, Math.PI * 2);
    this.ctx.fill();
  }

  /**
   * 2. Multi-Harmonic Fluid Radial Wave Mesh (Silky Liquid Wave Spheres)
   */
  drawFluidWaveMesh(cx, cy, energy) {
    const numPoints = 120;
    const layers = 3;

    let strokeColors = [
      'rgba(0, 240, 255, 0.85)',
      'rgba(168, 85, 247, 0.65)',
      'rgba(236, 72, 153, 0.55)'
    ];

    if (this.state === 'PASSIVE') {
      strokeColors = [
        'rgba(16, 185, 129, 0.85)',
        'rgba(6, 182, 212, 0.65)',
        'rgba(52, 211, 153, 0.55)'
      ];
    } else if (this.state === 'SPEAKING') {
      strokeColors = [
        'rgba(251, 191, 36, 0.9)',
        'rgba(245, 158, 11, 0.7)',
        'rgba(253, 230, 138, 0.5)'
      ];
    }

    for (let layer = 0; layer < layers; layer++) {
      const baseR = 18 + layer * 3.5 + energy * 6;
      const phaseOffset = this.phase * (1 + layer * 0.3) * (layer % 2 === 0 ? 1 : -1);
      const harmonics = 3 + layer;

      this.ctx.beginPath();
      for (let i = 0; i <= numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        const wave1 = Math.sin(angle * harmonics + phaseOffset) * (2.5 + energy * 7);
        const wave2 = Math.cos(angle * (harmonics + 2) - phaseOffset) * (1.5 + energy * 4);
        const r = baseR + wave1 + wave2;

        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;

        if (i === 0) this.ctx.moveTo(x, y);
        else this.ctx.lineTo(x, y);
      }

      this.ctx.closePath();
      this.ctx.strokeStyle = strokeColors[layer];
      this.ctx.lineWidth = 1.6 - layer * 0.3;
      this.ctx.stroke();
    }
  }

  /**
   * 3. Quantum Core Nucleus
   */
  drawQuantumCore(cx, cy, energy) {
    const pulse = Math.sin(this.phase * 2) * 1.5 + energy * 5;
    const coreR = Math.max(4, 7 + pulse);

    let coreColor = '#00f0ff';
    if (this.state === 'PASSIVE') coreColor = '#10b981';
    if (this.state === 'PROCESSING') coreColor = '#ec4899';
    if (this.state === 'SPEAKING') coreColor = '#fbbf24';

    this.ctx.save();
    this.ctx.shadowColor = coreColor;
    this.ctx.shadowBlur = 14;
    this.ctx.fillStyle = coreColor;

    this.ctx.beginPath();
    this.ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  /**
   * 4. Orbiting Energy Micro-Particles
   */
  drawOrbitParticles(cx, cy, energy) {
    for (let p of this.particles) {
      p.angle += p.speed * (this.state === 'PROCESSING' ? 2.5 : 1);
      const r = p.dist + Math.sin(this.phase + p.pulseOffset) * (2 + energy * 6);

      const x = cx + Math.cos(p.angle) * r;
      const y = cy + Math.sin(p.angle) * r;

      let pColor = 'rgba(0, 240, 255, ';
      if (this.state === 'PASSIVE') pColor = 'rgba(16, 185, 129, ';
      if (this.state === 'PROCESSING') pColor = 'rgba(236, 72, 153, ';
      if (this.state === 'SPEAKING') pColor = 'rgba(251, 191, 36, ';

      this.ctx.fillStyle = pColor + p.alpha + ')';
      this.ctx.beginPath();
      this.ctx.arc(x, y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  /**
   * Cleanup animation frame
   */
  destroy() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = VoiceOrbVisualizer;
} else {
  window.VoiceOrbVisualizer = VoiceOrbVisualizer;
}
