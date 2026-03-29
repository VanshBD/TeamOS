import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { useChatContext } from "stream-chat-react";
import toast from "react-hot-toast";

import { getPublicChannel, joinPublicChannel } from "../lib/api";
import PublicChannelPreview from "../components/PublicChannelPreview";
import PageLoader from "../components/PageLoader";

const PublicChannelPage = () => {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const { isSignedIn, isLoaded } = useAuth();
  const { client } = useChatContext();

  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [channelData, setChannelData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!channelId) {
      navigate("/");
      return;
    }

    const fetchChannel = async () => {
      try {
        setLoading(true);
        setError("");
        
        const result = await getPublicChannel(channelId);
        setChannelData(result);
      } catch (err) {
        setError(err?.response?.data?.message || "Channel not found");
      } finally {
        setLoading(false);
      }
    };

    fetchChannel();
  }, [channelId, navigate]);

  const handleJoin = async () => {
    if (!channelData?.channelId || !isSignedIn) {
      navigate("/auth");
      return;
    }

    setJoining(true);
    try {
      await joinPublicChannel(channelData.channelId);

      // After joining, watch the channel and navigate to the main app
      const channel = client.channel("messaging", channelData.channelId);
      await channel.watch();
      
      toast.success(`Successfully joined ${channelData.name}!`);
      navigate(`/?channel=${channelData.channelId}`);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to join channel");
    } finally {
      setJoining(false);
    }
  };

  if (!isLoaded) {
    return <PageLoader />;
  }

  if (!isSignedIn) {
    navigate("/auth");
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <PageLoader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Channel Not Found</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Public Channel</h1>
          <p className="text-gray-400">
            You've been invited to join this channel. Preview the messages below and join to participate.
          </p>
        </div>
        
        <PublicChannelPreview 
          channelData={channelData} 
          onJoin={handleJoin}
          loading={joining}
        />
        
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate("/")}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default PublicChannelPage;
