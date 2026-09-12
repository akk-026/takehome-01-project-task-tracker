const crypto = require('node:crypto');

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

function createAuth(store) {
  const sessions = new Map();
  return {
    signIn(email, password) {
      const user = store.read().users.find(candidate => candidate.email.toLowerCase() === String(email || '').trim().toLowerCase() && candidate.passwordHash === store.passwordHash(String(password || '')));
      if (!user) return null;
      const token = crypto.randomUUID();
      sessions.set(token, user.id);
      return { token, user: publicUser(user) };
    },
    userFromRequest(request) {
      const token = (request.headers.authorization || '').replace(/^Bearer\s+/i, '');
      const user = store.read().users.find(candidate => candidate.id === sessions.get(token));
      return user ? publicUser(user) : null;
    },
    signOut(request) { sessions.delete((request.headers.authorization || '').replace(/^Bearer\s+/i, '')); }
  };
}

module.exports = { createAuth, publicUser };
