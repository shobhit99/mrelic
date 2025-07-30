#!/bin/bash

set -e

echo "🔧 MRelic Quick Start Setup"
echo "============================"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Build the image
echo "📦 Building mrelic Docker image..."
docker build -f Dockerfile.mrelic -t repo/mrelic .

# Stop and remove existing container if it exists
echo "🧹 Cleaning up existing containers..."
docker stop mrelic-server 2>/dev/null || true
docker rm mrelic-server 2>/dev/null || true

# Start the server
echo "🚀 Starting mrelic server..."
docker run -d --name mrelic-server -p 3000:3000 -v ~/Documents:/data repo/mrelic

# Wait for server to start
echo "⏳ Waiting for server to start..."
sleep 5

# Setup the mrelic command
echo "🔧 Setting up mrelic command..."
sudo tee /usr/local/bin/mrelic > /dev/null << 'EOF'
#!/bin/sh

# Check if the mrelic server container is running
CONTAINER_ID=$(docker ps -q -f name=mrelic-server)

if [ -z "$CONTAINER_ID" ]; then
    echo "❌ Error: mrelic server container is not running!"
    echo "Start it with: docker run -d --name mrelic-server -p 3000:3000 -v ~/Documents:/data repo/mrelic"
    exit 1
fi

# Get the server port from the running container
SERVER_PORT=$(docker port mrelic-server 3000/tcp | cut -d: -f2 2>/dev/null)
SERVER_PORT=${SERVER_PORT:-3000}

echo "📡 Connecting to mrelic server on port $SERVER_PORT"
echo "🏷️  Service: $(basename "$(pwd)")"

# Run fluent-bit in a temporary container that connects to the server
docker run --rm -i --network host \
  -e MRELIC_HOST=localhost \
  -e MRELIC_PORT=$SERVER_PORT \
  -v "$(pwd):/workdir" \
  -w /workdir \
  repo/mrelic /usr/local/bin/mrelic
EOF

sudo chmod +x /usr/local/bin/mrelic

echo ""
echo "✅ MRelic is ready!"
echo ""
echo "🌐 Web interface: http://localhost:3000"
echo "📊 Database location: ~/Documents/mrelic.db"
echo ""
echo "💡 Usage example:"
echo "   cd your-service-directory"
echo "   go run main.go | mrelic"
echo ""
echo "🛠️  Management commands:"
echo "   docker logs mrelic-server       # View server logs"
echo "   docker stop mrelic-server       # Stop server"
echo "   docker start mrelic-server      # Start server"
echo "   docker restart mrelic-server    # Restart server" 