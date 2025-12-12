# Weather MCP Server

A Model Context Protocol (MCP) server that provides weather data using the OpenWeather API.

## Features

- **Weather Forecast Tool**: Get weather forecasts for any city (1-5 days)
- **Current Weather Resources**: Access current weather data for cities
- **Containerized**: Runs in a Docker container for easy deployment

## Prerequisites

- Docker and Docker Compose (for local development)
- OpenWeather API key (get one at https://openweathermap.org/api)
- GitHub account (for cloud deployment)
- Cloud platform account (Railway/Render/Fly.io)

## Quick Start

### 1. Environment Setup

```bash
# Copy the environment template
cp .env.example .env

# Edit .env and add your OpenWeather API key
# OPENWEATHER_API_KEY=your_actual_api_key_here
```

### 2. Build and Run with Docker Compose

```bash
# Build and start the container
docker-compose up --build -d

# View logs
docker-compose logs -f weather-mcp-server
```

### 3. Alternative: Build and Run Manually

```bash
# Build the Docker image
docker build -t weather-mcp-server:latest .

# Run the container
docker run -d \
  --name weather-mcp-server \
  -e OPENWEATHER_API_KEY=your_api_key_here \
  weather-mcp-server:latest
```

## MCP Configuration

Update your MCP settings file (`cline_mcp_settings.json`) to use the containerized server:

```json
{
  "mcpServers": {
    "weather": {
      "command": "docker",
      "args": ["exec", "weather-mcp-server", "node", "build/index.js"],
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

## Usage

Once configured, you can use the weather server through MCP:

- **Get forecast**: Ask for weather forecasts for any city
- **Current weather**: Access current weather data via resources

Example queries:
- "What's the weather like in Tokyo?"
- "Get me a 3-day forecast for London"

## Development

### Local Development (without Docker)

```bash
# Install dependencies
npm install

# Build the server
npm run build

# Run locally
OPENWEATHER_API_KEY=your_key node build/index.js
```

### Project Structure

```
weather-server/
├── Dockerfile              # Docker container definition
├── docker-compose.yml      # Docker Compose configuration
├── .dockerignore          # Files to exclude from Docker build
├── .env.example           # Environment variables template
├── package.json           # Node.js dependencies
├── tsconfig.json          # TypeScript configuration
├── src/                   # Source code
│   └── weather-server/
│       └── index.ts       # Main server implementation
└── build/                 # Compiled JavaScript
    └── index.js           # Built server
```

## API Reference

### Tools

- `get_forecast`: Get weather forecast for a city
  - Parameters:
    - `city` (string, required): City name
    - `days` (number, optional): Number of days (1-5, default: 3)

### Resources

- `weather://{city}/current`: Current weather for a specific city
- `weather://San Francisco/current`: Current weather for San Francisco (static resource)

## Security

- Runs as non-root user in container
- API key stored as environment variable
- No exposed ports (uses stdio communication)

## Troubleshooting

### Container Issues

```bash
# Check container status
docker ps

# View container logs
docker logs weather-mcp-server

# Restart container
docker restart weather-mcp-server
```

### MCP Connection Issues

1. Ensure Docker container is running
2. Check MCP settings configuration
3. Verify API key is set correctly
4. Check container logs for errors

## Cloud Deployment

Deploy your Weather MCP server to the cloud for global access and high availability.

### 🚂 Railway (Recommended for MCP)

Railway is perfect for MCP servers due to its stdio-based communication support.

#### Step 1: Connect to Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
cd weather-server
railway init
```

#### Step 2: Configure Environment
```bash
# Set your OpenWeather API key
railway variables set OPENWEATHER_API_KEY=your_api_key_here
```

#### Step 3: Deploy
```bash
railway up
```

#### Step 4: Update MCP Configuration
Use the Railway URL in your MCP settings:
```json
{
  "mcpServers": {
    "weather": {
      "command": "node",
      "args": ["-e", "require('child_process').spawn('ssh', ['-o', 'StrictHostKeyChecking=no', '-p', '22', 'root@your-railway-url', 'node build/index.js'], {stdio: 'inherit'})"],
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

### 🎨 Render

#### Step 1: Connect Repository
1. Go to [render.com](https://render.com) and sign up
2. Click "New" → "Web Service"
3. Connect your GitHub repository

#### Step 2: Configure Service
- **Runtime**: Node
- **Build Command**: `npm install && npm run build`
- **Start Command**: `node build/index.js`
- **Environment Variables**:
  - `OPENWEATHER_API_KEY`: Your API key
  - `NODE_ENV`: `production`

#### Step 3: Deploy
Click "Create Web Service" to deploy.

### 🛩️ Fly.io

#### Step 1: Install Fly CLI
```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh
```

#### Step 2: Initialize App
```bash
cd weather-server
fly launch
# Follow the prompts, choose a region close to you
```

#### Step 3: Set Environment Variables
```bash
fly secrets set OPENWEATHER_API_KEY=your_api_key_here
```

#### Step 4: Deploy
```bash
fly deploy
```

### 🔄 CI/CD with GitHub Actions

The repository includes GitHub Actions workflows for automated deployment:

#### Setup Secrets in GitHub
Go to your repository → Settings → Secrets and variables → Actions:

- `RAILWAY_TOKEN`: Your Railway API token
- `RENDER_API_KEY`: Your Render API key
- `FLY_API_TOKEN`: Your Fly.io API token

#### Automatic Deployment
- Push to `main` branch triggers deployment to all configured platforms
- Pull requests trigger container builds for testing

### 🌐 Alternative Cloud Platforms

#### Google Cloud Run
```bash
# Build and push to GCR
gcloud builds submit --tag gcr.io/PROJECT-ID/weather-mcp-server

# Deploy to Cloud Run
gcloud run deploy weather-mcp-server \
  --image gcr.io/PROJECT-ID/weather-mcp-server \
  --platform managed \
  --set-env-vars OPENWEATHER_API_KEY=your_key
```

#### AWS Fargate
```bash
# Use AWS Copilot CLI
copilot init
copilot env init
copilot deploy
```

### 🔧 MCP Configuration for Cloud

For cloud-deployed servers, update your MCP settings to connect via network:

```json
{
  "mcpServers": {
    "weather": {
      "command": "node",
      "args": ["-e", "require('child_process').spawn('curl', ['-s', 'https://your-cloud-url.com/mcp'], {stdio: 'inherit'})"],
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

**Note**: MCP servers typically use stdio communication. For cloud deployment, you may need to create an HTTP wrapper or use SSH tunneling.

## License

MIT
