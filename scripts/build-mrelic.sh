#!/bin/bash

set -e

echo "Setting up mrelic command on host system..."

# Create the mrelic wrapper script
# Get the current project directory
PROJECT_PATH="$(pwd)"

sudo tee /usr/local/bin/mrelic > /dev/null << EOF
#!/bin/sh

# Get current directory name as service name
SERVICE_NAME=\$(basename "\$(pwd)")

# Define fluent-bit config directory (adjust path as needed)
FLUENT_CONFIG_DIR="\$HOME/fluent-bit"

# Create config directory if it doesn't exist
mkdir -p "\$FLUENT_CONFIG_DIR"

# Generate dynamic fluent-bit config for this service
TEMP_CONFIG="\$FLUENT_CONFIG_DIR/\$SERVICE_NAME.conf"

# Copy fluent-bit configuration files if they don't exist
# Use the embedded project path since this script is installed in /usr/local/bin
FLUENT_SOURCE_DIR="$PROJECT_PATH/fluent"

# Copy template.conf if it doesn't exist
if [ ! -f "\$FLUENT_CONFIG_DIR/template.conf" ]; then
    if [ -f "\$FLUENT_SOURCE_DIR/template.conf" ]; then
        cp "\$FLUENT_SOURCE_DIR/template.conf" "\$FLUENT_CONFIG_DIR/template.conf"
        echo "📋 Copied template.conf from project"
    else
        # Fallback to inline template if source file doesn't exist
        cat > "\$FLUENT_CONFIG_DIR/template.conf" << 'TEMPLATE_EOF'
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
        echo "📋 Created default template.conf"
    fi
fi

# Copy parsers.conf if it doesn't exist
if [ ! -f "\$FLUENT_CONFIG_DIR/parsers.conf" ] && [ -f "\$FLUENT_SOURCE_DIR/parsers.conf" ]; then
    cp "\$FLUENT_SOURCE_DIR/parsers.conf" "\$FLUENT_CONFIG_DIR/parsers.conf"
    echo "📋 Copied parsers.conf from project"
fi

# Copy Lua scripts if they don't exist
for lua_file in format_json.lua process_logs.lua timestamp_converter.lua; do
    if [ ! -f "\$FLUENT_CONFIG_DIR/\$lua_file" ] && [ -f "\$FLUENT_SOURCE_DIR/\$lua_file" ]; then
        cp "\$FLUENT_SOURCE_DIR/\$lua_file" "\$FLUENT_CONFIG_DIR/\$lua_file"
        echo "📋 Copied \$lua_file from project"
    fi
done

# Choose the appropriate template (stdin-template.conf for host usage if available)
TEMPLATE_FILE="\$FLUENT_CONFIG_DIR/template.conf"
if [ -f "\$FLUENT_SOURCE_DIR/stdin-template.conf" ]; then
    # Copy stdin-template.conf as the base template for host usage
    cp "\$FLUENT_SOURCE_DIR/stdin-template.conf" "\$FLUENT_CONFIG_DIR/stdin-template.conf"
    TEMPLATE_FILE="\$FLUENT_CONFIG_DIR/stdin-template.conf"
    echo "📋 Using stdin-template.conf for host usage"
fi

# Generate service-specific config with proper paths and service name
sed -e "s/SERVICE_NAME_PLACEHOLDER/\$SERVICE_NAME/g" \
    -e "s|payments-service|\$SERVICE_NAME|g" \
    -e "s|/fluent-configs/|\$FLUENT_CONFIG_DIR/|g" \
    "\$TEMPLATE_FILE" > "\$TEMP_CONFIG"

echo "📡 Connecting to mrelic server on port 5959"
echo "🏷️  Service: \$SERVICE_NAME"
echo "📝 Using config: \$TEMP_CONFIG"

# Check if we have arguments (command to run) or should read from stdin
if [ \$# -gt 0 ]; then
    echo "🚀 Running: \$*"
    # Run the command and pipe directly to fluent-bit with generated config
    eval "\$* 2>&1" | fluent-bit -vv -c "\$TEMP_CONFIG"
else
    # Read from stdin (original behavior)
    fluent-bit -vv -c "\$TEMP_CONFIG"
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