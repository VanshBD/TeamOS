import { PhoneIcon, XIcon, VideoIcon } from "lucide-react";
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
    <div style={{
      position:"fixed", top:20, right:20, zIndex:9999,
      width:300,
      background:"rgba(15,15,26,.97)",
      border:"1px solid rgba(109,40,217,.35)",
      borderRadius:20,
      padding:18,
      boxShadow:"0 20px 60px rgba(0,0,0,.6),0 0 40px rgba(109,40,217,.2),0 0 80px rgba(37,99,235,.1)",
      backdropFilter:"blur(24px)",
      animation:"callPopIn .4s cubic-bezier(.34,1.56,.64,1)",
      overflow:"hidden",
    }}>
      {/* Ambient glow */}
      <div style={{ position:"absolute",top:-40,right:-40,width:120,height:120,borderRadius:"50%",background:"radial-gradient(circle,rgba(109,40,217,.35) 0%,transparent 70%)",pointerEvents:"none",animation:"glowPulse 2s ease-in-out infinite" }} />

      {/* Content */}
      <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:16,position:"relative",zIndex:1 }}>
        {/* Avatar with pulse ring */}
        <div style={{ position:"relative",flexShrink:0 }}>
          <div style={{ width:48,height:48,borderRadius:"50%",overflow:"hidden",border:"2px solid rgba(109,40,217,.5)",boxShadow:"0 0 16px rgba(109,40,217,.4)" }}>
            {callerImage
              ? <img src={callerImage} alt={callerName} style={{ width:"100%",height:"100%",objectFit:"cover" }} />
              : <div style={{ width:"100%",height:"100%",background:"linear-gradient(135deg,#6d28d9,#9333ea)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:18,fontWeight:700 }}>
                  {(callerName||"?")[0].toUpperCase()}
                </div>
            }
          </div>
          {/* Pulse ring */}
          <div style={{ position:"absolute",inset:-5,borderRadius:"50%",border:"2px solid rgba(109,40,217,.5)",animation:"ringPulse 1.5s ease-out infinite" }} />
        </div>

        <div>
          <p style={{ fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".08em",color:"rgba(160,158,192,.5)",margin:"0 0 3px" }}>Incoming Video Call</p>
          <p style={{ fontSize:15,fontWeight:700,color:"#f1f0ff",margin:0 }}>{callerName||"Someone"}</p>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display:"flex",gap:8,position:"relative",zIndex:1 }}>
        <button
          onClick={() => onDismiss?.("dismiss")}
          style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"10px",borderRadius:12,border:"1px solid rgba(255,255,255,.1)",background:"rgba(255,255,255,.06)",color:"rgba(160,158,192,.8)",cursor:"pointer",fontSize:13,fontWeight:600,transition:"all .15s" }}
          onMouseEnter={e => { e.currentTarget.style.background="rgba(239,68,68,.15)"; e.currentTarget.style.color="#fca5a5"; }}
          onMouseLeave={e => { e.currentTarget.style.background="rgba(255,255,255,.06)"; e.currentTarget.style.color="rgba(160,158,192,.8)"; }}
        >
          <XIcon style={{ width:16,height:16 }} />
          Dismiss
        </button>
        <button
          onClick={handleJoin}
          style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"10px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#16a34a,#15803d)",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700,boxShadow:"0 4px 14px rgba(22,163,74,.4)",transition:"all .15s" }}
          onMouseEnter={e => { e.currentTarget.style.transform="translateY(-1px)"; e.currentTarget.style.boxShadow="0 6px 20px rgba(22,163,74,.5)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 4px 14px rgba(22,163,74,.4)"; }}
        >
          <PhoneIcon style={{ width:16,height:16 }} />
          Join
        </button>
      </div>

      <style>{`
        @keyframes callPopIn { from { opacity:0; transform:translateX(120%) scale(.8); } to { opacity:1; transform:translateX(0) scale(1); } }
        @keyframes ringPulse { 0% { transform:scale(1); opacity:.8; } 100% { transform:scale(1.6); opacity:0; } }
        @keyframes glowPulse { 0%,100% { opacity:.6; transform:scale(1); } 50% { opacity:1; transform:scale(1.2); } }
      `}</style>
    </div>
  );
};

export default IncomingCallPopup;
