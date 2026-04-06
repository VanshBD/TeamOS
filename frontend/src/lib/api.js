import { axiosInstance } from "./axios";

export async function getStreamToken() {
  const response = await axiosInstance.get("/chat/token");
  return response.data;
}

export async function getPublicChannel(channelId) {
  const response = await axiosInstance.get(`/chat/channels/public/${encodeURIComponent(channelId)}`);
  return response.data;
}

export async function joinPublicChannel(channelId) {
  const response = await axiosInstance.post(`/chat/channels/${encodeURIComponent(channelId)}/join`);
  return response.data;
}

export async function inviteMembersToChannel(channelId, userIds) {
  const response = await axiosInstance.post(`/chat/channels/${encodeURIComponent(channelId)}/invite`, {
    userIds,
  });
  return response.data;
}

export async function pinMessageApi(messageId) {
  const response = await axiosInstance.post(`/chat/messages/${encodeURIComponent(messageId)}/pin`);
  return response.data;
}

export async function unpinMessageApi(messageId) {
  const response = await axiosInstance.post(`/chat/messages/${encodeURIComponent(messageId)}/unpin`);
  return response.data;
}

export async function votePollApi(messageId, optionId, userName, multiSelect) {
  const response = await axiosInstance.post(`/chat/messages/${encodeURIComponent(messageId)}/vote`, {
    optionId, userName, multiSelect,
  });
  return response.data;
}

// ── Friend system ──────────────────────────────────────────────
export async function getFriends() {
  const res = await axiosInstance.get("/friends");
  return res.data;
}

export async function getIncomingRequests() {
  const res = await axiosInstance.get("/friends/requests");
  return res.data;
}

export async function getSentRequests() {
  const res = await axiosInstance.get("/friends/sent");
  return res.data;
}

export async function searchUsers(query) {
  const res = await axiosInstance.get("/friends/search", { params: { q: query } });
  return res.data;
}

export async function sendFriendRequest(targetUserId) {
  const res = await axiosInstance.post(`/friends/request/${targetUserId}`);
  return res.data;
}

export async function acceptFriendRequest(requestId) {
  const res = await axiosInstance.post(`/friends/accept/${requestId}`);
  return res.data;
}

export async function rejectFriendRequest(requestId) {
  const res = await axiosInstance.post(`/friends/reject/${requestId}`);
  return res.data;
}

export async function removeFriend(friendId) {
  const res = await axiosInstance.delete(`/friends/${friendId}`);
  return res.data;
}

export async function getCallHistory(channelId) {
  const res = await axiosInstance.get(`/chat/channels/${encodeURIComponent(channelId)}/call-history`);
  return res.data;
}

// ── Channel member management ──────────────────────────────────
export async function removeMemberApi(channelId, memberId) {
  const res = await axiosInstance.delete(`/chat/channels/${encodeURIComponent(channelId)}/members/${encodeURIComponent(memberId)}`);
  return res.data;
}

export async function banMemberApi(channelId, memberId) {
  const res = await axiosInstance.post(`/chat/channels/${encodeURIComponent(channelId)}/members/${encodeURIComponent(memberId)}/ban`);
  return res.data;
}

export async function unbanMemberApi(channelId, memberId) {
  const res = await axiosInstance.delete(`/chat/channels/${encodeURIComponent(channelId)}/members/${encodeURIComponent(memberId)}/ban`);
  return res.data;
}
