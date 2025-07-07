#!/bin/bash

# Deployment script for DogApp Backend
# Run this script on your EC2 instance after the initial setup

set -e

echo "🚀 Starting DogApp deployment..."

# Variables
APP_DIR="/var/www/dogapp"
LOG_DIR="/var/log/dogapp"
NGINX_CONFIG="/etc/nginx/sites-available/dogapp"
NGINX_ENABLED="/etc/nginx/sites-enabled/dogapp"

# Create log directory
echo "📁 Creating log directory..."
sudo mkdir -p $LOG_DIR
sudo chown ubuntu:ubuntu $LOG_DIR

# Clone or update repository
if [ -d "$APP_DIR/.git" ]; then
    echo "🔄 Updating existing repository..."
    cd $APP_DIR
    git pull origin main
else
    echo "📥 Cloning repository..."
    git clone https://github.com/EylonIyov/dogappv2/tree/adding_dog_park_function $APP_DIR
    cd $APP_DIR
fi

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd $APP_DIR/backend
npm install --production

# Copy environment file (you need to create this manually)
if [ ! -f "$APP_DIR/backend/.env" ]; then
    echo "⚠️  WARNING: .env file not found!"
    echo "Please create .env file with your production environment variables"
    echo "Template:"
    echo "NODE_ENV=production"
    echo "PORT=3000"
    echo "JWT_SECRET=your-super-secret-jwt-key"
    echo "FIREBASE_PROJECT_ID=your-firebase-project-id"
    echo "AWS_ACCESS_KEY_ID=your-aws-access-key"
    echo "AWS_SECRET_ACCESS_KEY=your-aws-secret-key"
    echo "AWS_REGION=your-aws-region"
    echo "S3_BUCKET_NAME=your-s3-bucket-name"
    echo "DOG_BREEDS_API_KEY=your-api-key"
    echo "DOG_BREEDS_API_URL=https://api.thedogapi.com/v1"
    echo "FRONTEND_URL=http://your-domain.com"
    echo ""
    echo "Create this file and run the deployment script again."
    exit 1
fi

# Configure Nginx
echo "🌐 Configuring Nginx..."
sudo cp $APP_DIR/backend/deployment/nginx.conf $NGINX_CONFIG

# Update server_name in nginx config (replace with your domain/IP)
read -p "Enter your domain name or EC2 public IP: " SERVER_NAME
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

# Stop existing PM2 processes (if any)
echo "🛑 Stopping existing PM2 processes..."
pm2 stop all || true
pm2 delete all || true

# Start application with PM2
echo "🚀 Starting application with PM2..."
cd $APP_DIR/backend
pm2 start deployment/ecosystem.config.json --env production

# Save PM2 configuration
pm2 save

# Set up PM2 startup script
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu

echo "✅ Deployment completed successfully!"
echo ""
echo "🔗 Your application should be running at:"
echo "   http://$SERVER_NAME"
echo "   http://$SERVER_NAME/health"
echo ""
echo "📊 Useful commands:"
echo "   pm2 status          - Check application status"
echo "   pm2 logs            - View application logs"
echo "   pm2 restart all     - Restart application"
echo "   sudo systemctl status nginx - Check Nginx status"
echo "   sudo tail -f /var/log/nginx/dogapp_error.log - View Nginx errors"