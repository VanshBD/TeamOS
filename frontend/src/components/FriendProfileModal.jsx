import { useState, useEffect, useCallback } from "react";
import { useChatContext } from "stream-chat-react";
import { useSearchParams } from "react-router";
import { XIcon, PinIcon, HashIcon, MessageSquareIcon, UserMinus2Icon, AlertTriangleIcon, TrashIcon } from "lucide-react";
import { removeFriend } from "../lib/api";
import toast from "react-hot-toast";

/* ── helpers ── */
const fmtBytes = (bytes) => {
  if (!bytes) return "0 KB";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const Avatar = ({ src, name, size = 72 }) => (
  src
    ? <img src={src} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "2.5px solid rgba(109,40,217,.45)", display: "block", flexShrink: 0 }} />
    : <div style={{ width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg,#6d28d9,#9333ea)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.35, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
        {(name || "?")[0].toUpperCase()}
      </div>
);

/* ── Pinned messages sub-modal ── */
const PinnedSubModal = ({ messages, onClose }) => (
  <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 10001, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(0,0,0,.75)", backdropFilter: "blur(6px)" }}>
    <div onClick={e => e.stopPropagation()} style={{ background: "rgba(18,18,34,.98)", border: "1px solid rgba(109,40,217,.22)", borderRadius: 18, width: "100%", maxWidth: 480, maxHeight: "calc(100vh - 80px)", display: "flex", flexDirection: "column", boxShadow: "0 32px 64px rgba(0,0,0,.7)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 14px", borderBottom: "1px solid rgba(255,255,255,.06)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <PinIcon style={{ width: 16, height: 16, color: "#a78bfa" }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: "#f1f0ff" }}>Pinned Messages</span>
          <span style={{ fontSize: 11, color: "rgba(160,158,192,.5)", background: "rgba(109,40,217,.15)", padding: "2px 8px", borderRadius: 20 }}>{messages.length}</span>
        </div>
        <button onClick={onClose} style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 8, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(160,158,192,.7)" }}>
          <XIcon style={{ width: 14, height: 14 }} />
        </button>
      </div>
      <div style={{ flex: "1 1 0", overflowY: "auto", padding: "8px 0", scrollbarWidth: "thin", scrollbarColor: "rgba(109,40,217,.3) transparent" }}>
        {messages.length === 0
          ? <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px", gap: 12 }}>
              <div style={{ fontSize: 36, opacity: .4 }}>📌</div>
              <p style={{ fontSize: 14, color: "rgba(160,158,192,.45)", margin: 0 }}>No pinned messages</p>
            </div>
          : messages.map((msg, i) => (
              <div key={msg.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 18px", borderBottom: i < messages.length - 1 ? "1px solid rgba(255,255,255,.04)" : "none" }}>
                <Avatar src={msg.user?.image} name={msg.user?.name} size={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#c4b5fd" }}>{msg.user?.name || msg.user?.id}</span>
                    {msg.pinned_at && <span style={{ fontSize: 10, color: "rgba(160,158,192,.4)" }}>{new Date(msg.pinned_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
                  </div>
                  <p style={{ fontSize: 13, color: "rgba(241,240,255,.75)", lineHeight: 1.55, margin: 0, wordBreak: "break-word", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {msg.text || "📎 Attachment"}
                  </p>
                </div>
              </div>
            ))
        }
      </div>
    </div>
  </div>
);

/* ── Confirm dialog ── */
const ConfirmDialog = ({ title, body, confirmLabel, confirmVariant = "danger", onConfirm, onCancel }) => (
  <div onClick={onCancel} style={{ position: "fixed", inset: 0, zIndex: 10002, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(0,0,0,.8)", backdropFilter: "blur(6px)" }}>
    <div onClick={e => e.stopPropagation()} style={{ background: "rgba(18,18,34,.98)", border: "1px solid rgba(239,68,68,.25)", borderRadius: 18, width: "100%", maxWidth: 380, padding: "24px 24px 20px", boxShadow: "0 32px 64px rgba(0,0,0,.7)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <AlertTriangleIcon style={{ width: 20, height: 20, color: "#f87171", flexShrink: 0 }} />
        <span style={{ fontSize: 15, fontWeight: 700, color: "#f1f0ff" }}>{title}</span>
      </div>
      <p style={{ fontSize: 13, color: "rgba(241,240,255,.6)", lineHeight: 1.6, margin: "0 0 20px" }}>{body}</p>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onConfirm} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, background: confirmVariant === "danger" ? "linear-gradient(135deg,#dc2626,#ef4444)" : "linear-gradient(135deg,#6d28d9,#9333ea)", color: "#fff" }}>
          {confirmLabel}
        </button>
        <button onClick={onCancel} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,.1)", cursor: "pointer", fontSize: 13, fontWeight: 600, background: "rgba(255,255,255,.06)", color: "rgba(241,240,255,.8)" }}>
          Cancel
        </button>
      </div>
    </div>
  </div>
);

/* ── Main modal ── */
const FriendProfileModal = ({ friend, onClose, onFriendRemoved }) => {
  const { client } = useChatContext();
  const [, setSearchParams] = useSearchParams();

  const [sharedChannels, setSharedChannels] = useState([]);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [storageBytes, setStorageBytes] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showPinned, setShowPinned] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [confirmDeleteHistory, setConfirmDeleteHistory] = useState(false);
  const [isOnline, setIsOnline] = useState(false);

  const dmChannelId = client?.user?.id
    ? [client.user.id, friend.id].sort().join("-").slice(0, 64)
    : null;

  const loadData = useCallback(async () => {
    if (!client?.user) return;
    setLoading(true);
    try {
      // 1. Presence
      const presRes = await client.queryUsers({ id: { $eq: friend.id } }, {}, { presence: true });
      setIsOnline(presRes.users?.[0]?.online ?? false);

      // 2. DM channel — pinned messages + storage
      if (dmChannelId) {
        try {
          const dmCh = client.channel("messaging", dmChannelId, { members: [client.user.id, friend.id] });
          await dmCh.watch();
          const state = await dmCh.query({ messages: { limit: 300 } });

          // Pinned
          setPinnedMessages(state.pinned_messages || []);

          // Storage estimate from attachments
          let bytes = 0;
          let count = 0;
          (state.messages || []).forEach(msg => {
            count++;
            (msg.attachments || []).forEach(att => { bytes += att.file_size || 0; });
          });
          setStorageBytes(bytes);
          setMessageCount(count);
        } catch { /* DM may not exist yet */ }
      }

      // 3. Shared channels — query channels where both are members
      const channels = await client.queryChannels(
        { members: { $in: [client.user.id] }, type: "messaging" },
        { last_message_at: -1 },
        { limit: 30, state: true }
      );
      const shared = channels.filter(ch => {
        const members = Object.keys(ch.state.members || {});
        const isGroup = members.length > 2;
        return isGroup && members.includes(friend.id);
      });
      setSharedChannels(shared);
    } finally {
      setLoading(false);
    }
  }, [client, friend.id, dmChannelId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Escape to close
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const openDM = async () => {
    if (!dmChannelId) return;
    const ch = client.channel("messaging", dmChannelId, { members: [client.user.id, friend.id] });
    await ch.watch();
    setSearchParams({ channel: ch.id });
    onClose();
  };

  const openChannel = (ch) => {
    setSearchParams({ channel: ch.id });
    onClose();
  };

  const handleRemoveFriend = async () => {
    setConfirmRemove(false);
    setConfirmDeleteHistory(true);
  };

  const doRemove = async (deleteHistory) => {
    setConfirmDeleteHistory(false);
    try {
      await removeFriend(friend.id);
      if (deleteHistory && dmChannelId) {
        try {
          const dmCh = client.channel("messaging", dmChannelId);
          await dmCh.watch();
          await dmCh.truncate();
        } catch { /* channel may not exist */ }
      }
      toast.success("Friend removed");
      onFriendRemoved?.(friend.id);
      onClose();
    } catch {
      toast.error("Failed to remove friend");
    }
  };

  const avatar = friend.image;

  return (
    <>
      <style>{`
        @keyframes fpPanelIn { from { opacity:0; transform:translateX(40px); } to { opacity:1; transform:translateX(0); } }
        .fp-section { margin-bottom: 20px; }
        .fp-section-title { font-size: 11px; font-weight: 700; color: rgba(160,158,192,.5); letter-spacing: .8px; text-transform: uppercase; margin-bottom: 10px; }
        .fp-channel-row { display: flex; align-items: center; gap: 10px; padding: 9px 14px; border-radius: 10px; cursor: pointer; transition: background .12s; }
        .fp-channel-row:hover { background: rgba(109,40,217,.12); }
      `}</style>

      {/* Backdrop */}
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "flex-end", background: "rgba(0,0,0,.65)", backdropFilter: "blur(4px)" }}>
        {/* Panel — slides in from right, full height */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: "rgba(14,14,26,.99)",
            border: "1px solid rgba(109,40,217,.22)",
            borderRadius: "20px 0 0 20px",
            width: "100%",
            maxWidth: 420,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            boxShadow: "-8px 0 60px rgba(0,0,0,.8), 0 0 60px rgba(109,40,217,.08)",
            overflow: "hidden",
            animation: "fpPanelIn .25s cubic-bezier(.4,0,.2,1)",
          }}
        >

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 14px", borderBottom: "1px solid rgba(255,255,255,.06)", flexShrink: 0 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#f1f0ff" }}>Profile</span>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 8, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(160,158,192,.7)" }}>
              <XIcon style={{ width: 14, height: 14 }} />
            </button>
          </div>

          {/* Scrollable body */}
          <div style={{ flex: "1 1 0", overflowY: "auto", padding: "20px 20px 24px", scrollbarWidth: "thin", scrollbarColor: "rgba(109,40,217,.3) transparent" }}>

            {/* Hero */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
              <div style={{ position: "relative" }}>
                <Avatar src={avatar} name={friend.name} size={72} />
                <span style={{ position: "absolute", bottom: 3, right: 3, width: 14, height: 14, borderRadius: "50%", background: isOnline ? "#22c55e" : "#6b7280", border: "2.5px solid rgba(14,14,26,.98)" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 20, fontWeight: 800, color: "#f1f0ff", margin: "0 0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{friend.name}</p>
                <p style={{ fontSize: 12, color: isOnline ? "#4ade80" : "rgba(160,158,192,.5)", margin: 0 }}>{isOnline ? "Online" : "Offline"}</p>
              </div>
              <button onClick={openDM} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 10, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#6d28d9,#9333ea)", color: "#fff", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                <MessageSquareIcon style={{ width: 14, height: 14 }} />
                Message
              </button>
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: "32px 0", color: "rgba(160,158,192,.4)", fontSize: 13 }}>Loading…</div>
            ) : (
              <>
                {/* Stats row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
                  {[
                    { label: "Messages", value: messageCount },
                    { label: "Pinned", value: pinnedMessages.length },
                    { label: "Storage", value: fmtBytes(storageBytes) },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, padding: "14px 12px", textAlign: "center" }}>
                      <p style={{ fontSize: 18, fontWeight: 800, color: "#a78bfa", margin: "0 0 4px" }}>{value}</p>
                      <p style={{ fontSize: 11, color: "rgba(160,158,192,.5)", margin: 0 }}>{label}</p>
                    </div>
                  ))}
                </div>

                {/* Pinned messages */}
                {pinnedMessages.length > 0 && (
                  <div className="fp-section">
                    <p className="fp-section-title">Pinned Messages</p>
                    <button onClick={() => setShowPinned(true)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(109,40,217,.2)", background: "rgba(109,40,217,.08)", cursor: "pointer", transition: "background .12s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(109,40,217,.16)"}
                      onMouseLeave={e => e.currentTarget.style.background = "rgba(109,40,217,.08)"}
                    >
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(109,40,217,.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <PinIcon style={{ width: 16, height: 16, color: "#a78bfa" }} />
                      </div>
                      <div style={{ flex: 1, textAlign: "left" }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#f1f0ff", margin: "0 0 2px" }}>{pinnedMessages.length} Pinned Message{pinnedMessages.length !== 1 ? "s" : ""}</p>
                        <p style={{ fontSize: 11, color: "rgba(160,158,192,.5)", margin: 0 }}>Click to view all</p>
                      </div>
                    </button>
                  </div>
                )}

                {/* Shared channels */}
                {sharedChannels.length > 0 && (
                  <div className="fp-section">
                    <p className="fp-section-title">Shared Channels ({sharedChannels.length})</p>
                    <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 12, overflow: "hidden" }}>
                      {sharedChannels.map((ch, i) => (
                        <div key={ch.id} onClick={() => openChannel(ch)} className="fp-channel-row" style={{ borderBottom: i < sharedChannels.length - 1 ? "1px solid rgba(255,255,255,.04)" : "none" }}>
                          <div style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(109,40,217,.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <HashIcon style={{ width: 14, height: 14, color: "#a78bfa" }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: "#f1f0ff", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ch.data?.name || ch.id}</p>
                            <p style={{ fontSize: 11, color: "rgba(160,158,192,.45)", margin: 0 }}>{Object.keys(ch.state.members || {}).length} members</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Remove friend */}
                <div style={{ marginTop: 8, paddingTop: 20, borderTop: "1px solid rgba(239,68,68,.12)" }}>
                  <button onClick={() => setConfirmRemove(true)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px 0", borderRadius: 11, border: "1px solid rgba(239,68,68,.3)", background: "rgba(239,68,68,.08)", cursor: "pointer", color: "#f87171", fontSize: 13, fontWeight: 700, transition: "background .15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,.16)"}
                    onMouseLeave={e => e.currentTarget.style.background = "rgba(239,68,68,.08)"}
                  >
                    <UserMinus2Icon style={{ width: 15, height: 15 }} />
                    Remove Friend
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showPinned && <PinnedSubModal messages={pinnedMessages} onClose={() => setShowPinned(false)} />}

      {confirmRemove && (
        <ConfirmDialog
          title="Remove Friend"
          body={`Are you sure you want to remove ${friend.name} from your friends? You won't be able to message each other until you reconnect.`}
          confirmLabel="Remove Friend"
          onConfirm={handleRemoveFriend}
          onCancel={() => setConfirmRemove(false)}
        />
      )}

      {confirmDeleteHistory && (
        <ConfirmDialog
          title="Delete Chat History?"
          body="Do you want to delete your message history with this person? This cannot be undone. Choose No to keep your chat history."
          confirmLabel="Yes, Delete History"
          onConfirm={() => doRemove(true)}
          onCancel={() => doRemove(false)}
        />
      )}
    </>
  );
};

export default FriendProfileModal;
