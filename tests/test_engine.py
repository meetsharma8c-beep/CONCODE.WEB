"""
CONCODE Neural Brain — Python Engine Tests
============================================
Tests for the FastAPI server endpoints, guild routing, sentiment analysis,
hardware detection, and engine components.

Run: pytest tests/ -v
"""

import sys
import os

# Add project root to path so concode_engine is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest


# ─────────────────────────────────────────────
# Guild Routing Tests
# ─────────────────────────────────────────────

class TestGuildRouting:
    """Tests the cognitive guild intent routing logic."""

    def test_frontend_guild_routing(self):
        from concode_engine.api_server import route_guild
        guild = route_guild("fix the CSS layout and add responsive design")
        assert guild.domain == "frontend"

    def test_backend_guild_routing(self):
        from concode_engine.api_server import route_guild
        guild = route_guild("create a REST API endpoint with express")
        assert guild.domain == "backend"

    def test_devops_guild_routing(self):
        from concode_engine.api_server import route_guild
        guild = route_guild("deploy this to docker and set up kubernetes")
        assert guild.domain == "devops"

    def test_debug_guild_routing(self):
        from concode_engine.api_server import route_guild
        guild = route_guild("fix this bug, the code is broken and not working")
        assert guild.domain == "debug"

    def test_ai_guild_routing(self):
        from concode_engine.api_server import route_guild
        guild = route_guild("train a neural network machine learning model")
        assert guild.domain == "ai"

    def test_security_guild_routing(self):
        from concode_engine.api_server import route_guild
        guild = route_guild("add authentication and encrypt the data with SSL")
        assert guild.domain == "security"

    def test_fallback_to_fullstack(self):
        from concode_engine.api_server import route_guild
        guild = route_guild("hello how are you doing today")
        assert guild.domain == "fullstack"  # Default fallback


# ─────────────────────────────────────────────
# Sentiment Analysis Tests
# ─────────────────────────────────────────────

class TestSentimentAnalysis:
    """Tests the keyword-based sentiment analyzer."""

    def test_positive_sentiment(self):
        from concode_engine.api_server import analyze_sentiment
        assert analyze_sentiment("thanks this is great and awesome!") == "positive"

    def test_negative_sentiment(self):
        from concode_engine.api_server import analyze_sentiment
        assert analyze_sentiment("this is broken and has a terrible error") == "negative"

    def test_frustrated_sentiment(self):
        from concode_engine.api_server import analyze_sentiment
        assert analyze_sentiment("I'm stuck and confused, can't get this to work, help") == "frustrated"

    def test_neutral_sentiment(self):
        from concode_engine.api_server import analyze_sentiment
        assert analyze_sentiment("create a function that adds two numbers") == "neutral"


# ─────────────────────────────────────────────
# Hardware Manager Tests
# ─────────────────────────────────────────────

class TestHardwareManager:
    """Tests hardware auto-detection."""

    def test_hardware_detection_returns_spec(self):
        from concode_engine.core import HardwareManager
        hw = HardwareManager(context_size=4096)
        spec = hw.detect_hardware()
        assert spec is not None
        assert spec.backend in ("METAL", "CUDA", "VULKAN", "CPU")
        assert spec.threads > 0
        assert spec.total_ram_gb > 0
        assert spec.context_size == 4096

    def test_hardware_spec_to_dict(self):
        from concode_engine.core import HardwareManager
        hw = HardwareManager()
        spec = hw.detect_hardware()
        d = spec.to_dict()
        assert isinstance(d, dict)
        assert "backend" in d
        assert "threads" in d
        assert "gpu_layers" in d


# ─────────────────────────────────────────────
# Context Memory Manager Tests
# ─────────────────────────────────────────────

class TestContextMemory:
    """Tests the conversation context memory manager."""

    def test_add_and_retrieve_messages(self):
        from concode_engine.core import ContextMemoryManager
        mem = ContextMemoryManager(max_tokens=4096, max_history_turns=5)
        mem.add_message("user", "hello")
        mem.add_message("assistant", "hi there")
        assert len(mem.history) == 2

    def test_history_pruning(self):
        from concode_engine.core import ContextMemoryManager
        mem = ContextMemoryManager(max_tokens=4096, max_history_turns=3)
        for i in range(20):
            mem.add_message("user", f"message {i}")
        # Should be pruned to max_history_turns * 2 = 6
        assert len(mem.history) <= 6

    def test_formatted_prompt_generation(self):
        from concode_engine.core import ContextMemoryManager
        mem = ContextMemoryManager()
        mem.add_message("user", "write a function")
        prompt = mem.get_formatted_prompt("You are an AI.", "new question")
        assert "<system>" in prompt
        assert "You are an AI." in prompt
        assert "new question" in prompt

    def test_clear_memory(self):
        from concode_engine.core import ContextMemoryManager
        mem = ContextMemoryManager()
        mem.add_message("user", "test")
        mem.clear()
        assert len(mem.history) == 0


# ─────────────────────────────────────────────
# AST Parser Tests
# ─────────────────────────────────────────────

class TestASTParser:
    """Tests the AST context parser for Python and JavaScript files."""

    def test_parse_python_file(self):
        from concode_engine.context import ASTContextParser
        parser = ASTContextParser()
        # Parse this test file itself
        scopes = parser.parse_python_file(__file__)
        assert len(scopes) > 0
        # Should find class definitions
        class_names = [s.name for s in scopes if s.kind == "class"]
        assert "TestASTParser" in class_names

    def test_parse_nonexistent_file(self):
        from concode_engine.context import ASTContextParser
        parser = ASTContextParser()
        scopes = parser.parse_python_file("/nonexistent/file.py")
        assert scopes == []


# ─────────────────────────────────────────────
# Vector Store Tests
# ─────────────────────────────────────────────

class TestVectorStore:
    """Tests the local vector store for document indexing and search."""

    def test_add_and_search_document(self):
        from concode_engine.context import LocalVectorStore
        store = LocalVectorStore(db_dir="/tmp/concode_test_vectors")
        store.add_document("test.js", "function hello() { return 'world'; }")
        results = store.similarity_search("hello function", limit=3)
        assert len(results) > 0
        assert results[0]["id"] == "test.js"

    def test_empty_search(self):
        from concode_engine.context import LocalVectorStore
        store = LocalVectorStore(db_dir="/tmp/concode_test_vectors2")
        results = store.similarity_search("", limit=3)
        assert results == []

    def test_no_match_search(self):
        from concode_engine.context import LocalVectorStore
        store = LocalVectorStore(db_dir="/tmp/concode_test_vectors3")
        store.add_document("app.py", "import flask")
        results = store.similarity_search("kubernetes deployment", limit=3)
        assert results == []


# ─────────────────────────────────────────────
# Quantization Helpers Tests
# ─────────────────────────────────────────────

class TestQuantization:
    """Tests quantization helper functions."""

    def test_thread_allocation(self):
        from concode_engine.inference import optimize_thread_allocation
        assert optimize_thread_allocation(8) == 6
        assert optimize_thread_allocation(4) == 3
        assert optimize_thread_allocation(1) == 1

    def test_kv_cache_type(self):
        from concode_engine.inference import get_kv_cache_type
        assert get_kv_cache_type("METAL") == "q4_0"
        assert get_kv_cache_type("CUDA") == "q4_0"
        assert get_kv_cache_type("CPU") == "f16"


# ─────────────────────────────────────────────
# FastAPI Endpoint Tests (if httpx is available)
# ─────────────────────────────────────────────

try:
    from httpx import AsyncClient, ASGITransport

    @pytest.mark.asyncio
    class TestFastAPIEndpoints:
        """Tests the FastAPI server endpoints directly."""

        async def test_health_endpoint(self):
            from concode_engine.api_server import app
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.get("/health")
                assert response.status_code == 200
                data = response.json()
                assert data["status"] == "healthy"

        async def test_guilds_endpoint(self):
            from concode_engine.api_server import app
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.get("/api/v1/guilds")
                assert response.status_code == 200
                data = response.json()
                assert "guilds" in data
                assert data["count"] == 10

        async def test_status_endpoint(self):
            from concode_engine.api_server import app
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.get("/api/v1/status")
                assert response.status_code == 200
                data = response.json()
                assert data["status"] == "ONLINE"
                assert data["version"] == "10.0.0"

        async def test_cognitive_endpoint_empty_query(self):
            from concode_engine.api_server import app
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.post("/api/v1/cognitive", json={"query": ""})
                assert response.status_code == 400

        async def test_cognitive_endpoint_valid_query(self):
            from concode_engine.api_server import app
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.post("/api/v1/cognitive", json={
                    "query": "Create a hello world function",
                    "session_id": "test_session",
                    "mode": "text"
                })
                assert response.status_code == 200
                data = response.json()
                assert "guild" in data
                assert "confidence" in data

except ImportError:
    pass  # httpx not installed, skip FastAPI endpoint tests
