import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@clerk/clerk-react";
import toast from "react-hot-toast";

import { getStreamToken } from "../lib/api";
import { StreamChat } from "stream-chat";
import { buildCallEndedText, buildCallMissedText, parseCallMessage } from "../lib/callMessages";

const STREAM_CHAT_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

import {
  StreamVideo,
  StreamVideoClient,
  StreamCall,
  StreamTheme,
  CallingState,
  useCallStateHooks,
  useCall,
  SpeakerLayout,
  ToggleAudioPublishingButton,
  ToggleVideoPublishingButton,
  ScreenShareButton,
} from "@stream-io/video-react-sdk";

import "@stream-io/video-react-sdk/dist/css/styles.css";
import { PhoneOffIcon, LogOutIcon } from "lucide-react";

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;
const MISSED_RING_TIMEOUT_MS = 60000;

// Stream Video enforces a 64-char max on call IDs
const safeCallId = (id) => (id && id.length > 64 ? id.slice(0, 64) : id);

const closeTab = () => {
  window.close();
  setTimeout(() => { window.location.href = "/"; }, 300);
};

const CallPage = () => {
  const { id: callId } = useParams();
  const [searchParams] = useSearchParams();
  const channelId = searchParams.get("channel") || callId;
  const isCaller = searchParams.get("caller") === "1";
  const { user, isLoaded } = useUser();

  const [client, setClient] = useState(null);
  const [call, setCall] = useState(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isHost, setIsHost] = useState(false);
  const [resolvedChannelId, setResolvedChannelId] = useState(channelId);
  // keep chatClient ref so CallContent can reuse it
  const chatClientRef = useRef(null);

  const { data: tokenData } = useQuery({
    queryKey: ["streamToken"],
    queryFn: getStreamToken,
    enabled: !!user,
  });

  useEffect(() => {
    if (!tokenData?.token || !user || !callId) return;

    let videoClient;

    const initCall = async () => {
      try {
        videoClient = new StreamVideoClient({
          apiKey: STREAM_API_KEY,
          user: { id: user.id, name: user.fullName, image: user.imageUrl },
          token: tokenData.token,
        });

        const callInstance = videoClient.call("default", safeCallId(callId));
        await callInstance.join({ create: isCaller });

        setClient(videoClient);
        setCall(callInstance);

        // connect chat client to check who sent the __CALL__ message
        const chatClient = StreamChat.getInstance(STREAM_CHAT_API_KEY);
        if (!chatClient.userID) {
          await chatClient.connectUser(
            { id: user.id, name: user.fullName, image: user.imageUrl },
            tokenData.token
          );
        }
        chatClientRef.current = chatClient;

        try {
          let resolved = channelId;
          let messages = [];

          const channel = chatClient.channel("messaging", resolved);
          try {
            const channelData = await channel.query({ messages: { limit: 50 } });
            messages = channelData.messages || [];
          } catch {
            const userChannels = await chatClient.queryChannels(
              { members: { $in: [user.id] } },
              { last_message_at: -1 },
              { watch: false, state: true, limit: 30, message_limit: 30 }
            );
            const matched = userChannels.find((ch) =>
              Object.values(ch.state.messages || {}).some((m) => {
                const p = parseCallMessage(m.text);
                return p?.callId === callId;
              })
            );
            if (matched) {
              resolved = matched.id;
              messages = Object.values(matched.state.messages || {});
            }
          }

          setResolvedChannelId(resolved);
          const callStartMsg = [...messages].reverse().find((m) => {
            const p = parseCallMessage(m.text);
            return p && !p.ended && p.status !== "ended" && p.status !== "missed" && p.callId === callId;
          });
          setIsHost(callStartMsg?.user?.id === user.id);
        } catch (chatMetaError) {
          console.log("Call metadata lookup failed:", chatMetaError);
          setResolvedChannelId(channelId);
          setIsHost(false);
        }
      } catch (error) {
        console.log("Error init call:", error);
        toast.error("Cannot connect to the call.");
      } finally {
        setIsConnecting(false);
      }
    };

    initCall();

    return () => {
      videoClient?.disconnectUser().catch(() => {});
    };
  }, [tokenData?.token, user?.id, callId, channelId, isCaller]);

  if (!isLoaded || isConnecting) {
    return (
      <div style={{ height: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#080810", gap: 16 }}>
        <div style={{ position: "relative", width: 56, height: 56 }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid transparent", borderTopColor: "#9333ea", borderRightColor: "#6d28d9", animation: "spin .8s linear infinite" }} />
          <div style={{ position: "absolute", inset: 8, borderRadius: "50%", background: "linear-gradient(135deg,#6d28d9,#2563eb)", boxShadow: "0 0 20px rgba(109,40,217,.5)" }} />
        </div>
        <p style={{ color: "rgba(160,158,192,.8)", fontSize: 14, fontWeight: 500, margin: 0 }}>Connecting to call…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!client || !call) {
    return (
      <div style={{ height: "100dvh", display: "flex", flexDirection: "column", gap: 16, alignItems: "center", justifyContent: "center", background: "#080810" }}>
        <p style={{ color: "rgba(241,240,255,.7)", fontSize: 14, margin: 0 }}>Could not initialize call. Please refresh or try again.</p>
        <button onClick={closeTab} style={{ padding: "10px 20px", background: "linear-gradient(135deg,#dc2626,#b91c1c)", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Close</button>
      </div>
    );
  }

  return (
    <div className="h-dvh flex flex-col bg-gray-900">
      <StreamVideo client={client}>
        <StreamCall call={call}>
          <CallContent
            userId={user.id}
            tokenData={tokenData}
            isHost={isHost}
            callId={callId}
            channelId={resolvedChannelId}
            chatClientRef={chatClientRef}
          />
        </StreamCall>
      </StreamVideo>
    </div>
  );
};

const CallContent = ({ userId, tokenData, isHost, callId, channelId, chatClientRef }) => {
  const { useCallCallingState, useParticipants } = useCallStateHooks();
  const callingState = useCallCallingState();
  const participants = useParticipants();
  const call = useCall();

  // track whether we've actually joined so we don't fire closeTab on initial IDLE
  const hasJoinedRef = useRef(false);
  const endedSentRef = useRef(false);
  const missedSentRef = useRef(false);

  // mark as joined once we reach JOINED state
  useEffect(() => {
    if (callingState === CallingState.JOINED) {
      hasJoinedRef.current = true;
    }
  }, [callingState]);

  // close tab when call ends — only after we've actually joined
  useEffect(() => {
    if (!hasJoinedRef.current) return;
    if (callingState === CallingState.LEFT || callingState === CallingState.IDLE) {
      closeTab();
    }
  }, [callingState]);

  const sendEndedMessage = async () => {
    if (!isHost || !call) return;
    if (endedSentRef.current) return;
    endedSentRef.current = true;

    try {
      const chatClient = chatClientRef.current || StreamChat.getInstance(STREAM_CHAT_API_KEY);
      if (!chatClient.userID) {
        await chatClient.connectUser({ id: userId }, tokenData.token);
      }
      const channel = chatClient.channel("messaging", channelId);
      const { messages } = await channel.query({ messages: { limit: 50 } });

      const alreadyEnded = messages.some((m) => {
        const p = parseCallMessage(m.text);
        return (p?.ended || p?.status === "ended") && p?.callId === callId;
      });
      if (alreadyEnded) return;

      const startMsg = [...messages].reverse().find((m) => {
        const p = parseCallMessage(m.text);
        return p && !p.ended && p.status !== "ended" && p.status !== "missed" && p.callId === callId;
      });
      const startTime = startMsg
        ? parseCallMessage(startMsg.text).startTime
        : new Date().toISOString();

      await channel.sendMessage({
        text: buildCallEndedText(callId, startTime, new Date().toISOString(), channelId),
      });
    } catch (err) {
      console.log("Error sending call ended message:", err);
    }
  };

  useEffect(() => {
    if (!isHost || !hasJoinedRef.current || !call) return;
    if (callingState !== CallingState.JOINED) return;
    if ((participants?.length || 0) > 1) return;
    if (missedSentRef.current) return;

    const timer = setTimeout(async () => {
      if ((participants?.length || 0) > 1) return;
      if (missedSentRef.current) return;
      missedSentRef.current = true;

      try {
        const chatClient = chatClientRef.current || StreamChat.getInstance(STREAM_CHAT_API_KEY);
        if (!chatClient.userID) {
          await chatClient.connectUser({ id: userId }, tokenData.token);
        }
        const channel = chatClient.channel("messaging", channelId);
        const { messages } = await channel.query({ messages: { limit: 50 } });
        const alreadyClosed = messages.some((m) => {
          const p = parseCallMessage(m.text);
          return (p?.status === "missed" || p?.status === "ended" || p?.ended) && p?.callId === callId;
        });
        if (!alreadyClosed) {
          const startMsg = [...messages].reverse().find((m) => {
            const p = parseCallMessage(m.text);
            return p && p.callId === callId && !p.ended && p.status !== "ended" && p.status !== "missed";
          });
          const startTime = startMsg
            ? parseCallMessage(startMsg.text).startTime
            : new Date().toISOString();
          await channel.sendMessage({
            text: buildCallMissedText(callId, startTime, channelId, "timeout"),
          });
        }
      } catch (err) {
        console.log("Error sending missed call message:", err);
      } finally {
        try {
          await call.leave();
        } catch (leaveError) {
          console.log("Error leaving call after timeout:", leaveError);
        }
        closeTab();
      }
    }, MISSED_RING_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [isHost, callingState, participants, call, callId, channelId, chatClientRef, tokenData?.token, userId]);

  return (
    <StreamTheme>
      <SpeakerLayout />
      <CustomCallControls isHost={isHost} onEndCall={sendEndedMessage} />
    </StreamTheme>
  );
};

const CustomCallControls = ({ isHost, onEndCall }) => {
  const call = useCall();
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();

  const handleEndCall = async () => {
    try {
      await onEndCall();
      await call?.endCall();
    } catch (err) {
      console.log("End call error:", err);
    }
    closeTab();
  };

  const handleLeave = async () => {
    try {
      await call?.leave();
    } catch (err) {
      console.log("Leave call error:", err);
    }
    closeTab();
  };

  if (callingState === CallingState.LEFT) return null;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "16px", background: "rgba(8,8,16,.9)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(255,255,255,.06)" }}>
        <ToggleAudioPublishingButton />
        <ToggleVideoPublishingButton />
        <ScreenShareButton />

        {isHost ? (
          <button
            onClick={handleEndCall}
            title="End Call for Everyone"
            className="flex items-center justify-center gap-2 px-4 h-10 rounded-full bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
          >
            <PhoneOffIcon className="w-4 h-4" />
            End Call
          </button>
        ) : (
          <button
            onClick={handleLeave}
            title="Leave Call"
            className="flex items-center justify-center gap-2 px-4 h-10 rounded-full bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium transition-colors"
          >
            <LogOutIcon className="w-4 h-4" />
            Leave
          </button>
        )}
      </div>
    </>
  );
};

export default CallPage;
