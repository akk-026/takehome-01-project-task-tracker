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
      state.user = result.user;
      home(result.user);
    } catch (reason) { login(reason.message); }
  };
}

async function home(user, includeArchived = false) {
  const [{ projects }, staff] = await Promise.all([request(`/api/projects${includeArchived ? '?archived=true' : ''}`), user.role === 'MANAGER' ? request('/api/users') : Promise.resolve({ users: [] })]);
  root.innerHTML = `<section class="workspace"><header><div><div class="brand">✦ NORTHSTAR</div><h1>Projects</h1><p>${user.role === 'MANAGER' ? 'Create and manage the portfolio.' : 'Projects you belong to.'}</p></div><div><span class="role">${user.role === 'MANAGER' ? 'Manager' : 'Member'}</span><button class="small secondary" id="logout">Sign out</button></div></header>${user.role === 'MANAGER' ? `<button class="new" id="new-project">+ New project</button><button class="small secondary" id="toggle-archived">${includeArchived ? 'Hide archived' : 'Show archived'}</button>` : ''}<div class="projects">${projects.length ? projects.map(project => projectCard(project, user.role === 'MANAGER')).join('') : '<div class="empty">No projects are available yet.</div>'}</div></section>`;
  document.querySelector('#logout').onclick = async () => { await request('/api/auth/logout', { method: 'POST' }); localStorage.removeItem(sessionKey); login(); };
  const newProject = document.querySelector('#new-project');
  if (newProject) newProject.onclick = () => projectForm(null, staff.users);
  const toggleArchived = document.querySelector('#toggle-archived');
  if (toggleArchived) toggleArchived.onclick = () => home(user, !includeArchived);
  document.querySelectorAll('[data-edit]').forEach(button => button.onclick = () => projectForm(projects.find(project => project.id === button.dataset.edit), staff.users));
  document.querySelectorAll('[data-archive]').forEach(button => button.onclick = () => archive(button.dataset.archive, false));
  document.querySelectorAll('[data-restore]').forEach(button => button.onclick = () => archive(button.dataset.restore, true));
}

function projectCard(project, manager) {
  return `<article class="project ${project.archived ? 'archived' : ''}"><div class="key">${project.key}${project.archived ? ' · ARCHIVED' : ''}</div><h2>${project.name}</h2><p>${project.description || 'No description provided.'}</p><small>Owner: ${project.owner.name} · ${project.members.length} member${project.members.length === 1 ? '' : 's'}</small>${manager ? `<footer><button class="small secondary" data-edit="${project.id}">Edit</button>${project.archived ? `<button class="small" data-restore="${project.id}">Restore</button>` : `<button class="small danger" data-archive="${project.id}">Archive</button>`}</footer>` : ''}</article>`;
}

function projectForm(project, users) {
  const form = document.createElement('div');
  form.className = 'modal-backdrop';
  form.innerHTML = `<form class="modal" id="project-form"><h2>${project ? 'Edit project' : 'New project'}</h2><label>Short key</label><input name="key" maxlength="8" value="${project?.key || ''}" required><label>Name</label><input name="name" value="${project?.name || ''}" required><label>Description</label><textarea name="description">${project?.description || ''}</textarea><label>Owner</label><select name="ownerId">${users.map(user => `<option value="${user.id}" ${project?.ownerId === user.id || (!project && user.id === 'user_alice') ? 'selected' : ''}>${user.name}</option>`).join('')}</select><label>Members</label><div class="members">${users.map(user => `<label><input type="checkbox" value="${user.id}" ${project?.memberIds?.includes(user.id) || (!project && user.id === 'user_alice') ? 'checked' : ''}> ${user.name}</label>`).join('')}</div><div class="form-actions"><button type="button" class="secondary" id="cancel">Cancel</button><button>${project ? 'Save changes' : 'Create project'}</button></div></form>`;
  document.body.append(form);
  form.querySelector('#cancel').onclick = () => form.remove();
  form.querySelector('#project-form').onsubmit = async event => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    values.key = values.key.toUpperCase();
    values.memberIds = [...event.currentTarget.querySelectorAll('.members input:checked')].map(input => input.value);
    try {
      if (project) {
        await request(`/api/projects/${project.id}`, { method: 'PATCH', body: JSON.stringify(values) });
        await request(`/api/projects/${project.id}/members`, { method: 'PUT', body: JSON.stringify({ memberIds: values.memberIds }) });
      } else await request('/api/projects', { method: 'POST', body: JSON.stringify(values) });
      form.remove(); home(state.user);
    } catch (reason) { alert(reason.message); }
  };
}

async function archive(projectId, restore) {
  if (!confirm(`${restore ? 'Restore' : 'Archive'} this project?`)) return;
  await request(`/api/projects/${projectId}${restore ? '/restore' : ''}`, { method: restore ? 'POST' : 'DELETE' });
  home(state.user);
}

const state = { user: null };
(async () => { try { const { user } = await request('/api/auth/me'); state.user = user; home(user); } catch { login(); } })();
