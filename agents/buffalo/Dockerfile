# Use Ubuntu 22.04 as base image
FROM ubuntu:22.04

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV UV_CACHE_DIR=/tmp/uv-cache

# Install system dependencies
RUN apt-get update && apt-get install -y \
    # Basic system tools
    curl \
    wget \
    git \
    ca-certificates \
    gnupg \
    lsb-release \
    # Python build dependencies
    build-essential \
    python3-dev \
    python3-pip \
    # Browser dependencies for Playwright
    libnss3 \
    libnspr4 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxkbcommon0 \
    libgtk-3-0 \
    libgbm1 \
    libasound2 \
    libxrandr2 \
    libxss1 \
    libgconf-2-4 \
    libxtst6 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxi6 \
    libxrender1 \
    libcairo-gobject2 \
    libdbus-1-3 \
    libgtk-3-0 \
    libgdk-pixbuf2.0-0 \
    # Additional dependencies for headless browser operation
    xvfb \
    x11vnc \
    fluxbox \
    wmctrl \
    # Font packages for better text rendering
    fonts-liberation \
    fonts-noto-color-emoji \
    fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/*

# Install uv package manager
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.cargo/bin:$PATH"

# Create app directory
WORKDIR /app

# Copy project files
COPY pyproject.toml uv.lock ./
COPY . .

# Install Python dependencies using uv
RUN uv sync --frozen

# Install Playwright browsers
RUN uv run playwright install chromium
RUN uv run playwright install-deps chromium

# Create a non-root user for security
RUN useradd -m -u 1000 buffalo && \
    chown -R buffalo:buffalo /app
USER buffalo

# Create entrypoint script
COPY --chown=buffalo:buffalo docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Expose any ports if needed (adjust as necessary)
EXPOSE 8000

# Set the entrypoint
ENTRYPOINT ["/app/docker-entrypoint.sh"]

# Default command
CMD ["uv", "run", "main.py"]
