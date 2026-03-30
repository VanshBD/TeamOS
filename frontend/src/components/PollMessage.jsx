import { useState, useEffect, useCallback } from "react";
import { useChannelStateContext, useChatContext } from "stream-chat-react";
import { BarChart2Icon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";

/**
 * Renders a poll message.
 * Poll data is stored in message.poll (custom field):
 * {
 *   question: string,
 *   options: [{ id, text }],
 *   multiSelect: boolean,
 *   votes: { [optionId]: [{ userId, userName }] }
 * }
 */
const PollMessage = ({ message, isOwnMessage }) => {
  const { client } = useChatContext();
  const { channel } = useChannelStateContext();
  const [poll, setPoll] = useState(null);
  const [showVoters, setShowVoters] = useState(false);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    try {
      const raw = message.poll || (message.attachments?.[0]?.type === "poll" && message.attachments[0].poll);
      if (raw) setPoll(typeof raw === "string" ? JSON.parse(raw) : raw);
    } catch { /* ignore */ }
  }, [message]);

  const myId = client?.user?.id;
  const myVotes = poll
    ? Object.entries(poll.votes || {})
        .filter(([, voters]) => voters.some(v => v.userId === myId))
        .map(([optId]) => optId)
    : [];

  const totalVotes = poll
    ? Object.values(poll.votes || {}).reduce((s, arr) => s + arr.length, 0)
    : 0;

  const handleVote = useCallback(async (optionId) => {
    if (!poll || voting || !channel) return;
    setVoting(true);
    try {
      const currentVotes = { ...(poll.votes || {}) };
      const alreadyVoted = (currentVotes[optionId] || []).some(v => v.userId === myId);

      if (alreadyVoted) {
        // Toggle off
        currentVotes[optionId] = (currentVotes[optionId] || []).filter(v => v.userId !== myId);
      } else {
        if (!poll.multiSelect) {
          // Remove from all other options
          Object.keys(currentVotes).forEach(k => {
            currentVotes[k] = (currentVotes[k] || []).filter(v => v.userId !== myId);
          });
        }
        currentVotes[optionId] = [
          ...(currentVotes[optionId] || []),
          { userId: myId, userName: client.user.name || myId },
        ];
      }

      const updatedPoll = { ...poll, votes: currentVotes };
      // Update message via partial update
      await client.partialUpdateMessage(message.id, {
        set: { poll: updatedPoll },
      });
      setPoll(updatedPoll);
    } catch (err) {
      console.error("Vote error:", err);
    } finally {
      setVoting(false);
    }
  }, [poll, voting, channel, client, myId, message.id]);

  if (!poll) return null;

  return (
    <div className={`poll-card ${isOwnMessage ? "poll-card--own" : ""}`}>
      {/* Header */}
      <div className="poll-card__header">
        <BarChart2Icon className="poll-card__icon" />
        <span className="poll-card__label">Poll</span>
        {poll.multiSelect && <span className="poll-card__multi-badge">Multiple choice</span>}
      </div>

      {/* Question */}
      <p className="poll-card__question">{poll.question}</p>

      {/* Options */}
      <div className="poll-card__options">
        {poll.options.map(opt => {
          const count = (poll.votes?.[opt.id] || []).length;
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const voted = myVotes.includes(opt.id);

          return (
            <button
              key={opt.id}
              className={`poll-option ${voted ? "poll-option--voted" : ""}`}
              onClick={() => handleVote(opt.id)}
              disabled={voting}
            >
              <div className="poll-option__bar" style={{ width: `${pct}%` }} />
              <div className="poll-option__content">
                <span className="poll-option__check">{voted ? "✓" : ""}</span>
                <span className="poll-option__text">{opt.text}</span>
                <span className="poll-option__pct">{pct}%</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="poll-card__footer">
        <span className="poll-card__total">{totalVotes} vote{totalVotes !== 1 ? "s" : ""}</span>

        {/* Only poll creator can see voter names */}
        {isOwnMessage && totalVotes > 0 && (
          <button
            className="poll-card__voters-toggle"
            onClick={() => setShowVoters(v => !v)}
          >
            {showVoters ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />}
            {showVoters ? "Hide voters" : "See voters"}
          </button>
        )}
      </div>

      {/* Voter list — creator only */}
      {isOwnMessage && showVoters && (
        <div className="poll-card__voters">
          {poll.options.map(opt => {
            const voters = poll.votes?.[opt.id] || [];
            if (!voters.length) return null;
            return (
              <div key={opt.id} className="poll-voters-group">
                <p className="poll-voters-group__option">{opt.text}</p>
                <div className="poll-voters-group__names">
                  {voters.map(v => (
                    <span key={v.userId} className="poll-voters-group__name">{v.userName}</span>
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
