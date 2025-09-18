require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Import route modules
const authRoutes = require('./routes/auth');
const dogRoutes = require('./routes/dogs');
const parkRoutes = require('./routes/parks');
const breedRoutes = require('./routes/breeds');

// Import socket handlers
const { setupSocketHandlers } = require('./sockets/parkSocket');

// Import database for Firebase connection test
const { db } = require('./config/database');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 8080;
const isProduction = process.env.NODE_ENV === 'production';

// Middleware
app.use(cors({
  origin: ['https://dogappv-deploy.vercel.app/', 'http://localhost:3000', '*'],
  credentials: true
}));
app.use(express.json());

// Request logging for production
if (isProduction) {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Dog App Backend is running!' });
});

// Debug endpoint to test Firebase connection
app.get('/debug/firebase', async (req, res) => {
  try {
    console.log('🔍 Testing Firebase connection...');
    
    // Test basic Firebase connection
    const testDoc = await db.collection('test').doc('connection-test').get();
    console.log('✅ Firebase connection successful');
    
    res.json({ 
      success: true, 
      message: 'Firebase connection working',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Firebase connection failed:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Firebase connection failed',
      details: error.message 
    });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/dogs', dogRoutes);
app.use('/api/dog-parks', parkRoutes);
app.use('/api/dog-breeds', breedRoutes);

// Setup Socket.IO handlers
setupSocketHandlers(io);

// Start server
const HOST = isProduction ? '0.0.0.0' : 'localhost';

server.listen(PORT, HOST, () => {
  console.log(`🐕 Dog App Backend running on ${HOST}:${PORT}`);
  console.log(`Health check: http://${HOST}:${PORT}/health`);
  
  if (isProduction) {
    console.log(`🌐 Production mode: Server accepting external connections`);
    console.log(`🔗 External access: http://YOUR_EC2_PUBLIC_IP:${PORT}/health`);
  } else {
    console.log(`🏠 Development mode: Server listening on localhost only`);
  }
  
  console.log(`📚 Modular API Structure:`);
  console.log(`AUTH: /api/auth/*`);
  console.log(`DOGS: /api/dogs/*`);
  console.log(`PARKS: /api/dog-parks/*`);
  console.log(`BREEDS: /api/dog-breeds/*`);
  console.log(`WEBSOCKET: Real-time updates via Socket.IO`);
  console.log(`SSE: Server-Sent Events at /api/dog-parks/:parkId/live`);
});

module.exports = { app, server, io };