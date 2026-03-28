// auth.js — Supabase magic link authentication
// Sign-in with email → Supabase sends a link → user clicks → session persists.
// No password. No registration. Internal single-company use.

import { getClient } from './db.js';
import { CONFIG }     from './config.js';

// ─── Public API ──────────────────────────────────────────────────────────────

export const Auth = {

  // Returns current session or null
  async getSession() {
    const sb = getClient();
    const { data } = await sb.auth.getSession();
    return data?.session ?? null;
  },

  // Returns current user or null (no network call)
  async getUser() {
    const sb = getClient();
    const { data } = await sb.auth.getUser();
    return data?.user ?? null;
  },

  // Send magic link to email address
  async sendMagicLink(email) {
    const sb = getClient();
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,  // only allow existing users — add users via Supabase Dashboard
        emailRedirectTo: window.location.origin + '/',
      },
    });
    if (error) throw error;
  },

  // Sign out — clears session from browser
  async signOut() {
    const sb = getClient();
    const { error } = await sb.auth.signOut();
    if (error) throw error;
  },

  // Listen for auth state changes (sign-in / sign-out / token refresh)
  onAuthChange(callback) {
    const sb = getClient();
    const { data: { subscription } } = sb.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
    return subscription;
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
      <div id="auth-panel">
        ${renderSignInForm()}
      </div>
    </div>
  `;

  document.getElementById('auth-form')?.addEventListener('submit', handleSignIn);
}

export function hideAuthScreen() {
  const overlay = document.getElementById('auth-overlay');
  if (overlay) overlay.classList.add('hidden');
}

function renderSignInForm() {
  return `
    <h2 class="auth-heading">Sign In</h2>
    <p class="auth-sub">Enter your email. We'll send you a sign-in link — no password needed.</p>
    <form id="auth-form" autocomplete="on">
      <div class="form-group">
        <label for="auth-email">Work Email</label>
        <input type="email" id="auth-email" name="email" placeholder="you@mecmechanical.ca"
               required autocomplete="email">
      </div>
      <button type="submit" class="btn btn-primary w-full" id="auth-submit-btn">
        Send Sign-In Link
      </button>
    </form>
    <div id="auth-msg" class="auth-msg hidden"></div>
    <p class="auth-note">
      Access is invite-only. Contact your administrator if you need access.
    </p>
  `;
}

function renderSentMessage(email) {
  return `
    <div class="auth-sent">
      <div class="auth-sent-icon">✉</div>
      <h2>Check your email</h2>
      <p>A sign-in link was sent to <strong>${email}</strong>.</p>
      <p class="auth-sub">Click the link in the email to access ${CONFIG.APP_NAME}. The link expires in 60 minutes.</p>
      <button class="btn btn-secondary" id="auth-resend-btn">Resend Link</button>
    </div>
  `;
}

async function handleSignIn(e) {
  e.preventDefault();
  const email = document.getElementById('auth-email')?.value?.trim();
  const btn   = document.getElementById('auth-submit-btn');
  const msg   = document.getElementById('auth-msg');

  if (!email) return;

  btn.disabled = true;
  btn.textContent = 'Sending…';
  msg.classList.add('hidden');

  try {
    await Auth.sendMagicLink(email);
    document.getElementById('auth-panel').innerHTML = renderSentMessage(email);
    document.getElementById('auth-resend-btn')?.addEventListener('click', async () => {
      await Auth.sendMagicLink(email);
      const rb = document.getElementById('auth-resend-btn');
      if (rb) { rb.textContent = 'Sent!'; rb.disabled = true; }
    });
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Send Sign-In Link';
    msg.textContent = err.message || 'Sign-in failed. Check your email address.';
    msg.classList.remove('hidden');
    msg.classList.add('auth-error');
  }
}

// ─── Topbar user badge ────────────────────────────────────────────────────────
export function renderUserBadge(user) {
  const el = document.getElementById('topbar-user');
  if (!el || !user) return;

  const email = user.email || '';
  const initials = email.charAt(0).toUpperCase();

  el.innerHTML = `
    <div class="user-badge" id="user-badge-btn" title="${email}">
      <span class="user-initial">${initials}</span>
      <span class="user-email-short">${email.split('@')[0]}</span>
    </div>
  `;

  // Toggle sign-out menu
  document.getElementById('user-badge-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const existing = document.getElementById('user-dropdown');
    if (existing) { existing.remove(); return; }

    const menu = document.createElement('div');
    menu.id = 'user-dropdown';
    menu.className = 'user-dropdown';
    menu.innerHTML = `
      <div class="user-dropdown-email">${email}</div>
      <hr class="user-dropdown-sep">
      <button class="user-dropdown-btn" id="signout-btn">Sign Out</button>
    `;
    document.body.appendChild(menu);

    const rect = el.getBoundingClientRect();
    menu.style.position  = 'fixed';
    menu.style.top       = (rect.bottom + 8) + 'px';
    menu.style.right     = (window.innerWidth - rect.right) + 'px';

    document.getElementById('signout-btn')?.addEventListener('click', async () => {
      await Auth.signOut();
      menu.remove();
    });

    // Dismiss on outside click
    setTimeout(() => {
      document.addEventListener('click', () => menu.remove(), { once: true });
    }, 0);
  });
}
