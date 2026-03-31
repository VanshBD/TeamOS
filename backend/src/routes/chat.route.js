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
} from "../controllers/chat.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/token", protectRoute, getStreamToken);

router.get("/channels/public/:channelId", protectRoute, getPublicChannel);
router.post("/channels/:channelId/join", protectRoute, joinPublicChannel);
router.post("/channels/:channelId/invite", protectRoute, inviteMembersToPrivateChannel);

// Pin / unpin — require server-side admin client
router.post("/messages/:messageId/pin", protectRoute, pinMessage);
router.post("/messages/:messageId/unpin", protectRoute, unpinMessage);

// Poll vote — requires server-side admin client (users can't partialUpdateMessage on others' messages)
router.post("/messages/:messageId/vote", protectRoute, votePoll);

export default router;

router.get("/channels/:channelId/call-history", protectRoute, getCallHistory);
