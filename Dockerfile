# syntax=docker/dockerfile:1

FROM node:20.19.5-trixie-slim AS base
ENV NODE_ENV=production
WORKDIR /app

# Install ffmpeg and deps
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
    ffmpeg \
    ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Only copy package files for clean install
COPY package*.json ./

FROM base AS deps
RUN npm ci --omit=dev

FROM base AS release
# Copy node_modules from deps stage
COPY --from=deps /app/node_modules /app/node_modules
# Copy source
COPY . .

# Expose port
EXPOSE 3000

# Default envs (can be overridden)
ENV HOST=0.0.0.0
ENV PORT=3000

# Healthcheck hitting /ping
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD node -e "fetch('http://localhost:3000/ping').then(r=>{if(r.ok)process.exit(0);process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "index.js"]
