# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY services/notification/package.json services/notification/
COPY packages packages
RUN npm ci --workspace=@travelmanager/notification --include-workspace-root

FROM node:22-alpine AS build
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/packages packages
COPY package.json package-lock.json ./
COPY services/notification services/notification
WORKDIR /repo/services/notification
RUN npx nitro build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NITRO_PORT=8080 NITRO_HOST=0.0.0.0
COPY --from=build /repo/services/notification/.output ./
EXPOSE 8080
USER node
CMD ["node", "server/index.mjs"]
