import { XIcon, PinIcon } from "lucide-react";
import { useEffect } from "react";

function PinnedMessagesModal({ pinnedMessages, onClose }) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        background: "rgba(0,0,0,.72)",
        backdropFilter: "blur(6px)",
      }}
    >
      {/* Modal panel — stop propagation so clicking inside doesn't close */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "rgba(18,18,34,.98)",
          border: "1px solid rgba(109,40,217,.22)",
          borderRadius: 18,
          width: "100%",
          maxWidth: 480,
          maxHeight: "calc(100vh - 80px)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 32px 64px rgba(0,0,0,.7), 0 0 60px rgba(109,40,217,.1)",
          overflow: "hidden",
          animation: "pmModalIn .22s cubic-bezier(.34,1.56,.64,1)",
        }}
      >
        <style>{`
          @keyframes pmModalIn {
            from { opacity: 0; transform: scale(.94) translateY(10px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>

        {/* ── Header ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 18px 14px",
          borderBottom: "1px solid rgba(255,255,255,.06)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: "rgba(109,40,217,.18)",
              border: "1px solid rgba(109,40,217,.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <PinIcon style={{ width: 15, height: 15, color: "#a78bfa", transform: "rotate(45deg)" }} />
            </div>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "#f1f0ff", margin: 0, lineHeight: 1.2 }}>
                Pinned Messages
              </h2>
              {pinnedMessages.length > 0 && (
                <p style={{ fontSize: 11, color: "rgba(160,158,192,.5)", margin: 0 }}>
                  {pinnedMessages.length} pinned
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.08)",
              borderRadius: 8, width: 30, height: 30,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "rgba(160,158,192,.7)", flexShrink: 0,
            }}
          >
            <XIcon style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {/* ── Message list ── */}
        <div style={{
          flex: "1 1 0", overflowY: "auto", overflowX: "hidden",
          padding: "8px 0 8px",
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(109,40,217,.3) transparent",
        }}>
          {pinnedMessages.length === 0 ? (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", padding: "48px 24px", gap: 12,
            }}>
              <div style={{ fontSize: 36, opacity: .4 }}>📌</div>
              <p style={{ fontSize: 14, color: "rgba(160,158,192,.45)", margin: 0, textAlign: "center" }}>
                No pinned messages yet
              </p>
            </div>
          ) : (
            pinnedMessages.map((msg, i) => (
              <div
                key={msg.id}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 12,
                  padding: "12px 18px",
                  borderBottom: i < pinnedMessages.length - 1
                    ? "1px solid rgba(255,255,255,.04)" : "none",
                  transition: "background .15s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(109,40,217,.06)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                {/* Avatar */}
                {msg.user?.image
                  ? <img src={msg.user.image} alt="" style={{
                      width: 34, height: 34, borderRadius: "50%", objectFit: "cover",
                      border: "1.5px solid rgba(109,40,217,.3)", flexShrink: 0,
                    }} />
                  : <div style={{
                      width: 34, height: 34, borderRadius: "50%",
                      background: "linear-gradient(135deg,#6d28d9,#9333ea)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontSize: 13, fontWeight: 700, flexShrink: 0,
                    }}>
                      {(msg.user?.name || "?")[0].toUpperCase()}
                    </div>
                }

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#c4b5fd" }}>
                      {msg.user?.name || msg.user?.id}
                    </span>
                    {msg.pinned_at && (
                      <span style={{ fontSize: 10, color: "rgba(160,158,192,.4)" }}>
                        {new Date(msg.pinned_at).toLocaleDateString("en-US", {
                          month: "short", day: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                  <p style={{
                    fontSize: 13, color: "rgba(241,240,255,.75)", lineHeight: 1.55,
                    margin: 0, wordBreak: "break-word",
                    display: "-webkit-box", WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical", overflow: "hidden",
                  }}>
                    {msg.text || "📎 Attachment"}
                  </p>
                </div>

                {/* Pin accent */}
                <PinIcon style={{
                  width: 12, height: 12, color: "rgba(109,40,217,.4)",
                  flexShrink: 0, transform: "rotate(45deg)", marginTop: 4,
                }} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default PinnedMessagesModal;
