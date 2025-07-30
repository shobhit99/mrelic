# MRelic Docker Setup

This Docker setup combines fluent-bit with the prettylogs service to provide easy log monitoring for any application.

## Building the Image

```bash
docker build -f Dockerfile.mrelic -t repo/mrelic .
```

## Running the Container

### Basic Usage
```bash
# Run with default settings (port 3000, db at ~/Documents/mrelic.db)
docker run -d -p 3000:3000 -v ~/Documents:/data repo/mrelic

# Run with custom port and database location
docker run -d -p 8080:8080 -v ~/Documents:/data repo/mrelic --port 8080 --db /data/custom.db
```

### Using mrelic command

1. First, make the mrelic command available on your host:
```bash
# Create a wrapper script
cat > /usr/local/bin/mrelic << 'EOF'
#!/bin/sh
docker run --rm -i --network host \
  -e MRELIC_HOST=localhost \
  -e MRELIC_PORT=3000 \
  -v "$(pwd):/workdir" \
  -w /workdir \
  repo/mrelic mrelic
EOF

chmod +x /usr/local/bin/mrelic
```

2. Then use it in any project directory:
```bash
cd offer-service
go run main.go | mrelic
```

## How it works

1. The `mrelic` command detects the current directory name as the service name
2. It creates a fluent-bit configuration from the template
3. It replaces the service name and server details in the config
4. It pipes the input through fluent-bit to your prettylogs server

## Environment Variables

- `MRELIC_HOST`: Host where the prettylogs server is running (default: localhost)
- `MRELIC_PORT`: Port where the prettylogs server is running (default: 3000)
- `PORT`: Port for the prettylogs web interface (default: 3000)
- `DB_PATH`: Path to SQLite database file (default: ~/Documents/mrelic.db)

## Accessing the Web Interface

Once the container is running, access the log viewer at:
- http://localhost:3000 (or your custom port) 