# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY services/trip/package.json services/trip/
COPY packages packages
RUN npm ci --workspace=@travelmanager/trip --include-workspace-root

FROM node:22-alpine AS build
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/packages packages
COPY package.json package-lock.json ./
COPY services/trip services/trip
WORKDIR /repo/services/trip
RUN npx nitro build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
ENV NITRO_PORT=8080
ENV NITRO_HOST=0.0.0.0
COPY --from=build /repo/services/trip/.output ./
EXPOSE 8080
USER node
CMD ["node", "server/index.mjs"]
