import { VideoIcon, XIcon, PhoneIcon } from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import { markCallJoinedForUser } from "../lib/callMessages";

const IncomingCallPopup = ({ callerName, callerImage, callId, channelId, onDismiss }) => {
  const { user } = useUser();
  const handleJoin = () => {
    const query = channelId ? `?channel=${encodeURIComponent(channelId)}` : "";
    markCallJoinedForUser(user?.id, callId);
    window.open(`/call/${callId}${query}`, "_blank");
    onDismiss?.("join");
  };

  return (
    <div className="incoming-call-popup">
      <div className="incoming-call-popup__glow" />

      <div className="incoming-call-popup__content">
        <div className="incoming-call-popup__avatar">
          {callerImage ? (
            <img src={callerImage} alt={callerName} className="w-full h-full object-cover rounded-full" />
          ) : (
            <span className="text-white font-bold text-xl">
              {(callerName || "?").charAt(0).toUpperCase()}
            </span>
          )}
          <span className="incoming-call-popup__ring" />
        </div>

        <div className="incoming-call-popup__info">
          <p className="incoming-call-popup__label">Incoming Video Call</p>
          <p className="incoming-call-popup__name">{callerName || "Someone"}</p>
        </div>
      </div>

      <div className="incoming-call-popup__actions">
        <button onClick={() => onDismiss?.("dismiss")} className="incoming-call-btn incoming-call-btn--decline" title="Dismiss">
          <XIcon className="w-5 h-5" />
          <span>Dismiss</span>
        </button>
        <button onClick={handleJoin} className="incoming-call-btn incoming-call-btn--accept" title="Join Call">
          <PhoneIcon className="w-5 h-5" />
          <span>Join</span>
        </button>
      </div>
    </div>
  );
};

export default IncomingCallPopup;
