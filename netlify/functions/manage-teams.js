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
          data.teams.push({ key, label: body.label.trim() });
          await writeJson('teams.json', data);
        }
        return { statusCode: 200, body: JSON.stringify({ ok: true, key }) };
      }

      if (body.action === 'remove') {
        data.teams = data.teams.filter((t) => t.key !== body.key);
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
