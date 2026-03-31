import { useState, useEffect } from "react";
import { HashIcon, LockIcon, UsersIcon, XIcon, SaveIcon, CopyIcon, CalendarIcon, UserIcon, ShieldIcon, ShareIcon, SettingsIcon } from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import toast from "react-hot-toast";

const ds = {
  overlay: { position:"fixed",inset:0,background:"rgba(0,0,0,.75)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50,padding:16 },
  modal: { background:"rgba(15,15,26,.97)",border:"1px solid rgba(109,40,217,.2)",borderRadius:20,width:"100%",maxWidth:560,maxHeight:"88vh",overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:"0 30px 60px rgba(0,0,0,.6),0 0 60px rgba(109,40,217,.1)",backdropFilter:"blur(24px)" },
  header: { display:"flex",alignItems:"flex-start",justifyContent:"space-between",padding:"20px 22px 16px",borderBottom:"1px solid rgba(255,255,255,.06)",flexShrink:0 },
  closeBtn: { background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.08)",borderRadius:8,width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"rgba(160,158,192,.7)",flexShrink:0 },
  body: { padding:"16px 22px",overflowY:"auto",flex:1,display:"flex",flexDirection:"column",gap:20 },
  section: { background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.06)",borderRadius:14,overflow:"hidden" },
  sectionHeader: { padding:"12px 16px",borderBottom:"1px solid rgba(255,255,255,.05)",display:"flex",alignItems:"center",gap:8,fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:".08em",color:"rgba(160,158,192,.6)" },
  row: { display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",borderBottom:"1px solid rgba(255,255,255,.04)" },
  rowLabel: { display:"flex",alignItems:"center",gap:8,fontSize:13,color:"rgba(160,158,192,.8)" },
  rowValue: { fontSize:12,fontWeight:600,color:"rgba(241,240,255,.7)",background:"rgba(255,255,255,.06)",padding:"3px 10px",borderRadius:6,border:"1px solid rgba(255,255,255,.08)" },
  input: { width:"100%",padding:"10px 12px",background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",borderRadius:10,color:"#f1f0ff",fontSize:13,outline:"none",fontFamily:"inherit" },
  textarea: { width:"100%",padding:"10px 12px",background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",borderRadius:10,color:"#f1f0ff",fontSize:13,outline:"none",fontFamily:"inherit",resize:"vertical",minHeight:80 },
  label: { fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",color:"rgba(160,158,192,.5)",marginBottom:6,display:"block" },
  footer: { padding:"14px 22px 18px",borderTop:"1px solid rgba(255,255,255,.06)",display:"flex",gap:8,flexShrink:0 },
  btnClose: { flex:1,padding:"10px",borderRadius:12,border:"1px solid rgba(255,255,255,.1)",background:"rgba(255,255,255,.04)",color:"rgba(160,158,192,.8)",cursor:"pointer",fontSize:13,fontWeight:600 },
  btnSave: (dis) => ({ flex:1,padding:"10px",borderRadius:12,border:"none",background:dis?"rgba(109,40,217,.3)":"linear-gradient(135deg,#6d28d9,#9333ea)",color:dis?"rgba(255,255,255,.4)":"#fff",cursor:dis?"not-allowed":"pointer",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:6,boxShadow:dis?"none":"0 4px 14px rgba(109,40,217,.35)" }),
};

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
    if (!channelName.trim()) { toast.error("Channel name is required"); return; }
    setIsSaving(true);
    try {
      await channel.update({ name: channelName.trim(), description: description.trim() });
      toast.success("Channel updated!");
      onClose();
    } catch { toast.error("Failed to update channel"); }
    finally { setIsSaving(false); }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/channel/${channel.id}`);
      setLinkCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setLinkCopied(false), 2000);
    } catch { toast.error("Failed to copy"); }
  };

  const isPublic = !channel.data?.private && (channel.data?.visibility === "public" || channel.data?.discoverable === true);
  const memberCount = Object.keys(channel.state.members || {}).length;
  const isCreator = channel.data?.created_by_id === user?.id || channel.data?.created_by?.id === user?.id || ["admin","owner"].includes(channel.state.members[user?.id]?.channel_role);
  const role = channel.state.members[user?.id]?.channel_role || "member";

  if (!channel) return null;

  return (
    <div style={ds.overlay}>
      <div style={ds.modal}>
        {/* Header */}
        <div style={ds.header}>
          <div>
            <h2 style={{ fontSize:16,fontWeight:700,color:"#f1f0ff",margin:"0 0 3px" }}>Channel Details</h2>
            <p style={{ fontSize:12,color:"rgba(160,158,192,.5)",margin:0 }}>Manage settings and information</p>
          </div>
          <button style={ds.closeBtn} onClick={onClose}><XIcon style={{ width:14,height:14 }} /></button>
        </div>

        <div style={ds.body}>
          {/* Overview */}
          <div style={{ ...ds.section, background:"rgba(109,40,217,.06)",border:"1px solid rgba(109,40,217,.15)" }}>
            <div style={{ padding:"14px 16px",display:"flex",alignItems:"center",gap:12 }}>
              <div style={{ width:40,height:40,borderRadius:12,background:"rgba(109,40,217,.2)",display:"flex",alignItems:"center",justifyContent:"center",border:"1px solid rgba(109,40,217,.3)" }}>
                {channel.data?.private ? <LockIcon style={{ width:18,height:18,color:"#c4b5fd" }} /> : <HashIcon style={{ width:18,height:18,color:"#c4b5fd" }} />}
              </div>
              <div>
                <div style={{ fontSize:15,fontWeight:700,color:"#f1f0ff" }}>{channelName}</div>
                <div style={{ fontSize:11,color:"rgba(160,158,192,.6)",marginTop:2 }}>
                  {channel.data?.private ? "Private" : "Public"} · {memberCount} members
                </div>
              </div>
            </div>
          </div>

          {/* Edit (creator only) */}
          {isCreator && (
            <div style={ds.section}>
              <div style={ds.sectionHeader}><SettingsIcon style={{ width:12,height:12 }} /> Settings</div>
              <div style={{ padding:"14px 16px",display:"flex",flexDirection:"column",gap:12 }}>
                <div>
                  <label style={ds.label}>Channel Name</label>
                  <input style={ds.input} value={channelName} onChange={e => setChannelName(e.target.value)} maxLength={22}
                    onFocus={e => e.target.style.borderColor="rgba(109,40,217,.5)"}
                    onBlur={e => e.target.style.borderColor="rgba(255,255,255,.1)"} />
                </div>
                <div>
                  <label style={ds.label}>Description</label>
                  <textarea style={ds.textarea} value={description} onChange={e => setDescription(e.target.value)} placeholder="What's this channel about?"
                    onFocus={e => e.target.style.borderColor="rgba(109,40,217,.5)"}
                    onBlur={e => e.target.style.borderColor="rgba(255,255,255,.1)"} />
                </div>
              </div>
            </div>
          )}

          {/* Share link */}
          {isPublic && (
            <div style={ds.section}>
              <div style={ds.sectionHeader}><ShareIcon style={{ width:12,height:12 }} /> Share</div>
              <div style={{ padding:"14px 16px",display:"flex",gap:8 }}>
                <input style={{ ...ds.input,flex:1,fontFamily:"monospace",fontSize:11 }} readOnly value={`${window.location.origin}/channel/${channel.id}`} />
                <button onClick={handleCopyLink} style={{ padding:"10px 14px",borderRadius:10,border:"none",background:linkCopied?"rgba(34,197,94,.2)":"rgba(109,40,217,.2)",color:linkCopied?"#4ade80":"#c4b5fd",cursor:"pointer",fontSize:12,fontWeight:600,whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:5 }}>
                  <CopyIcon style={{ width:13,height:13 }} />{linkCopied?"Copied!":"Copy"}
                </button>
              </div>
            </div>
          )}

          {/* Info */}
          <div style={ds.section}>
            <div style={ds.sectionHeader}><ShieldIcon style={{ width:12,height:12 }} /> Information</div>
            {[
              { icon:<HashIcon style={{ width:13,height:13 }} />, label:"Channel ID", value:channel.id },
              { icon:<UsersIcon style={{ width:13,height:13 }} />, label:"Members", value:memberCount },
              { icon:<CalendarIcon style={{ width:13,height:13 }} />, label:"Created", value:new Date(channel.data?.created_at||Date.now()).toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"}) },
              { icon:<UserIcon style={{ width:13,height:13 }} />, label:"Your Role", value:role },
            ].map((row,i) => (
              <div key={i} style={{ ...ds.row, borderBottom: i < 3 ? "1px solid rgba(255,255,255,.04)" : "none" }}>
                <div style={ds.rowLabel}>{row.icon}{row.label}</div>
                <div style={ds.rowValue}>{row.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={ds.footer}>
          <button style={ds.btnClose} onClick={onClose}>Close</button>
          {isCreator && (
            <button style={ds.btnSave(isSaving)} onClick={handleSave} disabled={isSaving}>
              {isSaving ? <><div style={{ width:14,height:14,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .7s linear infinite" }} />Saving…</> : <><SaveIcon style={{ width:14,height:14 }} />Save Changes</>}
            </button>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  );
};

export default ChannelSettingsModal;
