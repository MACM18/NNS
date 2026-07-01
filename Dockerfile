# Base image
FROM node:22.12-alpine AS builder

WORKDIR /app

# Install build tools if needed
RUN apk add --no-cache libc6-compat

# Copy lock files and package.json
COPY package.json pnpm-lock.yaml* package-lock.json* ./

# Install all dependencies (including devDependencies)
RUN \
  if [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  else npm install; \
  fi

# Copy all source files
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js app
RUN \
  if [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm run build; \
  else npm run build; \
  fi

# Runner image
FROM node:22.12-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy all files from builder stage
COPY --from=builder /app ./

# Expose Next.js port
EXPOSE 3000

# Run prisma db push to sync schema at startup, then start the server
CMD ["sh", "-c", "npx prisma db push && npm run start"]
