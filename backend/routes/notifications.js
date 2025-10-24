const express = require("express");
const router = express.Router();
const { db, serverTimestamp } = require("../config/database");
const { authenticateToken } = require("../middleware/auth");

const notificationsCollection = db.collection("notifications");

// Get notifications for user
router.get("/", authenticateToken, async (req, res) => {
  try {
    console.log("🔔 Getting notifications for user:", req.user.userId);

    const notificationsSnapshot = await notificationsCollection
      .where("user_id", "==", req.user.userId)
      .get();

    const notifications = [];
    notificationsSnapshot.forEach((doc) => {
      notifications.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    // Sort by created_at in JavaScript (newest first)
    notifications.sort((a, b) => {
      const aTime = a.created_at?.toDate?.() || new Date(0);
      const bTime = b.created_at?.toDate?.() || new Date(0);
      return bTime - aTime;
    });

    // Limit to 50 most recent
    const limitedNotifications = notifications.slice(0, 50);

    console.log(`✅ Found ${limitedNotifications.length} notifications`);

    res.json({
      success: true,
      notifications: limitedNotifications,
      count: limitedNotifications.length,
    });
  } catch (error) {
    console.error("❌ Error getting notifications:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// Mark notification as read
router.put("/:notificationId/read", authenticateToken, async (req, res) => {
  try {
    const { notificationId } = req.params;

    // Verify notification exists and belongs to user
    const notificationDoc = await notificationsCollection
      .doc(notificationId)
      .get();
    if (
      !notificationDoc.exists ||
      notificationDoc.data().user_id !== req.user.userId
    ) {
      return res.status(404).json({
        success: false,
        error: "Notification not found",
      });
    }

    // Mark as read
    await notificationsCollection.doc(notificationId).update({
      read: true,
      read_at: serverTimestamp(),
    });

    res.json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error) {
    console.error("❌ Error marking notification as read:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

module.exports = router;
