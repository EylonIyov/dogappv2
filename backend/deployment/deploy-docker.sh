#!/bin/bash

# Docker Deployment script for DogApp Backend
# Run this script on your EC2 instance after the Docker setup

set -e

echo "🐳 Starting DogApp Docker deployment..."

# Variables
APP_DIR="/var/www/dogapp"
NGINX_CONFIG="/etc/nginx/sites-available/dogapp"
NGINX_ENABLED="/etc/nginx/sites-enabled/dogapp"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Make sure you're in the backend directory."
    echo "Run: cd /var/www/dogapp/backend"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  WARNING: .env file not found!"
    echo "Please create .env file with your production environment variables"
    echo "Use .env.template as a template:"
    echo "cp .env.template .env"
    echo "Then edit .env with your actual values"
    exit 1
fi

# Check if Firebase service account key exists or environment variables are set
if [ ! -f "serviceAccountKey.json" ] && [ -z "$FIREBASE_PRIVATE_KEY" ]; then
    echo "⚠️  WARNING: Firebase credentials not found!"
    echo "Please either:"
    echo "1. Upload serviceAccountKey.json to this directory, OR"
    echo "2. Set Firebase environment variables in .env file"
    echo "To set up Firebase env vars, run: ./deployment/setup-firebase-env.sh"
    exit 1
fi

# Stop and remove existing containers
echo "🛑 Stopping existing containers..."
docker-compose down --remove-orphans || true

# Remove old images to free up space (optional)
echo "🗑️  Cleaning up old Docker images..."
docker image prune -f || true

# Build and start containers
echo "🏗️  Building and starting Docker containers..."
docker-compose up -d --build

# Wait for container to be healthy
echo "⏳ Waiting for container to be healthy..."
timeout 60 bash -c 'until docker-compose ps | grep -q "healthy\|Up"; do sleep 2; done' || {
    echo "❌ Container failed to start properly"
    echo "📝 Container logs:"
    docker-compose logs
    exit 1
}

# Configure Nginx if not already configured
if [ ! -f "$NGINX_CONFIG" ]; then
    echo "🌐 Configuring Nginx..."
    
    # Copy the nginx configuration
    sudo cp deployment/nginx.conf $NGINX_CONFIG
    
    # Prompt for domain/IP
    read -p "Enter your domain name or EC2 public IP: " SERVER_NAME
    
    # Update server_name in nginx config
    sudo sed -i "s/your-domain.com/$SERVER_NAME/g" $NGINX_CONFIG
    
    # Enable Nginx site
    sudo ln -sf $NGINX_CONFIG $NGINX_ENABLED
    
    # Remove default Nginx site
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Test Nginx configuration
    echo "🧪 Testing Nginx configuration..."
    sudo nginx -t
    
    # Restart Nginx
    echo "🔄 Restarting Nginx..."
    sudo systemctl restart nginx
    sudo systemctl enable nginx
else
    echo "✅ Nginx already configured"
    # Just reload to pick up any changes
    sudo systemctl reload nginx
fi

echo "✅ Docker deployment completed successfully!"
echo ""
echo "🔗 Your application should be running at:"
if command -v curl &> /dev/null; then
    # Try to detect the actual server name from nginx config
    SERVER_NAME=$(sudo grep -o 'server_name [^;]*' $NGINX_CONFIG | head -1 | cut -d' ' -f2 || echo "your-server")
    echo "   http://$SERVER_NAME"
    echo "   http://$SERVER_NAME/health"
else
    echo "   http://your-domain-or-ip"
    echo "   http://your-domain-or-ip/health"
fi
echo ""
echo "📊 Useful Docker commands:"
echo "   docker-compose ps              - Check container status"
echo "   docker-compose logs            - View application logs"
echo "   docker-compose logs -f         - Follow application logs"
echo "   docker-compose restart         - Restart containers"
echo "   docker-compose down            - Stop containers"
echo "   docker-compose up -d --build   - Rebuild and restart"
echo ""
echo "📊 Container status:"
docker-compose ps

echo ""
echo "🔍 Testing health endpoint..."
sleep 5
if curl -f http://localhost:3000/health &>/dev/null; then
    echo "✅ Health check passed - application is running!"
else
    echo "⚠️  Health check failed - check logs with: docker-compose logs"
fi