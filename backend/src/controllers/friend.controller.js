import { FriendRequest } from "../models/friend.model.js";
import { clerkClient } from "@clerk/express";

// Helper: get Clerk user info safely
const getClerkUser = async (userId) => {
  try {
    const u = await clerkClient.users.getUser(userId);
    return {
      id: userId,
      name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.username || userId,
      image: u.imageUrl || null,
    };
  } catch {
    return { id: userId, name: userId, image: null };
  }
};

// GET /api/friends — list accepted friends
export const getFriends = async (req, res) => {
  try {
    const userId = req.auth().userId;
    const requests = await FriendRequest.find({
      $or: [{ sender: userId }, { receiver: userId }],
      status: "accepted",
    });

    const friendIds = requests.map((r) =>
      r.sender === userId ? r.receiver : r.sender
    );

    const friends = await Promise.all(friendIds.map(getClerkUser));
    return res.status(200).json({ friends });
  } catch (err) {
    console.error("getFriends error:", err);
    return res.status(500).json({ message: "Failed to get friends" });
  }
};

// GET /api/friends/requests — incoming pending requests
export const getIncomingRequests = async (req, res) => {
  try {
    const userId = req.auth().userId;
    const requests = await FriendRequest.find({ receiver: userId, status: "pending" });

    const enriched = await Promise.all(
      requests.map(async (r) => ({
        requestId: r._id,
        user: await getClerkUser(r.sender),
        createdAt: r.createdAt,
      }))
    );
    return res.status(200).json({ requests: enriched });
  } catch (err) {
    console.error("getIncomingRequests error:", err);
    return res.status(500).json({ message: "Failed to get requests" });
  }
};

// GET /api/friends/sent — outgoing pending requests
export const getSentRequests = async (req, res) => {
  try {
    const userId = req.auth().userId;
    const requests = await FriendRequest.find({ sender: userId, status: "pending" });

    const enriched = await Promise.all(
      requests.map(async (r) => ({
        requestId: r._id,
        user: await getClerkUser(r.receiver),
        createdAt: r.createdAt,
      }))
    );
    return res.status(200).json({ requests: enriched });
  } catch (err) {
    console.error("getSentRequests error:", err);
    return res.status(500).json({ message: "Failed to get sent requests" });
  }
};

// POST /api/friends/request/:targetUserId — send friend request
export const sendFriendRequest = async (req, res) => {
  try {
    const userId = req.auth().userId;
    const { targetUserId } = req.params;

    if (userId === targetUserId) {
      return res.status(400).json({ message: "Cannot send request to yourself" });
    }

    // Check if already friends or request exists
    const existing = await FriendRequest.findOne({
      $or: [
        { sender: userId, receiver: targetUserId },
        { sender: targetUserId, receiver: userId },
      ],
    });

    if (existing) {
      if (existing.status === "accepted") {
        return res.status(400).json({ message: "Already friends" });
      }
      if (existing.status === "pending") {
        return res.status(400).json({ message: "Request already pending" });
      }
      // If rejected, allow re-sending by updating
      existing.status = "pending";
      existing.sender = userId;
      existing.receiver = targetUserId;
      await existing.save();
      return res.status(200).json({ ok: true, message: "Friend request sent" });
    }

    await FriendRequest.create({ sender: userId, receiver: targetUserId });
    return res.status(201).json({ ok: true, message: "Friend request sent" });
  } catch (err) {
    console.error("sendFriendRequest error:", err);
    return res.status(500).json({ message: "Failed to send friend request" });
  }
};

// POST /api/friends/accept/:requestId
export const acceptFriendRequest = async (req, res) => {
  try {
    const userId = req.auth().userId;
    const { requestId } = req.params;

    const request = await FriendRequest.findById(requestId);
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (request.receiver !== userId) return res.status(403).json({ message: "Not authorized" });
    if (request.status !== "pending") return res.status(400).json({ message: "Request is not pending" });

    request.status = "accepted";
    await request.save();
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("acceptFriendRequest error:", err);
    return res.status(500).json({ message: "Failed to accept request" });
  }
};

// POST /api/friends/reject/:requestId
export const rejectFriendRequest = async (req, res) => {
  try {
    const userId = req.auth().userId;
    const { requestId } = req.params;

    const request = await FriendRequest.findById(requestId);
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (request.receiver !== userId) return res.status(403).json({ message: "Not authorized" });

    request.status = "rejected";
    await request.save();
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("rejectFriendRequest error:", err);
    return res.status(500).json({ message: "Failed to reject request" });
  }
};

// DELETE /api/friends/:friendId — remove friend
export const removeFriend = async (req, res) => {
  try {
    const userId = req.auth().userId;
    const { friendId } = req.params;

    await FriendRequest.deleteOne({
      $or: [
        { sender: userId, receiver: friendId },
        { sender: friendId, receiver: userId },
      ],
      status: "accepted",
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("removeFriend error:", err);
    return res.status(500).json({ message: "Failed to remove friend" });
  }
};

// GET /api/friends/search?q=name — search all users (for adding friends)
export const searchUsers = async (req, res) => {
  try {
    const userId = req.auth().userId;
    const query = (req.query.q || "").trim();
    if (!query) return res.status(200).json({ users: [] });

    // Search via Clerk
    const result = await clerkClient.users.getUserList({
      query,
      limit: 15,
    });

    const users = result.data
      .filter((u) => u.id !== userId)
      .map((u) => ({
        id: u.id,
        name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.username || u.id,
        image: u.imageUrl || null,
      }));

    // Enrich with friendship status
    const enriched = await Promise.all(
      users.map(async (u) => {
        const rel = await FriendRequest.findOne({
          $or: [
            { sender: userId, receiver: u.id },
            { sender: u.id, receiver: userId },
          ],
        });
        let friendStatus = "none";
        let requestId = null;
        if (rel) {
          if (rel.status === "accepted") friendStatus = "friends";
          else if (rel.status === "pending") {
            friendStatus = rel.sender === userId ? "sent" : "incoming";
            requestId = rel._id;
          } else {
            friendStatus = "none";
          }
        }
        return { ...u, friendStatus, requestId };
      })
    );

    return res.status(200).json({ users: enriched });
  } catch (err) {
    console.error("searchUsers error:", err);
    return res.status(500).json({ message: "Failed to search users" });
  }
};
