const express = require('express');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const router = express.Router();

// Get all dog breeds from external API
router.get('/', async (req, res) => {
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

module.exports = router;