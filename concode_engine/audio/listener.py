"""
concode_engine/audio/listener.py
=================================
Low-Latency Audio Stream Listener using SoundDevice / PyAudio with Silero VAD gating.
Continuously captures raw PCM audio from host microphone, applies Silero VAD gating,
and routes to OpenWakeWord detector.
"""

import collections
import threading
import time
import numpy as np
import logging
from typing import Callable, Optional

from .vad import SileroVAD
from .wake_word import WakeWordDetector

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("concode_engine.listener")

class AudioListener:
    def __init__(
        self,
        sample_rate: int = 16000,
        chunk_size: int = 512,
        ring_buffer_size: int = 50,
        on_speech_frame: Callable[[bytes], None] = None,
        on_wake_word: Callable[[str], None] = None
    ):
        self.sample_rate = sample_rate
        self.chunk_size = chunk_size
        self.ring_buffer = collections.deque(maxlen=ring_buffer_size)
        self.on_speech_frame = on_speech_frame
        
        self.vad = SileroVAD(sample_rate=sample_rate)
        self.wake_word_detector = WakeWordDetector(on_wake_word=on_wake_word)
        
        self._is_listening = False
        self._thread: Optional[threading.Thread] = None

    def start_listening(self):
        if self._is_listening:
            return
        self._is_listening = True
        self._thread = threading.Thread(target=self._audio_capture_loop, daemon=True, name="audio_capture_thread")
        self._thread.start()
        logger.info("Low-Latency Microphone Audio Listener loop started.")

    def stop_listening(self):
        self._is_listening = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=1.0)
        logger.info("Audio Listener loop stopped.")

    def _audio_capture_loop(self):
        """Native audio stream capture using sounddevice -> pyaudio -> synthetic fallback."""
        # 1. Attempt sounddevice capture (No C header / portaudio.h compilation required)
        try:
            import sounddevice as sd
            logger.info("Initializing mic audio stream using sounddevice driver...")

            def callback(indata, frames, time_info, status):
                if not self._is_listening:
                    return
                # Convert float32 array to int16 PCM bytes
                pcm_array = (indata[:, 0] * 32767).astype(np.int16)
                pcm_bytes = pcm_array.tobytes()
                self.ring_buffer.append(pcm_bytes)

                if self.vad.is_speech(pcm_array):
                    if self.on_speech_frame:
                        self.on_speech_frame(pcm_bytes)
                    self.wake_word_detector.process_pcm_frame(pcm_array)

            with sd.InputStream(
                samplerate=self.sample_rate,
                blocksize=self.chunk_size,
                channels=1,
                dtype='float32',
                callback=callback
            ):
                while self._is_listening:
                    time.sleep(0.05)
            return
        except Exception as sd_err:
            logger.debug(f"sounddevice capture fallback: {sd_err}")

        # 2. Attempt PyAudio capture
        try:
            import pyaudio
            logger.info("Initializing mic audio stream using PyAudio driver...")
            p = pyaudio.PyAudio()
            stream = p.open(
                format=pyaudio.paInt16,
                channels=1,
                rate=self.sample_rate,
                input=True,
                frames_per_buffer=self.chunk_size
            )

            while self._is_listening:
                data = stream.read(self.chunk_size, exception_on_overflow=False)
                pcm_array = np.frombuffer(data, dtype=np.int16)
                self.ring_buffer.append(data)

                if self.vad.is_speech(pcm_array):
                    if self.on_speech_frame:
                        self.on_speech_frame(data)
                    self.wake_word_detector.process_pcm_frame(pcm_array)

            stream.stop_stream()
            stream.close()
            p.terminate()
            return
        except Exception as pa_err:
            logger.info(f"PyAudio hardware binding fallback active: {pa_err}")

        # 3. Synthetic low-latency frame loop for environments without raw mic hardware access
        while self._is_listening:
            time.sleep(0.03)
            synthetic_chunk = np.zeros(self.chunk_size, dtype=np.int16).tobytes()
            self.ring_buffer.append(synthetic_chunk)
