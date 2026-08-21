import { readJson, writeJson } from './utils/azureBlob.js';
import { getUserId, getUserName, isManager } from './utils/auth.js';

export async function handler(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }
  try {
    const requesterId = getUserId(context);
    const { track, taskId, done, title, section, targetUserId } = JSON.parse(event.body || '{}');
    if (!track || !taskId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'track and taskId are required' }) };
    }

    // A user can only edit their own progress unless they're a manager
    // (app_metadata.roles includes "manager" - set in the Identity dashboard).
    let userId = requesterId;
    let userName = getUserName(context);
    if (targetUserId && targetUserId !== requesterId) {
      if (!isManager(context)) {
        return { statusCode: 403, body: JSON.stringify({ error: 'Only managers can edit another person\'s tasks' }) };
      }
      userId = targetUserId;
      userName = null; // preserve whatever name is already on file for that user
    }

    const blobName = `progress/${track}/${userId}.json`;
    const current = await readJson(blobName, { tasks: [] });

    const idx = current.tasks.findIndex((t) => t.id === taskId);
    if (idx >= 0) {
      current.tasks[idx].done = done;
    } else {
      current.tasks.push({ id: taskId, title: title || taskId, section: section || 'task-queue', done, addedBy: targetUserId ? requesterId : undefined });
    }
    if (userName) current.userName = userName;
    current.lastActive = new Date().toISOString();

    await writeJson(blobName, current);
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    return { statusCode: err.message.includes('signed in') ? 401 : 500, body: JSON.stringify({ error: err.message }) };
  }
}
