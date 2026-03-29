import { HashIcon, LockIcon, UsersIcon, PinIcon, VideoIcon, MoreVerticalIcon, ShareIcon, TrashIcon, SettingsIcon } from "lucide-react";
import { useChannelStateContext } from "stream-chat-react";
import { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/clerk-react";
import MembersModal from "./MembersModal";
import PinnedMessagesModal from "./PinnedMessagesModal";
import InviteModal from "./InviteModal";
import ChannelSettingsModal from "./ChannelSettingsModal";
import { buildCallMessageText } from "../lib/callMessages";
import toast from "react-hot-toast";

const CustomChannelHeader = () => {
  const { channel } = useChannelStateContext();
  const { user } = useUser();

  const memberCount = Object.keys(channel.state.members).length;

  const [showInvite, setShowInvite] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showPinnedMessages, setShowPinnedMessages] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const dropdownRef = useRef(null);

  const createCallId = () => `call-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  const otherUser = Object.values(channel.state.members).find(
    (member) => member.user?.id !== user?.id
  );
  const isDM = channel.data?.member_count === 2 && channel.data?.id?.includes("user_");

  const handleShowPinned = async () => {
    const channelState = await channel.query();
    setPinnedMessages(channelState.pinned_messages);
    setShowPinnedMessages(true);
  };

  const handleVideoCall = async () => {
    if (!channel) return;
    const callId = createCallId();
    const startTime = new Date().toISOString();
    await channel.sendMessage({
      text: buildCallMessageText(callId, startTime, channel.id),
    });
    window.open(`/call/${callId}?channel=${encodeURIComponent(channel.id)}&caller=1`, "_blank");
  };

  const handleShareChannel = async () => {
    const shareableLink = `${window.location.origin}/channel/${channel.id}`;
    try {
      await navigator.clipboard.writeText(shareableLink);
      toast.success("Channel link copied to clipboard!");
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  const handleDeleteChannel = async () => {
    if (!window.confirm("Are you sure you want to delete this channel? This action cannot be undone.")) {
      return;
    }
    
    try {
      await channel.delete();
      toast.success("Channel deleted successfully");
      window.location.href = "/";
    } catch (error) {
      toast.error("Failed to delete channel");
      console.error("Delete channel error:", error);
    }
  };

  const isPublicChannel = !channel.data?.private && (channel.data?.visibility === "public" || channel.data?.discoverable === true);
  
  // Enhanced creator detection with multiple fallback methods
  const isChannelCreator = (() => {
    // Method 1: Check created_by_id directly
    if (channel.data?.created_by_id === user?.id) return true;
    
    // Method 2: Check created_by object
    if (channel.data?.created_by?.id === user?.id) return true;
    
    // Method 3: Check channel role (admin/owner)
    const userRole = channel.state.members[user?.id]?.channel_role;
    if (userRole === 'admin' || userRole === 'owner') return true;
    
    // Method 4: Check if user is the only member (for newly created channels)
    const members = Object.keys(channel.state.members || {});
    if (members.length === 1 && members[0] === user?.id) return true;
    
    // Method 5: Check if user was the first to join (created_at timestamp)
    const memberInfo = channel.state.members[user?.id];
    if (memberInfo && memberInfo.created_at) {
      const userJoinTime = new Date(memberInfo.created_at);
      const otherMembers = Object.values(channel.state.members || {})
        .filter(m => m.user?.id !== user?.id)
        .map(m => new Date(m.created_at || 0));
      
      if (otherMembers.every(joinTime => userJoinTime <= joinTime)) return true;
    }
    
    return false;
  })();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      <div className="h-14 border-b border-gray-200 flex items-center px-4 justify-between bg-white">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {channel.data?.private ? (
              <LockIcon className="size-4 text-[#616061]" />
            ) : (
              <HashIcon className="size-4 text-[#616061]" />
            )}

            {isDM && otherUser?.user?.image && (
              <img
                src={otherUser.user.image}
                alt={otherUser.user.name || otherUser.user.id}
                className="size-7 rounded-full object-cover mr-1"
              />
            )}

            <span className="font-medium text-[#1D1C1D]">
              {isDM ? otherUser?.user?.name || otherUser?.user?.id : channel.data?.id}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="flex items-center gap-2 hover:bg-[#F8F8F8] py-1 px-2 rounded"
            onClick={() => setShowMembers(true)}
          >
            <UsersIcon className="size-5 text-[#616061]" />
            <span className="text-sm text-[#616061]">{memberCount}</span>
          </button>

          <button
            className="hover:bg-[#F8F8F8] p-1 rounded"
            onClick={handleVideoCall}
            title="Start Video Call"
          >
            <VideoIcon className="size-5 text-[#1264A3]" />
          </button>

          {channel.data?.private && (
            <button className="btn btn-primary" onClick={() => setShowInvite(true)}>
              Invite
            </button>
          )}

          <button className="hover:bg-[#F8F8F8] p-1 rounded" onClick={handleShowPinned}>
            <PinIcon className="size-4 text-[#616061]" />
          </button>

          {/* More Options Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              className="hover:bg-[#F8F8F8] p-1 rounded transition-colors"
              onClick={() => setShowDropdown(!showDropdown)}
              title="More Options"
            >
              <MoreVerticalIcon className="size-5 text-[#616061]" />
            </button>

            {showDropdown && (
              <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl py-2 z-50 min-w-[180px] animate-fade-in">
                {/* Always show for all channels */}
                <button
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-gray-50 text-left transition-colors"
                  onClick={() => {
                    setShowDropdown(false);
                    setShowSettings(true);
                  }}
                >
                  <SettingsIcon className="size-4 text-gray-600" />
                  <div>
                    <div className="font-medium text-gray-900">Channel Details</div>
                    <div className="text-xs text-gray-500">View channel information</div>
                  </div>
                </button>

                {isPublicChannel && (
                  <button
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-gray-50 text-left transition-colors border-t border-gray-100"
                    onClick={handleShareChannel}
                  >
                    <ShareIcon className="size-4 text-blue-600" />
                    <div>
                      <div className="font-medium text-gray-900">Share Channel</div>
                      <div className="text-xs text-gray-500">Copy invite link</div>
                    </div>
                  </button>
                )}
                
                {isChannelCreator && (
                  <>
                    <div className="border-t border-gray-100 my-1"></div>
                    <button
                      className="flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-red-50 text-left transition-colors"
                      onClick={handleDeleteChannel}
                    >
                      <TrashIcon className="size-4 text-red-600" />
                      <div>
                        <div className="font-medium text-red-600">Delete Channel</div>
                        <div className="text-xs text-gray-500">Remove channel permanently</div>
                      </div>
                    </button>
                  </>
                )}

              </div>
            )}
          </div>
        </div>

        {showMembers && (
          <MembersModal
            members={Object.values(channel.state.members)}
            onClose={() => setShowMembers(false)}
          />
        )}
        {showPinnedMessages && (
          <PinnedMessagesModal
            pinnedMessages={pinnedMessages}
            onClose={() => setShowPinnedMessages(false)}
          />
        )}
        {showInvite && <InviteModal channel={channel} onClose={() => setShowInvite(false)} />}
        {showSettings && (
          <ChannelSettingsModal 
            channel={channel} 
            onClose={() => setShowSettings(false)} 
          />
        )}
      </div>
    </>
  );
};

export default CustomChannelHeader;
