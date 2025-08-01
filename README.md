<div align="center">
<p align="center">
  <img src="public/favicon.svg" width="150" height="150">
</p>

<h1 align="center"><b>mRelic</b></h1>

<p align="center">
  <a href="https://www.docker.com/"><img src="https://img.shields.io/badge/docker-ready-blue.svg" alt="Docker"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License"></a>
  <a href="https://nextjs.org"><img src="https://img.shields.io/badge/next.js-14.0-black.svg" alt="Next.js"></a>
  <a href="http://makeapullrequest.com"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome"></a>
</p>

<p align="center">Beautiful log monitoring for any application, powered by fluent-bit and Next.js.</p>
</div>

![mRelic Dashboard](https://github.com/user-attachments/assets/271644cc-5e8b-404e-8d8f-a51c577b902f)

## Features

- 🚀 **Zero Configuration**: Just pipe your logs to `mrelic`
- 🏷️ **Auto Service Detection**: Service name from directory name
- 🌐 **Beautiful Web UI**: Modern, responsive log viewer
- 🔍 **Smart Search**: Filter logs by level, service, message content
- 📊 **Real-time Updates**: See logs as they arrive
- 💾 **Persistent Storage**: SQLite database for log history
- 🐳 **Docker Native**: Everything runs in containers

## Quick Start

The fastest way to get started:

```bash
./scripts/quick-start.sh
```

This will:
1. Build the Docker image
2. Start the mrelic server
3. Set up the `mrelic` command
4. Show you how to use it

## Manual Setup

If you prefer to set things up manually:

### 1. Build the Image
```bash
docker build -f Dockerfile.mrelic -t repo/mrelic .
```

### 2. Start the Server
```bash
# Basic setup (port 5959, database at ~/Documents/mrelic.db)
docker run -d --name mrelic-server -p 5959:5959 -v ~/Documents:/data repo/mrelic

# Custom port and database location
docker run -d --name mrelic-server -p 8080:8080 -v ~/Documents:/data repo/mrelic --port 8080 --db /data/custom.db
```

### 3. Set up the mrelic command
```bash
sudo tee /usr/local/bin/mrelic > /dev/null << 'EOF'
#!/bin/sh
CONTAINER_ID=$(docker ps -q -f name=mrelic-server)
if [ -z "$CONTAINER_ID" ]; then
    echo "❌ mrelic server not running!"
    exit 1
fi
SERVER_PORT=$(docker port mrelic-server 5959/tcp | cut -d: -f2 2>/dev/null)
SERVER_PORT=${SERVER_PORT:-5959}
docker run --rm -i --network host \
  -e MRELIC_HOST=localhost \
  -e MRELIC_PORT=$SERVER_PORT \
  -v "$(pwd):/workdir" \
  -w /workdir \
  repo/mrelic /usr/local/bin/mrelic
EOF

sudo chmod +x /usr/local/bin/mrelic
```

## Usage

Once set up, you can use mrelic with any application:

```bash
# Go application
cd my-go-service
mrelic go run main.go
go run main.go | mrelic

# Node.js application
cd my-node-service  
mrelic npm start
npm start | mrelic

# Python application
cd my-python-service
mrelic python app.py
python app.py | mrelic

# Any application that outputs logs
cd any-service
./my-app | mrelic
```

## How It Works

1. **Service Detection**: The `mrelic` command automatically detects your service name from the current directory
2. **Dynamic Configuration**: It creates a fluent-bit config file with your service name
3. **Log Processing**: Fluent-bit processes your logs and sends them to the prettylogs server
4. **Web Interface**: View and analyze your logs at http://localhost:5959

## Configuration

### Environment Variables

- `MRELIC_HOST`: Server host (default: localhost)
- `MRELIC_PORT`: Server port (default: 5959)
- `PORT`: Web interface port (default: 5959)
- `DB_PATH`: Database file path (default: ~/Documents/mrelic.db)

### Custom Database Location

```bash
docker run -d --name mrelic-server -p 5959:5959 \
  -v /path/to/your/data:/data \
  repo/mrelic --db /data/logs.db
```

### Custom Port

```bash
docker run -d --name mrelic-server -p 8080:8080 \
  repo/mrelic --port 8080
```

## Management

```bash
# View server logs
docker logs mrelic-server

# Stop server
docker stop mrelic-server

# Start server
docker start mrelic-server

# Restart server
docker restart mrelic-server

# Remove server (keeps data if using volumes)
docker rm mrelic-server
```

## Troubleshooting

### Server not starting
```bash
docker logs mrelic-server
```

### Can't connect to server
1. Check if container is running: `docker ps`
2. Check port mapping: `docker port mrelic-server`
3. Test connection: `curl http://localhost:5959/api/health`

### mrelic command not found
Make sure you ran the setup script or manually created the command as shown above.

## Advanced Usage

### Multiple Services
Each service automatically gets its own configuration based on the directory name:

```bash
cd payments-service
go run main.go | mrelic  # Shows as "payments-service"

cd user-service  
python app.py | mrelic   # Shows as "user-service"
```

### Custom Service Names
You can override the service name by setting the directory name or using a custom approach in your application.

---

**Need help?** Check the logs with `docker logs mrelic-server` or visit the web interface at http://localhost:5959
