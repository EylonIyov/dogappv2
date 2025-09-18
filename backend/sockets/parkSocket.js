const { parkConnections } = require('../services/parkBroadcast');
const { broadcastParkUpdate } = require('../services/parkBroadcast');

const setupSocketHandlers = (io) => {
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
};

module.exports = {
  setupSocketHandlers
};