"""
concode_engine/audio/wake_word.py
=================================
OpenWakeWord & Fuzzy Phonetic Trigger Engine.
Monitors low-latency PCM audio stream for 'Hey ConCode', 'ConCode', 'Hi ConCode', and 'Ok ConCode'.
Uses OpenWakeWord ONNX embeddings or difflib phonetic fuzzy distance scoring.
"""

from __future__ import annotations
import os
import difflib
import numpy as np
import logging
from typing import Callable, Optional, List

from concode_engine.config import DEFAULT_CONFIG

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("concode_engine.wake_word")

class WakeWordDetector:
    def __init__(
        self,
        target_phrases: List[str] = None,
        on_wake_word: Callable[[str], None] = None,
        sensitivity: float = 0.45  # Increased default sensitivity (0.6 -> 0.45)
    ):
        self.target_phrases = [
            p.lower().strip() for p in (target_phrases or DEFAULT_CONFIG.target_wake_phrases)
        ]
        self.on_wake_word = on_wake_word
        self.sensitivity = sensitivity
        self.is_active = True
        self.oww_model = None
        self._init_engine()

    def _init_engine(self):
        """Attempts loading OpenWakeWord ONNX model session or initializes fuzzy phonetic fallback."""
        try:
            import openwakeword
            from openwakeword.model import Model
            
            model_path = os.path.expanduser("~/.concode/models/openwakeword/hey_concode.onnx")
            if os.path.exists(model_path):
                self.oww_model = Model(wakeword_models=[model_path], inference_framework="onnxruntime")
                logger.info("OpenWakeWord ONNX Neural Engine loaded successfully.")
            else:
                logger.info("OpenWakeWord custom ONNX file not found. Fuzzy Phonetic Audio Engine active.")
        except Exception as e:
            logger.info(f"OpenWakeWord neural engine init fallback: {e}")

    def process_pcm_frame(self, pcm_data: np.ndarray, text_hint: str = None) -> bool:
        """
        Processes a raw PCM audio chunk or STT text hint for wake word triggers.
        Returns True if a wake phrase is detected.
        """
        if not self.is_active:
            return False

        # 1. Neural OpenWakeWord ONNX evaluation
        if self.oww_model is not None and isinstance(pcm_data, np.ndarray):
            try:
                # OpenWakeWord accepts int16 numpy arrays
                prediction = self.oww_model.predict(pcm_data)
                for model_name, score in prediction.items():
                    if score >= self.sensitivity:
                        logger.info(f"[WakeWordDetector] OpenWakeWord Neural Match! Score: {score:.3f}")
                        if self.on_wake_word:
                            self.on_wake_word("hey concode")
                        return True
            except Exception as e:
                logger.debug(f"OpenWakeWord frame error: {e}")

        # 2. Fuzzy Phonetic Matcher on Text Hints
        if text_hint:
            clean_hint = text_hint.lower().strip()
            
            # Exact substring match
            for phrase in self.target_phrases:
                if phrase in clean_hint:
                    logger.info(f"[WakeWordDetector] Phonetic Match Triggered: '{phrase}' in '{clean_hint}'")
                    if self.on_wake_word:
                        self.on_wake_word(phrase)
                    return True

            # Flexible Regex pattern match (e.g. "hey ... code", "con code")
            import re
            if re.search(r"(h[ea]y|hi|ok|okay|a)\s+.*c[o0]d[e]", clean_hint) or re.search(r"\b(concode|concord|comcode|kancode|khancode|con code|can code)\b", clean_hint):
                logger.info(f"[WakeWordDetector] Regex Pattern Match Triggered: '{clean_hint}'")
                if self.on_wake_word:
                    self.on_wake_word("hey concode")
                return True

            # Fuzzy phonetic distance (ratio lowered to 0.60 for quiet/imperfect speech)
            words = clean_hint.split()
            for i in range(len(words)):
                candidate = " ".join(words[i:i+2])
                for phrase in self.target_phrases:
                    ratio = difflib.SequenceMatcher(None, candidate, phrase).ratio()
                    if ratio >= 0.60:
                        logger.info(f"[WakeWordDetector] Fuzzy Match Triggered: '{candidate}' ~ '{phrase}' (ratio={ratio:.2f})")
                        if self.on_wake_word:
                            self.on_wake_word(phrase)
                        return True

        return False
