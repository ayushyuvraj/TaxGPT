# Multi-stage Dockerfile for TaxGPT India
# Stage 1: Builder
FROM python:3.11-slim as builder

WORKDIR /build

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Stage 2: Runtime
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install runtime dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy Python packages from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY src/ /app/src/
COPY data/ /app/data/
COPY .streamlit/ /app/.streamlit/
COPY requirements.txt /app/

# Create .env placeholder (required for config.py)
RUN echo "GEMINI_API_KEY=" > /app/.env

# Create Streamlit config directory
RUN mkdir -p ~/.streamlit

# Streamlit config for headless mode
RUN echo "[server]" > ~/.streamlit/config.toml && \
    echo "port = 8080" >> ~/.streamlit/config.toml && \
    echo "headless = true" >> ~/.streamlit/config.toml && \
    echo "enableXsrfProtection = false" >> ~/.streamlit/config.toml && \
    echo "[client]" >> ~/.streamlit/config.toml && \
    echo "toolbarMode = \"minimal\"" >> ~/.streamlit/config.toml

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080')" || exit 1

# Run Streamlit app
CMD ["streamlit", "run", "src/app.py", "--server.port=8080", "--server.address=0.0.0.0"]
