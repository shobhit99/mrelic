#!/bin/sh

# Check if we're being called to run the mrelic command
if [ "$1" = "/usr/local/bin/mrelic" ]; then
    # Pass all arguments after the first one to the mrelic script
    shift
    exec /usr/local/bin/mrelic "$@"
fi

# If any command is provided, execute it directly
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