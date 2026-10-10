# Image for the runner service itself. It needs access to a Docker daemon
# (mount /var/run/docker.sock or set DOCKER_HOST) to start sandbox containers.
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine
RUN apk add --no-cache docker-cli
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
EXPOSE 4001
CMD ["node", "dist/server.js"]
