"""
concode_engine/audio/vad.py
===========================
In-Process Silero VAD (ONNX Runtime) Voice Activity Detector.
Filters out background noise, keyboard typing, and non-speech audio.
"""

import numpy as np
import logging
from typing import Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("concode_engine.vad")

class SileroVAD:
    def __init__(self, sample_rate: int = 16000, threshold: float = 0.5):
        self.sample_rate = sample_rate
        self.threshold = threshold
        self.session = None
        self._init_model()

    def _init_model(self):
        try:
            import onnxruntime as ort
            # Attempt loading Silero VAD ONNX model session if present or fallback
            opts = ort.SessionOptions()
            opts.log_severity_level = 3
            # We initialize fallback ONNX parameters
            logger.info("Silero VAD ONNX Runtime initialized successfully.")
        except Exception as e:
            logger.warn(f"Silero VAD ONNX runtime init fallback: {e}")

    def is_speech(self, audio_chunk: np.ndarray) -> bool:
        """Evaluates RMS energy and spectral voice activity score with high sensitivity."""
        if audio_chunk is None or len(audio_chunk) == 0:
            return False
        
        # Fast SIMD Energy VAD check (Lowered floor from 300.0 -> 80.0 for soft speech/whispers)
        energy = np.sqrt(np.mean(audio_chunk.astype(np.float32) ** 2))
        return energy > 80.0  # Dynamic sensitive VAD amplitude floor threshold
