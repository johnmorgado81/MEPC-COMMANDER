// auth.js — Supabase magic link authentication
import { getClient, isReady } from './db.js';
import { CONFIG } from './config.js';

export const Auth = {

  async getSession() {
    if (!isReady()) return null;
    try {
      const { data } = await getClient().auth.getSession();
      return data?.session ?? null;
    } catch { return null; }
  },

  async getUser() {
    if (!isReady()) return null;
    try {
      const { data } = await getClient().auth.getUser();
      return data?.user ?? null;
    } catch { return null; }
  },

  async sendMagicLink(email) {
    if (!isReady()) throw new Error('Database not configured. Check config.js.');
    const { error } = await getClient().auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: window.location.origin + '/' },
    });
    if (error) throw error;
  },

  async signOut() {
    if (!isReady()) return;
    try {
      const { error } = await getClient().auth.signOut();
      if (error) throw error;
    } catch (e) { console.warn('Sign out error:', e.message); }
  },

  onAuthChange(callback) {
    if (!isReady()) {
      // No-op subscription — return a fake object so callers don't crash
      return { unsubscribe: () => {} };
    }
    try {
      const { data: { subscription } } = getClient().auth.onAuthStateChange((event, session) => {
        callback(event, session);
      });
      return subscription;
    } catch (e) {
      console.warn('onAuthChange failed:', e.message);
      return { unsubscribe: () => {} };
    }
  },
};

// ─── Auth UI ─────────────────────────────────────────────────────────────────

export function showAuthScreen() {
  const overlay = document.getElementById('auth-overlay');
  if (!overlay) return;
  overlay.classList.remove('hidden');
  overlay.innerHTML = `
    <div class="auth-box">
      <div class="auth-logo">
        <div class="auth-logo-mark">M</div>
        <div class="auth-logo-name">${CONFIG.APP_NAME}</div>
        <div class="auth-logo-company">${CONFIG.COMPANY.name}</div>
      </div>
      <div id="auth-panel">${renderSignInForm()}</div>
    </div>`;
  document.getElementById('auth-form')?.addEventListener('submit', handleSignIn);
}

export function hideAuthScreen() {
  const overlay = document.getElementById('auth-overlay');
  if (overlay) overlay.classList.add('hidden');
}

export function renderUserBadge(user) {
  const badge = document.getElementById('user-badge');
  if (!badge || !user) return;
  const email = user.email || '';
  const initials = email.slice(0, 2).toUpperCase();
  badge.innerHTML = `
    <span class="user-avatar" title="${email}">${initials}</span>
    <button class="btn btn-xs btn-ghost" id="signout-btn" title="Sign out">↩</button>`;
  document.getElementById('signout-btn')?.addEventListener('click', async () => {
    await Auth.signOut();
    window.location.reload();
  });
}

function renderSignInForm() {
  return `
    <h3 style="margin-bottom:1rem">Sign In</h3>
    <form id="auth-form">
      <div class="form-group">
        <label>Email address</label>
        <input type="email" id="auth-email" class="input" placeholder="you@company.com" required autocomplete="email">
      </div>
      <button type="submit" class="btn btn-primary" style="width:100%;margin-top:.75rem" id="auth-submit">
        Send Magic Link
      </button>
    </form>
    <p class="text-muted" style="font-size:12px;margin-top:.75rem;text-align:center">
      We'll email you a one-click sign-in link. No password needed.
    </p>`;
}

async function handleSignIn(e) {
  e.preventDefault();
  const email = document.getElementById('auth-email')?.value?.trim();
  const btn   = document.getElementById('auth-submit');
  const panel = document.getElementById('auth-panel');
  if (!email) return;
  if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
  try {
    await Auth.sendMagicLink(email);
    if (panel) panel.innerHTML = `
      <div style="text-align:center;padding:1rem">
        <div style="font-size:2rem;margin-bottom:.5rem">✉️</div>
        <h4>Check your email</h4>
        <p class="text-muted">A sign-in link was sent to <strong>${email}</strong>.</p>
        <p class="text-muted" style="font-size:12px;margin-top:.5rem">Click the link in your email to continue.</p>
      </div>`;
  } catch (err) {
    if (btn) { btn.disabled = false; btn.textContent = 'Send Magic Link'; }
    const errEl = document.getElementById('auth-error');
    if (errEl) {
      errEl.textContent = err.message;
    } else {
      const form = document.getElementById('auth-form');
      if (form) form.insertAdjacentHTML('beforebegin', `<div id="auth-error" class="error-state" style="margin-bottom:.5rem;font-size:13px">${err.message}</div>`);
    }
  }
}
