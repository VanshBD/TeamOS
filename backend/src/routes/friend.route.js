import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getFriends,
  getIncomingRequests,
  getSentRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  searchUsers,
} from "../controllers/friend.controller.js";

const router = express.Router();

router.get("/", protectRoute, getFriends);
router.get("/requests", protectRoute, getIncomingRequests);
router.get("/sent", protectRoute, getSentRequests);
router.get("/search", protectRoute, searchUsers);
router.post("/request/:targetUserId", protectRoute, sendFriendRequest);
router.post("/accept/:requestId", protectRoute, acceptFriendRequest);
router.post("/reject/:requestId", protectRoute, rejectFriendRequest);
router.delete("/:friendId", protectRoute, removeFriend);

export default router;
