import { useState, useEffect, useCallback } from "react";
import { XIcon, VideoIcon, PhoneOffIcon, ClockIcon, PhoneMissedIcon, ArrowLeftIcon, UserIcon } from "lucide-react";
import { getCallHistory } from "../lib/api";

/* ── helpers ── */
const fmtDuration = (sec) => {
  if (!sec || sec <= 0) return null;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

const fmtDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined });
};

const fmtTime = (iso) => iso ? new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "";

const Avatar = ({ src, name, size = 36 }) =>
  src
    ? <img src={src} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
    : <div style={{ width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg,#6d28d9,#9333ea)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: size * 0.38, fontWeight: 700, flexShrink: 0 }}>
        {(name || "?")[0].toUpperCase()}
      </div>;

/* ── Status config ── */
const STATUS = {
  ended:  { color: "#a78bfa", bg: "rgba(109,40,217,.15)", Icon: VideoIcon,      label: "Video Call" },
  missed: { color: "#f87171", bg: "rgba(239,68,68,.12)",  Icon: PhoneMissedIcon, label: "Missed Call" },
  active: { color: "#4ade80", bg: "rgba(34,197,94,.12)",  Icon: VideoIcon,       label: "Ongoing Call" },
};

/* ── Detail side-panel ── */
const CallDetailPanel = ({ call, onClose }) => {
  const s = STATUS[call.status] || STATUS.ended;
  const duration = fmtDuration(call.durationSec);

  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(14,14,26,.98)", display: "flex", flexDirection: "column", zIndex: 10, animation: "chSlideIn .2s ease" }}>
      <style>{`@keyframes chSlideIn { from { opacity:0; transform:translateX(24px); } to { opacity:1; transform:translateX(0); } }`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 18px", borderBottom: "1px solid rgba(255,255,255,.06)", flexShrink: 0 }}>
        <button onClick={onClose} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 9, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.08)", color: "rgba(241,240,255,.7)", cursor: "pointer" }}>
          <ArrowLeftIcon style={{ width: 15, height: 15 }} />
        </button>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#f1f0ff" }}>Call Details</span>
      </div>

      {/* Body */}
      <div style={{ flex: "1 1 0", overflowY: "auto", padding: "24px 20px", scrollbarWidth: "thin", scrollbarColor: "rgba(109,40,217,.3) transparent" }}>

        {/* Big status icon */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: s.bg, border: `2px solid ${s.color}30`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            <s.Icon style={{ width: 30, height: 30, color: s.color }} />
            {call.status === "active" && (
              <span style={{ position: "absolute", inset: -4, borderRadius: "50%", border: `2px solid ${s.color}`, animation: "callPulse 1.5s ease-in-out infinite", opacity: .5 }} />
            )}
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 18, fontWeight: 800, color: "#f1f0ff", margin: "0 0 4px" }}>{s.label}</p>
            <p style={{ fontSize: 13, color: "rgba(160,158,192,.55)", margin: 0 }}>{fmtDate(call.startTime)} · {fmtTime(call.startTime)}</p>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
          {[
            { label: "Status", value: call.status.charAt(0).toUpperCase() + call.status.slice(1) },
            { label: "Duration", value: duration || (call.status === "missed" ? "—" : "Ongoing") },
            { label: "Started", value: fmtTime(call.startTime) },
            { label: "Ended", value: call.endTime ? fmtTime(call.endTime) : "—" },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, padding: "14px 14px" }}>
              <p style={{ fontSize: 11, color: "rgba(160,158,192,.5)", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: ".6px", fontWeight: 600 }}>{label}</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#f1f0ff", margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Created by */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(160,158,192,.5)", letterSpacing: ".8px", textTransform: "uppercase", margin: "0 0 10px" }}>Started By</p>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 12 }}>
            <Avatar src={call.createdBy?.image} name={call.createdBy?.name} size={40} />
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#f1f0ff", margin: 0 }}>{call.createdBy?.name || call.createdBy?.id}</p>
              <p style={{ fontSize: 11, color: "rgba(160,158,192,.45)", margin: 0 }}>Call host</p>
            </div>
            <div style={{ marginLeft: "auto", padding: "4px 10px", borderRadius: 20, background: "rgba(109,40,217,.2)", color: "#a78bfa", fontSize: 11, fontWeight: 600 }}>Host</div>
          </div>
        </div>

        {/* Call ID */}
        <div style={{ padding: "10px 14px", background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)", borderRadius: 10 }}>
          <p style={{ fontSize: 10, color: "rgba(160,158,192,.35)", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: ".6px" }}>Call ID</p>
          <p style={{ fontSize: 11, color: "rgba(160,158,192,.5)", margin: 0, fontFamily: "monospace", wordBreak: "break-all" }}>{call.callId}</p>
        </div>
      </div>

      <style>{`@keyframes callPulse { 0%,100%{transform:scale(1);opacity:.5} 50%{transform:scale(1.15);opacity:.2} }`}</style>
    </div>
  );
};

/* ── Main panel ── */
const CallHistoryPanel = ({ channelId, channelName, onClose }) => {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCall, setSelectedCall] = useState(null);

  const load = useCallback(async () => {
    if (!channelId) return;
    setLoading(true);
    try {
      const data = await getCallHistory(channelId);
      setCalls(data.calls || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [channelId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  // Group calls by date
  const grouped = calls.reduce((acc, call) => {
    const key = fmtDate(call.startTime);
    if (!acc[key]) acc[key] = [];
    acc[key].push(call);
    return acc;
  }, {});

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10000, display: "flex", alignItems: "stretch", justifyContent: "flex-end", background: "rgba(0,0,0,.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <style>{`
        @keyframes chPanelIn { from { opacity:0; transform:translateX(40px); } to { opacity:1; transform:translateX(0); } }
        .ch-call-row { display:flex; align-items:center; gap:12px; padding:12px 18px; cursor:pointer; transition:background .12s; position:relative; }
        .ch-call-row:hover { background:rgba(109,40,217,.08); }
        .ch-call-row:hover .ch-call-arrow { opacity:1; }
        .ch-call-arrow { opacity:0; transition:opacity .12s; color:rgba(160,158,192,.4); }
      `}</style>

      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "rgba(14,14,26,.99)",
          border: "1px solid rgba(109,40,217,.2)",
          borderRadius: "20px 0 0 20px",
          width: "100%",
          maxWidth: 400,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          boxShadow: "-8px 0 60px rgba(0,0,0,.8)",
          overflow: "hidden",
          animation: "chPanelIn .25s cubic-bezier(.4,0,.2,1)",
          position: "relative",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 14px", borderBottom: "1px solid rgba(255,255,255,.06)", flexShrink: 0, background: "rgba(109,40,217,.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(109,40,217,.18)", border: "1px solid rgba(109,40,217,.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <VideoIcon style={{ width: 15, height: 15, color: "#a78bfa" }} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#f1f0ff", margin: 0 }}>Call History</p>
              {channelName && <p style={{ fontSize: 11, color: "rgba(160,158,192,.45)", margin: 0 }}>{channelName}</p>}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 8, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(160,158,192,.7)" }}>
            <XIcon style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: "1 1 0", overflowY: "auto", scrollbarWidth: "thin", scrollbarColor: "rgba(109,40,217,.3) transparent" }}>
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "rgba(160,158,192,.4)", fontSize: 13 }}>Loading…</div>
          ) : calls.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12, padding: 32 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(109,40,217,.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <VideoIcon style={{ width: 24, height: 24, color: "rgba(109,40,217,.4)" }} />
              </div>
              <p style={{ fontSize: 14, color: "rgba(160,158,192,.45)", margin: 0, textAlign: "center" }}>No call history yet</p>
            </div>
          ) : (
            Object.entries(grouped).map(([date, dateCalls]) => (
              <div key={date}>
                {/* Date separator */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px 6px" }}>
                  <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,.05)" }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(160,158,192,.4)", letterSpacing: ".8px", textTransform: "uppercase", flexShrink: 0 }}>{date}</span>
                  <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,.05)" }} />
                </div>

                {dateCalls.map((call) => {
                  const s = STATUS[call.status] || STATUS.ended;
                  const duration = fmtDuration(call.durationSec);
                  return (
                    <div key={call.callId} className="ch-call-row" onClick={() => setSelectedCall(call)}>
                      {/* Status icon */}
                      <div style={{ width: 42, height: 42, borderRadius: 13, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative" }}>
                        <s.Icon style={{ width: 18, height: 18, color: s.color }} />
                        {call.status === "active" && (
                          <span style={{ position: "absolute", inset: -3, borderRadius: 16, border: `1.5px solid ${s.color}`, animation: "callPulse 1.5s ease-in-out infinite", opacity: .5 }} />
                        )}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#f1f0ff" }}>{s.label}</span>
                          {call.status === "missed" && (
                            <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 20, background: "rgba(239,68,68,.15)", color: "#f87171", fontWeight: 600 }}>Missed</span>
                          )}
                          {call.status === "active" && (
                            <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 20, background: "rgba(34,197,94,.15)", color: "#4ade80", fontWeight: 600 }}>Live</span>
                          )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Avatar src={call.createdBy?.image} name={call.createdBy?.name} size={16} />
                          <span style={{ fontSize: 11, color: "rgba(160,158,192,.55)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {call.createdBy?.name || "Unknown"}
                          </span>
                          {duration && (
                            <>
                              <span style={{ fontSize: 11, color: "rgba(160,158,192,.3)" }}>·</span>
                              <span style={{ fontSize: 11, color: "rgba(160,158,192,.55)", display: "flex", alignItems: "center", gap: 3 }}>
                                <ClockIcon style={{ width: 10, height: 10 }} />{duration}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Time + arrow */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                        <span style={{ fontSize: 11, color: "rgba(160,158,192,.4)" }}>{fmtTime(call.startTime)}</span>
                        <span className="ch-call-arrow" style={{ fontSize: 14 }}>›</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Detail panel slides over */}
        {selectedCall && (
          <CallDetailPanel call={selectedCall} onClose={() => setSelectedCall(null)} />
        )}
      </div>

      <style>{`@keyframes callPulse { 0%,100%{transform:scale(1);opacity:.5} 50%{transform:scale(1.15);opacity:.2} }`}</style>
    </div>
  );
};

export default CallHistoryPanel;
