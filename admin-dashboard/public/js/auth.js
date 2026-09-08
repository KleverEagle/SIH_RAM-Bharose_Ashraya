// ═══════════════════════════════════════════════════════════
// auth.js — Counselor Login Handler (Firebase Auth Integrated)
// ═══════════════════════════════════════════════════════════

import { auth } from './firebase-client.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";

// ══════════════════════════════════════════════════════════
// DOM REFERENCES
// ══════════════════════════════════════════════════════════

// Modal
const btnOpenModal     = document.getElementById('btn-open-modal');
const btnCloseModal    = document.getElementById('btn-close-modal');
const modalBackdrop    = document.getElementById('auth-modal-backdrop');
const authModal        = document.getElementById('auth-modal');

// Tabs
const tabSignIn        = document.getElementById('tab-signin');
const tabSignUp        = document.getElementById('tab-signup');
const panelSignIn      = document.getElementById('panel-signin');
const panelSignUp      = document.getElementById('panel-signup');
const tabsContainer    = authModal?.querySelector('.auth-tabs');

// Sign In Form
const loginForm        = document.getElementById('login-form');
const counselorIdEl    = document.getElementById('counselor-id'); // Now used for email
const passwordEl       = document.getElementById('password');
const errorEl          = document.getElementById('login-error');
const errorMsgEl       = document.getElementById('login-error-msg');
const btnLoginEl       = document.getElementById('login-btn');
const btnTextEl        = document.getElementById('btn-text');
const btnSpinnerEl     = document.getElementById('btn-spinner');
const togglePassBtn    = document.getElementById('toggle-password');
const checkIdIcon      = document.getElementById('check-counselor-id');
const rememberMeEl     = document.getElementById('remember-me');
const needHelpLink     = document.getElementById('need-help-link');
const helpTooltip      = document.getElementById('help-tooltip');

// Sign Up Form
const signupForm       = document.getElementById('signup-form');
const signupSuccess    = document.getElementById('signup-success');
const toggleSignupPass = document.getElementById('toggle-signup-password');

// ══════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {

  // Already authenticated? Go to dashboard immediately.
  if (sessionStorage.getItem('counselor_session')) {
    window.location.replace('/index.html');
    return;
  }

  // ── Modal Controls ────────────────────────────────────
  btnOpenModal?.addEventListener('click',  openModal);
  btnCloseModal?.addEventListener('click', closeModal);
  modalBackdrop?.addEventListener('click', closeModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // ── Tab Switching ─────────────────────────────────────
  tabSignIn?.addEventListener('click', () => switchTab('signin'));
  tabSignUp?.addEventListener('click', () => switchTab('signup'));

  // ── Sign In Form ──────────────────────────────────────
  loginForm?.addEventListener('submit',    handleLoginSubmit);
  togglePassBtn?.addEventListener('click', () => togglePasswordVisibility(passwordEl, togglePassBtn));

  // Auto-lowercase email + live validation
  counselorIdEl?.addEventListener('input', () => {
    const pos = counselorIdEl.selectionStart;
    counselorIdEl.value = counselorIdEl.value.toLowerCase();
    counselorIdEl.setSelectionRange(pos, pos);
    clearError();
    validateCounselorIdField();
  });

  passwordEl?.addEventListener('input', clearError);

  // ── Remember Me — restore saved email ───────────────────
  const savedId = localStorage.getItem('vc_remember_id');
  if (savedId && counselorIdEl) {
    counselorIdEl.value = savedId;
    if (rememberMeEl) rememberMeEl.checked = true;
    validateCounselorIdField();
  }

  // ── Need Help tooltip toggle ──────────────────────────
  needHelpLink?.addEventListener('click', (e) => {
    e.preventDefault();
    const visible = helpTooltip?.classList.toggle('visible');
    needHelpLink.setAttribute('aria-expanded', visible ? 'true' : 'false');
  });

  // Close tooltip if clicking outside it
  document.addEventListener('click', (e) => {
    if (helpTooltip?.classList.contains('visible') &&
        !helpTooltip.contains(e.target) &&
        e.target !== needHelpLink) {
      helpTooltip.classList.remove('visible');
      needHelpLink?.setAttribute('aria-expanded', 'false');
    }
  });

  // ── Sign Up Form ──────────────────────────────────────
  signupForm?.addEventListener('submit',    handleSignupSubmit);
  toggleSignupPass?.addEventListener('click', () => {
    const pwEl = document.getElementById('signup-password');
    togglePasswordVisibility(pwEl, toggleSignupPass);
  });

});

// ══════════════════════════════════════════════════════════
// MODAL — OPEN / CLOSE
// ══════════════════════════════════════════════════════════
function openModal() {
  modalBackdrop?.classList.add('is-open');
  authModal?.classList.add('is-open');
  authModal?.removeAttribute('aria-hidden');
  modalBackdrop?.removeAttribute('aria-hidden');
  document.body.style.overflow = 'hidden';

  // Focus the first input after animation settles
  setTimeout(() => counselorIdEl?.focus(), 350);
}

function closeModal() {
  modalBackdrop?.classList.remove('is-open');
  authModal?.classList.remove('is-open');
  authModal?.setAttribute('aria-hidden', 'true');
  modalBackdrop?.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';

  // Return focus to the trigger button
  btnOpenModal?.focus();
}

// ══════════════════════════════════════════════════════════
// TAB SWITCHING
// ══════════════════════════════════════════════════════════
function switchTab(tab) {
  const isSignIn = tab === 'signin';

  // Toggle active class on tabs
  tabSignIn?.classList.toggle('active', isSignIn);
  tabSignUp?.classList.toggle('active', !isSignIn);
  tabSignIn?.setAttribute('aria-selected', isSignIn ? 'true' : 'false');
  tabSignUp?.setAttribute('aria-selected', isSignIn ? 'false' : 'true');

  // Move the sliding pill indicator via data attribute on the container
  if (tabsContainer) tabsContainer.dataset.active = tab;

  // Toggle panels
  if (isSignIn) {
    panelSignIn?.classList.add('active');
    panelSignUp?.classList.remove('active');
    panelSignIn?.removeAttribute('aria-hidden');
    panelSignUp?.setAttribute('aria-hidden', 'true');
    // Focus first field in sign-in
    setTimeout(() => counselorIdEl?.focus(), 60);
  } else {
    panelSignUp?.classList.add('active');
    panelSignIn?.classList.remove('active');
    panelSignUp?.removeAttribute('aria-hidden');
    panelSignIn?.setAttribute('aria-hidden', 'true');
    // Focus first field in sign-up
    setTimeout(() => document.getElementById('signup-name')?.focus(), 60);
  }

  // Clear any error state when switching tabs
  clearError();
}

// ══════════════════════════════════════════════════════════
// SIGN IN — SUBMIT HANDLER (Firebase Auth)
// ══════════════════════════════════════════════════════════
async function handleLoginSubmit(e) {
  e.preventDefault();

  let email  = (counselorIdEl?.value || '').trim().toLowerCase();
  const pwd = (passwordEl?.value   || '');

  if (email && !email.includes('@')) {
    email += '@admin.com';
  }

  if (!email || !pwd) {
    showError('Please enter both your Email and Password.');
    return;
  }

  setLoadingState(true);

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, pwd);
    const user = userCredential.user;
    const token = await user.getIdToken();

    // ── Handle "Remember Me" ────────────────────────────
    if (rememberMeEl?.checked) {
      localStorage.setItem('vc_remember_id', email);
    } else {
      localStorage.removeItem('vc_remember_id');
    }

    // Build session
    sessionStorage.setItem('counselor_session', JSON.stringify({
      id: user.uid,
      email: user.email,
      name: user.displayName || user.email,
      role: 'Counselor',
      initials: (user.displayName || user.email).substring(0, 2).toUpperCase(),
      token: token,
      loginTime: new Date().toISOString(),
    }));

    window.location.replace('/index.html');
  } catch (error) {
    setLoadingState(false);
    console.error(error);
    showError(error.message || 'Invalid Email or Password. Please check your credentials and try again.');
    counselorIdEl?.classList.add('is-invalid');
    passwordEl?.classList.add('is-invalid');
  }
}

// ══════════════════════════════════════════════════════════
// SIGN UP — SUBMIT HANDLER (Gated — MVP)
// ══════════════════════════════════════════════════════════
function handleSignupSubmit(e) {
  e.preventDefault();

  const name    = document.getElementById('signup-name')?.value.trim();
  const id      = document.getElementById('signup-id')?.value.trim();
  const email   = document.getElementById('signup-email')?.value.trim();
  const pass    = document.getElementById('signup-password')?.value;
  const confirm = document.getElementById('signup-confirm')?.value;

  // Basic validation
  if (!name || !id || !email || !pass || !confirm) {
    showSignupError('Please fill in all fields.');
    return;
  }
  if (pass !== confirm) {
    showSignupError('Passwords do not match.');
    document.getElementById('signup-confirm')?.classList.add('is-invalid');
    return;
  }
  if (pass.length < 6) {
    showSignupError('Password must be at least 6 characters.');
    document.getElementById('signup-password')?.classList.add('is-invalid');
    return;
  }

  // Show gated success message — admin approval required
  if (signupForm)    signupForm.style.display = 'none';
  if (signupSuccess) signupSuccess.hidden = false;
}

function showSignupError(msg) {
  // Re-use error el if available, else alert
  const errEl  = document.createElement('div');
  errEl.className = 'login-error visible shake';
  errEl.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i><span>${msg}</span>`;
  signupForm?.prepend(errEl);
  setTimeout(() => errEl.remove(), 4000);
}

// ══════════════════════════════════════════════════════════
// INLINE VALIDATION — Email field checkmark
// ══════════════════════════════════════════════════════════
function validateCounselorIdField() {
  const val   = counselorIdEl?.value || '';
  const valid = val.length >= 5;
  checkIdIcon?.classList.toggle('visible', valid);
}

// ══════════════════════════════════════════════════════════
// UI HELPERS
// ══════════════════════════════════════════════════════════
function showError(msg) {
  if (errorMsgEl) errorMsgEl.textContent = msg;
  if (errorEl) {
    errorEl.classList.add('visible');
    errorEl.classList.remove('shake');
    void errorEl.offsetWidth; // force reflow to restart animation
    errorEl.classList.add('shake');
  }
}

function clearError() {
  errorEl?.classList.remove('visible', 'shake');
  counselorIdEl?.classList.remove('is-invalid');
  passwordEl?.classList.remove('is-invalid');
}

function setLoadingState(loading) {
  if (!btnLoginEl) return;
  btnLoginEl.disabled = loading;
  if (btnTextEl)    btnTextEl.style.display    = loading ? 'none'  : 'flex';
  if (btnSpinnerEl) btnSpinnerEl.style.display = loading ? 'flex'  : 'none';
}

function togglePasswordVisibility(inputEl, toggleBtn) {
  if (!inputEl) return;
  const isHidden = inputEl.type === 'password';
  inputEl.type   = isHidden ? 'text' : 'password';
  const icon = toggleBtn?.querySelector('i');
  if (icon) icon.className = `fa-solid ${isHidden ? 'fa-eye-slash' : 'fa-eye'}`;
}

// ══════════════════════════════════════════════════════════
// GLOBAL LOGOUT — callable from any page
// ══════════════════════════════════════════════════════════
window.handleLogout = function () {
  sessionStorage.removeItem('counselor_session');
  window.location.replace('/login.html');
};
