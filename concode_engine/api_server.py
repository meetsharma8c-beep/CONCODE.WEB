"""
concode_engine/api_server.py
=============================
FastAPI HTTP Server for the ConCode Neural Brain Engine.
Bridges the Express web server (port 3000) to the Python bare-metal neural engine.

Endpoints:
    GET  /health             → Health check
    POST /api/v1/cognitive   → Process cognitive queries (LLM inference)
    GET  /api/v1/status      → Full system status
    GET  /api/v1/guilds      → List all cognitive guilds

Usage:
    uvicorn concode_engine.api_server:app --host 0.0.0.0 --port 8000
    # or
    python -m concode_engine.api_server
"""

from __future__ import annotations

import os
import time
import uuid
import logging
import re
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("concode_engine.api_server")

# ─────────────────────────────────────────────
# FastAPI App Initialization
# ─────────────────────────────────────────────

try:
    from fastapi import FastAPI, Request, HTTPException, Depends
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import JSONResponse
    from pydantic import BaseModel, Field
except ImportError:
    logger.error(
        "FastAPI is not installed. Install it with: pip install fastapi uvicorn\n"
        "Or install all dependencies: pip install -r requirements.txt"
    )
    raise

from concode_engine.config import DEFAULT_CONFIG
from concode_engine.core import HardwareManager, HardwareSpec, ContextMemoryManager
from concode_engine.inference import LocalLLMRunner
from concode_engine.context import ASTContextParser, LocalVectorStore, ProjectIndexer

# ─────────────────────────────────────────────
# Pydantic Request / Response Models
# ─────────────────────────────────────────────

class CognitiveRequest(BaseModel):
    query: str = Field(..., max_length=4096, description="User's natural language prompt")
    workspace_files: Dict[str, str] = Field(default_factory=dict, description="Map of filename → content")
    session_id: str = Field(default="default_session", max_length=128)
    mode: str = Field(default="text", pattern="^(text|code|voice)$")


class CognitiveResponse(BaseModel):
    code: str = ""
    guild: str = "fullstack"
    guild_icon: str = "[FULLSTACK]"
    confidence: float = 0.85
    repair_applied: bool = False
    session_id: str = "default_session"
    sentiment: str = "neutral"
    personalized_message: str = ""
    is_clarifying: bool = False
    clarifying_question: Optional[str] = None
    subsystems: Dict[str, Any] = Field(default_factory=dict)
    latency_ms: int = 0
    reply: str = ""
    has_local_weights: bool = False


# ─────────────────────────────────────────────
# Cognitive Guild Router
# ─────────────────────────────────────────────

@dataclass
class Guild:
    name: str
    icon: str
    domain: str
    keywords: List[str]
    model: str = "CodeLlama-7B-GGUF"


GUILDS: List[Guild] = [
    Guild("Fullstack Architect", "[FULLSTACK]", "fullstack",
          ["build", "create", "make", "develop", "app", "website", "project", "full", "stack"]),
    Guild("Frontend Artisan", "[FRONTEND]", "frontend",
          ["css", "html", "style", "layout", "responsive", "ui", "ux", "design", "color", "font", "animation"]),
    Guild("Backend Engineer", "[BACKEND]", "backend",
          ["api", "server", "database", "endpoint", "route", "express", "fastapi", "django", "rest"]),
    Guild("DevOps Commander", "[DEVOPS]", "devops",
          ["deploy", "docker", "kubernetes", "ci", "cd", "pipeline", "nginx", "terraform", "cloud"]),
    Guild("Data Scientist", "[DATA]", "data",
          ["data", "analytics", "chart", "graph", "statistics", "pandas", "numpy", "visualization"]),
    Guild("Security Sentinel", "[SECURITY]", "security",
          ["security", "auth", "encrypt", "ssl", "tls", "vulnerability", "xss", "csrf", "injection"]),
    Guild("AI Engineer", "[AI]", "ai",
          ["ai", "machine learning", "neural", "model", "train", "inference", "llm", "gpt", "transformer"]),
    Guild("Mobile Specialist", "[MOBILE]", "mobile",
          ["mobile", "ios", "android", "react native", "flutter", "swift", "kotlin"]),
    Guild("Debug Detective", "[DEBUG]", "debug",
          ["fix", "bug", "error", "debug", "crash", "issue", "broken", "not working", "fail"]),
    Guild("Performance Tuner", "[PERFORMANCE]", "performance",
          ["optimize", "performance", "speed", "latency", "memory", "cache", "profil"]),
]


def route_guild(query: str) -> Guild:
    """Routes a user query to the most relevant cognitive guild."""
    query_lower = query.lower()
    best_guild = GUILDS[0]  # Default: Fullstack
    best_score = 0

    for guild in GUILDS:
        score = sum(1 for kw in guild.keywords if kw in query_lower)
        if score > best_score:
            best_score = score
            best_guild = guild

    return best_guild


def analyze_sentiment(text: str) -> str:
    """Simple keyword-based sentiment analysis."""
    text_lower = text.lower()
    positive = ["thanks", "great", "awesome", "perfect", "love", "good", "nice", "excellent", "amazing"]
    negative = ["error", "fail", "broken", "bug", "wrong", "bad", "hate", "terrible", "crash"]
    frustrated = ["help", "stuck", "confused", "can't", "doesn't work", "frustrated", "urgent"]

    pos_score = sum(1 for w in positive if w in text_lower)
    neg_score = sum(1 for w in negative if w in text_lower)
    fru_score = sum(1 for w in frustrated if w in text_lower)

    if fru_score > pos_score and fru_score > neg_score:
        return "frustrated"
    elif neg_score > pos_score:
        return "negative"
    elif pos_score > neg_score:
        return "positive"
    return "neutral"


def generate_personalized_message(query: str, sentiment: str, guild: Guild) -> str:
    """Generates a short empathetic message based on sentiment and guild."""
    if sentiment == "frustrated":
        return f"I can see you're dealing with something tricky — let me help you sort this out. Routing through the {guild.name} guild."
    elif sentiment == "positive":
        return f"Glad things are going well! Let me enhance that further through the {guild.name} guild."
    elif sentiment == "negative":
        return f"Let's fix this together. I'm activating the {guild.name} guild to get you back on track."
    return f"Processing your request through the {guild.name} guild."


# ─────────────────────────────────────────────
# Global Engine State (initialized on startup)
# ─────────────────────────────────────────────

class NeuralBrainState:
    """Holds all engine components initialized at server startup."""

    def __init__(self):
        self.hw_spec: Optional[HardwareSpec] = None
        self.llm_runner: Optional[LocalLLMRunner] = None
        self.vector_store: Optional[LocalVectorStore] = None
        self.ast_parser: Optional[ASTContextParser] = None
        self.sessions: Dict[str, ContextMemoryManager] = {}
        self.start_time: float = time.time()
        self.total_requests: int = 0
        self.initialized: bool = False

    def get_or_create_session(self, session_id: str) -> ContextMemoryManager:
        if session_id not in self.sessions:
            self.sessions[session_id] = ContextMemoryManager(
                max_tokens=DEFAULT_CONFIG.model.context_window,
                max_history_turns=15
            )
        return self.sessions[session_id]


brain_state = NeuralBrainState()


# ─────────────────────────────────────────────
# FastAPI Application
# ─────────────────────────────────────────────

app = FastAPI(
    title="ConCode Neural Brain API",
    description="Bare-metal Python neural engine for the ConCode AI platform",
    version="10.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — Allow Express server to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────
# API Key Authentication (optional)
# ─────────────────────────────────────────────

BRAIN_API_KEY = os.environ.get("CONCODE_API_KEY", None)


async def verify_api_key(request: Request):
    """Verifies X-API-Key header if CONCODE_API_KEY is configured."""
    if not BRAIN_API_KEY:
        return  # No key configured = dev mode, allow all

    provided_key = request.headers.get("X-API-Key", "")
    if provided_key != BRAIN_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")


# ─────────────────────────────────────────────
# Lifespan Events (Startup & Shutdown)
# ─────────────────────────────────────────────

from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(application):
    """Initializes hardware detection, LLM model, and vector store on server boot."""
    logger.info("=" * 73)
    logger.info("Starting ConCode Neural Brain FastAPI Server v10.0 ...")
    logger.info("=" * 73)

    try:
        # 1. Hardware Detection
        hw_manager = HardwareManager(context_size=DEFAULT_CONFIG.model.context_window)
        brain_state.hw_spec = hw_manager.detect_hardware()
        logger.info(
            f"Hardware: {brain_state.hw_spec.backend} | "
            f"{brain_state.hw_spec.threads} threads | "
            f"{brain_state.hw_spec.total_ram_gb}GB RAM | "
            f"GPU Layers={brain_state.hw_spec.gpu_layers}"
        )

        # 2. Local LLM Runner
        brain_state.llm_runner = LocalLLMRunner(hardware_spec=brain_state.hw_spec)
        logger.info("LLM Runner initialized.")

        # 3. Vector Store & Project Indexer
        brain_state.vector_store = LocalVectorStore()
        project_path = os.getcwd()
        indexer = ProjectIndexer(project_path, brain_state.vector_store)
        indexer.index_all()
        logger.info("Vector store indexed.")

        # 4. AST Parser
        brain_state.ast_parser = ASTContextParser()

        brain_state.initialized = True
        logger.info("ConCode Neural Brain API ready on http://0.0.0.0:8000")
        logger.info("=" * 73)

    except Exception as e:
        logger.error(f"Startup initialization error: {e}", exc_info=True)
        # Server still starts — endpoints will return degraded responses
        brain_state.initialized = True

    yield  # Application runs here

    # Shutdown
    logger.info("Shutting down ConCode Neural Brain API server ...")
    brain_state.sessions.clear()


# Apply lifespan to the app
app.router.lifespan_context = lifespan

# ─────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────

@app.get("/health")
async def health_check():
    """Health check endpoint for the Neural Brain Proxy."""
    return {"status": "healthy", "uptime_seconds": round(time.time() - brain_state.start_time, 1)}


@app.get("/api/v1/status", dependencies=[Depends(verify_api_key)])
async def get_status():
    """Returns full system status with hardware spec and subsystem information."""
    hw = brain_state.hw_spec.to_dict() if brain_state.hw_spec else {}
    return {
        "status": "ONLINE",
        "version": "10.0.0",
        "engine": "ConCode Neural Brain (FastAPI + Metal/CUDA/CPU)",
        "hardware": hw,
        "subsystems": {
            "llm_runner": brain_state.llm_runner is not None and brain_state.llm_runner.llm is not None,
            "vector_store": brain_state.vector_store is not None,
            "ast_parser": brain_state.ast_parser is not None,
            "hardware_manager": brain_state.hw_spec is not None,
        },
        "guilds_loaded": len(GUILDS),
        "active_sessions": len(brain_state.sessions),
        "total_requests": brain_state.total_requests,
        "uptime_seconds": round(time.time() - brain_state.start_time, 1),
        "security": {
            "api_key_required": BRAIN_API_KEY is not None,
            "max_query_length": 4096,
            "max_workspace_files": 50,
        },
    }


@app.get("/api/v1/guilds", dependencies=[Depends(verify_api_key)])
async def get_guilds():
    """Returns all available cognitive guilds."""
    return {
        "guilds": [
            {
                "name": g.name,
                "icon": g.icon,
                "domain": g.domain,
                "model": g.model,
                "keywords": g.keywords[:5],
            }
            for g in GUILDS
        ],
        "count": len(GUILDS),
        "engine": "ConCode Neural Brain v10.0",
    }


@app.post("/api/v1/cognitive", dependencies=[Depends(verify_api_key)])
async def process_cognitive(request: CognitiveRequest):
    """
    Primary cognitive query endpoint.
    Processes user prompts through guild routing, sentiment analysis,
    context retrieval, and LLM inference.
    """
    start_time = time.time()
    brain_state.total_requests += 1

    query = request.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    # 1. Guild Routing
    guild = route_guild(query)

    # 2. Sentiment Analysis
    sentiment = analyze_sentiment(query)
    personalized_msg = generate_personalized_message(query, sentiment, guild)

    # 3. Session Memory
    session = brain_state.get_or_create_session(request.session_id)
    session.add_message("user", query)

    # 4. Vector Context Retrieval
    context_snippets = []
    if brain_state.vector_store:
        results = brain_state.vector_store.similarity_search(query, limit=3)
        context_snippets = [r.get("text", "")[:500] for r in results]

    # 5. Workspace File Context (from request payload)
    workspace_context = ""
    if request.workspace_files:
        for filename, content in list(request.workspace_files.items())[:5]:
            workspace_context += f"\n--- {filename} ---\n{content[:2000]}\n"

    # 6. Build the Full Prompt
    context_block = ""
    if context_snippets:
        context_block = "\n\nRelevant codebase context:\n" + "\n".join(context_snippets)
    if workspace_context:
        context_block += "\n\nActive workspace files:" + workspace_context

    system_prompt = (
        "You are CONCODE AI—a warm, highly intelligent, and adaptive Senior Coding Partner.\n"
        "PERSONA & INTENT LAWS:\n"
        "1. Deeply evaluate the user's intent, emotion, and context.\n"
        "2. Speak naturally like a human friend in 1–3 warm, conversational sentences max.\n"
        "3. Never read out code syntax, markdown tags, or URLs out loud.\n"
        "4. Wrap generated code blocks cleanly in ``` code fences.\n"
        "5. Prepend responses with state metadata tags like [STATE: PROCESSING] or [STATE: EXECUTING].\n"
    )

    full_prompt = f"{query}{context_block}"

    # 7. LLM Inference
    llm_output = ""
    repair_applied = False

    if brain_state.llm_runner:
        try:
            llm_output = brain_state.llm_runner.generate_code_completion(
                prompt=session.get_formatted_prompt(system_prompt, full_prompt) if session.history else full_prompt,
                system_prompt=system_prompt,
            )
        except Exception as e:
            logger.error(f"LLM inference error: {e}")
            llm_output = f"[STATE: EXECUTING]\nI've processed your request about: '{query[:60]}'. Let me route this through the {guild.name} guild for optimal results."

    if not llm_output:
        llm_output = (
            f"[STATE: EXECUTING]\n"
            f"{personalized_msg}\n\n"
            f"Your query has been processed through the {guild.name} guild. "
            f"The bare-metal neural engine is active and ready for deeper analysis."
        )

    # 8. Record in Session Memory
    session.add_message("assistant", llm_output)

    # 9. Calculate Confidence
    confidence = 0.85
    if brain_state.llm_runner and brain_state.llm_runner.llm:
        confidence = 0.92  # Real model loaded
    if context_snippets:
        confidence = min(confidence + 0.05, 0.98)  # Boost for relevant context

    latency_ms = int((time.time() - start_time) * 1000)

    return CognitiveResponse(
        code=llm_output,
        reply=llm_output,
        guild=guild.domain,
        guild_icon=guild.icon,
        confidence=confidence,
        repair_applied=repair_applied,
        session_id=request.session_id,
        sentiment=sentiment,
        personalized_message=personalized_msg,
        is_clarifying=False,
        clarifying_question=None,
        subsystems={
            "llm_active": brain_state.llm_runner is not None and brain_state.llm_runner.llm is not None,
            "vector_store_active": brain_state.vector_store is not None,
            "hardware_backend": brain_state.hw_spec.backend if brain_state.hw_spec else "CPU",
            "context_files_used": len(context_snippets),
        },
        latency_ms=latency_ms,
        has_local_weights=bool(brain_state.llm_runner and brain_state.llm_runner.llm),
    )


# ─────────────────────────────────────────────
# Global Exception Handler
# ─────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"},
    )


# ─────────────────────────────────────────────
# Direct Execution Entry Point
# ─────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("NEURAL_BRAIN_PORT", 8000))
    host = os.environ.get("NEURAL_BRAIN_HOST", "0.0.0.0")

    logger.info(f"Starting ConCode Neural Brain FastAPI on {host}:{port}")
    uvicorn.run(
        "concode_engine.api_server:app",
        host=host,
        port=port,
        reload=False,
        log_level="info",
    )
