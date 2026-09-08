// ═══════════════════════════════════════════════════════════
// victim-profile.js — Full Victim Profile Page Logic
// Handles: fetch victim by ?id=, render header, distress chart,
//          session transcripts, actions log, and case notes.
// ═══════════════════════════════════════════════════════════

'use strict';

import {
  requireAuth, renderUserInfo, initSidebar, setActiveSidebarLink,
  apiFetch, getRiskBadgeHTML, getCrimeBadgeHTML, getCaseStatusBadgeHTML,
  getScoreColor, getScoreMeta, formatTimeAgo, formatDateTime, formatDate,
  showToast, escapeHtml,
} from './utils.js';

// ── State ──────────────────────────────────────────────────
let victimData      = null;
let historyChart    = null;

// ── Entry Point ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  requireAuth();
  renderUserInfo();
  initSidebar();
  setActiveSidebarLink();

  const params   = new URLSearchParams(window.location.search);
  const victimId = params.get('id');

  if (!victimId) {
    showErrorState('No victim ID provided in the URL.');
    return;
  }

  await loadVictimProfile(victimId);
  initCaseNotesHandler();
});

// ══════════════════════════════════════════════════════
// DATA LOADING
// ══════════════════════════════════════════════════════

async function loadVictimProfile(victimId) {
  showLoadingState();

  try {
    victimData = await apiFetch(`/api/victims/${encodeURIComponent(victimId)}`);
    hideLoadingState();
    renderProfile(victimData);
  } catch (err) {
    hideLoadingState();
    showErrorState(err.message);
    console.error('[Profile] Load error:', err);
  }
}

// ══════════════════════════════════════════════════════
// RENDER ORCHESTRATOR
// ══════════════════════════════════════════════════════

function renderProfile(victim) {
  document.title = `${victim.victim_id} — Ashraya Admin`;
  document.getElementById('profile-content').style.display = '';

  renderProfileHeader(victim);
  renderDistressChart(victim);
  renderQuickStats(victim);
  renderSessionTranscripts(victim);
  renderActionsLog(victim);
  renderCaseNotes(victim);
}

// ══════════════════════════════════════════════════════
// PROFILE HEADER
// ══════════════════════════════════════════════════════

function renderProfileHeader(victim) {
  const riskClass = victim.current_risk_level?.toLowerCase() || 'low';
  const scoreColor = getScoreColor(victim.current_distress_score);

  // Profile accent color based on risk
  const accentMap = { critical: '#DC2626', high: '#EF4444', medium: '#F59E0B', low: '#10B981' };
  document.getElementById('profile-header-card').style.setProperty(
    '--profile-accent', accentMap[riskClass] || '#1E3A8A'
  );

  // Avatar initials from first letters of name
  const initials = victim.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  document.getElementById('profile-avatar').textContent = initials;

  document.getElementById('profile-victim-id').textContent = victim.victim_id;
  document.getElementById('profile-name').textContent      = victim.name;

  document.getElementById('profile-badges').innerHTML =
    getRiskBadgeHTML(victim.current_risk_level) +
    getCrimeBadgeHTML(victim.crime_category) +
    getCaseStatusBadgeHTML(victim.case_status);

  // Meta fields
  setProfileMeta('profile-age',         `${victim.age || '—'} yrs, ${victim.gender || '—'}`);
  setProfileMeta('profile-location',    victim.location || '—');
  setProfileMeta('profile-counselor',   victim.assigned_counselor || '—');
  setProfileMeta('profile-registered',  formatDate(victim.registered_date));

  // Stats (right side)
  const historyLen = victim.history?.length || 0;
  document.getElementById('profile-score-value').textContent = victim.current_distress_score;
  document.getElementById('profile-score-value').style.color = scoreColor;
  document.getElementById('profile-sessions-value').textContent = historyLen;
  document.getElementById('profile-lastseen-value').textContent = formatTimeAgo(victim.last_interaction);
}

function setProfileMeta(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

// ══════════════════════════════════════════════════════
// DISTRESS HISTORY CHART (Chart.js — full history)
// ══════════════════════════════════════════════════════

function renderDistressChart(victim) {
  const canvas = document.getElementById('distress-history-chart');
  if (!canvas || !victim.history?.length) return;

  const labels = victim.history.map(h =>
    new Date(h.timestamp).toLocaleDateString('en-IN', { month: 'short', day: '2-digit' })
  );
  const scores = victim.history.map(h => h.distress_score);
  const latest = scores[scores.length - 1];
  const lineColor = getScoreColor(latest);

  if (historyChart) { historyChart.destroy(); historyChart = null; }

  // Build gradient
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 260);
  gradient.addColorStop(0,   lineColor + '30');
  gradient.addColorStop(1,   lineColor + '00');

  historyChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Distress Score',
        data: scores,
        borderColor: lineColor,
        backgroundColor: gradient,
        tension: 0.4,
        fill: true,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: lineColor,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        borderWidth: 2.5,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1E293B',
          titleFont: { size: 12, weight: '600' },
          bodyFont:  { size: 13 },
          padding: 12, cornerRadius: 8,
          callbacks: {
            label: (item) => ` Distress: ${item.raw}`,
            afterLabel: (item) => {
              const entry = victim.history[item.dataIndex];
              return entry?.recommended_action
                ? `\n 📌 ${entry.recommended_action.slice(0, 60)}${entry.recommended_action.length > 60 ? '…' : ''}`
                : '';
            },
          },
        },
      },
      scales: {
        y: {
          min: 0, max: 100,
          grid: { color: 'rgba(0,0,0,0.04)' },
          ticks: {
            color: '#94A3B8', font: { size: 11 },
            callback: v => `${v}`,
          },
        },
        x: {
          grid: { display: false },
          ticks: { color: '#94A3B8', font: { size: 11 } },
        },
      },
    },
  });
}

// ══════════════════════════════════════════════════════
// QUICK STATS SIDEBAR
// ══════════════════════════════════════════════════════

function renderQuickStats(victim) {
  const container = document.getElementById('quick-stats-list');
  if (!container) return;

  const history   = victim.history || [];
  const scores    = history.map(h => h.distress_score);
  const avgScore  = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : '—';
  const maxScore  = scores.length ? Math.max(...scores) : '—';
  const minScore  = scores.length ? Math.min(...scores) : '—';
  const pending   = history.filter(h => !h.action_taken).length;
  const done      = history.filter(h =>  h.action_taken).length;

  const items = [
    { label: 'Avg. Distress Score', value: avgScore },
    { label: 'Peak Score',          value: maxScore },
    { label: 'Lowest Score',        value: minScore },
    { label: 'Actions Pending',     value: pending, accent: pending > 0 ? 'var(--color-medium)' : 'var(--color-low)' },
    { label: 'Actions Completed',   value: done,    accent: 'var(--color-low)' },
    { label: 'Assigned To',         value: victim.assigned_counselor || '—' },
  ];

  container.innerHTML = items.map(it => `
    <div class="quick-stat-item">
      <span class="quick-stat-label">${escapeHtml(it.label)}</span>
      <span class="quick-stat-value" ${it.accent ? `style="color:${it.accent}"` : ''}>
        ${escapeHtml(String(it.value))}
      </span>
    </div>`).join('');
}

// ══════════════════════════════════════════════════════
// SESSION TRANSCRIPTS (Real-Time)
// ══════════════════════════════════════════════════════

import { db } from './firebase-client.js';
import { collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

let unsubscribeChats = null;

function renderSessionTranscripts(victim) {
  const container = document.getElementById('transcript-list');
  if (!container) return;

  // We will listen to real-time updates directly from Firestore instead of using the API data
  if (unsubscribeChats) unsubscribeChats();

  const chatsRef = collection(db, 'chats', victim.victim_id, 'messages');
  const q = query(chatsRef, orderBy('timestamp', 'asc'));

  unsubscribeChats = onSnapshot(q, (snapshot) => {
    let history = [];
    let currentUserMsg = null;
    let currentAiMsg = null;
    let lastTime = null;
    let distress_score = victim.current_distress_score; // fallback

    snapshot.docs.forEach((d) => {
      const msg = d.data();
      const timeStr = msg.timestamp && msg.timestamp.toDate ? msg.timestamp.toDate().toISOString() : new Date().toISOString();
      if (msg.distress_score) distress_score = msg.distress_score;

      if (msg.role === 'user') {
        if (currentUserMsg) history.push({ timestamp: lastTime, user_message: currentUserMsg, ai_reply: currentAiMsg, distress_score });
        currentUserMsg = msg.text;
        currentAiMsg = null;
        lastTime = timeStr;
      } else if (msg.role === 'assistant') {
        currentAiMsg = msg.text;
        lastTime = timeStr;
        history.push({ timestamp: lastTime, user_message: currentUserMsg || '', ai_reply: currentAiMsg, distress_score });
        currentUserMsg = null;
        currentAiMsg = null;
      }
    });

    if (currentUserMsg || currentAiMsg) {
       history.push({ timestamp: lastTime, user_message: currentUserMsg || '', ai_reply: currentAiMsg || '', distress_score });
    }

    // Attach latest intervention status to the very last message in history
    if (history.length > 0 && victim.history && victim.history.length > 0) {
        const latestFromApi = victim.history[victim.history.length - 1];
        history[history.length - 1].action_taken = latestFromApi.action_taken;
        history[history.length - 1].action_taken_by = latestFromApi.action_taken_by;
        history[history.length - 1].action_taken_at = latestFromApi.action_taken_at;
        history[history.length - 1].recommended_action = latestFromApi.recommended_action;
    }

    history.reverse(); // newest first

    if (!history.length) {
      container.innerHTML = '<div class="last-seen" style="padding:24px;">No session transcripts found.</div>';
      return;
    }

    container.innerHTML = history.map((entry, idx) => {
      const scoreColor = getScoreColor(entry.distress_score || victim.current_distress_score);
      const sessionNum = history.length - idx;
      return `
        <div class="transcript-entry anim-fade-up" style="animation-delay:${idx * 0.06}s">
          <div class="transcript-meta">
            <div class="transcript-timestamp">
              <i class="fa-regular fa-calendar-check"></i>
              Session ${sessionNum} &mdash; ${formatDateTime(entry.timestamp)}
            </div>
            <span class="transcript-score risk-badge" style="background:${scoreColor}18;color:${scoreColor};border:1px solid ${scoreColor}30;">
              Score: ${entry.distress_score || victim.current_distress_score}
            </span>
          </div>
          <div class="transcript-chat">
            <div class="chat-bubble bubble-user">
              <div class="bubble-label">Survivor</div>
              ${escapeHtml(entry.user_message || '—')}
            </div>
            <div class="chat-bubble bubble-ai">
              <div class="bubble-label">AI Companion</div>
              ${escapeHtml(entry.ai_reply || '—')}
            </div>
          </div>
          <div class="transcript-action">
            <div class="transcript-action-icon"><i class="fa-solid fa-lightbulb"></i></div>
            <div>
              <div class="transcript-action-text">
                <strong>Recommended:</strong> ${escapeHtml(entry.recommended_action || 'No recommendation available yet')}
              </div>
              ${entry.action_taken ? `
                <div class="transcript-action-taken">
                  <i class="fa-solid fa-circle-check"></i>
                  Actioned by ${escapeHtml(entry.action_taken_by)} — ${formatTimeAgo(entry.action_taken_at)}
                </div>` : `
                <div style="font-size:11.5px;color:var(--color-medium);font-weight:600;margin-top:5px;">
                  <i class="fa-solid fa-clock"></i> Action pending
                </div>`}
            </div>
          </div>
        </div>`;
    }).join('');
  });
}

// ══════════════════════════════════════════════════════
// RECOMMENDED ACTIONS LOG
// ══════════════════════════════════════════════════════

function renderActionsLog(victim) {
  const container = document.getElementById('actions-log');
  if (!container) return;

  const history = [...(victim.history || [])].reverse();

  if (!history.length) {
    container.innerHTML = '<div class="last-seen" style="padding:24px;">No actions recorded.</div>';
    return;
  }

  container.innerHTML = history.map((entry, idx) => {
    const done   = entry.action_taken;
    const iconCls = done ? 'done'    : 'pending';
    const icon    = done ? 'fa-circle-check' : 'fa-clock';
    const badgeCls = done ? 'done'   : 'pending';
    const badgeTxt = done ? 'Done'   : 'Pending';

    return `
      <div class="action-log-item">
        <div class="action-log-icon ${iconCls}">
          <i class="fa-solid ${icon}"></i>
        </div>
        <div class="action-log-body">
          <div class="action-log-text">${escapeHtml(entry.recommended_action || 'No action recorded')}</div>
          <div class="action-log-meta">
            ${formatDateTime(entry.timestamp)}
            ${done ? ` &mdash; Actioned by ${escapeHtml(entry.action_taken_by)}` : ''}
          </div>
        </div>
        <span class="action-log-badge ${badgeCls}">${badgeTxt}</span>
      </div>`;
  }).join('');
}

// ══════════════════════════════════════════════════════
// CASE NOTES
// ══════════════════════════════════════════════════════

function renderCaseNotes(victim) {
  const textarea = document.getElementById('case-notes-textarea');
  const savedEl  = document.getElementById('notes-last-saved');
  if (!textarea) return;

  // Set existing notes
  textarea.value = victim.case_notes || '';

  if (victim.notes_updated_at && savedEl) {
    savedEl.textContent = `Last saved ${formatTimeAgo(victim.notes_updated_at)} by ${victim.notes_updated_by || 'system'}`;
  } else if (savedEl) {
    savedEl.textContent = 'No notes saved yet.';
  }
}

function initCaseNotesHandler() {
  const saveBtn  = document.getElementById('save-notes-btn');
  const textarea = document.getElementById('case-notes-textarea');
  const savedEl  = document.getElementById('notes-last-saved');

  saveBtn?.addEventListener('click', async () => {
    if (!victimData) return;
    const session = JSON.parse(sessionStorage.getItem('counselor_session') || '{}');

    saveBtn.disabled = true;
    saveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving...`;

    try {
      await apiFetch(`/api/victims/${encodeURIComponent(victimData.victim_id)}/notes`, {
        method: 'POST',
        body: JSON.stringify({
          notes: textarea?.value || '',
          counselor_id: session.id,
        }),
      });
      showToast('Case notes saved successfully.', 'success');
      if (savedEl) savedEl.textContent = `Last saved just now by ${session.id}`;
    } catch (err) {
      showToast('Failed to save notes: ' + err.message, 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Save Notes`;
    }
  });
}

// ══════════════════════════════════════════════════════
// LOADING / ERROR STATES
// ══════════════════════════════════════════════════════

function showLoadingState() {
  document.getElementById('profile-loading').style.display = 'flex';
  document.getElementById('profile-content').style.display = 'none';
  document.getElementById('profile-error').style.display   = 'none';
}
function hideLoadingState() {
  document.getElementById('profile-loading').style.display = 'none';
}
function showErrorState(msg) {
  document.getElementById('profile-loading').style.display  = 'none';
  document.getElementById('profile-content').style.display  = 'none';
  document.getElementById('profile-error').style.display    = 'flex';
  const msgEl = document.getElementById('profile-error-msg');
  if (msgEl) msgEl.textContent = msg;
}
