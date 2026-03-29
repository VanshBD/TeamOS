import { UserButton } from "@clerk/clerk-react";
import React, { useEffect, useState, useCallback, useMemo } from "react";
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
  MessageInput,
  Thread,
  Window,
  MessageSimple,
  useMessageContext,
  useChatContext,
  useChannelStateContext,
} from "stream-chat-react";

import "../styles/stream-chat-theme.css";
import { HashIcon, PlusIcon, UsersIcon } from "lucide-react";
import CreateChannelModal from "../components/CreateChannelModal";
import CustomChannelPreview from "../components/CustomChannelPreview";
import UsersList from "../components/UsersList";
import CustomChannelHeader from "../components/CustomChannelHeader";
import CallMessage from "../components/CallMessage";
import LiveCallBanner from "../components/LiveCallBanner";
import PublicChannelJoin from "../components/PublicChannelJoin";
import { parseCallMessage } from "../lib/callMessages";
import IncomingCallManager from "../components/IncomingCallManager";

// Standalone enhanced message component — hooks called at top level, no nesting issues
const EnhancedMessage = () => {
  const { message, handleOpenThread } = useMessageContext();
  const { client } = useChatContext();
  const { channel } = useChannelStateContext();

  const messageData = useMemo(() => {
    const isOwnMessage = message.user?.id === client?.user?.id;
    const messageDate = new Date(message.created_at);
    const isToday = messageDate.toDateString() === new Date().toDateString();
    return {
      isOwnMessage,
      formattedTime: isToday
        ? messageDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
        : messageDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
    };
  }, [message.user?.id, message.created_at, client?.user?.id]);

  const { isOwnMessage, formattedTime } = messageData;

  const handleAddReaction = useCallback(
    async (messageId, emoji) => {
      if (!channel) return toast.error("No channel selected");
      try {
        const existingReaction = message.latest_reactions?.find(
          (r) => r.type === emoji && r.user?.id === client?.user?.id
        );
        if (existingReaction) {
          await channel.deleteReaction(messageId, emoji);
        } else {
          await channel.sendReaction(messageId, { type: emoji });
        }
      } catch (err) {
        console.error("Reaction error:", err);
        toast.error("Failed to update reaction");
      }
    },
    [channel, message.latest_reactions, client?.user?.id]
  );

  const handlePin = useCallback(async () => {
    try {
      if (message.pinned) {
        await unpinMessageApi(message.id);
        toast.success("Message unpinned");
      } else {
        await pinMessageApi(message.id);
        toast.success("Message pinned");
      }
    } catch (err) {
      console.error("Pin error:", err);
      toast.error("Failed to pin message");
    }
  }, [message.id, message.pinned]);

  // reply count for thread indicator
  const replyCount = message.reply_count || 0;

  return (
    <div
      className={`group px-4 py-2 animate-slide-up flex flex-col ${
        isOwnMessage ? "items-end" : "items-start"
      }`}
    >
      <div
        className={`max-w-xs lg:max-w-md xl:max-w-lg flex ${
          isOwnMessage ? "flex-row-reverse" : "flex-row"
        } items-end gap-2`}
      >
        {/* Avatar */}
        <div className="flex-shrink-0">
          {message.user?.image ? (
            <img
              src={message.user.image}
              alt={message.user.name || message.user.id}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-white shadow-sm"
            />
          ) : (
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium shadow-sm">
              {(message.user?.name || message.user?.id || "?").charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Content */}
        <div className={`flex flex-col ${isOwnMessage ? "items-end" : "items-start"} min-w-0`}>
          {/* Header for others' messages */}
          {!isOwnMessage && (
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-gray-900 text-sm">
                {message.user?.name || message.user?.id}
              </span>
              <span className="text-xs text-gray-500">{formattedTime}</span>
              {message.pinned && (
                <span className="text-xs text-orange-500 font-medium">📌 Pinned</span>
              )}
            </div>
          )}

          {/* Bubble */}
          <div
            className={`relative group ${
              isOwnMessage ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
            } rounded-2xl px-4 py-2 shadow-sm ${
              isOwnMessage ? "rounded-br-sm" : "rounded-bl-sm"
            }`}
          >
            <div
              className={`text-sm break-words leading-relaxed ${
                isOwnMessage ? "text-white" : "text-gray-900"
              }`}
            >
              {message.text}
            </div>

            {message.attachments?.length > 0 && (
              <div className="mt-2 space-y-2">
                {message.attachments.map((att, i) => (
                  <div
                    key={i}
                    className={`inline-flex items-center gap-2 ${
                      isOwnMessage ? "bg-blue-700" : "bg-gray-200"
                    } rounded-lg px-3 py-2 text-sm`}
                  >
                    <span className={isOwnMessage ? "text-blue-200" : "text-blue-600"}>📎</span>
                    <span className={isOwnMessage ? "text-blue-100" : "text-gray-700"}>
                      {att.title || att.filename || "Attachment"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {isOwnMessage && (
              <div className="absolute -bottom-5 right-0 text-xs text-gray-500 whitespace-nowrap">
                {formattedTime}
                {message.pinned && <span className="text-orange-500 ml-1">📌</span>}
              </div>
            )}
          </div>

          {/* Thread reply count indicator */}
          {replyCount > 0 && (
            <button
              onClick={handleOpenThread}
              className={`mt-2 text-xs text-blue-500 hover:text-blue-700 hover:underline flex items-center gap-1 ${
                isOwnMessage ? "self-end" : "self-start"
              }`}
            >
              💬 {replyCount} {replyCount === 1 ? "reply" : "replies"}
            </button>
          )}

          {/* Reactions */}
          {message.latest_reactions?.length > 0 && (
            <div className={`mt-2 flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
              <ReactionDisplay
                reactions={message.latest_reactions}
                onAddReaction={handleAddReaction}
                message={message}
              />
            </div>
          )}

          {/* Actions — visible on hover */}
          <div
            className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 mt-2 ${
              isOwnMessage ? "justify-end" : "justify-start"
            }`}
          >
            <button
              onClick={handleOpenThread}
              className="text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 px-2 py-1 rounded transition-all flex items-center gap-1"
            >
              💬 Reply
            </button>
            <button
              onClick={handlePin}
              className="text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 px-2 py-1 rounded transition-all flex items-center gap-1"
            >
              📌 {message.pinned ? "Unpin" : "Pin"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Top-level CustomMessage — guards before rendering EnhancedMessage
const CustomMessage = React.memo(() => {
  const { message } = useMessageContext();

  if (!message || !message.user) return <MessageSimple />;

  if (parseCallMessage(message.text)) {
    return (
      <div className="px-4 py-2">
        <CallMessage message={message} />
      </div>
    );
  }

  return <EnhancedMessage />;
});

const HomePage = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeChannel, setActiveChannel] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const { chatClient, error, isLoading } = useStreamChat();

  useEffect(() => {
    if (chatClient) {
      const channelId = searchParams.get("channel");
      if (channelId) {
        const channel = chatClient.channel("messaging", channelId);
        setActiveChannel(channel);
      }
    }
  }, [chatClient, searchParams]);

  if (error) return <p>Something went wrong...</p>;
  if (isLoading || !chatClient) return <PageLoader />;

  return (
    <div className="chat-wrapper">
      <Chat client={chatClient}>
        <div className="chat-container">
          <IncomingCallManager />

          {/* LEFT SIDEBAR */}
          <div className="str-chat__channel-list">
            <div className="team-channel-list">
              <div className="team-channel-list__header gap-4">
                <div className="brand-container">
                  <img src="/logo.png" alt="Logo" className="brand-logo" />
                  <span className="brand-name">Slap</span>
                </div>
                <div className="user-button-wrapper">
                  <UserButton />
                </div>
              </div>

              <div className="team-channel-list__content">
                <div className="create-channel-section">
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="create-channel-btn"
                  >
                    <PlusIcon className="size-4" />
                    <span>Create Channel</span>
                  </button>
                </div>

                <PublicChannelJoin />

                <ChannelList
                  filters={{ members: { $in: [chatClient?.user?.id] } }}
                  options={{ state: true, watch: true }}
                  Preview={({ channel }) => (
                    <CustomChannelPreview
                      channel={channel}
                      activeChannel={activeChannel}
                      setActiveChannel={(ch) => setSearchParams({ channel: ch.id })}
                    />
                  )}
                  List={({ children, loading, error: listError }) => (
                    <div className="channel-sections">
                      <div className="section-header">
                        <div className="section-title">
                          <HashIcon className="size-4" />
                          <span>Channels</span>
                        </div>
                      </div>
                      {loading && <div className="loading-message">Loading channels...</div>}
                      {listError && <div className="error-message">Error loading channels</div>}
                      <div className="channels-list">{children}</div>
                      <div className="section-header direct-messages">
                        <div className="section-title">
                          <UsersIcon className="size-4" />
                          <span>Direct Messages</span>
                        </div>
                      </div>
                      <UsersList activeChannel={activeChannel} />
                    </div>
                  )}
                />
              </div>
            </div>
          </div>

          {/* RIGHT CONTAINER */}
          <div className="chat-main">
            <Channel channel={activeChannel}>
              <Window>
                <CustomChannelHeader />
                <LiveCallBanner />
                <MessageList
                  Message={CustomMessage}
                  disableDateSeparator={false}
                  closeReactionPickerOnClickOutside={true}
                />
                <MessageInput grow={true} disableMentions={false} maxRows={4} />
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
  );
};

export default HomePage;
