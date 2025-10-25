# 🌍 Chat Room for the World

A beautiful, real-time global chat application where anyone can connect and chat with people from around the world. Built with Next.js 15, React 19, and designed with Apple's aesthetic principles in mind.

![Chat Room for the World](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![MongoDB](https://img.shields.io/badge/MongoDB-6-green?style=for-the-badge&logo=mongodb)

## ✨ Features

- **🌍 Global Chat Room**: Connect with people from around the world in real-time
- **⚡ Blazing Realtime**: Messages send/appear instantly via a dedicated Pusher channel (open WS) sitting between client and MongoDB
- **🤖 Bot Protection**: Simple arithmetic verification to prevent spam bots
- **💬 Message Persistence**: All messages are stored in MongoDB and preserved forever
- **🎨 Apple-Style Design**: Clean, modern UI inspired by Apple's design principles
- **⏰ Global Timestamps**: UTC-relative times with exact time on hover
- **🏳️ Country Flags**: Flags shown for every sender (client-side cached by username for speed)
- **🖼️ Image Uploads**: Paste or select images (UploadThing). 1 MB limit
- **🔍 API Anti-Indexing**: API routes excluded from search indexing (headers + robots)
- **🧭 Smart Scrolling**: "Scroll to latest" shows only when in top 30%, centered at bottom
- **🧾 Clean Console**: Debug logs removed for production cleanliness
- **📱 Responsive Design**: Works beautifully on desktop, tablet, and mobile
- **🌙 Dark Mode Support**: Automatic dark/light mode based on system preference
- **✨ Smooth Animations**: Delightful micro-interactions using Framer Motion
- **🔒 Privacy-First**: No tracking, no data collection - just pure chatting
- **🗑️ Delete-as-Edit**: Delete your message within 10 minutes; it becomes “[this message has been deleted]” and keeps context
- **✅ Optimistic UI**: Messages appear instantly before the server responds; updates reconcile via real-time events

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- MongoDB database (we recommend MongoDB Atlas)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/live-chat.git
   cd live-chat
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and add your MongoDB connection string:
   ```
   MONGODB_URI=your_mongodb_connection_string_here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000) and start chatting!

## 🏗️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS with custom Apple-inspired design system
- **Animations**: Framer Motion for smooth, delightful interactions
- **Database**: MongoDB for message persistence
- **Realtime**: Pusher Channels (WebSocket) for fan-out of created/edited/reaction events
- **Icons**: Lucide React for beautiful, consistent icons
- **Uploads**: UploadThing (server-routed image uploads)
- **Deployment**: Optimized for Vercel (but works anywhere)

### Notable Integrations

- **Geo / Flags**
  - Server infers 2-letter ISO country code from common CDN/edge headers: `x-vercel-ip-country`, `cf-ipcountry`, or `x-country`.
  - Client can fetch `/api/geo` once per session; a lightweight local cache maps `username -> { countryCode }` in `localStorage`.
  - We render the flag alongside the author name from the cache to avoid sending extra meta on every message. Messages may still include `countryCode` when available for consistency.

- **Image Uploads**
  - Implemented via UploadThing (`app/api/uploadthing/core.ts`).
  - Users can paste images (Cmd/Ctrl+V) or use the button to select a file.
  - Limit: 1 image, up to 1 MB (configurable).

- **Anti-Indexing for API**
  - `next.config.js`: sets `X-Robots-Tag: noindex, nofollow` for `/api/*` routes.
  - `app/robots.ts`: disallows `/api` paths in `robots.txt`.

- **Caching & Freshness**
  - `app/api/messages/route.ts` marked `dynamic = 'force-dynamic'.
  - Client fetches use `{ cache: 'no-store' }` for messages/stats to avoid staleness.
  - Client maintains a `username -> countryCode` meta cache to render flags without extra network hops.
  - Timezone is computed once per session (`Intl.DateTimeFormat().resolvedOptions().timeZone`) and reused for sends.
  - Geo `countryCode` is cached in `sessionStorage` (`glcr_geo_v1`) for the current tab/session; we skip `/api/geo` if present.

- **Time UX**
  - Relative times: minutes/hours, then `X day(s) ago` up to 7 days; older show absolute UTC.
  - Hover on timestamp shows exact day/date/time (UTC).

- **Input & Reply UX**
  - Input icons and send button vertically aligned with the text box (48px height baseline).
  - Placeholder is a centered overlay that never shifts.
  - Reply preview has distinct blue-accent styling and does not affect icon alignment.

## 🎨 Design Philosophy

This app is designed with Apple's principles in mind:

- **Simplicity**: Clean, uncluttered interface that focuses on the conversation
- **Intuitive**: Anyone can start chatting within seconds
- **Delightful**: Subtle animations and micro-interactions that feel natural
- **Accessible**: Works for everyone, regardless of technical skill level

## 🌟 Fun Features

- **Smart Placeholders**: Chat input shows rotating, contextual placeholder text
- **Audience-Aware**: Includes fun touches for different user types (students, professionals, etc.)
- **Rotating Subtitles**: Header shows different inspiring messages about global connection
- **Fun Facts Footer**: Educational tidbits about the app and global communication
- **Emoji Support**: Quick emoji insertion for expressive chatting


## 🧭 Architecture & Flow (High Level)

- **Optimistic Send** (`app/page.tsx`):
  1. User hits send. We generate a temporary ID and immediately append a message to local state.
  2. POST `/api/messages` persists the message in MongoDB.
  3. Server broadcasts `message_created` on a Pusher channel.
  4. Client merges the authoritative message (replacing the temp one) using a de-dupe `mergeUnique()` helper.

- **Realtime Fan-out** (Pusher):
  - Events: `message_created`, `message_edited`, `message_updated` (reactions, etc.), `typing_update`.
  - A single open WebSocket subscription keeps all clients in sync with minimal latency.

- **Delete-as-Edit**:
  1. PATCH `/api/messages` with the special placeholder `[this message has been deleted]`.
  2. Server enforces a strict 10-minute window (ownership + timestamp validation).
  3. UI renders deleted messages in italic grey, preserves metadata and context, and hides interactions.

- **Flags / Author Meta**:
  - A small local cache (`localStorage`) stores `username -> { countryCode }` so each bubble shows name + flag without repeated lookups.
  - Cache seeds from initial fetch and incoming realtime messages.

## 🛠 Recent Changes (Feature Update)

- “Messages are now much faster.” We introduced a dedicated Pusher message channel that sits between the user and MongoDB to broadcast new/edited messages in real time via an always-open WebSocket. Combined with an optimistic UI, messages appear instantly.
- “Delete messages (10 min).” Users can delete their own messages within 10 minutes. Deleted messages are not removed; they render as a placeholder to preserve conversation context.
- “Name + Flag on every message.” We restore the name/flag display without adding payload bloat using a client-side username meta cache persisted in `localStorage`.

### Suggested Release Note

> Messages now send and appear instantly via a dedicated Pusher channel and an optimistic UI. We also added a 10‑minute delete window (deleted messages show a placeholder to keep context) and brought back per‑message name + country flag using a lightweight client-side cache for speed.

## 🧩 Challenges & Key Decisions

- **Latency vs. Consistency**: We favored an optimistic UI and reconciled with server-sourced events from Pusher. A de-dupe merge routine ensures a single canonical copy per message.
- **Per-Message Payload Size**: To keep messages lightweight, we avoided attaching redundant user meta on every message. Instead, we render name/flag from a client-side cache seeded from initial batch + realtime events.
- **Edit/Delete Policy**: A strict 10-minute window enforced both client- and server-side avoids confusion and keeps logic simple.
- **Quill + React 19**: React 19 removed `findDOMNode`. We switched to `react-quill-new` with a small type shim to prevent runtime crashes.
- **Mobile UX Density**: Kept controls small and within bubble metadata rows to preserve vertical space while ensuring tap targets remain usable.

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB connection string | Yes |
| `UPLOADTHING_APP_ID` | UploadThing App ID | Yes (for image uploads) |
| `UPLOADTHING_SECRET` | UploadThing Secret | Yes (for image uploads) |
| `PUSHER_APP_ID` | Pusher app ID (server) | Yes (for realtime) |
| `PUSHER_KEY` | Pusher key (server) | Yes (for realtime) |
| `PUSHER_SECRET` | Pusher secret (server) | Yes (for realtime) |
| `PUSHER_CLUSTER` | Pusher cluster (server) | Yes (for realtime) |
| `NEXT_PUBLIC_PUSHER_KEY` | Pusher key (client) | Yes (for realtime) |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | Pusher cluster (client) | Yes (for realtime) |

### Deployment

This app is optimized for deployment on Vercel:

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add your `MONGODB_URI` environment variable in Vercel dashboard
4. Deploy!

The app will work on other platforms too - just make sure to set the environment variables appropriately.

## 🤝 Contributing

We welcome contributions! Here are some ways you can help:

- 🐛 Report bugs or issues
- 💡 Suggest new features
- 🎨 Improve the design
- 📝 Improve documentation
- 🌍 Add internationalization support

## 📧 Feedback

Have suggestions or feedback? Send them to **arhampersonal at icloud dot com**

## ℹ️ Notes

- **Flags in development**: Local/dev environments may not include geo headers, so `/api/geo` can return `null`. In production (e.g., Vercel), flags are consistently populated. If desired, add a simple dev-only country picker for testing.
- **Privacy**: Only 2-letter country codes are stored alongside messages; no PII is stored.
 - **React 19 + Quill**: We use the `react-quill-new` package (a maintained fork of `react-quill`) because React 19 removed `findDOMNode`, which `react-quill` relied on and would crash at runtime. See `components/ChatInput.tsx` and `components/ChatMessage.tsx` where the editor is dynamically imported from `react-quill-new`. A small TS shim exists at `types/react-quill-new.d.ts` to map its types to `react-quill`.

## 🛡️ Privacy & Security

- **No Tracking**: We don't track users or collect personal data
- **Message Persistence**: Messages are stored to preserve chat history, but no personal information is linked
- **Bot Protection**: Simple arithmetic challenges prevent automated spam
- **Open Source**: Code is transparent and auditable

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Inspired by the idea that technology should bring people together
- Built with love for the global community
- Thanks to all the amazing open-source projects that made this possible

---

**Chat Room for the World** - Where strangers become friends, one message at a time. 🌍✨
