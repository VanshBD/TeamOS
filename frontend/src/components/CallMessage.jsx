import { useEffect, useMemo, useState } from "react";
import { VideoIcon, PhoneOffIcon, ClockIcon, UsersIcon } from "lucide-react";
import { useChannelStateContext } from "stream-chat-react";
import { useUser } from "@clerk/clerk-react";
import { markCallJoinedForUser, parseCallMessage } from "../lib/callMessages";

const formatDuration = (s, e) => {
  const diff = Math.floor((new Date(e) - new Date(s)) / 1000);
  const m = Math.floor(diff / 60), sec = diff % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
};

const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const CallMessage = ({ message }) => {
  const meta = parseCallMessage(message?.text);
  const { channel } = useChannelStateContext();

  const endedMsgs = useMemo(() => {
    const callId = meta?.callId;
    if (!callId) return [];
    const msgs = Object.values(channel.state.messages || {});
    return msgs
      .map((m) => parseCallMessage(m.text))
      .filter((p) => p && p.callId === callId && (p.ended || p.status === "ended"));
  }, [channel.state.messages, meta?.callId]);

  const hasEnded = endedMsgs.length > 0;

  if (!meta) return null;

  if (meta.status === "missed") {
    // If the host already ended the call, don't show "missed" card anymore.
    if (hasEnded) return null;

    const missedMessages = Object.values(channel.state.messages || {}).filter((m) => {
      const p = parseCallMessage(m.text);
      return p && p.callId === meta.callId && p.status === "missed";
    });
    const latest = missedMessages.sort((a, b) => {
      const at = new Date(a.created_at || a.createdAt || 0).getTime();
      const bt = new Date(b.created_at || b.createdAt || 0).getTime();
      return bt - at;
    })[0];
    if (latest && message?.id && latest.id !== message.id) return null;

    return <MissedCallCard meta={meta} />;
  }

  if (meta.ended || meta.status === "ended") {
    // Show only the latest ended card per callId to avoid duplicates.
    const endedMessages = Object.values(channel.state.messages || {}).filter((m) => {
      const p = parseCallMessage(m.text);
      return p && p.callId === meta.callId && (p.ended || p.status === "ended");
    });
    const latest = endedMessages.sort((a, b) => {
      const at = new Date(a.created_at || a.createdAt || 0).getTime();
      const bt = new Date(b.created_at || b.createdAt || 0).getTime();
      return bt - at;
    })[0];
    if (latest && message?.id && latest.id !== message.id) return null;
    return <EndedCallCard meta={meta} />;
  }

  return <ActiveCallCard meta={meta} />;
};

const MissedCallCard = ({ meta }) => (
  <MissedCallCardInner meta={meta} />
);

const MissedCallCardInner = ({ meta }) => {
  const { user } = useUser();

  return (
    <div className="call-card call-card--ended">
      <div className="call-card__icon-wrap call-card__icon-wrap--ended">
        <PhoneOffIcon className="w-5 h-5" />
      </div>
      <div className="call-card__body">
        <p className="call-card__title">Missed Call</p>
        <p className="call-card__meta">
          <ClockIcon className="w-3 h-3 inline mr-1 opacity-60" />
          {formatTime(meta.startTime)}
        </p>
      </div>
      <button
        onClick={() => {
          markCallJoinedForUser(user?.id, meta.callId);
          const channelId = meta.channelId || "";
          const query = channelId ? `?channel=${encodeURIComponent(channelId)}` : "";
          window.open(`/call/${meta.callId}${query}`, "_blank");
        }}
        className="call-card__join-btn"
        title="Join Call"
      >
        <PhoneOffIcon className="w-4 h-4" />
        Join Call
      </button>
    </div>
  );
};

// ── Ended card ────────────────────────────────────────────────
const EndedCallCard = ({ meta }) => (
  <div className="call-card call-card--ended">
    <div className="call-card__icon-wrap call-card__icon-wrap--ended">
      <PhoneOffIcon className="w-5 h-5" />
    </div>
    <div className="call-card__body">
      <p className="call-card__title">Call Ended</p>
      <p className="call-card__meta">
        <ClockIcon className="w-3 h-3 inline mr-1 opacity-60" />
        {formatTime(meta.startTime)}
        {meta.endTime && ` · Duration: ${formatDuration(meta.startTime, meta.endTime)}`}
      </p>
    </div>
  </div>
);

// ── Active card ───────────────────────────────────────────────
// This card is rendered for __CALL__ messages where ended=false.
// It watches for a matching ended message and transitions to EndedCallCard.
const ActiveCallCard = ({ meta }) => {
  const { callId, startTime, channelId } = meta;
  const { channel } = useChannelStateContext();
  const { user } = useUser();
  const [status, setStatus] = useState("started");
  const [elapsed, setElapsed] = useState("");

  // scan existing messages for a matching ended message
  useEffect(() => {
    const checkEnded = () => {
      const msgs = Object.values(channel.state.messages);
      const endedMsg = msgs.find((m) => {
        const p = parseCallMessage(m.text);
        return (p?.ended || p?.status === "ended" || p?.status === "missed") && p?.callId === callId;
      });
      if (endedMsg) {
        const p = parseCallMessage(endedMsg.text);
        setStatus(p?.status === "missed" ? "missed" : "ended");
      }
    };
    // run immediately and also after a short delay in case messages load async
    checkEnded();
    const t = setTimeout(checkEnded, 1000);
    return () => clearTimeout(t);
  }, [channel, callId]);

  // real-time: listen for ended message arriving
  useEffect(() => {
    const handler = (event) => {
      const p = parseCallMessage(event.message?.text);
      if ((p?.ended || p?.status === "ended" || p?.status === "missed") && p?.callId === callId) {
        setStatus(p?.status === "missed" ? "missed" : "ended");
      }
    };
    channel.on("message.new", handler);
    return () => channel.off("message.new", handler);
  }, [channel, callId]);

  // live elapsed timer
  useEffect(() => {
    if (status !== "started") return;
    const tick = () => {
      const diff = Math.floor((Date.now() - new Date(startTime)) / 1000);
      const m = Math.floor(diff / 60), s = diff % 60;
      setElapsed(m > 0 ? `${m}m ${s}s` : `${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startTime, status]);

  // Avoid duplicate UI:
  // The started card should not render an ended/missed card again,
  // because the ended/missed chat message will render its own card.
  if (status !== "started") return null;

  return (
    <div className="call-card call-card--active">
      <span className="call-card__ring" />

      <div className="call-card__icon-wrap call-card__icon-wrap--active">
        <VideoIcon className="w-5 h-5" />
      </div>

      <div className="call-card__body">
        <div className="call-card__title-row">
          <p className="call-card__title">Video Call in Progress</p>
          <span className="call-card__live-badge">LIVE</span>
        </div>
        <p className="call-card__meta">
          <ClockIcon className="w-3 h-3 inline mr-1 opacity-70" />
          Started {formatTime(startTime)}
          {elapsed && ` · ${elapsed}`}
        </p>
        <p className="call-card__hint">
          <UsersIcon className="w-3 h-3 inline mr-1 opacity-60" />
          Click Join to enter the call
        </p>
      </div>

      <button
        onClick={() => {
          markCallJoinedForUser(user?.id, callId);
          const query = channelId ? `?channel=${encodeURIComponent(channelId)}` : "";
          window.open(`/call/${callId}${query}`, "_blank");
        }}
        className="call-card__join-btn"
      >
        <VideoIcon className="w-4 h-4" />
        Join Call
      </button>
    </div>
  );
};

export default CallMessage;
