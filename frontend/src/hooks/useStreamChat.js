import { useState, useEffect, useRef } from "react";
import { StreamChat } from "stream-chat";
import { useUser } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { getStreamToken } from "../lib/api";
import * as Sentry from "@sentry/react";

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

// Module-level singleton — survives React unmount/remount (page navigation)
// Never reset these inside a component — only mutate from the connect/disconnect logic
let _client = null;
let _connecting = false;

export const useStreamChat = () => {
  const { user } = useUser();
  const [chatClient, setChatClient] = useState(null);
  const mountedRef = useRef(true);

  const { data: tokenData, isLoading: tokenLoading, error: tokenError } = useQuery({
    queryKey: ["streamToken"],
    queryFn: getStreamToken,
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  // Track mount state so we don't setState after unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Expose already-connected client immediately on remount (no loading flash)
  useEffect(() => {
    if (_client?.userID && mountedRef.current) {
      setChatClient(_client);
    }
  }, []);

  useEffect(() => {
    if (!tokenData?.token || !user?.id || !STREAM_API_KEY) return;

    // Already connected to the right user — just expose it
    if (_client?.userID === user.id) {
      if (mountedRef.current) setChatClient(_client);
      return;
    }

    // Already in the middle of connecting — don't start another attempt
    if (_connecting) return;

    _connecting = true;

    const connect = async () => {
      try {
        // If a different user was connected, disconnect first
        if (_client?.userID && _client.userID !== user.id) {
          await _client.disconnectUser().catch(() => {});
          _client = null;
        }

        // Get or create the singleton
        if (!_client) {
          _client = StreamChat.getInstance(STREAM_API_KEY);
        }

        // Double-check: singleton may have reconnected between the checks above
        if (_client.userID === user.id) {
          if (mountedRef.current) setChatClient(_client);
          return;
        }

        // Build user details — ensure name is never empty (Stream requires it)
        const name = (
          user.fullName ||
          `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
          user.username ||
          user.primaryEmailAddress?.emailAddress ||
          user.id
        );

        await _client.connectUser(
          {
            id: user.id,
            name,
            image: user.imageUrl || undefined,
          },
          tokenData.token
        );

        if (mountedRef.current) setChatClient(_client);
      } catch (err) {
        console.error("Error connecting to stream", err);
        Sentry.captureException(err, {
          tags: { component: "useStreamChat" },
          extra: { userId: user?.id },
        });
        // Reset so a retry is possible
        _client = null;
      } finally {
        _connecting = false;
      }
    };

    connect();

    // No cleanup disconnect — singleton stays alive across navigation.
    // Clerk's signOut handles the final disconnect.
  }, [tokenData?.token, user?.id]);

  return {
    chatClient,
    isLoading: (tokenLoading || (!chatClient && !!user?.id)) && !tokenError,
    error: tokenError ?? null,
  };
};
