const { db, serverTimestamp } = require('../firebase-config');

// Firestore collections
const usersCollection = db.collection('test_users');
const dogsCollection = db.collection('dogs');
const dogParksCollection = db.collection('test_dogparks');
const friendRequestsCollection = db.collection('friend_requests');
const notificationsCollection = db.collection('notifications');

module.exports = {
  db,
  serverTimestamp,
  usersCollection,
  dogsCollection,
  dogParksCollection,
  friendRequestsCollection,
  notificationsCollection
};