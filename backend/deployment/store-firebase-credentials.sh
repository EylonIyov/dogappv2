#!/bin/bash

# Script to store Firebase credentials in AWS Systems Manager Parameter Store
# Run this locally with AWS CLI configured

set -e

echo "🔐 Storing Firebase credentials in AWS Systems Manager..."

# Check if serviceAccountKey.json exists
if [ ! -f "serviceAccountKey.json" ]; then
    echo "❌ serviceAccountKey.json not found!"
    echo "Please download your Firebase service account key first"
    exit 1
fi

# Extract values from service account key
PROJECT_ID=$(jq -r '.project_id' serviceAccountKey.json)
PRIVATE_KEY_ID=$(jq -r '.private_key_id' serviceAccountKey.json)
PRIVATE_KEY=$(jq -r '.private_key' serviceAccountKey.json)
CLIENT_EMAIL=$(jq -r '.client_email' serviceAccountKey.json)
CLIENT_ID=$(jq -r '.client_id' serviceAccountKey.json)
CLIENT_X509_CERT_URL=$(jq -r '.client_x509_cert_url' serviceAccountKey.json)

# Store in Parameter Store (SecureString type for encryption)
aws ssm put-parameter \
    --name "/dogapp/firebase/project_id" \
    --value "$PROJECT_ID" \
    --type "String" \
    --overwrite

aws ssm put-parameter \
    --name "/dogapp/firebase/private_key_id" \
    --value "$PRIVATE_KEY_ID" \
    --type "SecureString" \
    --overwrite

aws ssm put-parameter \
    --name "/dogapp/firebase/private_key" \
    --value "$PRIVATE_KEY" \
    --type "SecureString" \
    --overwrite

aws ssm put-parameter \
    --name "/dogapp/firebase/client_email" \
    --value "$CLIENT_EMAIL" \
    --type "String" \
    --overwrite

aws ssm put-parameter \
    --name "/dogapp/firebase/client_id" \
    --value "$CLIENT_ID" \
    --type "SecureString" \
    --overwrite

aws ssm put-parameter \
    --name "/dogapp/firebase/client_x509_cert_url" \
    --value "$CLIENT_X509_CERT_URL" \
    --type "String" \
    --overwrite

echo "✅ Firebase credentials stored in AWS Systems Manager Parameter Store"
echo "🔗 Parameters stored under /dogapp/firebase/ namespace"