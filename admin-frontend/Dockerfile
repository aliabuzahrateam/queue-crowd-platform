# Use official Node.js image
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install
COPY . .

# Build for production (for frontend: npm run build, for backend: tsc)
RUN if [ -f vite.config.ts ] || [ -f vite.config.js ]; then npm run build; else npm run build || true; fi

# --- Production image ---
FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app .

# For frontend: serve static, for backend: run server
CMD [ "sh", "-c", "if [ -f dist/server.js ]; then node dist/server.js; else npx serve -s dist; fi" ] 