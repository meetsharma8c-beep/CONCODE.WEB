/**
 * ==========================================================================
 * CONCODE AI — Voice Command Dispatcher Module
 * Captures user spoken commands, synthesizes audio chimes, enforces silence timeout,
 * and dispatches input directly to CONCODE AI's Computerized Brain endpoint (/api/chat)
 * independently from the text chat drawer interface.
 * ==========================================================================
 */

class VoiceCommandDispatcher {
  constructor(options = {}) {
    this.onCommandTranscribed = options.onCommandTranscribed || (() => {});
    this.onTimeout = options.onTimeout || (() => {});
    this.onStateChange = options.onStateChange || (() => {});
    this.onError = options.onError || (() => {});

    this.commandRecognition = null;
    this.dispatchSilenceTimer = null;
    this.silenceDurationMs = 2500; // 2.5s silence after speaking triggers dispatch
    this.accumulatedText = '';
    this.audioCtx = null;
    
    // Dedicated voice session ID for independent voice memory
    this.voiceSessionId = 'voice_session_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

    this.initCommandRecognition();
  }

  /**
   * Initializes high-precision Speech Recognition for Command Mode
   */
  initCommandRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    this.commandRecognition = new SpeechRecognition();
    this.commandRecognition.continuous = true;
    this.commandRecognition.interimResults = true;
    this.commandRecognition.maxAlternatives = 3;
    this.commandRecognition.lang = 'en-US';

    this.commandRecognition.onstart = () => {
      this.resetSilenceDispatchTimer();
    };

    this.commandRecognition.onresult = (event) => {
      let interimText = '';
      let newFinalText = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const text = event.results[i][0] ? event.results[i][0].transcript : '';
        if (event.results[i].isFinal) {
          newFinalText += text + ' ';
        } else {
          interimText += text;
        }
      }

      if (newFinalText.trim()) {
        this.accumulatedText = (this.accumulatedText + ' ' + newFinalText.trim()).trim();
      }

      const activeText = (this.accumulatedText + ' ' + interimText).trim();

      if (activeText) {
        this.onCommandTranscribed({
          text: activeText,
          isFinal: false
        });
      }

      this.resetSilenceDispatchTimer();
    };

    this.commandRecognition.onerror = (event) => {
      if (event.error === 'no-speech') return;
      console.warn('[VoiceCommandDispatcher] Speech recognition warning:', event.error);
    };

    this.commandRecognition.onend = () => {
      // Auto restart if active
    };
  }

  /**
   * Starts Full Command Capture Mode
   */
  startCapture() {
    this.accumulatedText = '';
    this.playActivationChime();
    this.onStateChange('ACTIVATED');

    if (this.commandRecognition) {
      try {
        this.commandRecognition.start();
      } catch (e) {
        // Recognition may already be running
      }
    }

    this.resetSilenceDispatchTimer();
  }

  /**
   * Stops capture mode manually
   */
  stopCapture() {
    this.clearSilenceDispatchTimer();
    if (this.commandRecognition) {
      try {
        this.commandRecognition.stop();
      } catch (e) {}
    }
  }

  /**
   * Resets silence dispatch timer (submits query 2.5s after user stops speaking)
   */
  resetSilenceDispatchTimer() {
    this.clearSilenceDispatchTimer();
    this.dispatchSilenceTimer = setTimeout(() => {
      const finalCommand = this.accumulatedText.trim();
      if (finalCommand) {
        console.log(`[VoiceCommandDispatcher] Submitting Voice Command to Brain: "${finalCommand}"`);
        this.stopCapture();
        this.playSuccessChime();
        this.dispatchToConCodeAi(finalCommand);
      } else {
        this.stopCapture();
        this.onTimeout();
        this.onStateChange('PASSIVE');
      }
    }, this.silenceDurationMs);
  }

  /**
   * Clears active silence timer
   */
  clearSilenceDispatchTimer() {
    if (this.dispatchSilenceTimer) {
      clearTimeout(this.dispatchSilenceTimer);
      this.dispatchSilenceTimer = null;
    }
  }

  /**
   * Direct Voice Assistant Pipeline:
   * Queries /api/chat directly and dispatches response back to Voice Assistant
   * WITHOUT modifying or opening the text AI Chat drawer.
   */
  async dispatchToConCodeAi(commandText) {
    if (!commandText) return;
    
    // Intelligibility gate: only dispatch if the transcript has meaningful content
    const words = commandText.trim().split(/\s+/).filter(w => w.length > 1);
    if (words.length < 1) {
      console.log(`[VoiceCommandDispatcher] Skipped low-quality command: "${commandText}"`);
      this.onStateChange('PASSIVE');
      return;
    }
    
    console.log(`[VoiceCommandDispatcher] Querying Computerized Brain: "${commandText}"`);
    this.onStateChange('PROCESSING');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: commandText,
          sessionId: this.voiceSessionId
        })
      });

      const result = await res.json();

      if (result.success && result.data) {
        console.log('[VoiceCommandDispatcher] Computerized Brain Reply Received:', result.data.voiceSummary || result.data.reply);
        
        // Pass response directly to Voice Agent HUD & Verbal Speech Synthesizer
        if (window.concodeVoiceAgent && typeof window.concodeVoiceAgent.handleVoiceBrainReply === 'function') {
          window.concodeVoiceAgent.handleVoiceBrainReply({
            query: commandText,
            reply: result.data.reply,
            voiceSummary: result.data.voiceSummary || result.data.reply,
            agentBadge: result.data.agentBadge || '📐 Architect Agent',
            smartReplies: result.data.smartReplies || []
          });
        }
      } else {
        throw new Error(result.error ? result.error.message : 'Brain response error');
      }
    } catch (err) {
      console.error('[VoiceCommandDispatcher] Brain Query Failed:', err.message);
      this.onStateChange('PASSIVE');
      if (window.concodeVoiceAgent && typeof window.concodeVoiceAgent.speak === 'function') {
        window.concodeVoiceAgent.speak("I'm sorry, I couldn't reach the computerized brain. Please try speaking again.");
      }
    }
  }

  /**
   * Audio Context synthesizer helpers
   */
  getAudioContext() {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  playActivationChime() {
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.12);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch (e) {}
  }

  playSuccessChime() {
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;
      const freqs = [523.25, 659.25, 783.99];

      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);

        gain.gain.setValueAtTime(0.01, now + idx * 0.05);
        gain.gain.linearRampToValueAtTime(0.1, now + idx * 0.05 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.25);
      });
    } catch (e) {}
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = VoiceCommandDispatcher;
} else {
  window.VoiceCommandDispatcher = VoiceCommandDispatcher;
}
