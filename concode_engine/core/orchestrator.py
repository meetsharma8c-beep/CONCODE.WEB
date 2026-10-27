"""
concode_engine/core/orchestrator.py
===================================
Master Async Event Loop & Voice State Machine Orchestrator for ConCode AI.
Drives 5 reactive states: IDLE -> WAKE_DETECTED -> LISTENING -> PROCESSING -> SPEAKING/EXECUTING.
Enforces 5-second silence timeout, speech interruption handling ("ConCode stop"),
and persona laws (short 1-3 sentence verbal replies, raw code sent to editor/terminal buffer).
"""

from __future__ import annotations
import asyncio
import enum
import logging
import time
import concurrent.futures
from typing import Callable, Optional, List, Dict, Any

from concode_engine.config import DEFAULT_CONFIG, EngineConfig

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("concode_engine.orchestrator")

class VoiceState(enum.Enum):
    IDLE = "IDLE"
    WAKE_DETECTED = "WAKE_DETECTED"
    LISTENING = "LISTENING"
    PROCESSING = "PROCESSING"
    SPEAKING = "SPEAKING"
    EXECUTING = "EXECUTING"

import urllib.request
import json
import uuid

class ConCodeOrchestrator:
    def __init__(self, hardware_spec=None, config: EngineConfig = None):
        self.config = config or DEFAULT_CONFIG
        self.state = VoiceState.LISTENING  # Always Activated by default
        self.hardware_spec = hardware_spec
        self.executor = concurrent.futures.ThreadPoolExecutor(
            max_workers=4, thread_name_prefix="concode_worker"
        )
        self.state_callbacks: List[Callable[[VoiceState], None]] = []
        self.hud_callbacks: List[Callable[[str, Dict[str, Any]], None]] = []
        
        self.last_speech_timestamp = time.time()
        self._timeout_task: Optional[asyncio.Task] = None
        self._is_interrupted = False
        self._is_speaking = False
        self._is_running = False
        self._session_id = f"voice_{uuid.uuid4().hex[:12]}"
        self.brain_api_url = "http://localhost:8000/api/v1/cognitive"

    def add_state_listener(self, callback: Callable[[VoiceState], None]):
        """Registers a callback for state transition events."""
        self.state_callbacks.append(callback)

    def add_hud_listener(self, callback: Callable[[str, Dict[str, Any]], None]):
        """Registers a callback to emit state metadata tags directly to the UI/HUD visualizer."""
        self.hud_callbacks.append(callback)

    def transition_to(self, new_state: VoiceState, extra_data: Dict[str, Any] = None):
        """Executes thread-safe state transition and notifies all subscribers."""
        if self.state == new_state and not extra_data:
            return

        logger.info(f"[State Machine Tag: [STATE: {new_state.value}]] {self.state.value} -> {new_state.value}")
        self.state = new_state
        payload = extra_data or {}

        # Notify direct state listeners
        for cb in self.state_callbacks:
            try:
                cb(new_state)
            except Exception as e:
                logger.error(f"State callback error: {e}")

        # Emit HUD state tag
        tag = f"[STATE: {new_state.value}]"
        for hcb in self.hud_callbacks:
            try:
                hcb(tag, payload)
            except Exception as e:
                logger.error(f"HUD callback error: {e}")

    def trigger_interruption(self):
        """Immediately halts ongoing LLM generation or TTS speech playback."""
        logger.info("[Orchestrator] Interruption signal received ('ConCode stop'). Aborting pipeline...")
        self._is_interrupted = True
        self._is_speaking = False
        self.transition_to(VoiceState.IDLE)

    async def handle_wake_word(self, wake_phrase: str = "hey concode"):
        """Triggered when OpenWakeWord matches key phrase."""
        if self._is_speaking:
            return
        self._is_interrupted = False
        logger.info(f"[Orchestrator] Wake-Word Match: '{wake_phrase}'")
        
        # 1. Immediate activation tag
        self.transition_to(VoiceState.WAKE_DETECTED, {"phrase": wake_phrase})
        await asyncio.sleep(0.15)
        
        # 2. Transition to LISTENING
        self.transition_to(VoiceState.LISTENING)
        self.last_speech_timestamp = time.time()
        
        # Start silence timeout monitor (5 seconds)
        if self._timeout_task and not self._timeout_task.done():
            self._timeout_task.cancel()
        self._timeout_task = asyncio.create_task(self._monitor_silence_timeout())

    async def _monitor_silence_timeout(self):
        """Gentle 5-second silence timeout monitor that fades HUD back to IDLE if no audio input."""
        timeout_sec = self.config.audio.silence_timeout_sec
        while self.state == VoiceState.LISTENING and self._is_running:
            await asyncio.sleep(0.5)
            elapsed = time.time() - self.last_speech_timestamp
            if elapsed >= timeout_sec:
                logger.info(f"[Orchestrator] No speech detected for {timeout_sec}s. Fading back to IDLE...")
                self.transition_to(VoiceState.IDLE)
                break

    def _call_brain_api(self, prompt: str) -> str:
        """Invokes CONCODE Neural Brain API directly with defensive input boundary checks."""
        if not prompt or not isinstance(prompt, str):
            return ""
        clean_prompt = prompt.strip()[:8192]
        if not clean_prompt:
            return ""

        try:
            req_data = json.dumps({
                "query": clean_prompt,
                "session_id": self._session_id,
                "mode": "voice",
                "workspace_files": {}
            }).encode("utf-8")
            headers = {"Content-Type": "application/json"}
            api_key = os.environ.get("CONCODE_API_KEY")
            if api_key:
                headers["X-API-Key"] = api_key
            req = urllib.request.Request(
                self.brain_api_url,
                data=req_data,
                headers=headers,
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=10) as response:
                res_body = response.read().decode("utf-8")
                res_json = json.loads(res_body)
                if not isinstance(res_json, dict):
                    return ""
                if res_json.get("is_clarifying"):
                    return res_json.get("clarifying_question", "")
                code = res_json.get("code", "")
                msg = res_json.get("personalized_message", "")
                if code and msg:
                    return f"{msg}\n\n```\n{code}\n```"
                return code or msg or "Request processed by CONCODE Neural Brain."
        except Exception as e:
            logger.warning(f"[Orchestrator] Could not reach CONCODE Neural Brain API ({e}). Falling back to local LLM.")
            return ""


    async def process_user_speech(
        self,
        audio_pcm: bytes,
        stt_func: Callable[[bytes], str],
        llm_func: Callable[[str], str],
        tts_func: Callable[[str], None],
        editor_buffer_func: Callable[[str], None] = None
    ):
        """
        Executes end-to-end hands-free voice loop through CONCODE Neural Brain:
        Audio -> Local STT -> CONCODE Neural Brain -> Local TTS -> Editor Buffer Write
        """
        if self._is_interrupted or self._is_speaking:
            return

        if not audio_pcm or not isinstance(audio_pcm, bytes) or len(audio_pcm) == 0:
            return

        loop = asyncio.get_running_loop()

        self.last_speech_timestamp = time.time()

        try:
            # 1. Speech-To-Text (Whisper.cpp)
            self.transition_to(VoiceState.PROCESSING)
            transcribed_text: str = await loop.run_in_executor(self.executor, stt_func, audio_pcm)
            
            if self._is_interrupted or self._is_speaking:
                return

            if not transcribed_text or not transcribed_text.strip():
                logger.info("[Orchestrator] Transcription empty. Returning to IDLE.")
                self.transition_to(VoiceState.IDLE)
                return

            # Check stop words / interruption command
            clean_text = transcribed_text.lower().strip()
            for stop_phrase in self.config.stop_phrases:
                if stop_phrase in clean_text:
                    self.trigger_interruption()
                    return

            logger.info(f"[Orchestrator STT] User Query: '{transcribed_text}'")

            # 2. CONCODE Neural Brain Route (with Local LLM fallback)
            self.transition_to(VoiceState.PROCESSING)
            llm_response = await loop.run_in_executor(self.executor, self._call_brain_api, transcribed_text)
            if not llm_response:
                llm_response = await loop.run_in_executor(self.executor, llm_func, transcribed_text)

            if self._is_interrupted or self._is_speaking:
                return

            # Persona Laws Processing: Separate short verbal summary from raw code blocks
            verbal_summary, raw_code = self._split_persona_response(llm_response)

            # 3. Code Routing to Editor / Terminal Buffer
            if raw_code and editor_buffer_func:
                self.transition_to(VoiceState.EXECUTING)
                await loop.run_in_executor(self.executor, editor_buffer_func, raw_code)

            # 4. Local TTS Speech Delivery with Microphone Lock
            if verbal_summary and not self._is_interrupted:
                self._is_speaking = True
                self.transition_to(VoiceState.SPEAKING, {"text": verbal_summary})
                await loop.run_in_executor(self.executor, tts_func, verbal_summary)

        except Exception as e:
            logger.error(f"[Orchestrator Exception]: {e}", exc_info=True)
        finally:
            self._is_speaking = False
            if not self._is_interrupted:
                self.transition_to(VoiceState.IDLE)


    def _split_persona_response(self, full_text: str) -> tuple[str, str]:
        """
        Applies ConCode AI Persona Laws:
        - Verbal Channel: Short conversational summary (1-3 sentences max). No code symbols/syntax read out loud.
        - Editor Channel: Clean raw code blocks.
        """
        if not full_text:
            return "Task completed.", ""

        import re
        code_blocks = re.findall(r"```[\s\S]*?```", full_text)
        extracted_codes = []
        for cb in code_blocks:
            lines = cb.splitlines()
            if len(lines) >= 2 and lines[0].startswith("```"):
                end_idx = -1 if lines[-1].strip().startswith("```") else len(lines)
                code_content = "\n".join(lines[1:end_idx])
            else:
                code_content = cb.strip("`").strip()
            extracted_codes.append(code_content.strip())
        raw_code = "\n\n".join(extracted_codes)

        # Remove code blocks for verbal output
        text_without_code = re.sub(r"```[\s\S]*?```", "", full_text).strip()
        text_without_code = re.sub(r"`[^`]*`", "", text_without_code)
        text_without_code = re.sub(r"<[^>]*>", "", text_without_code)
        text_without_code = re.sub(r"^#{1,6}\s+", "", text_without_code, flags=re.MULTILINE)
        text_without_code = re.sub(r"[\*\_\~]", "", text_without_code)

        # Restrict to first 2-3 sentences
        sentences = re.split(r"(?<=[.?!])\s+", text_without_code)
        verbal_summary = " ".join([s.strip() for s in sentences if s.strip()][:2])

        if not verbal_summary.strip():
            verbal_summary = "Code generated and applied directly to your editor buffer."

        return verbal_summary, raw_code

    def start(self):
        self._is_running = True
        logger.info("ConCode AI Core Orchestrator event loop started successfully.")

    def stop(self):
        self._is_running = False
        if self._timeout_task:
            self._timeout_task.cancel()
        self.executor.shutdown(wait=False)
        self.transition_to(VoiceState.IDLE)
        logger.info("ConCode AI Core Orchestrator stopped cleanly.")
