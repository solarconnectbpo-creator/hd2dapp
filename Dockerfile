FROM node:18-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache git python3 make g++

# Copy backend and frontend
COPY package.json package-lock.json ./
COPY backend ./backend

# Install dependencies
RUN npm install --legacy-peer-deps
RUN cd backend && npm install

# Build backend
RUN cd backend && npm run build 2>/dev/null || true

# Expose ports
EXPOSE 8787 8081

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8787', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start script
CMD ["bash", "-c", "cd backend && npm run dev & npm run dev"]
