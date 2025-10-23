const express = require('express');
const { dogParksCollection, dogsCollection, serverTimestamp } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { getSignedUrlForKey } = require('../dogUploadPicture');

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

    // Update the park with new checked in dogs - Firestore real-time listeners will handle notifications
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
    
    // Remove the dog IDs from the array
    const updatedCheckedInDogs = currentCheckedInDogs.filter(dogId => !dogIds.includes(dogId));

    // Update the park with the updated checked in dogs list - Firestore real-time listeners will handle notifications
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
    for (let index = 0; index < dogDocs.length; index++) {
      const dogDoc = dogDocs[index];
      if (dogDoc.exists) {
        const dogData = dogDoc.data();
        
        // Refresh photo URL with fresh presigned URL
        let photoUrl = dogData.photo_url;
        if (dogData.photo_key) {
          // Use photo_key if available (preferred method)
          try {
            const signedUrl = await getSignedUrlForKey(dogData.photo_key, 604800); // 7 days
            if (signedUrl) {
              photoUrl = signedUrl;
              console.log(`✅ Refreshed photo URL for ${dogData.name} using photo_key`);
            }
          } catch (keyError) {
            console.warn(`⚠️ Could not refresh photo URL using photo_key for dog ${dogDoc.id}:`, keyError.message);
          }
        } else if (photoUrl && photoUrl.includes('s3')) {
          // Fallback: Extract key from existing URL
          try {
            const urlParts = photoUrl.split('amazonaws.com/');
            if (urlParts.length > 1) {
              const key = urlParts[1].split('?')[0];
              console.log(`🔄 Refreshing S3 URL for dog ${dogDoc.id}, key: ${key.substring(0, 50)}...`);
              const signedUrl = await getSignedUrlForKey(key, 604800); // 7 days
              if (signedUrl) {
                photoUrl = signedUrl;
                console.log(`✅ Refreshed photo URL for ${dogData.name}`);
              }
            }
          } catch (urlError) {
            console.warn(`⚠️ Could not refresh photo URL for dog ${dogDoc.id}:`, urlError.message);
          }
        }
        
        checkedInDogs.push({
          id: dogDoc.id,
          name: dogData.name,
          breed: dogData.breed,
          age: dogData.age,
          emoji: dogData.emoji,
          owner_id: dogData.owner_id,
          energy_level: dogData.energy_level,
          photo_url: photoUrl,
          friends: dogData.friends || []
        });
      } else {
        console.log(`Dog with ID ${checkedInDogIds[index]} not found in database`);
      }
    }

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

module.exports = router;