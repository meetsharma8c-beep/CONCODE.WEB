FROM node:20-alpine

# Set working directory inside the container
WORKDIR /app

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Copy package descriptors first to leverage Docker build caching
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy application source code
COPY . .

# Run as non-root user for security
USER node

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3000}/api/health || exit 1

# Expose server port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
