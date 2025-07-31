#!/bin/bash

set -e

echo "Setting up mrelic command on host system..."

# Create the mrelic wrapper script
sudo tee /usr/local/bin/mrelic > /dev/null << 'EOF'
#!/bin/sh

# Get current directory name as service name
SERVICE_NAME=$(basename "$(pwd)")

# Define fluent-bit config directory (adjust path as needed)
FLUENT_CONFIG_DIR="$HOME/fluent-bit"

# Create config directory if it doesn't exist
mkdir -p "$FLUENT_CONFIG_DIR"

# Generate dynamic fluent-bit config for this service
TEMP_CONFIG="$FLUENT_CONFIG_DIR/$SERVICE_NAME.conf"

# Create the fluent-bit config template if it doesn't exist
if [ ! -f "$FLUENT_CONFIG_DIR/template.conf" ]; then
    cat > "$FLUENT_CONFIG_DIR/template.conf" << 'TEMPLATE_EOF'
[SERVICE]
    Flush        1
    Daemon       Off
    Log_Level    info

[INPUT]
    Name         stdin
    Tag          console.log
    Parser       json

[OUTPUT]
    Name         stdout
    Match        *
    Format       json_lines

[OUTPUT]
    Name         http
    Match        *
    Host         localhost
    Port         5959
    URI          /api/otel
    Format       json
    Header       Content-Type application/json
    Header       service.name SERVICE_NAME_PLACEHOLDER
    Tls          off
    Tls.Verify   off
    log_response_payload true
TEMPLATE_EOF
fi

# Generate service-specific config
sed "s/SERVICE_NAME_PLACEHOLDER/$SERVICE_NAME/g" "$FLUENT_CONFIG_DIR/template.conf" > "$TEMP_CONFIG"

echo "📡 Connecting to mrelic server on port 5959"
echo "🏷️  Service: $SERVICE_NAME"
echo "📝 Using config: $TEMP_CONFIG"

# Check if we have arguments (command to run) or should read from stdin
if [ $# -gt 0 ]; then
    echo "🚀 Running: $*"
    # Run the command and pipe directly to fluent-bit with generated config
    eval "$* 2>&1" | fluent-bit -vv -c "$TEMP_CONFIG"
else
    # Read from stdin (original behavior)
    fluent-bit -vv -c "$TEMP_CONFIG"
fi
EOF

sudo chmod +x /usr/local/bin/mrelic

echo ""
echo "✅ Build complete!"
echo ""
echo "🚀 To get started:"
echo "1. Start the mrelic server:"
echo "   npm start"
echo ""
echo "2. Use mrelic in any project directory:"
echo "   cd your-service-directory"
echo "   go run main.go | mrelic"
echo "   # or"
echo "   mrelic go run main.go"
echo ""
echo "3. View logs at: http://localhost:5959"
echo ""
echo "📝 Note: This requires fluent-bit to be installed on your system" 