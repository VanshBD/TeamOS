import { useState, useEffect, useCallback } from "react";
import { useChannelStateContext, useChatContext } from "stream-chat-react";
import { useSearchParams } from "react-router";
import { useUser } from "@clerk/clerk-react";
import {
  XIcon, PinIcon, HashIcon, LockIcon, UsersIcon,
  MessageSquareIcon, UserPlusIcon, TrashIcon, LogOutIcon,
  AlertTriangleIcon, CrownIcon, ShieldIcon, UserXIcon, BanIcon,
} from "lucide-react";
import { getFriends, sendFriendRequest, removeMemberApi, banMemberApi } from "../lib/api";
import toast from "react-hot-toast";

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

/* ── Member action menu (owner only) ── */
const MemberMenu = ({ member, onRemove, onBan, onClose }) => (
  <div
    onClick={onClose}
    style={{ position: "fixed", inset: 0, zIndex: 10003, background: "transparent" }}
  >
    <div
      onClick={e => e.stopPropagation()}
      style={{
        position: "fixed", zIndex: 10004,
        bottom: 0, left: 0, right: 0,
        background: "rgba(13,13,24,.98)",
        border: "1px solid rgba(109,40,217,.2)",
        borderRadius: "20px 20px 0 0",
        padding: "0 0 env(safe-area-inset-bottom,0)",
        boxShadow: "0 -8px 40px rgba(0,0,0,.7)",
        animation: "menuSlideUp .2s cubic-bezier(.4,0,.2,1)",
      }}
    >
      <style>{`@keyframes menuSlideUp { from { transform:translateY(100%); opacity:0; } to { transform:translateY(0); opacity:1; } }`}</style>

      {/* Handle bar */}
      <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,.15)" }} />
      </div>

      {/* Member info */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px 14px", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
        {member.user?.image
          ? <img src={member.user.image} alt="" style={{ width: 42, height: 42, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
          : <div style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg,#6d28d9,#9333ea)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
              {(member.user?.name || "?")[0].toUpperCase()}
            </div>
        }
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#f1f0ff", margin: 0 }}>{member.user?.name || member.user?.id}</p>
          <p style={{ fontSize: 12, color: "rgba(160,158,192,.5)", margin: "2px 0 0" }}>Channel member</p>
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: "8px 0 16px" }}>
        <button
          onClick={onRemove}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 14,
            padding: "14px 20px", background: "none", border: "none",
            cursor: "pointer", transition: "background .12s", textAlign: "left",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,.08)"}
          onMouseLeave={e => e.currentTarget.style.background = "none"}
        >
          <div style={{ width: 38, height: 38, borderRadius: 12, background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <UserXIcon style={{ width: 16, height: 16, color: "#f87171" }} />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#fca5a5", margin: 0 }}>Remove from channel</p>
            <p style={{ fontSize: 12, color: "rgba(160,158,192,.45)", margin: "2px 0 0" }}>They lose access but keep their history</p>
          </div>
        </button>

        <button
          onClick={onBan}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 14,
            padding: "14px 20px", background: "none", border: "none",
            cursor: "pointer", transition: "background .12s", textAlign: "left",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,.08)"}
          onMouseLeave={e => e.currentTarget.style.background = "none"}
        >
          <div style={{ width: 38, height: 38, borderRadius: 12, background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <BanIcon style={{ width: 16, height: 16, color: "#f87171" }} />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#fca5a5", margin: 0 }}>Ban member</p>
            <p style={{ fontSize: 12, color: "rgba(160,158,192,.45)", margin: "2px 0 0" }}>Blocked from rejoining — past history preserved</p>
          </div>
        </button>

        <div style={{ margin: "8px 16px 0" }}>
          <button
            onClick={onClose}
            style={{
              width: "100%", padding: "12px 0", borderRadius: 12,
              border: "1px solid rgba(255,255,255,.08)",
              background: "rgba(255,255,255,.05)", cursor: "pointer",
              color: "rgba(241,240,255,.7)", fontSize: 14, fontWeight: 600,
              transition: "background .12s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.1)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,.05)"}
          >
            Cancel
          </button>
        </div>
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
  const [loading, setLoading] = useState(true);
  const [showPinned, setShowPinned] = useState(false);
  const [confirm, setConfirm] = useState(null); // { type, member? }
  const [friendIds, setFriendIds] = useState(new Set());
  const [sentRequests, setSentRequests] = useState(new Set());
  const [actionLoading, setActionLoading] = useState(null);
  const [menuMember, setMenuMember] = useState(null); // member whose action menu is open
  const [removedIds, setRemovedIds] = useState(new Set()); // optimistically hide removed members

  /* ── Role detection ── */
  const isOwner =
    channel.data?.created_by_id === user?.id ||
    channel.data?.created_by?.id === user?.id ||
    channel.state.members[user?.id]?.channel_role === "owner" ||
    channel.state.members[user?.id]?.channel_role === "admin";

  /* ── Members sorted: owner first, friends next, rest alpha ── */
  const rawMembers = Object.values(channel.state.members || {}).filter(m => !removedIds.has(m.user?.id));
  const sortedMembers = [...rawMembers].sort((a, b) => {
    const aOwner = channel.data?.created_by_id === a.user?.id || a.channel_role === "owner" || a.channel_role === "admin";
    const bOwner = channel.data?.created_by_id === b.user?.id || b.channel_role === "owner" || b.channel_role === "admin";
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
      onClose(); setSearchParams({});
    } catch { toast.error("Failed to delete channel"); }
  };

  const handleLeaveChannel = async () => {
    setConfirm(null);
    try {
      await channel.removeMembers([user.id]);
      toast.success("Left channel");
      onClose(); setSearchParams({});
    } catch { toast.error("Failed to leave channel"); }
  };

  const handleSendDM = async (targetUser) => {
    if (!client?.user) return;
    try {
      const channelId = [client.user.id, targetUser.id].sort().join("-").slice(0, 64);
      const dmCh = client.channel("messaging", channelId, { members: [client.user.id, targetUser.id] });
      await dmCh.watch();
      setSearchParams({ channel: dmCh.id });
      onClose();
    } catch { toast.error("Failed to open DM"); }
  };

  const handleAddFriend = async (targetUserId) => {
    setActionLoading(targetUserId);
    try {
      await sendFriendRequest(targetUserId);
      setSentRequests(prev => new Set([...prev, targetUserId]));
      toast.success("Friend request sent");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to send request");
    } finally { setActionLoading(null); }
  };

  const handleRemoveMember = async (member) => {
    setMenuMember(null); setConfirm(null);
    setActionLoading(member.user.id);
    try {
      await removeMemberApi(channel.id, member.user.id);
      setRemovedIds(prev => new Set([...prev, member.user.id]));
      toast.success(`${member.user.name || "Member"} removed`);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to remove member");
    } finally { setActionLoading(null); }
  };

  const handleBanMember = async (member) => {
    setMenuMember(null); setConfirm(null);
    setActionLoading(member.user.id);
    try {
      await banMemberApi(channel.id, member.user.id);
      setRemovedIds(prev => new Set([...prev, member.user.id]));
      toast.success(`${member.user.name || "Member"} banned — they can view past history but can't access the channel`);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to ban member");
    } finally { setActionLoading(null); }
  };

  const getRoleBadge = (m) => {
    const isCreator = channel.data?.created_by_id === m.user?.id || channel.data?.created_by?.id === m.user?.id;
    const role = m.channel_role;
    if (isCreator || role === "owner") return { label: "Owner", color: "#fbbf24", bg: "rgba(251,191,36,.15)", Icon: CrownIcon };
    if (role === "admin") return { label: "Admin", color: "#a78bfa", bg: "rgba(109,40,217,.2)", Icon: ShieldIcon };
    return null;
  };

  const isMemberOwner = (m) =>
    channel.data?.created_by_id === m.user?.id ||
    channel.data?.created_by?.id === m.user?.id ||
    m.channel_role === "owner" || m.channel_role === "admin";

  const isPrivate = channel.data?.private;
  const channelName = channel.data?.name || channel.data?.id;
  const description = channel.data?.description;
  const createdAt = channel.data?.created_at
    ? new Date(channel.data.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : null;

  return (
    <>
      <style>{`
        @keyframes cdModalIn { from { opacity:0; transform:translateX(40px); } to { opacity:1; transform:translateX(0); } }
        .cdm-row { display:flex; align-items:center; gap:10px; padding:10px 16px; transition:background .12s; }
        .cdm-row:hover { background:rgba(109,40,217,.07); }
        .cdm-row:hover .cdm-actions { opacity:1; }
        .cdm-actions { opacity:0; display:flex; gap:5px; transition:opacity .15s; margin-left:auto; flex-shrink:0; }
        .cdm-btn { display:flex; align-items:center; justify-content:center; width:27px; height:27px; border-radius:7px; border:none; cursor:pointer; transition:background .12s, transform .1s; flex-shrink:0; }
        .cdm-btn:active { transform:scale(.9); }
        .cdm-btn--msg { background:rgba(109,40,217,.18); color:#a78bfa; }
        .cdm-btn--msg:hover { background:rgba(109,40,217,.38); }
        .cdm-btn--add { background:rgba(34,197,94,.14); color:#4ade80; }
        .cdm-btn--add:hover { background:rgba(34,197,94,.28); }
        .cdm-btn--sent { background:rgba(234,179,8,.1); color:#facc15; cursor:default; }
        .cdm-btn--danger { background:rgba(239,68,68,.12); color:#f87171; }
        .cdm-btn--danger:hover { background:rgba(239,68,68,.26); }
      `}</style>

      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "flex-end", background: "rgba(0,0,0,.65)", backdropFilter: "blur(4px)" }}>
        <div onClick={e => e.stopPropagation()} style={{ background: "rgba(14,14,26,.99)", border: "1px solid rgba(109,40,217,.22)", borderRadius: "20px 0 0 20px", width: "100%", maxWidth: 480, height: "100%", display: "flex", flexDirection: "column", boxShadow: "-8px 0 60px rgba(0,0,0,.8)", overflow: "hidden", animation: "cdModalIn .25s cubic-bezier(.4,0,.2,1)" }}>

          {/* Header */}
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

          {/* Body */}
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
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "0 20px 24px" }}>
                  {[
                    { label: "Members", value: sortedMembers.length },
                    { label: "Pinned", value: pinnedMessages.length },
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
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 20px 10px" }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(160,158,192,.5)", letterSpacing: ".8px", textTransform: "uppercase", margin: 0 }}>
                      Members — {sortedMembers.length}
                    </p>
                    {isOwner && (
                      <span style={{ fontSize: 10, color: "rgba(167,139,250,.5)", background: "rgba(109,40,217,.12)", padding: "2px 8px", borderRadius: 20 }}>
                        Hover to manage
                      </span>
                    )}
                  </div>

                  <div>
                    {sortedMembers.map((m, i) => {
                      const isMe = m.user?.id === user?.id;
                      const isFriend = friendIds.has(m.user?.id);
                      const hasSent = sentRequests.has(m.user?.id);
                      const badge = getRoleBadge(m);
                      const isActioning = actionLoading === m.user?.id;
                      const memberIsOwner = isMemberOwner(m);

                      return (
                        <div key={m.user?.id || i} className="cdm-row"
                          style={{ borderBottom: i < sortedMembers.length - 1 ? "1px solid rgba(255,255,255,.03)" : "none", opacity: isActioning ? 0.5 : 1 }}
                        >
                          <MemberAvatar user={m.user} size={36} />

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
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

                          {/* Actions for other members */}
                          {!isMe && (
                            <div className="cdm-actions">
                              {/* DM */}
                              <button className="cdm-btn cdm-btn--msg" onClick={() => handleSendDM(m.user)} title="Send message">
                                <MessageSquareIcon style={{ width: 13, height: 13 }} />
                              </button>

                              {/* Add friend */}
                              {!isFriend && (
                                hasSent
                                  ? <button className="cdm-btn cdm-btn--sent" title="Request sent" disabled>
                                      <UserPlusIcon style={{ width: 13, height: 13 }} />
                                    </button>
                                  : <button className="cdm-btn cdm-btn--add" onClick={() => handleAddFriend(m.user.id)} title="Add friend" disabled={isActioning}>
                                      <UserPlusIcon style={{ width: 13, height: 13 }} />
                                    </button>
                              )}

                              {/* Owner-only: manage member */}
                              {isOwner && !memberIsOwner && (
                                <button
                                  className="cdm-btn cdm-btn--danger"
                                  onClick={() => setMenuMember(m)}
                                  title="Manage member"
                                  disabled={isActioning}
                                >
                                  <UserXIcon style={{ width: 13, height: 13 }} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Danger zone */}
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

      {/* Sub-modals */}
      {showPinned && <PinnedSubModal messages={pinnedMessages} onClose={() => setShowPinned(false)} />}

      {/* Member action menu */}
      {menuMember && (
        <MemberMenu
          member={menuMember}
          channelId={channel.id}
          onClose={() => setMenuMember(null)}
          onRemove={() => { setMenuMember(null); setConfirm({ type: "remove", member: menuMember }); }}
          onBan={() => { setMenuMember(null); setConfirm({ type: "ban", member: menuMember }); }}
        />
      )}

      {/* Confirm dialogs */}
      {confirm?.type === "delete" && (
        <ConfirmDialog
          title="Delete Channel"
          body={`Permanently delete "${channelName}"? All messages and history will be removed for everyone.`}
          confirmLabel="Delete Forever"
          onConfirm={handleDeleteChannel}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm?.type === "leave" && (
        <ConfirmDialog
          title="Leave Channel"
          body={`Leave "${channelName}"? You can rejoin later if it's a public channel.`}
          confirmLabel="Leave Channel"
          onConfirm={handleLeaveChannel}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm?.type === "remove" && (
        <ConfirmDialog
          title="Remove Member"
          body={`Remove ${confirm.member?.user?.name || "this member"} from "${channelName}"? They will lose access but can rejoin if it's public.`}
          confirmLabel="Remove"
          onConfirm={() => handleRemoveMember(confirm.member)}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm?.type === "ban" && (
        <ConfirmDialog
          title="Ban Member"
          body={`Ban ${confirm.member?.user?.name || "this member"} from "${channelName}"? They will be removed and blocked from rejoining. They can still view their past message history.`}
          confirmLabel="Ban Member"
          onConfirm={() => handleBanMember(confirm.member)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  );
};

export default ChannelDetailModal;
