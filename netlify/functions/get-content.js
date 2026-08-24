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
    if (!section) {
      return { statusCode: 400, body: JSON.stringify({ error: 'section is required' }) };
    }

    // Resolution order: the viewer's own manager's customized content first
    // (set via the Content Library page), then a track-wide default, then a
    // shared fallback used across all tracks.
    let data = null;
    if (managerId) {
      data = await readJson(`content/${managerId}/${section}.json`, null);
    }
    if (!data) data = await readJson(`content/${track}/${section}.json`, null);
    if (!data) data = await readJson(`content/shared/${section}.json`, null);

    const result = data || { title: TITLES[section] || section, blocks: [] };
    if (!result.title) result.title = TITLES[section] || section;
    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
