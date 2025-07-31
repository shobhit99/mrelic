#!/bin/sh

# Check if we're being called to run the log processor with a service name
if [ "$1" = "log-processor" ] && [ -n "$2" ]; then
    SERVICE_NAME="$2"
    
    echo "🔧 Starting fluent-bit compatible log processor for service: $SERVICE_NAME"
    echo "📡 Forwarding to: ${MRELIC_HOST:-localhost}:${MRELIC_PORT:-3000}"
    
    # Execute the Node.js log processor that behaves like fluent-bit
    exec node /usr/local/bin/log-processor.js "$SERVICE_NAME"
fi

# If any command is provided, execute it directly (for debugging or other uses)
if [ $# -gt 0 ] && [ "$1" != "-p" ] && [ "$1" != "--port" ] && [ "$1" != "--db" ]; then
    exec "$@"
fi

# Default values for server mode
PORT=${PORT:-3000}
DB_PATH=${DB_PATH:-~/Documents/mrelic.db}

# Parse command line arguments for server mode
while [[ $# -gt 0 ]]; do
  case $1 in
    -p|--port)
      PORT="$2"
      shift 2
      ;;
    --db)
      DB_PATH="$2"
      shift 2
      ;;
    *)
      echo "Unknown option $1"
      exit 1
      ;;
  esac
done

# Expand tilde in DB_PATH
DB_PATH=$(eval echo "$DB_PATH")

# Create database directory if it doesn't exist
mkdir -p "$(dirname "$DB_PATH")"

# Export environment variables
export PORT
export DB_PATH

echo "Starting mrelic server on port $PORT"
echo "Using database at $DB_PATH"

# Start the Next.js server
cd /app
exec node server.js 