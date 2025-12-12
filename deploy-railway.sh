#!/bin/bash

# Weather MCP Server - Railway Deployment Script
# This script helps deploy the Weather MCP server to Railway

set -e

echo "🚂 Weather MCP Server - Railway Deployment"
echo "=========================================="

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Check if user is logged in
if ! railway whoami &> /dev/null; then
    echo "🔐 Please login to Railway:"
    railway login
fi

# Initialize Railway project
echo "📁 Initializing Railway project..."
railway init weather-mcp-server --source . --language node

# Set environment variables
echo "🔑 Setting environment variables..."
echo "Enter your OpenWeather API key:"
read -s OPENWEATHER_API_KEY

railway variables set OPENWEATHER_API_KEY="$OPENWEATHER_API_KEY"

# Deploy
echo "🚀 Deploying to Railway..."
railway up

# Get the deployment URL
echo "📍 Getting deployment information..."
railway domain

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🔧 Update your MCP configuration with the Railway URL:"
echo "   Command: ssh -o StrictHostKeyChecking=no root@your-railway-url"
echo "   Args: node build/index.js"
echo ""
echo "📖 See README.md for detailed MCP configuration instructions."
