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
