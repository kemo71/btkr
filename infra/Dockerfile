# syntax=docker/dockerfile:1.7
#
# Btkr Valley — production image (multi-stage, Next.js 15 standalone output)
#
# Stages:
#   1. base   — Node 22-alpine + corepack (pnpm)
#   2. deps   — install with frozen lockfile
#   3. build  — Next.js production build (standalone)
#   4. runner — minimal runtime image, non-root user
#
# Rebuild only the stages whose inputs changed (BuildKit cache mounts).
# Total image size with `output: "standalone"`: ~150-200 MB.
#
# See docs/togaf/03-technology-architecture.md for the runtime topology.

# ---------- Stage 1: base ----------
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /app

# ---------- Stage 2: deps ----------
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ---------- Stage 3: build ----------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ---------- Stage 4: runner ----------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Non-root user (NCA ECC — least privilege)
RUN addgroup -S btkr && adduser -S btkr -G btkr

COPY --from=build --chown=btkr:btkr /app/public ./public
COPY --from=build --chown=btkr:btkr /app/.next/standalone ./
COPY --from=build --chown=btkr:btkr /app/.next/static ./.next/static

USER btkr
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --quiet --spider http://localhost:3000/manifest.webmanifest || exit 1

CMD ["node", "server.js"]
