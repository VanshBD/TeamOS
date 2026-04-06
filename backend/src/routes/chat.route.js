import express from "express";
import {
  getPublicChannel,
  getStreamToken,
  inviteMembersToPrivateChannel,
  joinPublicChannel,
  pinMessage,
  unpinMessage,
  votePoll,
  getCallHistory,
  removeMember,
  banMember,
  unbanMember,
} from "../controllers/chat.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/token", protectRoute, getStreamToken);

router.get("/channels/public/:channelId", protectRoute, getPublicChannel);
router.post("/channels/:channelId/join", protectRoute, joinPublicChannel);
router.post("/channels/:channelId/invite", protectRoute, inviteMembersToPrivateChannel);

// Member management (owner only)
router.delete("/channels/:channelId/members/:memberId", protectRoute, removeMember);
router.post("/channels/:channelId/members/:memberId/ban", protectRoute, banMember);
router.delete("/channels/:channelId/members/:memberId/ban", protectRoute, unbanMember);

// Pin / unpin
router.post("/messages/:messageId/pin", protectRoute, pinMessage);
router.post("/messages/:messageId/unpin", protectRoute, unpinMessage);

// Poll vote
router.post("/messages/:messageId/vote", protectRoute, votePoll);

// Call history
router.get("/channels/:channelId/call-history", protectRoute, getCallHistory);

export default router;
