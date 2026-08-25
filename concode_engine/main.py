"""
concode_engine/main.py
======================
Single-Command Application Entrypoint for ConCode AI Standalone Bare-Metal Engine.
Usage:
    python -m concode_engine.main
"""

import sys
import os
import time
import asyncio
import logging

from concode_engine.config import DEFAULT_CONFIG
from concode_engine.core import HardwareManager, ConCodeOrchestrator, VoiceState
from concode_engine.audio import AudioListener, EmbeddedTTSEngine
from concode_engine.inference import LocalLLMRunner, LocalSTTRunner
from concode_engine.context import ASTContextParser, LocalVectorStore, ProjectIndexer
from concode_engine.ui.floating_hud import FloatingHUDManager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("concode_engine.main")

def main():
    logger.info("=========================================================================")
    logger.info("Initializing ConCode AI Standalone Bare-Metal Computerized Brain v10.0...")
    logger.info("=========================================================================")

    # 1. Hardware Detection & Memory Allocation
    hw_manager = HardwareManager(context_size=DEFAULT_CONFIG.model.context_window)
    hw_spec = hw_manager.detect_hardware()
    logger.info(
        f"Hardware Auto-Gated: {hw_spec.backend} ({hw_spec.threads} Cores, "
        f"{hw_spec.total_ram_gb}GB RAM, GPU Layers={hw_spec.gpu_layers}, SIMD={hw_spec.simd_instruction})"
    )

    # 2. In-Process LanceDB Vector Store & Codebase Indexer
    project_path = os.getcwd()
    vector_store = LocalVectorStore()
    indexer = ProjectIndexer(project_path, vector_store)
    indexer.index_all()

    # 3. Model Runners (GGUF LLM, Whisper STT, Piper/Kokoro TTS)
    llm_runner = LocalLLMRunner(hardware_spec=hw_spec)
    stt_runner = LocalSTTRunner()
    tts_engine = EmbeddedTTSEngine()

    # 4. Master Orchestrator
    orchestrator = ConCodeOrchestrator(hardware_spec=hw_spec, config=DEFAULT_CONFIG)

    # 5. PyQt6 Floating HUD Visualizer
    hud_manager = FloatingHUDManager(config=DEFAULT_CONFIG.hud)
    hud_manager.show()

    # Bind Orchestrator events to HUD visualizer
    def on_state_tag_emit(state_tag: str, payload: dict):
        hud_manager.update_state(state_tag, payload)

    orchestrator.add_hud_listener(on_state_tag_emit)
    orchestrator.start()

    # Callback for editor buffer code writes
    def editor_code_writer(code_content: str):
        logger.info(f"[Editor Buffer Route] Direct code payload dispatched:\n{code_content[:150]}...")

    # 6. Audio Listener with Silero VAD and Wake-Word Engine
    def on_wake_word_triggered(phrase: str):
        logger.info(f"\n⚡ [WAKE WORD EVENT TRIGGERED]: '{phrase}' ⚡")
        # Run async state machine wake-word handler
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.run_coroutine_threadsafe(orchestrator.handle_wake_word(phrase), loop)
            else:
                asyncio.run(orchestrator.handle_wake_word(phrase))
        except Exception as err:
            logger.warn(f"Wake word dispatch fallback: {err}")

    def on_speech_frame_captured(audio_pcm: bytes):
        # Calculate amplitude for reactive HUD visualizer
        if audio_pcm:
            import numpy as np
            arr = np.frombuffer(audio_pcm, dtype=np.int16)
            amp = float(np.abs(arr).mean() / 4000.0) if len(arr) > 0 else 0.1
            hud_manager.update_audio_amplitude(amp)

    listener = AudioListener(
        sample_rate=DEFAULT_CONFIG.audio.sample_rate,
        chunk_size=DEFAULT_CONFIG.audio.chunk_size,
        on_speech_frame=on_speech_frame_captured,
        on_wake_word=on_wake_word_triggered
    )
    listener.start_listening()

    print("\n=========================================================================")
    print("  ConCode AI Standalone Bare-Metal Engine Active.")
    print("  Local Hardware Backend: " + hw_spec.backend)
    print("  Listening continuously for 'Hey ConCode' / 'ConCode'...")
    print("  Floating HUD Visualizer: Active on screen top-layer.")
    print("  Press Ctrl+C to terminate application.")
    print("=========================================================================\n")

    # Main GUI & Event Loop Pump
    try:
        while True:
            hud_manager.process_events()
            time.sleep(0.016)  # 60 FPS event loop pump
    except KeyboardInterrupt:
        logger.info("\nShutting down ConCode AI Standalone Engine cleanly...")
        listener.stop_listening()
        orchestrator.stop()

if __name__ == "__main__":
    main()
