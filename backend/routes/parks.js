const express = require('express');
const jwt = require('jsonwebtoken');
const { dogParksCollection, dogsCollection, serverTimestamp } = require('../config/database');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');
const { broadcastParkUpdate, broadcastParkUpdateWebSocket, sseConnections } = require('../services/parkBroadcast');

const router = express.Router();

// Get all dog parks
router.get('/', async (req, res) => {
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
router.post('/', authenticateToken, async (req, res) => {
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
router.put('/:parkId', authenticateToken, async (req, res) => {
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
router.delete('/:parkId', authenticateToken, async (req, res) => {
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
router.post('/:parkId/checkin', authenticateToken, async (req, res) => {
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
    // Note: WebSocket broadcast will be handled in the main server file

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
router.post('/:parkId/checkout', authenticateToken, async (req, res) => {
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
    // Note: WebSocket broadcast will be handled in the main server file

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
router.get('/:parkId/dogs', authenticateToken, async (req, res) => {
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

// SSE endpoint for real-time park updates
router.get('/:parkId/live', (req, res) => {
  const { parkId } = req.params;
  const { token } = req.query;
  
  // Authenticate token from query parameter
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return res.status(403).json({ error: 'Invalid token' });
  }

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

module.exports = router;