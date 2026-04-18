import { PUBLIC_CONFIG } from '../../config/public-config.js';
import { getSupabaseClient } from '../../lib/supabase-client.js';

// ⚠ DEV BYPASS — set to true before go-live
const AUTH_ENABLED = false;
const DEV_USER = { email: 'dev@local', id: 'dev-user' };
const DEV_SESSION = { user: DEV_USER };

const sb = () => getSupabaseClient();

export const Auth = {
  async getSession() {
    if (!AUTH_ENABLED) return DEV_SESSION;
    const { data, error } = await sb().auth.getSession();
    if (error) throw error;
    return data.session;
  },

  async getUser() {
    if (!AUTH_ENABLED) return DEV_USER;
    const { data, error } = await sb().auth.getUser();
    if (error) throw error;
    return data.user;
  },

  async sendMagicLink(email) {
    if (!AUTH_ENABLED) { console.log('[DEV] Magic link bypass — email:', email); return; }
    const clean = String(email || '').trim().toLowerCase();
    if (!clean) throw new Error('Email is required.');

    const { error } = await sb().auth.signInWithOtp({
      email: clean,
      options: {
        emailRedirectTo: PUBLIC_CONFIG.AUTH.redirectTo,
      },
    });

    if (error) throw error;
  },

  async signOut() {
    if (!AUTH_ENABLED) { console.log('[DEV] Sign out bypass'); window.location.reload(); return; }
    const { error } = await sb().auth.signOut();
    if (error) throw error;
    window.location.hash = '#/';
    window.location.reload();
  },

  onAuthChange(callback) {
    if (!AUTH_ENABLED) { setTimeout(() => callback('SIGNED_IN', DEV_SESSION), 0); return { unsubscribe: () => {} }; }
    const { data } = sb().auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
    return data.subscription;
  },
};

export function showAuthScreen() {
  const overlay = document.getElementById('auth-overlay');
  if (!overlay) return;
  overlay.classList.remove('hidden');

  overlay.innerHTML = `
    <div class="auth-box">
      <div class="auth-logo">
        <div class="auth-logo-mark">P</div>
        <div class="auth-logo-name">${PUBLIC_CONFIG.APP_NAME}</div>
        <div class="auth-logo-company">${PUBLIC_CONFIG.COMPANY_NAME}</div>
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
  if (!overlay) return;
  overlay.classList.add('hidden');
  overlay.innerHTML = '';
}

function renderSignInForm() {
  return `
    <h2 class="auth-heading">Sign In</h2>
    <p class="auth-sub">Enter your work email. A magic link will be sent to your inbox.</p>
    <form id="auth-form" autocomplete="on">
      <div class="form-group">
        <label for="auth-email">Work Email</label>
        <input
          type="email"
          id="auth-email"
          name="email"
          placeholder="you@company.com"
          required
          autocomplete="email"
        >
      </div>
      <button type="submit" class="btn btn-primary w-full" id="auth-submit-btn">
        Send Sign-In Link
      </button>
    </form>
    <div id="auth-msg" class="auth-msg hidden"></div>
  `;
}

function renderSentMessage(email) {
  return `
    <div class="auth-sent">
      <div class="auth-sent-icon">✉</div>
      <h2>Check your email</h2>
      <p>A sign-in link was sent to <strong>${email}</strong>.</p>
      <p class="auth-sub">Use the link in that email to access the app.</p>
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
      if (rb) {
        rb.textContent = 'Sent';
        rb.disabled = true;
      }
    });
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Send Sign-In Link';
    msg.textContent = err.message || 'Sign-in failed.';
    msg.classList.remove('hidden');
    msg.classList.add('auth-error');
  }
}

export function renderUserBadge(user) {
  const el = document.getElementById('topbar-user');
  if (!el || !user) return;

  const email = user.email || '';
  const initials = (email[0] || 'U').toUpperCase();

  el.innerHTML = `
    <div class="user-badge" id="user-badge-btn" title="${email}">
      <span class="user-initial">${initials}</span>
      <span class="user-email-short">${email.split('@')[0] || email}</span>
    </div>
  `;

  document.getElementById('user-badge-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const existing = document.getElementById('user-dropdown');
    if (existing) {
      existing.remove();
      return;
    }

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
    menu.style.position = 'fixed';
    menu.style.top = (rect.bottom + 8) + 'px';
    menu.style.right = (window.innerWidth - rect.right) + 'px';

    document.getElementById('signout-btn')?.addEventListener('click', async () => {
      await Auth.signOut();
      menu.remove();
    });

    setTimeout(() => {
      document.addEventListener('click', () => menu.remove(), { once: true });
    }, 0);
  });
}
