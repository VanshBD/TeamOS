import { useEffect, useState, useCallback } from "react";
import { useChannelStateContext } from "stream-chat-react";
import { PinIcon, XIcon } from "lucide-react";

// Highlights a message in the DOM by its Stream message ID
const scrollToMessage = (msgId) => {
  const el = document.querySelector(`[data-message-id="${msgId}"]`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.add("msg-highlight");
  setTimeout(() => el.classList.remove("msg-highlight"), 1500);
};

const PinnedMessageBanner = () => {
  const { channel } = useChannelStateContext();
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  // Load pinned messages from channel state + listen for updates
  const loadPinned = useCallback(async () => {
    try {
      const result = await channel.query({ messages: { limit: 1 } });
      const pinned = (result.pinned_messages || []).sort(
        (a, b) => new Date(b.pinned_at || b.created_at) - new Date(a.pinned_at || a.created_at)
      );
      setPinnedMessages(pinned);
      setDismissed(false);
      setCurrentIndex(0);
    } catch {
      // fallback: try channel state
      const msgs = Object.values(channel.state.messages || {})
        .filter((m) => m.pinned)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setPinnedMessages(msgs);
    }
  }, [channel]);

  useEffect(() => {
    loadPinned();
  }, [channel.id]);

  // Re-scan when any message is updated (pin/unpin triggers message.updated)
  useEffect(() => {
    const handler = () => loadPinned();
    channel.on("message.updated", handler);
    channel.on("message.new", handler);
    return () => {
      channel.off("message.updated", handler);
      channel.off("message.new", handler);
    };
  }, [channel, loadPinned]);

  if (!pinnedMessages.length || dismissed) return null;

  const current = pinnedMessages[currentIndex];
  const total = pinnedMessages.length;

  const handleClick = () => {
    scrollToMessage(current.id);
    // cycle to next pinned message on each click (like Telegram)
    setCurrentIndex((i) => (i + 1) % total);
  };

  return (
    <div className="pinned-banner">
      {/* Left accent bar that cycles color */}
      <div className="pinned-banner__bar" />

      {/* Pin icon */}
      <PinIcon className="pinned-banner__icon" />

      {/* Content — clickable */}
      <button className="pinned-banner__body" onClick={handleClick}>
        <span className="pinned-banner__label">
          Pinned Message {total > 1 ? `${currentIndex + 1} of ${total}` : ""}
        </span>
        <span className="pinned-banner__text">
          {current.text?.slice(0, 120) || "📎 Attachment"}
          {current.text?.length > 120 ? "…" : ""}
        </span>
      </button>

      {/* Dismiss */}
      <button
        className="pinned-banner__dismiss"
        onClick={() => setDismissed(true)}
        title="Dismiss"
        aria-label="Dismiss pinned banner"
      >
        <XIcon className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default PinnedMessageBanner;
