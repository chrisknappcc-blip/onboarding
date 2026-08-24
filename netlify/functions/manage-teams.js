import { readJson, writeJson } from './utils/azureBlob.js';
import { hasTeamAccess, isAdmin } from './utils/auth.js';

function slugify(label) {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function handler(event, context) {
  try {
    if (!hasTeamAccess(context)) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Manager or admin role required' }) };
    }

    if (event.httpMethod === 'GET') {
      const data = await readJson('teams.json', { teams: [] });
      return { statusCode: 200, body: JSON.stringify(data) };
    }

    if (event.httpMethod === 'POST') {
      if (!isAdmin(context)) {
        return { statusCode: 403, body: JSON.stringify({ error: 'Admin role required to manage the team list' }) };
      }
      const body = JSON.parse(event.body || '{}');
      const data = await readJson('teams.json', { teams: [] });

      if (body.action === 'add') {
        const key = slugify(body.label || '');
        if (!key) return { statusCode: 400, body: JSON.stringify({ error: 'Invalid team name' }) };
        if (!data.teams.some((t) => t.key === key)) {
          data.teams.push({ key, label: body.label.trim(), parentKey: body.parentKey || null });
          await writeJson('teams.json', data);
        }
        return { statusCode: 200, body: JSON.stringify({ ok: true, key }) };
      }

      if (body.action === 'edit') {
        const idx = data.teams.findIndex((t) => t.key === body.key);
        if (idx === -1) return { statusCode: 404, body: JSON.stringify({ error: 'Team not found' }) };
        if (body.label) data.teams[idx].label = body.label.trim();
        if (body.parentKey !== undefined) data.teams[idx].parentKey = body.parentKey || null;
        await writeJson('teams.json', data);
        return { statusCode: 200, body: JSON.stringify({ ok: true }) };
      }

      if (body.action === 'remove') {
        // Orphan any children of a removed team rather than deleting them.
        data.teams = data.teams
          .filter((t) => t.key !== body.key)
          .map((t) => (t.parentKey === body.key ? { ...t, parentKey: null } : t));
        await writeJson('teams.json', data);
        return { statusCode: 200, body: JSON.stringify({ ok: true }) };
      }

      return { statusCode: 400, body: JSON.stringify({ error: `Unknown action: ${body.action}` }) };
    }

    return { statusCode: 405, body: 'Method not allowed' };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
