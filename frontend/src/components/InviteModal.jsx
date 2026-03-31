import { useEffect, useState } from "react";
import { useChatContext } from "stream-chat-react";
import { XIcon, UserPlusIcon } from "lucide-react";
import toast from "react-hot-toast";
import { inviteMembersToChannel } from "../lib/api";

const S = {
  overlay: { position:"fixed",inset:0,zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.75)",backdropFilter:"blur(8px)" },
  modal: { background:"rgba(15,15,26,.97)",border:"1px solid rgba(109,40,217,.2)",borderRadius:20,width:"100%",maxWidth:460,margin:"0 16px",boxShadow:"0 30px 60px rgba(0,0,0,.6),0 0 60px rgba(109,40,217,.1)",backdropFilter:"blur(24px)",overflow:"hidden",maxHeight:"85vh",display:"flex",flexDirection:"column" },
  header: { display:"flex",alignItems:"center",gap:10,padding:"18px 20px 14px",borderBottom:"1px solid rgba(255,255,255,.06)",flexShrink:0 },
  closeBtn: { marginLeft:"auto",background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.08)",borderRadius:8,width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"rgba(160,158,192,.7)" },
  body: { padding:"12px 16px",overflowY:"auto",flex:1 },
  userItem: (checked) => ({ display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:12,border:`1px solid ${checked?"rgba(109,40,217,.5)":"rgba(255,255,255,.06)"}`,background:checked?"rgba(109,40,217,.12)":"rgba(255,255,255,.02)",cursor:"pointer",marginBottom:6,transition:"all .15s" }),
  avatar: { width:34,height:34,borderRadius:"50%",objectFit:"cover",border:"1.5px solid rgba(109,40,217,.3)",flexShrink:0 },
  avatarFallback: { width:34,height:34,borderRadius:"50%",background:"linear-gradient(135deg,#6d28d9,#9333ea)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:13,fontWeight:700,flexShrink:0 },
  footer: { display:"flex",gap:8,padding:"12px 16px 16px",borderTop:"1px solid rgba(255,255,255,.06)",flexShrink:0 },
  btnCancel: { flex:1,padding:"10px",borderRadius:12,border:"1px solid rgba(255,255,255,.1)",background:"rgba(255,255,255,.04)",color:"rgba(160,158,192,.8)",cursor:"pointer",fontSize:13,fontWeight:600 },
  btnInvite: (disabled) => ({ flex:1,padding:"10px",borderRadius:12,border:"none",background:disabled?"rgba(109,40,217,.3)":"linear-gradient(135deg,#6d28d9,#9333ea)",color:disabled?"rgba(255,255,255,.4)":"#fff",cursor:disabled?"not-allowed":"pointer",fontSize:13,fontWeight:700,boxShadow:disabled?"none":"0 4px 14px rgba(109,40,217,.35)" }),
};

const InviteModal = ({ channel, onClose }) => {
  const { client } = useChatContext();
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetch = async () => {
      try {
        const members = Object.keys(channel.state.members);
        const res = await client.queryUsers({ id: { $nin: members } }, { name: 1 }, { limit: 30 });
        setUsers(res.users);
      } catch { setError("Failed to load users"); }
      finally { setLoading(false); }
    };
    fetch();
  }, [channel, client]);

  const toggle = (id) => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const handleInvite = async () => {
    if (!selected.length) return;
    setInviting(true);
    try {
      await inviteMembersToChannel(channel.id, selected);
      toast.success("Users invited!");
      onClose();
    } catch { toast.error("Failed to invite users"); }
    finally { setInviting(false); }
  };

  return (
    <div style={S.overlay}>
      <div style={S.modal}>
        <div style={S.header}>
          <UserPlusIcon style={{ width:16,height:16,color:"#9333ea" }} />
          <h2 style={{ fontSize:16,fontWeight:700,color:"#f1f0ff",margin:0 }}>Invite Members</h2>
          <button style={S.closeBtn} onClick={onClose}><XIcon style={{ width:14,height:14 }} /></button>
        </div>

        <div style={S.body}>
          {loading && <p style={{ color:"rgba(160,158,192,.5)",fontSize:13,textAlign:"center",padding:"20px 0" }}>Loading users…</p>}
          {error && <p style={{ color:"#fca5a5",fontSize:12,marginBottom:8 }}>{error}</p>}
          {!loading && users.length === 0 && <p style={{ color:"rgba(160,158,192,.5)",fontSize:13,textAlign:"center",padding:"20px 0" }}>No users to invite</p>}
          {users.map(user => {
            const checked = selected.includes(user.id);
            return (
              <div key={user.id} style={S.userItem(checked)} onClick={() => toggle(user.id)}>
                <input type="checkbox" checked={checked} onChange={() => toggle(user.id)}
                  style={{ accentColor:"#9333ea",width:15,height:15,flexShrink:0 }} />
                {user.image
                  ? <img src={user.image} alt="" style={S.avatar} />
                  : <div style={S.avatarFallback}>{(user.name||user.id)[0].toUpperCase()}</div>
                }
                <span style={{ fontSize:13,fontWeight:600,color:"rgba(241,240,255,.85)" }}>{user.name||user.id}</span>
              </div>
            );
          })}
        </div>

        <div style={S.footer}>
          <button style={S.btnCancel} onClick={onClose} disabled={inviting}>Cancel</button>
          <button style={S.btnInvite(!selected.length||inviting)} onClick={handleInvite} disabled={!selected.length||inviting}>
            {inviting ? "Inviting…" : `Invite ${selected.length > 0 ? `(${selected.length})` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InviteModal;
