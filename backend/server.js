require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { db, serverTimestamp } = require('./firebase-config');
const { uploadToS3, validateImageFile } = require('./dogUploadPicture');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 8080;

// Environment check
const isProduction = process.env.NODE_ENV === 'production';

// Store SSE connections for real-time updates
const sseConnections = new Map(); // parkId -> Set of response objects

// Store active connections for each park
const parkConnections = new Map(); // parkId -> Set of socket IDs

// Middleware
app.use(cors({
  origin: isProduction ? process.env.FRONTEND_URL : '*',
  credentials: true
}));
app.use(express.json());

// Add request logging for production
if (isProduction) {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// JWT Secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

// Firestore collections
const usersCollection = db.collection('test_users');
const dogsCollection = db.collection('dogs'); // Changed to match your actual collection name
const dogParksCollection = db.collection('test_dogparks');
const friendRequestsCollection = db.collection('friend_requests'); // Add friend requests collection
const notificationsCollection = db.collection('notifications'); // Add notifications collection

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Helper function to calculate age from date of birth
const calculateAge = (dateOfBirth) => {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

// Helper function to broadcast park updates to SSE clients
const broadcastParkUpdate = async (parkId) => {
  const connections = sseConnections.get(parkId);
  if (!connections || connections.size === 0) {
    return;
  }

  try {
    // Get updated dogs list for this park
    const parkDoc = await dogParksCollection.doc(parkId).get();
    if (!parkDoc.exists) {
      return;
    }

    const parkData = parkDoc.data();
    const checkedInDogIds = parkData.checkedInDogs || [];
    
    if (checkedInDogIds.length === 0) {
      // Send empty list to all clients
      const updateData = JSON.stringify({
        type: 'park_update',
        parkId,
        dogs: []
      });

      connections.forEach(res => {
        try {
          res.write(`data: ${updateData}\n\n`);
        } catch (error) {
          console.log('Error sending SSE update to client:', error);
          connections.delete(res);
        }
      });
      return;
    }

    // Fetch all the dog documents
    const dogPromises = checkedInDogIds.map(dogId => dogsCollection.doc(dogId).get());
    const dogDocs = await Promise.all(dogPromises);
    
    const checkedInDogs = [];
    dogDocs.forEach((dogDoc, index) => {
      if (dogDoc.exists) {
        const dogData = dogDoc.data();
        checkedInDogs.push({
          id: dogDoc.id,
          name: dogData.name,
          breed: dogData.breed,
          age: dogData.age,
          emoji: dogData.emoji,
          owner_id: dogData.owner_id,
          energy_level: dogData.energy_level,
          photo_url: dogData.photo_url,
          friends: dogData.friends || [] // Include friends array
        });
      }
    });

    const updateData = JSON.stringify({
      type: 'park_update',
      parkId,
      dogs: checkedInDogs
    });

    console.log(`📡 Broadcasting park update to ${connections.size} clients for park ${parkId}`);

    // Send update to all connected clients for this park
    connections.forEach(res => {
      try {
        res.write(`data: ${updateData}\n\n`);
      } catch (error) {
        console.log('Error sending SSE update to client:', error);
        connections.delete(res);
      }
    });

  } catch (error) {
    console.error('Error broadcasting park update:', error);
  }
};

// Helper function to broadcast park updates via WebSocket
const broadcastParkUpdateWebSocket = async (parkId) => {
  const connections = parkConnections.get(parkId);
  if (!connections || connections.size === 0) {
    return;
  }

  try {
    // Get updated dogs list for this park
    const parkDoc = await dogParksCollection.doc(parkId).get();
    if (!parkDoc.exists) {
      return;
    }

    const parkData = parkDoc.data();
    const checkedInDogIds = parkData.checkedInDogs || [];
    
    if (checkedInDogIds.length === 0) {
      // Send empty list to all connected clients
      const updateData = {
        type: 'park_update',
        parkId,
        dogs: []
      };

      connections.forEach(socketId => {
        io.to(socketId).emit('parkUpdate', updateData);
      });
      
      console.log(`📡 Broadcasted empty park update to ${connections.size} WebSocket clients for park ${parkId}`);
      return;
    }

    // Fetch all the dog documents
    const dogPromises = checkedInDogIds.map(dogId => dogsCollection.doc(dogId).get());
    const dogDocs = await Promise.all(dogPromises);
    
    const checkedInDogs = [];
    dogDocs.forEach((dogDoc, index) => {
      if (dogDoc.exists) {
        const dogData = dogDoc.data();
        checkedInDogs.push({
          id: dogDoc.id,
          name: dogData.name,
          breed: dogData.breed,
          age: dogData.age,
          emoji: dogData.emoji,
          owner_id: dogData.owner_id,
          energy_level: dogData.energy_level,
          photo_url: dogData.photo_url,
          friends: dogData.friends || [] // Include friends array
        });
      }
    });

    const updateData = {
      type: 'park_update',
      parkId,
      dogs: checkedInDogs
    };

    console.log(`📡 Broadcasting park update to ${connections.size} WebSocket clients for park ${parkId}`);

    // Send update to all connected clients for this park
    connections.forEach(socketId => {
      io.to(socketId).emit('parkUpdate', updateData);
    });

  } catch (error) {
    console.error('Error broadcasting WebSocket park update:', error);
  }
};

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Dog App Backend is running!' });
});

// User Registration
app.post('/api/auth/register', async (req, res) => {
  try {
    const { 
      email, 
      password, 
      fullName, 
      dateOfBirth, 
      gender,
      profileImageUrl,
      preferences 
    } = req.body;

    // Validation - required fields
    if (!email || !password || !fullName || !dateOfBirth || !gender) {
      return res.status(400).json({ 
        error: 'Email, password, full name, date of birth, and gender are required' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    // Validate date of birth
    const birthDate = new Date(dateOfBirth);
    if (isNaN(birthDate.getTime())) {
      return res.status(400).json({ error: 'Please provide a valid date of birth' });
    }

    // Check if user already exists
    const existingUserSnapshot = await usersCollection.where('email', '==', email).get();
    if (!existingUserSnapshot.empty) {
      return res.status(409).json({ 
        error: 'An account with this email already exists. Would you like to sign in instead?',
        code: 'EMAIL_ALREADY_EXISTS'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Calculate age from date of birth
    const age = calculateAge(dateOfBirth);

    // Prepare user data according to the new schema
    const currentTime = serverTimestamp();
    const userData = {
      email,
      password: hashedPassword,
      fullName,
      dateOfBirth: new Date(dateOfBirth), // Convert to Firestore timestamp
      age,
      gender,
      uid: '', // Will be set to document ID after creation
      isActive: true,
      CreatedAt: currentTime,
      updatedAt: currentTime,
      lastLoginAt: currentTime,
      profileImageUrl: profileImageUrl || '/',
      preferences: {
        language: preferences?.language || 'he',
        notifications: preferences?.notifications !== undefined ? preferences.notifications : true,
        theme: preferences?.theme || 'black'
      }
    };

    // Create user in Firestore
    const userDoc = await usersCollection.add(userData);

    // Update the uid field with the document ID
    await usersCollection.doc(userDoc.id).update({
      uid: userDoc.id
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: userDoc.id, email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user data (excluding password)
    const { password: _, ...userResponse } = userData;
    
    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: userDoc.id,
        uid: userDoc.id,
        ...userResponse
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const userSnapshot = await usersCollection.where('email', '==', email).get();
    
    if (userSnapshot.empty) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const userDoc = userSnapshot.docs[0];
    const userData = userDoc.data();

    // Verify password
    const isValidPassword = await bcrypt.compare(password, userData.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: userDoc.id, email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Update last login
    await usersCollection.doc(userDoc.id).update({
      lastLoginAt: serverTimestamp()
    });

    // Return user data (excluding password)
    const { password: _, ...userDataResponse } = userData;

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: userDoc.id,
        uid: userDoc.id,
        ...userDataResponse
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user (protected route)
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const userDoc = await usersCollection.doc(req.user.userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data();
    
    // Return complete user profile (excluding password)
    const { password: _, ...userProfile } = userData;
    
    res.json({
      user: {
        id: userDoc.id,
        uid: userDoc.id,
        ...userProfile
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout (client-side token removal, but we can track it server-side if needed)
app.post('/api/auth/logout', authenticateToken, (req, res) => {
  res.json({ message: 'Logout successful' });
});

// DOG BREEDS API ENDPOINT

// Get all dog breeds from external API
app.get('/api/dog-breeds', async (req, res) => {
  try {
    const apiKey = process.env.DOG_BREEDS_API_KEY;
    const apiUrl = process.env.DOG_BREEDS_API_URL;
    
    if (!apiKey || apiKey === 'your-dog-breeds-api-key-here' || apiKey.length < 10) {
      // Return a fallback list if API key is not configured
      const fallbackBreeds = [
        'Golden Retriever', 'Labrador Retriever', 'German Shepherd', 'Bulldogs', 'Poodle',
        'Beagle', 'Rottweiler', 'Yorkshire Terrier', 'Dachshund', 'Siberian Husky',
        'Boxer', 'Great Dane', 'Chihuahua', 'Shih Tzu', 'Boston Terrier',
        'Bernese Mountain Dog', 'Cocker Spaniel', 'Border Collie', 'Australian Shepherd',
        'Mixed Breed', 'Unknown'
      ];
      
      return res.json({ 
        success: true, 
        breeds: fallbackBreeds.sort(),
        source: 'fallback'
      });
    }

    const response = await fetch(`${apiUrl}/breeds`, {
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch breeds from external API - Status: ${response.status}`);
    }

    const breedsData = await response.json();
    
    // Extract breed names and sort them
    const breedNames = breedsData.map(breed => breed.name).sort();
    
    res.json({ 
      success: true, 
      breeds: breedNames,
      source: 'api'
    });

  } catch (error) {
    console.error('Error fetching dog breeds:', error.message);
    
    // Return fallback breeds on error
    const fallbackBreeds = [
      'Golden Retriever', 'Labrador Retriever', 'German Shepherd', 'Bulldogs', 'Poodle',
      'Beagle', 'Rottweiler', 'Yorkshire Terrier', 'Dachshund', 'Siberian Husky',
      'Boxer', 'Great Dane', 'Chihuahua', 'Shih Tzu', 'Boston Terrier',
      'Bernese Mountain Dog', 'Cocker Spaniel', 'Border Collie', 'Australian Shepherd',
      'Mixed Breed', 'Unknown'
    ];
    
    res.json({ 
      success: true, 
      breeds: fallbackBreeds.sort(),
      source: 'fallback'
    });
  }
});

// DOG PARKS MANAGEMENT ROUTES

// Get all dog parks
app.get('/api/dog-parks', async (req, res) => {
  try {
    console.log('🏞️ Fetching dog parks from Firestore...');
    const parksSnapshot = await dogParksCollection.get();
    
    const parks = [];
    parksSnapshot.forEach(doc => {
      const docData = doc.data();
      // Remove any id field from document data to prevent conflicts
      const { id: _, ...cleanDocData } = docData;
      
      parks.push({
        id: doc.id,  // Always use Firestore document ID
        ...cleanDocData
      });
    });

    console.log('✅ Dog parks loaded successfully:', parks.length, 'parks found');
    res.json({ 
      success: true,
      parks 
    });
  } catch (error) {
    console.error('❌ Error fetching dog parks:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// Add a new dog park (protected route)
app.post('/api/dog-parks', authenticateToken, async (req, res) => {
  try {
    const { name, address, amenities } = req.body;

    // Validation
    if (!name || !address) {
      return res.status(400).json({ 
        success: false,
        error: 'Name and address are required' 
      });
    }

    console.log('🏞️ Adding new dog park to Firestore...');
    const parkDoc = await dogParksCollection.add({
      name,
      address,
      amenities: amenities || [],
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });

    console.log('✅ Dog park added successfully with ID:', parkDoc.id);
    res.status(201).json({
      success: true,
      message: 'Dog park added successfully',
      park: {
        id: parkDoc.id,
        name,
        address,
        amenities: amenities || []
      }
    });
  } catch (error) {
    console.error('❌ Error adding dog park:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// Update a dog park (protected route)
app.put('/api/dog-parks/:parkId', authenticateToken, async (req, res) => {
  try {
    const { parkId } = req.params;
    const { name, address, amenities } = req.body;

    console.log('🏞️ Updating dog park in Firestore...');
    const updateData = {
      updated_at: serverTimestamp()
    };

    if (name !== undefined) updateData.name = name;
    if (address !== undefined) updateData.address = address;
    if (amenities !== undefined) updateData.amenities = amenities;

    await dogParksCollection.doc(parkId).update(updateData);

    console.log('✅ Dog park updated successfully');
    res.json({
      success: true,
      message: 'Dog park updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating dog park:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// Delete a dog park (protected route)
app.delete('/api/dog-parks/:parkId', authenticateToken, async (req, res) => {
  try {
    const { parkId } = req.params;

    console.log('🏞️ Deleting dog park from Firestore...');
    await dogParksCollection.doc(parkId).delete();

    console.log('✅ Dog park deleted successfully');
    res.json({
      success: true,
      message: 'Dog park deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting dog park:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// Check in dogs to a park (protected route)
app.post('/api/dog-parks/:parkId/checkin', authenticateToken, async (req, res) => {
  try {
    const { parkId } = req.params;
    const { dogIds } = req.body;

    // Validation
    if (!dogIds || !Array.isArray(dogIds) || dogIds.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'dogIds array is required and must contain at least one dog ID' 
      });
    }

    // Verify the park exists
    const parkDoc = await dogParksCollection.doc(parkId).get();
    
    if (!parkDoc.exists) {
      return res.status(404).json({ 
        success: false,
        error: 'Park not found' 
      });
    }

    // Verify that all dogs belong to the authenticated user
    const dogPromises = dogIds.map(dogId => dogsCollection.doc(dogId).get());
    const dogDocs = await Promise.all(dogPromises);
    
    for (let i = 0; i < dogDocs.length; i++) {
      const dogDoc = dogDocs[i];
      if (!dogDoc.exists || dogDoc.data().owner_id !== req.user.userId) {
        return res.status(403).json({ 
          success: false,
          error: `Dog with ID ${dogIds[i]} not found or not authorized` 
        });
      }
    }

    // Get current checked in dogs or initialize empty array
    const parkData = parkDoc.data();
    const currentCheckedInDogs = parkData.checkedInDogs || [];
    
    // Add new dog IDs to the array (avoid duplicates)
    const updatedCheckedInDogs = [...new Set([...currentCheckedInDogs, ...dogIds])];

    // Update the park with new checked in dogs
    await dogParksCollection.doc(parkId).update({
      checkedInDogs: updatedCheckedInDogs,
      updated_at: serverTimestamp()
    });

    // Broadcast the update to SSE clients
    broadcastParkUpdate(parkId);
    // Broadcast the update to WebSocket clients
    broadcastParkUpdateWebSocket(parkId);

    console.log('✅ Dogs checked in successfully at park:', parkId);
    res.json({
      success: true,
      message: 'Dogs checked in successfully',
      checkedInDogs: updatedCheckedInDogs
    });
  } catch (error) {
    console.error('❌ Error checking in dogs:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// Check out dogs from a park (protected route)
app.post('/api/dog-parks/:parkId/checkout', authenticateToken, async (req, res) => {
  try {
    const { parkId } = req.params;
    const { dogIds } = req.body;

    // Validation
    if (!dogIds || !Array.isArray(dogIds) || dogIds.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'dogIds array is required and must contain at least one dog ID' 
      });
    }

    console.log('🚪 Checking out dogs from park:', parkId, 'Dogs:', dogIds);

    // Verify the park exists
    const parkDoc = await dogParksCollection.doc(parkId).get();
    
    if (!parkDoc.exists) {
      return res.status(404).json({ 
        success: false,
        error: 'Park not found' 
      });
    }

    // Verify that all dogs belong to the authenticated user
    const dogPromises = dogIds.map(dogId => dogsCollection.doc(dogId).get());
    const dogDocs = await Promise.all(dogPromises);
    
    for (let i = 0; i < dogDocs.length; i++) {
      const dogDoc = dogDocs[i];
      if (!dogDoc.exists || dogDoc.data().owner_id !== req.user.userId) {
        return res.status(403).json({ 
          success: false,
          error: `Dog with ID ${dogIds[i]} not found or not authorized` 
        });
      }
    }

    // Get current checked in dogs
    const parkData = parkDoc.data();
    const currentCheckedInDogs = parkData.checkedInDogs || [];
    
    console.log('🔍 DEBUG - Current checked in dogs:', currentCheckedInDogs);
    console.log('🔍 DEBUG - Dogs to remove:', dogIds);
    console.log('🔍 DEBUG - Types:', {
      currentCheckedInDogs: currentCheckedInDogs.map(id => ({ value: id, type: typeof id })),
      dogIdsToRemove: dogIds.map(id => ({ value: id, type: typeof id }))
    });
    
    // Remove the dog IDs from the array
    const updatedCheckedInDogs = currentCheckedInDogs.filter(dogId => !dogIds.includes(dogId));
    
    console.log('🔍 DEBUG - Updated checked in dogs after filter:', updatedCheckedInDogs);

    // Update the park with the updated checked in dogs list
    await dogParksCollection.doc(parkId).update({
      checkedInDogs: updatedCheckedInDogs,
      updated_at: serverTimestamp()
    });

    // Broadcast the update to SSE clients
    broadcastParkUpdate(parkId);
    // Broadcast the update to WebSocket clients
    broadcastParkUpdateWebSocket(parkId);

    console.log('✅ Dogs checked out successfully from park:', parkId);
    res.json({
      success: true,
      message: 'Dogs checked out successfully',
      checkedInDogs: updatedCheckedInDogs
    });
  } catch (error) {
    console.error('❌ Error checking out dogs:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// Get all dogs checked into a park (protected route)
app.get('/api/dog-parks/:parkId/dogs', authenticateToken, async (req, res) => {
  try {
    const { parkId } = req.params;

    console.log('🐕 Getting dogs checked into park:', parkId);

    // Verify the park exists
    const parkDoc = await dogParksCollection.doc(parkId).get();
    
    if (!parkDoc.exists) {
      return res.status(404).json({ 
        success: false,
        error: 'Park not found' 
      });
    }

    // Get the list of checked in dog IDs
    const parkData = parkDoc.data();
    const checkedInDogIds = parkData.checkedInDogs || [];
    
    if (checkedInDogIds.length === 0) {
      return res.json({
        success: true,
        dogs: []
      });
    }

    // Fetch all the dog documents
    const dogPromises = checkedInDogIds.map(dogId => dogsCollection.doc(dogId).get());
    const dogDocs = await Promise.all(dogPromises);
    
    const checkedInDogs = [];
    dogDocs.forEach((dogDoc, index) => {
      if (dogDoc.exists) {
        const dogData = dogDoc.data();
        checkedInDogs.push({
          id: dogDoc.id,
          name: dogData.name,
          breed: dogData.breed,
          age: dogData.age,
          emoji: dogData.emoji,
          owner_id: dogData.owner_id,
          energy_level: dogData.energy_level,
          photo_url: dogData.photo_url,
          friends: dogData.friends || [] // Include friends array
        });
      } else {
        console.log(`Dog with ID ${checkedInDogIds[index]} not found in database`);
      }
    });

    console.log('✅ Found', checkedInDogs.length, 'dogs checked into park');
    res.json({
      success: true,
      dogs: checkedInDogs
    });
  } catch (error) {
    console.error('❌ Error getting dogs in park:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// DOG MANAGEMENT ROUTES

// Get all dogs for the authenticated user
app.get('/api/dogs', authenticateToken, async (req, res) => {
  try {
    const dogsSnapshot = await dogsCollection.where('owner_id', '==', req.user.userId).get(); // Changed from userId to owner_id
    
    const userDogs = [];
    dogsSnapshot.forEach(doc => {
      userDogs.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json({ dogs: userDogs });
  } catch (error) {
    console.error('Get dogs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a new dog for the authenticated user
app.post('/api/dogs', authenticateToken, async (req, res) => {
  try {
    const { name, breed, age, energyLevel, playStyle, emoji } = req.body;

    // Validation
    if (!name || !breed || !age) {
      return res.status(400).json({ error: 'Name, breed, and age are required' });
    }

    // Create new dog in Firestore matching your schema
    const dogDoc = await dogsCollection.add({
      owner_id: req.user.userId, // Changed from userId to owner_id to match schema
      name,
      breed,
      age: parseFloat(age), // Allow decimals for age
      energy_level: energyLevel || '', // Changed from energyLevel to energy_level
      play_style: playStyle || [], // Changed from playStyle to play_style (array)
      size: '', // Add missing schema fields with defaults
      photo_url: '', 
      friends: [],
      gets_along_with: [],
      created_at: serverTimestamp(), // Changed from createdAt to created_at
      updated_at: serverTimestamp()  // Changed from updatedAt to updated_at
    });

    // Get the created dog data
    const createdDog = await dogDoc.get();
    const dogData = createdDog.data();

    res.status(201).json({
      message: 'Dog added successfully',
      dog: {
        id: dogDoc.id,
        ...dogData
      }
    });

  } catch (error) {
    console.error('Add dog error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a dog (only if it belongs to the authenticated user)
app.put('/api/dogs/:dogId', authenticateToken, async (req, res) => {
  try {
    const { dogId } = req.params;
    const { name, breed, age, energyLevel, playStyle, emoji } = req.body;

    // Find the dog and verify ownership
    const dogDoc = await dogsCollection.doc(dogId).get();
    
    if (!dogDoc.exists || dogDoc.data().owner_id !== req.user.userId) { // Changed userId to owner_id
      return res.status(404).json({ error: 'Dog not found or not authorized' });
    }

    // Prepare update data matching your schema
    const updateData = {
      updated_at: serverTimestamp() // Changed updatedAt to updated_at
    };

    if (name !== undefined) updateData.name = name;
    if (breed !== undefined) updateData.breed = breed;
    if (age !== undefined) updateData.age = parseFloat(age);
    if (energyLevel !== undefined) updateData.energy_level = energyLevel; // Changed to energy_level
    if (playStyle !== undefined) updateData.play_style = playStyle; // Changed to play_style
    if (emoji !== undefined) updateData.emoji = emoji;

    // Update the dog
    await dogsCollection.doc(dogId).update(updateData);

    // Get updated dog data
    const updatedDog = await dogsCollection.doc(dogId).get();
    const updatedData = updatedDog.data();

    res.json({
      message: 'Dog updated successfully',
      dog: {
        id: dogId,
        ...updatedData
      }
    });

  } catch (error) {
    console.error('Update dog error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a dog (only if it belongs to the authenticated user)
app.delete('/api/dogs/:dogId', authenticateToken, async (req, res) => {
  try {
    const { dogId } = req.params;

    // Find the dog and verify ownership
    const dogDoc = await dogsCollection.doc(dogId).get();
    
    if (!dogDoc.exists || dogDoc.data().owner_id !== req.user.userId) { // Changed userId to owner_id
      return res.status(404).json({ error: 'Dog not found or not authorized' });
    }

    // Delete the dog
    await dogsCollection.doc(dogId).delete();

    res.json({ message: 'Dog deleted successfully' });

  } catch (error) {
    console.error('Delete dog error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific dog (only if it belongs to the authenticated user)
app.get('/api/dogs/:dogId', authenticateToken, async (req, res) => {
  try {
    const { dogId } = req.params;

    const dogDoc = await dogsCollection.doc(dogId).get();
    
    if (!dogDoc.exists || dogDoc.data().owner_id !== req.user.userId) { // Changed userId to owner_id
      return res.status(404).json({ error: 'Dog not found or not authorized' });
    }

    const dogData = dogDoc.data();

    res.json({ 
      dog: {
        id: dogId,
        ...dogData
      }
    });

  } catch (error) {
    console.error('Get dog error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload dog photo (for authenticated users)
app.post('/api/dogs/:dogId/photo', authenticateToken, upload.single('photo'), async (req, res) => {
  try {
    const { dogId } = req.params;
    console.log('📸 Photo upload request received for dog ID:', dogId);

    // Find the dog and verify ownership
    const dogDoc = await dogsCollection.doc(dogId).get();
    
    if (!dogDoc.exists || dogDoc.data().owner_id !== req.user.userId) {
      console.log('❌ Dog not found or unauthorized access for dog ID:', dogId);
      return res.status(404).json({ error: 'Dog not found or not authorized' });
    }

    // Validate file upload
    if (!req.file) {
      console.log('❌ No photo file uploaded');
      return res.status(400).json({ error: 'No photo file uploaded' });
    }

    console.log('📁 File received:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    // Validate image file
    const validation = validateImageFile(req.file);
    if (!validation.valid) {
      console.log('❌ File validation failed:', validation.error);
      return res.status(400).json({ error: validation.error });
    }

    console.log('✅ File validation passed, uploading to S3...');

    // Upload to S3
    const uploadResult = await uploadToS3(req.file, req.user.userId);
    
    if (!uploadResult.success) {
      console.log('❌ S3 upload failed:', uploadResult.error);
      return res.status(500).json({ error: uploadResult.error });
    }

    console.log('✅ S3 upload successful, photo URL:', uploadResult.photoUrl);

    // Update the dog document with the new photo URL
    await dogsCollection.doc(dogId).update({
      photo_url: uploadResult.photoUrl,
      updated_at: serverTimestamp()
    });

    console.log('✅ Firestore updated with photo URL for dog:', dogId);

    res.json({
      message: 'Photo uploaded successfully',
      photoUrl: uploadResult.photoUrl
    });

  } catch (error) {
    console.error('💥 Upload photo error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// FRIEND REQUEST MANAGEMENT ROUTES

// Get friends list for a specific dog
app.get('/api/dogs/:dogId/friends', authenticateToken, async (req, res) => {
  try {
    const { dogId } = req.params;

    console.log(`👥 Getting friends for dog: ${dogId}`);

    // Get the dog document and verify ownership
    const dogDoc = await dogsCollection.doc(dogId).get();
    
    if (!dogDoc.exists || dogDoc.data().owner_id !== req.user.userId) {
      return res.status(404).json({ 
        success: false,
        error: 'Dog not found or not authorized' 
      });
    }

    const dogData = dogDoc.data();
    const friendIds = dogData.friends || [];

    if (friendIds.length === 0) {
      return res.json({
        success: true,
        friends: [],
        friendsCount: 0
      });
    }

    // Fetch friend dog documents
    const friendPromises = friendIds.map(friendId => dogsCollection.doc(friendId).get());
    const friendDocs = await Promise.all(friendPromises);
    
    const friends = [];
    friendDocs.forEach((friendDoc, index) => {
      if (friendDoc.exists) {
        const friendData = friendDoc.data();
        friends.push({
          id: friendDoc.id,
          name: friendData.name,
          breed: friendData.breed,
          age: friendData.age,
          emoji: friendData.emoji,
          photo_url: friendData.photo_url,
          energy_level: friendData.energy_level,
          play_style: friendData.play_style || [],
          owner_id: friendData.owner_id
        });
      } else {
        console.log(`Friend dog with ID ${friendIds[index]} not found in database`);
      }
    });

    console.log(`✅ Found ${friends.length} friends for dog ${dogId}`);

    res.json({
      success: true,
      friends,
      friendsCount: friends.length
    });

  } catch (error) {
    console.error('❌ Error getting dog friends:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// Send a friend request (replaces direct friend adding)
app.post('/api/dogs/:dogId/friends/:friendDogId', authenticateToken, async (req, res) => {
  try {
    const { dogId, friendDogId } = req.params;

    console.log(`🤝 Sending friend request: ${dogId} wants to befriend ${friendDogId}`);

    // Validation
    if (dogId === friendDogId) {
      return res.status(400).json({ 
        success: false,
        error: 'A dog cannot befriend itself' 
      });
    }

    // Get both dog documents
    const [myDogDoc, friendDogDoc] = await Promise.all([
      dogsCollection.doc(dogId).get(),
      dogsCollection.doc(friendDogId).get()
    ]);

    // Verify my dog exists and belongs to the authenticated user
    if (!myDogDoc.exists || myDogDoc.data().owner_id !== req.user.userId) {
      return res.status(404).json({ 
        success: false,
        error: 'Your dog not found or not authorized' 
      });
    }

    // Verify friend dog exists
    if (!friendDogDoc.exists) {
      return res.status(404).json({ 
        success: false,
        error: 'Friend dog not found' 
      });
    }

    const myDogData = myDogDoc.data();
    const friendDogData = friendDogDoc.data();

    // Check if both dogs are currently in the same park
    const parksSnapshot = await dogParksCollection.get();
    let bothDogsInSamePark = false;
    let parkName = '';

    for (const parkDoc of parksSnapshot.docs) {
      const parkData = parkDoc.data();
      const checkedInDogs = parkData.checkedInDogs || [];
      
      if (checkedInDogs.includes(dogId) && checkedInDogs.includes(friendDogId)) {
        bothDogsInSamePark = true;
        parkName = parkData.name;
        break;
      }
    }

    if (!bothDogsInSamePark) {
      return res.status(400).json({ 
        success: false,
        error: 'Dogs can only send friend requests when they are both checked into the same park' 
      });
    }

    // Check if they are already friends
    const currentFriends = myDogData.friends || [];
    if (currentFriends.includes(friendDogId)) {
      return res.status(400).json({ 
        success: false,
        error: `${myDogData.name} and ${friendDogData.name} are already friends!` 
      });
    }

    // Check if a friend request already exists (in either direction)
    const existingRequestsSnapshot = await friendRequestsCollection
      .where('status', '==', 'pending')
      .get();

    let requestExists = false;
    existingRequestsSnapshot.forEach(doc => {
      const requestData = doc.data();
      if ((requestData.from_dog_id === dogId && requestData.to_dog_id === friendDogId) ||
          (requestData.from_dog_id === friendDogId && requestData.to_dog_id === dogId)) {
        requestExists = true;
      }
    });

    if (requestExists) {
      return res.status(400).json({ 
        success: false,
        error: 'A friend request already exists between these dogs' 
      });
    }

    // Create friend request
    const friendRequestDoc = await friendRequestsCollection.add({
      from_dog_id: dogId,
      to_dog_id: friendDogId,
      from_user_id: req.user.userId,
      to_user_id: friendDogData.owner_id,
      status: 'pending',
      park_name: parkName,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });

    // Create notification for the friend dog's owner
    await notificationsCollection.add({
      user_id: friendDogData.owner_id,
      type: 'friend_request',
      title: 'New Friend Request!',
      message: `${myDogData.name} wants to be friends with ${friendDogData.name} at ${parkName}`,
      data: {
        friend_request_id: friendRequestDoc.id,
        from_dog_id: dogId,
        from_dog_name: myDogData.name,
        to_dog_id: friendDogId,
        to_dog_name: friendDogData.name,
        park_name: parkName
      },
      read: false,
      created_at: serverTimestamp()
    });

    // Broadcast notification via WebSocket to the recipient if they're connected
    io.emit('notification', {
      user_id: friendDogData.owner_id,
      type: 'friend_request',
      title: 'New Friend Request!',
      message: `${myDogData.name} wants to be friends with ${friendDogData.name} at ${parkName}`,
      friend_request_id: friendRequestDoc.id
    });

    console.log(`✅ Friend request sent: ${myDogData.name} → ${friendDogData.name} at ${parkName}`);

    res.json({
      success: true,
      message: `Friend request sent to ${friendDogData.name}'s owner! 🐕💌`,
      friend_request_id: friendRequestDoc.id,
      parkName
    });

  } catch (error) {
    console.error('❌ Error sending friend request:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// Remove a friend from a dog's friends list
app.delete('/api/dogs/:dogId/friends/:friendDogId', authenticateToken, async (req, res) => {
  try {
    const { dogId, friendDogId } = req.params;

    console.log(`💔 Removing friend: ${dogId} unfriending ${friendDogId}`);

    // Validation
    if (dogId === friendDogId) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid operation' 
      });
    }

    // Get both dog documents
    const [myDogDoc, friendDogDoc] = await Promise.all([
      dogsCollection.doc(dogId).get(),
      dogsCollection.doc(friendDogId).get()
    ]);

    // Verify my dog exists and belongs to the authenticated user
    if (!myDogDoc.exists || myDogDoc.data().owner_id !== req.user.userId) {
      return res.status(404).json({ 
        success: false,
        error: 'Your dog not found or not authorized' 
      });
    }

    // Verify friend dog exists
    if (!friendDogDoc.exists) {
      return res.status(404).json({ 
        success: false,
        error: 'Friend dog not found' 
      });
    }

    const myDogData = myDogDoc.data();
    const friendDogData = friendDogDoc.data();

    // Check if they are actually friends
    const myDogFriends = myDogData.friends || [];
    const friendDogFriends = friendDogData.friends || [];

    if (!myDogFriends.includes(friendDogId)) {
      return res.status(400).json({ 
        success: false,
        error: `${myDogData.name} and ${friendDogData.name} are not friends` 
      });
    }

    // Remove each dog from the other's friends list
    const updatedMyDogFriends = myDogFriends.filter(id => id !== friendDogId);
    const updatedFriendDogFriends = friendDogFriends.filter(id => id !== dogId);

    await Promise.all([
      dogsCollection.doc(dogId).update({
        friends: updatedMyDogFriends,
        updated_at: serverTimestamp()
      }),
      dogsCollection.doc(friendDogId).update({
        friends: updatedFriendDogFriends,
        updated_at: serverTimestamp()
      })
    ]);

    console.log(`✅ Friendship removed: ${myDogData.name} ↔ ${friendDogData.name} are no longer friends`);

    res.json({
      success: true,
      message: `${myDogData.name} and ${friendDogData.name} are no longer friends`
    });

  } catch (error) {
    console.error('❌ Error removing friend:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// Accept a friend request
app.post('/api/friend-requests/:requestId/accept', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;

    console.log(`✅ Accepting friend request: ${requestId}`);

    // Get the friend request
    const requestDoc = await friendRequestsCollection.doc(requestId).get();
    
    if (!requestDoc.exists) {
      return res.status(404).json({ 
        success: false,
        error: 'Friend request not found' 
      });
    }

    const requestData = requestDoc.data();

    // Verify the request is for the authenticated user
    if (requestData.to_user_id !== req.user.userId) {
      return res.status(403).json({ 
        success: false,
        error: 'Not authorized to accept this friend request' 
      });
    }

    // Verify the request is still pending
    if (requestData.status !== 'pending') {
      return res.status(400).json({ 
        success: false,
        error: 'Friend request is no longer pending' 
      });
    }

    // Get both dog documents
    const [fromDogDoc, toDogDoc] = await Promise.all([
      dogsCollection.doc(requestData.from_dog_id).get(),
      dogsCollection.doc(requestData.to_dog_id).get()
    ]);

    if (!fromDogDoc.exists || !toDogDoc.exists) {
      return res.status(404).json({ 
        success: false,
        error: 'One or both dogs not found' 
      });
    }

    const fromDogData = fromDogDoc.data();
    const toDogData = toDogDoc.data();

    // Add each dog to the other's friends list
    const fromDogFriends = fromDogData.friends || [];
    const toDogFriends = toDogData.friends || [];

    await Promise.all([
      dogsCollection.doc(requestData.from_dog_id).update({
        friends: [...fromDogFriends, requestData.to_dog_id],
        updated_at: serverTimestamp()
      }),
      dogsCollection.doc(requestData.to_dog_id).update({
        friends: [...toDogFriends, requestData.from_dog_id],
        updated_at: serverTimestamp()
      })
    ]);

    // Update friend request status
    await friendRequestsCollection.doc(requestId).update({
      status: 'accepted',
      updated_at: serverTimestamp()
    });

    // Create notification for the requester
    await notificationsCollection.add({
      user_id: requestData.from_user_id,
      type: 'friend_request_accepted',
      title: 'Friend Request Accepted!',
      message: `${toDogData.name}'s owner accepted your friend request! ${fromDogData.name} and ${toDogData.name} are now friends! 🐕❤️🐕`,
      data: {
        friend_request_id: requestId,
        from_dog_id: requestData.from_dog_id,
        from_dog_name: fromDogData.name,
        to_dog_id: requestData.to_dog_id,
        to_dog_name: toDogData.name
      },
      read: false,
      created_at: serverTimestamp()
    });

    // Broadcast notification to the requester
    io.emit('notification', {
      user_id: requestData.from_user_id,
      type: 'friend_request_accepted',
      title: 'Friend Request Accepted!',
      message: `${toDogData.name}'s owner accepted your friend request!`
    });

    console.log(`✅ Friend request accepted: ${fromDogData.name} ↔ ${toDogData.name} are now friends`);

    res.json({
      success: true,
      message: `${fromDogData.name} and ${toDogData.name} are now friends! 🐕❤️🐕`,
      from_dog: { id: requestData.from_dog_id, name: fromDogData.name },
      to_dog: { id: requestData.to_dog_id, name: toDogData.name }
    });

  } catch (error) {
    console.error('❌ Error accepting friend request:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// Decline a friend request
app.post('/api/friend-requests/:requestId/decline', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;

    console.log(`❌ Declining friend request: ${requestId}`);

    // Get the friend request
    const requestDoc = await friendRequestsCollection.doc(requestId).get();
    
    if (!requestDoc.exists) {
      return res.status(404).json({ 
        success: false,
        error: 'Friend request not found' 
      });
    }

    const requestData = requestDoc.data();

    // Verify the request is for the authenticated user
    if (requestData.to_user_id !== req.user.userId) {
      return res.status(403).json({ 
        success: false,
        error: 'Not authorized to decline this friend request' 
      });
    }

    // Verify the request is still pending
    if (requestData.status !== 'pending') {
      return res.status(400).json({ 
        success: false,
        error: 'Friend request is no longer pending' 
      });
    }

    // Update friend request status
    await friendRequestsCollection.doc(requestId).update({
      status: 'declined',
      updated_at: serverTimestamp()
    });

    console.log(`✅ Friend request declined: ${requestId}`);

    res.json({
      success: true,
      message: 'Friend request declined'
    });

  } catch (error) {
    console.error('❌ Error declining friend request:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// Get notifications for the authenticated user
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    console.log(`📱 Getting notifications for user: ${req.user.userId}`);

    const notificationsSnapshot = await notificationsCollection
      .where('user_id', '==', req.user.userId)
      .orderBy('created_at', 'desc')
      .limit(50)
      .get();

    const notifications = [];
    notificationsSnapshot.forEach(doc => {
      notifications.push({
        id: doc.id,
        ...doc.data()
      });
    });

    console.log(`✅ Found ${notifications.length} notifications`);

    res.json({
      success: true,
      notifications,
      unread_count: notifications.filter(n => !n.read).length
    });

  } catch (error) {
    console.error('❌ Error getting notifications:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// Mark notification as read
app.put('/api/notifications/:notificationId/read', authenticateToken, async (req, res) => {
  try {
    const { notificationId } = req.params;

    console.log(`📖 Marking notification as read: ${notificationId}`);

    // Get the notification
    const notificationDoc = await notificationsCollection.doc(notificationId).get();
    
    if (!notificationDoc.exists) {
      return res.status(404).json({ 
        success: false,
        error: 'Notification not found' 
      });
    }

    const notificationData = notificationDoc.data();

    // Verify the notification belongs to the authenticated user
    if (notificationData.user_id !== req.user.userId) {
      return res.status(403).json({ 
        success: false,
        error: 'Not authorized to update this notification' 
      });
    }

    // Update notification
    await notificationsCollection.doc(notificationId).update({
      read: true,
      updated_at: serverTimestamp()
    });

    console.log(`✅ Notification marked as read: ${notificationId}`);

    res.json({
      success: true,
      message: 'Notification marked as read'
    });

  } catch (error) {
    console.error('❌ Error marking notification as read:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// Get pending friend requests for the authenticated user
app.get('/api/friend-requests/pending', authenticateToken, async (req, res) => {
  try {
    console.log(`🤝 Getting pending friend requests for user: ${req.user.userId}`);

    // Simplified query without orderBy to avoid composite index requirement
    const requestsSnapshot = await friendRequestsCollection
      .where('to_user_id', '==', req.user.userId)
      .where('status', '==', 'pending')
      .get();

    const pendingRequests = [];
    
    for (const doc of requestsSnapshot.docs) {
      const requestData = doc.data();
      
      // Get the dog information for the request
      const [fromDogDoc, toDogDoc] = await Promise.all([
        dogsCollection.doc(requestData.from_dog_id).get(),
        dogsCollection.doc(requestData.to_dog_id).get()
      ]);

      if (fromDogDoc.exists && toDogDoc.exists) {
        const fromDogData = fromDogDoc.data();
        const toDogData = toDogDoc.data();

        pendingRequests.push({
          id: doc.id,
          ...requestData,
          from_dog: {
            id: requestData.from_dog_id,
            name: fromDogData.name,
            breed: fromDogData.breed,
            emoji: fromDogData.emoji,
            photo_url: fromDogData.photo_url
          },
          to_dog: {
            id: requestData.to_dog_id,
            name: toDogData.name,
            breed: toDogData.breed,
            emoji: toDogData.emoji,
            photo_url: toDogData.photo_url
          }
        });
      }
    }

    // Sort by created_at in JavaScript instead of Firestore
    pendingRequests.sort((a, b) => {
      const aTime = a.created_at?.toDate?.() || new Date(0);
      const bTime = b.created_at?.toDate?.() || new Date(0);
      return bTime - aTime; // Newest first
    });

    console.log(`✅ Found ${pendingRequests.length} pending friend requests`);

    res.json({
      success: true,
      requests: pendingRequests,
      count: pendingRequests.length
    });

  } catch (error) {
    console.error('❌ Error getting pending friend requests:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// SSE endpoint for real-time park updates
app.get('/api/dog-parks/:parkId/live', authenticateToken, (req, res) => {
  const { parkId } = req.params;
  
  console.log(`📡 New SSE connection for park ${parkId}`);

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Initialize connections set for this park if it doesn't exist
  if (!sseConnections.has(parkId)) {
    sseConnections.set(parkId, new Set());
  }

  // Add this connection to the park's connections
  const parkConnections = sseConnections.get(parkId);
  parkConnections.add(res);

  // Send initial connection confirmation
  res.write(`data: ${JSON.stringify({ type: 'connected', parkId })}\n\n`);

  // Send current dogs list immediately
  broadcastParkUpdate(parkId);

  // Handle client disconnect
  req.on('close', () => {
    console.log(`📡 SSE connection closed for park ${parkId}`);
    parkConnections.delete(res);
    
    // Clean up empty connection sets
    if (parkConnections.size === 0) {
      sseConnections.delete(parkId);
    }
  });

  req.on('error', (error) => {
    console.log('SSE connection error:', error);
    parkConnections.delete(res);
  });
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('🟢 New WebSocket connection:', socket.id);

  // Handle park join request
  socket.on('joinPark', (parkId) => {
    console.log(`🏞️ Socket ${socket.id} joining park ${parkId}`);
    
    // Initialize park connection set if it doesn't exist
    if (!parkConnections.has(parkId)) {
      parkConnections.set(parkId, new Set());
    }

    // Add socket to park's connection set
    const connections = parkConnections.get(parkId);
    connections.add(socket.id);

    // Send current dogs list to the newly joined client
    broadcastParkUpdate(parkId);

    // Handle socket disconnect
    socket.on('disconnect', () => {
      console.log('🔴 Socket disconnected:', socket.id);
      connections.delete(socket.id);

      // Clean up empty connection sets
      if (connections.size === 0) {
        parkConnections.delete(parkId);
      }
    });
  });

  // Handle park leave request
  socket.on('leavePark', (parkId) => {
    console.log(`🚪 Socket ${socket.id} leaving park ${parkId}`);
    
    const connections = parkConnections.get(parkId);
    if (connections) {
      connections.delete(socket.id);

      // Clean up empty connection sets
      if (connections.size === 0) {
        parkConnections.delete(parkId);
      }
    }
  });
});

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
  
  console.log(`API Endpoints:`);
  console.log(`AUTH:`);
  console.log(`  POST http://localhost:${PORT}/api/auth/register`);
  console.log(`  POST http://localhost:${PORT}/api/auth/login`);
  console.log(`  GET  http://localhost:${PORT}/api/auth/me`);
  console.log(`  POST http://localhost:${PORT}/api/auth/logout`);
  console.log(`DOGS:`);
  console.log(`  GET    http://localhost:${PORT}/api/dogs`);
  console.log(`  POST   http://localhost:${PORT}/api/dogs`);
  console.log(`  GET    http://localhost:${PORT}/api/dogs/:dogId`);
  console.log(`  PUT    http://localhost:${PORT}/api/dogs/:dogId`);
  console.log(`  DELETE http://localhost:${PORT}/api/dogs/:dogId`);
  console.log(`  POST   http://localhost:${PORT}/api/dogs/:dogId/photo`);
  console.log(`  POST   http://localhost:${PORT}/api/dogs/:dogId/friends/:friendDogId`);
  console.log(`  DELETE http://localhost:${PORT}/api/dogs/:dogId/friends/:friendDogId`);
  console.log(`  GET    http://localhost:${PORT}/api/dogs/:dogId/friends`);
  console.log(`  POST   http://localhost:${PORT}/api/friend-requests/:requestId/accept`);
  console.log(`  POST   http://localhost:${PORT}/api/friend-requests/:requestId/decline`);
  console.log(`  GET    http://localhost:${PORT}/api/friend-requests/pending`);
  console.log(`  GET    http://localhost:${PORT}/api/notifications`);
  console.log(`  PUT    http://localhost:${PORT}/api/notifications/:notificationId/read`);
  console.log(`BREEDS:`);
  console.log(`  GET    http://localhost:${PORT}/api/dog-breeds`);
  console.log(`PARKS:`);
  console.log(`  GET    http://localhost:${PORT}/api/dog-parks`);
  console.log(`  POST   http://localhost:${PORT}/api/dog-parks`);
  console.log(`  PUT    http://localhost:${PORT}/api/dog-parks/:parkId`);
  console.log(`  DELETE http://localhost:${PORT}/api/dog-parks/:parkId`);
  console.log(`  POST   http://localhost:${PORT}/api/dog-parks/:parkId/checkin`);
  console.log(`  POST   http://localhost:${PORT}/api/dog-parks/:parkId/checkout`);
  console.log(`  GET    http://localhost:${PORT}/api/dog-parks/:parkId/dogs`);
  console.log(`  GET    http://localhost:${PORT}/api/dog-parks/:parkId/live`); // SSE endpoint
  console.log(`WEBSOCKET:`);
  console.log(`  Real-time updates available via Socket.IO`);
  console.log(`  Events: joinPark, leavePark, parkUpdate`);
});