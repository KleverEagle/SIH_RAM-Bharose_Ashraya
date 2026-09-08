// ═══════════════════════════════════════════════════════════
// utils.js — Shared Helper Functions (imported by all pages)
// ═══════════════════════════════════════════════════════════

'use strict';

/* ──────────────────────────────────────────────────────────
   AUTH GUARD
   ────────────────────────────────────────────────────────── */

/**
 * Enforces authentication on protected pages.
 * Redirects to /login.html if no valid session is found.
 * @returns {Object|null} The counselor session object or null.
 */
export function requireAuth() {
  const raw = sessionStorage.getItem('counselor_session');
  if (!raw) { window.location.replace('/login.html'); return null; }
  try {
    return JSON.parse(raw);
  } catch {
    sessionStorage.removeItem('counselor_session');
    window.location.replace('/login.html');
    return null;
  }
}

/**
 * Returns the current counselor session without redirecting.
 * @returns {Object|null}
 */
export function getSession() {
  try { return JSON.parse(sessionStorage.getItem('counselor_session')); }
  catch { return null; }
}

/**
 * Clears session and redirects to login.
 */
export function logout() {
  sessionStorage.removeItem('counselor_session');
  window.location.replace('/login.html');
}

/* ──────────────────────────────────────────────────────────
   RISK / BADGE HELPERS
   ────────────────────────────────────────────────────────── */

/**
 * Returns a styled HTML risk badge string.
 * @param {string} riskLevel — "Critical" | "High" | "Medium" | "Low"
 * @returns {string} HTML string
 */
export function getRiskBadgeHTML(riskLevel) {
  const map = {
    Critical: 'badge-critical',
    High:     'badge-high',
    Medium:   'badge-medium',
    Low:      'badge-low',
  };
  const cls   = map[riskLevel] || 'badge-low';
  const label = (riskLevel || 'Unknown').toUpperCase();
  return `<span class="risk-badge ${cls}">${label}</span>`;
}

/**
 * Returns the CSS class suffix for a risk level.
 * @param {string} riskLevel
 * @returns {string}
 */
export function getRiskClass(riskLevel) {
  const map = { Critical: 'critical', High: 'high', Medium: 'medium', Low: 'low' };
  return map[riskLevel] || 'low';
}

/**
 * Returns a colour-coded pill badge for a crime category.
 * Colours are subtle — matching the design system spec.
 * @param {string} category
 * @returns {string} HTML string
 */
export function getCrimeBadgeHTML(category) {
  const map = {
    'Witness Intimidation': 'cat-witness',
    'Domestic Abuse':       'cat-domestic',
    'Human Trafficking':    'cat-trafficking',
    'Sexual Assault':       'cat-sexual',
    'Child Abuse':          'cat-child',
    'War Crimes':           'cat-war',
    'Forced Displacement':  'cat-displacement',
  };
  const cls = map[category] || 'cat-default';
  return `<span class="category-badge ${cls}">${escapeHtml(category)}</span>`;
}

/**
 * Returns a case status badge HTML string.
 * @param {string} status — "Active" | "Monitoring" | "Closed"
 * @returns {string}
 */
export function getCaseStatusBadgeHTML(status) {
  const map = {
    Active:     { cls: 'status-active',     icon: 'fa-circle-dot' },
    Monitoring: { cls: 'status-monitoring', icon: 'fa-eye' },
    Closed:     { cls: 'status-closed',     icon: 'fa-circle-check' },
  };
  const { cls, icon } = map[status] || { cls: 'status-monitoring', icon: 'fa-circle' };
  return `<span class="case-status-badge ${cls}"><i class="fa-solid ${icon}"></i>${escapeHtml(status)}</span>`;
}

/* ──────────────────────────────────────────────────────────
   SCORE HELPERS
   ────────────────────────────────────────────────────────── */

/**
 * Returns a hex color for a given distress score.
 * @param {number} score
 * @returns {string}
 */
export function getScoreColor(score) {
  if (score >= 70) return '#DC2626';
  if (score >= 40) return '#F59E0B';
  return '#10B981';
}

/**
 * Returns both score color and a human label.
 * @param {number} score
 * @returns {{ color: string, label: string }}
 */
export function getScoreMeta(score) {
  if (score >= 70) return { color: '#DC2626', bg: 'rgba(220,38,38,0.09)', label: 'Critical/High' };
  if (score >= 40) return { color: '#F59E0B', bg: 'rgba(245,158,11,0.09)', label: 'Medium' };
  return { color: '#10B981', bg: 'rgba(16,185,129,0.09)', label: 'Low' };
}

/* ──────────────────────────────────────────────────────────
   TIME FORMATTING
   ────────────────────────────────────────────────────────── */

/**
 * Formats an ISO timestamp as a relative "time ago" string.
 * e.g. "2m ago", "3h ago", "1d ago"
 * @param {string} isoString
 * @returns {string}
 */
export function formatTimeAgo(isoString) {
  if (!isoString) return '—';
  const diffMs  = Date.now() - new Date(isoString).getTime();
  const diffSec = Math.floor(Math.abs(diffMs) / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr  = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr  / 24);
  const diffWk  = Math.floor(diffDay / 7);
  if (diffSec < 60)  return `${diffSec}s ago`;
  if (diffMin < 60)  return `${diffMin}m ago`;
  if (diffHr  < 24)  return `${diffHr}h ago`;
  if (diffDay < 7)   return `${diffDay}d ago`;
  if (diffWk  < 5)   return `${diffWk}w ago`;
  return formatDate(isoString);
}

/**
 * Formats an ISO string as "04 Sep 2026, 10:30 AM".
 * @param {string} isoString
 * @returns {string}
 */
export function formatDateTime(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

/**
 * Formats an ISO string as "04 Sep 2026".
 * @param {string} isoString
 * @returns {string}
 */
export function formatDate(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

/* ──────────────────────────────────────────────────────────
   SECURITY HELPER
   ────────────────────────────────────────────────────────── */

/**
 * Escapes a string for safe HTML insertion.
 * Always use this when inserting user or API data into innerHTML.
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ──────────────────────────────────────────────────────────
   API FETCH WRAPPER
   ────────────────────────────────────────────────────────── */

/**
 * Thin fetch() wrapper with consistent error handling.
 * @param {string} url        Relative or absolute URL
 * @param {RequestInit} opts  Standard fetch options
 * @returns {Promise<any>}    Parsed JSON response
 */
export async function apiFetch(url, opts = {}) {
  const session = getSession();
  const headers = {
    'Content-Type': 'application/json',
    ...(session && session.token ? { 'Authorization': `Bearer ${session.token}` } : {}),
    ...(opts.headers || {}),
  };
  const res = await fetch(url, { ...opts, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

/* ──────────────────────────────────────────────────────────
   TOAST NOTIFICATIONS
   ────────────────────────────────────────────────────────── */

const ICON_MAP = {
  success: 'fa-circle-check',
  error:   'fa-circle-xmark',
  warning: 'fa-triangle-exclamation',
  info:    'fa-circle-info',
};

/**
 * Displays a toast notification.
 * @param {string} message
 * @param {'success'|'error'|'info'|'warning'} type
 * @param {number} duration — ms before auto-dismiss
 */
export function showToast(message, type = 'info', duration = 4000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast-item toast-${type}`;
  toast.innerHTML = `
    <i class="fa-solid ${ICON_MAP[type] || 'fa-circle-info'}"></i>
    <span>${escapeHtml(message)}</span>
    <button class="toast-close-btn" aria-label="Dismiss">
      <i class="fa-solid fa-xmark"></i>
    </button>
  `;
  toast.querySelector('.toast-close-btn').addEventListener('click', () => dismissToast(toast));
  container.appendChild(toast);
  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));
  const timer = setTimeout(() => dismissToast(toast), duration);
  toast._timer = timer;
}

function dismissToast(toast) {
  clearTimeout(toast._timer);
  toast.classList.remove('show');
  setTimeout(() => toast.remove(), 350);
}

/* ──────────────────────────────────────────────────────────
   UTILITIES
   ────────────────────────────────────────────────────────── */

/**
 * Standard debounce.
 * @param {Function} fn
 * @param {number} delay ms
 * @returns {Function}
 */
export function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Initialises the sidebar toggle behaviour.
 * Called from every page that uses the sidebar layout.
 */
export function initSidebar() {
  const sidebar  = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  const toggleBtns = document.querySelectorAll('.topbar-toggle, .sidebar-toggle-btn');

  const isDesktop = () => window.innerWidth >= 992;

  // ── Icon swap helper ☰ ↔ ✕ ────────────────────────────
  function updateToggleIcon() {
    const icon = document.getElementById('topbar-toggle-icon');
    if (!icon || !sidebar) return;
    const isCollapsed = sidebar.classList.contains('collapsed');
    const isOpen      = sidebar.classList.contains('open');
    // Desktop: collapsed → ✕ | expanded → ☰
    // Mobile:  open → ✕     | closed   → ☰
    const showX = isDesktop() ? isCollapsed : isOpen;
    icon.className = showX
      ? 'fa-solid fa-xmark topbar-icon-swap'
      : 'fa-solid fa-bars topbar-icon-swap';
  }

  function openMobile() {
    sidebar.classList.add('open');
    backdrop.classList.add('show');
    document.body.style.overflow = 'hidden';
    updateToggleIcon();
  }
  function closeMobile() {
    sidebar.classList.remove('open');
    backdrop.classList.remove('show');
    document.body.style.overflow = '';
    updateToggleIcon();
  }
  function toggleDesktop() {
    sidebar.classList.toggle('collapsed');
    localStorage.setItem('sidebar_collapsed', sidebar.classList.contains('collapsed'));
    updateToggleIcon();
  }

  // Restore desktop collapse state
  if (isDesktop() && localStorage.getItem('sidebar_collapsed') === 'true') {
    sidebar.classList.add('collapsed');
  }

  // Set correct icon on page load
  updateToggleIcon();

  toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (isDesktop()) toggleDesktop();
      else if (sidebar.classList.contains('open')) closeMobile();
      else openMobile();
    });
  });

  backdrop?.addEventListener('click', closeMobile);

  window.addEventListener('resize', () => {
    if (isDesktop()) {
      closeMobile();
      document.body.style.overflow = '';
    }
    updateToggleIcon();
  });
}


/**
 * Highlights the active sidebar link based on current pathname.
 */
export function setActiveSidebarLink() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-item[data-page]').forEach(link => {
    const page = link.getAttribute('data-page');
    if (page === currentPath) link.classList.add('active');
    else link.classList.remove('active');
  });
}

/**
 * Populates topbar and sidebar user info from the session.
 */
export function renderUserInfo() {
  const session = getSession();
  if (!session) return;

  const topbarName = document.getElementById('topbar-user-name');
  const topbarAvatar = document.getElementById('topbar-user-avatar');
  const sidebarName = document.getElementById('sidebar-user-name');
  const sidebarRole = document.getElementById('sidebar-user-role');
  const sidebarAvatar = document.getElementById('sidebar-user-avatar');

  if (topbarName) topbarName.textContent = session.name;
  if (topbarAvatar) topbarAvatar.textContent = session.initials || session.name.slice(0,2).toUpperCase();
  if (sidebarName) sidebarName.textContent = session.name;
  if (sidebarRole) sidebarRole.textContent = session.role;
  if (sidebarAvatar) sidebarAvatar.textContent = session.initials || session.name.slice(0,2).toUpperCase();
}
