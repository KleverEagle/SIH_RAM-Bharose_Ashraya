# VictimCare AI — System Architecture & Firebase Integration Guide

> **Project Context:** SIH (Smart India Hackathon)  
> **Audience:** Admin Dashboard team + Chatbot/DB team  
> **Last Updated:** September 2026

---

## 1. System Overview

The VictimCare AI platform is composed of **three independently built components** that converge on a single shared Firebase project:

| Component | Built By | Role |
|---|---|---|
| **AI Chatbot Web App** | Friends' team | Victim-facing interface — victims chat with the AI |
| **AI Backend (Python/Node)** | Friends' team | Processes messages, generates replies, scores distress |
| **Admin Dashboard** (`victim-care`) | Your team | Counselor-facing control room — monitors victims, reads chats, marks interventions |

All three share **one Firebase project** as the central source of truth.

---

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    ONE SHARED FIREBASE PROJECT                   │
│                                                                  │
│  Firestore / Realtime DB                                         │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  /victims/{victimId}                                    │    │
│  │    name, location, risk_level, distress_score, ...      │    │
│  │                                                         │    │
│  │  /chats/{victimId}/messages/{msgId}                     │    │
│  │    user_message, ai_reply, timestamp, ...               │    │
│  │                                                         │    │
│  │  /interventions/{victimId}                              │    │
│  │    action_taken, action_by, action_at, ...              │    │
│  └─────────────────────────────────────────────────────────┘    │
└──────────────────┬──────────────────────┬───────────────────────┘
                   │                      │
          ┌────────▼────────┐    ┌────────▼──────────────┐
          │  CHATBOT APP    │    │   ADMIN DASHBOARD      │
          │  (friends)      │    │   (victim-care)        │
          │                 │    │                        │
          │  Victim opens   │    │  Counselor logs in     │
          │  web app →      │    │  Sees live victims,    │
          │  chats with AI  │    │  scores, chats,        │
          │                 │    │  marks interventions   │
          │  Python/Node    │    │  Node.js + Firebase    │
          │  AI backend     │    │  SDK on backend        │
          │  writes scores  │    │  reads/writes Firestore│
          └─────────────────┘    └────────────────────────┘
```

---

## 3. Data Flow (Step-by-Step)

```
1. Victim opens the chatbot web app
        ↓
2. Types a message → sent to AI backend (Python/Node server)
        ↓
3. AI processes message → generates a reply
        ↓
4. AI backend writes to Firebase:
   ├── Chat message + AI reply  →  /chats/{victimId}/messages/
   └── Updated distress score + risk level  →  /victims/{victimId}
        ↓
5. Admin dashboard reads from the SAME Firebase in real time
        ↓
6. Counselor sees updated score / chat / risk level
        ↓
7. Counselor clicks "Mark Action Taken"
        ↓
8. Admin dashboard writes back  →  /interventions/{victimId}
```

---

## 4. Proposed Firestore Schema

### `/victims/{victimId}`
```json
{
  "victim_id": "V-001",
  "name": "Priya Sharma",
  "age": 28,
  "gender": "Female",
  "location": "Delhi",
  "crime_category": "Domestic Abuse",
  "current_distress_score": 82,
  "current_risk_level": "Critical",
  "case_status": "Active",
  "last_interaction": "2026-09-05T08:30:00Z",
  "assigned_counselor_id": "GOV-C-001"
}
```

### `/chats/{victimId}/messages/{msgId}`
```json
{
  "timestamp": "2026-09-05T08:30:00Z",
  "user_message": "I feel very scared and alone.",
  "ai_reply": "I hear you. You are safe here. Can you tell me more?",
  "session_id": "session_xyz",
  "distress_score_at_time": 82,
  "recommended_action": "Immediate counselor call required."
}
```

### `/interventions/{victimId}`
```json
{
  "action_taken": true,
  "action_taken_by": "GOV-C-001",
  "action_taken_at": "2026-09-05T09:00:00Z",
  "notes": "Called victim, arranged shelter."
}
```

> [!IMPORTANT]
> This schema must be **agreed upon with the friends' team** before any integration begins. Field names in Firestore documents must exactly match what the admin dashboard expects.

---

## 5. Current State vs. Target State

| Layer | Current (MVP / Mock) | Target (Firebase Integration) |
|---|---|---|
| **Backend** | Fake Express server reads `mock-db.json` | Express server uses Firebase Admin SDK |
| **Victim data** | Hardcoded JSON | Firestore `/victims` collection |
| **Chat history** | Dummy messages in `mock-db.json` | Firestore `/chats/{id}/messages` |
| **Interventions** | In-memory mock `POST` | Firestore write to `/interventions/{id}` |
| **Refresh mechanism** | Polls every 60 seconds | Firestore `onSnapshot` real-time listener |
| **Auth** | Session-based dummy login | Firebase Auth (counselor accounts) |

---

## 6. API Migration Plan

Each mock Express route must be replaced with a Firestore SDK call:

### `GET /api/victims`
```js
// BEFORE (mock)
res.json({ victims: require('./data/mock-db.json').victims });

// AFTER (Firebase Admin SDK)
const snapshot = await db.collection('victims')
                         .orderBy('current_distress_score', 'desc')
                         .get();
const victims = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
res.json({ victims });
```

### `GET /api/victims/:id`
```js
// AFTER (Firebase)
const docSnap = await db.doc(`victims/${req.params.id}`).get();
const chats   = await db.collection(`chats/${req.params.id}/messages`)
                        .orderBy('timestamp', 'desc')
                        .limit(20)
                        .get();
const history = chats.docs.map(d => d.data());
res.json({ ...docSnap.data(), history });
```

### `POST /api/victims/:id/action`
```js
// AFTER (Firebase)
await db.doc(`interventions/${req.params.id}`).set({
  action_taken:    true,
  action_taken_by: req.body.counselor_id,
  action_taken_at: new Date().toISOString(),
});
res.json({ success: true });
```

---

## 7. Real-Time Alerts — Replacing the 60-Second Poll

Once integrated with Firebase, replace `setInterval` polling with a **Firestore `onSnapshot` listener** that reacts instantly:

```js
// Fires the moment ANY victim's risk level becomes Critical
import { db } from './firebase-client.js';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const criticalQuery = query(
  collection(db, 'victims'),
  where('current_risk_level', '==', 'Critical')
);

onSnapshot(criticalQuery, (snapshot) => {
  snapshot.docChanges().forEach(change => {
    if (change.type === 'added' || change.type === 'modified') {
      const victim = change.doc.data();
      showToast(
        `⚠️ ${victim.name} is now Critical (score: ${victim.current_distress_score})`,
        'error'
      );
      loadDashboard(true); // Re-render table and KPI cards
    }
  });
});
```

---

## 8. Firebase Security Rules (Draft)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Victims — counselors can read; AI backend writes
    match /victims/{victimId} {
      allow read:  if request.auth != null
                   && request.auth.token.role == 'counselor';
      allow write: if request.auth != null
                   && request.auth.token.role == 'ai_backend';
    }

    // Chats — counselors read only
    match /chats/{victimId}/messages/{msgId} {
      allow read:  if request.auth != null
                   && request.auth.token.role == 'counselor';
      allow write: if request.auth != null
                   && request.auth.token.role == 'ai_backend';
    }

    // Interventions — counselors read and write
    match /interventions/{victimId} {
      allow read, write: if request.auth != null
                         && request.auth.token.role == 'counselor';
    }
  }
}
```

> [!NOTE]
> Custom roles (`counselor`, `ai_backend`) are set via **Firebase Custom Claims** using the Admin SDK. This must be configured by whoever manages the Firebase project.

---

## 9. Team Coordination Checklist

Before integration begins, align with the friends' team on every item below:

- [ ] **Firebase Project ID** — get the shared project ID
- [ ] **Service Account JSON** — for your Node.js backend (Admin SDK auth)
- [ ] **Firebase Client Config** — for frontend real-time listeners (public config object)
- [ ] **Agreed Firestore Schema** — confirm field names match Section 4
- [ ] **Who writes `distress_score`?** — AI backend only; dashboard is read-only for scores
- [ ] **Firebase Auth Strategy** — are counselors using Firebase Auth? Email/password or Google SSO?
- [ ] **Security Rules** — who owns and deploys them? Reference Section 8
- [ ] **Environments** — separate Dev and Production Firebase projects, or one shared?

---

## 10. Integration Roadmap

| Phase | Status | Description |
|---|---|---|
| **Phase 1** | ✅ Complete | Mock data + Express server + full admin dashboard UI |
| **Phase 2** | 🔜 Next | Team alignment — agree on schema, get Firebase credentials |
| **Phase 3** | ⏳ Pending | Replace mock Express routes with Firestore Admin SDK |
| **Phase 4** | ⏳ Pending | Add `onSnapshot` real-time listeners, retire 60s poll |
| **Phase 5** | ⏳ Pending | Migrate counselor auth to Firebase Auth + Security Rules |
| **Phase 6** | 🎯 SIH Goal | Full end-to-end: victim chats → AI scores → dashboard live |

---

## 11. Ownership Matrix

| Component | Owner | Notes |
|---|---|---|
| Firebase project setup + credentials | Friends' team lead | Must share credentials with dashboard team |
| Firestore schema definition | **Shared decision** | Reference Section 4 as starting point |
| Distress scoring logic | Friends' AI team | Writes to `/victims` and `/chats` |
| Admin dashboard UI + logic | Your team | Reads `/victims`, `/chats`; writes `/interventions` |
| Firebase Security Rules | **Shared** | Draft provided in Section 8 |
| Firebase Auth (counselor accounts) | Your team | Integrate with existing login flow |

---

> [!TIP]
> **SIH Demo Tip:** Even if Firebase integration isn't fully complete by demo day, seed a live Firestore with realistic dummy data and point your dashboard at it. Judges will see real data flowing end-to-end — far more impressive than a localhost mock.
