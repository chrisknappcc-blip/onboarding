import { readJson } from './utils/azureBlob.js';
import { getUserEmail, isAdmin, isManagerRole, getDefaultTeamView } from './utils/auth.js';
import { getTrack } from '../../src/config/tracks.js';

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

// Mirrors get-content.js's resolution order (team -> manager -> track ->
// shared) so a "not started yet" placeholder shows the same task count the
// person will actually see once they open My Tasks - without this, someone
// with a custom checklist would show "0/0" instead of "0/38".
async function resolveTaskCount(managerId, team, track) {
  const hasContent = (d) => d && Array.isArray(d.blocks) && d.blocks.length > 0;
  let data = null;
  if (team) {
    const teamData = await readJson(`content/team:${team}/tasks.json`, null);
    if (hasContent(teamData)) data = teamData;
  }
  if (!data && managerId) {
    const managerData = await readJson(`content/${managerId}/tasks.json`, null);
    if (hasContent(managerData)) data = managerData;
  }
  if (!data) {
    const trackData = await readJson(`content/${track}/tasks.json`, null);
    if (hasContent(trackData)) data = trackData;
  }
  if (!data) data = await readJson(`content/shared/tasks.json`, null);
  if (hasContent(data)) return data.blocks.length;
  return getTrack(track).defaultTasks.length;
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
          team: data.team || null,
          tasks: data.tasks,
          doneCount: data.tasks.filter((t) => t.done).length,
          totalCount: data.tasks.length,
          lastActive: data.lastActive ? new Date(data.lastActive).toLocaleDateString() : '—',
          started: true
        };
      })
    );

    if (scope === 'mine') {
      rows = rows.filter((r) => r.managerId === requesterEmail);
    }

    // Also surface people assigned to this manager/track via Identity who
    // haven't opened the app yet at all - otherwise a newly created hire is
    // invisible until their first login creates a progress record.
    const identity = context.clientContext?.identity;
    if (identity) {
      const listRes = await fetch(`${identity.url}/admin/users?per_page=200`, {
        headers: { Authorization: `Bearer ${identity.token}` }
      });
      if (listRes.ok) {
        const identityData = await listRes.json();
        const knownIds = new Set(rows.map((r) => r.userId));
        const candidates = (identityData.users || []).filter((u) => {
          if (knownIds.has(u.id)) return false;
          const meta = u.app_metadata || {};
          if ((meta.track || 'bdr') !== track) return false;
          if (scope === 'mine') return meta.managerId === requesterEmail;
          return Boolean(meta.managerId); // "all" scope: anyone with a manager assigned on this track
        });

        const placeholders = await Promise.all(
          candidates.map(async (u) => {
            const meta = u.app_metadata || {};
            const total = await resolveTaskCount(meta.managerId, meta.team, track);
            return {
              userId: u.id,
              name: u.user_metadata?.full_name || u.email,
              managerId: meta.managerId || null,
              team: meta.team || null,
              tasks: [],
              doneCount: 0,
              totalCount: total,
              lastActive: 'Not started yet',
              started: false
            };
          })
        );
        rows = [...rows, ...placeholders];
      }
    }

    return { statusCode: 200, body: JSON.stringify({ rows, scope, canToggleScope: admin }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
