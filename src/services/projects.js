const { publicUser } = require('./auth');

function projectView(database, project) {
  return {
    ...project,
    owner: publicUser(database.users.find(user => user.id === project.ownerId)),
    members: project.memberIds.map(id => database.users.find(user => user.id === id)).filter(Boolean).map(publicUser)
  };
}

function canSeeProject(user, project) {
  return user.role === 'MANAGER' || project.memberIds.includes(user.id);
}

function validateProjectInput(database, input, existingId) {
  const key = String(input.key || '').trim().toUpperCase();
  const name = String(input.name || '').trim();
  if (!/^[A-Z0-9]{2,8}$/.test(key)) return { error: 'Project key must be 2–8 uppercase letters or numbers.' };
  if (!name) return { error: 'Project name is required.' };
  if (database.projects.some(project => project.id !== existingId && project.key === key)) return { error: 'Project key must be unique.' };
  if (!database.users.some(user => user.id === input.ownerId)) return { error: 'Choose an existing project owner.' };
  const memberIds = [...new Set([input.ownerId, ...(input.memberIds || [])])];
  if (memberIds.some(id => !database.users.some(user => user.id === id))) return { error: 'Project members must be existing users.' };
  return { key, name, description: String(input.description || '').trim(), ownerId: input.ownerId, memberIds };
}

function createProjectService(store) {
  return {
    list(user, includeArchived = false) {
      const database = store.read();
      return database.projects.filter(project => canSeeProject(user, project) && (includeArchived || !project.archived)).map(project => projectView(database, project));
    },
    get(user, projectId, includeArchived = false) {
      const database = store.read();
      const project = database.projects.find(candidate => candidate.id === projectId);
      if (!project || !canSeeProject(user, project) || (!includeArchived && project.archived)) return null;
      return projectView(database, project);
    },
    create(input) {
      const database = store.read();
      const validated = validateProjectInput(database, input);
      if (validated.error) return validated;
      const timestamp = new Date().toISOString();
      const project = { id: `project_${crypto.randomUUID().slice(0, 8)}`, ...validated, archived: false, createdAt: timestamp, updatedAt: timestamp };
      database.projects.push(project);
      store.write(database);
      return { project: projectView(database, project) };
    },
    update(projectId, input) {
      const database = store.read();
      const project = database.projects.find(candidate => candidate.id === projectId);
      if (!project) return { error: 'Project not found.', status: 404 };
      const validated = validateProjectInput(database, { ...project, ...input, memberIds: input.memberIds || project.memberIds }, project.id);
      if (validated.error) return validated;
      Object.assign(project, validated, { updatedAt: new Date().toISOString() });
      store.write(database);
      return { project: projectView(database, project) };
    },
    setMembers(projectId, memberIds) {
      const database = store.read();
      const project = database.projects.find(candidate => candidate.id === projectId);
      if (!project) return { error: 'Project not found.', status: 404 };
      const next = [...new Set([project.ownerId, ...(memberIds || [])])];
      if (next.some(id => !database.users.some(user => user.id === id))) return { error: 'Project members must be existing users.' };
      project.memberIds = next;
      project.updatedAt = new Date().toISOString();
      store.write(database);
      return { project: projectView(database, project) };
    },
    archive(projectId, archived) {
      const database = store.read();
      const project = database.projects.find(candidate => candidate.id === projectId);
      if (!project) return { error: 'Project not found.', status: 404 };
      project.archived = archived;
      project.updatedAt = new Date().toISOString();
      store.write(database);
      return { project: projectView(database, project) };
    }
  };
}

const crypto = require('node:crypto');
module.exports = { createProjectService };
