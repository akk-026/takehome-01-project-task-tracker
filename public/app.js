const root = document.querySelector('#app');
const sessionKey = 'northstar-token';

async function request(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { 'content-type': 'application/json', ...(localStorage.getItem(sessionKey) ? { authorization: `Bearer ${localStorage.getItem(sessionKey)}` } : {}) }
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Request failed.');
  return body;
}

function login(error = '') {
  root.innerHTML = `<section class="card"><div class="brand">✦ NORTHSTAR</div><h1>Make work visible.</h1><p>Sign in to the project tracker.</p><form id="login"><label>Email</label><input name="email" type="email" value="alice@northstar.test" required><label>Password</label><input name="password" type="password" value="manager123" required><button>Sign in</button></form>${error ? `<div class="error">${error}</div>` : ''}<div class="demo"><b>Demo accounts</b><br>Manager: alice@northstar.test / manager123<br>Member: dan@northstar.test / member123</div></section>`;
  document.querySelector('#login').onsubmit = async event => {
    event.preventDefault();
    try {
      const result = await request('/api/auth/login', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) });
      localStorage.setItem(sessionKey, result.token);
      home(result.user);
    } catch (reason) { login(reason.message); }
  };
}

function home(user) {
  root.innerHTML = `<section class="card"><div class="brand">✦ NORTHSTAR</div><h1>Welcome, ${user.name.split(' ')[0]}.</h1><span class="role">${user.role === 'MANAGER' ? 'Manager' : 'Member'}</span><p>Feature 1 is complete: this account is authenticated and its role comes from the server.</p><button id="logout">Sign out</button></section>`;
  document.querySelector('#logout').onclick = async () => { await request('/api/auth/logout', { method: 'POST' }); localStorage.removeItem(sessionKey); login(); };
}

(async () => { try { const { user } = await request('/api/auth/me'); home(user); } catch { login(); } })();
