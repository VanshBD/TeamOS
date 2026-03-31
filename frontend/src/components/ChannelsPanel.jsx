import { useState } from "react";
import { ChannelList } from "stream-chat-react";
import { HashIcon, PlusIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import CustomChannelPreview from "./CustomChannelPreview";
import PublicChannelJoin from "./PublicChannelJoin";

const SHOW_LIMIT = 20;

const ChannelsPanel = ({ chatClient, activeChannel, setActiveChannel, onCreateChannel, onClose }) => {
  const [showAll, setShowAll] = useState(false);

  return (
    <div style={{ padding: "8px 0" }}>
      {/* Create channel button */}
      <div style={{ padding: "0 12px 10px" }}>
        <button
          onClick={() => { onCreateChannel(); onClose?.(); }}
          className="create-channel-btn"
        >
          <PlusIcon className="size-4" />
          <span>Create Channel</span>
        </button>
      </div>

      {/* Join public channel search */}
      <PublicChannelJoin />

      {/* Joined channels list */}
      <ChannelList
        filters={{ members: { $in: [chatClient?.user?.id] } }}
        options={{ state: true, watch: true }}
        Preview={({ channel }) => (
          <CustomChannelPreview
            channel={channel}
            activeChannel={activeChannel}
            setActiveChannel={(ch) => {
              setActiveChannel(ch);
              onClose?.();
            }}
          />
        )}
        List={({ children, loading, error: listError }) => {
          const childArray = Array.isArray(children)
            ? children.filter(Boolean)
            : children ? [children] : [];
          const total = childArray.length;
          const visible = showAll ? childArray : childArray.slice(0, SHOW_LIMIT);

          return (
            <div>
              <div className="sidebar__section-header">
                <HashIcon className="w-3.5 h-3.5" />
                <span>Your Channels</span>
              </div>
              {loading && <div className="sidebar-status-msg">Loading…</div>}
              {listError && <div className="sidebar-status-msg sidebar-status-msg--error">Error loading channels</div>}
              {!loading && total === 0 && (
                <div className="sidebar-status-msg">No channels yet. Create or join one above.</div>
              )}
              <div className="sidebar__channel-list">{visible}</div>
              {total > SHOW_LIMIT && (
                <button className="sidebar__show-more" onClick={() => setShowAll((v) => !v)}>
                  {showAll
                    ? <><ChevronUpIcon className="w-3 h-3" /> Show less</>
                    : <><ChevronDownIcon className="w-3 h-3" /> {total - SHOW_LIMIT} more</>
                  }
                </button>
              )}
            </div>
          );
        }}
      />
    </div>
  );
};

export default ChannelsPanel;
