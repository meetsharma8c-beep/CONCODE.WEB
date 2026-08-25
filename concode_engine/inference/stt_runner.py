"""
concode_engine/inference/stt_runner.py
======================================
Native pywhispercpp / whisper.cpp Binding for In-Process Local Speech-To-Text.
Zero cloud network requirements.
"""

import logging
import os
import numpy as np

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("concode_engine.stt_runner")

class LocalSTTRunner:
    def __init__(self, model_path: str = None):
        self.model_path = model_path
        self.whisper_model = None
        self._init_whisper()

    def _init_whisper(self):
        if not self.model_path or not os.path.exists(self.model_path):
            logger.info("Local Whisper.cpp model bin not found. Native Speech-To-Text fallback active.")
            return

        try:
            from pywhispercpp.model import Model
            logger.info(f"Loading native whisper.cpp model from: {self.model_path}")
            self.whisper_model = Model(self.model_path, n_threads=4)
            logger.info("In-Process Whisper STT initialized successfully.")
        except Exception as e:
            logger.warn(f"pywhispercpp binding init: {e}")

    def transcribe(self, audio_pcm_bytes: bytes) -> str:
        """Transcribes PCM audio buffer into text in-process."""
        if not audio_pcm_bytes:
            return ""

        if self.whisper_model:
            try:
                audio_float = np.frombuffer(audio_pcm_bytes, dtype=np.int16).astype(np.float32) / 32768.0
                segments = self.whisper_model.transcribe(audio_float)
                text = " ".join([seg.text for seg in segments]).strip()
                return text
            except Exception as e:
                logger.error(f"Whisper transcription error: {e}")

        return ""
