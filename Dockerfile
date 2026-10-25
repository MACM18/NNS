# Base image
FROM node:24-alpine AS builder

WORKDIR /app

# Install build tools if needed
RUN apk add --no-cache libc6-compat

# Use npm as the sole package manager and install the exact lockfile versions.
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies)
RUN npm ci

# Copy all source files
COPY . .

# Generate Prisma Client
RUN DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy npx prisma generate

# Build Next.js app
RUN DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy npm run build

# Runner image
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy all files from builder stage
COPY --from=builder /app ./

# Expose Next.js port
EXPOSE 3000

# Apply reviewed migrations at startup, then start the server.
# Do not use db push in production: it bypasses migration history and may
# require accepting destructive schema changes.
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
