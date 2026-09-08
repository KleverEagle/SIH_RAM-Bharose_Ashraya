// ═══════════════════════════════════════════════════════════
// dashboard.js — Main Dashboard Logic
// Handles: auth, KPI cards, triage table, trend chart,
//          intervention drawer, search/filter, auto-refresh
// ═══════════════════════════════════════════════════════════

'use strict';

import {
  requireAuth, renderUserInfo, initSidebar, setActiveSidebarLink,
  apiFetch, getRiskBadgeHTML, getCrimeBadgeHTML, getRiskClass,
  getScoreColor, formatTimeAgo, formatDateTime, showToast, escapeHtml,
  logout,
} from './utils.js';



// ── State ──────────────────────────────────────────────────
let ALL_VICTIMS        = [];     // full dataset from API
let FILTERED_VICTIMS   = [];     // after search/filter
let activeFilter       = 'All';  // current risk filter
let searchQuery        = '';     // current search term
let trendChartInstance = null;   // Chart.js instance
let drawerOpen         = false;
let currentVictimId    = null;
let unsubscribeVictims = null;   // Firebase listener unsubscribe function

// ── Entry point ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  requireAuth();
  renderUserInfo();
  initSidebar();
  setActiveSidebarLink();
  initEventListeners();
  startRealtimeListener();
});

// ══════════════════════════════════════════════════════
// DATA LOADING (REAL-TIME)
// ══════════════════════════════════════════════════════

function startRealtimeListener() {
  loadDashboardData();
  // Poll every 30 seconds for real-time feel
  setInterval(() => loadDashboardData(true), 30000);
}

async function loadDashboardData(silent = false) {
  if (!silent) showSkeleton();

  try {
    const data = await apiFetch('/api/victims');
    ALL_VICTIMS = data.victims || [];

    applyFilters();
    renderKPICards();
    initSystemTrendChart();
    updateRefreshTimestamp();
    
    if (!silent) showToast('Dashboard loaded from API', 'success', 2000);
  } catch (error) {
    console.error('[Dashboard] API error:', error);
    showTableError(error.message);
  }
}

// Manual refresh function
async function loadDashboard(silent = false) {
  await loadDashboardData(silent);
}

// ══════════════════════════════════════════════════════
// AUTO-REFRESH (REMOVED)
// ══════════════════════════════════════════════════════

function updateRefreshTimestamp() {
  const el = document.getElementById('last-refresh-time');
  if (el) el.textContent = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ══════════════════════════════════════════════════════
// KPI CARDS
// ══════════════════════════════════════════════════════

function renderKPICards() {
  const counts = { Critical: 0, High: 0, Medium: 0, Low: 0, Total: ALL_VICTIMS.length };
  ALL_VICTIMS.forEach(v => { if (counts[v.current_risk_level] !== undefined) counts[v.current_risk_level]++; });

  setKPI('kpi-total',    counts.Total,    `${counts.Critical} critical need attention`);
  setKPI('kpi-critical', counts.Critical, `Immediate intervention required`);
  setKPI('kpi-high',     counts.High,     `Close monitoring needed`);
  setKPI('kpi-medium',   counts.Medium,   `Regular follow-up scheduled`);
  setKPI('kpi-low',      counts.Low,      `Stable — in recovery`);

  // Also update the nav badge for critical count
  const navBadge = document.getElementById('nav-critical-badge');
  if (navBadge) navBadge.textContent = counts.Critical || '';
}

function setKPI(id, value, sub) {
  const card = document.getElementById(id);
  if (!card) return;
  const valEl = card.querySelector('.kpi-value');
  const subEl = card.querySelector('.kpi-sub');
  if (subEl) subEl.textContent = sub;
  if (!valEl) return;

  // Count-up animation from 0 → value
  const start    = 0;
  const end      = Number(value) || 0;
  const duration = 600; // ms
  const startTs  = performance.now();

  valEl.classList.remove('counting');
  void valEl.offsetWidth; // reflow to restart animation
  valEl.classList.add('counting');

  function step(ts) {
    const elapsed  = ts - startTs;
    const progress = Math.min(elapsed / duration, 1);
    // Ease-out curve
    const eased = 1 - Math.pow(1 - progress, 3);
    valEl.textContent = Math.round(start + (end - start) * eased);
    if (progress < 1) requestAnimationFrame(step);
    else valEl.textContent = end; // ensure exact final value
  }

  requestAnimationFrame(step);
}

// ══════════════════════════════════════════════════════
// TRIAGE TABLE
// ══════════════════════════════════════════════════════

function applyFilters() {
  let result = [...ALL_VICTIMS];

  // Risk level filter
  if (activeFilter !== 'All') {
    result = result.filter(v => v.current_risk_level === activeFilter);
  }

  // Search filter (ID, name, location, category)
  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    result = result.filter(v =>
      v.victim_id.toLowerCase().includes(q) ||
      v.name.toLowerCase().includes(q) ||
      (v.location || '').toLowerCase().includes(q) ||
      v.crime_category.toLowerCase().includes(q)
    );
  }

  FILTERED_VICTIMS = result;
  renderTable();
  updateResultCount();
}

function renderTable() {
  const tbody = document.getElementById('triage-tbody');
  if (!tbody) return;

  if (FILTERED_VICTIMS.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state">
            <div class="empty-state-icon"><i class="fa-solid fa-magnifying-glass"></i></div>
            <div class="empty-state-title">No results found</div>
            <div class="empty-state-sub">Try adjusting your search or filter criteria.</div>
          </div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = FILTERED_VICTIMS.map((v, i) => buildRow(v, i)).join('');
  attachRowListeners();
}

function buildRow(v, idx) {
  const riskClass   = getRiskClass(v.current_risk_level);
  const scoreColor  = getScoreColor(v.current_distress_score);
  const isCritical  = v.current_risk_level === 'Critical';

  return `
    <tr class="${isCritical ? 'row-critical' : ''} row-risk-${v.current_risk_level.toLowerCase()}"
        data-id="${escapeHtml(v.victim_id)}">
      <td>
        <a href="/victim-profile.html?id=${encodeURIComponent(v.victim_id)}"
           class="victim-id-link">${escapeHtml(v.victim_id)}</a>
      </td>
      <td>
        <div class="victim-name-cell">
          <span class="victim-name">${escapeHtml(v.name)}</span>
          <span class="victim-location"><i class="fa-solid fa-location-dot" style="font-size:10px;margin-right:3px;"></i>${escapeHtml(v.location || '—')}</span>
        </div>
      </td>
      <td>${getCrimeBadgeHTML(v.crime_category)}</td>
      <td>
        <div class="score-cell">
          <span class="score-num" style="color:${scoreColor}">${v.current_distress_score}</span>
          <div class="score-bar-bg">
            <div class="score-bar-fill"
                 style="width:${v.current_distress_score}%;background:${scoreColor}"></div>
          </div>
        </div>
      </td>
      <td>${getRiskBadgeHTML(v.current_risk_level)}</td>
      <td><span class="last-seen">${formatTimeAgo(v.last_interaction)}</span></td>
      <td>
        <button class="action-btn open-drawer-btn"
                data-id="${escapeHtml(v.victim_id)}"
                title="Open Intervention Panel"
                aria-label="Open intervention panel for ${escapeHtml(v.victim_id)}">
          <i class="fa-solid fa-eye"></i>
        </button>
      </td>
    </tr>`;
}

function attachRowListeners() {
  document.querySelectorAll('.open-drawer-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      openInterventionDrawer(id);
    });
  });
}

function updateResultCount() {
  const el = document.getElementById('result-count');
  if (el) {
    el.textContent = `Showing ${FILTERED_VICTIMS.length} of ${ALL_VICTIMS.length} victims`;
  }
}

// ── Skeleton Loading ────────────────────────────────────────
function showSkeleton() {
  const tbody = document.getElementById('triage-tbody');
  if (!tbody) return;
  tbody.innerHTML = Array(5).fill(0).map(() => `
    <tr class="skeleton-row">
      <td><div class="skeleton-block" style="width:70px"></div></td>
      <td><div class="skeleton-block" style="width:120px;margin-bottom:6px"></div><div class="skeleton-block" style="width:80px;height:10px"></div></td>
      <td><div class="skeleton-block" style="width:140px"></div></td>
      <td><div class="skeleton-block" style="width:60px;margin-bottom:6px"></div><div class="skeleton-block" style="height:4px"></div></td>
      <td><div class="skeleton-block" style="width:80px;height:22px;border-radius:20px"></div></td>
      <td><div class="skeleton-block" style="width:50px"></div></td>
      <td><div class="skeleton-block" style="width:32px;height:32px;border-radius:8px"></div></td>
    </tr>`).join('');
}

function showTableError(msg) {
  const tbody = document.getElementById('triage-tbody');
  if (!tbody) return;
  tbody.innerHTML = `
    <tr><td colspan="7">
      <div class="empty-state">
        <div class="empty-state-icon" style="color:var(--color-critical)"><i class="fa-solid fa-triangle-exclamation"></i></div>
        <div class="empty-state-title">Failed to load data</div>
        <div class="empty-state-sub">${escapeHtml(msg)}</div>
      </div>
    </td></tr>`;
}

// ══════════════════════════════════════════════════════
// SYSTEM TREND CHART (Chart.js — right panel)
// Shows average distress score across all victims
// using the most recent score from each victim's history
// ══════════════════════════════════════════════════════

function initSystemTrendChart() {
  const canvas = document.getElementById('system-trend-chart');
  if (!canvas) return;

  // Build per-risk-level average scores for the bar/doughnut summary
  const riskCounts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  ALL_VICTIMS.forEach(v => { if (riskCounts[v.current_risk_level] !== undefined) riskCounts[v.current_risk_level]++; });

  const scores = ALL_VICTIMS.map(v => v.current_distress_score).sort((a, b) => a - b);

  if (trendChartInstance) { trendChartInstance.destroy(); trendChartInstance = null; }

  trendChartInstance = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: ALL_VICTIMS.map(v => v.victim_id),
      datasets: [{
        label: 'Distress Score',
        data: ALL_VICTIMS.map(v => v.current_distress_score),
        backgroundColor: ALL_VICTIMS.map(v => {
          const c = getScoreColor(v.current_distress_score);
          return c + '28'; // 16% opacity
        }),
        borderColor: ALL_VICTIMS.map(v => getScoreColor(v.current_distress_score)),
        borderWidth: 2,
        borderRadius: 5,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => {
              const victim = ALL_VICTIMS.find(v => v.victim_id === items[0].label);
              return victim ? `${victim.victim_id} — ${victim.name}` : items[0].label;
            },
            label: (item) => ` Distress Score: ${item.raw}`,
          },
          backgroundColor: '#1E293B',
          titleFont: { size: 12, weight: '600' },
          bodyFont:  { size: 13 },
          padding: 10, cornerRadius: 8,
        },
      },
      scales: {
        y: {
          min: 0, max: 100,
          grid: { color: 'rgba(0,0,0,0.04)' },
          ticks: { font: { size: 11 }, color: '#94A3B8', stepSize: 25 },
        },
        x: {
          grid: { display: false },
          ticks: { font: { size: 10 }, color: '#94A3B8', maxRotation: 45 },
        },
      },
    },
  });
}

// ══════════════════════════════════════════════════════
// INTERVENTION DRAWER
// ══════════════════════════════════════════════════════

async function openInterventionDrawer(victimId) {
  const drawer   = document.getElementById('intervention-drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  if (!drawer || !backdrop) return;

  currentVictimId = victimId;

  // Show drawer immediately with loading state
  drawerOpen = true;
  drawer.classList.add('open');
  backdrop.classList.add('open');
  document.body.style.overflow = 'hidden';
  renderDrawerLoading();

  try {
    const victim = await apiFetch(`/api/victims/${encodeURIComponent(victimId)}`);
    renderDrawerContent(victim);
  } catch (err) {
    renderDrawerError(err.message);
    console.error('[Drawer] Load error:', err);
  }
}

function closeInterventionDrawer() {
  const drawer   = document.getElementById('intervention-drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  drawer?.classList.remove('open');
  backdrop?.classList.remove('open');
  document.body.style.overflow = '';
  drawerOpen = false;
  currentVictimId = null;
}

function renderDrawerContent(victim) {
  const latest  = victim.history?.[victim.history.length - 1] || {};
  const riskCls = getRiskClass(victim.current_risk_level).toLowerCase();

  // Header
  document.getElementById('drawer-victim-id').textContent   = victim.victim_id;
  document.getElementById('drawer-victim-name').textContent = victim.name;
  document.getElementById('drawer-badges').innerHTML =
    getRiskBadgeHTML(victim.current_risk_level) +
    getCrimeBadgeHTML(victim.crime_category);

  // Score banner
  const banner = document.getElementById('drawer-score-banner');
  banner.className = `drawer-score-banner ${riskCls}`;
  const scoreColor = getScoreColor(victim.current_distress_score);
  document.getElementById('drawer-score-num').textContent    = victim.current_distress_score;
  document.getElementById('drawer-score-num').style.color    = scoreColor;
  document.getElementById('drawer-score-label').textContent  = 'Distress Score';
  document.getElementById('drawer-score-sublabel').textContent = `${victim.current_risk_level} Risk — ${formatTimeAgo(victim.last_interaction)}`;

  // Chat bubbles
  document.getElementById('drawer-chat').innerHTML = latest.user_message ? `
    <div class="chat-meta">Survivor said:</div>
    <div class="chat-bubble chat-user">${escapeHtml(latest.user_message)}</div>
    <div class="chat-meta" style="margin-top:8px">AI Companion responded:</div>
    <div class="chat-bubble chat-ai">${escapeHtml(latest.ai_reply || '—')}</div>
    <div style="font-size:11.5px;color:var(--color-text-muted);margin-top:8px;">
      <i class="fa-regular fa-clock"></i> ${formatDateTime(latest.timestamp)}
    </div>
  ` : '<div class="last-seen">No conversation history found.</div>';

  // Recommended action
  const isActionCritical = victim.current_risk_level === 'Critical';
  document.getElementById('drawer-recommended-action').innerHTML = `
    <div class="recommended-action-card ${isActionCritical ? 'critical-action' : ''}">
      <div class="rec-action-label">
        <i class="fa-solid ${isActionCritical ? 'fa-circle-exclamation' : 'fa-lightbulb'}"></i>
        AI Recommended Action
      </div>
      <div class="rec-action-text">${escapeHtml(latest.recommended_action || 'No recommendation available.')}</div>
    </div>`;

  // Action status
  const statusEl = document.getElementById('drawer-action-status');
  if (latest.action_taken) {
    statusEl.innerHTML = `
      <div class="action-status taken">
        <i class="fa-solid fa-circle-check"></i>
        Action taken by ${escapeHtml(latest.action_taken_by)} — ${formatTimeAgo(latest.action_taken_at)}
      </div>`;
  } else {
    statusEl.innerHTML = `
      <div class="action-status pending">
        <i class="fa-solid fa-clock"></i>
        Pending — action not yet taken
      </div>`;
  }

  // Action button
  const btn = document.getElementById('btn-action-taken');
  if (btn) {
    if (latest.action_taken) {
      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-circle-check"></i> Action Already Taken`;
    } else {
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-check"></i> Mark as Action Taken`;
      btn.onclick = () => handleMarkActionTaken(victim.victim_id, btn);
    }
  }

  // View profile link
  const profileLink = document.getElementById('drawer-profile-link');
  if (profileLink) {
    profileLink.href = `/victim-profile.html?id=${encodeURIComponent(victim.victim_id)}`;
  }
}

function renderDrawerLoading() {
  // Simple loading state while fetching
  const fields = ['drawer-victim-id','drawer-victim-name','drawer-badges',
                  'drawer-chat','drawer-recommended-action','drawer-action-status'];
  document.getElementById('drawer-victim-id').textContent   = 'Loading...';
  document.getElementById('drawer-victim-name').textContent = '—';
  document.getElementById('drawer-badges').innerHTML        = '';
  document.getElementById('drawer-chat').innerHTML          = '<div class="last-seen" style="padding:20px;text-align:center;"><i class="fa-solid fa-spinner fa-spin"></i> Loading conversation...</div>';
  document.getElementById('drawer-recommended-action').innerHTML = '';
  document.getElementById('drawer-action-status').innerHTML      = '';
}

function renderDrawerError(msg) {
  document.getElementById('drawer-chat').innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon" style="color:var(--color-critical)"><i class="fa-solid fa-triangle-exclamation"></i></div>
      <div class="empty-state-title">Failed to load</div>
      <div class="empty-state-sub">${escapeHtml(msg)}</div>
    </div>`;
}

// ── Mark action taken ───────────────────────────────────────
async function handleMarkActionTaken(victimId, btn) {
  const session = JSON.parse(sessionStorage.getItem('counselor_session') || '{}');
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing...`;

  try {
    await apiFetch(`/api/victims/${encodeURIComponent(victimId)}/action`, {
      method: 'POST',
      body: JSON.stringify({ counselor_id: session.id }),
    });
    showToast('Action successfully marked as taken.', 'success');
    btn.innerHTML = `<i class="fa-solid fa-circle-check"></i> Action Taken`;

    // Update status in drawer
    const statusEl = document.getElementById('drawer-action-status');
    statusEl.innerHTML = `
      <div class="action-status taken">
        <i class="fa-solid fa-circle-check"></i>
        Action taken by ${escapeHtml(session.id)} — just now
      </div>`;

    // Silently reload table data
    await loadDashboard(true);
  } catch (err) {
    showToast('Failed to mark action: ' + err.message, 'error');
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-check"></i> Mark as Action Taken`;
  }
}

// ══════════════════════════════════════════════════════
// EVENT LISTENERS
// ══════════════════════════════════════════════════════

function initEventListeners() {
  // Close drawer
  document.getElementById('close-drawer-btn')?.addEventListener('click', closeInterventionDrawer);
  document.getElementById('drawer-backdrop')?.addEventListener('click', closeInterventionDrawer);

  // ESC key closes drawer
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawerOpen) closeInterventionDrawer();
  });

  // Search input
  const searchEl = document.getElementById('triage-search');
  if (searchEl) {
    searchEl.addEventListener('input', () => {
      searchQuery = searchEl.value;
      applyFilters();
    });
  }

  // Risk filter buttons
  document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn[data-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.getAttribute('data-filter');
      applyFilters();
    });
  });

  // Manual refresh button
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.classList.add('spinning');
      await loadDashboard(false);
      refreshBtn.classList.remove('spinning');
      showToast('Dashboard refreshed', 'success', 2000);
    });
  }

  // Logout button
  document.getElementById('logout-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Are you sure you want to log out?')) logout();
  });
}
