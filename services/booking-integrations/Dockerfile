# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY services/booking-integrations/package.json services/booking-integrations/
COPY packages packages
RUN npm ci --workspace=@travelmanager/booking-integrations --include-workspace-root

FROM node:22-alpine AS build
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/packages packages
COPY package.json package-lock.json ./
COPY services/booking-integrations services/booking-integrations
WORKDIR /repo/services/booking-integrations
RUN npx nitro build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NITRO_PORT=8080 NITRO_HOST=0.0.0.0
COPY --from=build /repo/services/booking-integrations/.output ./
EXPOSE 8080
USER node
CMD ["node", "server/index.mjs"]
