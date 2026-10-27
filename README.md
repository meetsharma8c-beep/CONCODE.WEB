# CONCODE.WEB — Neural Brain Integrated Web Platform

> A multi-layered AI-powered web platform combining a Node.js/Express backend, a Python bare-metal neural engine, a rich 3D frontend, and an Obsidian cognitive knowledge graph.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  Frontend Layer (Browser)                                           │
│  index.html │ Three.js 3D │ Voice Agent │ Monaco Editor │ HUD      │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ POST /api/chat
┌──────────────────────────────▼──────────────────────────────────────┐
│  Express Backend (server.js :3000)                                  │
│  Auth │ Studio │ DevOps │ Gateway │ Brain Engine │ Emotional Graph  │
└──────────┬──────────────────────────────────────┬───────────────────┘
           │ HTTP :8000 (Primary)                 │ Cloud API (Fallback)
┌──────────▼──────────────┐          ┌────────────▼──────────────────┐
│  Python Neural Brain    │          │  AI Providers                 │
│  FastAPI │ CodeLlama-7B │          │  Gemini Pro │ Ollama Local    │
│  Metal GPU │ LanceDB    │          │  CONCODE Native Synthesizer   │
└─────────────────────────┘          └───────────────────────────────┘
```

## Features

### AI & Brain Engine
- **4-Tier AI Failover**: Python Neural Brain → JS Brain Engine → Google Gemini → Ollama Local
- **10 Cognitive Guilds**: Intelligent intent routing (Fullstack, Frontend, Backend, DevOps, AI, Security, etc.)
- **Self-Healing Code**: 6-check multi-pass verification pipeline
- **Emotional Computing**: Automated Obsidian graph sync with sentiment analysis
- **Voice Assistant**: Wake-word detection, STT (Whisper), TTS, and hands-free coding

### Web Platform
- **AI Website Studio**: Generate, refine, and deploy full websites via natural language
- **3D Cognitive Canvas**: Three.js WebGL scroll-triggered interactive scene
- **Admin Console**: RAG management, deployment logs, API key config
- **Analytics Dashboard**: Real-time telemetry, latency sparklines, model status
- **API Gateway**: Dynamic route registration, per-project analytics, rate limiting

### Authentication
- **Multi-Provider OAuth**: Google, GitHub, Apple (with mock fallback gateway)
- **Phone OTP**: SMS verification via Fast2SMS carrier gateway
- **Local Auth**: Email/password with bcrypt hashing + JWT sessions
- **Role-Based Access**: Admin and user roles with middleware protection

### DevOps & Deployment
- **Docker + Docker Compose**: One-command deployment with MongoDB
- **Multi-Target Deploy**: AWS, Vercel, Firebase Functions support
- **Data Migration Engine**: JSON/CSV/SQL import with field mapping

## Quick Start — Docker (Primary)

```bash
# 1. Clone and configure
cp .env.example .env
# Edit .env with your API keys

# 2. Start the stack
npm run docker:up

# 3. View logs
npm run docker:logs

# 4. Access
# Web UI:    http://localhost:3000
# Preview:   http://localhost:3001
# API Docs:  http://localhost:8000/docs (Python Neural Brain)
```

## Local Development

### Node.js Server
```bash
npm install
npm start
# Server runs on http://localhost:3000
```

### Python Neural Brain (optional)
```bash
cd concode_engine
pip install -r ../requirements.txt
python -m concode_engine.api_server
# FastAPI runs on http://localhost:8000
```

## Project Structure

```
CONCODE.WEB/
├── server.js                  # Express backend (port 3000)
├── concode_engine/            # Python neural brain
│   ├── api_server.py          # FastAPI HTTP server (port 8000)
│   ├── main.py                # Standalone desktop mode (PyQt6 HUD)
│   ├── config.py              # Engine configuration
│   ├── core/                  # Hardware, orchestrator, memory
│   ├── inference/             # LLM runner, STT, quantization
│   ├── audio/                 # Listener, VAD, TTS, wake word
│   ├── context/               # AST parser, vector store, file watcher
│   └── ui/                    # Floating HUD, system tray
├── utils/                     # Express utility modules
│   ├── concodeBrainEngine.js  # JS brain engine v12.0
│   ├── neuralBrainProxy.js    # Express → Python bridge
│   ├── gemini.js              # Google Gemini API client
│   ├── studio.js              # Website generation engine
│   └── ...                    # Auth, DevOps, gateway, etc.
├── public/                    # Frontend assets
│   ├── index.html             # Main cognitive cockpit
│   ├── src/                   # JS, CSS, voice subsystem
│   └── projects/              # Generated websites
├── data/                      # Local JSON database files
├── docker-compose.yml         # Docker stack (web + MongoDB)
├── Dockerfile                 # Container configuration
├── requirements.txt           # Python dependencies
└── *.md                       # Obsidian knowledge graph nodes
```

## Environment Variables

See [`.env.example`](.env.example) for the full list. Key variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes (for AI) | Google AI Studio API key |
| `JWT_SECRET` | Yes | Min 32 chars, session signing key |
| `NEURAL_BRAIN_URL` | No | Python engine URL (default: `http://localhost:8000`) |
| `MONGO_URI` | No | MongoDB connection string |
| `USE_FIRESTORE` | No | Enable Cloud Firestore (`true`/`false`) |

## License

[MIT](LICENSE) © 2026 ConCode Agency / Meet Sharma
