import { readJson } from './utils/azureBlob.js';

const TITLES = {
  playbook: 'Playbook',
  'hubspot-walkthrough': 'HubSpot Walkthrough',
  'gong-library': 'Gong Recordings',
  'app-walkthroughs': 'Tools We Use',
  intranet: 'Intranet'
};

export async function handler(event) {
  try {
    const track = event.queryStringParameters?.track || 'bdr';
    const section = event.queryStringParameters?.section;
    if (!section) {
      return { statusCode: 400, body: JSON.stringify({ error: 'section is required' }) };
    }

    // Content is authored per-track first, falls back to a shared version
    // (e.g. the HubSpot walkthrough is identical for bdr and ae for now).
    const trackSpecific = await readJson(`content/${track}/${section}.json`, null);
    const shared = trackSpecific || (await readJson(`content/shared/${section}.json`, null));

    const data = shared || { title: TITLES[section] || section, blocks: [] };
    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
