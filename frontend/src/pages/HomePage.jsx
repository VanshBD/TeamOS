import { UserButton } from "@clerk/clerk-react";
import React, { useEffect, useState, useCallback, useMemo, useRef, createContext, useContext } from "react";
import { useSearchParams } from "react-router";
import { useStreamChat } from "../hooks/useStreamChat";
import PageLoader from "../components/PageLoader";
import toast from "react-hot-toast";
import ReactionDisplay from "../components/ReactionDisplay";
import { pinMessageApi, unpinMessageApi } from "../lib/api";

import {
  Chat,
  Channel,
  ChannelList,
  MessageList,
  Thread,
  Window,
  MessageSimple,
  useMessageContext,
  useChatContext,
  useChannelStateContext,
} from "stream-chat-react";

import "../styles/stream-chat-theme.css";
import { HashIcon, PlusIcon, UsersIcon, ReplyIcon, PinIcon, ChevronDownIcon, ChevronUpIcon, MenuIcon, XIcon as CloseIcon } from "lucide-react";
import CreateChannelModal from "../components/CreateChannelModal";
import CustomChannelPreview from "../components/CustomChannelPreview";
import UsersList from "../components/UsersList";
import CustomChannelHeader from "../components/CustomChannelHeader";
import CallMessage from "../components/CallMessage";
import LiveCallBanner from "../components/LiveCallBanner";
import PublicChannelJoin from "../components/PublicChannelJoin";
import PinnedMessageBanner from "../components/PinnedMessageBanner";
import IncomingCallManager from "../components/IncomingCallManager";
import ChatInputWrapper from "../components/ChatInputWrapper";
import PollMessage from "../components/PollMessage";
import { CurrentLocationCard, LiveLocationCard } from "../components/LocationMessage";
import { parseCallMessage } from "../lib/callMessages";

// Shared context so any message bubble can set the reply target in the main input
const ReplyContext = createContext({ replyingTo: null, setReplyingTo: () => {} });

// Highlight a message element briefly (WhatsApp-style scroll-to)
const highlightMessage = (msgId) => {
  const el = document.querySelector(`[data-message-id="${msgId}"]`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.add("msg-highlight");
  setTimeout(() => el.classList.remove("msg-highlight"), 1500);
};

// Quoted reply preview shown inside a message bubble
const QuotedReply = ({ quotedMessage, onClick }) => {
  if (!quotedMessage) return null;
  return (
    <button onClick={onClick} className="quoted-reply" title="Jump to original message">
      <div className="quoted-reply__bar" />
      <div className="quoted-reply__body">
        <span className="quoted-reply__name">
          {quotedMessage.user?.name || quotedMessage.user?.id || "Unknown"}
        </span>
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
      const existing = message.latest_reactions?.find(
        r => r.type === emoji && r.user?.id === client?.user?.id
      );
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
    <div
      data-message-id={message.id}
      className={`msg-row group ${isOwnMessage ? "msg-row--own" : "msg-row--other"}`}
    >
      {/* Avatar */}
      {!isOwnMessage && (
        <div className="msg-avatar">
          {message.user?.image
            ? <img src={message.user.image} alt="" className="msg-avatar__img" />
            : <div className="msg-avatar__placeholder">{(message.user?.name || "?")[0].toUpperCase()}</div>
          }
        </div>
      )}

      <div className={`msg-content ${isOwnMessage ? "msg-content--own" : ""}`}>
        {/* Sender name + time for others */}
        {!isOwnMessage && (
          <div className="msg-meta">
            <span className="msg-meta__name">{message.user?.name || message.user?.id}</span>
            <span className="msg-meta__time">{formattedTime}</span>
            {message.pinned && <span className="msg-pin-badge">📌</span>}
          </div>
        )}

        {/* Bubble */}
        <div className={`msg-bubble ${isOwnMessage ? "msg-bubble--own" : "msg-bubble--other"}`}>
          {/* Quoted reply preview */}
          {quotedMessage && (
            <QuotedReply quotedMessage={quotedMessage} onClick={jumpToOriginal} />
          )}

          {/* Poll (stored in message.poll custom field) */}
          {message.poll && (
            <PollMessage message={message} isOwnMessage={isOwnMessage} />
          )}

          <p className="msg-text">
            {message.text && !message.text.startsWith("__LIVE_LOC_UPDATE__")
              ? message.text
              : ""}
          </p>

          {/* Attachments — images, files, location, live location */}
          {message.attachments?.length > 0 && (
            <div className="msg-attachments">
              {message.attachments.map((att, i) => {
                if (att.type === "image" && att.image_url) {
                  return (
                    <a key={i} href={att.image_url} target="_blank" rel="noopener noreferrer"
                      className="msg-attachment-img-wrap">
                      <img src={att.image_url} alt={att.fallback || "image"} className="msg-attachment-img" />
                    </a>
                  );
                }
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

          {/* Own message timestamp */}
          {isOwnMessage && (
            <span className="msg-bubble__time">
              {formattedTime}
              {message.pinned && " 📌"}
            </span>
          )}
        </div>

        {/* Reply count badge */}
        {replyCount > 0 && (
          <button
            onClick={() => setReplyingTo(message)}
            className={`msg-reply-count ${isOwnMessage ? "msg-reply-count--own" : ""}`}
          >
            <ReplyIcon className="w-3 h-3" />
            {replyCount} {replyCount === 1 ? "reply" : "replies"}
          </button>
        )}

        {/* Reactions */}
        {message.latest_reactions?.length > 0 && (
          <div className={`msg-reactions ${isOwnMessage ? "msg-reactions--own" : ""}`}>
            <ReactionDisplay
              reactions={message.latest_reactions}
              onAddReaction={handleAddReaction}
              message={message}
            />
          </div>
        )}

        {/* Hover actions */}
        <div className={`msg-actions ${isOwnMessage ? "msg-actions--own" : ""}`}>
          <button onClick={() => setReplyingTo(message)} className="msg-action-btn" title="Reply">
            <ReplyIcon className="w-3.5 h-3.5" />
            <span>Reply</span>
          </button>
          <button onClick={handlePin} className="msg-action-btn" title={message.pinned ? "Unpin" : "Pin"}>
            <PinIcon className="w-3.5 h-3.5" />
            <span>{message.pinned ? "Unpin" : "Pin"}</span>
          </button>
        </div>
      </div>

      {/* Own message avatar on right */}
      {isOwnMessage && (
        <div className="msg-avatar">
          {message.user?.image
            ? <img src={message.user.image} alt="" className="msg-avatar__img" />
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
  if (parseCallMessage(message.text)) {
    return <div className="px-4 py-2"><CallMessage message={message} /></div>;
  }
  return <EnhancedMessage />;
});

const CHANNELS_SHOW_LIMIT = 3;

const HomePage = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeChannel, setActiveChannel] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAllChannels, setShowAllChannels] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const { chatClient, error, isLoading } = useStreamChat();

  useEffect(() => {
    if (chatClient) {
      const channelId = searchParams.get("channel");
      if (channelId) {
        const ch = chatClient.channel("messaging", channelId);
        setActiveChannel(ch);
      }
    }
  }, [chatClient, searchParams]);

  if (error) return <p className="p-8 text-red-500">Something went wrong.</p>;
  if (isLoading || !chatClient) return <PageLoader />;

  return (
    <ReplyContext.Provider value={{ replyingTo, setReplyingTo }}>
    <div className="chat-wrapper">
      <Chat client={chatClient}>
        <div className="chat-container">
          <IncomingCallManager />

          {/* Mobile overlay */}
          {sidebarOpen && (
            <div
              className="sidebar-overlay"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* SIDEBAR */}
          <aside className={`sidebar ${sidebarOpen ? "sidebar--open" : ""}`}>
            <div className="sidebar__inner">
              {/* Header */}
              <div className="sidebar__header">
                <div className="brand-container">
                  <img src="/logo.png" alt="Logo" className="brand-logo" />
                  <span className="brand-name">Slap</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="user-button-wrapper">
                    <UserButton />
                  </div>
                  <button
                    className="sidebar__close-btn"
                    onClick={() => setSidebarOpen(false)}
                    aria-label="Close sidebar"
                  >
                    <CloseIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Scrollable content */}
              <div className="sidebar__content">
                {/* Create channel */}
                <div className="sidebar__section">
                  <button
                    onClick={() => { setIsCreateModalOpen(true); setSidebarOpen(false); }}
                    className="create-channel-btn"
                  >
                    <PlusIcon className="size-4" />
                    <span>Create Channel</span>
                  </button>
                </div>

                {/* Join public channel */}
                <PublicChannelJoin />

                {/* Channels */}
                <ChannelList
                  filters={{ members: { $in: [chatClient?.user?.id] } }}
                  options={{ state: true, watch: true }}
                  Preview={({ channel }) => (
                    <CustomChannelPreview
                      channel={channel}
                      activeChannel={activeChannel}
                      setActiveChannel={(ch) => {
                        setSearchParams({ channel: ch.id });
                        setSidebarOpen(false);
                      }}
                    />
                  )}
                  List={({ children, loading, error: listError }) => {
                    // Count rendered children for show-more logic
                    const childArray = Array.isArray(children)
                      ? children.filter(Boolean)
                      : children ? [children] : [];
                    const total = childArray.length;
                    const visible = showAllChannels ? childArray : childArray.slice(0, CHANNELS_SHOW_LIMIT);

                    return (
                      <div className="sidebar__channel-sections">
                        {/* Channels section */}
                        <div className="sidebar__section-header">
                          <HashIcon className="w-3.5 h-3.5" />
                          <span>Channels</span>
                        </div>
                        {loading && <div className="sidebar-status-msg">Loading…</div>}
                        {listError && <div className="sidebar-status-msg sidebar-status-msg--error">Error loading channels</div>}
                        <div className="sidebar__channel-list">{visible}</div>

                        {/* Show more / less */}
                        {total > CHANNELS_SHOW_LIMIT && (
                          <button
                            className="sidebar__show-more"
                            onClick={() => setShowAllChannels(v => !v)}
                          >
                            {showAllChannels
                              ? <><ChevronUpIcon className="w-3 h-3" /> Show less</>
                              : <><ChevronDownIcon className="w-3 h-3" /> {total - CHANNELS_SHOW_LIMIT} more channels</>
                            }
                          </button>
                        )}

                        {/* DMs section */}
                        <div className="sidebar__section-header sidebar__section-header--dm">
                          <UsersIcon className="w-3.5 h-3.5" />
                          <span>Direct Messages</span>
                        </div>
                        <UsersList activeChannel={activeChannel} />
                      </div>
                    );
                  }}
                />
              </div>
            </div>
          </aside>

          {/* MAIN CHAT */}
          <div className="chat-main">
            {/* Mobile top bar */}
            <div className="mobile-topbar">
              <button
                className="mobile-topbar__menu"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                <MenuIcon className="w-5 h-5" />
              </button>
              <span className="mobile-topbar__title">
                {activeChannel?.data?.name || activeChannel?.id || "Slap"}
              </span>
            </div>

            <Channel channel={activeChannel}>
              <Window>
                <CustomChannelHeader />
                <PinnedMessageBanner />
                <LiveCallBanner />
                <MessageList
                  Message={CustomMessage}
                  disableDateSeparator={false}
                  closeReactionPickerOnClickOutside={true}
                />
                <ChatInputWrapper
                  replyingTo={replyingTo}
                  onCancelReply={() => setReplyingTo(null)}
                  onReplySent={() => setReplyingTo(null)}
                />
              </Window>
              <Thread />
            </Channel>
          </div>
        </div>

        {isCreateModalOpen && (
          <CreateChannelModal onClose={() => setIsCreateModalOpen(false)} />
        )}
      </Chat>
    </div>
    </ReplyContext.Provider>
  );
};

export default HomePage;
