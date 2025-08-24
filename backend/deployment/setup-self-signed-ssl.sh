#!/bin/bash

# Self-signed SSL Certificate Setup Script
# Use this if you don't have a domain name and want to test HTTPS locally

set -e

echo "🔒 Setting up self-signed SSL certificate..."

# Create SSL directory
sudo mkdir -p /etc/nginx/ssl

# Generate private key
echo "🔑 Generating private key..."
sudo openssl genrsa -out /etc/nginx/ssl/dogapp.key 2048

# Generate certificate signing request
echo "📝 Generating certificate signing request..."
sudo openssl req -new -key /etc/nginx/ssl/dogapp.key -out /etc/nginx/ssl/dogapp.csr -subj "/C=US/ST=State/L=City/O=Organization/CN=dogapp.local"

# Generate self-signed certificate
echo "📜 Generating self-signed certificate..."
sudo openssl x509 -req -days 365 -in /etc/nginx/ssl/dogapp.csr -signkey /etc/nginx/ssl/dogapp.key -out /etc/nginx/ssl/dogapp.crt

# Set proper permissions
sudo chmod 600 /etc/nginx/ssl/dogapp.key
sudo chmod 644 /etc/nginx/ssl/dogapp.crt

# Create Nginx configuration for self-signed certificate
cat > /tmp/nginx-self-signed.conf << 'EOF'
# HTTP server - redirects to HTTPS
server {
    listen 80;
    server_name _;

    # Redirect all HTTP traffic to HTTPS
    return 301 https://$host$request_uri;
}

# HTTPS server with self-signed certificate
server {
    listen 443 ssl http2;
    server_name _;

    # Self-signed SSL certificate
    ssl_certificate /etc/nginx/ssl/dogapp.crt;
    ssl_certificate_key /etc/nginx/ssl/dogapp.key;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_timeout 10m;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;

    # Proxy to Node.js backend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3000/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        access_log off;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Log files
    access_log /var/log/nginx/dogapp_access.log;
    error_log /var/log/nginx/dogapp_error.log;
}
EOF

# Copy configuration to Nginx
sudo cp /tmp/nginx-self-signed.conf /etc/nginx/sites-available/dogapp

# Test Nginx configuration
echo "🧪 Testing Nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    # Reload Nginx
    echo "🔄 Reloading Nginx..."
    sudo systemctl reload nginx
    
    echo "✅ Self-signed SSL certificate setup complete!"
    echo "🌐 Your site is now available at: https://YOUR_EC2_PUBLIC_IP"
    echo "⚠️  Browser will show security warning (this is normal for self-signed certificates)"
    echo "🔄 HTTP requests will automatically redirect to HTTPS"
    echo ""
    echo "💡 To avoid browser warnings, either:"
    echo "   1. Use a proper domain with Let's Encrypt (run setup-ssl.sh)"
    echo "   2. Add security exception in your browser"
else
    echo "❌ Nginx configuration test failed"
    exit 1
fi