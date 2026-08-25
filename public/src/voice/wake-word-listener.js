/**
 * ==========================================================================
 * CONCODE AI — Always-Active Hands-Free Voice Listener Module
 * Performs continuous background audio listening, VAD analysis, and zero-effort speech capture.
 * ==========================================================================
 */

class WakeWordListener {
  constructor(options = {}) {
    this.onWakeWordDetected = options.onWakeWordDetected || (() => {});
    this.onError = options.onError || (() => {});
    this.onStatusChange = options.onStatusChange || (() => {});

    this.isListening = false;
    this.recognition = null;
    this.audioContext = null;
    this.analyser = null;
    this.micStream = null;

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
      this.onStatusChange('listening');
    };

    this.recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        for (let j = 0; j < event.results[i].length; ++j) {
          const transcript = event.results[i][j].transcript ? event.results[i][j].transcript.trim() : '';
          const confidence = event.results[i][j].confidence || 0.9;
          
          if (transcript.length > 1) {
            console.log(`[WakeWordListener] Hands-free Speech Detected: "${transcript}" (Conf: ${confidence.toFixed(2)})`);
            this.onWakeWordDetected({
              transcript: transcript,
              confidence: confidence,
              timestamp: Date.now()
            });
            return;
          }
        }
      }
    };

    this.recognition.onerror = (event) => {
      if (event.error === 'no-speech') {
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
      if (this.isListening) {
        try {
          this.recognition.start();
        } catch (e) {
          // Already running
        }
      } else {
        this.onStatusChange('stopped');
      }
    };
  }

  /**
   * Starts background listening loop & mic connection
   */
  async start() {
    if (this.isListening) return;

    try {
      this.isListening = true;
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
   * Initializes Web Audio Context for audio analysis
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
          noiseSuppression: false,
          autoGainControl: true,
          channelCount: 1
        },
        video: false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.micStream = stream;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx();
      
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.5;
      source.connect(this.analyser);
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
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = WakeWordListener;
} else {
  window.WakeWordListener = WakeWordListener;
}
