import { useState, useRef } from "react";
import { useUser, useClerk } from "@clerk/clerk-react";
import { XIcon, CameraIcon, UserIcon, MailIcon, LockIcon, TrashIcon, CheckIcon, AlertTriangleIcon } from "lucide-react";

const Section = ({ icon: Icon, title, children }) => (
  <div style={{ marginBottom: 24 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <Icon style={{ width: 14, height: 14, color: "#a78bfa" }} />
      <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".1em", color: "rgba(160,158,192,.5)" }}>
        {title}
      </span>
    </div>
    {children}
  </div>
);

const Field = ({ label, children }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "rgba(241,240,255,.6)", marginBottom: 6 }}>
      {label}
    </label>
    {children}
  </div>
);

const inputStyle = {
  width: "100%", boxSizing: "border-box",
  background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)",
  borderRadius: 10, padding: "10px 14px", fontSize: 14,
  color: "#f1f0ff", outline: "none", fontFamily: "inherit",
};

const btnPrimary = {
  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
  padding: "10px 20px", borderRadius: 10, border: "none", cursor: "pointer",
  background: "linear-gradient(135deg,#6d28d9,#9333ea)", color: "#fff",
  fontSize: 13, fontWeight: 700, transition: "all .18s",
};

const btnGhost = {
  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
  padding: "10px 20px", borderRadius: 10, cursor: "pointer",
  background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)",
  color: "rgba(241,240,255,.7)", fontSize: 13, fontWeight: 600, transition: "all .18s",
};

export default function ProfileModal({ onClose }) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const fileRef = useRef();

  // Name
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName]   = useState(user?.lastName  || "");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMsg, setNameMsg] = useState("");

  // Password
  const [currentPw, setCurrentPw]   = useState("");
  const [newPw, setNewPw]           = useState("");
  const [confirmPw, setConfirmPw]   = useState("");
  const [pwSaving, setPwSaving]     = useState(false);
  const [pwMsg, setPwMsg]           = useState("");

  // Avatar
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarMsg, setAvatarMsg]       = useState("");

  // Delete
  const [deletePhase, setDeletePhase] = useState(0); // 0=idle 1=confirm 2=deleting
  const [deleteMsg, setDeleteMsg]     = useState("");

  // ── Save name ──────────────────────────────────────────
  const saveName = async () => {
    if (!firstName.trim()) return setNameMsg("First name is required.");
    setNameSaving(true); setNameMsg("");
    try {
      await user.update({ firstName: firstName.trim(), lastName: lastName.trim() });
      setNameMsg("✓ Name updated.");
    } catch (e) {
      setNameMsg(e?.errors?.[0]?.message || "Failed to update name.");
    } finally { setNameSaving(false); }
  };

  // ── Save password ──────────────────────────────────────
  const savePassword = async () => {
    if (!newPw) return setPwMsg("Enter a new password.");
    if (newPw !== confirmPw) return setPwMsg("Passwords don't match.");
    if (newPw.length < 8) return setPwMsg("Password must be at least 8 characters.");
    setPwSaving(true); setPwMsg("");
    try {
      await user.updatePassword({ currentPassword: currentPw, newPassword: newPw });
      setPwMsg("✓ Password updated.");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (e) {
      setPwMsg(e?.errors?.[0]?.message || "Failed to update password.");
    } finally { setPwSaving(false); }
  };

  // ── Upload avatar ──────────────────────────────────────
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return setAvatarMsg("Image must be under 5 MB.");
    setAvatarSaving(true); setAvatarMsg("");
    try {
      await user.setProfileImage({ file });
      setAvatarMsg("✓ Photo updated.");
    } catch (err) {
      setAvatarMsg(err?.errors?.[0]?.message || "Failed to upload photo.");
    } finally { setAvatarSaving(false); }
  };

  // ── Delete account ─────────────────────────────────────
  const deleteAccount = async () => {
    setDeletePhase(2); setDeleteMsg("");
    try {
      await user.delete();
      await signOut();
    } catch (e) {
      setDeleteMsg(e?.errors?.[0]?.message || "Failed to delete account.");
      setDeletePhase(1);
    }
  };

  const email = user?.primaryEmailAddress?.emailAddress || "—";
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username || "—";

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, background: "rgba(0,0,0,.75)", backdropFilter: "blur(6px)",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "rgba(14,14,26,.98)", border: "1px solid rgba(109,40,217,.22)",
          borderRadius: 20, width: "100%", maxWidth: 460,
          maxHeight: "calc(100vh - 60px)", display: "flex", flexDirection: "column",
          boxShadow: "0 32px 64px rgba(0,0,0,.7), 0 0 60px rgba(109,40,217,.1)",
          overflow: "hidden",
          animation: "profileModalIn .22s cubic-bezier(.34,1.56,.64,1)",
        }}
      >
        <style>{`
          @keyframes profileModalIn {
            from { opacity:0; transform:scale(.94) translateY(12px); }
            to   { opacity:1; transform:scale(1) translateY(0); }
          }
          .pm-input:focus { border-color: rgba(109,40,217,.5) !important; box-shadow: 0 0 0 3px rgba(109,40,217,.12) !important; }
          .pm-btn-primary:hover { opacity:.88; transform:translateY(-1px); }
          .pm-btn-ghost:hover { background: rgba(255,255,255,.1) !important; color: #f1f0ff !important; }
        `}</style>

        {/* ── Header ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 20px 14px", borderBottom: "1px solid rgba(255,255,255,.06)", flexShrink: 0,
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#f1f0ff", margin: 0 }}>My Profile</h2>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.08)",
            borderRadius: 8, width: 30, height: 30, display: "flex", alignItems: "center",
            justifyContent: "center", cursor: "pointer", color: "rgba(160,158,192,.7)",
          }}>
            <XIcon style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div style={{ flex: "1 1 0", overflowY: "auto", padding: "20px 20px 8px", scrollbarWidth: "none" }}>

          {/* Avatar */}
          <Section icon={CameraIcon} title="Profile Photo">
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                {user?.imageUrl
                  ? <img src={user.imageUrl} alt="" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(109,40,217,.4)" }} />
                  : <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg,#6d28d9,#9333ea)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700, color: "#fff" }}>
                      {(user?.firstName || user?.username || "?")[0].toUpperCase()}
                    </div>
                }
                <button
                  onClick={() => fileRef.current?.click()}
                  style={{
                    position: "absolute", bottom: 0, right: 0,
                    width: 24, height: 24, borderRadius: "50%",
                    background: "linear-gradient(135deg,#6d28d9,#9333ea)",
                    border: "2px solid rgba(14,14,26,1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <CameraIcon style={{ width: 11, height: 11, color: "#fff" }} />
                </button>
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#f1f0ff", margin: "0 0 2px" }}>{displayName}</p>
                <p style={{ fontSize: 12, color: "rgba(160,158,192,.5)", margin: "0 0 10px" }}>{email}</p>
                <button
                  className="pm-btn-ghost"
                  style={btnGhost}
                  onClick={() => fileRef.current?.click()}
                  disabled={avatarSaving}
                >
                  <CameraIcon style={{ width: 13, height: 13 }} />
                  {avatarSaving ? "Uploading…" : "Change Photo"}
                </button>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />
                {avatarMsg && <p style={{ fontSize: 12, marginTop: 6, color: avatarMsg.startsWith("✓") ? "#4ade80" : "#f87171" }}>{avatarMsg}</p>}
              </div>
            </div>
          </Section>

          {/* Name */}
          <Section icon={UserIcon} title="Display Name">
            <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <Field label="First Name">
                  <input
                    className="pm-input"
                    style={inputStyle}
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="First name"
                  />
                </Field>
              </div>
              <div style={{ flex: 1 }}>
                <Field label="Last Name">
                  <input
                    className="pm-input"
                    style={inputStyle}
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="Last name"
                  />
                </Field>
              </div>
            </div>
            <button className="pm-btn-primary" style={btnPrimary} onClick={saveName} disabled={nameSaving}>
              <CheckIcon style={{ width: 13, height: 13 }} />
              {nameSaving ? "Saving…" : "Save Name"}
            </button>
            {nameMsg && <p style={{ fontSize: 12, marginTop: 8, color: nameMsg.startsWith("✓") ? "#4ade80" : "#f87171" }}>{nameMsg}</p>}
          </Section>

          {/* Email — read only (managed by Clerk) */}
          <Section icon={MailIcon} title="Email Address">
            <div style={{ ...inputStyle, color: "rgba(160,158,192,.5)", cursor: "default", userSelect: "all" }}>
              {email}
            </div>
            <p style={{ fontSize: 11, color: "rgba(160,158,192,.35)", marginTop: 6 }}>
              Email is managed by your account provider and cannot be changed here.
            </p>
          </Section>

          {/* Password */}
          <Section icon={LockIcon} title="Change Password">
            <Field label="Current Password">
              <input className="pm-input" style={inputStyle} type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="Current password" />
            </Field>
            <Field label="New Password">
              <input className="pm-input" style={inputStyle} type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Min. 8 characters" />
            </Field>
            <Field label="Confirm New Password">
              <input className="pm-input" style={inputStyle} type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Repeat new password" />
            </Field>
            <button className="pm-btn-primary" style={btnPrimary} onClick={savePassword} disabled={pwSaving}>
              <LockIcon style={{ width: 13, height: 13 }} />
              {pwSaving ? "Updating…" : "Update Password"}
            </button>
            {pwMsg && <p style={{ fontSize: 12, marginTop: 8, color: pwMsg.startsWith("✓") ? "#4ade80" : "#f87171" }}>{pwMsg}</p>}
          </Section>

          {/* Delete account */}
          <Section icon={TrashIcon} title="Danger Zone">
            <div style={{
              background: "rgba(239,68,68,.06)", border: "1px solid rgba(239,68,68,.18)",
              borderRadius: 12, padding: "14px 16px",
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
                <AlertTriangleIcon style={{ width: 16, height: 16, color: "#f87171", flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#fca5a5", margin: "0 0 3px" }}>Delete Account</p>
                  <p style={{ fontSize: 12, color: "rgba(252,165,165,.6)", margin: 0, lineHeight: 1.5 }}>
                    This permanently deletes your account and all associated data. This action cannot be undone.
                  </p>
                </div>
              </div>

              {deletePhase === 0 && (
                <button
                  onClick={() => setDeletePhase(1)}
                  style={{
                    ...btnGhost, color: "#f87171", borderColor: "rgba(239,68,68,.3)",
                    background: "rgba(239,68,68,.08)",
                  }}
                >
                  <TrashIcon style={{ width: 13, height: 13 }} />
                  Delete My Account
                </button>
              )}

              {deletePhase === 1 && (
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#fca5a5", marginBottom: 10 }}>
                    Are you absolutely sure? This cannot be undone.
                  </p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={deleteAccount}
                      style={{ ...btnPrimary, background: "linear-gradient(135deg,#dc2626,#ef4444)", flex: 1 }}
                    >
                      <TrashIcon style={{ width: 13, height: 13 }} />
                      Yes, Delete Forever
                    </button>
                    <button className="pm-btn-ghost" style={btnGhost} onClick={() => setDeletePhase(0)}>
                      Cancel
                    </button>
                  </div>
                  {deleteMsg && <p style={{ fontSize: 12, marginTop: 8, color: "#f87171" }}>{deleteMsg}</p>}
                </div>
              )}

              {deletePhase === 2 && (
                <p style={{ fontSize: 13, color: "#fca5a5" }}>Deleting account…</p>
              )}
            </div>
          </Section>

          <div style={{ height: 12 }} />
        </div>
      </div>
    </div>
  );
}
