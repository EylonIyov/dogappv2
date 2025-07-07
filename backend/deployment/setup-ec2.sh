#!/bin/bash

# EC2 Server Setup Script
# Run this script on your EC2 instance to set up the environment

set -e

echo "🚀 Starting EC2 server setup..."

# Update system packages
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js (using NodeSource repository for latest LTS)
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node.js installation
echo "✅ Node.js version: $(node --version)"
echo "✅ NPM version: $(npm --version)"

# Install PM2 for process management
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Install Nginx for reverse proxy
echo "📦 Installing Nginx..."
sudo apt install -y nginx

# Install Git
echo "📦 Installing Git..."
sudo apt install -y git

# Create application directory
echo "📁 Creating application directory..."
sudo mkdir -p /var/www/dogapp
sudo chown ubuntu:ubuntu /var/www/dogapp

# Install AWS CLI (optional, for S3 operations)
echo "📦 Installing AWS CLI..."
sudo apt install -y awscli

# Configure firewall
echo "🔥 Configuring firewall..."
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 3000
sudo ufw --force enable

echo "✅ EC2 setup complete!"
echo "📝 Next steps:"
echo "1. Clone your repository to /var/www/dogapp"
echo "2. Install project dependencies"
echo "3. Configure environment variables"
echo "4. Start the application with PM2"