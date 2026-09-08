# Chatbot Backend

Express + SQLite backend for the chatbot frontend. This is a standalone
API — it does not include the React/Vite frontend or the admin
dashboard, and it communicates with the frontend exclusively through the
REST endpoints described below.

The chatbot itself is currently a **human typing into the server
console**, standing in for a future LLM. See [How the console chatbot
works](#how-the-console-chatbot-works).

## 1. Installation

```bash
cd backend
npm install
```

## 2. Starting the server

```bash
npm run dev     # auto-restarts on file changes (nodemon)
npm start       # plain node
```

On startup you'll see the HTTP server come up and the console chatbot
prompt (`>`) become active in the same terminal.


### Full endpoint list

Public:

- `POST /api/v1/auth/login`

Protected (require `Authorization: Bearer <token>`):

- `POST /api/v1/auth/logout`
- `GET  /api/v1/auth/me`
- `GET  /api/v1/profile`
- `PUT  /api/v1/profile`
- `GET  /api/v1/conversation`
- `GET  /api/v1/messages`
- `POST /api/v1/messages`

All responses use `{ "success": true, "data": ... }` or
`{ "success": false, "error": { "code", "message" } }`.

## Architecture notes

- **One conversation per user**, enforced at the database level via a
  `UNIQUE` constraint on `conversations.user_id`, not just in
  application code. The frontend never sends or sees a conversation ID.
- **Chat service abstraction**: routes call `services/chat.js`, which
  currently delegates to `services/llm.js`'s `ConsoleChatService`. A
  future `LLMChatService` implementing the same
  `generateResponse({ requestId, user, message, conversation })`
  interface can be swapped in there without touching routes, the
  database schema, or the frontend contract.
- **Auth**: the authenticated user's ID always comes from the verified
  JWT (`req.user.id`), never from anything supplied by the client body,
  query, or params.
- Admin-dashboard and LLM-provider concerns are intentionally *not*
  implemented here, but the service layout (separate `profile`,
  `conversation`, and `chat` services) leaves room to add an admin API
  later without entangling it with the chatbot-facing endpoints.
