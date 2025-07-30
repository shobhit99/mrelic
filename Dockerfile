FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Build the application
RUN npm run build

# Create logs directory
RUN mkdir -p /app/logs

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "dev"] 