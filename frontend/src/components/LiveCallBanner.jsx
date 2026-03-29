import { useEffect, useState } from "react";
import { useChannelStateContext } from "stream-chat-react";
import { parseCallMessage } from "../lib/callMessages";
import { markCallJoinedForUser } from "../lib/callMessages";
import { useUser } from "@clerk/clerk-react";
import { VideoIcon, XIcon } from "lucide-react";

// Scans channel messages for an active (non-ended) call and shows a sticky banner
const LiveCallBanner = () => {
  const { channel } = useChannelStateContext();
  const { user } = useUser();
  const [activeCall, setActiveCall] = useState(null); // { callId, startTime }
  const [dismissed, setDismissed] = useState(false);

  const findActiveCall = (messages) => {
    const msgList = Object.values(messages);

    // collect all callIds that have an ended OR missed message
    const closedCallIds = new Set(
      msgList
        .map((m) => parseCallMessage(m.text))
        .filter((p) => p?.ended || p?.status === "ended" || p?.status === "missed")
        .map((p) => p.callId)
    );

    // find the most recent start message whose callId is NOT closed
    const active = [...msgList]
      .reverse()
      .find((m) => {
        const p = parseCallMessage(m.text);
        return (
          p &&
          !p.ended &&
          p.status === "started" &&
          !closedCallIds.has(p.callId)
        );
      });

    return active ? parseCallMessage(active.text) : null;
  };

  // initial scan
  useEffect(() => {
    setDismissed(false);
    const found = findActiveCall(channel.state.messages);
    setActiveCall(found);
  }, [channel.id]);

  // listen for new messages — call started or ended
  useEffect(() => {
    const handler = () => {
      setDismissed(false);
      const found = findActiveCall(channel.state.messages);
      setActiveCall(found);
    };
    channel.on("message.new", handler);
    return () => channel.off("message.new", handler);
  }, [channel]);

  if (!activeCall || dismissed) return null;

  const handleJoin = () => {
    markCallJoinedForUser(user?.id, activeCall.callId);
    const query = activeCall.channelId ? `?channel=${encodeURIComponent(activeCall.channelId)}` : "";
    window.open(`/call/${activeCall.callId}${query}`, "_blank");
  };

  return (
    <div className="live-call-banner">
      <div className="live-call-banner__pulse" />
      <div className="live-call-banner__left">
        <span className="live-call-banner__dot" />
        <VideoIcon className="w-4 h-4 text-white" />
        <span className="live-call-banner__text">Live call in progress</span>
      </div>
      <div className="live-call-banner__actions">
        <button onClick={handleJoin} className="live-call-banner__join">
          Join Now
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="live-call-banner__dismiss"
          title="Dismiss"
        >
          <XIcon className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default LiveCallBanner;
