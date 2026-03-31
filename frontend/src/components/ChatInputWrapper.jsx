import { useRef, useState, useEffect, useCallback } from "react";
import { useChannelStateContext } from "stream-chat-react";
import { SmileIcon, XIcon, ReplyIcon, SendIcon, PlusIcon, Loader2Icon } from "lucide-react";
import toast from "react-hot-toast";
import AttachmentModal from "./AttachmentModal";

/* ── Emoji list ─────────────────────────────────────────── */
const EMOJIS = [
  "😀","😃","😄","😁","😅","😂","🤣","😊","😇","🙂","😉","😌","😍","🥰","😘",
  "😗","😙","😚","😋","😛","😜","🤪","😝","🤗","🤭","🤫","🤔","🤐","🤨","😐",
  "😑","😶","😏","😒","🙄","😬","🤥","😔","😪","🤤","😴","😷","🤒","🤕","🤢",
  "🤮","🤧","🥵","🥶","🥴","😵","🤯","🤠","🥳","😎","🤓","🧐","😕","😟","🙁",
  "☹️","😮","😯","😲","😳","🥺","😦","😧","😨","😰","😥","😢","😭","😱","😖",
  "😣","😞","😓","😩","😫","🥱","😤","😡","😠","🤬","😈","👿","💀","☠️","💩",
  "🤡","👹","👺","👻","👽","👾","🤖","❤️","🧡","💛","💚","💙","💜","🖤","🤍",
  "🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","👍","👎","👌","✌️","🤞",
  "🤟","🤘","🤙","👈","👉","👆","👇","☝️","✋","🤚","🖐️","🖖","👋","💪","🙏",
  "🤝","🎉","🎊","🎈","🎁","🎀","🎂","🍕","🍔","🍟","🌮","🌯","🍜","🍣","🍦",
  "🍩","🍪","🎮","⚽","🏀","🏈","⚾","🎾","🏐","🏉","🎱","🏓","🏸","🥊","🎯",
  "🚀","✈️","🚗","🚕","🚙","🚌","🚎","🏎️","🚓","🚑","🚒","🚐","🛻","🚚","🚛",
  "🌍","🌎","🌏","🌙","⭐","🌟","💫","✨","☀️","🌤️","⛅","🌦️","🌧️","⛈️","🌩️",
  "🌈","🌊","🌸","🌺","🌻","🌹","🌷","🍀","🌿","🍃","🍂","🍁","🌾","🐶","🐱",
  "🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🙈","🙉",
  "🙊","🐔","🐧","🐦","🐤","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝","🐛",
];

const EmojiDropdown = ({ onSelect, onClose, anchorRef }) => {
  const ref = useRef(null);
  const [search, setSearch] = useState("");
  const filtered = search.trim() ? EMOJIS.filter(e => e.includes(search.trim())) : EMOJIS;

  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target) &&
          anchorRef.current && !anchorRef.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose, anchorRef]);

  return (
    <div ref={ref} className="emoji-dropdown">
      <div className="emoji-dropdown__header">
        <input className="emoji-dropdown__search" placeholder="Search emoji…"
          value={search} onChange={e => setSearch(e.target.value)} autoFocus />
        <button className="emoji-dropdown__close" onClick={onClose}><XIcon className="w-3.5 h-3.5" /></button>
      </div>
      <div className="emoji-dropdown__grid">
        {filtered.map((emoji, i) => (
          <button key={i} className="emoji-dropdown__btn" onClick={() => onSelect(emoji)}>{emoji}</button>
        ))}
        {!filtered.length && <p className="emoji-dropdown__empty">No results</p>}
      </div>
    </div>
  );
};

const ReplyPreviewBar = ({ replyingTo, onCancel }) => {
  if (!replyingTo) return null;
  return (
    <div className="reply-preview-bar">
      <ReplyIcon className="reply-preview-bar__icon" />
      <div className="reply-preview-bar__body">
        <span className="reply-preview-bar__name">{replyingTo.user?.name || replyingTo.user?.id}</span>
        <span className="reply-preview-bar__text">
          {replyingTo.text?.slice(0, 100)}{replyingTo.text?.length > 100 ? "…" : ""}
        </span>
      </div>
      <button className="reply-preview-bar__cancel" onClick={onCancel}><XIcon className="w-3.5 h-3.5" /></button>
    </div>
  );
};

const AttachmentPreview = ({ attachments, onRemove }) => {
  if (!attachments.length) return null;
  return (
    <div className="attachment-preview-strip">
      {attachments.map((att, i) => (
        <div key={i} className="attachment-preview-item">
          {att.type === "image" ? (
            <img src={att.previewUrl} alt={att.file?.name} className="attachment-preview-item__img" />
          ) : att.type === "location" ? (
            <div className="attachment-preview-item__location">
              <span>📍</span>
              <span>{att.label || "Location"}</span>
            </div>
          ) : att.type === "poll" ? (
            <div className="attachment-preview-item__location">
              <span>📊</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120 }}>
                {att.poll?.question}
              </span>
            </div>
          ) : (
            <div className="attachment-preview-item__file">
              <span>📎</span>
              <span className="attachment-preview-item__filename">{att.file?.name}</span>
            </div>
          )}
          <button className="attachment-preview-item__remove" onClick={() => onRemove(i)}>
            <XIcon className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
};

/* ── Main ChatInputWrapper ──────────────────────────────── */
const ChatInputWrapper = ({ replyingTo, onCancelReply, onReplySent }) => {
  const { channel } = useChannelStateContext();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttModal, setShowAttModal] = useState(false);
  const [attachments, setAttachments] = useState([]);

  const textareaRef = useRef(null);
  const emojiAnchorRef = useRef(null);
  const imageInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => { if (replyingTo) textareaRef.current?.focus(); }, [replyingTo]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  }, [text]);

  const insertEmoji = useCallback((emoji) => {
    const ta = textareaRef.current;
    if (!ta) { setText(p => p + emoji); setShowEmoji(false); return; }
    const s = ta.selectionStart, e = ta.selectionEnd;
    setText(text.slice(0, s) + emoji + text.slice(e));
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = s + emoji.length;
      ta.focus();
    });
    setShowEmoji(false);
  }, [text]);

  const addAttachment = useCallback((att) => setAttachments(p => [...p, att]), []);

  const removeAttachment = useCallback((idx) => {
    setAttachments(prev => {
      const next = [...prev];
      if (next[idx]?.previewUrl) URL.revokeObjectURL(next[idx].previewUrl);
      next.splice(idx, 1);
      return next;
    });
  }, []);

  /* ── File handlers ──────────────────────────────────────── */
  const handleImageFiles = (files) => {
    Array.from(files).forEach(file =>
      addAttachment({ type: "image", file, previewUrl: URL.createObjectURL(file) })
    );
  };
  const handleFileFiles = (files) => {
    Array.from(files).forEach(file => addAttachment({ type: "file", file }));
  };

  /* ── Location — get device GPS directly, no panel ──────── */
  const handleLocation = useCallback(() => {
    if (!navigator.geolocation) { toast.error("Geolocation not supported"); return; }
    const tid = toast.loading("Getting your location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        toast.dismiss(tid);
        const { latitude, longitude } = pos.coords;
        addAttachment({
          type: "location",
          latitude, longitude,
          label: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
          mapsUrl: `https://www.google.com/maps?q=${latitude},${longitude}`,
        });
        toast.success("Location added");
      },
      (err) => {
        toast.dismiss(tid);
        toast.error(err.code === 1 ? "Location permission denied" : "Could not get location");
      },
      { timeout: 12000, enableHighAccuracy: true }
    );
  }, [addAttachment]);

  /* ── Poll ───────────────────────────────────────────────── */
  const handlePoll = useCallback((poll) => addAttachment({ type: "poll", poll }), [addAttachment]);

  /* ── Send ───────────────────────────────────────────────── */
  const handleSend = useCallback(async () => {
    const t = text.trim();
    if (!t && !attachments.length) return;
    if (sending || !channel) return;
    setSending(true);

    try {
      // Track whether we've already used the text in an attachment message
      let textUsed = false;

      for (const att of attachments) {
        const msgText = !textUsed ? (t || undefined) : undefined;
        textUsed = true;

        if (att.type === "image") {
          const res = await channel.sendImage(att.file);
          await channel.sendMessage({
            text: msgText,
            quoted_message_id: replyingTo?.id,
            attachments: [{ type: "image", image_url: res.file, fallback: att.file.name }],
          });
        } else if (att.type === "file") {
          const res = await channel.sendFile(att.file);
          await channel.sendMessage({
            text: msgText,
            quoted_message_id: replyingTo?.id,
            attachments: [{
              type: "file", asset_url: res.file,
              title: att.file.name, mime_type: att.file.type, file_size: att.file.size,
            }],
          });
        } else if (att.type === "location") {
          await channel.sendMessage({
            text: msgText || "📍 Location",
            quoted_message_id: replyingTo?.id,
            attachments: [{
              type: "location",
              title: "📍 Current Location",
              text: att.label,
              title_link: att.mapsUrl,
              latitude: att.latitude,
              longitude: att.longitude,
            }],
          });
        } else if (att.type === "poll") {
          // Store poll in attachments so Stream preserves it on server round-trips
          const pollData = {
            ...att.poll,
            votes: {},  // start empty
          };
          await channel.sendMessage({
            text: `📊 Poll: ${att.poll.question}`,
            quoted_message_id: replyingTo?.id,
            attachments: [{
              type: "poll",
              poll: pollData,
              title: att.poll.question,
            }],
          });
        }
      }

      // Send text-only message if no attachments consumed the text
      if (!attachments.length && t) {
        await channel.sendMessage({ text: t, quoted_message_id: replyingTo?.id });
      }

      setText("");
      setAttachments([]);
      if (replyingTo) onReplySent?.();
    } catch (err) {
      console.error("Send error:", err);
      toast.error("Failed to send");
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }, [text, attachments, sending, channel, replyingTo, onReplySent]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const canSend = (text.trim() || attachments.length > 0) && !sending;

  return (
    <div className="chat-input-wrapper">
      <ReplyPreviewBar replyingTo={replyingTo} onCancel={onCancelReply} />
      <AttachmentPreview attachments={attachments} onRemove={removeAttachment} />

      <div className="chat-input-row">
        {/* + button */}
        <button
          type="button"
          className={`chat-input-action-btn chat-input-plus-btn ${showAttModal ? "chat-input-plus-btn--active" : ""}`}
          onClick={() => setShowAttModal(v => !v)}
          title="Attach"
        >
          <PlusIcon className="w-5 h-5" />
        </button>

        {/* Emoji */}
        <div className="chat-input-emoji-wrap" ref={emojiAnchorRef}>
          <button
            type="button"
            className={`chat-input-action-btn ${showEmoji ? "chat-input-action-btn--active" : ""}`}
            onClick={() => setShowEmoji(v => !v)}
            title="Emoji"
          >
            <SmileIcon className="w-5 h-5" />
          </button>
          {showEmoji && (
            <EmojiDropdown onSelect={insertEmoji} onClose={() => setShowEmoji(false)} anchorRef={emojiAnchorRef} />
          )}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          className="chat-input-textarea"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={replyingTo ? `Reply to ${replyingTo.user?.name || "message"}…` : "Type a message…"}
          rows={1}
          disabled={sending}
        />

        {/* Send */}
        <button
          type="button"
          className={`chat-input-send ${canSend ? "chat-input-send--active" : ""}`}
          onClick={handleSend}
          disabled={!canSend}
        >
          {sending ? <Loader2Icon className="w-4 h-4 animate-spin" /> : <SendIcon className="w-4 h-4" />}
        </button>
      </div>

      {/* Hidden file inputs */}
      <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden"
        onChange={e => { handleImageFiles(e.target.files); e.target.value = ""; }} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={e => { handleImageFiles(e.target.files); e.target.value = ""; }} />
      <input ref={fileInputRef} type="file" multiple className="hidden"
        onChange={e => { handleFileFiles(e.target.files); e.target.value = ""; }} />

      {/* Attachment modal */}
      {showAttModal && (
        <AttachmentModal
          onClose={() => setShowAttModal(false)}
          onGallery={() => imageInputRef.current?.click()}
          onCamera={() => cameraInputRef.current?.click()}
          onFile={() => fileInputRef.current?.click()}
          onLocation={handleLocation}
          onPoll={handlePoll}
        />
      )}
    </div>
  );
};

export default ChatInputWrapper;
