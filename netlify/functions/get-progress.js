import { readJson } from './utils/azureBlob.js';
import { getUserId } from './utils/auth.js';

export async function handler(event, context) {
  try {
    const userId = getUserId(context);
    const track = event.queryStringParameters?.track || 'bdr';
    const data = await readJson(`progress/${track}/${userId}.json`, { tasks: [] });
    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (err) {
    return { statusCode: 401, body: JSON.stringify({ error: err.message }) };
  }
}
