export const parseCallMessage = (text = "") => {
  if (!text) return null;

  // Current format: __CALL__{...}
  if (text?.startsWith("__CALL__")) {
    try {
      return JSON.parse(text.replace("__CALL__", ""));
    } catch {
      return null;
    }
  }

  // Legacy format fallback:
  // Example: "I've started a video call. Join me here: localhost:5174/call/<callId>"
  // We extract /call/<callId> and map it to { status: "started" } so UI can show popup cards.
  try {
    const callLinkMatch = text.match(/\/call\/([A-Za-z0-9_-]+)/);
    if (!callLinkMatch?.[1]) return null;
    const callId = callLinkMatch[1];

    const lower = String(text).toLowerCase();
    const now = new Date().toISOString();

    if (lower.includes("miss") && (lower.includes("call") || lower.includes("video"))) {
      return { callId, channelId: null, startTime: now, status: "missed", missedBy: null, ended: false };
    }

    if (lower.includes("ended") || (lower.includes("end") && lower.includes("call"))) {
      return { callId, channelId: null, startTime: now, endTime: now, status: "ended", ended: true };
    }

    if (lower.includes("started") || lower.includes("join me") || lower.includes("video call") || lower.includes("join here")) {
      return { callId, channelId: null, startTime: now, status: "started", ended: false };
    }

    // If we matched /call/<id> but couldn't detect status text, treat as started.
    return { callId, channelId: null, startTime: now, status: "started", ended: false };
  } catch {
    return null;
  }
};

export const buildCallMessageText = (callId, startTime, channelId) =>
  `__CALL__${JSON.stringify({ callId, channelId, startTime, status: "started", ended: false })}`;

export const buildCallEndedText = (callId, startTime, endTime, channelId) =>
  `__CALL__${JSON.stringify({ callId, channelId, startTime, endTime, status: "ended", ended: true })}`;

export const buildCallMissedText = (callId, startTime, channelId, missedBy) =>
  `__CALL__${JSON.stringify({ callId, channelId, startTime, status: "missed", missedBy })}`;

const handledKeyFor = (userId) => `slackclone_handled_call_ids_${userId}`;
const joinedKeyFor = (userId) => `slackclone_joined_call_ids_${userId}`;

const safeReadSet = (raw) => {
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
};

const safeWriteSet = (key, set) => {
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch {
    // ignore storage failures
  }
};

export const isCallHandledForUser = (userId, callId) => {
  if (!userId || !callId) return false;
  return safeReadSet(localStorage.getItem(handledKeyFor(userId))).has(callId);
};

export const markCallHandledForUser = (userId, callId) => {
  if (!userId || !callId) return;
  const key = handledKeyFor(userId);
  const set = safeReadSet(localStorage.getItem(key));
  set.add(callId);
  safeWriteSet(key, set);
};

export const isCallJoinedForUser = (userId, callId) => {
  if (!userId || !callId) return false;
  return safeReadSet(localStorage.getItem(joinedKeyFor(userId))).has(callId);
};

export const markCallJoinedForUser = (userId, callId) => {
  if (!userId || !callId) return;
  const key = joinedKeyFor(userId);
  const set = safeReadSet(localStorage.getItem(key));
  set.add(callId);
  safeWriteSet(key, set);

  try {
    window.dispatchEvent(new CustomEvent("slackclone_call_joined", { detail: { callId } }));
  } catch {
    // ignore
  }
};
