import { readJson, writeJson } from './utils/azureBlob.js';
import { getUserEmail, hasTeamAccess, isAdmin } from './utils/auth.js';

// Content model: each manager owns their own set of blocks per section,
// stored at content/{managerEmail}/{section}.json as { title, blocks: [...] }.
// A block is { id, type: 'text'|'link'|'task', text?, label?, url? }.
// Every manually-added block also gets folded into a shared library at
// content/library/{section}.json so other managers can reuse it instead of
// retyping - that's the "dropdown selector on top of manual add" piece.

function libraryKey(block) {
  if (block.type === 'link') return `link:${(block.url || '').trim().toLowerCase()}`;
  return `${block.type}:${(block.text || '').trim().toLowerCase()}`;
}

async function upsertIntoLibrary(section, block) {
  const path = `content/library/${section}.json`;
  const lib = await readJson(path, { blocks: [] });
  const key = libraryKey(block);
  const exists = lib.blocks.some((b) => libraryKey(b) === key);
  if (!exists) {
    lib.blocks.push({ ...block, id: `lib-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` });
    await writeJson(path, lib);
  }
}

export async function handler(event, context) {
  try {
    if (!hasTeamAccess(context)) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Manager or admin role required' }) };
    }
    const requesterEmail = getUserEmail(context);
    const admin = isAdmin(context);

    if (event.httpMethod === 'GET') {
      const section = event.queryStringParameters?.section;
      const requestedManagerId = event.queryStringParameters?.managerId;
      if (!section) return { statusCode: 400, body: JSON.stringify({ error: 'section is required' }) };

      // Managers can only ever look at their own content; admins can pick
      // any manager via the dropdown in the UI.
      const managerId = admin && requestedManagerId ? requestedManagerId : requesterEmail;

      const mine = await readJson(`content/${managerId}/${section}.json`, { blocks: [] });
      const library = await readJson(`content/library/${section}.json`, { blocks: [] });
      return { statusCode: 200, body: JSON.stringify({ managerId, mine: mine.blocks, library: library.blocks }) };
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { section, action, requestedManagerId } = body;
      if (!section || !action) {
        return { statusCode: 400, body: JSON.stringify({ error: 'section and action are required' }) };
      }
      const managerId = admin && requestedManagerId ? requestedManagerId : requesterEmail;
      const path = `content/${managerId}/${section}.json`;
      const current = await readJson(path, { blocks: [] });

      if (action === 'addManual') {
        const block = {
          ...body.block,
          id: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
        };
        current.blocks.push(block);
        await writeJson(path, current);
        await upsertIntoLibrary(section, block);
        return { statusCode: 200, body: JSON.stringify({ ok: true, block }) };
      }

      if (action === 'addFromLibrary') {
        const library = await readJson(`content/library/${section}.json`, { blocks: [] });
        const found = library.blocks.find((b) => b.id === body.blockId);
        if (!found) return { statusCode: 404, body: JSON.stringify({ error: 'Library item not found' }) };
        const block = { ...found, id: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` };
        current.blocks.push(block);
        await writeJson(path, current);
        return { statusCode: 200, body: JSON.stringify({ ok: true, block }) };
      }

      if (action === 'remove') {
        current.blocks = current.blocks.filter((b) => b.id !== body.blockId);
        await writeJson(path, current);
        return { statusCode: 200, body: JSON.stringify({ ok: true }) };
      }

      return { statusCode: 400, body: JSON.stringify({ error: `Unknown action: ${action}` }) };
    }

    return { statusCode: 405, body: 'Method not allowed' };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
