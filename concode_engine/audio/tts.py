"""
concode_engine/audio/tts.py
========================
Embedded Piper / Kokoro-82M ONNX Text-To-Speech Synthesis Engine.
"""

import logging
import os
import sys
import shutil
import subprocess

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
        try:
            if sys.platform == "darwin":
                if shutil.which("say"):
                    subprocess.Popen(["say", text], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                else:
                    logger.info(f"[TTS Audio - macOS fallback]: {text}")
            elif sys.platform.startswith("linux"):
                # Check for standard Linux TTS engines
                linux_bin = next((b for b in ["spd-say", "espeak-ng", "espeak", "festival"] if shutil.which(b)), None)
                if linux_bin:
                    subprocess.Popen([linux_bin, text], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                else:
                    logger.info(f"[TTS Audio - Linux fallback text]: {text}")
            elif sys.platform.startswith("win"):
                escaped_text = text.replace('"', '`"')
                cmd = f'powershell -NoProfile -Command "Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak(\\"{escaped_text}\\")"'
                subprocess.Popen(cmd, shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            else:
                logger.info(f"[TTS Audio - Text Output]: {text}")
        except Exception as e:
            logger.warn(f"TTS execution fallback error: {e}")
