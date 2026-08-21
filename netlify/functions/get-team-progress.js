import { readJson } from './utils/azureBlob.js';
import { isManager } from './utils/auth.js';

const ACCOUNT = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const SAS = process.env.AZURE_STORAGE_SAS_TOKEN;
const CONTAINER = process.env.AZURE_ONBOARDING_CONTAINER || 'onboarding-hub';

// Note: this needs List ("l") permission on the container's SAS token.
// Check whether AZURE_STORAGE_SAS_TOKEN already has it, or regenerate one
// scoped to this container with read + list + write + create.
async function listProgressBlobs(track) {
  const prefix = `progress/${track}/`;
  const url = `https://${ACCOUNT}.blob.core.windows.net/${CONTAINER}?restype=container&comp=list&prefix=${encodeURIComponent(prefix)}&${SAS}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Azure list failed: ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<Name>(.*?)<\/Name>/g)].map((m) => m[1]);
}

export async function handler(event, context) {
  try {
    if (!isManager(context)) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Manager role required' }) };
    }

    const track = event.queryStringParameters?.track || 'bdr';
    const blobNames = await listProgressBlobs(track);

    const rows = await Promise.all(
      blobNames.map(async (name) => {
        const data = await readJson(name, { tasks: [] });
        const userId = name.split('/').pop().replace('.json', '');
        return {
          userId,
          name: data.userName || userId,
          tasks: data.tasks,
          doneCount: data.tasks.filter((t) => t.done).length,
          totalCount: data.tasks.length,
          lastActive: data.lastActive ? new Date(data.lastActive).toLocaleDateString() : '—'
        };
      })
    );

    return { statusCode: 200, body: JSON.stringify(rows) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
