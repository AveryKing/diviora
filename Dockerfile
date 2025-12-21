# Dockerfile

### STAGE 1: Build ###
FROM node:20-alpine AS builder
WORKDIR /usr/src/app
COPY backend/package*.json ./
RUN npm install
COPY backend .
RUN npm run build
RUN npm prune --production

### STAGE 2: Production ###
FROM node:20-alpine
WORKDIR /usr/src/app
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main"]
