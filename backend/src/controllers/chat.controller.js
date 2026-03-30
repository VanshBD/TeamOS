import { generateStreamToken, upsertStreamUser, streamClient } from "../config/stream.js";
import { clerkClient } from "@clerk/express";
import { StreamChat } from "stream-chat";

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
