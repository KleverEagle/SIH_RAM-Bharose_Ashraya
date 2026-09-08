// ═══════════════════════════════════════════════════════════════
// public/js/firebase-client.js — Firebase Client Initialization
// ═══════════════════════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDUo_l8oBYmD7DiEoqm9ly-l9Aangb3TLE",
  authDomain: "hackathon-ram-bharose.firebaseapp.com",
  projectId: "hackathon-ram-bharose",
  storageBucket: "hackathon-ram-bharose.firebasestorage.app",
  messagingSenderId: "1047559979719",
  appId: "1:1047559979719:web:51d59bd4009835f71bb4e2",
  measurementId: "G-0SD6MMMTNF"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
