import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router";
import { useChatContext } from "stream-chat-react";
import * as Sentry from "@sentry/react";

const UsersList = ({ activeChannel }) => {
  const { client } = useChatContext();
  const [, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const fetchUsers = useCallback(async () => {
    if (!client?.user) return;
    try {
      const response = await client.queryUsers(
        { id: { $ne: client.user.id } },
        { name: 1 },
        { limit: 20, presence: true }
      );
      setUsers(response.users.filter((u) => !u.id.startsWith("recording-")));
    } catch (err) {
      console.log("Error fetching users", err);
      setIsError(true);
      Sentry.captureException(err);
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => {
    if (!client) return;
    const handler = (event) =>
      setUsers((prev) =>
        prev.map((u) => (u.id === event.user?.id ? { ...u, online: event.user.online } : u))
      );
    client.on("user.presence.changed", handler);
    return () => client.off("user.presence.changed", handler);
  }, [client]);

  const startDM = async (targetUser) => {
    if (!targetUser || !client?.user) return;
    try {
      const channelId = [client.user.id, targetUser.id].sort().join("-").slice(0, 64);
      const channel = client.channel("messaging", channelId, {
        members: [client.user.id, targetUser.id],
      });
      await channel.watch();
      setSearchParams({ channel: channel.id });
    } catch (err) {
      console.log("Error creating DM", err);
      Sentry.captureException(err);
    }
  };

  if (isLoading) return <div className="sidebar-status-msg">Loading users…</div>;
  if (isError)   return <div className="sidebar-status-msg sidebar-status-msg--error">Failed to load users</div>;
  if (!users.length) return <div className="sidebar-status-msg">No other users found</div>;

  return (
    <div className="dm-list">
      {users.map((user) => {
        const channelId = [client.user.id, user.id].sort().join("-").slice(0, 64);
        const ch = client.channel("messaging", channelId, { members: [client.user.id, user.id] });
        const unread = ch.countUnread();
        const isActive = activeChannel?.id === channelId;

        return (
          <button
            key={user.id}
            onClick={() => startDM(user)}
            className={`dm-item ${isActive ? "dm-item--active" : ""}`}
          >
            {/* Avatar + online dot */}
            <div className="dm-item__avatar-wrap">
              {user.image
                ? <img src={user.image} alt={user.name || user.id} className="dm-item__avatar" />
                : (
                  <div className="dm-item__avatar dm-item__avatar--placeholder">
                    {(user.name || user.id)[0].toUpperCase()}
                  </div>
                )
              }
              <span className={`dm-item__dot ${user.online ? "dm-item__dot--online" : "dm-item__dot--offline"}`} />
            </div>

            <span className="dm-item__name">{user.name || user.id}</span>

            {unread > 0 && (
              <span className="dm-item__badge">{unread > 99 ? "99+" : unread}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default UsersList;
