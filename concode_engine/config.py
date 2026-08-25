"""
concode_engine/config.py
========================
Centralized Configuration for ConCode AI Standalone Engine.
Defines model file paths, quantization parameters, audio stream specs, VAD thresholds,
and PyQt6 Floating HUD visual options.
"""

import os
from dataclasses import dataclass, field
from typing import List, Dict

@dataclass
class AudioConfig:
    sample_rate: int = 16000
    chunk_size: int = 512
    channels: int = 1
    ring_buffer_duration_sec: float = 3.0
    vad_threshold: float = 0.25  # High-sensitivity VAD threshold
    silence_timeout_sec: float = 7.0  # Extended 7s pause timeout

@dataclass
class ModelConfig:
    models_dir: str = os.path.expanduser("~/.concode/models")
    llm_model_name: str = "qwen2.5-coder-7b-instruct-q4_k_m.gguf"
    stt_model_name: str = "ggml-whisper-base.en.bin"
    tts_model_name: str = "kokoro-82m-v1.0.onnx"
    openwakeword_model: str = "hey_concode.onnx"
    context_window: int = 16384
    max_tokens: int = 2048
    temperature: float = 0.2
    top_p: float = 0.95

@dataclass
class HUDConfig:
    window_width: int = 280
    window_height: int = 280
    always_on_top: bool = True
    frameless: bool = True
    transparent_background: bool = True
    fps: int = 60
    base_color_idle: str = "#00f0ff"       # Cyan
    base_color_wake: str = "#ffd700"       # Gold / Amber
    base_color_listening: str = "#00ff88"  # Neon Emerald
    base_color_processing: str = "#a855f7" # Holographic Purple
    base_color_speaking: str = "#ff007f"   # Vibrant Magenta

@dataclass
class EngineConfig:
    audio: AudioConfig = field(default_factory=AudioConfig)
    model: ModelConfig = field(default_factory=ModelConfig)
    hud: HUDConfig = field(default_factory=HUDConfig)
    target_wake_phrases: List[str] = field(
        default_factory=lambda: [
            "hey concode", "concode", "hi concode", "okay concode", "ok concode",
            "hey concord", "concord", "khan code", "kan code", "con code", "hey con code",
            "comcode", "cone code", "hey cone code", "hey quick code", "hey cool code",
            "hey call code", "hey code", "a concode", "ok code", "hi code", "hey gun code"
        ]
    )
    stop_phrases: List[str] = field(
        default_factory=lambda: ["concode stop", "stop concode", "quiet", "cancel", "stop"]
    )

# Global configuration instance
DEFAULT_CONFIG = EngineConfig()
