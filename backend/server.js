require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createServer } = require("http");

// Import route modules
const authRoutes = require("./routes/auth");
const dogRoutes = require("./routes/dogs");
const parkRoutes = require("./routes/parks");
const breedRoutes = require("./routes/breeds");
const notificationRoutes = require("./routes/notifications");
const friendRequestRoutes = require("./routes/friend-requests");

// Import database for Firebase connection test
const { db } = require("./config/database");

const app = express();
const server = createServer(app);

const PORT = process.env.PORT || 8080;
const HOST =
  process.env.HOST ||
  (process.env.NODE_ENV === "production" ? "0.0.0.0" : "localhost");
const isProduction = process.env.NODE_ENV === "production";
const isDevelopment = process.env.NODE_ENV === "development";

// Development mode configuration
if (isDevelopment) {
  console.log("🚀 Starting in DEVELOPMENT mode");
  console.log("📍 Environment variables loaded:");
  console.log("   - NODE_ENV:", process.env.NODE_ENV);
  console.log("   - PORT:", PORT);
  console.log("   - HOST:", HOST);
  console.log("   - DEBUG:", process.env.DEBUG);
}

// Enhanced CORS for development
const corsOptions = {
  origin: function (origin, callback) {
    if (isDevelopment) {
      // In development, allow all localhost ports and common development URLs
      const allowedOrigins = [
        /^http:\/\/localhost:\d+$/, // Any localhost port
        /^http:\/\/127\.0\.0\.1:\d+$/, // Any 127.0.0.1 port
        /^http:\/\/192\.168\.\d+\.\d+:\d+$/, // Local network addresses
        /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/, // Local network addresses
        /^exp:\/\/.*/, // Expo development URLs
        /^https?:\/\/.*\.exp\.direct/, // Expo development URLs
        /^https?:\/\/.*\.ngrok\.io/, // ngrok tunnels
      ];

      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      // Check if origin matches any allowed pattern
      const isAllowed = allowedOrigins.some((allowed) => {
        if (typeof allowed === "string") return allowed === origin;
        return allowed.test(origin);
      });

      if (isDevelopment && !isAllowed) {
        console.log(`🚨 CORS: Blocked origin: ${origin}`);
      }

      callback(null, isAllowed || isDevelopment); // In dev, be more permissive
    } else {
      // Production CORS
      const allowedOrigins = ["https://dogappv-deploy.vercel.app"];
      callback(null, allowedOrigins.includes(origin) || !origin);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  optionsSuccessStatus: 200, // For legacy browser support
};

app.use(cors(corsOptions));

app.use(express.json());

// Enhanced logging for development
if (isDevelopment) {
  app.use((req, res, next) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(
      `🌐 [${timestamp}] ${req.method} ${req.path} - Origin: ${
        req.get("origin") || "none"
      }`
    );
    if (req.body && Object.keys(req.body).length > 0) {
      console.log("   📦 Body:", JSON.stringify(req.body, null, 2));
    }
    next();
  });
} else if (isProduction) {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Health check with enhanced info for development
app.get("/health", (req, res) => {
  const response = {
    status: "OK",
    message: "Dog App Backend is running!",
    environment: process.env.NODE_ENV || "unknown",
    timestamp: new Date().toISOString(),
  };

  if (isDevelopment) {
    response.server = {
      host: HOST,
      port: PORT,
      nodeVersion: process.version,
    };
  }

  res.json(response);
});

// Development-only endpoints
if (isDevelopment) {
  // Environment info endpoint
  app.get("/dev/env", (req, res) => {
    res.json({
      nodeEnv: process.env.NODE_ENV,
      port: PORT,
      host: HOST,
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
    });
  });

  // Test endpoint for quick API testing
  app.get("/dev/test", (req, res) => {
    res.json({
      message: "Development test endpoint working!",
      timestamp: new Date().toISOString(),
      headers: req.headers,
    });
  });
}

// Debug endpoint to test Firebase connection
app.get("/debug/firebase", async (req, res) => {
  try {
    console.log("🔍 Testing Firebase connection...");

    // Test basic Firebase connection
    const testDoc = await db.collection("test").doc("connection-test").get();
    console.log("✅ Firebase connection successful");

    res.json({
      success: true,
      message: "Firebase connection working",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Firebase connection failed:", error.message);
    res.status(500).json({
      success: false,
      error: "Firebase connection failed",
      details: error.message,
    });
  }
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/dogs", dogRoutes);
app.use("/api/dog-parks", parkRoutes);
app.use("/api/dog-breeds", breedRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/friend-requests", friendRequestRoutes);

// Note: Socket.IO and WebSocket functionality removed - now using Firebase Firestore real-time listeners

// Enhanced error handling for development
if (isDevelopment) {
  app.use((err, req, res, next) => {
    console.error("🚨 Development Error:", err);
    res.status(500).json({
      error: "Internal Server Error",
      message: err.message,
      stack: err.stack,
    });
  });
}

// Start server
server.listen(PORT, HOST, () => {
  const serverUrl = `http://${HOST}:${PORT}`;

  console.log(`\n🐕 Dog App Backend running on ${serverUrl}`);
  console.log(`📊 Health check: ${serverUrl}/health`);

  if (isDevelopment) {
    console.log(`\n🛠️  DEVELOPMENT MODE ACTIVE`);
    console.log(`🏠 Server listening on localhost only`);
    console.log(`🔧 Development endpoints:`);
    console.log(`   • Environment info: ${serverUrl}/dev/env`);
    console.log(`   • Test endpoint: ${serverUrl}/dev/test`);
    console.log(`   • Firebase debug: ${serverUrl}/debug/firebase`);
    console.log(`\n📱 For Expo development, use these URLs:`);
    console.log(`   • Web: http://localhost:${PORT}`);
    console.log(`   • Mobile: http://YOUR_LOCAL_IP:${PORT}`);
    console.log(
      `\n💡 To find your local IP, run: ipconfig getifaddr en0 (macOS) or ipconfig (Windows)`
    );
  } else if (isProduction) {
    console.log(`🌐 Production mode: Server accepting external connections`);
    console.log(`🔗 External access: http://YOUR_EC2_PUBLIC_IP:${PORT}/health`);
  }

  console.log(`\n📚 API Structure:`);
  console.log(`AUTH: ${serverUrl}/api/auth/*`);
  console.log(`DOGS: ${serverUrl}/api/dogs/*`);
  console.log(`PARKS: ${serverUrl}/api/dog-parks/*`);
  console.log(`BREEDS: ${serverUrl}/api/dog-breeds/*`);
  console.log(`🔥 REAL-TIME: Firebase Firestore listeners for park updates`);
  console.log(`📱 VERCEL-READY: Serverless compatible implementation`);
});

module.exports = { app, server };
