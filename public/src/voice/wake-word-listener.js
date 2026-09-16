/**
 * ==========================================================================
 * CONCODE AI — Always-Active Hands-Free Voice Listener Module
 * Performs continuous background audio listening, VAD analysis, and zero-effort speech capture.
 * ==========================================================================
 */

/**
 * Dynamic Semantic & Phonetic Address Classifier
 * Evaluates whether speech is directed at the assistant without fixed keyword requirements.
 */
class SemanticAddressDetector {
  constructor(options = {}) {
    this.threshold = options.threshold || 0.25;
    
    // Phonetic & fuzzy variations of assistant names / titles
    this.namePatterns = [
      /\b(concode|con\s*code|khan\s*code|can\s*code|com\s*code|con\s*cord|kun\s*code)\b/i,
      /\b(jarvis|computer|assistant|robot|bot|brain|guide|ai)\b/i
    ];

    // Direct conversational call/greeting openers
    this.greetingOpeners = [
      /\b(hey|hi|hello|yo|listen|excuse\s*me|wake\s*up|are\s*you\s*there|good\s*morning|good\s*afternoon|good\s*evening)\b/i
    ];

    // Imperative command & question starters directed at an AI assistant
    this.actionStarters = [
      /\b(can\s*you|could\s*you|would\s*you|please|help\s*me|i\s*need)\b/i,
      /\b(show\s*me|tell\s*me|explain|search\s*for|open|find|calculate|create|generate|run|check|turn\s*on|turn\s*off|switch\s*to|render|start|stop)\b/i,
      /\b(what\s*is|what\s*are|what's|how\s*do|how\s*can|why\s*is|where\s*is|who\s*is|when\s*does)\b/i
    ];

    // Direct second-person pronouns
    this.secondPersonPronouns = [
      /\b(you|your|yourself|you're)\b/i
    ];
  }

  evaluate(transcript) {
    if (!transcript) return { isAddressing: false, score: 0, reason: 'empty', inlineCommand: '', matchedWord: null };

    const clean = transcript.trim();
    const lower = clean.toLowerCase();
    let score = 0;
    let matchReasons = [];

    // 1. Phonetic Assistant Name Match (+0.55)
    let nameFound = false;
    let matchedNameString = '';
    for (const pat of this.namePatterns) {
      const match = lower.match(pat);
      if (match) {
        score += 0.55;
        nameFound = true;
        matchedNameString = match[0];
        matchReasons.push(`Phonetic name match ("${match[0]}")`);
        break;
      }
    }

    // 2. Greeting Opener (+0.25)
    for (const pat of this.greetingOpeners) {
      const match = lower.match(pat);
      if (match) {
        score += 0.25;
        matchReasons.push(`Greeting call opener ("${match[0]}")`);
        break;
      }
    }

    // 3. Imperative Command / Question Starter (+0.25)
    for (const pat of this.actionStarters) {
      const match = lower.match(pat);
      if (match) {
        score += 0.25;
        matchReasons.push(`Direct command/inquiry ("${match[0]}")`);
        break;
      }
    }

    // 4. Direct Second Person Pronoun (+0.15)
    for (const pat of this.secondPersonPronouns) {
      if (pat.test(lower)) {
        score += 0.15;
        matchReasons.push(`Direct second-person reference`);
        break;
      }
    }

    // Extract inline command payload by cleaning leading greetings & names
    let inlineCommand = clean;
    if (nameFound && matchedNameString) {
      const idx = lower.indexOf(matchedNameString);
      if (idx !== -1) {
        const afterName = clean.slice(idx + matchedNameString.length).replace(/^[\s,.:;!?]+/, '').trim();
        if (afterName.length > 0) inlineCommand = afterName;
      }
    } else {
      // Strip leading greetings like "Hey", "Listen", "Excuse me"
      inlineCommand = clean.replace(/^(hey|hi|hello|yo|listen|excuse me|wake up)[\s,.:;!?]*/i, '').trim();
    }

    const isAddressing = score >= this.threshold;

    return {
      isAddressing,
      score,
      reason: matchReasons.join(', ') || 'No address pattern matched',
      inlineCommand: inlineCommand || clean,
      matchedWord: matchedNameString || 'natural_call'
    };
  }
}

class WakeWordListener {
  constructor(options = {}) {
    this.onWakeWordDetected = options.onWakeWordDetected || (() => {});
    this.onError = options.onError || (() => {});
    this.onStatusChange = options.onStatusChange || (() => {});

    this.addressDetector = new SemanticAddressDetector(options.addressOptions || {});

    this.isListening = false;
    this.isPaused = false;
    this.recognition = null;
    this.audioContext = null;
    this.analyser = null;
    this.micStream = null;
    this.restartAttempts = 0;
    this.restartTimer = null;

    this.initSpeechRecognition();
  }

  /**
   * Initializes Web Speech API Recognition instance for continuous hands-free listening
   */
  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      console.warn('[WakeWordListener] Note: Web Speech API requires HTTPS for mic access on public domains.');
    }

    if (!SpeechRecognition) {
      console.warn('[WakeWordListener] Web Speech API is not supported in this browser environment.');
      setTimeout(() => this.onError('Speech recognition requires Chrome/Edge or HTTPS.'), 500);
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 3;
    this.recognition.lang = 'en-US';

    this.recognition.onstart = () => {
      this.isListening = true;
      this.restartAttempts = 0;
      this.onStatusChange('listening');
    };

    this.silenceDebounceTimer = null;

    this.recognition.onresult = (event) => {
      // Echo cancellation guard: drop input when assistant is speaking or paused
      if (this.isPaused) return;

      let fullTranscript = '';
      let isFinal = false;

      for (let i = 0; i < event.results.length; ++i) {
        const result = event.results[i];
        const text = result[0] ? result[0].transcript.trim() : '';
        if (text) {
          fullTranscript += (fullTranscript ? ' ' : '') + text;
        }
        if (result.isFinal) {
          isFinal = true;
        }
      }

      if (this.silenceDebounceTimer) {
        clearTimeout(this.silenceDebounceTimer);
        this.silenceDebounceTimer = null;
      }

      if (fullTranscript.length > 0) {
        const wakeMatch = this.detectWakeWord(fullTranscript);

        // Emit live transcript update to UI immediately
        this.onWakeWordDetected({
          transcript: fullTranscript,
          isFinal: isFinal,
          confidence: wakeMatch.score || 0.95,
          timestamp: Date.now(),
          wakeWordMatch: wakeMatch
        });

        // Smart Silence Auto-Finalizer:
        // Increase delay to 2.8s so user can pause naturally mid-sentence without being cut off.
        const cleanTrim = fullTranscript.trim();
        const wordCount = cleanTrim.split(/\s+/).length;
        const isCompleteIdiom = /\b(going on|come on|pass on|turn on|log on|sign on|what's up|what is up|how is it going|what's happening|what is happening|how are you|what's new|what is new)\s*$/i.test(cleanTrim);
        const isDanglingFragment = !isCompleteIdiom && /\b(who is|what is|how to|where is|tell me|can you|why does|who|what|where|how|why|when|is|are|the|a|an|in|on|at|to|for|with|build|create|make|show|explain|write|use|add|open|generate|implement)\s*$/i.test(cleanTrim);

        if (!isFinal && wordCount >= 3 && !isDanglingFragment) {
          this.silenceDebounceTimer = setTimeout(() => {
            console.log(`[WakeWordListener] 2.8s Silence Auto-Finalizing Sentence: "${fullTranscript}"`);
            this.onWakeWordDetected({
              transcript: fullTranscript,
              isFinal: true,
              confidence: wakeMatch.score || 0.95,
              timestamp: Date.now(),
              wakeWordMatch: wakeMatch
            });

            // Stop & restart recognition briefly to flush buffer for next phrase
            try { this.recognition.stop(); } catch (e) {}
          }, 2800);
        }
      }
    };

    this.recognition.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        console.warn('[WakeWordListener] Microphone pending interaction.');
        this.onError('Microphone permission required for voice guide.');
        this.isListening = false;
        return;
      }
      console.warn('[WakeWordListener] Speech recognition warning:', event.error);
    };

    this.recognition.onend = () => {
      if (this.isListening && !this.isPaused) {
        this.scheduleRestart();
      } else {
        this.onStatusChange('stopped');
      }
    };
  }

  /**
   * Dynamically evaluates whether speech is calling/addressing the assistant using SemanticAddressDetector.
   * Returns object with address classification details and extracted inline command.
   */
  detectWakeWord(transcript) {
    if (!transcript) return { found: false, wakeWord: null, inlineCommand: '', score: 0, reason: '' };

    const evaluation = this.addressDetector.evaluate(transcript);
    return {
      found: evaluation.isAddressing,
      wakeWord: evaluation.matchedWord,
      inlineCommand: evaluation.inlineCommand,
      score: evaluation.score,
      reason: evaluation.reason
    };
  }

  /**
   * Schedule automatic restart with exponential backoff
   */
  scheduleRestart() {
    if (this.restartTimer) clearTimeout(this.restartTimer);
    const delay = Math.min(150 * Math.pow(1.5, this.restartAttempts), 3000);
    this.restartAttempts++;

    this.restartTimer = setTimeout(() => {
      if (this.isListening && !this.isPaused && this.recognition) {
        try {
          this.recognition.start();
        } catch (e) {
          // Speech recognition may already be active or restarting
        }
      }
    }, delay);
  }

  /**
   * Pause listening (e.g. while Assistant is speaking to avoid feedback loops)
   */
  pause() {
    this.isPaused = true;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }
  }

  /**
   * Resume listening after pause
   */
  resume() {
    this.isPaused = false;
    if (this.isListening && this.recognition) {
      try {
        this.recognition.start();
      } catch (e) {}
    }
  }

  /**
   * Starts background listening loop & mic connection
   */
  async start() {
    if (this.isListening) return;

    try {
      this.isListening = true;
      this.isPaused = false;
      if (this.recognition) {
        this.recognition.start();
      }
      await this.initAudioContext();
    } catch (err) {
      console.warn('[WakeWordListener] Note starting listener:', err.message);
    }
  }

  /**
   * Gesture-driven microphone unlock & activation
   */
  async activateMic() {
    this.isListening = true;
    this.isPaused = false;
    await this.initAudioContext();
    if (this.recognition) {
      try {
        this.recognition.start();
      } catch (e) {
        // Recognition may already be running
      }
    }
  }

  /**
   * Stops background listening
   */
  stop() {
    this.isListening = false;
    this.isPaused = false;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach(track => track.stop());
      this.micStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.onStatusChange('stopped');
  }

  /**
   * Initializes Web Audio Context for audio analysis & VAD energy monitoring
   */
  async initAudioContext() {
    if (this.audioContext && this.audioContext.state === 'running') return;

    try {
      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
        return;
      }

      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 48000
        },
        video: false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.micStream = stream;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx();
      
      const source = this.audioContext.createMediaStreamSource(stream);

      // High-Sensitivity Web Audio Preamplifier Gain Boost (+14dB / 5.0x gain)
      this.preampGain = this.audioContext.createGain();
      this.preampGain.gain.value = 5.0; // Amplifies low-decibel speech & whispers without needing to speak loudly

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.35;

      source.connect(this.preampGain);
      this.preampGain.connect(this.analyser);
    } catch (err) {
      console.warn('[WakeWordListener] Could not initialize Web Audio Analyser node:', err.message);
    }
  }

  /**
   * Returns current mic stream audio frequency/energy data for visualizer
   */
  getAudioData() {
    if (!this.analyser) return new Uint8Array(0);
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    return dataArray;
  }

  /**
   * Computes current root-mean-square (RMS) audio energy level (0 - 255) with preamplifier boost
   */
  getAudioEnergy() {
    const data = this.getAudioData();
    if (data.length === 0) return 0;
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    const rms = Math.sqrt(sum / data.length);
    return Math.min(255, rms * 1.8); // Scale for ultra-responsive whisper particle visualizer
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = WakeWordListener;
} else {
  window.WakeWordListener = WakeWordListener;
}
