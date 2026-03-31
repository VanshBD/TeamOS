import { useState, useCallback, useEffect } from "react";
import {
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getIncomingRequests,
} from "../lib/api";
import toast from "react-hot-toast";
import { SearchIcon, UserPlusIcon, CheckIcon, XIcon, ClockIcon } from "lucide-react";

const PeoplePanel = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  const loadIncoming = useCallback(async () => {
    try {
      const data = await getIncomingRequests();
      setIncomingRequests(data.requests || []);
    } catch {
      // silent
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => { loadIncoming(); }, [loadIncoming]);

  const handleSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const data = await searchUsers(q.trim());
      setResults(data.users || []);
    } catch {
      toast.error("Search failed");
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => handleSearch(query), 400);
    return () => clearTimeout(t);
  }, [query, handleSearch]);

  const handleSendRequest = async (userId) => {
    try {
      await sendFriendRequest(userId);
      toast.success("Friend request sent");
      setResults((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, friendStatus: "sent" } : u))
      );
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to send request");
    }
  };

  const handleAccept = async (requestId, userId) => {
    try {
      await acceptFriendRequest(requestId);
      toast.success("Friend request accepted");
      setIncomingRequests((prev) => prev.filter((r) => r.requestId !== requestId));
      // Update search results if visible
      setResults((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, friendStatus: "friends" } : u))
      );
    } catch {
      toast.error("Failed to accept request");
    }
  };

  const handleReject = async (requestId) => {
    try {
      await rejectFriendRequest(requestId);
      setIncomingRequests((prev) => prev.filter((r) => r.requestId !== requestId));
      toast.success("Request declined");
    } catch {
      toast.error("Failed to decline request");
    }
  };

  const statusButton = (user) => {
    switch (user.friendStatus) {
      case "friends":
        return <span className="friend-status-badge friend-status-badge--friends">Friends</span>;
      case "sent":
        return (
          <span className="friend-status-badge friend-status-badge--sent">
            <ClockIcon className="w-3 h-3" /> Sent
          </span>
        );
      case "incoming":
        return (
          <div style={{ display: "flex", gap: 4 }}>
            <button
              onClick={() => handleAccept(user.requestId, user.id)}
              className="friend-action-btn friend-action-btn--accept"
              title="Accept"
            >
              <CheckIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleReject(user.requestId)}
              className="friend-action-btn friend-action-btn--reject"
              title="Decline"
            >
              <XIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      default:
        return (
          <button
            onClick={() => handleSendRequest(user.id)}
            className="friend-action-btn friend-action-btn--add"
            title="Add friend"
          >
            <UserPlusIcon className="w-3.5 h-3.5" />
          </button>
        );
    }
  };

  return (
    <div style={{ padding: "12px 0" }}>
      {/* Search bar */}
      <div style={{ padding: "0 12px 12px" }}>
        <div className="people-search-wrap">
          <SearchIcon className="people-search-icon" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find people to add…"
            className="people-search-input"
          />
        </div>
      </div>

      {/* Search results */}
      {query.trim() && (
        <div>
          <div className="sidebar__section-header" style={{ padding: "4px 14px 6px" }}>
            <SearchIcon className="w-3.5 h-3.5" />
            <span>Results</span>
          </div>
          {searching && <div className="sidebar-status-msg">Searching…</div>}
          {!searching && results.length === 0 && (
            <div className="sidebar-status-msg">No users found</div>
          )}
          {results.map((user) => (
            <div key={user.id} className="people-user-row">
              <div className="dm-item__avatar-wrap" style={{ flexShrink: 0 }}>
                {user.image
                  ? <img src={user.image} alt={user.name} className="dm-item__avatar" />
                  : <div className="dm-item__avatar dm-item__avatar--placeholder">{(user.name || "?")[0].toUpperCase()}</div>
                }
              </div>
              <span className="dm-item__name" style={{ flex: 1 }}>{user.name}</span>
              {statusButton(user)}
            </div>
          ))}
        </div>
      )}

      {/* Incoming requests */}
      {!query.trim() && (
        <div>
          <div className="sidebar__section-header" style={{ padding: "4px 14px 6px" }}>
            <UserPlusIcon className="w-3.5 h-3.5" />
            <span>Friend Requests</span>
            {incomingRequests.length > 0 && (
              <span className="channel-preview-item__badge" style={{ marginLeft: "auto" }}>
                {incomingRequests.length}
              </span>
            )}
          </div>
          {loadingRequests && <div className="sidebar-status-msg">Loading…</div>}
          {!loadingRequests && incomingRequests.length === 0 && (
            <div className="sidebar-status-msg">No pending requests</div>
          )}
          {incomingRequests.map((req) => (
            <div key={req.requestId} className="people-user-row">
              <div className="dm-item__avatar-wrap" style={{ flexShrink: 0 }}>
                {req.user.image
                  ? <img src={req.user.image} alt={req.user.name} className="dm-item__avatar" />
                  : <div className="dm-item__avatar dm-item__avatar--placeholder">{(req.user.name || "?")[0].toUpperCase()}</div>
                }
              </div>
              <span className="dm-item__name" style={{ flex: 1 }}>{req.user.name}</span>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  onClick={() => handleAccept(req.requestId, req.user.id)}
                  className="friend-action-btn friend-action-btn--accept"
                  title="Accept"
                >
                  <CheckIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleReject(req.requestId)}
                  className="friend-action-btn friend-action-btn--reject"
                  title="Decline"
                >
                  <XIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PeoplePanel;
