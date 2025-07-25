# Bun Dockerfile for better Sevalla compatibility
FROM oven/bun:1.2-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    dumb-init \
    python3 \
    make \
    g++ \
    && ln -sf python3 /usr/bin/python

# Create app user
RUN addgroup -g 1001 -S bunuser && \
    adduser -S bunuser -u 1001

# Copy package files
COPY package*.json bun.lock ./

# Install dependencies with fallback strategy
RUN bun install --frozen-lockfile --production || bun install --production
RUN bun pm cache rm

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p uploads logs && \
    chown -R bunuser:bunuser /app

# Switch to non-root user
USER bunuser

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["dumb-init", "bun", "src/server.js"]