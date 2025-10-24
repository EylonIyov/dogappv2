const express = require("express");
const router = express.Router();
const { db, serverTimestamp } = require("../config/database");
const { authenticateToken } = require("../middleware/auth");

const friendRequestsCollection = db.collection("friend-requests");
const dogsCollection = db.collection("dogs");
const notificationsCollection = db.collection("notifications");

// Get pending friend requests for user's dogs
router.get("/pending", authenticateToken, async (req, res) => {
  try {
    console.log(
      "📬 Getting pending friend requests for user:",
      req.user.userId
    );

    // Get all user's dogs
    const userDogsSnapshot = await dogsCollection
      .where("owner_id", "==", req.user.userId)
      .get();
    const userDogIds = [];
    userDogsSnapshot.forEach((doc) => {
      userDogIds.push(doc.id);
    });

    if (userDogIds.length === 0) {
      return res.json({
        success: true,
        requests: [],
        count: 0,
      });
    }

    // Get pending friend requests for user's dogs
    const requestsSnapshot = await friendRequestsCollection
      .where("status", "==", "pending")
      .get();

    const pendingRequests = [];

    for (const doc of requestsSnapshot.docs) {
      const requestData = doc.data();

      // Only include requests where one of user's dogs is the recipient
      if (userDogIds.includes(requestData.to_dog_id)) {
        // Get the dog information for the request
        const [fromDogDoc, toDogDoc] = await Promise.all([
          dogsCollection.doc(requestData.from_dog_id).get(),
          dogsCollection.doc(requestData.to_dog_id).get(),
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
              photo_url: fromDogData.photo_url,
            },
            to_dog: {
              id: requestData.to_dog_id,
              name: toDogData.name,
              breed: toDogData.breed,
              emoji: toDogData.emoji,
              photo_url: toDogData.photo_url,
            },
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
      count: pendingRequests.length,
    });
  } catch (error) {
    console.error("❌ Error getting pending friend requests:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// Accept friend request
router.post("/:requestId/accept", authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;

    console.log("✅ Processing friend request acceptance:", requestId);

    // Get the friend request
    const requestDoc = await friendRequestsCollection.doc(requestId).get();
    if (!requestDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Friend request not found",
      });
    }

    const requestData = requestDoc.data();

    // Verify this request is for one of the user's dogs
    const toDogDoc = await dogsCollection.doc(requestData.to_dog_id).get();
    if (!toDogDoc.exists || toDogDoc.data().owner_id !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to accept this friend request",
      });
    }

    // Verify request is still pending
    if (requestData.status !== "pending") {
      return res.status(400).json({
        success: false,
        error: "Friend request is no longer pending",
      });
    }

    // Get both dog documents
    const fromDogDoc = await dogsCollection.doc(requestData.from_dog_id).get();

    if (!fromDogDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Requesting dog not found",
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
        updated_at: serverTimestamp(),
      }),
      dogsCollection.doc(requestData.to_dog_id).update({
        friends: [...new Set([...toDogFriends, requestData.from_dog_id])],
        updated_at: serverTimestamp(),
      }),
      friendRequestsCollection.doc(requestId).update({
        status: "accepted",
        accepted_at: serverTimestamp(),
      }),
    ]);

    // Create notification for the requester
    await notificationsCollection.add({
      user_id: fromDogData.owner_id,
      type: "friend_request_accepted",
      title: "Friend Request Accepted! 🎉",
      message: `${toDogData.name} accepted ${fromDogData.name}'s friend request!`,
      data: {
        friend_request_id: requestId,
        from_dog_id: requestData.from_dog_id,
        to_dog_id: requestData.to_dog_id,
      },
      read: false,
      created_at: serverTimestamp(),
    });

    console.log(
      `✅ Friend request accepted: ${fromDogData.name} ↔ ${toDogData.name}`
    );

    res.json({
      success: true,
      message: `${fromDogData.name} and ${toDogData.name} are now friends! 🐕❤️`,
    });
  } catch (error) {
    console.error("❌ Error accepting friend request:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// Decline friend request
router.post("/:requestId/decline", authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;

    console.log("❌ Processing friend request decline:", requestId);

    // Get the friend request
    const requestDoc = await friendRequestsCollection.doc(requestId).get();
    if (!requestDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Friend request not found",
      });
    }

    const requestData = requestDoc.data();

    // Verify this request is for one of the user's dogs
    const toDogDoc = await dogsCollection.doc(requestData.to_dog_id).get();
    if (!toDogDoc.exists || toDogDoc.data().owner_id !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to decline this friend request",
      });
    }

    // Verify request is still pending
    if (requestData.status !== "pending") {
      return res.status(400).json({
        success: false,
        error: "Friend request is no longer pending",
      });
    }

    // Update request status to declined
    await friendRequestsCollection.doc(requestId).update({
      status: "declined",
      declined_at: serverTimestamp(),
    });

    console.log(`❌ Friend request declined: ${requestId}`);

    res.json({
      success: true,
      message: "Friend request declined",
    });
  } catch (error) {
    console.error("❌ Error declining friend request:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

module.exports = router;
