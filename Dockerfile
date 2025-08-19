# Bun Dockerfile optimized for TypeScript
FROM oven/bun:1.2-alpine

# Set working directory
WORKDIR /app

# Install system dependencies for native modules
RUN apk add --no-cache \
    dumb-init \
    python3 \
    make \
    g++ \
    && ln -sf python3 /usr/bin/python

# Create app user for security
RUN addgroup -g 1001 -S bunuser && \
    adduser -S bunuser -u 1001

# Copy package files first for better caching
COPY package*.json bun.lock* tsconfig.json ./

# Install all dependencies (including devDependencies for TypeScript)
# Use bun's built-in caching and prefer frozen lockfile for reproducible builds
RUN bun install --frozen-lockfile --prefer-offline || bun install --prefer-offline

# Keep bun cache for faster rebuilds but clean up unnecessary files
RUN bun pm cache clean

# Copy application source code and configuration
COPY src/ ./src/
COPY tests/ ./tests/
COPY scripts/ ./scripts/
# knexfile.ts is now in src/ directory
COPY start-production.sh ./
RUN chmod +x start-production.sh scripts/migrate.ts

# Create necessary directories and set permissions
RUN mkdir -p uploads logs && \
    chown -R bunuser:bunuser /app

# Switch to non-root user
USER bunuser

# Expose port
EXPOSE 3001

# Health check using TypeScript entry point
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD bun -e "import('http').then(http => { http.get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }) })" || exit 1

# Start the application with production script
CMD ["dumb-init", "./start-production.sh"]