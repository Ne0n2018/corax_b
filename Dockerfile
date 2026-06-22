# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm i

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Run
FROM node:20-alpine
WORKDIR /app

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Expose the port the app runs on
EXPOSE 4000

# Start the application
CMD ["node", "dist/main"]