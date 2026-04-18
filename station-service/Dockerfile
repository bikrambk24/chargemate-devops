# Use official Node.js image
FROM node:18-alpine

# Set working directory inside container
WORKDIR /app

# Copy package files first (for caching)
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy all source code
COPY . .

# Expose the port this service runs on
EXPOSE 3001

# Start the app
CMD ["node", "server.js"]