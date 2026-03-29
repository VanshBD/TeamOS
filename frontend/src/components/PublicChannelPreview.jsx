import { useState } from "react";
import { HashIcon, UsersIcon, CalendarIcon, MessageCircleIcon, UserIcon } from "lucide-react";
import { joinPublicChannel } from "../lib/api";

const PublicChannelPreview = ({ channelData, onJoin, loading }) => {
  if (!channelData) return null;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="mt-4 bg-white/5 rounded-lg border border-white/10 overflow-hidden">
      {/* Channel Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <HashIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">{channelData.name}</h3>
              {channelData.description && (
                <p className="text-sm text-gray-400 mt-1">{channelData.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-1">
              <UsersIcon className="w-4 h-4" />
              <span>{channelData.memberCount} members</span>
            </div>
            {channelData.isMember && (
              <div className="px-2 py-1 bg-green-600/20 text-green-400 rounded text-xs">
                Member
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages Preview */}
      <div className="max-h-96 overflow-y-auto">
        {channelData.messages && channelData.messages.length > 0 ? (
          <div className="divide-y divide-white/5">
            {channelData.messages.map((message) => (
              <div key={message.id} className="p-4 hover:bg-white/5 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                    {message.user?.image ? (
                      <img 
                        src={message.user.image} 
                        alt={message.user.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <UserIcon className="w-4 h-4 text-gray-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-white text-sm">
                        {message.user?.name || 'Unknown User'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(message.created_at)}
                      </span>
                    </div>
                    <div className="text-gray-300 text-sm break-words">
                      {message.text}
                    </div>
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {message.attachments.map((attachment, index) => (
                          <div key={index} className="text-xs text-blue-400">
                            📎 {attachment.title || attachment.filename || 'Attachment'}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <MessageCircleIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No messages yet</p>
            <p className="text-sm mt-1">Be the first to join and start the conversation!</p>
          </div>
        )}
      </div>

      {/* Join Button */}
      {!channelData.isMember && (
        <div className="p-4 border-t border-white/10 bg-black/20">
          <button
            onClick={onJoin}
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Joining...
              </>
            ) : (
              <>
                <UsersIcon className="w-4 h-4" />
                Join Channel
              </>
            )}
          </button>
          <p className="text-xs text-gray-400 text-center mt-2">
            Join to participate in the conversation
          </p>
        </div>
      )}
    </div>
  );
};

export default PublicChannelPreview;
