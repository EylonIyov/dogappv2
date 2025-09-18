const { dogParksCollection, dogsCollection } = require('../config/database');

// Store SSE connections for real-time updates
const sseConnections = new Map(); // parkId -> Set of response objects

// Store active connections for each park
const parkConnections = new Map(); // parkId -> Set of socket IDs

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
          friends: dogData.friends || []
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
const broadcastParkUpdateWebSocket = async (parkId, io) => {
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
          friends: dogData.friends || []
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

module.exports = {
  broadcastParkUpdate,
  broadcastParkUpdateWebSocket,
  sseConnections,
  parkConnections
};