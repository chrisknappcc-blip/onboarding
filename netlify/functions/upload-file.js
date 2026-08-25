import { writeBinary } from './utils/azureBlob.js';
import { hasTeamAccess } from './utils/auth.js';

const MAX_BYTES = 4 * 1024 * 1024; // 4MB - keeps comfortably under Netlify's function payload limit once base64 overhead is added

const EXT_BY_TYPE = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'text/csv': 'csv',
  'text/plain': 'txt',
  'image/png': 'png',
  'image/jpeg': 'jpg'
};

export async function handler(event, context) {
  try {
    if (!hasTeamAccess(context)) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Manager or admin role required' }) };
    }
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method not allowed' };
    }

    const { dataBase64, contentType, fileName } = JSON.parse(event.body || '{}');
    if (!dataBase64 || !contentType || !fileName) {
      return { statusCode: 400, body: JSON.stringify({ error: 'dataBase64, contentType, and fileName are required' }) };
    }

    const approxBytes = Math.ceil((dataBase64.length * 3) / 4);
    if (approxBytes > MAX_BYTES) {
      return { statusCode: 400, body: JSON.stringify({ error: 'File is too large - please use one under 4MB' }) };
    }

    const ext = EXT_BY_TYPE[contentType] || (fileName.includes('.') ? fileName.split('.').pop() : 'bin');
    const key = `content/files/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    await writeBinary(key, dataBase64, contentType);

    const url = `/.netlify/functions/get-file?key=${encodeURIComponent(key)}&name=${encodeURIComponent(fileName)}`;
    return { statusCode: 200, body: JSON.stringify({ url, fileName, contentType }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
