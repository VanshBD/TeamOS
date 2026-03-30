import { useState } from "react";
import { useChatContext } from "stream-chat-react";
import { useSearchParams } from "react-router";
import { getPublicChannel, joinPublicChannel } from "../lib/api";
import { SearchIcon, HashIcon, UsersIcon, LogInIcon } from "lucide-react";

const PublicChannelJoin = () => {
  const { client } = useChatContext();
  const [, setSearchParams] = useSearchParams();

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]); // array of channel matches
  const [error, setError] = useState("");
  const [joiningId, setJoiningId] = useState(null);

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError("");
    setResults([]);

    try {
      const data = await getPublicChannel(encodeURIComponent(q));
      if (!data?.channelId) { setError("No public channel found."); return; }

      // Build full results list: primary + otherMatches
      const all = [
        { channelId: data.channelId, name: data.name, memberCount: data.memberCount, isMember: data.isMember },
        ...(data.otherMatches || []),
      ];
      setResults(all);
    } catch (err) {
      setError(err?.response?.data?.message || "No public channel found.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (channelId) => {
    setJoiningId(channelId);
    setError("");
    try {
      await joinPublicChannel(channelId);
      const ch = client.channel("messaging", channelId);
      await ch.watch();
      setSearchParams({ channel: channelId });
      setResults([]);
      setQuery("");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to join channel.");
    } finally {
      setJoiningId(null);
    }
  };

  const handleOpen = async (channelId) => {
    try {
      const ch = client.channel("messaging", channelId);
      await ch.watch();
      setSearchParams({ channel: channelId });
      setResults([]);
      setQuery("");
    } catch {
      setError("Failed to open channel.");
    }
  };

  return (
    <div className="pub-search">
      <p className="pub-search__label">Join Public Channel</p>

      <div className="pub-search__row">
        <div className="pub-search__input-wrap">
          <SearchIcon className="pub-search__input-icon" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="Search by name or ID…"
            className="pub-search__input"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="pub-search__btn"
        >
          {loading ? <span className="pub-search__spinner" /> : "Search"}
        </button>
      </div>

      {error && <p className="pub-search__error">{error}</p>}

      {results.length > 0 && (
        <div className="pub-search__results">
          {results.map(ch => (
            <div key={ch.channelId} className="pub-search__result">
              <div className="pub-search__result-info">
                <HashIcon className="pub-search__result-icon" />
                <div>
                  <p className="pub-search__result-name">{ch.name}</p>
                  <p className="pub-search__result-meta">
                    <UsersIcon className="w-3 h-3 inline mr-1" />
                    {ch.memberCount} member{ch.memberCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              {ch.isMember ? (
                <button
                  className="pub-search__result-btn pub-search__result-btn--open"
                  onClick={() => handleOpen(ch.channelId)}
                >
                  Open
                </button>
              ) : (
                <button
                  className="pub-search__result-btn pub-search__result-btn--join"
                  onClick={() => handleJoin(ch.channelId)}
                  disabled={joiningId === ch.channelId}
                >
                  {joiningId === ch.channelId
                    ? <span className="pub-search__spinner pub-search__spinner--sm" />
                    : <><LogInIcon className="w-3 h-3" /> Join</>
                  }
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PublicChannelJoin;
