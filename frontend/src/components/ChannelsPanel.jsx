import { useState } from "react";
import { ChannelList } from "stream-chat-react";
import { HashIcon, PlusIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import CustomChannelPreview from "./CustomChannelPreview";
import PublicChannelJoin from "./PublicChannelJoin";

const SHOW_LIMIT = 20;

/* ── Skeleton shimmer for loading state ── */
const ChannelSkeleton = () => (
  <div style={{
    display: "flex", alignItems: "center", gap: 10,
    padding: "8px 14px", margin: "2px 0",
  }}>
    <style>{`
      @keyframes shimmer {
        0%   { background-position: -200% center; }
        100% { background-position: 200% center; }
      }
      .ch-skeleton {
        background: linear-gradient(90deg,
          rgba(255,255,255,.04) 25%,
          rgba(109,40,217,.12) 50%,
          rgba(255,255,255,.04) 75%
        );
        background-size: 200% 100%;
        animation: shimmer 1.6s ease-in-out infinite;
        border-radius: 6px;
      }
    `}</style>
    {/* Hash icon placeholder */}
    <div className="ch-skeleton" style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0 }} />
    {/* Name placeholder */}
    <div className="ch-skeleton" style={{ height: 12, flex: 1, maxWidth: "70%" }} />
    {/* Badge placeholder */}
    <div className="ch-skeleton" style={{ width: 20, height: 12, borderRadius: 10 }} />
  </div>
);

/* ── Empty state ── */
const EmptyChannels = ({ onCreateChannel }) => (
  <div style={{
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "28px 20px 20px", gap: 12, textAlign: "center",
  }}>
    {/* Icon */}
    <div style={{
      width: 52, height: 52, borderRadius: 16,
      background: "rgba(109,40,217,.12)",
      border: "1px solid rgba(109,40,217,.2)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <HashIcon style={{ width: 22, height: 22, color: "rgba(167,139,250,.6)" }} />
    </div>
    <div>
      <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(241,240,255,.7)", margin: "0 0 4px" }}>
        No channels yet
      </p>
      <p style={{ fontSize: 11, color: "rgba(160,158,192,.45)", margin: 0, lineHeight: 1.5 }}>
        Create a channel or join a public one above
      </p>
    </div>
    <button
      onClick={onCreateChannel}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "8px 16px", borderRadius: 10,
        background: "rgba(109,40,217,.18)",
        border: "1px solid rgba(109,40,217,.3)",
        color: "#a78bfa", fontSize: 12, fontWeight: 600,
        cursor: "pointer", transition: "all .18s",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = "rgba(109,40,217,.3)"; e.currentTarget.style.borderColor = "rgba(147,51,234,.5)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "rgba(109,40,217,.18)"; e.currentTarget.style.borderColor = "rgba(109,40,217,.3)"; }}
    >
      <PlusIcon style={{ width: 13, height: 13 }} />
      Create Channel
    </button>
  </div>
);

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
              {/* Section header */}
              <div className="sidebar__section-header" style={{ marginTop: 6 }}>
                <HashIcon className="w-3.5 h-3.5" />
                <span>Your Channels</span>
              </div>

              {/* Loading skeletons */}
              {loading && (
                <div>
                  {[1, 2, 3].map(i => <ChannelSkeleton key={i} />)}
                </div>
              )}

              {/* Error */}
              {listError && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  margin: "8px 12px", padding: "10px 12px",
                  background: "rgba(239,68,68,.08)",
                  border: "1px solid rgba(239,68,68,.2)",
                  borderRadius: 10,
                }}>
                  <span style={{ fontSize: 14 }}>⚠️</span>
                  <span style={{ fontSize: 12, color: "#fca5a5" }}>Failed to load channels</span>
                </div>
              )}

              {/* Empty state */}
              {!loading && !listError && total === 0 && (
                <EmptyChannels onCreateChannel={() => { onCreateChannel?.(); onClose?.(); }} />
              )}

              {/* Channel list */}
              {!loading && total > 0 && (
                <div className="sidebar__channel-list">{visible}</div>
              )}

              {/* Show more / less */}
              {total > SHOW_LIMIT && (
                <button className="sidebar__show-more" onClick={() => setShowAll(v => !v)}>
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
