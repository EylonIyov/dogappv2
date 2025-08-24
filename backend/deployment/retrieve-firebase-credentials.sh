#!/bin/bash

# Script to retrieve Firebase credentials from AWS Systems Manager Parameter Store
# Run this on your EC2 instance

set -e

echo "🔐 Retrieving Firebase credentials from AWS Systems Manager..."

# Retrieve parameters from Parameter Store
FIREBASE_PROJECT_ID=$(aws ssm get-parameter --name "/dogapp/firebase/project_id" --query "Parameter.Value" --output text)
FIREBASE_PRIVATE_KEY_ID=$(aws ssm get-parameter --name "/dogapp/firebase/private_key_id" --with-decryption --query "Parameter.Value" --output text)
FIREBASE_PRIVATE_KEY=$(aws ssm get-parameter --name "/dogapp/firebase/private_key" --with-decryption --query "Parameter.Value" --output text)
FIREBASE_CLIENT_EMAIL=$(aws ssm get-parameter --name "/dogapp/firebase/client_email" --query "Parameter.Value" --output text)
FIREBASE_CLIENT_ID=$(aws ssm get-parameter --name "/dogapp/firebase/client_id" --with-decryption --query "Parameter.Value" --output text)
FIREBASE_CLIENT_X509_CERT_URL=$(aws ssm get-parameter --name "/dogapp/firebase/client_x509_cert_url" --query "Parameter.Value" --output text)

# Create or update .env file with Firebase credentials
echo "📝 Adding Firebase credentials to .env file..."

# Create backup of existing .env if it exists
if [ -f ".env" ]; then
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
fi

# Add Firebase environment variables to .env
cat >> .env << EOF

# Firebase Configuration (from AWS Systems Manager)
FIREBASE_PROJECT_ID=$FIREBASE_PROJECT_ID
FIREBASE_PRIVATE_KEY_ID=$FIREBASE_PRIVATE_KEY_ID
FIREBASE_PRIVATE_KEY="$FIREBASE_PRIVATE_KEY"
FIREBASE_CLIENT_EMAIL=$FIREBASE_CLIENT_EMAIL
FIREBASE_CLIENT_ID=$FIREBASE_CLIENT_ID
FIREBASE_CLIENT_X509_CERT_URL=$FIREBASE_CLIENT_X509_CERT_URL
EOF

echo "✅ Firebase credentials added to .env file"
echo "🔒 Credentials are securely retrieved from AWS Systems Manager"