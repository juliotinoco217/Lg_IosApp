# Use Node 20 for Vite 7 compatibility
FROM node:20-alpine AS builder

WORKDIR /app

# Cache buster - change this to force rebuild
ARG CACHEBUST=1

# Copy package files
COPY package*.json ./

# Fresh install (no cache)
RUN npm ci

# Copy source - invalidate cache on every deploy
COPY . .

# Build with environment variables
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_URL

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install serve
RUN npm install -g serve

# Copy built files
COPY --from=builder /app/dist ./dist

EXPOSE 8080

CMD ["serve", "-s", "dist", "-l", "8080"]
