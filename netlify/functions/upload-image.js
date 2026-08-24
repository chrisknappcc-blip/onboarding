import { writeBinary } from './utils/azureBlob.js';
import { hasTeamAccess } from './utils/auth.js';

const MAX_BYTES = 2 * 1024 * 1024; // 2MB - plenty for a thumbnail, keeps Netlify's payload limits comfortable

const EXT_BY_TYPE = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg'
};

export async function handler(event, context) {
  try {
    if (!hasTeamAccess(context)) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Manager or admin role required' }) };
    }
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method not allowed' };
    }

    const { dataBase64, contentType } = JSON.parse(event.body || '{}');
    if (!dataBase64 || !contentType) {
      return { statusCode: 400, body: JSON.stringify({ error: 'dataBase64 and contentType are required' }) };
    }
    const ext = EXT_BY_TYPE[contentType];
    if (!ext) {
      return { statusCode: 400, body: JSON.stringify({ error: `Unsupported image type: ${contentType}` }) };
    }

    const approxBytes = Math.ceil((dataBase64.length * 3) / 4);
    if (approxBytes > MAX_BYTES) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Image is too large - please use one under 2MB' }) };
    }

    const key = `content/images/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    await writeBinary(key, dataBase64, contentType);

    return { statusCode: 200, body: JSON.stringify({ url: `/.netlify/functions/get-image?key=${encodeURIComponent(key)}` }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
