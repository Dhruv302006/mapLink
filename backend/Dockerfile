# Use official Node.js Alpine image for minimal container footprint
FROM node:22-alpine

# Set working directory inside container
WORKDIR /app

# Copy package configurations
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy source files
COPY . .

# Expose Express server port
EXPOSE 3000

# Start application
CMD ["node", "app.js"]
