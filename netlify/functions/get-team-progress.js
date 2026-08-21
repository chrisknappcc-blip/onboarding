import { readJson } from './utils/azureBlob.js';
import { getUserEmail, isAdmin, isManagerRole, getDefaultTeamView } from './utils/auth.js';

const ACCOUNT = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const SAS = process.env.AZURE_STORAGE_SAS_TOKEN;
const CONTAINER = process.env.AZURE_ONBOARDING_CONTAINER || 'onboarding-cc';

// Needs List ("l") permission on the container's SAS token - see DEPLOY.md.
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
    const admin = isAdmin(context);
    const managerOnly = isManagerRole(context) && !admin;

    if (!admin && !managerOnly) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Manager or admin role required' }) };
    }

    const requesterEmail = getUserEmail(context);
    // Managers can never widen scope past their own team, regardless of what
    // the client sends. Admins choose via ?scope=mine|all, defaulting to
    // whatever's set on their account (Chris: mine, John: all).
    const scope = managerOnly ? 'mine' : (event.queryStringParameters?.scope || getDefaultTeamView(context));

    const track = event.queryStringParameters?.track || 'bdr';
    const blobNames = await listProgressBlobs(track);

    let rows = await Promise.all(
      blobNames.map(async (name) => {
        const data = await readJson(name, { tasks: [] });
        const userId = name.split('/').pop().replace('.json', '');
        return {
          userId,
          name: data.userName || userId,
          managerId: data.managerId || null,
          tasks: data.tasks,
          doneCount: data.tasks.filter((t) => t.done).length,
          totalCount: data.tasks.length,
          lastActive: data.lastActive ? new Date(data.lastActive).toLocaleDateString() : '—'
        };
      })
    );

    if (scope === 'mine') {
      rows = rows.filter((r) => r.managerId === requesterEmail);
    }

    return { statusCode: 200, body: JSON.stringify({ rows, scope, canToggleScope: admin }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
