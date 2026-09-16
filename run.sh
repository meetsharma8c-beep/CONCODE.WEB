#!/usr/bin/env bash

# Set colors
CYAN='\033[1;36m'
GREEN='\033[1;32m'
YELLOW='\033[1;33m'
RED='\033[1;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

clear
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║           CONCODE 3D — macOS Server Launcher               ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"

# Find Node.js in NVM
NODE_BIN=""
NVM_DIR="$HOME/.nvm"
if [ -d "$NVM_DIR" ]; then
  LATEST_NVM_NODE=$(find "$NVM_DIR/versions/node" -maxdepth 4 -name "node" -type f 2>/dev/null | sort -V | tail -n 1)
  if [ -x "$LATEST_NVM_NODE" ]; then
    NODE_BIN="$LATEST_NVM_NODE"
  fi
fi

if [ -z "$NODE_BIN" ] && command -v node >/dev/null 2>&1; then
  NODE_BIN="$(command -v node)"
fi

if [ -z "$NODE_BIN" ]; then
  echo -e "${RED}[ERROR] Node.js not detected under NVM version paths or system PATH.${NC}"
  exit 1
fi

# Export Node directory to PATH so npm sub-processes can resolve 'node'
export PATH="$(dirname "$NODE_BIN"):$PATH"

echo -e "${GREEN}[OK] Node.js loaded: ${NODE_BIN}${NC}"

# Install packages
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}Installing npm packages...${NC}"
  npm install
fi


# Clean up any stale instances on ports 3000 and 3001 to prevent EADDRINUSE crash
if lsof -ti :3000 >/dev/null 2>&1; then
  echo -e "${YELLOW}[PORT 3000] Clearing previous process to prevent collision...${NC}"
  lsof -ti :3000 | xargs kill -9 2>/dev/null || true
  sleep 0.5
fi
if lsof -ti :3001 >/dev/null 2>&1; then
  lsof -ti :3001 | xargs kill -9 2>/dev/null || true
fi
if lsof -ti :8000 >/dev/null 2>&1; then
  echo -e "${YELLOW}[PORT 8000] Clearing previous neural brain process...${NC}"
  lsof -ti :8000 | xargs kill -9 2>/dev/null || true
  sleep 0.5
fi

# Detect Python environment for Neural Brain
PYTHON_BIN=""
if [ -f ".venv/bin/python" ]; then
  PYTHON_BIN=".venv/bin/python"
elif command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="$(command -v python3)"
fi

PYTHON_PID=""
if [ -n "$PYTHON_BIN" ] && [ -d "concode_engine" ]; then
  echo -e "${CYAN}Starting Python Neural Brain API on port 8000...${NC}"
  "$PYTHON_BIN" -m concode_engine.api_server >/dev/null 2>&1 &
  PYTHON_PID=$!
fi

# Run Express App
echo -e "${CYAN}Starting backend server...${NC}"
"$NODE_BIN" server.js &
SERVER_PID=$!

cleanup() {
  echo -e "\n${YELLOW}[SHUTDOWN] Shutting down servers (Node PID: $SERVER_PID, Python PID: $PYTHON_PID)...${NC}"
  [ -n "$PYTHON_PID" ] && kill "$PYTHON_PID" 2>/dev/null
  kill "$SERVER_PID" 2>/dev/null
  wait "$SERVER_PID" 2>/dev/null
  exit 0
}
trap cleanup SIGINT SIGTERM

# Probe Server Readiness
PORT=3000
HEALTH_URL="http://localhost:$PORT/api/health"
URL="http://localhost:$PORT"

if [ -z "$NO_BROWSER" ]; then
  echo -e "${CYAN}Waiting for server to mount...${NC}"
  READY=0
  for i in {1..30}; do
    if curl -s -f "$HEALTH_URL" >/dev/null 2>&1; then
      READY=1
      break
    fi
    sleep 0.3
  done

  if [ $READY -eq 1 ]; then
    echo -e "${GREEN}[READY] Ecosystem ready. Launching viewport to: $URL${NC}"
    open "$URL"
  else
    echo -e "${RED}[ERROR] Server mount timeout. Check logs.${NC}"
  fi
fi

wait "$SERVER_PID"
