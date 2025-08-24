#!/bin/bash

# Script to set Firebase private key as environment variable on EC2
# Run this on your EC2 instance after uploading your serviceAccountKey.json

set -e

echo "🔐 Setting up Firebase environment variables..."

# Check if serviceAccountKey.json exists
if [ ! -f "serviceAccountKey.json" ]; then
    echo "❌ serviceAccountKey.json not found!"
    echo "Please upload your Firebase service account key first"
    exit 1
fi

# Extract the private key and handle multi-line format
echo "📝 Extracting Firebase credentials..."

PROJECT_ID=$(jq -r '.project_id' serviceAccountKey.json)
PRIVATE_KEY_ID=$(jq -r '.private_key_id' serviceAccountKey.json)
PRIVATE_KEY=$(jq -r '.private_key' serviceAccountKey.json)
CLIENT_EMAIL=$(jq -r '.client_email' serviceAccountKey.json)
CLIENT_ID=$(jq -r '.client_id' serviceAccountKey.json)
CLIENT_X509_CERT_URL=$(jq -r '.client_x509_cert_url' serviceAccountKey.json)

# Create .env file with proper escaping for the private key
cat > .env << EOF
NODE_ENV=production
PORT=3000

# JWT Secret - Generate a strong secret for production
JWT_SECRET=your-super-secure-jwt-secret-here-min-32-chars

# Frontend URL - Replace with your actual frontend domain
FRONTEND_URL=https://your-frontend-domain.com

# Firebase Configuration
FIREBASE_PROJECT_ID=$PROJECT_ID
FIREBASE_PRIVATE_KEY_ID=$PRIVATE_KEY_ID
FIREBASE_PRIVATE_KEY="$PRIVATE_KEY"
FIREBASE_CLIENT_EMAIL=$CLIENT_EMAIL
FIREBASE_CLIENT_ID=$CLIENT_ID
FIREBASE_CLIENT_X509_CERT_URL=$CLIENT_X509_CERT_URL

# Dog Breeds API
DOG_BREEDS_API_KEY=your-dog-breeds-api-key
DOG_BREEDS_API_URL=https://api.thedogapi.com/v1

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_REGION=your-aws-region
S3_BUCKET_NAME=your-s3-bucket-name

# Rate Limiting
RATE_LIMIT_MAX=100
EOF

echo "✅ Environment variables created in .env file"
echo "📝 Please edit .env to update the placeholder values with your actual credentials"
echo "⚠️  Remember to delete serviceAccountKey.json after this setup"

# Secure the .env file
chmod 600 .env

echo "🔒 .env file permissions set to 600 (owner read/write only)"