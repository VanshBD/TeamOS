import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router";
import { useChatContext } from "stream-chat-react";
import { getFriends } from "../lib/api";
import toast from "react-hot-toast";

const FriendsList = ({ activeChannel, onClose }) => {
  const { client } = useChatContext();
  const [, setSearchParams] = useSearchParams();
  const [friends, setFriends] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [streamUsers, setStreamUsers] = useState({});

  const loadFriends = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getFriends();
      setFriends(data.friends || []);

      if (client && data.friends?.length) {
        const ids = data.friends.map((f) => f.id);
        const res = await client.queryUsers(
          { id: { $in: ids } },
          { name: 1 },
          { limit: 50, presence: true }
        );
        const map = {};
        res.users.forEach((u) => { map[u.id] = u; });
        setStreamUsers(map);
      }
    } catch {
      toast.error("Failed to load friends");
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  useEffect(() => { loadFriends(); }, [loadFriends]);

  useEffect(() => {
    if (!client) return;
    const handler = (event) =>
      setStreamUsers((prev) => ({
        ...prev,
        [event.user?.id]: { ...(prev[event.user?.id] || {}), online: event.user?.online },
      }));
    client.on("user.presence.changed", handler);
    return () => client.off("user.presence.changed", handler);
  }, [client]);

  const startDM = async (friend) => {
    if (!client?.user) return;
    try {
      const channelId = [client.user.id, friend.id].sort().join("-").slice(0, 64);
      const channel = client.channel("messaging", channelId, {
        members: [client.user.id, friend.id],
      });
      await channel.watch();
      setSearchParams({ channel: channel.id });
      onClose?.();
    } catch {
      toast.error("Failed to open conversation");
    }
  };

  if (isLoading) return <div className="sidebar-status-msg">Loading friends…</div>;
  if (!friends.length)
    return (
      <div className="sidebar-status-msg" style={{ padding: "16px 14px", lineHeight: 1.5 }}>
        No friends yet. Go to the People tab to find and add people.
      </div>
    );

  return (
    <div className="dm-list">
      {friends.map((friend) => {
          const su = streamUsers[friend.id];
          const isOnline = su?.online ?? false;
          const channelId = [client.user.id, friend.id].sort().join("-").slice(0, 64);
          const ch = client.channel("messaging", channelId, { members: [client.user.id, friend.id] });
          const unread = ch.countUnread();
          const isActive = activeChannel?.id === channelId;
          const avatar = friend.image || su?.image;

          return (
            <div
              key={friend.id}
              onClick={() => startDM(friend)}
              className={`dm-item ${isActive ? "dm-item--active" : ""}`}
              style={{ cursor: "pointer" }}
            >
              <div className="dm-item__avatar-wrap">
                {avatar
                  ? <img src={avatar} alt={friend.name} className="dm-item__avatar" />
                  : <div className="dm-item__avatar dm-item__avatar--placeholder">{(friend.name || "?")[0].toUpperCase()}</div>
                }
                <span className={`dm-item__dot ${isOnline ? "dm-item__dot--online" : "dm-item__dot--offline"}`} />
              </div>
              <span className="dm-item__name" style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {friend.name}
              </span>
              {unread > 0 && <span className="dm-item__badge">{unread > 99 ? "99+" : unread}</span>}
            </div>
          );
      })}
    </div>
  );
};

export default FriendsList;
