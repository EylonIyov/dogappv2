#!/bin/bash

# EC2 Server Setup Script for Docker Deployment
# Run this script on your EC2 instance to set up the Docker environment

set -e

echo "🚀 Starting EC2 Docker setup..."

# Update system packages
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker
echo "🐳 Installing Docker..."
sudo apt install -y apt-transport-https ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Set up Docker repository
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Install Docker Compose
echo "📦 Installing Docker Compose..."
COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
if [ -z "$COMPOSE_VERSION" ]; then
    COMPOSE_VERSION="v2.21.0"
fi

sudo curl -L "https://github.com/docker/compose/releases/download/$COMPOSE_VERSION/docker-compose-$(uname -s)-$(uname -m)" \
    -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

# Add ubuntu user to docker group
sudo usermod -aG docker ubuntu

# Install Nginx for reverse proxy
echo "📦 Installing Nginx..."
sudo apt install -y nginx

# Install Git
echo "📦 Installing Git..."
sudo apt install -y git

# Install other useful tools
echo "📦 Installing additional tools..."
sudo apt install -y curl wget htop unzip jq

# Create application directory
echo "📁 Creating application directory..."
sudo mkdir -p /var/www/dogapp
sudo chown ubuntu:ubuntu /var/www/dogapp

# Create log directory
sudo mkdir -p /var/log/dogapp
sudo chown ubuntu:ubuntu /var/log/dogapp

# Configure firewall
echo "🔥 Configuring firewall..."
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'  # This allows both HTTP (80) and HTTPS (443)
sudo ufw allow 443           # Explicitly allow HTTPS
sudo ufw allow 3000          # Temporary for testing
sudo ufw --force enable

# Start and enable Docker
echo "🐳 Starting Docker services..."
sudo systemctl start docker
sudo systemctl enable docker

# Start and enable Nginx
echo "🌐 Starting Nginx..."
sudo systemctl start nginx
sudo systemctl enable nginx

# Verify installations
echo "✅ Verifying installations..."
echo "Docker version: $(docker --version)"
echo "Docker Compose version: $(docker-compose --version)"
echo "Nginx version: $(nginx -version 2>&1)"

echo "✅ EC2 Docker setup complete!"
echo "📝 Next steps:"
echo "1. Log out and log back in to apply docker group membership"
echo "2. Clone your repository to /var/www/dogapp"
echo "3. Configure environment variables"
echo "4. Run the Docker deployment script"