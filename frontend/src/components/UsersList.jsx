import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router";
import { useChatContext } from "stream-chat-react";
import * as Sentry from "@sentry/react";

const UsersList = ({ activeChannel }) => {
  const { client } = useChatContext();
  const [_, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const fetchUsers = useCallback(async () => {
    if (!client?.user) return;
    try {
      const response = await client.queryUsers(
        { id: { $ne: client.user.id } },
        { name: 1 },
        { limit: 20, presence: true } // presence:true fetches live online status
      );
      const filtered = response.users.filter((u) => !u.id.startsWith("recording-"));
      setUsers(filtered);
    } catch (err) {
      console.log("Error fetching users", err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // subscribe to presence events so online dot updates live
  useEffect(() => {
    if (!client) return;

    const handlePresence = (event) => {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === event.user?.id ? { ...u, online: event.user.online } : u
        )
      );
    };

    client.on("user.presence.changed", handlePresence);
    return () => client.off("user.presence.changed", handlePresence);
  }, [client]);


  const startDirectMessage = async (targetUser) => {
    if (!targetUser || !client?.user) return;
    try {
      const channelId = [client.user.id, targetUser.id].sort().join("-").slice(0, 64);
      const channel = client.channel("messaging", channelId, {
        members: [client.user.id, targetUser.id],
      });
      await channel.watch();
      setSearchParams({ channel: channel.id });
    } catch (error) {
      console.log("Error creating DM", error);
      Sentry.captureException(error, {
        tags: { component: "UsersList" },
        extra: { context: "create_direct_message", targetUserId: targetUser?.id },
      });
    }
  };

  if (isLoading) return <div className="team-channel-list__message">Loading users...</div>;
  if (isError) return <div className="team-channel-list__message">Failed to load users</div>;
  if (!users.length) return <div className="team-channel-list__message">No other users found</div>;

  return (
    <div className="team-channel-list__users">
      {users.map((user) => {
        const channelId = [client.user.id, user.id].sort().join("-").slice(0, 64);
        const channel = client.channel("messaging", channelId, {
          members: [client.user.id, user.id],
        });
        const unreadCount = channel.countUnread();
        const isActive = activeChannel?.id === channelId;

        return (
          <button
            key={user.id}
            onClick={() => startDirectMessage(user)}
            className={`str-chat__channel-preview-messenger ${
              isActive ? "!bg-black/20 border-l-8 border-purple-500 shadow-lg" : ""
            }`}
          >
            <div className="flex items-center gap-2 w-full">
              {/* avatar + online dot */}
              <div className="relative flex-shrink-0">
                {user.image ? (
                  <img src={user.image} alt={user.name || user.id} className="w-7 h-7 rounded-full" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gray-500 flex items-center justify-center">
                    <span className="text-xs text-white font-bold">
                      {(user.name || user.id).charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                {/* online indicator dot */}
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#350d36] ${
                    user.online ? "bg-green-400" : "bg-gray-500"
                  }`}
                />
              </div>

              <span className="str-chat__channel-preview-messenger-name truncate flex-1">
                {user.name || user.id}
              </span>

              {unreadCount > 0 && (
                <span className="flex items-center justify-center size-4 text-xs rounded-full bg-red-500 text-white flex-shrink-0">
                  {unreadCount}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default UsersList;
