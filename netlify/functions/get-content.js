import { readJson } from './utils/azureBlob.js';

const TITLES = {
  playbook: 'Playbook',
  'hubspot-walkthrough': 'HubSpot Walkthrough',
  'gong-library': 'Gong Recordings',
  'app-walkthroughs': 'Tools We Use',
  intranet: 'Intranet',
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
    // shared fallback used across all tracks.
    let data = null;
    if (team) data = await readJson(`content/team:${team}/${section}.json`, null);
    if (!data && managerId) data = await readJson(`content/${managerId}/${section}.json`, null);
    if (!data) data = await readJson(`content/${track}/${section}.json`, null);
    if (!data) data = await readJson(`content/shared/${section}.json`, null);

    const result = data || { title: TITLES[section] || section, blocks: [] };
    if (!result.title) result.title = TITLES[section] || section;
    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
