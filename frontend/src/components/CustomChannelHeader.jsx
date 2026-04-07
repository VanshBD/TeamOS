import { HashIcon, LockIcon, UsersIcon, PinIcon, VideoIcon, ShareIcon, TrashIcon, SettingsIcon } from "lucide-react";
import { useChannelStateContext } from "stream-chat-react";
import { useState, useEffect, useRef, useContext } from "react";
import { useUser } from "@clerk/clerk-react";
import MembersModal from "./MembersModal";
import PinnedMessagesModal from "./PinnedMessagesModal";
import InviteModal from "./InviteModal";
import ChannelSettingsModal from "./ChannelSettingsModal";
import { PanelContext } from "../pages/HomePage";
import { buildCallMessageText } from "../lib/callMessages";
import toast from "react-hot-toast";

const CustomChannelHeader = ({ onBack }) => {
  const { channel } = useChannelStateContext();
  const { user } = useUser();
  const { openFriendProfile, openChannelDetail } = useContext(PanelContext);

  const memberCount = Object.keys(channel.state.members).length;

  const [showInvite, setShowInvite] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showPinnedMessages, setShowPinnedMessages] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const dropdownRef = useRef(null);

  const createCallId = () => `call-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  const otherUser = Object.values(channel.state.members).find(
    (member) => member.user?.id !== user?.id
  );
  const isDM = !channel.data?.name && Object.keys(channel.state.members).length === 2;

  // Resolve the other user's image — channel state may not have it, so fall back to a Stream query
  const [otherUserImage, setOtherUserImage] = useState(otherUser?.user?.image || null);
  useEffect(() => {
    if (!isDM || !otherUser?.user?.id) return;
    if (otherUser?.user?.image) { setOtherUserImage(otherUser.user.image); return; }
    // image not in channel state — query Stream for the full user object
    channel._client?.queryUsers({ id: { $eq: otherUser.user.id } }, {}, { limit: 1 })
      .then(res => { if (res.users?.[0]?.image) setOtherUserImage(res.users[0].image); })
      .catch(() => {});
  }, [isDM, otherUser?.user?.id, otherUser?.user?.image]);

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
        // no-op — dropdown removed
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      <div className="ch-header">
        {/* Back/hamburger — mobile only */}
        <button
          className="ch-header__hamburger"
          onClick={() => {
            if (onBack) onBack();
            else window.dispatchEvent(new CustomEvent("teamos:open-sidebar"));
          }}
          aria-label="Back"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M13 4L7 10L13 16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Left: channel info — click to open detail */}
        <button
          className="ch-header__left"
          onClick={() => isDM
            ? openFriendProfile({ id: otherUser?.user?.id, name: otherUser?.user?.name || otherUser?.user?.id, image: otherUserImage })
            : openChannelDetail()
          }
          title={isDM ? "View profile" : "Channel details"}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}
        >
          {channel.data?.private
            ? <LockIcon className="ch-header__icon" />
            : <HashIcon className="ch-header__icon" />
          }
          {isDM && otherUserImage && (
            <img src={otherUserImage} alt="" className="ch-header__dm-avatar" />
          )}
          {isDM && !otherUserImage && (
            <div className="ch-header__dm-avatar ch-header__dm-avatar--placeholder">
              {(otherUser?.user?.name || otherUser?.user?.id || "?")[0].toUpperCase()}
            </div>
          )}
          <span className="ch-header__name">
            {isDM ? otherUser?.user?.name || otherUser?.user?.id : channel.data?.name || channel.data?.id}
          </span>
        </button>

        {/* Right: actions */}
        <div className="ch-header__actions">
          <button className="ch-header__btn ch-header__btn--call" onClick={handleVideoCall} title="Start Video Call">
            <VideoIcon className="size-4" />
          </button>

          
          {channel.data?.private && (
            <button className="ch-header__btn ch-header__btn--invite" onClick={() => setShowInvite(true)}>
              Invite
            </button>
          )}
        </div>

        {showMembers && <MembersModal members={Object.values(channel.state.members)} onClose={() => setShowMembers(false)} />}
        {showPinnedMessages && <PinnedMessagesModal pinnedMessages={pinnedMessages} onClose={() => setShowPinnedMessages(false)} />}
        {showInvite && <InviteModal channel={channel} onClose={() => setShowInvite(false)} />}
        {showSettings && <ChannelSettingsModal channel={channel} onClose={() => setShowSettings(false)} />}
      </div>
    </>
  );
};

export default CustomChannelHeader;
