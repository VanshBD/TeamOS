import { useUser, useClerk } from "@clerk/clerk-react";
import { useNavigate } from "react-router";
import React, { useEffect, useState, useCallback, useMemo, createContext, useContext } from "react";
import { useSearchParams } from "react-router";
import { useStreamChat } from "../hooks/useStreamChat";
import PageLoader from "../components/PageLoader";
import toast from "react-hot-toast";
import ReactionDisplay from "../components/ReactionDisplay";
import { pinMessageApi, unpinMessageApi } from "../lib/api";

import {
  Chat, Channel, MessageList, Thread, Window,
  MessageSimple, useMessageContext, useChatContext, useChannelStateContext,
} from "stream-chat-react";

import "../styles/stream-chat-theme.css";
import {
  ReplyIcon, PinIcon, XIcon as CloseIcon,
  MessageSquareIcon, HashIcon, UsersIcon, ArrowLeftIcon, LogOutIcon,
} from "lucide-react";
import CreateChannelModal from "../components/CreateChannelModal";
import CustomChannelHeader from "../components/CustomChannelHeader";
import CallMessage from "../components/CallMessage";
import LiveCallBanner from "../components/LiveCallBanner";
import PinnedMessageBanner from "../components/PinnedMessageBanner";
import IncomingCallManager from "../components/IncomingCallManager";
import ChatInputWrapper from "../components/ChatInputWrapper";
import PollMessage from "../components/PollMessage";
import { CurrentLocationCard, LiveLocationCard } from "../components/LocationMessage";
import { parseCallMessage } from "../lib/callMessages";
import FriendsList from "../components/FriendsList";
import ChannelsPanel from "../components/ChannelsPanel";
import PeoplePanel from "../components/PeoplePanel";
import { getIncomingRequests } from "../lib/api";
import ChannelDetailModal from "../components/ChannelDetailModal";

// Context so child components (CustomChannelHeader) can open panels at root level
export const PanelContext = createContext({ openFriendProfile: () => {}, openChannelDetail: () => {} });

const ReplyContext = createContext({ replyingTo: null, setReplyingTo: () => {} });

const highlightMessage = (msgId) => {
  const el = document.querySelector(`[data-message-id="${msgId}"]`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.add("msg-highlight");
  setTimeout(() => el.classList.remove("msg-highlight"), 1500);
};

const QuotedReply = ({ quotedMessage, onClick }) => {
  if (!quotedMessage) return null;
  return (
    <button onClick={onClick} className="quoted-reply" title="Jump to original message">
      <div className="quoted-reply__bar" />
      <div className="quoted-reply__body">
        <span className="quoted-reply__name">{quotedMessage.user?.name || quotedMessage.user?.id || "Unknown"}</span>
        <span className="quoted-reply__text">
          {quotedMessage.text?.slice(0, 80) || "Message"}
          {quotedMessage.text?.length > 80 ? "…" : ""}
        </span>
      </div>
    </button>
  );
};

const EnhancedMessage = () => {
  const { message } = useMessageContext();
  const { client } = useChatContext();
  const { channel } = useChannelStateContext();
  const { setReplyingTo } = useContext(ReplyContext);

  // Resolve user image: message.user.image may be missing — fall back to Stream's user cache
  const userImage = message.user?.image
    || client?.state?.users?.[message.user?.id]?.image
    || null;

  const { isOwnMessage, formattedTime } = useMemo(() => {
    const isOwn = message.user?.id === client?.user?.id;
    const d = new Date(message.created_at);
    const today = d.toDateString() === new Date().toDateString();
    return {
      isOwnMessage: isOwn,
      formattedTime: today
        ? d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
        : d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
    };
  }, [message.user?.id, message.created_at, client?.user?.id]);

  const quotedMessage = message.quoted_message;
  const replyCount = message.reply_count || 0;

  const handleAddReaction = useCallback(async (messageId, emoji) => {
    if (!channel) return toast.error("No channel selected");
    try {
      const existing = message.latest_reactions?.find(r => r.type === emoji && r.user?.id === client?.user?.id);
      if (existing) await channel.deleteReaction(messageId, emoji);
      else await channel.sendReaction(messageId, { type: emoji });
    } catch { toast.error("Failed to update reaction"); }
  }, [channel, message.latest_reactions, client?.user?.id]);

  const handlePin = useCallback(async () => {
    try {
      if (message.pinned) { await unpinMessageApi(message.id); toast.success("Unpinned"); }
      else { await pinMessageApi(message.id); toast.success("Pinned"); }
    } catch { toast.error("Failed to pin message"); }
  }, [message.id, message.pinned]);

  const jumpToOriginal = useCallback(() => {
    if (quotedMessage?.id) highlightMessage(quotedMessage.id);
  }, [quotedMessage?.id]);

  return (
    <div data-message-id={message.id} className={`msg-row group ${isOwnMessage ? "msg-row--own" : "msg-row--other"}`}>
      {!isOwnMessage && (
        <div className="msg-avatar">
          {userImage
            ? <img src={userImage} alt="" className="msg-avatar__img" />
            : <div className="msg-avatar__placeholder">{(message.user?.name || "?")[0].toUpperCase()}</div>
          }
        </div>
      )}
      <div className={`msg-content ${isOwnMessage ? "msg-content--own" : ""}`}>
        {!isOwnMessage && (
          <div className="msg-meta">
            <span className="msg-meta__name">{message.user?.name || message.user?.id}</span>
            <span className="msg-meta__time">{formattedTime}</span>
            {message.pinned && <span className="msg-pin-badge">📌</span>}
          </div>
        )}
        <div className={`msg-bubble ${isOwnMessage ? "msg-bubble--own" : "msg-bubble--other"}`}>
          {quotedMessage && <QuotedReply quotedMessage={quotedMessage} onClick={jumpToOriginal} />}
          {(message.poll || message.attachments?.some(a => a.type === "poll")) && (
            <PollMessage message={message} isOwnMessage={isOwnMessage} />
          )}
          <p className="msg-text">
            {message.text && !message.text.startsWith("__LIVE_LOC_UPDATE__")
              && !message.attachments?.some(a => a.type === "poll") ? message.text : ""}
          </p>
          {message.attachments?.length > 0 && (
            <div className="msg-attachments">
              {message.attachments.map((att, i) => {
                if (att.type === "image" && att.image_url)
                  return (
                    <a key={i} href={att.image_url} target="_blank" rel="noopener noreferrer" className="msg-attachment-img-wrap">
                      <img src={att.image_url} alt={att.fallback || "image"} className="msg-attachment-img" />
                    </a>
                  );
                if ((att.type === "location" || att.type === "live_location") && att.title_link) {
                  const isLive = att.type === "live_location";
                  return isLive
                    ? <LiveLocationCard key={i} attachment={att} message={message} isOwnMessage={isOwnMessage} />
                    : <CurrentLocationCard key={i} attachment={att} isOwnMessage={isOwnMessage} />;
                }
                if (att.type === "file" && att.asset_url) {
                  const sizeKB = att.file_size ? Math.round(att.file_size / 1024) : null;
                  return (
                    <a key={i} href={att.asset_url} target="_blank" rel="noopener noreferrer" download
                      className={`msg-attachment-file ${isOwnMessage ? "msg-attachment-file--own" : ""}`}>
                      <span className="msg-attachment-file__icon">📎</span>
                      <div className="msg-attachment-file__info">
                        <span className="msg-attachment-file__name">{att.title || "File"}</span>
                        {sizeKB && <span className="msg-attachment-file__size">{sizeKB} KB</span>}
                      </div>
                      <span className="msg-attachment-file__dl">↓</span>
                    </a>
                  );
                }
                return null;
              })}
            </div>
          )}
          {isOwnMessage && (
            <span className="msg-bubble__time">{formattedTime}{message.pinned && " 📌"}</span>
          )}
        </div>
        {replyCount > 0 && (
          <button onClick={() => setReplyingTo(message)} className={`msg-reply-count ${isOwnMessage ? "msg-reply-count--own" : ""}`}>
            <ReplyIcon className="w-3 h-3" />
            {replyCount} {replyCount === 1 ? "reply" : "replies"}
          </button>
        )}
        {message.latest_reactions?.length > 0 && (
          <div className={`msg-reactions ${isOwnMessage ? "msg-reactions--own" : ""}`}>
            <ReactionDisplay reactions={message.latest_reactions} onAddReaction={handleAddReaction} message={message} />
          </div>
        )}
        <div className={`msg-actions ${isOwnMessage ? "msg-actions--own" : ""}`}>
          <button onClick={() => setReplyingTo(message)} className="msg-action-btn" title="Reply">
            <ReplyIcon className="w-3.5 h-3.5" /><span>Reply</span>
          </button>
          <button onClick={handlePin} className="msg-action-btn" title={message.pinned ? "Unpin" : "Pin"}>
            <PinIcon className="w-3.5 h-3.5" /><span>{message.pinned ? "Unpin" : "Pin"}</span>
          </button>
        </div>
      </div>
      {isOwnMessage && (
        <div className="msg-avatar">
          {userImage
            ? <img src={userImage} alt="" className="msg-avatar__img" />
            : <div className="msg-avatar__placeholder">{(message.user?.name || "?")[0].toUpperCase()}</div>
          }
        </div>
      )}
    </div>
  );
};

const CustomMessage = React.memo(() => {
  const { message } = useMessageContext();
  if (!message || !message.user) return <MessageSimple />;
  if (parseCallMessage(message.text)) return <div className="px-4 py-2"><CallMessage message={message} /></div>;
  return <EnhancedMessage />;
});

// ── Friend profile panel — renders in place of chat area ────────
import { removeFriend } from "../lib/api";

const FriendProfilePanel = ({ friend, onClose, onFriendRemoved, chatClient, onNavigate, onBack }) => {
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [messageCount, setMessageCount] = useState(0);
  const [callCount, setCallCount] = useState(0);
  const [sharedChannels, setSharedChannels] = useState([]);
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPinned, setShowPinned] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [confirmDeleteHistory, setConfirmDeleteHistory] = useState(false);
  const [resolvedImage, setResolvedImage] = useState(friend.image || null);

  const dmChannelId = chatClient?.user?.id
    ? [chatClient.user.id, friend.id].sort().join("-").slice(0, 64)
    : null;

  useEffect(() => {
    if (!chatClient?.user) return;
    let cancelled = false;
    (async () => {
      try {
        const presRes = await chatClient.queryUsers({ id: { $eq: friend.id } }, {}, { presence: true });
        if (!cancelled) {
          setIsOnline(presRes.users?.[0]?.online ?? false);
          // Resolve image from Stream if not passed in
          if (!friend.image && presRes.users?.[0]?.image) setResolvedImage(presRes.users[0].image);
        }
        if (dmChannelId) {
          const dmCh = chatClient.channel("messaging", dmChannelId, { members: [chatClient.user.id, friend.id] });
          await dmCh.watch();
          const state = await dmCh.query({ messages: { limit: 300 } });
          if (!cancelled) {
            setPinnedMessages(state.pinned_messages || []);
            const msgs = state.messages || [];
            setMessageCount(msgs.length);
            setCallCount(msgs.filter(m => m.text?.startsWith("__CALL__")).length);
          }
        }
        const channels = await chatClient.queryChannels(
          { members: { $in: [chatClient.user.id] }, type: "messaging" },
          { last_message_at: -1 },
          { limit: 30, state: true }
        );
        const shared = channels.filter(ch => {
          const mids = Object.keys(ch.state.members || {});
          return mids.length > 2 && mids.includes(friend.id);
        });
        if (!cancelled) setSharedChannels(shared);
      } catch { /* silent */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [chatClient, friend.id, dmChannelId]);

  const openDM = async () => {
    if (!dmChannelId) return;
    const ch = chatClient.channel("messaging", dmChannelId, { members: [chatClient.user.id, friend.id] });
    await ch.watch();
    onNavigate(ch);
  };

  const doRemove = async (deleteHistory) => {
    setConfirmDeleteHistory(false);
    try {
      await removeFriend(friend.id);
      if (deleteHistory && dmChannelId) {
        try { const c = chatClient.channel("messaging", dmChannelId); await c.watch(); await c.truncate(); } catch {}
      }
      toast.success("Friend removed");
      onFriendRemoved?.(friend.id);
    } catch { toast.error("Failed to remove friend"); }
  };

  const avatar = resolvedImage;

  return (
    <div style={{ flex: "1 1 0", minWidth: 0, height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", background: "#0f1117" }}>
      <style>{`
        @keyframes fpIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
        .fp-panel { animation: fpIn .2s ease; }
        .fp-ch-row { display:flex; align-items:center; gap:10px; padding:10px 16px; cursor:pointer; transition:background .12s; border-radius:10px; }
        .fp-ch-row:hover { background:rgba(109,40,217,.12); }
        .fp-pin-row { display:flex; gap:12px; padding:12px 0; border-bottom:1px solid rgba(255,255,255,.04); }
        .fp-pin-row:last-child { border-bottom:none; }
      `}</style>

      {/* Header bar */}
      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 18px", borderBottom:"1px solid rgba(255,255,255,.06)", flexShrink:0, background:"rgba(109,40,217,.04)" }}>
        <button onClick={onBack || onClose} style={{ display:"flex", alignItems:"center", justifyContent:"center", width:34, height:34, borderRadius:10, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.1)", color:"rgba(241,240,255,.7)", cursor:"pointer", flexShrink:0 }}>
          <ArrowLeftIcon style={{ width:16, height:16 }} />
        </button>
        <span style={{ fontSize:15, fontWeight:700, color:"#f1f0ff" }}>Profile</span>
      </div>

      {/* Scrollable content */}
      <div className="fp-panel" style={{ flex:"1 1 0", overflowY:"auto", padding:"28px 24px 40px", scrollbarWidth:"thin", scrollbarColor:"rgba(109,40,217,.3) transparent" }}>

        {/* Hero */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:12, marginBottom:32, textAlign:"center" }}>
          <div style={{ position:"relative" }}>
            {avatar
              ? <img src={avatar} alt={friend.name} style={{ width:88, height:88, borderRadius:"50%", objectFit:"cover", border:"3px solid rgba(109,40,217,.5)" }} />
              : <div style={{ width:88, height:88, borderRadius:"50%", background:"linear-gradient(135deg,#6d28d9,#9333ea)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:34, fontWeight:800, color:"#fff" }}>{(friend.name||"?")[0].toUpperCase()}</div>
            }
            <span style={{ position:"absolute", bottom:4, right:4, width:16, height:16, borderRadius:"50%", background:isOnline?"#22c55e":"#6b7280", border:"3px solid #0f1117" }} />
          </div>
          <div>
            <p style={{ fontSize:22, fontWeight:800, color:"#f1f0ff", margin:"0 0 4px" }}>{friend.name}</p>
            <p style={{ fontSize:13, color:isOnline?"#4ade80":"rgba(160,158,192,.5)", margin:0 }}>{isOnline?"Online":"Offline"}</p>
          </div>
          <button onClick={openDM} style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 24px", borderRadius:12, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#6d28d9,#9333ea)", color:"#fff", fontSize:14, fontWeight:700 }}>
            <MessageSquareIcon style={{ width:15, height:15 }} />
            Send Message
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign:"center", padding:"32px 0", color:"rgba(160,158,192,.4)", fontSize:13 }}>Loading…</div>
        ) : (
          <>
            {/* Stats */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:28 }}>
              {[{ label:"Messages", value:messageCount }, { label:"Pinned", value:pinnedMessages.length }, { label:"Calls", value:callCount }].map(({ label, value }) => (
                <div key={label} style={{ background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.07)", borderRadius:14, padding:"16px 14px", textAlign:"center" }}>
                  <p style={{ fontSize:22, fontWeight:800, color:"#a78bfa", margin:"0 0 4px" }}>{value}</p>
                  <p style={{ fontSize:12, color:"rgba(160,158,192,.5)", margin:0 }}>{label}</p>
                </div>
              ))}
            </div>

            {/* Pinned messages */}
            {pinnedMessages.length > 0 && (
              <div style={{ marginBottom:24 }}>
                <p style={{ fontSize:11, fontWeight:700, color:"rgba(160,158,192,.5)", letterSpacing:".8px", textTransform:"uppercase", margin:"0 0 12px" }}>Pinned Messages</p>
                <div style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.06)", borderRadius:14, padding:"4px 14px", marginBottom:8 }}>
                  {(showPinned ? pinnedMessages : pinnedMessages.slice(0,3)).map((msg) => (
                    <div key={msg.id} className="fp-pin-row">
                      {msg.user?.image
                        ? <img src={msg.user.image} alt="" style={{ width:32, height:32, borderRadius:"50%", objectFit:"cover", flexShrink:0 }} />
                        : <div style={{ width:32, height:32, borderRadius:"50%", background:"linear-gradient(135deg,#6d28d9,#9333ea)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:12, fontWeight:700, flexShrink:0 }}>{(msg.user?.name||"?")[0].toUpperCase()}</div>
                      }
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:12, fontWeight:600, color:"#c4b5fd", margin:"0 0 2px" }}>{msg.user?.name||msg.user?.id}</p>
                        <p style={{ fontSize:13, color:"rgba(241,240,255,.7)", margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{msg.text||"📎 Attachment"}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {pinnedMessages.length > 3 && (
                  <button onClick={() => setShowPinned(v => !v)} style={{ background:"none", border:"none", color:"#a78bfa", fontSize:12, cursor:"pointer", padding:0 }}>
                    {showPinned ? "Show less" : `Show all ${pinnedMessages.length}`}
                  </button>
                )}
              </div>
            )}

            {/* Shared channels */}
            {sharedChannels.length > 0 && (
              <div style={{ marginBottom:24 }}>
                <p style={{ fontSize:11, fontWeight:700, color:"rgba(160,158,192,.5)", letterSpacing:".8px", textTransform:"uppercase", margin:"0 0 12px" }}>Shared Channels</p>
                <div style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.06)", borderRadius:14, overflow:"hidden" }}>
                  {sharedChannels.map((ch, i) => (
                    <div key={ch.id} className="fp-ch-row" onClick={() => onNavigate(ch)} style={{ borderBottom: i < sharedChannels.length-1 ? "1px solid rgba(255,255,255,.04)" : "none", borderRadius:0 }}>
                      <div style={{ width:34, height:34, borderRadius:10, background:"rgba(109,40,217,.15)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <HashIcon style={{ width:15, height:15, color:"#a78bfa" }} />
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:13, fontWeight:600, color:"#f1f0ff", margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{ch.data?.name||ch.id}</p>
                        <p style={{ fontSize:11, color:"rgba(160,158,192,.45)", margin:0 }}>{Object.keys(ch.state.members||{}).length} members</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Remove friend */}
            <div style={{ paddingTop:20, borderTop:"1px solid rgba(239,68,68,.1)" }}>
              <button onClick={() => setConfirmRemove(true)} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"12px 0", borderRadius:12, border:"1px solid rgba(239,68,68,.3)", background:"rgba(239,68,68,.08)", cursor:"pointer", color:"#f87171", fontSize:13, fontWeight:700 }}
                onMouseEnter={e => e.currentTarget.style.background="rgba(239,68,68,.16)"}
                onMouseLeave={e => e.currentTarget.style.background="rgba(239,68,68,.08)"}
              >
                Remove Friend
              </button>
            </div>
          </>
        )}
      </div>

      {/* Confirm dialogs */}
      {confirmRemove && (
        <div onClick={() => setConfirmRemove(false)} style={{ position:"fixed", inset:0, zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:16, background:"rgba(0,0,0,.8)", backdropFilter:"blur(6px)" }}>
          <div onClick={e => e.stopPropagation()} style={{ background:"rgba(18,18,34,.98)", border:"1px solid rgba(239,68,68,.25)", borderRadius:18, width:"100%", maxWidth:360, padding:"24px" }}>
            <p style={{ fontSize:15, fontWeight:700, color:"#f1f0ff", margin:"0 0 10px" }}>Remove Friend</p>
            <p style={{ fontSize:13, color:"rgba(241,240,255,.6)", lineHeight:1.6, margin:"0 0 20px" }}>Remove {friend.name} from friends? You won't be able to message each other until you reconnect.</p>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => { setConfirmRemove(false); setConfirmDeleteHistory(true); }} style={{ flex:1, padding:"10px 0", borderRadius:10, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#dc2626,#ef4444)", color:"#fff", fontSize:13, fontWeight:700 }}>Remove</button>
              <button onClick={() => setConfirmRemove(false)} style={{ flex:1, padding:"10px 0", borderRadius:10, border:"1px solid rgba(255,255,255,.1)", cursor:"pointer", background:"rgba(255,255,255,.06)", color:"rgba(241,240,255,.8)", fontSize:13, fontWeight:600 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {confirmDeleteHistory && (
        <div onClick={() => doRemove(false)} style={{ position:"fixed", inset:0, zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:16, background:"rgba(0,0,0,.8)", backdropFilter:"blur(6px)" }}>
          <div onClick={e => e.stopPropagation()} style={{ background:"rgba(18,18,34,.98)", border:"1px solid rgba(239,68,68,.25)", borderRadius:18, width:"100%", maxWidth:360, padding:"24px" }}>
            <p style={{ fontSize:15, fontWeight:700, color:"#f1f0ff", margin:"0 0 10px" }}>Delete Chat History?</p>
            <p style={{ fontSize:13, color:"rgba(241,240,255,.6)", lineHeight:1.6, margin:"0 0 20px" }}>Delete your message history with {friend.name}? This cannot be undone.</p>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => doRemove(true)} style={{ flex:1, padding:"10px 0", borderRadius:10, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#dc2626,#ef4444)", color:"#fff", fontSize:13, fontWeight:700 }}>Yes, Delete</button>
              <button onClick={() => doRemove(false)} style={{ flex:1, padding:"10px 0", borderRadius:10, border:"1px solid rgba(255,255,255,.1)", cursor:"pointer", background:"rgba(255,255,255,.06)", color:"rgba(241,240,255,.8)", fontSize:13, fontWeight:600 }}>Keep History</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Sidebar tab definitions ──────────────────────────────────────
const TABS = [
  { id: "messages", label: "Messages", Icon: MessageSquareIcon },
  { id: "channels", label: "Channels", Icon: HashIcon },
  { id: "people",   label: "People",   Icon: UsersIcon },
];

const HomePage = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeChannel, setActiveChannel] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("messages");
  const [replyingTo, setReplyingTo] = useState(null);
  const [winW, setWinW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  const { chatClient, error, isLoading } = useStreamChat();
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();

  const isMobile = winW < 900;

  // ── Mobile view state: "list" = show sidebar, "chat" = show chat ──
  // On mobile we never show both at once — pure WhatsApp-style navigation
  const [mobileView, setMobileView] = useState("list"); // "list" | "chat"

  // When a channel is selected on mobile, switch to chat view
  const selectChannel = (ch) => {
    setSearchParams({ channel: ch.id });
    setActiveChannel(ch);
    setFriendProfileData(null);
    if (isMobile) setMobileView("chat");
    // Mark as read immediately so the badge clears right away
    try { ch.markRead(); } catch { /* silent */ }
  };

  // Back button on mobile — go back to list
  const goBackToList = () => {
    setMobileView("list");
  };

  // ── Detail panels (rendered at root, outside Channel tree) ──
  const [friendProfileData, setFriendProfileData] = useState(null);
  const [showChannelDetail, setShowChannelDetail] = useState(false);

  useEffect(() => {
    if (chatClient) {
      const channelId = searchParams.get("channel");
      if (channelId) {
        const ch = chatClient.channel("messaging", channelId);
        setActiveChannel(ch);
        setFriendProfileData(null);
        if (isMobile) setMobileView("chat");
      } else {
        if (isMobile) setMobileView("list");
      }
    }
  }, [chatClient, searchParams]);

  useEffect(() => {
    const handler = () => { if (isMobile) setMobileView("list"); };
    window.addEventListener("teamos:open-sidebar", handler);
    return () => window.removeEventListener("teamos:open-sidebar", handler);
  }, [isMobile]);

  // On mobile, always start at list view when no channel selected
  useEffect(() => {
    if (isMobile && !activeChannel) setMobileView("list");
  }, [isMobile, activeChannel]);

  useEffect(() => {
    const onResize = () => setWinW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ── Badge counts ─────────────────────────────────────────────
  const [friendRequestCount, setFriendRequestCount] = useState(0);
  const [dmUnread, setDmUnread] = useState(0);
  const [channelUnread, setChannelUnread] = useState(0);

  // Poll friend requests every 30s
  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      try {
        const data = await getIncomingRequests();
        if (!cancelled) setFriendRequestCount(data.requests?.length ?? 0);
      } catch { /* silent */ }
    };
    fetch();
    const id = setInterval(fetch, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Compute unread from Stream channels whenever chatClient is ready
  useEffect(() => {
    if (!chatClient) return;

    const computeUnread = () => {
      let dms = 0, channels = 0;
      Object.values(chatClient.activeChannels || {}).forEach((ch) => {
        // Skip the currently active/open channel — it's being read right now
        if (activeChannel && ch.id === activeChannel.id) return;

        // Use Stream's built-in countUnread, but exclude __CALL__ system messages
        const messages = Object.values(ch.state?.messages || {});
        const lastRead = ch.state?.read?.[chatClient.userID]?.last_read;
        const lastReadTime = lastRead ? new Date(lastRead).getTime() : 0;

        const realUnread = messages.filter((m) => {
          if (!m?.created_at) return false;
          if (m.user?.id === chatClient.userID) return false;
          if (typeof m.text === "string" && m.text.startsWith("__CALL__")) return false;
          return new Date(m.created_at).getTime() > lastReadTime;
        }).length;

        if (!realUnread) return;

        const data = ch.data || {};
        const isDM = !data.name && Object.keys(ch.state?.members || {}).length === 2;
        if (isDM) dms += realUnread;
        else channels += realUnread;
      });
      setDmUnread(dms);
      setChannelUnread(channels);
    };

    computeUnread();

    const events = ["message.new", "notification.message_new", "notification.mark_read", "message.read", "channel.updated"];
    const handlers = events.map((ev) => {
      const h = () => computeUnread();
      chatClient.on(ev, h);
      return { ev, h };
    });

    // Also recompute immediately whenever the active channel changes
    computeUnread();

    return () => handlers.forEach(({ ev, h }) => chatClient.off(ev, h));
  }, [chatClient, activeChannel]);

  if (error) return <p style={{ padding: 32, color: "#ef4444" }}>Something went wrong.</p>;
  if (isLoading || !chatClient) return <PageLoader />;

  const shellStyle = {
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
    width: "100vw", height: "100vh",
    display: "flex", flexDirection: "row",
    overflow: "hidden", background: "#080810", zIndex: 0,
  };

  // Desktop sidebar — always visible, fixed width
  const sidebarStyle = {
    position: "relative", width: 260, minWidth: 260, maxWidth: 260,
    height: "100%", display: "flex", flexDirection: "column",
    overflow: "hidden", background: "#0a0a12",
    borderRight: "1px solid rgba(109,40,217,.18)",
    zIndex: 10, flexShrink: 0,
  };

  const chatStyle = {
    flex: "1 1 0", minWidth: 0, height: "100%",
    display: "flex", flexDirection: "column",
    overflow: "hidden", background: "#0f1117",
  };

  const closeSidebar = () => {}; // no-op on desktop; mobile uses mobileView

  const panelContextValue = {
    openFriendProfile: (friend) => setFriendProfileData(friend),
    openChannelDetail: () => setShowChannelDetail(true),
  };

  return (
    <ReplyContext.Provider value={{ replyingTo, setReplyingTo }}>
    <PanelContext.Provider value={panelContextValue}>
      <style>{`
        html, body, #root { height: 100% !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; }
        .app-shell-chat-root { display: flex !important; flex-direction: row !important; flex: 1 1 0 !important; min-width: 0 !important; height: 100% !important; overflow: hidden !important; position: relative !important; }
        .app-chat .str-chat__channel, .app-chat .str-chat__container, .app-chat .str-chat__main-panel, .app-chat .str-chat__channel-inner { flex: 1 1 0 !important; min-height: 0 !important; min-width: 0 !important; width: 100% !important; max-width: 100% !important; display: flex !important; flex-direction: column !important; background: transparent !important; overflow: hidden !important; }
        .app-chat .str-chat__list, .app-chat .str-chat__message-list-scroll { flex: 1 1 0 !important; min-height: 0 !important; width: 100% !important; overflow-y: auto !important; overflow-x: hidden !important; background: transparent !important; }
        .app-chat .str-chat__message-input { display: none !important; }
        .app-chat .str-chat__ul { width: 100% !important; max-width: 100% !important; list-style: none !important; margin: 0 !important; padding: 8px 0 !important; }
        .app-chat .str-chat__li { width: 100% !important; max-width: 100% !important; padding: 0 !important; overflow: hidden !important; }
        .msg-row { display: flex !important; align-items: flex-end !important; gap: 8px !important; padding: 3px 16px !important; width: 100% !important; max-width: 100% !important; box-sizing: border-box !important; overflow: hidden !important; }
        .msg-row--own { flex-direction: row-reverse !important; }
        .msg-row--other { flex-direction: row !important; }
        .msg-content { max-width: ${isMobile ? "85%" : "min(65%, 520px)"} !important; min-width: 0 !important; display: flex !important; flex-direction: column !important; }
        .msg-content--own { align-items: flex-end !important; }
        .ch-header__hamburger { display: ${isMobile ? "flex" : "none"} !important; }
        .chat-input-wrapper { flex-shrink: 0 !important; margin: 0 12px 12px !important; box-sizing: border-box !important; }
        .sidebar-scroll-area { scrollbar-width: none !important; }
        .sidebar-scroll-area::-webkit-scrollbar { display: none !important; width: 0 !important; }
        .sidebar-scroll-area .str-chat__channel-list, .sidebar-scroll-area .str-chat, .sidebar-scroll-area .str-chat__channel-list-react { height: auto !important; min-height: 0 !important; overflow: visible !important; flex: none !important; }
        /* Sidebar tabs */
        .sidebar-tabs { display: flex; border-bottom: 1px solid rgba(109,40,217,.18); flex-shrink: 0; }
        .sidebar-tab { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; padding: 8px 4px; background: none; border: none; cursor: pointer; color: rgba(255,255,255,.45); font-size: 10px; font-weight: 500; letter-spacing: .3px; transition: color .15s, background .15s; position: relative; }
        .sidebar-tab:hover { color: rgba(255,255,255,.75); background: rgba(109,40,217,.08); }
        .sidebar-tab--active { color: #a78bfa; }
        .sidebar-tab--active::after { content: ""; position: absolute; bottom: 0; left: 20%; right: 20%; height: 2px; background: #7c3aed; border-radius: 2px 2px 0 0; }
        /* Tab badge */
        .tab-badge { position: absolute; top: 5px; right: calc(50% - 18px); min-width: 16px; height: 16px; padding: 0 4px; border-radius: 20px; background: #ef4444; color: #fff; font-size: 9px; font-weight: 700; display: flex; align-items: center; justify-content: center; line-height: 1; pointer-events: none; box-shadow: 0 0 0 2px #0a0a12; }
        /* People panel */
        .people-search-wrap { display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,.06); border: 1px solid rgba(109,40,217,.2); border-radius: 8px; padding: 7px 10px; }
        .people-search-icon { width: 14px; height: 14px; color: rgba(255,255,255,.4); flex-shrink: 0; }
        .people-search-input { flex: 1; background: none; border: none; outline: none; color: #f9fafb; font-size: 13px; }
        .people-search-input::placeholder { color: rgba(255,255,255,.35); }
        .people-user-row { display: flex; align-items: center; gap: 10px; padding: 7px 14px; transition: background .12s; }
        .people-user-row:hover { background: rgba(109,40,217,.1); }
        /* Friend action buttons */
        .friend-action-btn { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 7px; border: none; cursor: pointer; transition: background .15s, transform .1s; flex-shrink: 0; }
        .friend-action-btn:active { transform: scale(.92); }
        .friend-action-btn--add { background: rgba(109,40,217,.25); color: #a78bfa; }
        .friend-action-btn--add:hover { background: rgba(109,40,217,.45); }
        .friend-action-btn--accept { background: rgba(34,197,94,.2); color: #4ade80; }
        .friend-action-btn--accept:hover { background: rgba(34,197,94,.35); }
        .friend-action-btn--reject { background: rgba(239,68,68,.15); color: #f87171; }
        .friend-action-btn--reject:hover { background: rgba(239,68,68,.3); }
        .friend-status-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; padding: 3px 8px; border-radius: 20px; font-weight: 500; flex-shrink: 0; }
        .friend-status-badge--friends { background: rgba(34,197,94,.15); color: #4ade80; }
        .friend-status-badge--sent { background: rgba(234,179,8,.12); color: #facc15; }
        /* Remove friend button inside dm-item */
        .dm-item__remove { display: none; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 6px; background: rgba(239,68,68,.15); color: #f87171; border: none; cursor: pointer; flex-shrink: 0; margin-left: auto; }
        .dm-item:hover .dm-item__remove { display: flex; }
        @keyframes emptyFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
      `}</style>

      <div style={shellStyle}>
        <Chat client={chatClient}>
          <div className="app-shell-chat-root">
            <IncomingCallManager />

            {isMobile ? (
              /* ══ MOBILE: WhatsApp-style two-view navigation ══ */
              <>
                {/* LIST VIEW — full-screen contact/channel picker */}
                <div style={{
                  position: "absolute", inset: 0, zIndex: 10,
                  display: "flex", flexDirection: "column", background: "#0a0a12",
                  transform: mobileView === "list" ? "translateX(0)" : "translateX(-100%)",
                  transition: "transform .3s cubic-bezier(.4,0,.2,1)",
                  willChange: "transform",
                }}>
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid rgba(109,40,217,.15)", flexShrink: 0, background: "linear-gradient(180deg,rgba(109,40,217,.1) 0%,transparent 100%)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <img src="/logo-2.png" alt="TeamOS" style={{ width: 34, height: 34, borderRadius: 10, objectFit: "cover", boxShadow: "0 0 12px rgba(109,40,217,.5)" }} />
                      <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-.02em", background: "linear-gradient(135deg,#c4b5fd,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>TeamOS</span>
                    </div>
                    <button onClick={() => navigate("/profile")} style={{ width: 36, height: 36, borderRadius: "50%", padding: 0, border: "2px solid rgba(109,40,217,.4)", cursor: "pointer", overflow: "hidden", background: "linear-gradient(135deg,#6d28d9,#9333ea)", flexShrink: 0 }}>
                      {user?.imageUrl ? <img src={user.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : <span style={{ color: "#fff", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>{(user?.firstName || user?.username || "?")[0].toUpperCase()}</span>}
                    </button>
                  </div>
                  {/* Tabs */}
                  <div className="sidebar-tabs">
                    {TABS.map(({ id, label, Icon }) => {
                      const badge = id === "people" ? friendRequestCount : id === "messages" ? dmUnread : id === "channels" ? channelUnread : 0;
                      const badgeLabel = badge > 5 ? "5+" : badge > 0 ? String(badge) : null;
                      return (
                        <button key={id} onClick={() => { setActiveTab(id); if (id === "people") setFriendRequestCount(0); }} className={`sidebar-tab ${activeTab === id ? "sidebar-tab--active" : ""}`}>
                          <div style={{ position: "relative", display: "inline-flex" }}>
                            <Icon className="w-4 h-4" />
                            {badgeLabel && <span className="tab-badge">{badgeLabel}</span>}
                          </div>
                          <span>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                  {/* Tab content */}
                  <div className="sidebar-scroll-area" style={{ flex: "1 1 0", overflowY: "auto", overflowX: "hidden", minHeight: 0 }}>
                    {activeTab === "messages" && (
                      <div style={{ padding: "8px 0" }}>
                        <div className="sidebar__section-header"><MessageSquareIcon className="w-3.5 h-3.5" /><span>Friends</span></div>
                        <FriendsList activeChannel={activeChannel} onClose={() => {}} onSelectChannel={selectChannel} />
                      </div>
                    )}
                    {activeTab === "channels" && (
                      <ChannelsPanel chatClient={chatClient} activeChannel={activeChannel} setActiveChannel={selectChannel} onCreateChannel={() => setIsCreateModalOpen(true)} onClose={() => {}} />
                    )}
                    {activeTab === "people" && <PeoplePanel />}
                  </div>
                </div>

                {/* CHAT VIEW — full-screen chat */}
                <div style={{
                  position: "absolute", inset: 0, zIndex: 10,
                  display: "flex", flexDirection: "column", background: "#0f1117",
                  transform: mobileView === "chat" ? "translateX(0)" : "translateX(100%)",
                  transition: "transform .3s cubic-bezier(.4,0,.2,1)",
                  willChange: "transform",
                }}>
                  <div className="app-chat" style={{ flex: "1 1 0", minWidth: 0, height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                    {friendProfileData ? (
                      <FriendProfilePanel friend={friendProfileData} onClose={() => { setFriendProfileData(null); goBackToList(); }} onFriendRemoved={() => { setFriendProfileData(null); setActiveChannel(null); goBackToList(); }} chatClient={chatClient} onNavigate={(ch) => { selectChannel(ch); setFriendProfileData(null); }} onBack={goBackToList} />
                    ) : activeChannel ? (
                      <Channel channel={activeChannel}>
                        <Window>
                          <CustomChannelHeader onBack={goBackToList} />
                          <PinnedMessageBanner />
                          <LiveCallBanner />
                          <MessageList Message={CustomMessage} disableDateSeparator={false} closeReactionPickerOnClickOutside={true} />
                          <ChatInputWrapper replyingTo={replyingTo} onCancelReply={() => setReplyingTo(null)} onReplySent={() => setReplyingTo(null)} />
                        </Window>
                        <Thread />
                        {showChannelDetail && <ChannelDetailModal onClose={() => setShowChannelDetail(false)} />}
                      </Channel>
                    ) : null}
                  </div>
                </div>
              </>
            ) : (
              /* ══ DESKTOP: side-by-side layout ══ */
              <>
                <aside style={sidebarStyle}>
                  <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: "1px solid rgba(109,40,217,.15)", flexShrink: 0, background: "linear-gradient(180deg,rgba(109,40,217,.08) 0%,transparent 100%)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                        <img src="/logo-2.png" alt="TeamOS" style={{ width: 36, height: 36, borderRadius: 10, objectFit: "cover", flexShrink: 0, boxShadow: "0 0 14px rgba(109,40,217,.5),0 2px 8px rgba(0,0,0,.4)" }} />
                        <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-.02em", background: "linear-gradient(135deg,#c4b5fd,#a78bfa,#818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", whiteSpace: "nowrap" }}>TeamOS</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button onClick={() => navigate("/profile")} title="My Profile" style={{ width: 34, height: 34, borderRadius: "50%", padding: 0, border: "2px solid rgba(109,40,217,.4)", cursor: "pointer", overflow: "hidden", background: "linear-gradient(135deg,#6d28d9,#9333ea)", flexShrink: 0, transition: "border-color .18s,box-shadow .18s" }} onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(147,51,234,.8)"; e.currentTarget.style.boxShadow = "0 0 14px rgba(109,40,217,.5)"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(109,40,217,.4)"; e.currentTarget.style.boxShadow = "none"; }}>
                          {user?.imageUrl ? <img src={user.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : <span style={{ color: "#fff", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>{(user?.firstName || user?.username || "?")[0].toUpperCase()}</span>}
                        </button>
                      </div>
                    </div>
                    <div className="sidebar-tabs">
                      {TABS.map(({ id, label, Icon }) => {
                        const badge = id === "people" ? friendRequestCount : id === "messages" ? dmUnread : id === "channels" ? channelUnread : 0;
                        const badgeLabel = badge > 5 ? "5+" : badge > 0 ? String(badge) : null;
                        return (
                          <button key={id} onClick={() => { setActiveTab(id); if (id === "people") setFriendRequestCount(0); }} className={`sidebar-tab ${activeTab === id ? "sidebar-tab--active" : ""}`}>
                            <div style={{ position: "relative", display: "inline-flex" }}><Icon className="w-4 h-4" />{badgeLabel && <span className="tab-badge">{badgeLabel}</span>}</div>
                            <span>{label}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="sidebar-scroll-area" style={{ flex: "1 1 0", overflowY: "auto", overflowX: "hidden", minHeight: 0, scrollbarWidth: "none", overscrollBehavior: "contain" }}>
                      {activeTab === "messages" && (
                        <div style={{ padding: "8px 0" }}>
                          <div className="sidebar__section-header"><MessageSquareIcon className="w-3.5 h-3.5" /><span>Friends</span></div>
                          <FriendsList activeChannel={activeChannel} onClose={() => {}} onSelectChannel={selectChannel} />
                        </div>
                      )}
                      {activeTab === "channels" && <ChannelsPanel chatClient={chatClient} activeChannel={activeChannel} setActiveChannel={selectChannel} onCreateChannel={() => setIsCreateModalOpen(true)} onClose={() => {}} />}
                      {activeTab === "people" && <PeoplePanel />}
                    </div>
                    {/* ── Sidebar bottom: user info + logout ── */}
                    <div style={{ flexShrink: 0, borderTop: "1px solid rgba(109,40,217,.15)", padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, background: "rgba(8,8,16,.6)" }}>
                      <button onClick={() => navigate("/profile")} title="My Profile" style={{ display: "flex", alignItems: "center", gap: 9, flex: 1, minWidth: 0, background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", overflow: "hidden", flexShrink: 0, border: "2px solid rgba(109,40,217,.4)", background: "linear-gradient(135deg,#6d28d9,#9333ea)" }}>
                          {user?.imageUrl ? <img src={user.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : <span style={{ color: "#fff", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>{(user?.firstName || user?.username || "?")[0].toUpperCase()}</span>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: "#f1f0ff", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{[user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username || "Me"}</p>
                          <p style={{ fontSize: 11, color: "rgba(160,158,192,.4)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.primaryEmailAddress?.emailAddress || ""}</p>
                        </div>
                      </button>
                      <button onClick={() => signOut()} title="Log out" style={{ width: 32, height: 32, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "1px solid rgba(255,255,255,.08)", cursor: "pointer", color: "rgba(160,158,192,.5)", flexShrink: 0, transition: "all .18s" }} onMouseEnter={e => { e.currentTarget.style.background="rgba(239,68,68,.12)"; e.currentTarget.style.borderColor="rgba(239,68,68,.3)"; e.currentTarget.style.color="#f87171"; }} onMouseLeave={e => { e.currentTarget.style.background="none"; e.currentTarget.style.borderColor="rgba(255,255,255,.08)"; e.currentTarget.style.color="rgba(160,158,192,.5)"; }}>
                        <LogOutIcon style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                  </div>
                </aside>

                <div className="app-chat" style={chatStyle}>
                  {!activeChannel ? (
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: "40px 20px", height: "100%" }}>
                      <div style={{ fontSize: 56, filter: "drop-shadow(0 0 24px rgba(109,40,217,.5))", animation: "emptyFloat 3s ease-in-out infinite" }}>💬</div>
                      <div style={{ textAlign: "center" }}>
                        <p style={{ fontSize: 20, fontWeight: 700, color: "#F9FAFB", margin: "0 0 8px" }}>No conversation selected</p>
                        <p style={{ fontSize: 14, color: "#6B7280", margin: 0, maxWidth: 280, lineHeight: 1.6 }}>Pick a channel or message a friend from the sidebar</p>
                      </div>
                    </div>
                  ) : friendProfileData ? (
                    <FriendProfilePanel friend={friendProfileData} onClose={() => setFriendProfileData(null)} onFriendRemoved={() => { setFriendProfileData(null); setActiveChannel(null); }} chatClient={chatClient} onNavigate={(ch) => { selectChannel(ch); setFriendProfileData(null); }} />
                  ) : (
                    <Channel channel={activeChannel}>
                      <Window>
                        <CustomChannelHeader />
                        <PinnedMessageBanner />
                        <LiveCallBanner />
                        <MessageList Message={CustomMessage} disableDateSeparator={false} closeReactionPickerOnClickOutside={true} />
                        <ChatInputWrapper replyingTo={replyingTo} onCancelReply={() => setReplyingTo(null)} onReplySent={() => setReplyingTo(null)} />
                      </Window>
                      <Thread />
                      {showChannelDetail && <ChannelDetailModal onClose={() => setShowChannelDetail(false)} />}
                    </Channel>
                  )}
                </div>
              </>
            )}
          </div>

          {isCreateModalOpen && <CreateChannelModal onClose={() => setIsCreateModalOpen(false)} />}
        </Chat>
      </div>

    </PanelContext.Provider>
    </ReplyContext.Provider>
  );
};

export default HomePage;
