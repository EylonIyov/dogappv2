const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

// Import Firebase and S3 configurations
const { db, serverTimestamp } = require('../firebase-config');
const { uploadToS3, validateImageFile } = require('../dogUploadPicture');

const app = express();

// Firestore collections
const usersCollection = db.collection('users');
const dogsCollection = db.collection('dogs');
const dogParksCollection = db.collection('dog-parks');
const friendRequestsCollection = db.collection('friend-requests');
const notificationsCollection = db.collection('notifications');

// CORS configuration
app.use(cors({
  origin: [
    'https://dogapp-frontend.vercel.app', // Update this to your actual frontend Vercel URL
    'http://localhost:3000',
    'https://localhost:3000'
  ],
  credentials: true
}));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configure multer for memory storage (serverless compatible)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and GIF images are allowed'), false);
    }
  }
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware to authenticate JWT tokens
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log('JWT verification failed:', err.message);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Helper functions
const formatAge = (age) => {
  if (!age) return 0;
  const parsedAge = typeof age === 'string' ? parseFloat(age) : age;
  if (isNaN(parsedAge)) return 0;
  return Math.max(0, Math.min(30, parsedAge));
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Dog App API is running on Vercel',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// AUTHENTICATION ROUTES

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    // Check if user already exists
    const existingUser = await usersCollection.where('email', '==', email).get();
    if (!existingUser.empty) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user in Firestore
    const userDoc = await usersCollection.add({
      email,
      password: hashedPassword,
      name,
      created_at: serverTimestamp()
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: userDoc.id, email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ User registered successfully:', email);
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: userDoc.id,
        email,
        name
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    const userSnapshot = await usersCollection.where('email', '==', email).get();
    
    if (userSnapshot.empty) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const userDoc = userSnapshot.docs[0];
    const userData = userDoc.data();

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, userData.password);
    
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: userDoc.id, email: userData.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ User logged in successfully:', email);
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: userDoc.id,
        email: userData.email,
        name: userData.name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DOG BREEDS ROUTE
app.get('/api/dog-breeds', async (req, res) => {
  try {
    console.log('🐕 Fetching dog breeds from external API...');
    
    const apiKey = process.env.DOG_API_KEY;
    const apiUrl = 'https://api.thedogapi.com/v1';

    if (!apiKey) {
      console.log('⚠️ Dog API key not found, using fallback breeds');
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
    const breedNames = breedsData.map(breed => breed.name).sort();
    
    res.json({ 
      success: true, 
      breeds: breedNames,
      source: 'api'
    });

  } catch (error) {
    console.error('Error fetching dog breeds:', error.message);
    
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
      const { id: _, ...cleanDocData } = docData;
      
      parks.push({
        id: doc.id,
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

// Check in dogs to a park
app.post('/api/dog-parks/:parkId/checkin', authenticateToken, async (req, res) => {
  try {
    const { parkId } = req.params;
    const { dogIds } = req.body;

    if (!dogIds || !Array.isArray(dogIds) || dogIds.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'dogIds array is required and must contain at least one dog ID' 
      });
    }

    console.log('🏞️ Checking in dogs to park:', parkId, 'Dogs:', dogIds);

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

// Check out dogs from a park
app.post('/api/dog-parks/:parkId/checkout', authenticateToken, async (req, res) => {
  try {
    const { parkId } = req.params;
    const { dogIds } = req.body;

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
    
    // Remove the dog IDs from the array
    const updatedCheckedInDogs = currentCheckedInDogs.filter(dogId => !dogIds.includes(dogId));

    // Update the park with the updated checked in dogs list
    await dogParksCollection.doc(parkId).update({
      checkedInDogs: updatedCheckedInDogs,
      updated_at: serverTimestamp()
    });

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

// Get all dogs checked into a park
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
          friends: dogData.friends || []
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
    const dogsSnapshot = await dogsCollection.where('owner_id', '==', req.user.userId).get();
    
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

    if (!name || !breed || !age) {
      return res.status(400).json({ error: 'Name, breed, and age are required' });
    }

    // Create new dog in Firestore
    const dogDoc = await dogsCollection.add({
      owner_id: req.user.userId,
      name,
      breed,
      age: parseFloat(age),
      energy_level: energyLevel || '',
      play_style: playStyle || [],
      size: '',
      photo_url: '', 
      friends: [],
      gets_along_with: [],
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
      emoji: emoji || '🐕'
    });

    // Get the created dog data
    const createdDog = await dogsCollection.doc(dogDoc.id).get();
    const dogData = createdDog.data();

    res.status(201).json({
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

// Update an existing dog
app.put('/api/dogs/:dogId', authenticateToken, async (req, res) => {
  try {
    const { dogId } = req.params;
    const { name, breed, age, energyLevel, playStyle, emoji } = req.body;

    // Verify dog exists and belongs to user
    const dogDoc = await dogsCollection.doc(dogId).get();
    if (!dogDoc.exists || dogDoc.data().owner_id !== req.user.userId) {
      return res.status(404).json({ error: 'Dog not found or not authorized' });
    }

    // Prepare update data
    const updateData = {
      updated_at: serverTimestamp()
    };

    if (name !== undefined) updateData.name = name;
    if (breed !== undefined) updateData.breed = breed;
    if (age !== undefined) updateData.age = parseFloat(age);
    if (energyLevel !== undefined) updateData.energy_level = energyLevel;
    if (playStyle !== undefined) updateData.play_style = playStyle;
    if (emoji !== undefined) updateData.emoji = emoji;

    // Update the dog
    await dogsCollection.doc(dogId).update(updateData);

    // Get updated dog data
    const updatedDog = await dogsCollection.doc(dogId).get();
    const updatedData = updatedDog.data();

    res.json({
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

// Delete a dog
app.delete('/api/dogs/:dogId', authenticateToken, async (req, res) => {
  try {
    const { dogId } = req.params;

    // Verify dog exists and belongs to user
    const dogDoc = await dogsCollection.doc(dogId).get();
    if (!dogDoc.exists || dogDoc.data().owner_id !== req.user.userId) {
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

// Upload dog photo
app.post('/api/dogs/:dogId/photo', authenticateToken, upload.single('photo'), async (req, res) => {
  try {
    const { dogId } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'No photo file provided' });
    }

    // Verify dog exists and belongs to user
    const dogDoc = await dogsCollection.doc(dogId).get();
    if (!dogDoc.exists || dogDoc.data().owner_id !== req.user.userId) {
      return res.status(404).json({ error: 'Dog not found or not authorized' });
    }

    // Validate image file
    const validation = validateImageFile(req.file);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.error });
    }

    // Upload to S3
    const uploadResult = await uploadToS3(req.file, req.user.userId, dogId);
    
    if (!uploadResult.success) {
      return res.status(500).json({ error: uploadResult.error });
    }

    // Update dog with photo URL
    await dogsCollection.doc(dogId).update({
      photo_url: uploadResult.url,
      updated_at: serverTimestamp()
    });

    res.json({
      success: true,
      photo_url: uploadResult.url,
      message: 'Photo uploaded successfully'
    });

  } catch (error) {
    console.error('Error uploading dog photo:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// FRIEND MANAGEMENT ROUTES

// Send friend request
app.post('/api/dogs/:dogId/friends/:friendDogId', authenticateToken, async (req, res) => {
  try {
    const { dogId, friendDogId } = req.params;

    console.log(`🤝 Processing friend request: ${dogId} wants to befriend ${friendDogId}`);

    // Get both dog documents
    const [myDogDoc, friendDogDoc] = await Promise.all([
      dogsCollection.doc(dogId).get(),
      dogsCollection.doc(friendDogId).get()
    ]);

    // Verify my dog exists and belongs to user
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
      status: 'pending',
      created_at: serverTimestamp()
    });

    // Create notification for the recipient
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

// Remove friend
app.delete('/api/dogs/:dogId/friends/:friendDogId', authenticateToken, async (req, res) => {
  try {
    const { dogId, friendDogId } = req.params;

    console.log(`💔 Processing unfriend request: ${dogId} wants to remove ${friendDogId}`);

    // Get both dog documents
    const [myDogDoc, friendDogDoc] = await Promise.all([
      dogsCollection.doc(dogId).get(),
      dogsCollection.doc(friendDogId).get()
    ]);

    // Verify my dog exists and belongs to user
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
    await Promise.all([
      dogsCollection.doc(dogId).update({
        friends: myDogFriends.filter(id => id !== friendDogId),
        updated_at: serverTimestamp()
      }),
      dogsCollection.doc(friendDogId).update({
        friends: friendDogFriends.filter(id => id !== dogId),
        updated_at: serverTimestamp()
      })
    ]);

    console.log(`💔 Friendship ended: ${myDogData.name} ↔ ${friendDogData.name}`);

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

// Get friends list for a dog
app.get('/api/dogs/:dogId/friends', authenticateToken, async (req, res) => {
  try {
    const { dogId } = req.params;

    console.log('👥 Getting friends list for dog:', dogId);

    // Verify dog exists and belongs to user
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
    console.error('❌ Error getting friends list:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// FRIEND REQUEST ROUTES

// Accept friend request
app.post('/api/friend-requests/:requestId/accept', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;

    console.log('✅ Processing friend request acceptance:', requestId);

    // Get the friend request
    const requestDoc = await friendRequestsCollection.doc(requestId).get();
    if (!requestDoc.exists) {
      return res.status(404).json({ 
        success: false,
        error: 'Friend request not found' 
      });
    }

    const requestData = requestDoc.data();

    // Verify this request is for one of the user's dogs
    const toDogDoc = await dogsCollection.doc(requestData.to_dog_id).get();
    if (!toDogDoc.exists || toDogDoc.data().owner_id !== req.user.userId) {
      return res.status(403).json({ 
        success: false,
        error: 'Not authorized to accept this friend request' 
      });
    }

    // Verify request is still pending
    if (requestData.status !== 'pending') {
      return res.status(400).json({ 
        success: false,
        error: 'Friend request is no longer pending' 
      });
    }

    // Get both dog documents
    const [fromDogDoc] = await Promise.all([
      dogsCollection.doc(requestData.from_dog_id).get()
    ]);

    if (!fromDogDoc.exists) {
      return res.status(404).json({ 
        success: false,
        error: 'Requesting dog not found' 
      });
    }

    const fromDogData = fromDogDoc.data();
    const toDogData = toDogDoc.data();

    // Add each dog to the other's friends list
    const fromDogFriends = fromDogData.friends || [];
    const toDogFriends = toDogData.friends || [];

    await Promise.all([
      dogsCollection.doc(requestData.from_dog_id).update({
        friends: [...new Set([...fromDogFriends, requestData.to_dog_id])],
        updated_at: serverTimestamp()
      }),
      dogsCollection.doc(requestData.to_dog_id).update({
        friends: [...new Set([...toDogFriends, requestData.from_dog_id])],
        updated_at: serverTimestamp()
      }),
      friendRequestsCollection.doc(requestId).update({
        status: 'accepted',
        accepted_at: serverTimestamp()
      })
    ]);

    // Create notification for the requester
    await notificationsCollection.add({
      user_id: fromDogData.owner_id,
      type: 'friend_request_accepted',
      title: 'Friend Request Accepted! 🎉',
      message: `${toDogData.name} accepted ${fromDogData.name}'s friend request!`,
      data: {
        friend_request_id: requestId,
        from_dog_id: requestData.from_dog_id,
        to_dog_id: requestData.to_dog_id
      },
      read: false,
      created_at: serverTimestamp()
    });

    console.log(`✅ Friend request accepted: ${fromDogData.name} ↔ ${toDogData.name}`);

    res.json({
      success: true,
      message: `${fromDogData.name} and ${toDogData.name} are now friends! 🐕❤️`
    });

  } catch (error) {
    console.error('❌ Error accepting friend request:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// Decline friend request
app.post('/api/friend-requests/:requestId/decline', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;

    console.log('❌ Processing friend request decline:', requestId);

    // Get the friend request
    const requestDoc = await friendRequestsCollection.doc(requestId).get();
    if (!requestDoc.exists) {
      return res.status(404).json({ 
        success: false,
        error: 'Friend request not found' 
      });
    }

    const requestData = requestDoc.data();

    // Verify this request is for one of the user's dogs
    const toDogDoc = await dogsCollection.doc(requestData.to_dog_id).get();
    if (!toDogDoc.exists || toDogDoc.data().owner_id !== req.user.userId) {
      return res.status(403).json({ 
        success: false,
        error: 'Not authorized to decline this friend request' 
      });
    }

    // Verify request is still pending
    if (requestData.status !== 'pending') {
      return res.status(400).json({ 
        success: false,
        error: 'Friend request is no longer pending' 
      });
    }

    // Update request status to declined
    await friendRequestsCollection.doc(requestId).update({
      status: 'declined',
      declined_at: serverTimestamp()
    });

    console.log(`❌ Friend request declined: ${requestId}`);

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

// Get pending friend requests for user's dogs
app.get('/api/friend-requests/pending', authenticateToken, async (req, res) => {
  try {
    console.log('📬 Getting pending friend requests for user:', req.user.userId);

    // Get all user's dogs
    const userDogsSnapshot = await dogsCollection.where('owner_id', '==', req.user.userId).get();
    const userDogIds = [];
    userDogsSnapshot.forEach(doc => {
      userDogIds.push(doc.id);
    });

    if (userDogIds.length === 0) {
      return res.json({
        success: true,
        requests: [],
        count: 0
      });
    }

    // Get pending friend requests for user's dogs
    const requestsSnapshot = await friendRequestsCollection
      .where('status', '==', 'pending')
      .get();

    const pendingRequests = [];
    
    for (const doc of requestsSnapshot.docs) {
      const requestData = doc.data();
      
      // Only include requests where one of user's dogs is the recipient
      if (userDogIds.includes(requestData.to_dog_id)) {
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
    }

    // Sort by created_at in JavaScript
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

// Get notifications for user
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    console.log('🔔 Getting notifications for user:', req.user.userId);

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
      count: notifications.length
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

    // Verify notification exists and belongs to user
    const notificationDoc = await notificationsCollection.doc(notificationId).get();
    if (!notificationDoc.exists || notificationDoc.data().user_id !== req.user.userId) {
      return res.status(404).json({ 
        success: false,
        error: 'Notification not found' 
      });
    }

    // Mark as read
    await notificationsCollection.doc(notificationId).update({
      read: true,
      read_at: serverTimestamp()
    });

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

// Export the Express API for Vercel
module.exports = app;