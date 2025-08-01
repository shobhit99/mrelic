#!/bin/bash

set -e

echo "🔧 MRelic Quick Start Setup"
echo "============================"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if fluent-bit is installed
if ! command -v fluent-bit > /dev/null 2>&1; then
    echo "📦 Fluent-bit not found. Installing via Homebrew..."
    
    # Check if brew is installed
    if ! command -v brew > /dev/null 2>&1; then
        echo "❌ Homebrew is not installed. Please install Homebrew first:"
        echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
        exit 1
    fi
    
    # Install fluent-bit
    brew install fluent-bit
    echo "✅ Fluent-bit installed successfully!"
else
    echo "✅ Fluent-bit is already installed"
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
docker run -d --name mrelic-server -p 5959:5959 -v ~/Documents:/data repo/mrelic

# Wait for server to start
echo "⏳ Waiting for server to start..."
sleep 5

# Setup the mrelic command using build-mrelic.sh
echo "🔧 Setting up mrelic command..."
./scripts/build-mrelic.sh

echo ""
echo "✅ MRelic is ready!"
echo ""
echo "🌐 Web interface: http://localhost:5959"
echo "📊 Database location: ~/Documents/mrelic.db"
echo ""
echo "💡 Usage example:"
echo "   cd your-service-directory"
echo "   mrelic go run main.go"
echo "   #or"
echo "   go run main.go | mrelic"
echo ""
echo "🛠️  Management commands:"
echo "   docker logs mrelic-server       # View server logs"
echo "   docker stop mrelic-server       # Stop server"
echo "   docker start mrelic-server      # Start server"
echo "   docker restart mrelic-server    # Restart server" 