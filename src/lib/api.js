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
  getContent: (trackKey, section) =>
    call(`get-content?track=${encodeURIComponent(trackKey)}&section=${encodeURIComponent(section)}`),
  // Manager-only endpoints
  getTeamProgress: (trackKey) => call(`get-team-progress?track=${encodeURIComponent(trackKey)}`),
  updateUserTask: (trackKey, targetUserId, taskId, done, extra = {}) =>
    call('update-progress', {
      method: 'POST',
      body: JSON.stringify({ track: trackKey, taskId, done, targetUserId, ...extra })
    }),
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
