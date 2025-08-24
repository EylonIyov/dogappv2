### Step 3: Configure Environment

1. **Generate JWT Secret:**

   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. **Create Production Environment File:**

   ```bash
   cd /var/www/dogapp/backend
   cp .env.template .env
   ```

3. **Edit the .env file with your values:**

   ```bash
   nano .env
   ```

   Update these values:

   - `JWT_SECRET`: Your generated secret
   - `FRONTEND_URL`: Your frontend domain (e.g., https://yourapp.com)
   - `S3_BUCKET_NAME`: Your AWS S3 bucket name
   - `FIREBASE_PROJECT_ID`: Your Firebase project ID
   - `AWS_ACCESS_KEY_ID`: Your AWS access key
   - `AWS_SECRET_ACCESS_KEY`: Your AWS secret key
   - `AWS_REGION`: Your AWS region
   - `DOG_BREEDS_API_KEY`: Your dog breeds API key

4. **Upload Firebase Service Account Key:**
   ```bash
   # On your local machine, copy the service account key
   scp -i your-key.pem serviceAccountKey.json ubuntu@YOUR_EC2_IP:/var/www/dogapp/backend/
   ```
