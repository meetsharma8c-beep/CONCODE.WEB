/**
 * ==========================================================================
 * CONCODE AI — High-Energy Glowing Plasma Core Voice Engine v21.0
 * File: public/src/voice/voice-orb-visualizer.js
 * 
 * FEATURES:
 *  1. White-Hot Central Plasma Nucleus with Multi-Layer Radiance Halo
 *  2. Audio-Reactive Energy Breathing & Radial Shockwave Expansion
 *  3. High-Velocity Rotating Energy Plasma Arcs & Floating Star Dust
 *  4. Affective Emotion Color Adaptation (Cyan, Gold, Crimson, Violet)
 *  5. Pure High-Energy Visualizer — Compact, Vibrant, Zero Clutter
 * ==========================================================================
 */

class VoiceOrbVisualizer {
  constructor(canvasElement, listenerModule = null) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    this.listener = listenerModule;

    this.state = 'PASSIVE'; // 'PASSIVE' | 'ACTIVATED' | 'PROCESSING' | 'SPEAKING' | 'ERROR'
    this.currentEmotionKey = 'CALM';
    this.animFrameId = null;
    this.time = 0;
    this.smoothedEnergy = 0;

    // Energy Rays & Star Dust Particles
    this.rays = [];
    this.particles = [];
    this.initEnergyElements();

    this.initCanvasDpr();
    this.startRenderLoop();
  }

  initCanvasDpr() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width || 96;
    this.height = rect.height || 96;

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  setState(newState) {
    if (this.state === newState) return;
    this.state = newState;
  }

  setEmotion(emotionKey) {
    if (emotionKey && this.currentEmotionKey !== emotionKey) {
      this.currentEmotionKey = emotionKey;
    }
  }

  initEnergyElements() {
    // 12 Plasma Energy Rays
    this.rays = [];
    for (let i = 0; i < 12; i++) {
      this.rays.push({
        angle: (i / 12) * Math.PI * 2,
        length: Math.random() * 18 + 14,
        speed: Math.random() * 0.04 + 0.02,
        width: Math.random() * 2 + 1
      });
    }

    // 24 Floating Star Dust Particles
    this.particles = [];
    for (let i = 0; i < 24; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 28 + 8;
      this.particles.push({
        angle,
        dist,
        baseDist: dist,
        speed: Math.random() * 0.03 + 0.01,
        size: Math.random() * 1.8 + 0.8,
        alpha: Math.random() * 0.7 + 0.3
      });
    }
  }

  getEmotionPalette() {
    const palettes = {
      JOY: { core: '#ffffff', mid: '#fbbf24', outer: '#f59e0b', glow: 'rgba(251, 191, 36, 0.65)' },
      FRUSTRATION: { core: '#ffffff', mid: '#ef4444', outer: '#dc2626', glow: 'rgba(239, 68, 68, 0.65)' },
      CURIOSITY: { core: '#ffffff', mid: '#a855f7', outer: '#ec4899', glow: 'rgba(168, 85, 247, 0.65)' },
      URGENCY: { core: '#ffffff', mid: '#f59e0b', outer: '#ea580c', glow: 'rgba(245, 158, 11, 0.65)' },
      ANXIETY: { core: '#ffffff', mid: '#ec4899', outer: '#d946ef', glow: 'rgba(236, 72, 153, 0.65)' },
      CALM: { core: '#ffffff', mid: '#00f0ff', outer: '#10b981', glow: 'rgba(0, 240, 255, 0.65)' },
      EMPATHY: { core: '#ffffff', mid: '#3b82f6', outer: '#60a5fa', glow: 'rgba(59, 130, 246, 0.65)' },
      CREATIVITY: { core: '#ffffff', mid: '#a855f7', outer: '#00f0ff', glow: 'rgba(168, 85, 247, 0.65)' }
    };
    return palettes[this.currentEmotionKey] || palettes.CALM;
  }

  startRenderLoop() {
    const render = () => {
      this.time += 0.03;
      this.drawGlowingPlasmaCore();
      this.animFrameId = requestAnimationFrame(render);
    };
    render();
  }

  drawGlowingPlasmaCore() {
    const { ctx, width, height, time } = this;
    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const colors = this.getEmotionPalette();

    // Fetch Audio Frequency Energy
    let rawAudioEnergy = 0;
    if (this.listener && typeof this.listener.getAudioEnergy === 'function') {
      rawAudioEnergy = this.listener.getAudioEnergy() || 0;
    }
    this.smoothedEnergy += (rawAudioEnergy - this.smoothedEnergy) * 0.2;

    let energyPulse = 0.15 + this.smoothedEnergy * 0.75;
    if (this.state === 'SPEAKING') energyPulse = 0.55 + this.smoothedEnergy * 0.65;
    else if (this.state === 'PROCESSING') energyPulse = 0.35 + Math.sin(time * 6) * 0.2;

    // 1. Draw Outer Glowing Energy Aura
    const auraRadius = width * 0.42 * (1 + energyPulse * 0.25);
    const auraGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, auraRadius);
    auraGrad.addColorStop(0, colors.glow);
    auraGrad.addColorStop(0.55, colors.outer);
    auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(centerX, centerY, auraRadius, 0, Math.PI * 2);
    ctx.fill();

    // 2. Draw Rotating Plasma Energy Rays
    for (let i = 0; i < this.rays.length; i++) {
      const ray = this.rays[i];
      ray.angle += ray.speed + (this.state === 'SPEAKING' ? 0.03 : 0);

      const rLength = ray.length * (1 + energyPulse * 0.4);
      const startX = centerX + Math.cos(ray.angle) * 8;
      const startY = centerY + Math.sin(ray.angle) * 8;
      const endX = centerX + Math.cos(ray.angle) * rLength;
      const endY = centerY + Math.sin(ray.angle) * rLength;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = colors.mid;
      ctx.lineWidth = ray.width * (1 + energyPulse * 0.5);
      ctx.globalAlpha = 0.6 + Math.sin(time * 4 + i) * 0.3;
      ctx.stroke();
    }

    ctx.globalAlpha = 1.0;

    // 3. Draw Orbiting Star Dust Particles
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.angle += p.speed * (1 + energyPulse * 0.5);
      const currentDist = p.baseDist * (1 + Math.sin(time * 2 + i) * 0.15 + energyPulse * 0.3);

      const px = centerX + Math.cos(p.angle) * currentDist;
      const py = centerY + Math.sin(p.angle) * currentDist;

      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fillStyle = colors.mid;
      ctx.globalAlpha = p.alpha;
      ctx.shadowColor = colors.glow;
      ctx.shadowBlur = 6;
      ctx.fill();
    }

    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 0;

    // 4. Central White-Hot Energy Core
    const coreRadius = Math.max(6, width * 0.18 * (1 + energyPulse * 0.3));
    const coreGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreRadius * 2);
    coreGrad.addColorStop(0, '#ffffff');
    coreGrad.addColorStop(0.35, colors.mid);
    coreGrad.addColorStop(0.85, colors.outer);
    coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = coreGrad;
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(centerX, centerY, coreRadius * 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
  }

  destroy() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
  }
}

// Global Export
if (typeof window !== 'undefined') {
  window.VoiceOrbVisualizer = VoiceOrbVisualizer;
}
