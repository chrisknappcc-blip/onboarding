import netlifyIdentity from 'netlify-identity-widget';

async function authHeaders() {
  const user = netlifyIdentity.currentUser();
  if (!user) return {};
  const token = await user.jwt(); // refreshes if expired
  return { Authorization: `Bearer ${token}` };
}

async function call(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(await authHeaders()), ...(opts.headers || {}) };
  const res = await fetch(`/.netlify/functions/${path}`, { ...opts, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

export const api = {
  getProgress: (trackKey) => call(`get-progress?track=${encodeURIComponent(trackKey)}`),
  updateProgress: (trackKey, taskId, done, extra = {}) =>
    call('update-progress', {
      method: 'POST',
      body: JSON.stringify({ track: trackKey, taskId, done, ...extra })
    }),
  getContent: (trackKey, section, managerId, team) =>
    call(`get-content?track=${encodeURIComponent(trackKey)}&section=${encodeURIComponent(section)}${managerId ? `&managerId=${encodeURIComponent(managerId)}` : ''}${team ? `&team=${encodeURIComponent(team)}` : ''}`),
  // Content Library (manager/admin content authoring)
  listContent: (section, managerId) =>
    call(`manage-content?section=${encodeURIComponent(section)}${managerId ? `&managerId=${encodeURIComponent(managerId)}` : ''}`),
  addManualContent: (section, block, requestedManagerId, customLabel) =>
    call('manage-content', {
      method: 'POST',
      body: JSON.stringify({ section, action: 'addManual', block, requestedManagerId, customLabel })
    }),
  addFromLibrary: (section, blockId, requestedManagerId) =>
    call('manage-content', {
      method: 'POST',
      body: JSON.stringify({ section, action: 'addFromLibrary', blockId, requestedManagerId })
    }),
  removeContent: (section, blockId, requestedManagerId) =>
    call('manage-content', {
      method: 'POST',
      body: JSON.stringify({ section, action: 'remove', blockId, requestedManagerId })
    }),
  editContent: (section, blockId, block, requestedManagerId) =>
    call('manage-content', {
      method: 'POST',
      body: JSON.stringify({ section, action: 'edit', blockId, block, requestedManagerId })
    }),
  uploadImage: (dataBase64, contentType) =>
    call('upload-image', {
      method: 'POST',
      body: JSON.stringify({ dataBase64, contentType })
    }),
  // Presets - save/apply a full content bundle across all sections at once
  listPresets: () => call('manage-presets'),
  savePreset: (name, sourceManagerId) =>
    call('manage-presets', {
      method: 'POST',
      body: JSON.stringify({ action: 'save', name, sourceManagerId })
    }),
  applyPreset: (name, targetManagerId) =>
    call('manage-presets', {
      method: 'POST',
      body: JSON.stringify({ action: 'apply', name, targetManagerId })
    }),
  deletePreset: (name) =>
    call('manage-presets', {
      method: 'POST',
      body: JSON.stringify({ action: 'delete', name })
    }),
  // Structure (tile order/labels per track)
  getStructure: (track) => call(`manage-structure?track=${encodeURIComponent(track)}`),
  saveStructure: (track, sections) =>
    call('manage-structure', {
      method: 'POST',
      body: JSON.stringify({ track, sections })
    }),
  // Named teams/sub-groups (e.g. Client Executive, Client Delivery)
  listTeams: () => call('manage-teams'),
  addTeam: (label) =>
    call('manage-teams', { method: 'POST', body: JSON.stringify({ action: 'add', label }) }),
  removeTeam: (key) =>
    call('manage-teams', { method: 'POST', body: JSON.stringify({ action: 'remove', key }) }),
  // Manager-only endpoints
  getTeamProgress: (trackKey, scope) =>
    call(`get-team-progress?track=${encodeURIComponent(trackKey)}${scope ? `&scope=${scope}` : ''}`),
  updateUserTask: (trackKey, targetUserId, taskId, done, extra = {}) =>
    call('update-progress', {
      method: 'POST',
      body: JSON.stringify({ track: trackKey, taskId, done, targetUserId, ...extra })
    }),
  setTaskStarred: (trackKey, targetUserId, taskId, starred, currentDone) =>
    call('update-progress', {
      method: 'POST',
      body: JSON.stringify({ track: trackKey, taskId, done: currentDone, starred, targetUserId })
    }),
  // Admin-only: manage roles, track, and manager assignment for everyone.
  listTeamUsers: () => call('manage-team'),
  updateTeamUser: (userId, appMetadata) =>
    call('manage-team', {
      method: 'POST',
      body: JSON.stringify({ userId, appMetadata })
    }),
  createTeamUser: (email, fullName, password, appMetadata) =>
    call('manage-team', {
      method: 'POST',
      body: JSON.stringify({ action: 'create', email, fullName, password, appMetadata })
    }),
  clearMustChangePassword: () => call('clear-must-change-password', { method: 'POST' }),
  addTaskForUser: (trackKey, targetUserId, title) =>
    call('update-progress', {
      method: 'POST',
      body: JSON.stringify({
        track: trackKey,
        taskId: `mgr-${Date.now()}`,
        done: false,
        title,
        section: 'task-queue',
        targetUserId
      })
    })
};
