# Dockerfile

### STAGE 1: Build ###
# Create a build environment based on Node.js 20
FROM node:20-alpine AS builder

# Set the working directory
WORKDIR /usr/src/app

# Copy package files and install all dependencies (including dev)
COPY package*.json ./
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build the application
RUN npm run build

# Prune dev dependencies for a clean production install
RUN npm prune --production

### STAGE 2: Production ###
# Create a final, lightweight production image
FROM node:20-alpine

# Set the working directory
WORKDIR /usr/src/app

# Copy the pruned node_modules from the 'builder' stage
COPY --from=builder /usr/src/app/node_modules ./node_modules

# Copy the built application from the 'builder' stage
COPY --from=builder /usr/src/app/dist ./dist

# Expose the application port
EXPOSE 3000

# Command to run the application
CMD ["node", "dist/main"]