import { useState, useRef, useCallback } from "react";
import { useUser, useClerk, useReverification } from "@clerk/clerk-react";
import { useNavigate } from "react-router";
import {
  ArrowLeftIcon, CameraIcon, UserIcon, MailIcon,
  LockIcon, TrashIcon, CheckIcon, AlertTriangleIcon,
  EyeIcon, EyeOffIcon, Loader2Icon, LogOutIcon,
} from "lucide-react";

/* ─── tiny helpers ─────────────────────────────────────── */
const Card = ({ children, style }) => (
  <div style={{
    background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)",
    borderRadius: 16, padding: "20px 20px", ...style,
  }}>
    {children}
  </div>
);

const SectionTitle = ({ icon: Icon, label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
    <div style={{
      width: 30, height: 30, borderRadius: 9,
      background: "rgba(109,40,217,.18)", border: "1px solid rgba(109,40,217,.3)",
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}>
      <Icon style={{ width: 14, height: 14, color: "#a78bfa" }} />
    </div>
    <span style={{ fontSize: 13, fontWeight: 700, color: "#f1f0ff" }}>{label}</span>
  </div>
);

const Label = ({ children }) => (
  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "rgba(241,240,255,.5)", marginBottom: 6 }}>
    {children}
  </label>
);

const Input = ({ type = "text", value, onChange, placeholder, disabled, right }) => (
  <div style={{ position: "relative" }}>
    <input
      type={type} value={value} onChange={onChange}
      placeholder={placeholder} disabled={disabled}
      style={{
        width: "100%", boxSizing: "border-box",
        background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)",
        borderRadius: 10, padding: right ? "10px 40px 10px 14px" : "10px 14px",
        fontSize: 14, color: "#f1f0ff", outline: "none", fontFamily: "inherit",
        opacity: disabled ? .5 : 1,
        transition: "border-color .18s, box-shadow .18s",
      }}
      onFocus={e => { e.target.style.borderColor = "rgba(109,40,217,.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(109,40,217,.12)"; }}
      onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,.1)"; e.target.style.boxShadow = "none"; }}
    />
    {right && (
      <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }}>
        {right}
      </div>
    )}
  </div>
);

const Btn = ({ onClick, disabled, loading, variant = "primary", children, style: s }) => {
  const base = {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
    padding: "11px 20px", borderRadius: 11, border: "none", cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 13, fontWeight: 700, transition: "all .18s", opacity: disabled ? .6 : 1, ...s,
  };
  const variants = {
    primary: { background: "linear-gradient(135deg,#6d28d9,#9333ea)", color: "#fff" },
    ghost:   { background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", color: "rgba(241,240,255,.8)" },
    danger:  { background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.3)", color: "#f87171" },
    dangerSolid: { background: "linear-gradient(135deg,#dc2626,#ef4444)", color: "#fff" },
  };
  return (
    <button onClick={onClick} disabled={disabled || loading} style={{ ...base, ...variants[variant] }}>
      {loading ? <Loader2Icon style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : children}
    </button>
  );
};

const Msg = ({ text }) => {
  if (!text) return null;
  const ok = text.startsWith("✓");
  return (
    <p style={{ fontSize: 12, marginTop: 8, color: ok ? "#4ade80" : "#f87171", display: "flex", alignItems: "center", gap: 5 }}>
      {ok ? <CheckIcon style={{ width: 12, height: 12 }} /> : <AlertTriangleIcon style={{ width: 12, height: 12 }} />}
      {text.replace("✓ ", "")}
    </p>
  );
};

/* ─── Page ─────────────────────────────────────────────── */
export default function ProfilePage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const fileRef = useRef();

  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName,  setLastName]  = useState(user?.lastName  || "");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMsg,    setNameMsg]   = useState("");

  const [newPw,     setNewPw]     = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showNew,   setShowNew]   = useState(false);
  const [showCon,   setShowCon]   = useState(false);
  const [pwSaving,  setPwSaving]  = useState(false);
  const [pwMsg,     setPwMsg]     = useState("");

  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarMsg,    setAvatarMsg]    = useState("");

  const [deletePhase, setDeletePhase] = useState(0);
  const [deleteMsg,   setDeleteMsg]   = useState("");

  const email = user?.primaryEmailAddress?.emailAddress || "—";
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username || "User";
  const initials = (user?.firstName?.[0] || user?.username?.[0] || "?").toUpperCase();

  // Wrap updatePassword with reverification — Clerk shows a re-auth modal
  // automatically when a fresh session proof is required (403 reverification_required)
  const updatePasswordWithReverification = useReverification(
    useCallback((params) => user?.updatePassword(params), [user])
  );

  /* ── handlers ── */
  const saveName = async () => {
    if (!firstName.trim()) return setNameMsg("First name is required.");
    setNameSaving(true); setNameMsg("");
    try {
      await user.update({ firstName: firstName.trim(), lastName: lastName.trim() });
      setNameMsg("✓ Name updated successfully.");
    } catch (e) { setNameMsg(e?.errors?.[0]?.message || "Failed to update name."); }
    finally { setNameSaving(false); }
  };

  const savePassword = async () => {
    if (!newPw) return setPwMsg("Enter a new password.");
    if (newPw !== confirmPw) return setPwMsg("Passwords don't match.");
    if (newPw.length < 8) return setPwMsg("Password must be at least 8 characters.");
    setPwSaving(true); setPwMsg("");
    try {
      await updatePasswordWithReverification({ newPassword: newPw, signOutOfOtherSessions: true });
      setPwMsg("✓ Password updated successfully.");
      setNewPw(""); setConfirmPw("");
    } catch (e) {
      if (!e) return;
      setPwMsg(e?.errors?.[0]?.longMessage || e?.errors?.[0]?.message || "Failed to update password.");
    } finally {
      setPwSaving(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return setAvatarMsg("Image must be under 5 MB.");
    setAvatarSaving(true); setAvatarMsg("");
    try {
      await user.setProfileImage({ file });
      setAvatarMsg("✓ Photo updated.");
    } catch (err) { setAvatarMsg(err?.errors?.[0]?.message || "Failed to upload photo."); }
    finally { setAvatarSaving(false); }
  };

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

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        html, body, #root { height: 100%; margin: 0; padding: 0; overflow: hidden; }
        .profile-page-scroll::-webkit-scrollbar { width: 4px; }
        .profile-page-scroll::-webkit-scrollbar-thumb { background: rgba(109,40,217,.3); border-radius: 4px; }
      `}</style>

      {/* Full-screen shell */}
      <div style={{
        position: "fixed", inset: 0,
        background: "linear-gradient(135deg, #080810 0%, #0d0820 50%, #080810 100%)",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Ambient glow */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse 60% 40% at 20% 20%, rgba(109,40,217,.08) 0%, transparent 60%), radial-gradient(ellipse 40% 60% at 80% 80%, rgba(37,99,235,.06) 0%, transparent 60%)",
        }} />

        {/* Top bar */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,.06)",
          flexShrink: 0, position: "relative", zIndex: 1,
          background: "rgba(8,8,16,.8)", backdropFilter: "blur(20px)",
        }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 36, height: 36, borderRadius: 10,
              background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)",
              color: "rgba(241,240,255,.7)", cursor: "pointer", flexShrink: 0,
            }}
          >
            <ArrowLeftIcon style={{ width: 16, height: 16 }} />
          </button>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: "#f1f0ff", margin: 0 }}>My Profile</h1>
            <p style={{ fontSize: 11, color: "rgba(160,158,192,.45)", margin: 0 }}>Manage your account settings</p>
          </div>
        </div>

        {/* Scrollable content */}
        <div
          className="profile-page-scroll"
          style={{
            flex: "1 1 0", overflowY: "auto", overflowX: "hidden",
            padding: "24px 16px 40px",
            scrollbarWidth: "thin", scrollbarColor: "rgba(109,40,217,.3) transparent",
            position: "relative", zIndex: 1,
          }}
        >
          <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>

            {/* ── Avatar hero ── */}
            <Card>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                {/* Avatar */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                  {user?.imageUrl
                    ? <img src={user.imageUrl} alt="" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: "2.5px solid rgba(109,40,217,.45)", display: "block" }} />
                    : <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg,#6d28d9,#9333ea)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 800, color: "#fff" }}>
                        {initials}
                      </div>
                  }
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={avatarSaving}
                    style={{
                      position: "absolute", bottom: 0, right: 0,
                      width: 26, height: 26, borderRadius: "50%",
                      background: "linear-gradient(135deg,#6d28d9,#9333ea)",
                      border: "2px solid #080810",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    {avatarSaving
                      ? <Loader2Icon style={{ width: 11, height: 11, color: "#fff", animation: "spin 1s linear infinite" }} />
                      : <CameraIcon style={{ width: 11, height: 11, color: "#fff" }} />
                    }
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 18, fontWeight: 800, color: "#f1f0ff", margin: "0 0 3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {displayName}
                  </p>
                  <p style={{ fontSize: 13, color: "rgba(160,158,192,.55)", margin: "0 0 12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {email}
                  </p>
                  <Btn variant="ghost" onClick={() => fileRef.current?.click()} disabled={avatarSaving} style={{ padding: "7px 14px", fontSize: 12 }}>
                    <CameraIcon style={{ width: 12, height: 12 }} />
                    {avatarSaving ? "Uploading…" : "Change Photo"}
                  </Btn>
                </div>
              </div>
              <Msg text={avatarMsg} />
            </Card>

            {/* ── Display name ── */}
            <Card>
              <SectionTitle icon={UserIcon} label="Display Name" />
              <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <Label>First Name</Label>
                  <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" />
                </div>
                <div style={{ flex: 1 }}>
                  <Label>Last Name</Label>
                  <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" />
                </div>
              </div>
              <Btn onClick={saveName} loading={nameSaving} disabled={nameSaving}>
                <CheckIcon style={{ width: 13, height: 13 }} />
                Save Name
              </Btn>
              <Msg text={nameMsg} />
            </Card>

            {/* ── Email ── */}
            <Card>
              <SectionTitle icon={MailIcon} label="Email Address" />
              <Input value={email} disabled />
              <p style={{ fontSize: 11, color: "rgba(160,158,192,.35)", marginTop: 8 }}>
                Email is managed by your account provider.
              </p>
            </Card>

            {/* ── Password ── */}
            <Card>
              <SectionTitle icon={LockIcon} label="Change Password" />
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 14 }}>
                <div>
                  <Label>New Password</Label>
                  <Input
                    type={showNew ? "text" : "password"}
                    value={newPw} onChange={e => setNewPw(e.target.value)}
                    placeholder="Min. 8 characters"
                    right={
                      <button onClick={() => setShowNew(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(160,158,192,.5)", display: "flex" }}>
                        {showNew ? <EyeOffIcon style={{ width: 14, height: 14 }} /> : <EyeIcon style={{ width: 14, height: 14 }} />}
                      </button>
                    }
                  />
                </div>
                <div>
                  <Label>Confirm New Password</Label>
                  <Input
                    type={showCon ? "text" : "password"}
                    value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                    placeholder="Repeat new password"
                    right={
                      <button onClick={() => setShowCon(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(160,158,192,.5)", display: "flex" }}>
                        {showCon ? <EyeOffIcon style={{ width: 14, height: 14 }} /> : <EyeIcon style={{ width: 14, height: 14 }} />}
                      </button>
                    }
                  />
                </div>
              </div>
              <Btn onClick={savePassword} loading={pwSaving} disabled={pwSaving}>
                <LockIcon style={{ width: 13, height: 13 }} />
                Update Password
              </Btn>
              <Msg text={pwMsg} />
            </Card>

            {/* ── Sign out ── */}
            <Card>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#f1f0ff", margin: "0 0 3px" }}>Sign Out</p>
                  <p style={{ fontSize: 12, color: "rgba(160,158,192,.45)", margin: 0 }}>Sign out of your account on this device</p>
                </div>
                <Btn variant="ghost" onClick={() => signOut()} style={{ padding: "9px 16px", gap: 7, flexShrink: 0 }}>
                  <LogOutIcon style={{ width: 14, height: 14 }} />
                  Sign Out
                </Btn>
              </div>
            </Card>

            {/* ── Danger zone ── */}
            <Card style={{ border: "1px solid rgba(239,68,68,.2)", background: "rgba(239,68,68,.04)" }}>
              <SectionTitle icon={TrashIcon} label="Danger Zone" />
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 16 }}>
                <AlertTriangleIcon style={{ width: 16, height: 16, color: "#f87171", flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 13, color: "rgba(252,165,165,.7)", margin: 0, lineHeight: 1.6 }}>
                  Deleting your account is permanent and cannot be undone. All your data will be removed.
                </p>
              </div>

              {deletePhase === 0 && (
                <Btn variant="danger" onClick={() => setDeletePhase(1)}>
                  <TrashIcon style={{ width: 13, height: 13 }} />
                  Delete My Account
                </Btn>
              )}

              {deletePhase === 1 && (
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#fca5a5", marginBottom: 12 }}>
                    Are you absolutely sure? This cannot be undone.
                  </p>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <Btn variant="dangerSolid" onClick={deleteAccount} style={{ flex: 1, minWidth: 140 }}>
                      <TrashIcon style={{ width: 13, height: 13 }} />
                      Yes, Delete Forever
                    </Btn>
                    <Btn variant="ghost" onClick={() => setDeletePhase(0)} style={{ flex: 1, minWidth: 100 }}>
                      Cancel
                    </Btn>
                  </div>
                  <Msg text={deleteMsg} />
                </div>
              )}

              {deletePhase === 2 && (
                <p style={{ fontSize: 13, color: "#fca5a5", display: "flex", alignItems: "center", gap: 8 }}>
                  <Loader2Icon style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
                  Deleting account…
                </p>
              )}
            </Card>

          </div>
        </div>
      </div>
    </>
  );
}
