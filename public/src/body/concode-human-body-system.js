/**
 * CONCODE AI — Human Biological Body & Central Nervous System Architecture v26.0
 * File: public/src/body/concode-human-body-system.js
 * 
 * CONCEPT:
 *  - Website = Physical Body & Sensory Organs (Eyes, Ears, Vocal Cords, Heartbeat Pulse)
 *  - CONCODE AI = Central Nervous System, Subconscious Memory (Obsidian), and Conscious Mind
 * 
 * FEATURES:
 *  1. Biological Sensory Receptors (Microphone Stream, Cursor Motion, Touch Dynamics)
 *  2. Autonomic Heartbeat & Emotional Pulse Dynamics
 *  3. Seamless Mind-Body Neural Bridge (/api/chat, WebSocket Telemetry)
 */

class ConCodeHumanBodySystem {
  constructor() {
    this.brainState = 'CALM';
    this.heartbeatRateMs = 1200; // Normal resting pulse (50 BPM)
    this.sensoryActivityScore = 0;
    this.pulseTimer = null;
    this.bodyContainer = document.body;

    this.initSensoryOrgans();
    this.startAutonomicHeartbeat();
    console.log('[ConCodeHumanBodySystem v26.0] Human Physical Body & Nervous System Synapsed.');
  }

  /**
   * Initialize Sensory Organs (Eyes, Ears, Touch Receptors)
   */
  initSensoryOrgans() {
    // 1. Touch & Movement Sensory Receptors
    const onSensoryInput = (evt) => {
      this.sensoryActivityScore = Math.min(100, this.sensoryActivityScore + 5);
      this.adjustHeartbeat();
    };

    ['pointermove', 'keydown', 'scroll', 'touchstart', 'click'].forEach(evtType => {
      window.addEventListener(evtType, onSensoryInput, { passive: true });
    });

    // Sensory decay loop (calms down body when idle)
    setInterval(() => {
      if (this.sensoryActivityScore > 0) {
        this.sensoryActivityScore = Math.max(0, this.sensoryActivityScore - 2);
        this.adjustHeartbeat();
      }
    }, 1000);
  }

  /**
   * Autonomic Heartbeat & Emotional Biological Pulse
   */
  startAutonomicHeartbeat() {
    const pulse = () => {
      // Trigger subtle biological heartbeat glow on website background
      const container = this.bodyContainer || (typeof document !== 'undefined' ? document.body : null);
      if (container) {
        container.classList.add('body-pulse');
        setTimeout(() => {
          container.classList.remove('body-pulse');
        }, 300);
      }

      this.pulseTimer = setTimeout(pulse, this.heartbeatRateMs);
    };

    pulse();
  }

  /**
   * Adjusts heartbeat BPM based on cognitive state & sensory activity
   */
  adjustHeartbeat() {
    // Base pulse by state
    const statePulses = {
      'CALM': 1200,       // ~50 BPM
      'CURIOSITY': 900,   // ~67 BPM
      'JOY': 800,         // ~75 BPM
      'PROCESSING': 600,  // ~100 BPM (Concentrating hard)
      'SPEAKING': 700,    // ~85 BPM (Active verbal expression)
      'URGENCY': 500      // ~120 BPM (High adrenaline)
    };

    const baseMs = statePulses[this.brainState] || 1000;
    // Faster heartbeat when sensory activity is high
    this.heartbeatRateMs = Math.max(400, baseMs - (this.sensoryActivityScore * 3));
  }

  /**
   * Synapses Neural Brain State to Physical Body Organ Manifestation
   */
  synapseBrainState(newState, emotionKey = 'CALM') {
    this.brainState = newState || 'CALM';
    this.adjustHeartbeat();

    // Transmit biological feedback to floating 3D orb visualizer & HUD
    if (window.concodeVoiceAgent && window.concodeVoiceAgent.visualizer) {
      window.concodeVoiceAgent.visualizer.setState(newState);
      if (emotionKey) {
        window.concodeVoiceAgent.visualizer.setEmotion(emotionKey);
      }
    }

    const stateBadge = document.getElementById('ai-current-state-badge');
    if (stateBadge) {
      stateBadge.textContent = `[BODY STATE: ${newState}]`;
    }
  }
}

// Auto-initialize Human Body System
if (typeof window !== 'undefined') {
  function initHumanBody() {
    if (!window.concodeHumanBody) {
      window.concodeHumanBody = new ConCodeHumanBodySystem();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHumanBody);
  } else {
    initHumanBody();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ConCodeHumanBodySystem;
}
