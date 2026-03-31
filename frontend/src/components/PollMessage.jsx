import { useState, useEffect, useCallback } from "react";
import { useChatContext } from "stream-chat-react";
import { BarChart2Icon, ChevronDownIcon, ChevronUpIcon, CheckIcon } from "lucide-react";
import { votePollApi } from "../lib/api";

/**
 * Poll data lives in message.attachments[0].poll
 * Shape: { question, options:[{id,text}], multiSelect, votes:{[optId]:[{userId,userName}]} }
 */
const PollMessage = ({ message, isOwnMessage }) => {
  const { client } = useChatContext();

  // Read poll from attachments (primary) or legacy fields
  const getPoll = (msg) => {
    // Primary: poll stored in attachment
    const fromAtt = msg.attachments?.find(a => a.type === "poll")?.poll;
    if (fromAtt) return typeof fromAtt === "string" ? JSON.parse(fromAtt) : fromAtt;
    // Backup field (used after vote updates)
    if (msg.poll_data) return typeof msg.poll_data === "string" ? JSON.parse(msg.poll_data) : msg.poll_data;
    // Legacy top-level poll field
    if (msg.poll) return typeof msg.poll === "string" ? JSON.parse(msg.poll) : msg.poll;
    return null;
  };

  const [poll, setPoll] = useState(() => getPoll(message));
  const [showVoters, setShowVoters] = useState(false);
  const [voting, setVoting] = useState(false);

  // Keep in sync when message updates arrive via Stream events
  useEffect(() => {
    const updated = getPoll(message);
    if (updated) setPoll(updated);
  }, [message]);

  const myId = client?.user?.id;

  const myVotes = poll
    ? Object.entries(poll.votes || {})
        .filter(([, voters]) => Array.isArray(voters) && voters.some(v => v.userId === myId))
        .map(([optId]) => optId)
    : [];

  const totalVotes = poll
    ? Object.values(poll.votes || {}).reduce((s, arr) => s + (Array.isArray(arr) ? arr.length : 0), 0)
    : 0;

  const handleVote = useCallback(async (optionId) => {
    if (!poll || voting) return;
    setVoting(true);
    try {
      // Optimistic update
      const currentVotes = JSON.parse(JSON.stringify(poll.votes || {}));
      const alreadyVoted = (currentVotes[optionId] || []).some(v => v.userId === myId);
      if (alreadyVoted) {
        currentVotes[optionId] = (currentVotes[optionId] || []).filter(v => v.userId !== myId);
      } else {
        if (!poll.multiSelect) {
          Object.keys(currentVotes).forEach(k => {
            currentVotes[k] = (currentVotes[k] || []).filter(v => v.userId !== myId);
          });
        }
        currentVotes[optionId] = [
          ...(currentVotes[optionId] || []),
          { userId: myId, userName: client.user?.name || myId },
        ];
      }
      setPoll({ ...poll, votes: currentVotes });

      // Server-side update via backend (bypasses Stream permission check)
      const result = await votePollApi(message.id, optionId, client.user?.name || myId, poll.multiSelect);
      // Sync with server response
      if (result.poll) setPoll(result.poll);
    } catch (err) {
      console.error("Vote error:", err);
      // Revert optimistic update on error
      const reverted = getPoll(message);
      if (reverted) setPoll(reverted);
    } finally {
      setVoting(false);
    }
  }, [poll, voting, client, myId, message]);

  if (!poll) return null;

  return (
    <div style={{
      background: isOwnMessage ? "rgba(255,255,255,.1)" : "rgba(109,40,217,.08)",
      border: `1px solid ${isOwnMessage ? "rgba(255,255,255,.15)" : "rgba(109,40,217,.2)"}`,
      borderRadius: 14, padding: "14px 16px", minWidth: 220, maxWidth: 320,
      marginTop: 4,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
        <BarChart2Icon style={{ width: 14, height: 14, color: "#a78bfa", flexShrink: 0 }} />
        <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".1em", color: "#a78bfa" }}>
          Poll
        </span>
        {poll.multiSelect && (
          <span style={{
            fontSize: 9, fontWeight: 700, background: "rgba(109,40,217,.25)", color: "#c4b5fd",
            padding: "2px 7px", borderRadius: 999, letterSpacing: ".05em",
          }}>
            Multi-choice
          </span>
        )}
      </div>

      {/* Question */}
      <p style={{ fontSize: 14, fontWeight: 700, color: "#f1f0ff", margin: "0 0 12px", lineHeight: 1.4 }}>
        {poll.question}
      </p>

      {/* Options */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {(poll.options || []).map(opt => {
          const count = (poll.votes?.[opt.id] || []).length;
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const voted = myVotes.includes(opt.id);

          return (
            <button
              key={opt.id}
              onClick={() => handleVote(opt.id)}
              disabled={voting}
              style={{
                position: "relative", overflow: "hidden",
                display: "flex", alignItems: "center", gap: 8,
                padding: "9px 12px", borderRadius: 10, cursor: voting ? "wait" : "pointer",
                border: voted
                  ? "1.5px solid rgba(109,40,217,.6)"
                  : "1px solid rgba(255,255,255,.1)",
                background: voted ? "rgba(109,40,217,.18)" : "rgba(255,255,255,.04)",
                transition: "all .18s", textAlign: "left", width: "100%",
              }}
              onMouseEnter={e => { if (!voted) e.currentTarget.style.background = "rgba(255,255,255,.08)"; }}
              onMouseLeave={e => { if (!voted) e.currentTarget.style.background = "rgba(255,255,255,.04)"; }}
            >
              {/* Progress bar fill */}
              <div style={{
                position: "absolute", left: 0, top: 0, bottom: 0,
                width: `${pct}%`, background: voted
                  ? "rgba(109,40,217,.2)" : "rgba(255,255,255,.05)",
                transition: "width .4s ease", borderRadius: 10,
                pointerEvents: "none",
              }} />

              {/* Check circle */}
              <div style={{
                width: 18, height: 18, borderRadius: poll.multiSelect ? 4 : "50%",
                border: voted ? "2px solid #a78bfa" : "2px solid rgba(255,255,255,.25)",
                background: voted ? "rgba(109,40,217,.4)" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, transition: "all .18s", position: "relative", zIndex: 1,
              }}>
                {voted && <CheckIcon style={{ width: 10, height: 10, color: "#c4b5fd" }} />}
              </div>

              {/* Option text */}
              <span style={{
                flex: 1, fontSize: 13, fontWeight: voted ? 600 : 400,
                color: voted ? "#f1f0ff" : "rgba(241,240,255,.75)",
                position: "relative", zIndex: 1,
              }}>
                {opt.text}
              </span>

              {/* Percentage */}
              <span style={{
                fontSize: 11, fontWeight: 700,
                color: voted ? "#c4b5fd" : "rgba(160,158,192,.5)",
                position: "relative", zIndex: 1, flexShrink: 0,
              }}>
                {pct}%
              </span>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
        <span style={{ fontSize: 11, color: "rgba(160,158,192,.45)" }}>
          {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
        </span>

        {/* Anyone can see voters if there are votes */}
        {totalVotes > 0 && (
          <button
            onClick={() => setShowVoters(v => !v)}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              background: "none", border: "none", cursor: "pointer",
              fontSize: 11, color: "#a78bfa", fontWeight: 600, padding: 0,
            }}
          >
            {showVoters ? <ChevronUpIcon style={{ width: 12, height: 12 }} /> : <ChevronDownIcon style={{ width: 12, height: 12 }} />}
            {showVoters ? "Hide" : "See voters"}
          </button>
        )}
      </div>

      {/* Voter breakdown */}
      {showVoters && (
        <div style={{ marginTop: 10, borderTop: "1px solid rgba(255,255,255,.06)", paddingTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          {(poll.options || []).map(opt => {
            const voters = poll.votes?.[opt.id] || [];
            if (!voters.length) return null;
            return (
              <div key={opt.id}>
                <p style={{ fontSize: 11, color: "rgba(160,158,192,.5)", margin: "0 0 4px", fontWeight: 600 }}>
                  {opt.text}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {voters.map(v => (
                    <span key={v.userId} style={{
                      fontSize: 11, background: "rgba(109,40,217,.2)", color: "#c4b5fd",
                      padding: "2px 8px", borderRadius: 999, fontWeight: 600,
                    }}>
                      {v.userName}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PollMessage;
