import { readJson, writeJson } from './utils/azureBlob.js';
import { isAdmin } from './utils/auth.js';
import { ALL_CONTENT_SECTIONS } from '../../src/config/contentSections.js';

const ACCOUNT = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const SAS = process.env.AZURE_STORAGE_SAS_TOKEN;
const CONTAINER = process.env.AZURE_ONBOARDING_CONTAINER || 'onboarding-cc';

async function listPresetBlobs() {
  const prefix = 'presets/';
  const url = `https://${ACCOUNT}.blob.core.windows.net/${CONTAINER}?restype=container&comp=list&prefix=${encodeURIComponent(prefix)}&${SAS}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Azure list failed: ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<Name>(.*?)<\/Name>/g)].map((m) => m[1]);
}

export async function handler(event, context) {
  try {
    if (!isAdmin(context)) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Admin role required' }) };
    }

    if (event.httpMethod === 'GET') {
      const blobNames = await listPresetBlobs();
      const presets = await Promise.all(
        blobNames.map(async (name) => {
          const data = await readJson(name, null);
          return data ? { name: data.name, savedAt: data.savedAt, savedFrom: data.savedFrom } : null;
        })
      );
      return { statusCode: 200, body: JSON.stringify({ presets: presets.filter(Boolean) }) };
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');

      if (body.action === 'save') {
        const { name, sourceManagerId } = body;
        if (!name || !sourceManagerId) {
          return { statusCode: 400, body: JSON.stringify({ error: 'name and sourceManagerId are required' }) };
        }
        const sections = {};
        for (const key of ALL_CONTENT_SECTIONS) {
          const data = await readJson(`content/${sourceManagerId}/${key}.json`, { blocks: [] });
          sections[key] = data.blocks || [];
        }
        const safeName = name.trim().replace(/[^a-zA-Z0-9 _-]/g, '');
        await writeJson(`presets/${safeName}.json`, {
          name: name.trim(),
          savedAt: new Date().toISOString(),
          savedFrom: sourceManagerId,
          sections
        });
        return { statusCode: 200, body: JSON.stringify({ ok: true }) };
      }

      if (body.action === 'apply') {
        const { name, targetManagerId } = body;
        if (!name || !targetManagerId) {
          return { statusCode: 400, body: JSON.stringify({ error: 'name and targetManagerId are required' }) };
        }
        const safeName = name.trim().replace(/[^a-zA-Z0-9 _-]/g, '');
        const preset = await readJson(`presets/${safeName}.json`, null);
        if (!preset) return { statusCode: 404, body: JSON.stringify({ error: 'Preset not found' }) };

        for (const key of ALL_CONTENT_SECTIONS) {
          await writeJson(`content/${targetManagerId}/${key}.json`, { blocks: preset.sections[key] || [] });
        }
        return { statusCode: 200, body: JSON.stringify({ ok: true }) };
      }

      if (body.action === 'delete') {
        const safeName = (body.name || '').trim().replace(/[^a-zA-Z0-9 _-]/g, '');
        await writeJson(`presets/${safeName}.json`, null);
        return { statusCode: 200, body: JSON.stringify({ ok: true }) };
      }

      if (body.action === 'rename') {
        const { oldName, newName } = body;
        if (!oldName || !newName) {
          return { statusCode: 400, body: JSON.stringify({ error: 'oldName and newName are required' }) };
        }
        const safeOld = oldName.trim().replace(/[^a-zA-Z0-9 _-]/g, '');
        const safeNew = newName.trim().replace(/[^a-zA-Z0-9 _-]/g, '');
        const preset = await readJson(`presets/${safeOld}.json`, null);
        if (!preset) return { statusCode: 404, body: JSON.stringify({ error: 'Preset not found' }) };
        preset.name = newName.trim();
        await writeJson(`presets/${safeNew}.json`, preset);
        if (safeNew !== safeOld) await writeJson(`presets/${safeOld}.json`, null);
        return { statusCode: 200, body: JSON.stringify({ ok: true }) };
      }

      return { statusCode: 400, body: JSON.stringify({ error: `Unknown action: ${body.action}` }) };
    }

    return { statusCode: 405, body: 'Method not allowed' };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
