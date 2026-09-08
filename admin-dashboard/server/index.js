// ═══════════════════════════════════════════════════════════════
// server/index.js — Victim Care Express API Server (Firebase Integrated)
// ═══════════════════════════════════════════════════════════════

import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// ── Initialize Firebase Admin ───────────────────────────────────
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (e) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT environment variable.");
  }
} else {
  try {
    serviceAccount = require('./hackathon-ram-bharose-firebase-adminsdk-fbsvc-6387197f58.json');
  } catch (e) {
    console.error("Firebase Service Account key missing. Make sure it's in the server folder or the FIREBASE_SERVICE_ACCOUNT env var is set.");
  }
}

const appAdmin = initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore(appAdmin);
const auth = getAuth(appAdmin);

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ─────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// ── Authentication Middleware ────────────────────────────────────
// Verifies Firebase JWT sent from frontend
async function verifyAuthToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }
  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (err) {
    console.error('[Auth Error]', err.message);
    return res.status(403).json({ error: 'Unauthorized: Invalid token' });
  }
}

// ══════════════════════════════════════════════════════════════
// API ROUTES
// ══════════════════════════════════════════════════════════════

// ── GET /api/victims ── all victims summary (for dashboard)
app.get('/api/victims', verifyAuthToken, async (req, res) => {
  try {
    const victimsSnap = await db.collection('victims').get();
    const interventionsSnap = await db.collection('interventions').get();
    const chatsSnap = await db.collection('chats').get();
    
    // Create lookup maps for faster access
    const intersByVictim = {};
    const chatsBySessionId = {};
    
    chatsSnap.forEach(doc => {
      chatsBySessionId[doc.id] = doc.data();
    });
    
    interventionsSnap.forEach(doc => {
      const data = doc.data();
      const vid = data.victim_id;
      if (vid) {
        // Keep the latest intervention for each victim
        if (!intersByVictim[vid] || (data.lastUpdated && intersByVictim[vid].lastUpdated && data.lastUpdated.toMillis() > intersByVictim[vid].lastUpdated.toMillis())) {
          intersByVictim[vid] = { id: doc.id, ...data };
        }
      }
    });
    
    let dashboardList = [];
    
    // Add all known victims
    victimsSnap.forEach(doc => {
      const victimId = doc.id;
      const vDict = doc.data();
      const interData = intersByVictim[victimId] || {};
      const sessionId = interData.id || null;
      const chatData = sessionId ? (chatsBySessionId[sessionId] || {}) : {};
      
      const chatHistory = chatData.chatHistory || [];
      let lastUserMsg = "";
      let lastAiReply = "";
      for (let i = chatHistory.length - 1; i >= 0; i--) {
        const msg = chatHistory[i];
        if (!lastAiReply && msg.role === 'assistant') lastAiReply = msg.text;
        if (!lastUserMsg && msg.role === 'user') lastUserMsg = msg.text;
        if (lastUserMsg && lastAiReply) break;
      }
      
      dashboardList.push({
        victim_id: victimId,
        session_id: sessionId || '',
        name: vDict.name || "Unknown",
        age: vDict.age,
        gender: vDict.gender,
        location: vDict.location,
        crime_category: vDict.crime_category || "N/A",
        case_status: vDict.case_status || "Active",
        assigned_counselor: vDict.assigned_counselor,
        victimProfile: chatData.victimProfile || "",
        message_transcript: lastUserMsg,
        ai_reply: lastAiReply,
        current_distress_score: interData.latestDistressScore !== undefined ? interData.latestDistressScore : (vDict.current_distress_score || 0),
        current_risk_level: interData.latestRiskLevel || vDict.current_risk_level || "Low",
        primary_emotion: interData.latestEmotion || vDict.latest_emotion || "Unknown",
        immediate_escalation: interData.needsEscalation !== undefined ? interData.needsEscalation : (vDict.needsEscalation || false),
        recommended_intervention: interData.recommendedIntervention || "None",
        actionable_link: interData.actionableLink || "",
        last_interaction: interData.lastUpdated && interData.lastUpdated.toDate ? interData.lastUpdated.toDate().toISOString() 
                        : (vDict.last_interaction && vDict.last_interaction.toDate ? vDict.last_interaction.toDate().toISOString() : (vDict.last_interaction || null))
      });
    });
    
    dashboardList.sort((a, b) => b.current_distress_score - a.current_distress_score);
    res.json({ victims: dashboardList });
  } catch (err) {
    console.error('[GET /api/victims]', err.message);
    res.status(500).json({ error: 'Failed to load victims' });
  }
});

// ── GET /api/victims/:id ── full victim detail (for profile + drawer)
app.get('/api/victims/:id', verifyAuthToken, async (req, res) => {
  try {
    const docSnap = await db.collection('victims').doc(req.params.id).get();
    
    if (!docSnap.exists) return res.status(404).json({ error: 'Victim not found' });
    
    const victim = docSnap.data();
    victim.victim_id = victim.victim_id || docSnap.id;
    if (victim.last_interaction && victim.last_interaction.toDate) {
      victim.last_interaction = victim.last_interaction.toDate().toISOString();
    }

    // Fetch chat history from the chats collection
    const chatsSnap = await db.collection('chats').where('victim_id', '==', req.params.id).limit(1).get();

    let history = [];
    if (!chatsSnap.empty) {
      const chatDoc = chatsSnap.docs[0].data();
      const chatHistory = chatDoc.chatHistory || [];
      
      let currentUserMsg = null;
      let currentAiMsg = null;
      let lastTime = chatDoc.lastUpdated && chatDoc.lastUpdated.toDate ? chatDoc.lastUpdated.toDate().toISOString() : new Date().toISOString();

      chatHistory.forEach((msg) => {
        if (msg.role === 'user') {
          if (currentUserMsg) {
            history.push({ timestamp: lastTime, user_message: currentUserMsg, ai_reply: currentAiMsg });
          }
          currentUserMsg = msg.text;
          currentAiMsg = null;
        } else if (msg.role === 'assistant') {
          currentAiMsg = msg.text;
          history.push({ timestamp: lastTime, user_message: currentUserMsg || '', ai_reply: currentAiMsg });
          currentUserMsg = null;
          currentAiMsg = null;
        }
      });
      if (currentUserMsg || currentAiMsg) {
         history.push({ timestamp: lastTime, user_message: currentUserMsg || '', ai_reply: currentAiMsg || '' });
      }
    }

    // Also fetch the last intervention state
    const interventionSnap = await db.collection('interventions').where('victim_id', '==', req.params.id).limit(1).get();
    if (history.length > 0 && !interventionSnap.empty) {
      const inv = interventionSnap.docs[0].data();
      const lastHist = history[history.length - 1];
      
      lastHist.latestDistressScore = inv.latestDistressScore;
      lastHist.latestRiskLevel = inv.latestRiskLevel;
      lastHist.needsEscalation = inv.needsEscalation;
      lastHist.recommendedIntervention = inv.recommendedIntervention;
      lastHist.actionableLink = inv.actionableLink || '';
      lastHist.action_taken = inv.action_taken;
      lastHist.action_taken_by = inv.action_taken_by;
      lastHist.action_taken_at = inv.lastUpdated && inv.lastUpdated.toDate ? inv.lastUpdated.toDate().toISOString() : inv.lastUpdated;
    }

    victim.history = history;
    res.json(victim);
  } catch (err) {
    console.error('[GET /api/victims/:id]', err.message);
    res.status(500).json({ error: 'Failed to load victim' });
  }
});

// ── POST /api/victims/:id/action ── mark latest interaction as action taken
app.post('/api/victims/:id/action', verifyAuthToken, async (req, res) => {
  try {
    const counselorId = req.user.email || 'Counselor';
    
    const interventionSnap = await db.collection('interventions').where('victim_id', '==', req.params.id).limit(1).get();
    if (!interventionSnap.empty) {
      await db.collection('interventions').doc(interventionSnap.docs[0].id).set({
        action_taken: true,
        action_taken_by: counselorId,
        action_taken_at: FieldValue.serverTimestamp(),
      }, { merge: true });
    }

    res.json({ success: true, message: 'Action marked as taken' });
  } catch (err) {
    console.error('[POST /api/victims/:id/action]', err.message);
    res.status(500).json({ error: 'Failed to mark action' });
  }
});

// ── POST /api/victims/:id/notes ── save case notes
app.post('/api/victims/:id/notes', verifyAuthToken, async (req, res) => {
  try {
    const counselorId = req.user.email || 'Counselor';
    
    await db.collection('victims').doc(req.params.id).set({
      case_notes: req.body.notes || '',
      notes_updated_at: FieldValue.serverTimestamp(),
      notes_updated_by: counselorId
    }, { merge: true });

    res.json({ success: true, message: 'Notes saved' });
  } catch (err) {
    console.error('[POST /api/victims/:id/notes]', err.message);
    res.status(500).json({ error: 'Failed to save notes' });
  }
});

// ── POST /api/auth/login ── placeholder (Firebase Client SDK handles real login)
app.post('/api/auth/login', (req, res) => {
  res.status(501).json({ error: 'Server-side auth not implemented. Use Firebase client SDK to login, then pass the token as a Bearer token.' });
});

// ── Catch-all: serve login.html for unmatched routes ──────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

// ── Start Server ───────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log('');
    console.log('  ██╗   ██╗██╗ ██████╗████████╗██╗███╗   ███╗ ██████╗ █████╗ ██████╗ ███████╗');
    console.log('  ██║   ██║██║██╔════╝╚══██╔══╝██║████╗ ████║██╔════╝██╔══██╗██╔══██╗██╔════╝');
    console.log('  ██║   ██║██║██║        ██║   ██║██╔████╔██║██║     ███████║██████╔╝█████╗  ');
    console.log('  ╚██╗ ██╔╝██║██║        ██║   ██║██║╚██╔╝██║██║     ██╔══██║██╔══██╗██╔══╝  ');
    console.log('   ╚████╔╝ ██║╚██████╗   ██║   ██║██║ ╚═╝ ██║╚██████╗██║  ██║██║  ██║███████╗');
    console.log('    ╚═══╝  ╚═╝ ╚═════╝   ╚═╝   ╚═╝╚═╝     ╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝');
    console.log('');
    console.log(`  🛡  Victim Care Admin Portal — http://localhost:${PORT}`);
    console.log(`  🔥  Connected to Firebase Live DB`);
    console.log(`  📁  Serving static files from: /public`);
    console.log('');
  });
}

export default app;
