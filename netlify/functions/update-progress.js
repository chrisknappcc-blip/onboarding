import { readJson, writeJson } from './utils/azureBlob.js';
import { getUserId, getUserEmail, getUserName, isAdmin, isManagerRole } from './utils/auth.js';

export async function handler(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }
  try {
    const requesterId = getUserId(context);
    const requesterEmail = getUserEmail(context);
    const { track, taskId, done, title, section, targetUserId, starred, remove } = JSON.parse(event.body || '{}');
    if (!track || !taskId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'track and taskId are required' }) };
    }

    let userId = requesterId;
    let selfEdit = true;

    if (targetUserId && targetUserId !== requesterId) {
      selfEdit = false;
      const targetBlobName = `progress/${track}/${targetUserId}.json`;
      const targetData = await readJson(targetBlobName, { tasks: [] });

      if (isAdmin(context)) {
        // admins can edit anyone
      } else if (isManagerRole(context)) {
        // managers can only edit people who report to them
        if (targetData.managerId !== requesterEmail) {
          return { statusCode: 403, body: JSON.stringify({ error: 'This person is not on your team' }) };
        }
      } else {
        return { statusCode: 403, body: JSON.stringify({ error: 'Not authorized to edit another person\'s tasks' }) };
      }
      userId = targetUserId;
    }

    const blobName = `progress/${track}/${userId}.json`;
    const current = await readJson(blobName, { tasks: [] });

    if (remove) {
      current.tasks = current.tasks.filter((t) => t.id !== taskId);
      current.lastActive = new Date().toISOString();
      await writeJson(blobName, current);
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    const idx = current.tasks.findIndex((t) => t.id === taskId);
    const canSetStar = !selfEdit; // only a manager/admin acting on someone else can star a task
    if (idx >= 0) {
      current.tasks[idx].done = done;
      if (canSetStar && starred !== undefined) current.tasks[idx].starred = starred;
      if (title) current.tasks[idx].title = title;
      if (section) current.tasks[idx].section = section;
    } else {
      current.tasks.push({
        id: taskId,
        title: title || taskId,
        section: section || 'task-queue',
        done,
        starred: canSetStar ? Boolean(starred) : false,
        addedBy: selfEdit ? undefined : requesterEmail
      });
    }
    if (selfEdit) current.userName = getUserName(context);
    current.lastActive = new Date().toISOString();

    await writeJson(blobName, current);
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    return { statusCode: err.message.includes('signed in') ? 401 : 500, body: JSON.stringify({ error: err.message }) };
  }
}
