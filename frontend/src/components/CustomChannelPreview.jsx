import { HashIcon } from "lucide-react";

const CustomChannelPreview = ({ channel, setActiveChannel, activeChannel }) => {
  const isActive = activeChannel?.id === channel.id;
  const isDM = !channel.data?.name && Object.keys(channel.state?.members || {}).length === 2;
  if (isDM) return null;

  const unreadCount = channel.countUnread();

  return (
    <button
      onClick={() => setActiveChannel(channel)}
      className={`channel-preview-item ${isActive ? "channel-preview-item--active" : ""}`}
    >
      <HashIcon className="channel-preview-item__icon" />
      <span className="channel-preview-item__name">
        {channel.data.name || channel.data.id}
      </span>
      {unreadCount > 0 && (
        <span className="channel-preview-item__badge">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
};

export default CustomChannelPreview;
