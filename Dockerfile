FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build Nuxt for production (Nitro output)
RUN npm run build

# Cloud Run uses port 8080
ENV NODE_ENV=production
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=8080

EXPOSE 8080

# Start production server
CMD ["node", ".output/server/index.mjs"]
