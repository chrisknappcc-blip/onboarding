import { readJson } from './utils/azureBlob.js';

const TITLES = {
  playbook: 'Playbook',
  'hubspot-walkthrough': 'HubSpot Walkthrough',
  'gong-library': 'Gong Recordings',
  'app-walkthroughs': 'Tools We Use',
  intranet: 'Valuable Links',
  tasks: 'Tasks'
};

export async function handler(event) {
  try {
    const track = event.queryStringParameters?.track || 'bdr';
    const section = event.queryStringParameters?.section;
    const managerId = event.queryStringParameters?.managerId;
    const team = event.queryStringParameters?.team;
    if (!section) {
      return { statusCode: 400, body: JSON.stringify({ error: 'section is required' }) };
    }

    // Resolution order: a team-specific bucket (e.g. "Client Executive" vs
    // "Client Delivery" under the same manager) takes priority, then the
    // viewer's manager's own content, then a track-wide default, then a
    // shared fallback used across all tracks. A bucket that exists but is
    // empty (e.g. someone removed everything from it) is treated the same
    // as "no bucket" - otherwise clearing your own content would hide the
    // shared/track default instead of revealing it.
    const hasContent = (d) => d && Array.isArray(d.blocks) && d.blocks.length > 0;
    let data = null;
    if (team) {
      const teamData = await readJson(`content/team:${team}/${section}.json`, null);
      if (hasContent(teamData)) data = teamData;
    }
    if (!data && managerId) {
      const managerData = await readJson(`content/${managerId}/${section}.json`, null);
      if (hasContent(managerData)) data = managerData;
    }
    if (!data) {
      const trackData = await readJson(`content/${track}/${section}.json`, null);
      if (hasContent(trackData)) data = trackData;
    }
    if (!data) data = await readJson(`content/shared/${section}.json`, null);

    const result = data || { title: TITLES[section] || section, blocks: [] };
    if (!result.title) result.title = TITLES[section] || section;
    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
