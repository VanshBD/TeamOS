import { useState, useEffect, useRef } from "react";
import { StreamChat } from "stream-chat";
import { useUser } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { getStreamToken } from "../lib/api";
import * as Sentry from "@sentry/react";

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

export const useStreamChat = () => {
  const { user } = useUser();
  const [chatClient, setChatClient] = useState(null);
  const connectingRef = useRef(false);
  const clientRef = useRef(null);

  const {
    data: tokenData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["streamToken"],
    queryFn: getStreamToken,
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  useEffect(() => {
    if (!tokenData?.token || !user?.id || !STREAM_API_KEY) return;
    // Already connected or connecting — skip
    if (connectingRef.current || clientRef.current?.userID) return;

    connectingRef.current = true;

    const client = StreamChat.getInstance(STREAM_API_KEY);
    clientRef.current = client;

    const connect = async () => {
      try {
        await client.connectUser(
          {
            id: user.id,
            name:
              user.fullName ??
              user.username ??
              user.primaryEmailAddress?.emailAddress ??
              user.id,
            image: user.imageUrl ?? undefined,
          },
          tokenData.token
        );
        setChatClient(client);
      } catch (err) {
        console.log("Error connecting to stream", err);
        Sentry.captureException(err, {
          tags: { component: "useStreamChat" },
          extra: { userId: user?.id },
        });
        connectingRef.current = false;
        clientRef.current = null;
      }
    };

    connect();

    return () => {
      // Only disconnect if we actually connected
      if (clientRef.current?.userID) {
        clientRef.current.disconnectUser().then(() => {
          clientRef.current = null;
          connectingRef.current = false;
          setChatClient(null);
        });
      } else {
        connectingRef.current = false;
      }
    };
  }, [tokenData?.token, user?.id]);

  return { chatClient, isLoading, error };
};
