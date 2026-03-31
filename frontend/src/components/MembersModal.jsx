import { XIcon, UsersIcon } from "lucide-react";

const S = {
  overlay: { position:"fixed",inset:0,zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.75)",backdropFilter:"blur(8px)" },
  modal: { background:"rgba(15,15,26,.97)",border:"1px solid rgba(109,40,217,.2)",borderRadius:20,width:"100%",maxWidth:460,margin:"0 16px",boxShadow:"0 30px 60px rgba(0,0,0,.6),0 0 60px rgba(109,40,217,.1)",backdropFilter:"blur(24px)",overflow:"hidden" },
  header: { display:"flex",alignItems:"center",gap:10,padding:"18px 20px 14px",borderBottom:"1px solid rgba(255,255,255,.06)" },
  closeBtn: { marginLeft:"auto",background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.08)",borderRadius:8,width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"rgba(160,158,192,.7)" },
  list: { padding:"8px 12px 16px",maxHeight:400,overflowY:"auto" },
  item: { display:"flex",alignItems:"center",gap:10,padding:"10px 8px",borderBottom:"1px solid rgba(255,255,255,.04)" },
  avatar: { width:34,height:34,borderRadius:"50%",objectFit:"cover",border:"1.5px solid rgba(109,40,217,.3)",flexShrink:0 },
  avatarFallback: { width:34,height:34,borderRadius:"50%",background:"linear-gradient(135deg,#6d28d9,#9333ea)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:13,fontWeight:700,flexShrink:0 },
  name: { fontSize:13,fontWeight:600,color:"rgba(241,240,255,.85)" },
};

function MembersModal({ members, onClose }) {
  return (
    <div style={S.overlay}>
      <div style={S.modal}>
        <div style={S.header}>
          <UsersIcon style={{ width:16,height:16,color:"#9333ea" }} />
          <h2 style={{ fontSize:16,fontWeight:700,color:"#f1f0ff",margin:0 }}>Channel Members</h2>
          <span style={{ fontSize:11,fontWeight:700,background:"rgba(109,40,217,.25)",color:"#c4b5fd",padding:"2px 8px",borderRadius:999,marginLeft:4 }}>{members.length}</span>
          <button style={S.closeBtn} onClick={onClose}><XIcon style={{ width:14,height:14 }} /></button>
        </div>
        <div style={S.list}>
          {members.map((member) => (
            <div key={member.user.id} style={S.item}>
              {member.user?.image
                ? <img src={member.user.image} alt="" style={S.avatar} />
                : <div style={S.avatarFallback}>{(member.user.name || member.user.id)[0].toUpperCase()}</div>
              }
              <div>
                <div style={S.name}>{member.user.name || member.user.id}</div>
                {member.user.online && <div style={{ fontSize:10,color:"#22c55e",fontWeight:600 }}>● Online</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default MembersModal;
