const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function passwordHash(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function seedData() {
  return {
    users: [
      { id: 'user_alice', name: 'Alice Morgan', email: 'alice@northstar.test', passwordHash: passwordHash('manager123'), role: 'MANAGER' },
      { id: 'user_dan', name: 'Dan Chen', email: 'dan@northstar.test', passwordHash: passwordHash('member123'), role: 'MEMBER' }
    ],
    projects: [], tasks: [], events: []
  };
}

function createStore(filePath) {
  const file = filePath || path.join(process.cwd(), 'data.json');
  function ensure() {
    if (!fs.existsSync(file)) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, JSON.stringify(seedData(), null, 2));
    }
  }
  return {
    read() { ensure(); return JSON.parse(fs.readFileSync(file, 'utf8')); },
    passwordHash,
    file
  };
}

module.exports = { createStore, passwordHash };
