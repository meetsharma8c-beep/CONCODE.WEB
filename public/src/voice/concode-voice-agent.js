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
        <!-- Sonar Radar Wave Ripple Burst -->
        <div class="voice-sonar-ripple" id="voice-sonar-ripple"></div>

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
            <span class="voice-agent-badge" id="voice-agent-badge">ARCHITECT CORE</span>
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

        <!-- Bioluminescent Nature Orb with Calling Halo -->
        <div class="voice-orb-wrapper" id="voice-orb-wrapper" title="CONCODE AI Hands-Free Voice Assistant">
          <div class="voice-calling-halo" id="voice-calling-halo"></div>
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

        <!-- Floating Toast Popup -->
        <div class="voice-toast-popup" id="voice-toast-popup"></div>
      `;

      document.body.appendChild(container);
      this.hudContainer = container;
    }

    this.orbWrapper = document.getElementById('voice-orb-wrapper');
    this.voiceCardEl = document.getElementById('voice-response-card');
    this.sonarRippleEl = document.getElementById('voice-sonar-ripple');
    this.callingHaloEl = document.getElementById('voice-calling-halo');
    this.queryEl = document.getElementById('voice-query-text');
    this.responseEl = document.getElementById('voice-reply-text');
    this.agentBadgeEl = document.getElementById('voice-agent-badge');
    this.chipsContainerEl = document.getElementById('voice-chips-bar');
    this.statusLabelEl = document.getElementById('voice-status-label');
    this.toastEl = document.getElementById('voice-toast-popup');

    this.lastSpokenText = '';

    const cardClose = document.getElementById('voice-card-close');
    if (cardClose) {
      cardClose.addEventListener('click', () => this.dismissVoiceAssistant());
    }

    // Attach Control Action Bar Listeners
    const btnMic = document.getElementById('voice-btn-mic');
    if (btnMic) {
      btnMic.addEventListener('click', () => this.activateVoiceCommandMode());
    }

    const btnStop = document.getElementById('voice-btn-stop');
    if (btnStop) {
      btnStop.addEventListener('click', () => this.dismissVoiceAssistant());
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
   * Triggers sudden visual Call Summoning, Sonar Wave Ripple Burst, Bioluminescent Calling Halo & 3D Spring Response Card entrance
   */
  triggerCallActivationAnimation() {
    // 0. Sudden Summon HUD container onto screen (from default hidden state)
    if (this.hudContainer) {
      this.hudContainer.classList.add('summoned');
    }

    // 1. Expand Sonar Radar Wave Ripple
    if (this.sonarRippleEl) {
      this.sonarRippleEl.classList.remove('active');
      void this.sonarRippleEl.offsetWidth; // Trigger DOM reflow
      this.sonarRippleEl.classList.add('active');
    }

    // 2. Activate Bioluminescent Calling Halo around Orb
    if (this.orbWrapper) {
      this.orbWrapper.classList.add('calling');
      setTimeout(() => {
        if (this.orbWrapper) this.orbWrapper.classList.remove('calling');
      }, 3500);
    }

    // 3. Update Status Label & Open 3D Spring Response Card
    if (this.statusLabelEl) {
      this.statusLabelEl.textContent = 'Call Activated';
    }
    if (this.voiceCardEl) {
      this.voiceCardEl.classList.add('active');
    }
  }

  /**
   * Smoothly dismisses the Voice Assistant back to default hidden state (display: none)
   */
  dismissVoiceAssistant() {
    if (this.voiceCardEl) {
      this.voiceCardEl.classList.remove('active');
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setTimeout(() => {
      if (this.hudContainer) {
        this.hudContainer.classList.remove('summoned');
      }
      this.setState('PASSIVE');
    }, 350);
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
   * Attaches zero-effort auto-listening unlock & orb trigger listeners
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

    const sectionBtn = document.getElementById('btn-trigger-voice-section');
    if (sectionBtn) {
      sectionBtn.addEventListener('click', () => {
        if (this.voiceCardEl) this.voiceCardEl.classList.add('active');
        this.activateVoiceCommandMode();
      });
    }

    if (this.orbWrapper) {
      this.orbWrapper.addEventListener('click', () => {
        if (this.voiceCardEl) {
          this.voiceCardEl.classList.toggle('active');
        }
        this.activateVoiceCommandMode();
      });
    }
  }

  /**
   * Spoken speech detected event handler -> Dispatches command to Voice Assistant pipeline
   * Applies intelligibility gate: rejects garbled transcripts gracefully per guidelines.
   */
  /**
   * Spoken speech detected event handler -> Dispatches command to Voice Assistant pipeline
   * Applies wake keyword gating in PASSIVE mode & accepts direct speech in ACTIVATED mode.
   */
  handleWakeWordTrigger(data) {
    if (this.state === 'SPEAKING' || this.state === 'PROCESSING') return;

    const rawTranscript = (data.transcript || '').trim();
    if (!rawTranscript) return;

    const wordCount = rawTranscript.split(/\s+/).filter(w => w.length > 1).length;
    const confidence = data.confidence || 0;

    if (wordCount < 1 || (confidence > 0 && confidence < 0.1)) {
      return;
    }

    const wakeMatch = data.wakeWordMatch || { found: false, wakeWord: null, inlineCommand: rawTranscript };

    // PASSIVE MODE: Require explicit Wake Phrase (e.g., "Hey Concode") to wake up
    if (this.state === 'PASSIVE') {
      if (!wakeMatch.found) {
        // Ambient background speech without wake phrase -> ignore gracefully
        return;
      }

      console.log(`[ConCodeVoiceAgent] Wake Word Detected: "${wakeMatch.wakeWord}"`);
      
      // Play Web Audio activation chime & trigger visual Call Activation animation
      if (this.dispatcher) {
        this.dispatcher.playActivationChime();
      }
      this.triggerCallActivationAnimation();

      // Check if user spoke an inline command after the wake word (e.g., "Hey Concode, what is API")
      const inlineCmd = (wakeMatch.inlineCommand || '').trim();
      if (inlineCmd.length > 0) {
        if (this.queryEl) this.queryEl.textContent = `"${inlineCmd}"`;

        // Only dispatch if the audio frame is finalized (user finished speaking)
        if (data.isFinal) {
          console.log(`[ConCodeVoiceAgent] Executing Finalized Inline Command: "${inlineCmd}"`);
          if (this.responseEl) this.responseEl.textContent = 'Thinking & synthesizing reply...';
          this.setState('PROCESSING');
          if (this.dispatcher) {
            this.dispatcher.dispatchToConCodeAi(inlineCmd);
          }
          return;
        }
      }

      // Wake phrase spoken without immediate inline command -> enter ACTIVATED listening mode
      this.setState('ACTIVATED');
      if (this.queryEl) this.queryEl.textContent = `"Hey Concode..."`;
      if (this.responseEl) this.responseEl.textContent = 'I am listening! What can I help you with?';
      return;
    }

    // ACTIVATED MODE: User or Wake Word unlocked listening mode -> accept command text directly
    let cleanCommand = rawTranscript;
    if (wakeMatch.found && wakeMatch.inlineCommand) {
      cleanCommand = wakeMatch.inlineCommand;
    }

    if (this.queryEl) this.queryEl.textContent = `"${cleanCommand}"`;

    if (this.responseEl && (this.state === 'ACTIVATED' || this.state === 'LISTENING')) {
      this.responseEl.textContent = 'Listening to your full sentence...';
      if (this.voiceCardEl) this.voiceCardEl.classList.add('active');
    }

    // ONLY dispatch to AI backend when sentence is finalized (isFinal is true)
    if (data.isFinal) {
      console.log(`[ConCodeVoiceAgent] Voice Command Finalized (${wordCount} words): "${cleanCommand}"`);
      if (this.responseEl) this.responseEl.textContent = 'Thinking & synthesizing reply...';
      this.setState('PROCESSING');

      if (this.dispatcher) {
        this.dispatcher.dispatchToConCodeAi(cleanCommand);
      }
    }
  }

  /**
   * Handles Computerized Brain response directly inside Voice Assistant interface.
   */
  handleVoiceBrainReply(data) {
    if (data.query && this.queryEl) {
      this.queryEl.textContent = `"${data.query}"`;
    }
    
    const spokenText = data.voiceSummary || this.sanitizeForEar(data.reply || '');
    this.lastSpokenText = spokenText;
    
    if (this.responseEl) {
      this.typewriter(this.responseEl, spokenText);
    }

    if (this.agentBadgeEl && data.agentBadge) {
      let badgeText = data.agentBadge;
      if (data.emotionalResonance) {
        badgeText += ` | ${data.emotionalResonance.symbol} ${data.emotionalResonance.name}`;
        if (this.visualizer && data.emotionalResonance.key) {
          this.visualizer.setEmotion(data.emotionalResonance.key);
        }
      }
      this.agentBadgeEl.textContent = badgeText;
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

    // Speak with dynamic Affective TTS pitch & rate modulation
    const speechParams = data.emotionalResonance ? data.emotionalResonance.ttsSpeechParams : null;
    this.speak(spokenText, speechParams);
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
  /**
   * Switches to active voice command capture
   */
  activateVoiceCommandMode() {
    this.triggerCallActivationAnimation();
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
   * Toggles Voice Assistant listening mode on / off
   */
  toggleListening() {
    if (this.state === 'PASSIVE') {
      this.activateVoiceCommandMode();
    } else {
      this.dismissVoiceAssistant();
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
    clean = clean
      .replace(/Node\.js/gi, 'Node JS')
      .replace(/Express\.js/gi, 'Express JS')
      .replace(/Three\.js/gi, 'Three JS')
      .replace(/Vue\.js/gi, 'Vue JS')
      .replace(/React\.js/gi, 'React JS')
      .replace(/MongoDB/gi, 'Mongo D B')
      .replace(/PostgreSQL/gi, 'Postgres S Q L')
      .replace(/C\+\+/g, 'C plus plus')
      .replace(/3D/g, 'Three D')
      .replace(/`[^`]+`/g, '')
      .replace(/<[^>]*>?/gm, '')
      .replace(/https?:\/\/\S+/gi, '')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/[\*\_\~\`]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/^\s*\d+\.\s+/gm, '')
      .replace(/^\s*[\-\*\u2022]\s+/gm, '')
      .replace(/\n+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    
    if (!clean) return "I've processed your request.";

    if (!/[.!?]$/.test(clean)) clean += '.';

    const sentences = clean.match(/[^.!?]+[.!?]+/g) || [clean];
    const spoken = sentences
      .map(s => s.trim())
      .filter(s => s.length > 3)
      .slice(0, 3)
      .join(' ');

    return spoken || clean.slice(0, 200) || "I've processed your request.";
  }

  /**
   * Text-to-Speech synthesis — Ear-focused verbal delivery with Nature Creation voice.
   * Pre-sanitizes all input to guarantee clean spoken output per Voice Guidelines.
   * Pauses background microphone listening to prevent TTS self-listening echo loops.
   */
  speak(text, speechParams = null, onEndCallback = null) {
    if (typeof speechParams === 'function') {
      onEndCallback = speechParams;
      speechParams = null;
    }
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
    utterance.rate = (speechParams && speechParams.rate) ? speechParams.rate : 1.0;
    utterance.pitch = (speechParams && speechParams.pitch) ? speechParams.pitch : 1.05;

    // Select the most natural-sounding English voice available
    const selectVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const preferredNames = ['Natural', 'Google', 'Samantha', 'Karen', 'Daniel', 'Zira', 'Alex'];
        const naturalVoice = voices.find(v => 
          preferredNames.some(name => v.name.includes(name)) && v.lang.startsWith('en')
        ) || voices.find(v => v.lang.startsWith('en')) || voices[0];
        if (naturalVoice) utterance.voice = naturalVoice;
      }
    };
    selectVoice();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = selectVoice;
    }

    utterance.onstart = () => {
      this.setState('SPEAKING');
      // Pause mic listener so speaker audio won't echo back into speech recognition
      if (this.listener) {
        this.listener.pause();
      }
    };

    let isHandled = false;
    const handleSpeechComplete = () => {
      if (isHandled) return;
      isHandled = true;
      this.setState('PASSIVE');
      // Resume mic listener with 400ms guard delay after speaker stops
      setTimeout(() => {
        if (this.listener) {
          this.listener.resume();
        }
      }, 400);
      if (onEndCallback) onEndCallback();
    };

    utterance.onend = handleSpeechComplete;
    utterance.onerror = handleSpeechComplete;

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
    const stateBadge = document.getElementById('ai-current-state-badge');
    if (stateBadge) {
      stateBadge.textContent = `[STATE: ${newState}]`;
    }
    const liveLog = document.getElementById('voice-live-log');
    if (liveLog) {
      const timeStr = new Date().toLocaleTimeString();
      liveLog.innerHTML += `<div>[${timeStr}] Assistant state: ${newState}</div>`;
      liveLog.scrollTop = liveLog.scrollHeight;
    }
    if (this.visualizer) {
      this.visualizer.setState(newState);
    }
  }
}

function initConcodeVoiceAgent() {
  if (!window.concodeVoiceAgent) {
    window.concodeVoiceAgent = new ConCodeVoiceAgent();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initConcodeVoiceAgent);
} else {
  initConcodeVoiceAgent();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ConCodeVoiceAgent;
} else {
  window.ConCodeVoiceAgent = ConCodeVoiceAgent;
}
