#!/bin/bash

# Docker Compose Installation Script for EC2
# This script installs Docker Compose on Ubuntu EC2 instances

set -e

echo "🐳 Installing Docker Compose on EC2 instance..."

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo "⚠️  Please run this script as a regular user, not root"
    echo "The script will use sudo when needed"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "Run: ./setup-ec2-docker.sh"
    exit 1
fi

# Get the latest Docker Compose version
echo "🔍 Getting latest Docker Compose version..."
COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)

if [ -z "$COMPOSE_VERSION" ]; then
    echo "⚠️  Could not fetch latest version, using fallback version v2.21.0"
    COMPOSE_VERSION="v2.21.0"
fi

echo "📦 Installing Docker Compose $COMPOSE_VERSION..."

# Download Docker Compose binary
sudo curl -L "https://github.com/docker/compose/releases/download/$COMPOSE_VERSION/docker-compose-$(uname -s)-$(uname -m)" \
    -o /usr/local/bin/docker-compose

# Make it executable
sudo chmod +x /usr/local/bin/docker-compose

# Create symlink for easier access
sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

# Verify installation
echo "🧪 Verifying Docker Compose installation..."
if docker-compose --version; then
    echo "✅ Docker Compose installed successfully!"
    echo "📋 Version: $(docker-compose --version)"
else
    echo "❌ Docker Compose installation failed"
    exit 1
fi

# Check Docker daemon status
echo "🔍 Checking Docker daemon status..."
if sudo systemctl is-active --quiet docker; then
    echo "✅ Docker daemon is running"
else
    echo "🔄 Starting Docker daemon..."
    sudo systemctl start docker
    sudo systemctl enable docker
fi

# Test Docker Compose with a simple command
echo "🧪 Testing Docker Compose functionality..."
if docker-compose config --help &>/dev/null; then
    echo "✅ Docker Compose is working correctly"
else
    echo "❌ Docker Compose test failed"
    exit 1
fi

echo ""
echo "🎉 Docker Compose installation completed successfully!"
echo "🔗 You can now use 'docker-compose' commands"
echo "📖 Usage examples:"
echo "   docker-compose --version       - Check version"
echo "   docker-compose up -d          - Start services"
echo "   docker-compose down           - Stop services"
echo "   docker-compose logs           - View logs"
echo "   docker-compose ps             - List running containers"