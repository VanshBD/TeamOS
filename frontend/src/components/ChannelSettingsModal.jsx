import { useState, useEffect } from "react";
import { HashIcon, LockIcon, UsersIcon, XIcon, SaveIcon, CopyIcon, CalendarIcon, UserIcon, ShieldIcon, ShareIcon } from "lucide-react";
import { useChannelStateContext } from "stream-chat-react";
import { useUser } from "@clerk/clerk-react";
import toast from "react-hot-toast";

const ChannelSettingsModal = ({ channel, onClose }) => {
  const { user } = useUser();
  const [channelName, setChannelName] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (channel) {
      setChannelName(channel.data?.name || channel.id);
      setDescription(channel.data?.description || "");
    }
  }, [channel]);

  const handleSave = async () => {
    if (!channelName.trim()) {
      toast.error("Channel name is required");
      return;
    }

    setIsSaving(true);
    try {
      await channel.update({
        name: channelName.trim(),
        description: description.trim(),
      });
      toast.success("Channel updated successfully!");
      onClose();
    } catch (error) {
      toast.error("Failed to update channel");
      console.error("Update channel error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleShareLink = async () => {
    const shareableLink = `${window.location.origin}/channel/${channel.id}`;
    try {
      await navigator.clipboard.writeText(shareableLink);
      setLinkCopied(true);
      toast.success("Channel link copied to clipboard!");
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  const isPublicChannel = !channel.data?.private && (channel.data?.visibility === "public" || channel.data?.discoverable === true);
  const memberCount = Object.keys(channel.state.members || {}).length;
  
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
  
  const currentUserRole = channel.state.members[user?.id]?.channel_role || 'member';

  if (!channel) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Channel Details</h2>
              <p className="text-sm text-gray-600 mt-1">Manage channel settings and information</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Channel Overview */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                {channel.data?.private ? (
                  <LockIcon className="w-6 h-6 text-blue-600" />
                ) : (
                  <HashIcon className="w-6 h-6 text-blue-600" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">{channelName}</h3>
                <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                  <span className="flex items-center gap-1">
                    {channel.data?.private ? (
                      <><LockIcon className="w-3 h-3" /> Private</>
                    ) : (
                      <><HashIcon className="w-3 h-3" /> Public</>
                    )}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <UsersIcon className="w-3 h-3" />
                    {memberCount} members
                  </span>
                </div>
              </div>
            </div>
            
            {description && (
              <p className="text-gray-700 text-sm bg-white/50 rounded-lg p-3 border border-blue-200">
                {description}
              </p>
            )}
          </div>

          {/* Channel Settings */}
          {isChannelCreator && (
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <SettingsIcon className="w-5 h-5" />
                  Channel Settings
                </h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Channel Name
                    </label>
                    <input
                      type="text"
                      value={channelName}
                      onChange={(e) => setChannelName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Enter channel name"
                      maxLength={22}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {channelName.length}/22 characters
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all"
                      placeholder="What's this channel about?"
                      rows={4}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Share Channel Link */}
          {isPublicChannel && (
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <ShareIcon className="w-5 h-5" />
                Share Channel
              </h4>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Channel Invite Link
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={`${window.location.origin}/channel/${channel.id}`}
                    readOnly
                    className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-lg text-sm font-mono"
                  />
                  <button
                    onClick={handleShareLink}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                  >
                    <CopyIcon className="w-4 h-4" />
                    {linkCopied ? "Copied!" : "Copy Link"}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Anyone with this link can view and join this public channel
                </p>
              </div>
            </div>
          )}

          {/* Channel Information */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ShieldIcon className="w-5 h-5" />
              Channel Information
            </h4>
            <div className="bg-gray-50 rounded-lg divide-y divide-gray-200 border border-gray-200">
              <div className="flex justify-between items-center p-4">
                <div className="flex items-center gap-3">
                  <HashIcon className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Channel ID</span>
                </div>
                <span className="text-sm font-mono text-gray-900 bg-white px-3 py-1 rounded border border-gray-300">
                  {channel.id}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-4">
                <div className="flex items-center gap-3">
                  {channel.data?.private ? (
                    <LockIcon className="w-4 h-4 text-gray-500" />
                  ) : (
                    <HashIcon className="w-4 h-4 text-gray-500" />
                  )}
                  <span className="text-sm font-medium text-gray-700">Type</span>
                </div>
                <span className="text-sm text-gray-900 bg-white px-3 py-1 rounded border border-gray-300">
                  {channel.data?.private ? "Private" : "Public"}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-4">
                <div className="flex items-center gap-3">
                  <UsersIcon className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Members</span>
                </div>
                <span className="text-sm text-gray-900 bg-white px-3 py-1 rounded border border-gray-300">
                  {memberCount}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-4">
                <div className="flex items-center gap-3">
                  <CalendarIcon className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Created</span>
                </div>
                <span className="text-sm text-gray-900 bg-white px-3 py-1 rounded border border-gray-300">
                  {new Date(channel.data?.created_at || Date.now()).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-4">
                <div className="flex items-center gap-3">
                  <UserIcon className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Your Role</span>
                </div>
                <span className="text-sm text-gray-900 bg-white px-3 py-1 rounded border border-gray-300 capitalize">
                  {currentUserRole}
                </span>
              </div>
              
              {isChannelCreator && (
                <div className="flex justify-between items-center p-4 bg-blue-50">
                  <div className="flex items-center gap-3">
                    <ShieldIcon className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Creator</span>
                  </div>
                  <span className="text-sm text-blue-900 bg-blue-100 px-3 py-1 rounded border border-blue-200">
                    You
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 rounded-b-xl">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Close
            </button>
            {isChannelCreator && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors font-medium"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <SaveIcon className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChannelSettingsModal;
