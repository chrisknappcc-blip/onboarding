import { readBinary } from './utils/azureBlob.js';

// Public on purpose, same reasoning as get-image.js: downloads can't attach
// an auth header, and only unguessable random keys under content/files/ are
// ever served - the actual storage credentials never reach the client.

export async function handler(event) {
  try {
    const key = event.queryStringParameters?.key;
    const name = (event.queryStringParameters?.name || 'file').replace(/"/g, '');
    const forceDownload = event.queryStringParameters?.download === '1';
    if (!key || !key.startsWith('content/files/')) {
      return { statusCode: 400, body: 'Invalid key' };
    }
    const result = await readBinary(key);
    if (!result) {
      return { statusCode: 404, body: 'Not found' };
    }
    return {
      statusCode: 200,
      headers: {
        'Content-Type': result.contentType,
        'Content-Disposition': `${forceDownload ? 'attachment' : 'inline'}; filename="${name}"`,
        'Cache-Control': 'public, max-age=31536000, immutable'
      },
      body: result.base64,
      isBase64Encoded: true
    };
  } catch (err) {
    return { statusCode: 500, body: err.message };
  }
}
