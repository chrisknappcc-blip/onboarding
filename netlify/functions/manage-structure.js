import { readJson, writeJson } from './utils/azureBlob.js';
import { getUser, isAdmin } from './utils/auth.js';

export async function handler(event, context) {
  try {
    // Any signed-in user can read structure (they need it to render their
    // own nav), but only admins can change it.
    getUser(context);

    if (event.httpMethod === 'GET') {
      const track = event.queryStringParameters?.track || 'bdr';
      const data = await readJson(`structure/${track}.json`, null);
      return { statusCode: 200, body: JSON.stringify(data) };
    }

    if (event.httpMethod === 'POST') {
      if (!isAdmin(context)) {
        return { statusCode: 403, body: JSON.stringify({ error: 'Admin role required' }) };
      }
      const { track, sections } = JSON.parse(event.body || '{}');
      if (!track || !sections) {
        return { statusCode: 400, body: JSON.stringify({ error: 'track and sections are required' }) };
      }
      await writeJson(`structure/${track}.json`, { sections });
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, body: 'Method not allowed' };
  } catch (err) {
    return { statusCode: err.message.includes('signed in') ? 401 : 500, body: JSON.stringify({ error: err.message }) };
  }
}
