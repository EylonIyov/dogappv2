#!/bin/bash

# SSL Setup Script for Dog App Backend
# This script sets up SSL certificates using Let's Encrypt

set -e

echo "🔒 Setting up SSL certificates for Dog App..."

# Check if domain is provided
if [ -z "$1" ]; then
    echo "❌ Usage: $0 <your-domain.com>"
    echo "Example: $0 dogapp.example.com"
    exit 1
fi

DOMAIN=$1
EMAIL="your-email@example.com"  # Update this with your email

echo "🌐 Setting up SSL for domain: $DOMAIN"

# Install Certbot if not already installed
if ! command -v certbot &> /dev/null; then
    echo "📦 Installing Certbot..."
    sudo apt update
    sudo apt install -y certbot python3-certbot-nginx
else
    echo "✅ Certbot already installed"
fi

# Update Nginx configuration with the actual domain
echo "📝 Updating Nginx configuration with domain: $DOMAIN"
sudo sed -i "s/your-domain.com/$DOMAIN/g" /etc/nginx/sites-available/dogapp

# Test Nginx configuration
echo "🧪 Testing Nginx configuration..."
sudo nginx -t

if [ $? -ne 0 ]; then
    echo "❌ Nginx configuration test failed"
    exit 1
fi

# Reload Nginx
echo "🔄 Reloading Nginx..."
sudo systemctl reload nginx

# Obtain SSL certificate
echo "🔒 Obtaining SSL certificate from Let's Encrypt..."
sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --email $EMAIL --agree-tos --non-interactive

if [ $? -eq 0 ]; then
    echo "✅ SSL certificate obtained successfully!"
    echo "🌐 Your site is now available at: https://$DOMAIN"
    echo "🔒 Certificate will auto-renew every 90 days"
    
    # Test certificate renewal
    echo "🧪 Testing certificate auto-renewal..."
    sudo certbot renew --dry-run
    
    if [ $? -eq 0 ]; then
        echo "✅ Certificate auto-renewal test passed"
    else
        echo "⚠️ Certificate auto-renewal test failed, but SSL is still working"
    fi
    
    # Show certificate info
    echo "📋 Certificate information:"
    sudo certbot certificates
    
    echo ""
    echo "🎉 HTTPS setup complete!"
    echo "🔗 Test your site: https://$DOMAIN/health"
    echo "🔄 HTTP requests will automatically redirect to HTTPS"
    
else
    echo "❌ Failed to obtain SSL certificate"
    echo "💡 Make sure:"
    echo "   1. Your domain points to this server's IP"
    echo "   2. Port 80 and 443 are open in security groups"
    echo "   3. No other service is using port 80/443"
    exit 1
fi