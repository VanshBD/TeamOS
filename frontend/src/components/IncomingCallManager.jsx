import { useEffect, useMemo, useRef, useState } from "react";
import { useChatContext } from "stream-chat-react";
import { useUser } from "@clerk/clerk-react";

import IncomingCallPopup from "./IncomingCallPopup";
import {
  buildCallMissedText,
  isCallHandledForUser,
  isCallJoinedForUser,
  markCallHandledForUser,
  parseCallMessage,
} from "../lib/callMessages";

const POPUP_TIMEOUT_MS = 60000;

const IncomingCallManager = () => {
  const { client } = useChatContext();
  const { user } = useUser();

  const [incomingCall, setIncomingCall] = useState(null); // { callId, channelId, callerName, callerImage, startTime }
  const timeoutRef = useRef(null);
  const endedOrMissedRef = useRef(new Set());

  const currentUserId = user?.id;

  const clearTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const sendMissedIfNeeded = async (callId, channelId, startTime) => {
    if (!client || !currentUserId) return;
    if (!callId || !channelId) return;

    // If user joined (or call already ended), do nothing.
    if (isCallJoinedForUser(currentUserId, callId)) return;
    if (endedOrMissedRef.current.has(callId)) return;

    const callChannel = client.channel("messaging", channelId);
    try {
      const { messages } = await callChannel.query({ messages: { limit: 50 } });
      const alreadyClosed = (messages || []).some((m) => {
        const p = parseCallMessage(m.text);
        return (
          p?.callId === callId &&
          (p?.ended || p?.status === "ended" || p?.status === "missed")
        );
      });
      if (alreadyClosed) return;

      await callChannel.sendMessage({
        text: buildCallMissedText(callId, startTime || new Date().toISOString(), channelId, currentUserId),
      });
    } catch (err) {
      // Avoid spamming errors for common network hiccups.
      console.log("Failed to send missed call message:", err);
    }
  };

  const dismissPopup = async (reason) => {
    if (!incomingCall) return;
    const { callId, channelId, startTime } = incomingCall;

    clearTimer();
    setIncomingCall(null);

    if (reason === "join") return;

    await sendMissedIfNeeded(callId, channelId, startTime);
    // Mark ended/missed so UI won't resurface for this callId.
    endedOrMissedRef.current.add(callId);
  };

  const extractChannelId = (event) => {
    const cid = event?.channel?.id || event?.cid;
    if (!cid) return null;
    if (typeof cid !== "string") return null;
    // Stream cid typically looks like "messaging:<id>"
    if (cid.includes(":")) {
      const parts = cid.split(":");
      return parts[parts.length - 1];
    }
    return cid;
  };

  // Cancel missed timer if user joined via any UI.
  useEffect(() => {
    const handler = (e) => {
      const callId = e?.detail?.callId;
      if (!callId) return;
      // If this call is currently being ringed, dismiss it.
      setIncomingCall((prev) => {
        if (!prev || prev.callId !== callId) return prev;
        clearTimer();
        return null;
      });
    };

    window.addEventListener("slackclone_call_joined", handler);
    return () => window.removeEventListener("slackclone_call_joined", handler);
  }, []);

  const startedEventHandler = useMemo(() => {
    return async (event) => {
      if (!client || !currentUserId) return;
      const msg = event?.message;
      if (!msg?.text) return;

      const meta = parseCallMessage(msg.text);
      if (!meta?.callId) return;

      // Ignore calls started by myself.
      if (msg.user?.id && msg.user.id === currentUserId) return;

      // Ended/missed events should dismiss popup and cancel pending timers.
      if (meta?.ended || meta?.status === "ended" || meta?.status === "missed") {
        endedOrMissedRef.current.add(meta.callId);
        clearTimer();
        setIncomingCall((prev) => (prev?.callId === meta.callId ? null : prev));
        return;
      }

      if (meta.status !== "started") return;

      const callId = meta.callId;
      if (endedOrMissedRef.current.has(callId)) return;
      if (incomingCall) return; // show only one popup at a time

      if (isCallHandledForUser(currentUserId, callId)) return;

      // Caller info from Stream message.user
      const callerName = msg.user?.name || msg.user?.id;
      const callerImage = msg.user?.image;
      const startTime = meta.startTime;

      // Prefer channelId embedded in message; fall back to event's channel
      const channelId = meta.channelId || extractChannelId(event);
      if (!channelId) return;

      markCallHandledForUser(currentUserId, callId);
      setIncomingCall({
        callId,
        channelId,
        callerName,
        callerImage,
        startTime,
      });

      clearTimer();
      timeoutRef.current = setTimeout(() => {
        // If user joined during ringing, don't send missed.
        if (!isCallJoinedForUser(currentUserId, callId)) {
          sendMissedIfNeeded(callId, channelId, startTime).finally(() => {
            endedOrMissedRef.current.add(callId);
            setIncomingCall(null);
          });
        } else {
          setIncomingCall(null);
        }
      }, POPUP_TIMEOUT_MS);
    };
  }, [client, currentUserId, incomingCall]);

  useEffect(() => {
    if (!client || !currentUserId) return;

    const handler = (event) => {
      // wrap async so we don't break listener chain
      startedEventHandler(event);
    };

    client.on("message.new", handler);
    return () => client.off("message.new", handler);
  }, [client, currentUserId, startedEventHandler]);

  if (!incomingCall) return null;

  return (
    <IncomingCallPopup
      callerName={incomingCall.callerName}
      callerImage={incomingCall.callerImage}
      callId={incomingCall.callId}
      channelId={incomingCall.channelId}
      onDismiss={(reason) => {
        dismissPopup(reason);
      }}
    />
  );
};

export default IncomingCallManager;

