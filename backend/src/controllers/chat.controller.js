import { generateStreamToken, upsertStreamUser, streamClient } from "../config/stream.js";
import { clerkClient } from "@clerk/express";
import { StreamChat } from "stream-chat";

export const getCallHistory = async (req, res) => {
  try {
    const userId = req.auth().userId;
    const { channelId } = req.params;

    const channels = await streamClient.queryChannels(
      { type: "messaging", id: channelId },
      {},
      { limit: 1, state: true, message_limit: 300 }
    );
    if (!channels?.length) return res.status(404).json({ message: "Channel not found" });

    const channel = channels[0];
    const messages = Object.values(channel.state?.messages || {});

    // Extract all __CALL__ messages
    const callMsgs = messages.filter(m => m.text?.startsWith("__CALL__"));

    // Group by callId — build a map of callId → { started, ended, missed }
    const callMap = {};
    for (const msg of callMsgs) {
      try {
        const data = JSON.parse(msg.text.replace("__CALL__", ""));
        const { callId } = data;
        if (!callId) continue;
        if (!callMap[callId]) callMap[callId] = { callId, messages: [] };
        callMap[callId].messages.push({ ...data, _msgId: msg.id, _userId: msg.user?.id, _userName: msg.user?.name, _userImage: msg.user?.image, _createdAt: msg.created_at });
      } catch { /* skip malformed */ }
    }

    // Build call records
    const calls = [];
    for (const [callId, { messages: cMsgs }] of Object.entries(callMap)) {
      const started = cMsgs.find(m => m.status === "started" && !m.ended);
      const ended = cMsgs.find(m => m.ended || m.status === "ended");
      const missed = cMsgs.find(m => m.status === "missed");

      if (!started) continue; // skip orphaned ended/missed without a start

      const startTime = started.startTime || started._createdAt;
      const endTime = ended?.endTime || ended?._createdAt || null;
      const durationSec = startTime && endTime
        ? Math.max(0, Math.floor((new Date(endTime) - new Date(startTime)) / 1000))
        : null;

      calls.push({
        callId,
        status: missed ? "missed" : ended ? "ended" : "active",
        startTime,
        endTime,
        durationSec,
        createdBy: {
          id: started._userId,
          name: started._userName || started._userId,
          image: started._userImage || null,
        },
      });
    }

    // Sort newest first
    calls.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

    return res.status(200).json({ calls });
  } catch (err) {
    console.error("getCallHistory error:", err);
    return res.status(500).json({ message: "Failed to get call history" });
  }
};

export const getStreamToken = async (req, res) => {
  try {
    const userId = req.auth().userId;

    // ensure the user exists in Stream (handles cases where Inngest webhook was missed)
    const clerkUser = await clerkClient.users.getUser(userId);
    await upsertStreamUser({
      id: userId,
      name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || clerkUser.username || userId,
      image: clerkUser.imageUrl,
    });

    const token = generateStreamToken(userId);
    res.status(200).json({ token });
  } catch (error) {
    console.log("Error generating Stream token:", error);
    res.status(500).json({
      message: "Failed to generate Stream token",
    });
  }
};

const normalizeChannelId = (channelId) => {
  return String(channelId || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "")
    .slice(0, 20);
};

const getChannelById = async (channelId) => {
  const normalized = normalizeChannelId(channelId);

  // Try exact ID match first
  const byId = await streamClient.queryChannels(
    { type: "messaging", id: normalized },
    { last_message_at: -1 },
    { limit: 1, state: true }
  );
  if (byId?.length) return byId[0];

  // Try by name (case-insensitive partial match)
  const byName = await streamClient.queryChannels(
    { type: "messaging", name: { $autocomplete: channelId.trim() } },
    { last_message_at: -1 },
    { limit: 5, state: true }
  );
  // Return first public result
  const publicByName = byName?.find(ch => {
    const d = ch.data || {};
    return !d.private && (d.visibility === "public" || d.discoverable === true);
  });
  if (publicByName) return publicByName;

  // Fallback: cid format
  const byCid = await streamClient.queryChannels(
    { cid: { $eq: `messaging:${normalized}` } },
    { last_message_at: -1 },
    { limit: 1, state: true }
  );
  return byCid?.[0] ?? null;
};

export const getPublicChannel = async (req, res) => {
  try {
    const userId = req.auth().userId;
    const channelId = req.params.channelId;

    // Search by both ID and name — collect all public matches
    const normalized = normalizeChannelId(channelId);
    const rawQuery = channelId.trim();

    // Query by ID
    const byId = await streamClient.queryChannels(
      { type: "messaging", id: normalized },
      { last_message_at: -1 },
      { limit: 1, state: true }
    ).catch(() => []);

    // Query by name autocomplete
    const byName = await streamClient.queryChannels(
      { type: "messaging", name: { $autocomplete: rawQuery } },
      { last_message_at: -1 },
      { limit: 10, state: true }
    ).catch(() => []);

    // Merge, deduplicate, filter public only
    const seen = new Set();
    const candidates = [...byId, ...byName].filter(ch => {
      if (seen.has(ch.id)) return false;
      seen.add(ch.id);
      const d = ch.data || {};
      const isPrivate = d.private || d.visibility === "private";
      return !isPrivate && (d.visibility === "public" || d.discoverable === true);
    });

    if (!candidates.length) {
      return res.status(404).json({ message: "No public channel found" });
    }

    // Return the best match (exact ID match first, then first name match)
    const channel = candidates.find(c => c.id === normalized) || candidates[0];
    const isMember = !!channel.state.members[userId];

    return res.status(200).json({
      channelId: channel.id,
      name: channel.data?.name || channel.id,
      description: channel.data?.description || "",
      memberCount: Object.keys(channel.state.members || {}).length,
      isMember,
      // Also return other matches so frontend can show a list
      otherMatches: candidates.slice(1).map(c => ({
        channelId: c.id,
        name: c.data?.name || c.id,
        memberCount: Object.keys(c.state.members || {}).length,
        isMember: !!c.state.members[userId],
      })),
    });
  } catch (error) {
    console.log("Error getting public channel:", error);
    return res.status(500).json({ message: "Failed to get channel" });
  }
};

export const joinPublicChannel = async (req, res) => {
  try {
    const userId = req.auth().userId;
    const channelId = req.params.channelId;

    const channel = await getChannelById(channelId);
    if (!channel) return res.status(404).json({ message: "Channel not found" });

    const isPrivate = Boolean(channel.data?.private || channel.data?.visibility === "private" || channel.private);
    const isPublic = !isPrivate && (channel.data?.visibility === "public" || channel.data?.discoverable === true);
    if (!isPublic) return res.status(403).json({ message: "Channel is not public" });

    // Idempotent: if already a member, Stream should either succeed or throw a "already member" error.
    try {
      await channel.addMembers([userId]);
    } catch (err) {
      // treat "already a member" as success
      if (String(err?.message || "").toLowerCase().includes("already")) {
        // ignore
      } else {
        throw err;
      }
    }

    return res.status(200).json({ ok: true, channelId: channel.id });
  } catch (error) {
    console.log("Error joining public channel:", error);
    return res.status(500).json({ message: "Failed to join channel" });
  }
};

export const inviteMembersToPrivateChannel = async (req, res) => {
  try {
    const inviterId = req.auth().userId;
    const channelId = req.params.channelId;
    const { userIds } = req.body || {};

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: "userIds is required" });
    }

    const channel = await getChannelById(channelId);
    if (!channel) return res.status(404).json({ message: "Channel not found" });

    const isPrivate = Boolean(channel.data?.private || channel.data?.visibility === "private" || channel.private);
    if (!isPrivate) return res.status(403).json({ message: "Invites are allowed only for private channels" });

    const uniqueUserIds = [...new Set(userIds.map((u) => String(u)))];
    const toInvite = uniqueUserIds.filter((id) => id && id !== inviterId);
    if (toInvite.length === 0) return res.status(200).json({ ok: true });

    try {
      await channel.addMembers(toInvite);
    } catch (err) {
      console.log("Error inviting members:", err);
      return res.status(403).json({ message: "Failed to invite users" });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.log("Error inviting members to channel:", error);
    return res.status(500).json({ message: "Failed to invite users" });
  }
};

// Pin a message — uses server-side admin client with correct SDK method
export const pinMessage = async (req, res) => {
  try {
    const userId = req.auth().userId;
    const { messageId } = req.params;

    // pinMessage(messageOrId, timeoutOrExpirationDate, pinnedBy, pinnedAt)
    // pass null for no expiry, userId as pinnedBy
    await streamClient.pinMessage(messageId, null, userId);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.log("Error pinning message:", error?.message || error);
    return res.status(500).json({ message: "Failed to pin message", detail: error?.message });
  }
};

// Unpin a message
export const unpinMessage = async (req, res) => {
  try {
    const userId = req.auth().userId;
    const { messageId } = req.params;

    // unpinMessage(messageOrId, userId)
    await streamClient.unpinMessage(messageId, userId);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.log("Error unpinning message:", error?.message || error);
    return res.status(500).json({ message: "Failed to unpin message", detail: error?.message });
  }
};

// Vote on a poll — uses server-side admin client so any channel member can vote
export const votePoll = async (req, res) => {
  try {
    const userId = req.auth().userId;
    const { messageId } = req.params;
    const { optionId, userName, multiSelect } = req.body;

    if (!optionId) return res.status(400).json({ message: "optionId is required" });

    // Fetch the current message using server-side admin client
    const { message } = await streamClient.getMessage(messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });

    // Get current poll from attachments
    const attachments = Array.isArray(message.attachments) ? message.attachments : [];
    const pollAttIdx = attachments.findIndex(a => a.type === "poll");

    // Also check legacy top-level poll field and poll_data backup
    let currentPoll = null;
    if (pollAttIdx !== -1) {
      const raw = attachments[pollAttIdx].poll;
      currentPoll = typeof raw === "string" ? JSON.parse(raw) : raw;
    } else if (message.poll_data) {
      const raw = message.poll_data;
      currentPoll = typeof raw === "string" ? JSON.parse(raw) : raw;
    } else if (message.poll) {
      // Note: message.poll may be Stream's native Poll object, not our custom one
      // Only use it if it has our expected shape (has 'options' array)
      const raw = message.poll;
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (parsed?.options) currentPoll = parsed;
    }

    if (!currentPoll) return res.status(400).json({ message: "No poll found in message" });

    // Update votes
    const votes = JSON.parse(JSON.stringify(currentPoll.votes || {}));
    const alreadyVoted = (votes[optionId] || []).some(v => v.userId === userId);

    if (alreadyVoted) {
      votes[optionId] = (votes[optionId] || []).filter(v => v.userId !== userId);
    } else {
      if (!multiSelect) {
        Object.keys(votes).forEach(k => {
          votes[k] = (votes[k] || []).filter(v => v.userId !== userId);
        });
      }
      votes[optionId] = [
        ...(votes[optionId] || []),
        { userId, userName: userName || userId },
      ];
    }

    const updatedPoll = { ...currentPoll, votes };

    // Build updated attachments
    let newAttachments;
    if (pollAttIdx !== -1) {
      newAttachments = attachments.map((a, i) =>
        i === pollAttIdx ? { ...a, poll: updatedPoll } : a
      );
    } else {
      // Legacy: add poll attachment
      newAttachments = [...attachments, { type: "poll", poll: updatedPoll, title: updatedPoll.question }];
    }

    // Use updateMessage via server-side admin client.
    // Only send the minimal required fields to avoid Stream rejecting reserved fields.
    // IMPORTANT: Do NOT include 'poll' field — it's reserved by Stream's native Poll feature.
    const updatePayload = {
      id: message.id,
      text: message.text || `📊 Poll: ${updatedPoll.question}`,
      attachments: newAttachments,
      poll_data: updatedPoll,   // store in non-reserved custom field as backup
    };

    await streamClient.updateMessage(updatePayload, userId);

    return res.status(200).json({ ok: true, poll: updatedPoll });
  } catch (error) {
    console.error("Vote poll error full:", JSON.stringify(error?.response?.data || error?.message || error));
    return res.status(500).json({ message: "Failed to record vote", detail: error?.response?.data?.message || error?.message });
  }
};

// ── Remove a member from a channel (owner/admin only) ──────────
export const removeMember = async (req, res) => {
  try {
    const requesterId = req.auth().userId;
    const { channelId, memberId } = req.params;

    // Get channel via server-side client — use channel() + query() for state
    const channel = streamClient.channel("messaging", channelId);
    const channelData = await channel.query({ state: true });

    // Verify requester is owner/admin using channel data
    const createdById = channelData.channel?.created_by?.id || channelData.channel?.created_by_id;
    const members = channelData.members || [];
    const requesterMember = members.find(m => m.user_id === requesterId || m.user?.id === requesterId);
    const isOwner =
      createdById === requesterId ||
      requesterMember?.channel_role === "owner" ||
      requesterMember?.channel_role === "admin";

    if (!isOwner) return res.status(403).json({ message: "Only the channel owner can remove members" });

    // Remove member using server-side channel
    await channel.removeMembers([memberId]);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("removeMember error:", error?.message || error);
    return res.status(500).json({ message: "Failed to remove member", detail: error?.message });
  }
};

// ── Ban a member from a channel (owner/admin only) ─────────────
// Banned users keep message history but can't send new messages or see channel info
export const banMember = async (req, res) => {
  try {
    const requesterId = req.auth().userId;
    const { channelId, memberId } = req.params;

    const channel = streamClient.channel("messaging", channelId);
    const channelData = await channel.query({ state: true });

    const createdById = channelData.channel?.created_by?.id || channelData.channel?.created_by_id;
    const members = channelData.members || [];
    const requesterMember = members.find(m => m.user_id === requesterId || m.user?.id === requesterId);
    const isOwner =
      createdById === requesterId ||
      requesterMember?.channel_role === "owner" ||
      requesterMember?.channel_role === "admin";

    if (!isOwner) return res.status(403).json({ message: "Only the channel owner can ban members" });

    // Ban user from this specific channel — they keep history but can't interact
    await streamClient.banUser(memberId, {
      banned_by_id: requesterId,
      channel_cid: `messaging:${channelId}`,
      reason: "Banned by channel owner",
    });

    // Remove from channel so they can't see new messages or member list
    await channel.removeMembers([memberId]);

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("banMember error:", error?.message || error);
    return res.status(500).json({ message: "Failed to ban member", detail: error?.message });
  }
};

// ── Unban a member from a channel (owner/admin only) ───────────
export const unbanMember = async (req, res) => {
  try {
    const requesterId = req.auth().userId;
    const { channelId, memberId } = req.params;

    const channel = streamClient.channel("messaging", channelId);
    const channelData = await channel.query({ state: true });

    const createdById = channelData.channel?.created_by?.id || channelData.channel?.created_by_id;
    const members = channelData.members || [];
    const requesterMember = members.find(m => m.user_id === requesterId || m.user?.id === requesterId);
    const isOwner =
      createdById === requesterId ||
      requesterMember?.channel_role === "owner" ||
      requesterMember?.channel_role === "admin";

    if (!isOwner) return res.status(403).json({ message: "Only the channel owner can unban members" });

    await streamClient.unbanUser(memberId, { channel_cid: `messaging:${channelId}` });
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("unbanMember error:", error?.message || error);
    return res.status(500).json({ message: "Failed to unban member", detail: error?.message });
  }
};
