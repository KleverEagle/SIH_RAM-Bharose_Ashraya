# Ashraya — Support Chat Frontend

A React + Vite frontend for the chatbot application, built against the provided API.

## Stack
- React (functional components + hooks)
- Vite
- React Router DOM
- Axios
- js-cookie
- Day.js
- lucide-react
- Tailwind CSS

## Setup

```bash
npm install
npm run dev
```

The app runs on `http://localhost:5173` and expects the API at `http://localhost:5000/api/v1` (see `src/lib/api.js` to change this).

## How it works

- **Auth**: `src/context/AuthContext.jsx` handles login/logout and keeps `auth_token`, `user`, `conversation`, and `messages` in cookies (`js-cookie`) so the session survives refreshes. Every request automatically attaches `Authorization: Bearer <token>` via an axios interceptor (`src/lib/api.js`).
- **Routes**: `/login` (public), `/chat` and `/profile` (protected — redirect to `/login` if not authenticated). See `src/App.jsx` and `src/components/ProtectedRoute.jsx`.
- **Chat**: `src/pages/Chat.jsx` loads cached messages instantly, sends new messages to `POST /messages`, updates the UI optimistically, then reconciles with the server response. The six category buttons (Helpline, Counsellor, Medical, Protection, Financial, Legal) send a preset message for that topic.
- **Profile**: `src/pages/Profile.jsx` reads/updates the user via `GET/PUT /profile`, including a client-side photo picker.
- **Logout**: clears all cookies and local state, then redirects to `/login`.
