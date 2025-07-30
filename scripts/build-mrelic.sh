#!/bin/bash

set -e

echo "Building mrelic Docker image..."
docker build -f Dockerfile.mrelic -t repo/mrelic .

echo "Setting up mrelic command on host system..."

# Create the mrelic wrapper script
sudo tee /usr/local/bin/mrelic > /dev/null << 'EOF'
#!/bin/sh

# Check if the mrelic server container is running
CONTAINER_ID=$(docker ps -q -f name=mrelic-server)

if [ -z "$CONTAINER_ID" ]; then
    echo "Error: mrelic server container is not running!"
    echo "Start it with: docker run -d --name mrelic-server -p 3000:3000 -v ~/Documents:/data repo/mrelic"
    exit 1
fi

# Get the server port from the running container
SERVER_PORT=$(docker port mrelic-server 3000/tcp | cut -d: -f2)
SERVER_PORT=${SERVER_PORT:-3000}

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
echo "✅ Build complete!"
echo ""
echo "🚀 To get started:"
echo "1. Start the mrelic server:"
echo "   docker run -d --name mrelic-server -p 3000:3000 -v ~/Documents:/data repo/mrelic"
echo ""
echo "2. Use mrelic in any project directory:"
echo "   cd your-service-directory"
echo "   go run main.go | mrelic"
echo ""
echo "3. View logs at: http://localhost:3000"
echo ""
echo "📝 To customize port or database location:"
echo "   docker run -d --name mrelic-server -p 8080:8080 -v ~/Documents:/data repo/mrelic --port 8080 --db /data/custom.db" 