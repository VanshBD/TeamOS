# TeamOS — UI Design Brief
## Complete Functional & Visual Reference for AI UI Prompt Generation

---

## Project Overview

**App Name:** TeamOS (branded as "Slap")
**Type:** Real-time team messaging app (Slack/WhatsApp hybrid)
**Stack:** React + Vite frontend, Node.js/Express backend, Stream Chat SDK, Clerk auth
**Current Color Palette:** Deep purple/violet gradient sidebar (`#1a0b2e → #4a154b`), white chat area, blue message bubbles (`#2563eb`)

---

## Layout Structure

### Desktop (≥769px)
```
┌─────────────────────────────────────────────────────────┐
│  SIDEBAR (260px fixed)  │  MAIN CHAT AREA (flex: 1)     │
│  ─────────────────────  │  ──────────────────────────── │
│  Logo + User Avatar     │  Channel Header                │
│  Create Channel btn     │  Pinned Message Banner         │
│  Search Public Channel  │  Live Call Banner              │
│  ─────────────────────  │  Message List (scrollable)     │
│  # CHANNELS             │  Chat Input Bar                │
│    # test121            │                                │
│    # test               │                                │
│    [show more...]       │                                │
│  ─────────────────────  │                                │
│  DIRECT MESSAGES        │                                │
│    • Vansh Dobariya     │                                │
│    • Doctor 2           │                                │
└─────────────────────────────────────────────────────────┘
```

### Mobile (≤768px)
- Sidebar slides in from left as overlay (hamburger menu)
- Top bar shows: ☰ menu + channel name
- Full-width chat area
- Sidebar closes on overlay tap or ✕ button

---

## Component Inventory

### 1. SIDEBAR

**Header:**
- App logo (36×36px rounded) + "Slap" brand name (gradient text, Monaco font)
- Clerk UserButton (avatar with dropdown for profile/sign out)
- Mobile: ✕ close button

**Create Channel Button:**
- Full-width, purple gradient, uppercase, shimmer hover animation
- Icon: `+` plus

**Public Channel Search:**
- Label: "Join Public Channel"
- Input with search icon + "Search" button
- Searches by both channel ID and channel name
- Results list: channel name, member count, Join/Open button
- Join = adds user as member; Open = navigates if already member

**Channel List:**
- Section header: `#` icon + "CHANNELS" label
- Each item: `#` icon + channel name + unread badge (red pill)
- Active state: purple background + left accent bar + slight translateX
- Hover: purple tint + translateX(3px)
- Show more/less: when >3 channels, shows "X more channels" chevron button

**Direct Messages:**
- Section header: users icon + "DIRECT MESSAGES"
- Each item: avatar (30px circle) + online dot (green/gray) + name + unread badge
- Avatar fallback: gradient circle with first letter
- Hover: purple tint + translateX(3px) + avatar border brightens
- Active: purple border + shadow

---

### 2. CHANNEL HEADER

**Left:** Lock/Hash icon + channel name (or DM: other user's avatar + name)
**Right actions (left to right):**
- Members count (users icon + number)
- Video call button (blue camera icon)
- Invite button (private channels only)
- Pin icon (opens pinned messages modal)
- ⋮ More options dropdown:
  - Channel Details
  - Share Channel (public channels)
  - Delete Channel (creator only, red)

---

### 3. PINNED MESSAGE BANNER

Appears below channel header when messages are pinned.
- Left: 3px gradient accent bar (blue→purple)
- Pin icon (rotated 45°)
- Clickable text area: "PINNED MESSAGE X OF Y" label + message preview
- Clicking cycles through pinned messages AND scrolls+highlights that message
- ✕ dismiss button (hides for session)
- Slides in with animation on mount

---

### 4. LIVE CALL BANNER

Appears when an active video call is in progress in the channel.
- Blue gradient background with shimmer animation
- Pulsing white dot + camera icon + "Live call in progress"
- "Join Now" white pill button
- ✕ dismiss button
- Only shows when call is active (not ended/missed)

---

### 5. MESSAGE LIST

**Message Row Layout (WhatsApp-style):**
```
[Avatar]  [Sender Name] [Time] [📌 if pinned]
          [Quoted Reply Preview — if reply]
          [Message Bubble]
          [Reply count badge — if has replies]
          [Reactions row]
          [Reply | Pin actions — on hover]
```

**Own messages:** right-aligned, blue bubble (`#2563eb`), avatar on right, timestamp inside bubble
**Others' messages:** left-aligned, gray bubble (`#f3f4f6`), avatar on left, name+time above

**Message Bubble:**
- Rounded 18px, bottom corner 4px (directional)
- Text: 14px, pre-wrap
- Quoted reply: left bar + sender name + truncated text, clickable → scrolls to original
- Attachments rendered inside bubble

**Attachment Types in Bubble:**
- **Image:** Full-width rounded image, clickable → opens in new tab
- **File:** Blue card with 📎 icon + filename + size + ↓ download
- **Location:** Map tile (OpenStreetMap) + red pin overlay + "Current Location" + coords + external link icon
- **Poll:** Purple poll card (see Poll section)

**Hover Actions (appear on row hover):**
- Reply button (💬 icon + "Reply" text)
- Pin/Unpin button (📌 icon)

**Reply Count Badge:**
- Blue pill below bubble: "💬 X replies"
- Clicking sets this message as the reply target in the input

**Highlight Animation:**
- When scrolling to a quoted message: blue flash animation (1.4s fade)

---

### 6. POLL MESSAGE CARD

Rendered inside message bubble when `message.poll` exists.

**Structure:**
```
[📊 Poll] [Multiple choice badge — if multiSelect]
[Question text — bold]
[Option 1] ████░░░░ 60%
[Option 2] ██░░░░░░ 40%
[X votes total]  [See voters — creator only]
```

**Option button:**
- Full-width, relative positioned
- Animated progress bar fills behind text
- Voted option: purple border + checkmark
- Click to vote/unvote (single or multi select)
- Real-time updates via Stream's `partialUpdateMessage`

**Voter list (creator only):**
- Expandable section below options
- Groups voters by option
- Each voter shown as purple chip with their name

---

### 7. LOCATION MESSAGE CARD

**Current Location Card:**
- Map tile image (OpenStreetMap, zoom 15) — 140px tall
- Red pin overlay centered on map
- Gradient overlay at bottom
- Info row: 📍 icon + "Current Location" + coordinates + external link
- Entire card is a link → opens Google Maps
- Hover: slight lift + shadow

---

### 8. CHAT INPUT BAR

**Layout (left to right):**
```
[+ button] [😊 emoji] [textarea — flex 1] [➤ send]
```

**+ Button:** Purple gradient circle, rotates 45° when modal open
**Emoji Button:** Gray circle, turns amber when active
**Textarea:** Rounded pill, auto-resize (1–5 rows), purple focus border
**Send Button:** Gray circle → blue circle when text/attachment present

**Reply Preview Bar** (above input when replying):
- Blue background strip
- ↩ icon + sender name (blue) + message preview
- ✕ cancel button

**Attachment Preview Strip** (above input when attachments queued):
- Horizontal scroll row of preview chips
- Images: 80×64px thumbnail
- Files: 📎 + filename chip
- Location: 📍 + coords chip
- Poll: 📊 + question chip
- Each has ✕ remove button

---

### 9. ATTACHMENT MODAL

Slides up from bottom (WhatsApp-style bottom sheet).
Overlay: `rgba(0,0,0,0.45)`, z-index 9999.

**Header:**
- User avatar (44px) + name + "Choose what to share"
- ✕ close button

**Menu Grid (3 columns):**
| Icon | Label | Color |
|------|-------|-------|
| 🖼 ImageIcon | Gallery | Purple |
| 📷 CameraIcon | Camera | Cyan |
| 📍 MapPinIcon | Location | Red |
| 📄 FileTextIcon | Document | Amber |
| 📊 BarChart2Icon | Poll | Green |

**Location tap:** Immediately gets GPS, shows loading toast, adds to preview
**Poll tap:** Opens Poll Creator sub-panel (slides in)

**Poll Creator Sub-panel:**
- Question input
- Option inputs (min 2, max 10) with + Add / 🗑 Remove
- "Allow multiple selections" checkbox
- "Send Poll" button

---

### 10. INCOMING CALL POPUP

Fixed top-right corner, z-index 9999.
- Dark purple gradient card (320px wide)
- Caller avatar with pulsing ring animation
- "Incoming call" label + caller name
- Decline (gray) + Accept (green) buttons
- Auto-dismisses after 60s (sends missed call message)

---

### 11. MODALS

**Create Channel Modal:**
- Dark purple glassmorphism card
- Channel name input (with # prefix hint)
- Description textarea
- Public/Private radio options with icons
- Member selection (for private channels)
- Create button

**Members Modal:** List of channel members with avatars
**Pinned Messages Modal:** Scrollable list of all pinned messages
**Invite Modal:** Search + select users to invite to private channel
**Channel Settings Modal:** View channel details

---

## Color System

| Token | Value | Usage |
|-------|-------|-------|
| Sidebar bg | `#1a0b2e → #4a154b` | Sidebar gradient |
| Brand purple | `#7209b7` | Buttons, accents |
| Brand dark | `#533483` | Secondary purple |
| Chat bg | `#ffffff` | Main chat area |
| Own bubble | `#2563eb` | Sent messages |
| Other bubble | `#f3f4f6` | Received messages |
| Accent blue | `#2563eb` | Links, active states |
| Online green | `#22c55e` | Presence dot |
| Unread red | `#ef4444` | Badge |
| Text primary | `#111827` | Main text |
| Text muted | `#9ca3af` | Timestamps, hints |

---

## Typography

- **Brand name:** Monaco monospace, 1.3rem, 800 weight, gradient text
- **Section headers:** 10px, 800 weight, uppercase, 0.1em letter-spacing
- **Channel/DM names:** 13px, 500 weight
- **Message text:** 14px, 400 weight, 1.5 line-height
- **Sender name:** 12px, 600 weight
- **Timestamps:** 11px, 400 weight, muted color
- **Badges:** 10px, 700 weight

---

## Animation Inventory

| Animation | Element | Description |
|-----------|---------|-------------|
| `slideUp` | Attachment modal | Slides from bottom on open |
| `pinnedSlideDown` | Pinned banner | Slides from top |
| `msgHighlight` | Message row | Blue flash 1.4s on scroll-to |
| `bannerShimmer` | Live call banner | Moving gradient |
| `ringPulse` | Incoming call avatar | Expanding ring |
| `avatarPulse` | Live location pin | Expanding circle |
| `liveDot` | Live badge | Blinking dot |
| `cardRingPulse` | Active call card | Pulsing border |
| `iconGlow` | Call icon | Glowing shadow |
| `spin` | Loading states | Rotation |
| Hover translateX | Sidebar items | 3–4px slide right |
| Hover translateY | Buttons | -1 to -2px lift |

---

## Responsive Breakpoints

| Breakpoint | Behavior |
|-----------|---------|
| ≥769px | Sidebar always visible, 260px fixed |
| ≤768px | Sidebar hidden, slides in as overlay on hamburger tap |
| ≤480px | Sidebar full-width when open, tighter message padding |

---

## Feature List (for prompt context)

1. **Real-time messaging** via Stream Chat WebSocket
2. **Channels** (public/private) + **Direct Messages**
3. **Reply** (WhatsApp-style quoted reply in main chat, not thread panel)
4. **Pin/Unpin messages** (server-side via Stream admin API)
5. **Pinned message banner** (cycles through all pinned, scrolls to message)
6. **Reactions** (emoji reactions with real-time counts)
7. **Polls** (single/multi-select, real-time vote counts, voter names for creator)
8. **Location sharing** (current GPS location with map preview card)
9. **File/Image sharing** (upload to Stream CDN, rendered in bubble)
10. **Camera capture** (mobile camera direct upload)
11. **Emoji picker** (searchable, 200+ emojis, inserts at cursor)
12. **Video calls** (Stream Video SDK, call cards in chat)
13. **Incoming call popup** (ring animation, accept/decline)
14. **Live call banner** (shows when call active in channel)
15. **Public channel search** (by name or ID)
16. **Show more/less channels** (collapses after 3)
17. **Online presence** (green/gray dot on DM users)
18. **Unread badges** (red pill on channels and DMs)
19. **Message highlight** (blue flash when scrolling to quoted message)
20. **Responsive layout** (mobile hamburger sidebar)
