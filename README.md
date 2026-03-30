# TeamOS — Slap

A real-time team messaging application built with React, Node.js, Stream Chat, and Clerk authentication. Think Slack meets WhatsApp.

---

## Features

- **Real-time messaging** — channels, direct messages, typing indicators
- **WhatsApp-style replies** — quoted reply preview in main chat with scroll-to-original
- **Pin messages** — pin any message, banner cycles through all pinned with one-click scroll
- **Reactions** — emoji reactions with live counts
- **Polls** — create single/multi-select polls, real-time vote counts, voter names visible to creator
- **Location sharing** — share current GPS location with interactive map card
- **File & image sharing** — upload images, camera capture, documents
- **Emoji picker** — searchable picker with 200+ emojis, inserts at cursor position
- **Video calls** — start/join calls, incoming call popup with ring animation
- **Public channel search** — search by channel name or ID, join in one tap
- **Online presence** — live green/gray dot on direct message contacts
- **Unread badges** — red count badges on channels and DMs
- **Responsive** — full mobile support with slide-in sidebar

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS |
| Auth | Clerk |
| Chat | Stream Chat (stream-chat-react) |
| Video | Stream Video React SDK |
| Backend | Node.js, Express |
| Database | MongoDB (Mongoose) |
| Background jobs | Inngest |
| Error tracking | Sentry |

---

## Project Structure

```
TeamOS/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AttachmentModal.jsx      # + button modal (gallery/camera/location/doc/poll)
│   │   │   ├── CallMessage.jsx          # Call card rendered in chat
│   │   │   ├── ChannelSettingsModal.jsx # Channel details view
│   │   │   ├── ChatInputWrapper.jsx     # Custom message input with emoji/attachments
│   │   │   ├── CreateChannelModal.jsx   # Create public/private channel
│   │   │   ├── CustomChannelHeader.jsx  # Header with call/pin/invite/settings
│   │   │   ├── CustomChannelPreview.jsx # Sidebar channel list item
│   │   │   ├── EmojiPicker.jsx          # Emoji picker component
│   │   │   ├── IncomingCallManager.jsx  # Manages incoming call popup state
│   │   │   ├── IncomingCallPopup.jsx    # Ring animation popup
│   │   │   ├── InviteModal.jsx          # Invite users to private channel
│   │   │   ├── LiveCallBanner.jsx       # "Live call in progress" banner
│   │   │   ├── LocationMessage.jsx      # Current location map card
│   │   │   ├── MembersModal.jsx         # Channel members list
│   │   │   ├── PageLoader.jsx           # Full-screen loading state
│   │   │   ├── PinnedMessageBanner.jsx  # Pinned message banner with cycle
│   │   │   ├── PinnedMessagesModal.jsx  # All pinned messages list
│   │   │   ├── PollMessage.jsx          # Poll card with voting UI
│   │   │   ├── PublicChannelJoin.jsx    # Search + join public channels
│   │   │   ├── PublicChannelPreview.jsx # Public channel search result
│   │   │   ├── ReactionDisplay.jsx      # Emoji reaction row
│   │   │   ├── ReplyBox.jsx             # (legacy, replaced by inline reply)
│   │   │   └── UsersList.jsx            # DM contacts list with presence
│   │   ├── hooks/
│   │   │   └── useStreamChat.js         # Stream Chat client connection hook
│   │   ├── lib/
│   │   │   ├── api.js                   # Axios API calls
│   │   │   ├── axios.js                 # Axios instance with auth
│   │   │   └── callMessages.js          # Call message parsing utilities
│   │   ├── pages/
│   │   │   ├── AuthPage.jsx             # Sign in / sign up
│   │   │   ├── CallPage.jsx             # Video call room
│   │   │   ├── HomePage.jsx             # Main chat layout
│   │   │   └── PublicChannelPage.jsx    # Public channel preview
│   │   ├── providers/
│   │   │   └── AuthProvider.jsx         # Clerk auth wrapper
│   │   └── styles/
│   │       ├── animations.css           # Keyframe animations
│   │       ├── attachment-modal.css     # Modal + poll + location card styles
│   │       ├── auth.css                 # Auth page styles
│   │       ├── core-layout.css          # Master layout overrides (highest specificity)
│   │       └── stream-chat-theme.css    # Stream Chat theme + all component styles
│
└── backend/
    └── src/
        ├── config/
        │   ├── db.js                    # MongoDB connection
        │   ├── env.js                   # Environment variables
        │   ├── inngest.js               # Background job config
        │   └── stream.js                # Stream Chat server client
        ├── controllers/
        │   └── chat.controller.js       # Token, channels, pin/unpin, search
        ├── middleware/
        │   └── auth.middleware.js       # Clerk JWT verification
        ├── models/
        │   └── user.model.js            # User model
        └── routes/
            └── chat.route.js            # API routes
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/chat/token` | Get Stream Chat user token |
| GET | `/api/chat/channels/public/:channelId` | Search public channel by ID or name |
| POST | `/api/chat/channels/:channelId/join` | Join a public channel |
| POST | `/api/chat/channels/:channelId/invite` | Invite users to private channel |
| POST | `/api/chat/messages/:messageId/pin` | Pin a message (server-side admin) |
| POST | `/api/chat/messages/:messageId/unpin` | Unpin a message |

---

## Environment Variables

### Frontend (`frontend/.env`)
```
VITE_CLERK_PUBLISHABLE_KEY=
VITE_STREAM_API_KEY=
VITE_SENTRY_DSN=
VITE_API_BASE_URL=http://localhost:5001/api
```

### Backend (`backend/.env`)
```
PORT=5001
MONGO_URI=
NODE_ENV=development
CLIENT_URL=http://localhost:5173
CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
STREAM_API_KEY=
STREAM_API_SECRET=
SENTRY_DSN=
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
```

---

## Getting Started

```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Start backend
cd backend && npm run dev

# Start frontend (separate terminal)
cd frontend && npm run dev
```

---

## UI Design Brief

See `UI-DESIGN-BRIEF.md` for the complete visual and functional specification used for UI redesign prompts.
