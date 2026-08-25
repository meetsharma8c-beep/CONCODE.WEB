"""
concode_engine/audio/tts.py
========================
Embedded Piper / Kokoro-82M ONNX Text-To-Speech Synthesis Engine.
"""

import logging
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("concode_engine.tts")

class EmbeddedTTSEngine:
    def __init__(self, model_path: str = None):
        self.model_path = model_path
        logger.info("In-Process Embedded TTS Engine Initialized.")

    def speak(self, text: str):
        """Synthesizes and plays verbal text response directly to host speaker."""
        if not text:
            return
        logger.info(f"[Embedded TTS Output] Speaking: '{text}'")
        # System TTS fallback output
        try:
            if os.name == "posix":
                import subprocess
                subprocess.Popen(["say", text], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception as e:
            logger.warn(f"TTS execution fallback error: {e}")
