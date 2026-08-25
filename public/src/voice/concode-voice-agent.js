/**
 * ==========================================================================
 * CONCODE AI — Independent Voice Assistant & Nature Brain Agent
 * Manages Continuous Background Listening, Bioluminescent Nature Visualizer,
 * Dedicated Voice Response HUD, and Text-to-Speech Synthesis.
 * Completely decoupled from the text AI Chat drawer while sharing the same Computerized Brain.
 * ==========================================================================
 */

class ConCodeVoiceAgent {
  constructor() {
    this.state = 'PASSIVE'; // 'PASSIVE' | 'ACTIVATED' | 'PROCESSING' | 'SPEAKING' | 'ERROR'
    this.listener = null;
    this.visualizer = null;
    this.dispatcher = null;
    this.hudContainer = null;
    this.orbWrapper = null;
    this.voiceCardEl = null;
    this.queryEl = null;
    this.responseEl = null;
    this.agentBadgeEl = null;
    this.chipsContainerEl = null;
    this.cardTimeout = null;

    this.initDOM();
    this.initModules();
    this.attachEventListeners();
  }

  /**
   * Inject floating Voice Assistant DOM structure (Orb + Dedicated Voice Response Card)
   */
  initDOM() {
    if (document.getElementById('concode-voice-hud')) {
      this.hudContainer = document.getElementById('concode-voice-hud');
    } else {
      const container = document.createElement('div');
      container.id = 'concode-voice-hud';
      container.className = 'voice-hud-container';
      container.setAttribute('data-state', 'PASSIVE');

      container.innerHTML = `
        <!-- Toast Popup -->
        <div class="voice-toast-popup" id="voice-toast-popup">Copied to Clipboard!</div>

        <!-- Dedicated Voice Response Card (Independent from Chat Drawer) -->
        <div class="voice-response-card" id="voice-response-card">
          <div class="voice-card-header">
            <div class="voice-card-title">
              <span class="voice-card-dot"></span>
              <div class="voice-equalizer-bars" title="Audio Activity">
                <span class="voice-eq-bar"></span>
                <span class="voice-eq-bar"></span>
                <span class="voice-eq-bar"></span>
                <span class="voice-eq-bar"></span>
                <span class="voice-eq-bar"></span>
              </div>
              <span id="voice-status-label">Voice Guide</span>
            </div>
            <span class="voice-agent-badge" id="voice-agent-badge">📐 Architect Agent</span>
            <button class="voice-card-close" id="voice-card-close" title="Close Voice Card">&times;</button>
          </div>
          
          <div class="voice-shimmer-loader"></div>

          <div class="voice-card-body">
            <div class="voice-query-text" id="voice-query-text">"Listening for your voice..."</div>
            <div class="voice-reply-text" id="voice-reply-text">Speak anytime to get instant verbal answers and guidance from CONCODE AI.</div>
          </div>

          <!-- Interactive Action Toolbar -->
          <div class="voice-actions-bar">
            <div class="voice-action-group">
              <button class="voice-action-btn" id="voice-btn-mic" title="Toggle Listening">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="22"/>
                </svg>
                <span>Listen</span>
              </button>

              <button class="voice-action-btn" id="voice-btn-stop" title="Mute Speech Output">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="6" y="6" width="12" height="12" rx="2"/>
                </svg>
                <span>Mute</span>
              </button>
            </div>

            <div class="voice-action-group">
              <button class="voice-action-btn" id="voice-btn-replay" title="Replay Spoken Response">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                </svg>
                <span>Replay</span>
              </button>

              <button class="voice-action-btn" id="voice-btn-copy" title="Copy Response Text">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                <span>Copy</span>
              </button>
            </div>
          </div>

          <div class="voice-chips-bar" id="voice-chips-bar"></div>
        </div>

        <!-- Bioluminescent Nature Orb -->
        <div class="voice-orb-wrapper" id="voice-orb-wrapper" title="CONCODE AI Hands-Free Voice Assistant">
          <div class="voice-glow-ring"></div>
          <div class="voice-glow-ring-2"></div>
          <canvas class="voice-canvas" id="voice-canvas" width="80" height="80"></canvas>
          <div class="voice-center-icon" id="voice-center-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="22"/>
            </svg>
          </div>
        </div>
      `;

      document.body.appendChild(container);
      this.hudContainer = container;
    }

    this.orbWrapper = document.getElementById('voice-orb-wrapper');
    this.voiceCardEl = document.getElementById('voice-response-card');
    this.queryEl = document.getElementById('voice-query-text');
    this.responseEl = document.getElementById('voice-reply-text');
    this.agentBadgeEl = document.getElementById('voice-agent-badge');
    this.chipsContainerEl = document.getElementById('voice-chips-bar');
    this.statusLabelEl = document.getElementById('voice-status-label');
    this.toastEl = document.getElementById('voice-toast-popup');

    this.lastSpokenText = '';

    const cardClose = document.getElementById('voice-card-close');
    if (cardClose) {
      cardClose.addEventListener('click', () => {
        if (this.voiceCardEl) this.voiceCardEl.classList.remove('active');
        if (window.speechSynthesis) window.speechSynthesis.cancel();
      });
    }

    // Attach Control Action Bar Listeners
    const btnMic = document.getElementById('voice-btn-mic');
    if (btnMic) {
      btnMic.addEventListener('click', () => this.activateVoiceCommandMode());
    }

    const btnStop = document.getElementById('voice-btn-stop');
    if (btnStop) {
      btnStop.addEventListener('click', () => {
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        this.setState('PASSIVE');
      });
    }

    const btnReplay = document.getElementById('voice-btn-replay');
    if (btnReplay) {
      btnReplay.addEventListener('click', () => {
        if (this.lastSpokenText) {
          this.speak(this.lastSpokenText);
        }
      });
    }

    const btnCopy = document.getElementById('voice-btn-copy');
    if (btnCopy) {
      btnCopy.addEventListener('click', () => {
        if (this.responseEl && this.responseEl.textContent) {
          navigator.clipboard.writeText(this.responseEl.textContent).then(() => {
            this.showToast('Copied to Clipboard!');
          }).catch(() => {});
        }
      });
    }
  }

  /**
   * Shows smooth toast notification popup
   */
  showToast(msg) {
    if (!this.toastEl) return;
    this.toastEl.textContent = msg;
    this.toastEl.classList.add('show');
    setTimeout(() => {
      if (this.toastEl) this.toastEl.classList.remove('show');
    }, 2000);
  }

  /**
   * Shift orb position when text AI Chat drawer opens to prevent overlapping Send button
   */
  setShiftLeft(isShifted) {
    if (this.hudContainer) {
      if (isShifted) {
        this.hudContainer.classList.add('shift-left');
      } else {
        this.hudContainer.classList.remove('shift-left');
      }
    }
  }

  /**
   * Initializes background listener, bioluminescent nature visualizer, and dispatcher
   */
  initModules() {
    // 1. Audio Listener Module
    this.listener = new window.WakeWordListener({
      onWakeWordDetected: (data) => this.handleWakeWordTrigger(data),
      onError: (err) => console.warn('[ConCodeVoiceAgent] Listener error:', err),
      onStatusChange: (status) => console.log(`[ConCodeVoiceAgent] Listener status: ${status}`)
    });

    // 2. Bioluminescent Nature Orb Visualizer
    const canvas = document.getElementById('voice-canvas');
    if (canvas && window.VoiceOrbVisualizer) {
      this.visualizer = new window.VoiceOrbVisualizer(canvas, this.listener);
    }

    // 3. Command Dispatcher Module
    if (window.VoiceCommandDispatcher) {
      this.dispatcher = new window.VoiceCommandDispatcher({
        onCommandTranscribed: (data) => this.handleCommandTranscribed(data),
        onTimeout: () => this.handleTimeout(),
        onStateChange: (state) => this.setState(state),
        onError: (err) => console.warn('[ConCodeVoiceAgent] Dispatcher error:', err)
      });
    }

    // Auto-start continuous background listening
    this.listener.start().catch(() => {});
  }

  /**
   * Attaches zero-effort auto-listening unlock
   */
  attachEventListeners() {
    const unlockHandsFreeListening = () => {
      if (this.listener) {
        this.listener.activateMic().catch(() => {});
      }
    };

    ['pointerdown', 'click', 'keydown', 'touchstart', 'mousemove', 'scroll'].forEach(evt => {
      window.addEventListener(evt, unlockHandsFreeListening, { passive: true });
    });

    if (this.orbWrapper) {
      this.orbWrapper.addEventListener('click', () => {
        if (this.voiceCardEl && !this.voiceCardEl.classList.contains('active')) {
          this.voiceCardEl.classList.add('active');
        } else if (this.voiceCardEl) {
          this.voiceCardEl.classList.remove('active');
        }
        this.activateVoiceCommandMode();
      });
    }
  }

  /**
   * Spoken speech detected event handler -> Dispatches command to Voice Assistant pipeline
   * Applies intelligibility gate: rejects garbled transcripts gracefully per guidelines.
   */
  handleWakeWordTrigger(data) {
    if (this.state === 'SPEAKING' || this.state === 'PROCESSING') return;
    
    const transcript = (data.transcript || '').trim();
    
    // Intelligibility gate: reject noise, single chars, or garbled fragments
    const wordCount = transcript.split(/\s+/).filter(w => w.length > 1).length;
    const confidence = data.confidence || 0;
    
    if (wordCount < 1 || (confidence > 0 && confidence < 0.3)) {
      console.log(`[ConCodeVoiceAgent] Rejected low-quality transcript: "${transcript}" (conf: ${confidence.toFixed(2)})`);
      return;
    }
    
    console.log(`[ConCodeVoiceAgent] Hands-Free Voice Input Accepted: "${transcript}" (conf: ${confidence.toFixed(2)})`);
    
    if (this.queryEl) this.queryEl.textContent = `"${transcript}"`;
    if (this.responseEl) this.responseEl.textContent = 'Thinking & synthesizing reply...';
    if (this.voiceCardEl) this.voiceCardEl.classList.add('active');

    this.activateVoiceCommandMode();

    if (this.dispatcher && transcript) {
      this.dispatcher.dispatchToConCodeAi(transcript);
    }
  }

  /**
   * Handles Computerized Brain response directly inside Voice Assistant interface.
   */
  handleVoiceBrainReply(data) {
    if (this.queryEl && data.query) {
      this.queryEl.textContent = `"${data.query}"`;
    }
    
    const spokenText = data.voiceSummary || this.sanitizeForEar(data.reply || '');
    this.lastSpokenText = spokenText;
    
    if (this.responseEl) {
      this.typewriter(this.responseEl, spokenText);
    }

    if (this.agentBadgeEl && data.agentBadge) {
      this.agentBadgeEl.textContent = data.agentBadge;
    }

    // Render quick voice follow-up suggestion chips
    if (this.chipsContainerEl) {
      this.chipsContainerEl.innerHTML = '';
      if (data.smartReplies && data.smartReplies.length > 0) {
        data.smartReplies.slice(0, 3).forEach(replyText => {
          const chip = document.createElement('button');
          chip.className = 'voice-chip';
          chip.textContent = replyText;
          chip.addEventListener('click', () => {
            if (this.dispatcher) {
              this.dispatcher.dispatchToConCodeAi(replyText);
            }
          });
          this.chipsContainerEl.appendChild(chip);
        });
      }
    }

    if (this.voiceCardEl) {
      this.voiceCardEl.classList.add('active');
    }

    // Speak the ear-sanitized answer aloud
    this.speak(spokenText);
  }

  /**
   * Smooth Typewriter Text Reveal Effect
   */
  typewriter(element, text, speed = 15) {
    if (!element) return;
    element.textContent = '';
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        element.textContent += text.charAt(i);
        i++;
      } else {
        clearInterval(timer);
      }
    }, speed);
  }

  /**
   * Switches to active voice command capture
   */
  activateVoiceCommandMode() {
    if (this.listener) {
      this.listener.activateMic().catch(() => {});
    }
    
    if (this.dispatcher) {
      this.dispatcher.startCapture();
    } else {
      this.setState('ACTIVATED');
    }
  }

  /**
   * Live transcribed speech update
   */
  handleCommandTranscribed(data) {
    if (this.queryEl && data.text) {
      this.queryEl.textContent = `"${data.text}"`;
      if (this.voiceCardEl) this.voiceCardEl.classList.add('active');
    }
  }

  /**
   * Auto-timeout handler
   */
  handleTimeout() {
    this.setState('PASSIVE');
  }

  /**
   * Client-side ear sanitizer — strips anything that would sound wrong in TTS
   */
  sanitizeForEar(rawText) {
    if (!rawText) return "Got it, I've processed that for you.";
    
    let clean = rawText
      // Strip code blocks entirely
      .replace(/```[\s\S]*?```/g, '')
      // Strip inline code
      .replace(/`[^`]+`/g, '')
      // Strip HTML
      .replace(/<[^>]*>?/gm, '')
      // Strip URLs
      .replace(/https?:\/\/\S+/gi, '')
      // Strip markdown headers
      .replace(/^#{1,6}\s+/gm, '')
      // Strip bold/italic/strikethrough markers
      .replace(/[\*\_\~\`]/g, '')
      // Strip markdown links, keep text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Strip numbered & bullet lists
      .replace(/^\s*\d+\.\s+/gm, '')
      .replace(/^\s*[\-\*\u2022]\s+/gm, '')
      // Collapse whitespace
      .replace(/\n+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    
    // Take first 3 sentences
    const sentences = clean.match(/[^.!?]*[.!?]/g) || [];
    const spoken = sentences.filter(s => s.trim().length > 8).slice(0, 3).join(' ').trim();
    return spoken || "Got it, I've processed that for you.";
  }

  /**
   * Text-to-Speech synthesis — Ear-focused verbal delivery with Nature Creation voice.
   * Pre-sanitizes all input to guarantee clean spoken output per Voice Guidelines.
   */
  speak(text, onEndCallback = null) {
    if (!('speechSynthesis' in window) || !text) {
      if (onEndCallback) onEndCallback();
      return;
    }
    window.speechSynthesis.cancel();

    // Deep sanitize for ear — strip any residual formatting that leaked through
    const spokenText = this.sanitizeForEar(text);
    if (!spokenText || spokenText.length < 5) {
      if (onEndCallback) onEndCallback();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.rate = 1.0;
    utterance.pitch = 1.05;

    // Select the most natural-sounding English voice available
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const preferredNames = ['Natural', 'Google', 'Samantha', 'Karen', 'Daniel', 'Zira', 'Alex'];
      const naturalVoice = voices.find(v => 
        preferredNames.some(name => v.name.includes(name)) && v.lang.startsWith('en')
      ) || voices.find(v => v.lang.startsWith('en')) || voices[0];
      if (naturalVoice) utterance.voice = naturalVoice;
    }

    utterance.onstart = () => {
      this.setState('SPEAKING');
    };

    utterance.onend = () => {
      this.setState('PASSIVE');
      if (onEndCallback) onEndCallback();
    };

    utterance.onerror = () => {
      this.setState('PASSIVE');
      if (onEndCallback) onEndCallback();
    };

    window.speechSynthesis.speak(utterance);
  }

  /**
   * Updates state across UI & Bioluminescent Nature Visualizer
   */
  setState(newState) {
    this.state = newState;
    if (this.hudContainer) {
      this.hudContainer.setAttribute('data-state', newState);
    }
    if (this.statusLabelEl) {
      const labels = {
        'PASSIVE': 'Voice Guide',
        'ACTIVATED': 'Activated',
        'LISTENING': 'Listening...',
        'PROCESSING': 'Thinking...',
        'SPEAKING': 'Speaking...'
      };
      this.statusLabelEl.textContent = labels[newState] || newState;
    }
    if (this.visualizer) {
      this.visualizer.setState(newState);
    }
  }
}

// Auto-initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.concodeVoiceAgent = new ConCodeVoiceAgent();
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ConCodeVoiceAgent;
} else {
  window.ConCodeVoiceAgent = ConCodeVoiceAgent;
}
