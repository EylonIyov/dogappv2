#!/bin/bash

# Quick deployment script for updates
# Run this after making changes to your code

set -e

echo "🔄 Quick deployment update..."

# Variables
APP_DIR="/var/www/dogapp"

# Navigate to app directory
cd $APP_DIR

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Install any new dependencies
echo "📦 Installing dependencies..."
cd $APP_DIR/backend
npm install --production

# Restart application
echo "🔄 Restarting application..."
pm2 restart all

echo "✅ Quick deployment completed!"
echo "📊 Application status:"
pm2 status