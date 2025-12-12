# Use Node.js 18 LTS Alpine for smaller image size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy built application
COPY build/ ./build/

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S weather -u 1001

# Change ownership of app directory
RUN chown -R weather:nodejs /app

# Switch to non-root user
USER weather

# Expose port (though MCP servers typically use stdio, not HTTP)
# EXPOSE 3000

# Set environment variable for API key (will be overridden at runtime)
ENV OPENWEATHER_API_KEY=""

# Run the MCP server
CMD ["node", "build/index.js"]
