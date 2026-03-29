import { useState } from "react";
import { useChatContext } from "stream-chat-react";
import { useUser } from "@clerk/clerk-react";
import { useSearchParams } from "react-router";

import { getPublicChannel, joinPublicChannel } from "../lib/api";
import PublicChannelPreview from "./PublicChannelPreview";

const normalizeChannelId = (channelId) =>
  String(channelId || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "")
    .slice(0, 20);

const PublicChannelJoin = () => {
  const { client } = useChatContext();
  const { user } = useUser();
  const [, setSearchParams] = useSearchParams();

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [foundChannel, setFoundChannel] = useState(null);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setFoundChannel(null);

    try {
      const normalized = normalizeChannelId(query);
      const result = await getPublicChannel(normalized);
      if (!result?.channelId) {
        setError("Public channel not found.");
        return;
      }
      setFoundChannel(result);
    } catch (err) {
      setError(err?.response?.data?.message || "Public channel not found.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!foundChannel?.channelId || !user?.id) return;
    setLoading(true);
    setError("");
    try {
      await joinPublicChannel(foundChannel.channelId);

      // After joining, watch the channel and open it in the UI.
      const channel = client.channel("messaging", foundChannel.channelId);
      await channel.watch();
      setSearchParams({ channel: foundChannel.channelId });
      
      // Clear the search state
      setFoundChannel(null);
      setQuery("");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to join channel.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 px-4">
      <div className="text-sm font-semibold text-[#ffffffcc] mb-2">Join Public Channel</div>
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter channel id"
          className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white outline-none"
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="px-3 py-2 rounded-lg bg-[#611f69] hover:bg-[#4f1655] text-white text-sm font-medium disabled:opacity-60"
        >
          {loading ? "..." : "Search"}
        </button>
      </div>
      {error && <div className="text-xs text-red-200 mt-2">{error}</div>}

      {foundChannel && (
        <PublicChannelPreview 
          channelData={foundChannel} 
          onJoin={handleJoin}
          loading={loading}
        />
      )}
    </div>
  );
};

export default PublicChannelJoin;

