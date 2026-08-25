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

# Expose server port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
