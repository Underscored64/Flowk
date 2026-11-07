# Task 06 — Announcements, notifications, meetings (P0)
Announcements:
1. `announcements`: feed (pinned first), unread counter, urgent banner at top of the app. Admin only: create/edit/delete (title, markdown body, audience, importance, pinned, publishAt, expiresAt). Render markdown **sanitized** (no raw HTML).
2. Reading marks `AnnouncementRead`. Workflows can create announcements (notify step).
Notifications: bell in the header with unread count; list; mark read. Table `Notification`.
Realtime: `GET /api/stream` (Server-Sent Events) pushes `announcement.created` and `notification.created` to the right users; client falls back to polling every 30 s.
Meetings (Jitsi as a Service, free tier):
1. `meetings`: list, create (title, participants, date, optional link to a ticket/run). `roomSlug` = random 16+ chars.
2. Page `meetings/[id]` embeds the JaaS iframe API (`https://8x8.vc/<APP_ID>/external_api.js`, domain `8x8.vc`, roomName `<APP_ID>/<roomSlug>`). The server route `POST /api/meetings/[id]/token` signs a JWT (RS256, header `kid` = `<APP_ID>/<KEY_ID>`, claims `aud: "jitsi"`, `iss: "chat"`, `sub: <APP_ID>`, `room: "*"` or the slug, `exp` 2 h, `context.user: {name, email, moderator}`) with `JAAS_PRIVATE_KEY` (base64 in .env). **Verify these details against developer.8x8.com/jaas before coding.**
3. Fallback if JaaS is not configured: a button opening `https://meet.jit.si/<roomSlug>` in a new tab.
Done when: admin creates an urgent announcement and another logged-in user sees it live; non-admin cannot create one; a meeting opens inside the app (or in the fallback tab); `npm run build` passes.
