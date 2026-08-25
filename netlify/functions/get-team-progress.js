import { readJson } from './utils/azureBlob.js';
import { getUserEmail, isAdmin, isManagerRole, getDefaultTeamView } from './utils/auth.js';
import { getTrack } from '../../src/config/tracks.js';

// Mirrors get-content.js's resolution order (team -> manager -> track ->
// shared) so the roster always reflects the exact checklist a person will
// see in their own My Tasks, not just whatever subset they've touched so
// far. Returns the full task list, not just a count - a saved progress
// record only ever contains tasks someone has explicitly checked/unchecked,
// so relying on it alone undercounts everyone who hasn't clicked every item.
async function resolveTaskTemplate(managerId, team, track) {
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
  if (hasContent(data)) {
    return data.blocks.map((b) => ({ id: b.id, title: b.text, section: 'task-queue', category: b.category || null }));
  }
  return getTrack(track).defaultTasks;
}

export async function handler(event, context) {
  try {
    const admin = isAdmin(context);
    const managerOnly = isManagerRole(context) && !admin;
    if (!admin && !managerOnly) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Manager or admin role required' }) };
    }

    const requesterEmail = getUserEmail(context);
    const scope = managerOnly ? 'mine' : (event.queryStringParameters?.scope || getDefaultTeamView(context));
    const track = event.queryStringParameters?.track || 'bdr';

    const identity = context.clientContext?.identity;
    if (!identity) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Identity admin context not available' }) };
    }
    const listRes = await fetch(`${identity.url}/admin/users?per_page=200`, {
      headers: { Authorization: `Bearer ${identity.token}` }
    });
    if (!listRes.ok) throw new Error(`Identity admin list failed: ${listRes.status}`);
    const identityData = await listRes.json();

    const candidates = (identityData.users || []).filter((u) => {
      const meta = u.app_metadata || {};
      if ((meta.track || 'bdr') !== track) return false;
      if (scope === 'mine') return meta.managerId === requesterEmail;
      return true; // "all" scope (admin only): everyone on this track
    });

    const rows = await Promise.all(
      candidates.map(async (u) => {
        const meta = u.app_metadata || {};
        const template = await resolveTaskTemplate(meta.managerId, meta.team, track);
        const saved = await readJson(`progress/${track}/${u.id}.json`, { tasks: [] });
        const savedById = new Map(saved.tasks.map((t) => [t.id, t]));

        const merged = template.map((t) => {
          const s = savedById.get(t.id);
          return {
            id: t.id,
            title: t.title,
            section: t.section,
            category: t.category || null,
            done: s?.done || false,
            starred: s?.starred || false
          };
        });
        // Tasks the person (or a manager) added that aren't part of the template
        const extra = saved.tasks.filter((t) => !template.some((tt) => tt.id === t.id));
        const allTasks = [...merged, ...extra];

        return {
          userId: u.id,
          name: saved.userName || u.user_metadata?.full_name || u.email,
          managerId: meta.managerId || null,
          team: meta.team || null,
          tasks: allTasks,
          doneCount: allTasks.filter((t) => t.done).length,
          totalCount: allTasks.length,
          lastActive: saved.lastActive ? new Date(saved.lastActive).toLocaleDateString() : 'Not started yet'
        };
      })
    );

    return { statusCode: 200, body: JSON.stringify({ rows, scope, canToggleScope: admin }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
