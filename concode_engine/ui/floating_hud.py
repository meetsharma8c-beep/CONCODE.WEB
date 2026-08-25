"""
concode_engine/ui/floating_hud.py
=================================
Frameless, Transparent, Always-On-Top Reactive Floating HUD Visualizer in PyQt6.
Renders 5 dynamic visual HUD states driven by the ConCode AI Orchestrator:
  1. IDLE / PASSIVE: Low-opacity cyan ambient pulse.
  2. WAKE / ACTIVATED: Dramatic golden/amber glowing expansion & ring ripple.
  3. LISTENING: Dynamic audio-reactive emerald pulsing in real time to speech pitch/volume.
  4. PROCESSING: Rapid holographic particle orbit spinning around core.
  5. SPEAKING / EXECUTING: Rhythmic magenta sound-matched pulsing during TTS playback or code stream.

Includes graceful CLI Visualizer fallback for headless environments.
"""

from __future__ import annotations
import sys
import math
import time
import logging
from typing import Optional

from concode_engine.config import DEFAULT_CONFIG, HUDConfig

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("concode_engine.ui.hud")

# Try to import PyQt6 components
PYQT6_AVAILABLE = False
try:
    from PyQt6.QtCore import Qt, QTimer, QPointF, QRectF
    from PyQt6.QtGui import QColor, QPainter, QBrush, QPen, QRadialGradient, QFont
    from PyQt6.QtWidgets import QApplication, QWidget
    PYQT6_AVAILABLE = True
except ImportError:
    logger.info("PyQt6 package not installed. Running in CLI Visualizer Fallback mode.")


class HUDVisualizerWidget(QWidget if PYQT6_AVAILABLE else object):
    def __init__(self, config: HUDConfig = None):
        if PYQT6_AVAILABLE:
            super().__init__()
            self.config = config or DEFAULT_CONFIG.hud
            self.current_state = "IDLE"
            self.animation_step = 0.0
            self.audio_amplitude = 0.1
            self.status_text = "CONCODE AI"
            self.particles = []

            self._init_window()
            self._init_particles()
            
            # Animation Timer (60 FPS)
            self.timer = QTimer(self)
            self.timer.timeout.connect(self._animate_tick)
            self.timer.start(1000 // self.config.fps)
        else:
            self.current_state = "IDLE"

    def _init_window(self):
        if not PYQT6_AVAILABLE:
            return

        self.setWindowFlags(
            Qt.WindowType.FramelessWindowHint |
            Qt.WindowType.WindowStaysOnTopHint |
            Qt.WindowType.Tool |
            Qt.WindowType.WindowTransparentForInput
        )
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground, True)
        self.resize(self.config.window_width, self.config.window_height)
        self.move_to_corner()

    def move_to_corner(self):
        if not PYQT6_AVAILABLE:
            return
        screen = QApplication.primaryScreen()
        if screen:
            screen_geo = screen.availableGeometry()
            # Move to bottom-right corner of screen
            x = screen_geo.width() - self.width() - 30
            y = screen_geo.height() - self.height() - 40
            self.move(x, y)

    def _init_particles(self):
        """Initializes holographic orbit particles for PROCESSING state."""
        self.particles = []
        for i in range(12):
            angle = (2 * math.pi / 12) * i
            self.particles.append({
                "angle": angle,
                "radius": 55,
                "speed": 0.05 + (i % 3) * 0.02,
                "size": 4 + (i % 2) * 2
            })

    def set_state(self, new_state: str, payload: dict = None):
        """Updates the visual HUD state (IDLE, WAKE_DETECTED, LISTENING, PROCESSING, SPEAKING, EXECUTING)."""
        clean_state = new_state.replace("[STATE:", "").replace("]", "").strip()
        self.current_state = clean_state
        
        if payload and "text" in payload:
            self.status_text = payload["text"][:20]
        else:
            self.status_text = clean_state

        logger.info(f"[HUD Visualizer] State ➔ {clean_state}")
        if PYQT6_AVAILABLE:
            self.update()
        else:
            self._cli_render()

    def set_audio_amplitude(self, amplitude: float):
        """Updates real-time microphone volume/pitch amplitude (0.0 to 1.0)."""
        self.audio_amplitude = max(0.05, min(amplitude, 1.0))
        if PYQT6_AVAILABLE:
            self.update()

    def _animate_tick(self):
        if not PYQT6_AVAILABLE:
            return

        self.animation_step += 0.05
        if self.animation_step > 1000.0:
            self.animation_step = 0.0

        # Rotate particles during PROCESSING
        if "PROCESSING" in self.current_state:
            for p in self.particles:
                p["angle"] += p["speed"]

        self.update()

    def paintEvent(self, event):
        if not PYQT6_AVAILABLE:
            return

        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)

        center_x = self.width() / 2.0
        center_y = self.height() / 2.0
        base_radius = 50.0

        # Select color palette by state
        if "WAKE" in self.current_state:
            color_hex = self.config.base_color_wake
            pulse = math.sin(self.animation_step * 3.0) * 15.0
            radius = base_radius + 15.0 + pulse
            opacity = 0.95
        elif "LISTENING" in self.current_state:
            color_hex = self.config.base_color_listening
            react_pulse = self.audio_amplitude * 35.0
            radius = base_radius + react_pulse
            opacity = 0.90
        elif "PROCESSING" in self.current_state:
            color_hex = self.config.base_color_processing
            radius = base_radius + math.sin(self.animation_step * 2.0) * 5.0
            opacity = 0.85
        elif "SPEAKING" in self.current_state or "EXECUTING" in self.current_state:
            color_hex = self.config.base_color_speaking
            wave_pulse = math.sin(self.animation_step * 4.0) * 12.0
            radius = base_radius + wave_pulse
            opacity = 0.92
        else: # IDLE
            color_hex = self.config.base_color_idle
            pulse = math.sin(self.animation_step * 0.8) * 4.0
            radius = base_radius + pulse
            opacity = 0.45

        color = QColor(color_hex)
        color.setAlphaF(opacity)

        # 1. Outer Glow Aura Gradient
        gradient = QRadialGradient(center_x, center_y, radius * 1.6)
        glow_color = QColor(color)
        glow_color.setAlphaF(opacity * 0.4)
        gradient.setColorAt(0.0, glow_color)
        gradient.setColorAt(0.7, QColor(color.red(), color.green(), color.blue(), 20))
        gradient.setColorAt(1.0, QColor(0, 0, 0, 0))

        painter.setPen(Qt.PenStyle.NoPen)
        painter.setBrush(QBrush(gradient))
        painter.drawEllipse(QPointF(center_x, center_y), radius * 1.6, radius * 1.6)

        # 2. Central Core Circle
        painter.setBrush(QBrush(color))
        painter.drawEllipse(QPointF(center_x, center_y), radius * 0.55, radius * 0.55)

        # 3. State-Specific Canvas Renderers
        if "PROCESSING" in self.current_state:
            # Particle Orbit System
            particle_color = QColor("#e9d5ff")
            painter.setBrush(QBrush(particle_color))
            for p in self.particles:
                px = center_x + math.cos(p["angle"]) * (radius * 0.95)
                py = center_y + math.sin(p["angle"]) * (radius * 0.95)
                painter.drawEllipse(QPointF(px, py), p["size"], p["size"])

        elif "LISTENING" in self.current_state:
            # Dynamic Equalizer Ring
            pen = QPen(QColor("#ffffff"))
            pen.setWidth(2)
            painter.setPen(pen)
            painter.drawEllipse(QPointF(center_x, center_y), radius * 0.8, radius * 0.8)

        elif "WAKE" in self.current_state:
            # Gold Expansion Ring
            ring_pen = QPen(QColor(self.config.base_color_wake))
            ring_pen.setWidth(3)
            painter.setPen(ring_pen)
            painter.drawEllipse(QPointF(center_x, center_y), radius * 1.25, radius * 1.25)

        # 4. Status Text Overlay
        painter.setFont(QFont("JetBrains Mono", 9, QFont.Weight.Bold))
        painter.setPen(QPen(QColor("#ffffff")))
        text_rect = QRectF(center_x - 100, center_y + radius + 10, 200, 30)
        painter.drawText(text_rect, Qt.AlignmentFlag.AlignCenter, self.status_text)

    def _cli_render(self):
        """CLI text visualizer fallback when PyQt6 GUI environment is unavailable."""
        symbols = {
            "IDLE": " [IDLE - Ambient Cyan]",
            "WAKE_DETECTED": " [WAKE - Glowing Amber]",
            "LISTENING": " [LISTENING - Pulse Emerald]",
            "PROCESSING": " [PROCESSING - Orbit Purple]",
            "SPEAKING": " [SPEAKING - Pulsing Magenta]",
            "EXECUTING": " [EXECUTING - Code Write Magenta]"
        }
        symbol = symbols.get(self.current_state, f"[{self.current_state}]")
        print(f"\r[CONCODE HUD visualizer]: {symbol}   ", end="", flush=True)


class FloatingHUDManager:
    """Wrapper manager for running PyQt6 Floating HUD."""
    def __init__(self, config: HUDConfig = None):
        self.config = config or DEFAULT_CONFIG.hud
        self.app: Optional[QApplication] = None
        self.widget: Optional[HUDVisualizerWidget] = None
        self._init_app()

    def _init_app(self):
        if PYQT6_AVAILABLE:
            if not QApplication.instance():
                self.app = QApplication(sys.argv)
            else:
                self.app = QApplication.instance()
            self.widget = HUDVisualizerWidget(self.config)
        else:
            self.widget = HUDVisualizerWidget(self.config)

    def show(self):
        if PYQT6_AVAILABLE and self.widget:
            self.widget.show()
            logger.info("PyQt6 Floating HUD window shown on top.")
        else:
            logger.info("CLI HUD Visualizer active.")

    def update_state(self, state_tag: str, payload: dict = None):
        if self.widget:
            self.widget.set_state(state_tag, payload)

    def update_audio_amplitude(self, amp: float):
        if self.widget:
            self.widget.set_audio_amplitude(amp)

    def process_events(self):
        if PYQT6_AVAILABLE and self.app:
            self.app.processEvents()
