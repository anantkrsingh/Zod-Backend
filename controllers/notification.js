const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { Expo } = require("expo-server-sdk");

const expo = new Expo();

const savePushToken = async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user.userId;

    if (!Expo.isExpoPushToken(token)) {
      return res.status(400).json({ message: "Invalid push token" });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { pushToken: token },
    });

    res.status(200).json({ message: "Push token saved successfully" });
  } catch (error) {
    console.error("Error saving push token:", error);
    res.status(500).json({ message: "Error saving push token" });
  }
};

const sendPushNotification = async (pushToken, title, body) => {
  try {
    if (!Expo.isExpoPushToken(pushToken)) {
      console.error(`Push token ${pushToken} is not a valid Expo push token`);
      return;
    }

    const message = {
      to: pushToken,
      sound: "default",
      title,
      body,
      data: { withSome: "data" },
    };

    const chunks = expo.chunkPushNotifications([message]);
    const tickets = [];

    for (let chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error("Error sending push notification:", error);
      }
    }

    return tickets;
  } catch (error) {
    console.error("Error in sendPushNotification:", error);
    throw error;
  }
};

const createNotification = async (userId, title, message, icon) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pushToken: true },
    });

    const notification = await prisma.notification.create({
      data: {
        title,
        message,
        icon,
        userId,
      },
    });

    if (user.pushToken) {
      await sendPushNotification(user.pushToken, title, message);
    }

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
};

const getNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const [notifications, totalNotifications] = await Promise.all([
      prisma.notification.findMany({
        where: {
          userId,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.notification.count({
        where: {
          userId,
        },
      }),
    ]);

    res.status(200).json({
      notifications,
      currentPage: page,
      totalPages: Math.ceil(totalNotifications / limit),
      totalNotifications,
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({
      message: "Error fetching notifications",
      error: true,
    });
  }
};

const updateNotification = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { notificationId } = req.params;
    const { isRead, dismissed } = req.body;

    // Validate that at least one field is being updated
    if (isRead === undefined && dismissed === undefined) {
      return res.status(400).json({
        message: "At least one field (isRead or dismissed) must be provided for update",
        error: true,
      });
    }

    const updateData = {};
    if (isRead !== undefined) updateData.isRead = isRead;
    if (dismissed !== undefined) updateData.dismissed = dismissed;

    const notification = await prisma.notification.update({
      where: {
        id: notificationId,
        userId, // Ensure the notification belongs to the user
      },
      data: updateData,
    });

    res.status(200).json({
      message: "Notification updated successfully",
      notification,
    });
  } catch (error) {
    console.error("Update notification error:", error);
    if (error.code === "P2025") {
      return res.status(404).json({
        message: "Notification not found or unauthorized",
        error: true,
      });
    }
    res.status(500).json({
      message: "Error updating notification",
      error: true,
    });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;

    await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    res.status(200).json({
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("Mark all as read error:", error);
    res.status(500).json({
      message: "Error marking notifications as read",
      error: true,
    });
  }
};

module.exports = {
  createNotification,
  savePushToken,
  sendPushNotification,
  getNotifications,
  updateNotification,
  markAllAsRead,
};
