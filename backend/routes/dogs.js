const express = require('express');
const multer = require('multer');
const { dogsCollection, serverTimestamp } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { uploadToS3, validateImageFile } = require('../dogUploadPicture');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// Get all dogs for the authenticated user
router.get('/', authenticateToken, async (req, res) => {
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
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, breed, age, energyLevel, playStyle, emoji } = req.body;

    // Validation
    if (!name || !breed || !age) {
      return res.status(400).json({ error: 'Name, breed, and age are required' });
    }

    // Create new dog in Firestore matching your schema
    const dogDoc = await dogsCollection.add({
      owner_id: req.user.userId,
      name,
      breed,
      age: parseFloat(age), // Allow decimals for age
      energy_level: energyLevel || '',
      play_style: playStyle || [],
      size: '',
      photo_url: '', 
      friends: [],
      gets_along_with: [],
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
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
router.put('/:dogId', authenticateToken, async (req, res) => {
  try {
    const { dogId } = req.params;
    const { name, breed, age, energyLevel, playStyle, emoji } = req.body;

    // Find the dog and verify ownership
    const dogDoc = await dogsCollection.doc(dogId).get();
    
    if (!dogDoc.exists || dogDoc.data().owner_id !== req.user.userId) {
      return res.status(404).json({ error: 'Dog not found or not authorized' });
    }

    // Prepare update data matching your schema
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
router.delete('/:dogId', authenticateToken, async (req, res) => {
  try {
    const { dogId } = req.params;

    // Find the dog and verify ownership
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

// Get a specific dog (only if it belongs to the authenticated user)
router.get('/:dogId', authenticateToken, async (req, res) => {
  try {
    const { dogId } = req.params;

    const dogDoc = await dogsCollection.doc(dogId).get();
    
    if (!dogDoc.exists || dogDoc.data().owner_id !== req.user.userId) {
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
router.post('/:dogId/photo', authenticateToken, upload.single('photo'), async (req, res) => {
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

// Get friends list for a specific dog
router.get('/:dogId/friends', authenticateToken, async (req, res) => {
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

module.exports = router;