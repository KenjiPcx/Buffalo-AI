#!/bin/bash
set -e

# Function to log messages
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

log "Starting Buffalo Docker container..."

# Set up display for headless browser operation
export DISPLAY=:99

# Start Xvfb (X Virtual Framebuffer) for headless operation
log "Starting Xvfb for headless browser operation..."
Xvfb :99 -screen 0 1920x1080x24 -ac +extension GLX +render -noreset &
XVFB_PID=$!

# Wait for Xvfb to start
sleep 2

# Start a window manager (optional, but can help with some browser operations)
log "Starting window manager..."
fluxbox -display :99 &
WM_PID=$!

# Function to cleanup on exit
cleanup() {
    log "Shutting down..."
    if [ ! -z "$WM_PID" ]; then
        kill $WM_PID 2>/dev/null || true
    fi
    if [ ! -z "$XVFB_PID" ]; then
        kill $XVFB_PID 2>/dev/null || true
    fi
}

# Set up signal handlers
trap cleanup EXIT INT TERM

# Verify Playwright browsers are installed
log "Verifying Playwright browser installation..."
if ! uv run python -c "from playwright.sync_api import sync_playwright; p = sync_playwright().start(); p.chromium.launch(); p.stop()" 2>/dev/null; then
    log "WARNING: Playwright browsers may not be properly installed"
else
    log "Playwright browsers verified successfully"
fi

# Set default environment variables if not provided
export PYTHONUNBUFFERED=${PYTHONUNBUFFERED:-1}
export PYTHONDONTWRITEBYTECODE=${PYTHONDONTWRITEBYTECODE:-1}

# Log environment info
log "Python version: $(uv run python --version)"
log "Working directory: $(pwd)"
log "Display: $DISPLAY"

# Check if we have required environment variables for Coral
if [ -z "$CORAL_SSE_URL" ]; then
    log "WARNING: CORAL_SSE_URL not set"
fi

if [ -z "$CORAL_AGENT_ID" ]; then
    log "WARNING: CORAL_AGENT_ID not set"
fi

log "Starting Buffalo application..."

# Execute the command passed to docker run
exec "$@"
