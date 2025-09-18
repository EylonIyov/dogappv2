# 🐕 Dog App - Development Mode Setup Guide

This guide will help you set up and run the Dog App locally for development.

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- Git

## 🚀 Quick Start

### 1. Setup Backend

```bash
# Navigate to backend directory
cd backend

# Copy environment file and configure it
cp .env.example .env

# Install dependencies
npm install

# Start the backend in development mode
npm run dev
```

### 2. Configure Environment Variables

Edit `backend/.env` with your actual values:

```bash
# Required - Update these with your Firebase project details
FIREBASE_PROJECT_ID=your-actual-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour actual private key\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com

# Generate a secure JWT secret
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters

# AWS S3 (if using for image uploads)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=your-s3-bucket-name
```

### 3. Setup Frontend

```bash
# Navigate to frontend directory
cd frontend/dogapp

# Install dependencies
npm install

# Start the frontend in development mode
npm run dev:local
```

## 🛠️ Development Scripts

### Backend Scripts

- `npm run dev` - Start with nodemon (auto-restart on changes)
- `npm run dev:debug` - Start with debug logging enabled
- `npm run local` - Force development environment
- `npm start` - Production start

### Frontend Scripts

- `npm run dev:local` - Start in development mode with localhost backend
- `npm run dev:web` - Start web version only
- `npm run dev:ios` - Start iOS simulator
- `npm run dev:android` - Start Android emulator
- `npm run dev:tunnel` - Start with tunnel (for testing on physical devices)

## 📱 Testing on Mobile Devices

### Option 1: Use your local IP (recommended)

1. Find your local IP address:

   ```bash
   # macOS/Linux
   ipconfig getifaddr en0

   # Windows
   ipconfig | findstr IPv4
   ```

2. Update `frontend/dogapp/config.js`:

   ```javascript
   const getLocalIP = () => {
     return "YOUR_ACTUAL_LOCAL_IP"; // e.g., '192.168.1.100'
   };
   ```

3. Make sure both devices are on the same network

### Option 2: Use Expo tunnel

```bash
cd frontend/dogapp
npm run dev:tunnel
```

## 🔧 Development Features

### Development Panel

- Floating "DEV" button appears only in development mode
- Test API endpoints
- Check server connectivity
- View environment information
- Debug Firebase connection

### Enhanced Logging

- All API calls are logged in development
- Request/response debugging
- Server status monitoring

### Development Endpoints

- `GET /health` - Basic health check
- `GET /dev/env` - Environment information (dev only)
- `GET /dev/test` - Test endpoint (dev only)
- `GET /debug/firebase` - Firebase connection test

## 🐛 Troubleshooting

### Backend Issues

1. **Server won't start**

   - Check if port 8080 is available
   - Verify `.env` file exists and has correct values
   - Check Firebase credentials

2. **Firebase connection fails**

   - Verify Firebase project ID
   - Check private key format (should include `\n` for line breaks)
   - Ensure service account has proper permissions

3. **CORS errors**
   - Development mode allows all origins
   - Check if frontend is using correct backend URL

### Frontend Issues

1. **Can't connect to backend**

   - Verify backend is running on http://localhost:8080
   - Check network connectivity
   - Use Development Panel to test endpoints

2. **Expo/Metro issues**

   - Clear Metro cache: `npx expo start --clear`
   - Reset node modules: `rm -rf node_modules && npm install`

3. **Mobile device can't reach backend**
   - Ensure both devices are on same WiFi network
   - Update local IP in config.js
   - Check firewall settings

## 📚 Project Structure

```
backend/
├── server.js          # Main server file with dev mode enhancements
├── .env.example      # Environment variables template
├── routes/           # API route handlers
├── middleware/       # Authentication middleware
├── config/          # Database and Firebase config
└── services/        # Business logic services

frontend/dogapp/
├── config.js        # Environment-aware configuration
├── App.js          # Main app with DevPanel integration
├── components/
│   ├── DevPanel.js  # Development debugging tools
│   └── ...
├── screens/        # App screens
├── services/       # API service calls
└── contexts/       # React contexts
```

## 🌟 Pro Tips

1. **Use the Development Panel** - Access debugging tools via the floating "DEV" button
2. **Monitor Logs** - Check both frontend (browser/Metro) and backend (terminal) logs
3. **Test API Endpoints** - Use the built-in API testing in the Development Panel
4. **Environment Variables** - Never commit real credentials to version control
5. **Hot Reloading** - Both frontend and backend support hot reloading for faster development

## 🚀 Going to Production

When ready to deploy:

1. Set `NODE_ENV=production` in backend
2. Update frontend config to use production API URL
3. Remove or disable Development Panel
4. Use production Firebase credentials
5. Enable proper CORS restrictions

## 💡 Need Help?

- Check the Development Panel for real-time debugging
- Use `/debug/firebase` endpoint to test Firebase connectivity
- Monitor server logs for detailed request information
- Verify environment variables with `/dev/env` endpoint (development only)
