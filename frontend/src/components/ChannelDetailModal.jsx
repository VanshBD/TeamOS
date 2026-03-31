import { useState, useEffect, useCallback } from "react";
import { useChannelStateContext, useChatContext } from "stream-chat-react";
import { useSearchParams } from "react-router";
import { useUser } from "@clerk/clerk-react";
import {
  XIcon, PinIcon, HashIcon, LockIcon, UsersIcon,
  MessageSquareIcon, UserPlusIcon, TrashIcon, LogOutIcon,
  AlertTriangleIcon, CrownIcon, ShieldIcon,
} from "lucide-react";
import { getFriends, sendFriendRequest } from "../lib/api";
import toast from "react-hot-toast";

/* ── helpers ── */
const fmtBytes = (b) => {
  if (!b) return "0 KB";
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
};

const MemberAvatar = ({ user, size = 36 }) =>
  user?.image
    ? <img src={user.image} alt={user.name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
    : <div style={{ width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg,#6d28d9,#9333ea)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: size * 0.35, fontWeight: 700, flexShrink: 0 }}>
        {(user?.name || "?")[0].toUpperCase()}
      </div>;

/* ── Pinned sub-modal ── */
const PinnedSubModal = ({ messages, onClose }) => (
  <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 10001, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(0,0,0,.78)", backdropFilter: "blur(6px)" }}>
    <div onClick={e => e.stopPropagation()} style={{ background: "rgba(18,18,34,.98)", border: "1px solid rgba(109,40,217,.22)", borderRadius: 18, width: "100%", maxWidth: 480, maxHeight: "calc(100vh - 80px)", display: "flex", flexDirection: "column", boxShadow: "0 32px 64px rgba(0,0,0,.7)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 14px", borderBottom: "1px solid rgba(255,255,255,.06)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <PinIcon style={{ width: 15, height: 15, color: "#a78bfa" }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: "#f1f0ff" }}>Pinned Messages</span>
          <span style={{ fontSize: 11, background: "rgba(109,40,217,.18)", color: "#a78bfa", padding: "2px 8px", borderRadius: 20 }}>{messages.length}</span>
        </div>
        <button onClick={onClose} style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 8, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(160,158,192,.7)" }}>
          <XIcon style={{ width: 14, height: 14 }} />
        </button>
      </div>
      <div style={{ flex: "1 1 0", overflowY: "auto", padding: "8px 0", scrollbarWidth: "thin", scrollbarColor: "rgba(109,40,217,.3) transparent" }}>
        {messages.length === 0
          ? <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 24px", gap: 12 }}>
              <div style={{ fontSize: 36, opacity: .4 }}>📌</div>
              <p style={{ fontSize: 14, color: "rgba(160,158,192,.45)", margin: 0 }}>No pinned messages</p>
            </div>
          : messages.map((msg, i) => (
              <div key={msg.id} style={{ display: "flex", gap: 12, padding: "12px 18px", borderBottom: i < messages.length - 1 ? "1px solid rgba(255,255,255,.04)" : "none" }}>
                <MemberAvatar user={msg.user} size={34} />
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
const ConfirmDialog = ({ title, body, confirmLabel, danger = true, onConfirm, onCancel }) => (
  <div onClick={onCancel} style={{ position: "fixed", inset: 0, zIndex: 10002, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(0,0,0,.82)", backdropFilter: "blur(6px)" }}>
    <div onClick={e => e.stopPropagation()} style={{ background: "rgba(18,18,34,.98)", border: `1px solid ${danger ? "rgba(239,68,68,.25)" : "rgba(109,40,217,.25)"}`, borderRadius: 18, width: "100%", maxWidth: 380, padding: "24px 24px 20px", boxShadow: "0 32px 64px rgba(0,0,0,.7)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <AlertTriangleIcon style={{ width: 20, height: 20, color: danger ? "#f87171" : "#a78bfa", flexShrink: 0 }} />
        <span style={{ fontSize: 15, fontWeight: 700, color: "#f1f0ff" }}>{title}</span>
      </div>
      <p style={{ fontSize: 13, color: "rgba(241,240,255,.6)", lineHeight: 1.6, margin: "0 0 20px" }}>{body}</p>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onConfirm} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, background: danger ? "linear-gradient(135deg,#dc2626,#ef4444)" : "linear-gradient(135deg,#6d28d9,#9333ea)", color: "#fff" }}>
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
const ChannelDetailModal = ({ onClose }) => {
  const { channel } = useChannelStateContext();
  const { client } = useChatContext();
  const { user } = useUser();
  const [, setSearchParams] = useSearchParams();

  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [storageBytes, setStorageBytes] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showPinned, setShowPinned] = useState(false);
  const [confirm, setConfirm] = useState(null); // { type: "delete"|"leave" }
  const [friendIds, setFriendIds] = useState(new Set());
  const [sentRequests, setSentRequests] = useState(new Set());
  const [actionLoading, setActionLoading] = useState(null); // userId being actioned

  /* ── Determine current user's role ── */
  const myMember = channel.state.members[user?.id];
  const myRole = myMember?.channel_role;
  const isOwner = myRole === "owner" || myRole === "admin"
    || channel.data?.created_by_id === user?.id
    || channel.data?.created_by?.id === user?.id;

  /* ── Sort members: owner first, then friends, then rest ── */
  const rawMembers = Object.values(channel.state.members || {});
  const sortedMembers = [...rawMembers].sort((a, b) => {
    const aOwner = a.channel_role === "owner" || a.channel_role === "admin" || channel.data?.created_by_id === a.user?.id;
    const bOwner = b.channel_role === "owner" || b.channel_role === "admin" || channel.data?.created_by_id === b.user?.id;
    if (aOwner && !bOwner) return -1;
    if (!aOwner && bOwner) return 1;
    const aFriend = friendIds.has(a.user?.id);
    const bFriend = friendIds.has(b.user?.id);
    if (aFriend && !bFriend) return -1;
    if (!aFriend && bFriend) return 1;
    return (a.user?.name || "").localeCompare(b.user?.name || "");
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [stateRes, friendsRes] = await Promise.all([
        channel.query({ messages: { limit: 300 } }),
        getFriends().catch(() => ({ friends: [] })),
      ]);
      setPinnedMessages(stateRes.pinned_messages || []);
      let bytes = 0, count = 0;
      (stateRes.messages || []).forEach(msg => {
        count++;
        (msg.attachments || []).forEach(att => { bytes += att.file_size || 0; });
      });
      setStorageBytes(bytes);
      setMessageCount(count);
      setFriendIds(new Set((friendsRes.friends || []).map(f => f.id)));
    } finally {
      setLoading(false);
    }
  }, [channel]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  /* ── Actions ── */
  const handleDeleteChannel = async () => {
    setConfirm(null);
    try {
      await channel.delete();
      toast.success("Channel deleted");
      onClose();
      setSearchParams({});
    } catch {
      toast.error("Failed to delete channel");
    }
  };

  const handleLeaveChannel = async () => {
    setConfirm(null);
    try {
      await channel.removeMembers([user.id]);
      toast.success("Left channel");
      onClose();
      setSearchParams({});
    } catch {
      toast.error("Failed to leave channel");
    }
  };

  const handleSendDM = async (targetUser) => {
    if (!client?.user) return;
    try {
      const channelId = [client.user.id, targetUser.id].sort().join("-").slice(0, 64);
      const dmCh = client.channel("messaging", channelId, { members: [client.user.id, targetUser.id] });
      await dmCh.watch();
      setSearchParams({ channel: dmCh.id });
      onClose();
    } catch {
      toast.error("Failed to open DM");
    }
  };

  const handleAddFriend = async (targetUserId) => {
    setActionLoading(targetUserId);
    try {
      await sendFriendRequest(targetUserId);
      setSentRequests(prev => new Set([...prev, targetUserId]));
      toast.success("Friend request sent");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to send request");
    } finally {
      setActionLoading(null);
    }
  };

  const isPrivate = channel.data?.private;
  const channelName = channel.data?.name || channel.data?.id;
  const description = channel.data?.description;
  const createdAt = channel.data?.created_at
    ? new Date(channel.data.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : null;

  const getRoleBadge = (m) => {
    const isCreator = channel.data?.created_by_id === m.user?.id || channel.data?.created_by?.id === m.user?.id;
    const role = m.channel_role;
    if (isCreator || role === "owner") return { label: "Owner", color: "#fbbf24", bg: "rgba(251,191,36,.15)", Icon: CrownIcon };
    if (role === "admin") return { label: "Admin", color: "#a78bfa", bg: "rgba(109,40,217,.2)", Icon: ShieldIcon };
    return null;
  };

  return (
    <>
      <style>{`
        @keyframes cdModalIn { from { opacity:0; transform:translateX(40px); } to { opacity:1; transform:translateX(0); } }
        .cdm-member-row { display:flex; align-items:center; gap:10px; padding:10px 16px; transition:background .12s; }
        .cdm-member-row:hover { background:rgba(109,40,217,.08); }
        .cdm-member-row:hover .cdm-member-actions { opacity:1; }
        .cdm-member-actions { opacity:0; display:flex; gap:6px; transition:opacity .15s; }
        .cdm-action-btn { display:flex; align-items:center; justify-content:center; width:28px; height:28px; border-radius:7px; border:none; cursor:pointer; transition:background .12s, transform .1s; flex-shrink:0; }
        .cdm-action-btn:active { transform:scale(.9); }
        .cdm-action-btn--msg { background:rgba(109,40,217,.2); color:#a78bfa; }
        .cdm-action-btn--msg:hover { background:rgba(109,40,217,.4); }
        .cdm-action-btn--add { background:rgba(34,197,94,.15); color:#4ade80; }
        .cdm-action-btn--add:hover { background:rgba(34,197,94,.3); }
        .cdm-action-btn--sent { background:rgba(234,179,8,.1); color:#facc15; cursor:default; }
      `}</style>

      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "flex-end", background: "rgba(0,0,0,.65)", backdropFilter: "blur(4px)" }}>
        <div onClick={e => e.stopPropagation()} style={{ background: "rgba(14,14,26,.99)", border: "1px solid rgba(109,40,217,.22)", borderRadius: "20px 0 0 20px", width: "100%", maxWidth: 480, height: "100%", display: "flex", flexDirection: "column", boxShadow: "-8px 0 60px rgba(0,0,0,.8)", overflow: "hidden", animation: "cdModalIn .25s cubic-bezier(.4,0,.2,1)" }}>

          {/* ── Header ── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 14px", borderBottom: "1px solid rgba(255,255,255,.06)", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(109,40,217,.18)", border: "1px solid rgba(109,40,217,.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {isPrivate ? <LockIcon style={{ width: 16, height: 16, color: "#a78bfa" }} /> : <HashIcon style={{ width: 16, height: 16, color: "#a78bfa" }} />}
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#f1f0ff", margin: 0 }}>{channelName}</p>
                {createdAt && <p style={{ fontSize: 11, color: "rgba(160,158,192,.45)", margin: 0 }}>Created {createdAt}</p>}
              </div>
            </div>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 8, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(160,158,192,.7)" }}>
              <XIcon style={{ width: 14, height: 14 }} />
            </button>
          </div>

          {/* ── Body ── */}
          <div style={{ flex: "1 1 0", overflowY: "auto", padding: "20px 0 8px", scrollbarWidth: "thin", scrollbarColor: "rgba(109,40,217,.3) transparent" }}>

            {description && (
              <div style={{ margin: "0 20px 20px", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, padding: "12px 14px" }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "rgba(160,158,192,.5)", textTransform: "uppercase", letterSpacing: ".8px", margin: "0 0 6px" }}>Description</p>
                <p style={{ fontSize: 13, color: "rgba(241,240,255,.75)", lineHeight: 1.6, margin: 0 }}>{description}</p>
              </div>
            )}

            {loading ? (
              <div style={{ textAlign: "center", padding: "32px 0", color: "rgba(160,158,192,.4)", fontSize: 13 }}>Loading…</div>
            ) : (
              <>
                {/* Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, margin: "0 20px 24px" }}>
                  {[
                    { label: "Members", value: sortedMembers.length },
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
                  <div style={{ margin: "0 20px 20px" }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(160,158,192,.5)", letterSpacing: ".8px", textTransform: "uppercase", marginBottom: 10 }}>Pinned Messages</p>
                    <button onClick={() => setShowPinned(true)}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(109,40,217,.2)", background: "rgba(109,40,217,.08)", cursor: "pointer", transition: "background .12s" }}
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

                {/* Members list */}
                <div style={{ marginBottom: 8 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(160,158,192,.5)", letterSpacing: ".8px", textTransform: "uppercase", margin: "0 20px 10px" }}>
                    Members — {sortedMembers.length}
                  </p>
                  <div>
                    {sortedMembers.map((m, i) => {
                      const isMe = m.user?.id === user?.id;
                      const isFriend = friendIds.has(m.user?.id);
                      const hasSent = sentRequests.has(m.user?.id);
                      const badge = getRoleBadge(m);
                      const isActioning = actionLoading === m.user?.id;

                      return (
                        <div key={m.user?.id || i} className="cdm-member-row"
                          style={{ borderBottom: i < sortedMembers.length - 1 ? "1px solid rgba(255,255,255,.03)" : "none" }}
                        >
                          <MemberAvatar user={m.user} size={36} />

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: "#f1f0ff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {m.user?.name || m.user?.id}
                                {isMe && <span style={{ color: "rgba(160,158,192,.4)", fontWeight: 400 }}> (you)</span>}
                              </span>
                              {badge && (
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, padding: "2px 7px", borderRadius: 20, background: badge.bg, color: badge.color, fontWeight: 700, flexShrink: 0 }}>
                                  <badge.Icon style={{ width: 9, height: 9 }} />
                                  {badge.label}
                                </span>
                              )}
                              {!badge && isFriend && (
                                <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: "rgba(34,197,94,.12)", color: "#4ade80", fontWeight: 600, flexShrink: 0 }}>Friend</span>
                              )}
                            </div>
                          </div>

                          {/* Actions — only for other members */}
                          {!isMe && (
                            <div className="cdm-member-actions">
                              {/* DM button */}
                              <button
                                className="cdm-action-btn cdm-action-btn--msg"
                                onClick={() => handleSendDM(m.user)}
                                title="Send message"
                              >
                                <MessageSquareIcon style={{ width: 13, height: 13 }} />
                              </button>

                              {/* Add friend / sent */}
                              {!isFriend && (
                                hasSent
                                  ? <button className="cdm-action-btn cdm-action-btn--sent" title="Request sent" disabled>
                                      <UserPlusIcon style={{ width: 13, height: 13 }} />
                                    </button>
                                  : <button
                                      className="cdm-action-btn cdm-action-btn--add"
                                      onClick={() => handleAddFriend(m.user.id)}
                                      title="Add friend"
                                      disabled={isActioning}
                                    >
                                      <UserPlusIcon style={{ width: 13, height: 13 }} />
                                    </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── Danger zone ── */}
                <div style={{ margin: "16px 20px 12px", paddingTop: 16, borderTop: "1px solid rgba(255,255,255,.06)" }}>
                  {isOwner ? (
                    <button
                      onClick={() => setConfirm({ type: "delete" })}
                      style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px 0", borderRadius: 11, border: "1px solid rgba(239,68,68,.3)", background: "rgba(239,68,68,.08)", cursor: "pointer", color: "#f87171", fontSize: 13, fontWeight: 700, transition: "background .15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,.16)"}
                      onMouseLeave={e => e.currentTarget.style.background = "rgba(239,68,68,.08)"}
                    >
                      <TrashIcon style={{ width: 15, height: 15 }} />
                      Delete Channel
                    </button>
                  ) : (
                    <button
                      onClick={() => setConfirm({ type: "leave" })}
                      style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px 0", borderRadius: 11, border: "1px solid rgba(239,68,68,.3)", background: "rgba(239,68,68,.08)", cursor: "pointer", color: "#f87171", fontSize: 13, fontWeight: 700, transition: "background .15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,.16)"}
                      onMouseLeave={e => e.currentTarget.style.background = "rgba(239,68,68,.08)"}
                    >
                      <LogOutIcon style={{ width: 15, height: 15 }} />
                      Leave Channel
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showPinned && <PinnedSubModal messages={pinnedMessages} onClose={() => setShowPinned(false)} />}

      {confirm?.type === "delete" && (
        <ConfirmDialog
          title="Delete Channel"
          body={`Are you sure you want to permanently delete "${channelName}"? All messages and history will be removed for everyone.`}
          confirmLabel="Delete Forever"
          onConfirm={handleDeleteChannel}
          onCancel={() => setConfirm(null)}
        />
      )}

      {confirm?.type === "leave" && (
        <ConfirmDialog
          title="Leave Channel"
          body={`Are you sure you want to leave "${channelName}"? You can rejoin later if it's a public channel.`}
          confirmLabel="Leave Channel"
          onConfirm={handleLeaveChannel}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  );
};

export default ChannelDetailModal;
