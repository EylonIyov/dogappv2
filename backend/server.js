require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { db, serverTimestamp } = require('./firebase-config');
const { uploadToS3, validateImageFile } = require('./dogUploadPicture');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

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

// Start server
app.listen(PORT, () => {
  console.log(`🐕 Dog App Backend running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
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
  console.log(`BREEDS:`);
  console.log(`  GET    http://localhost:${PORT}/api/dog-breeds`);
});