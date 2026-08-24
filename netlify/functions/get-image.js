import { readBinary } from './utils/azureBlob.js';

// No auth check here on purpose: an <img src="..."> request from the
// browser can't carry an Authorization header, so this has to be reachable
// without one. It only ever serves files under content/images/ with
// unguessable random names - the actual Azure SAS credentials never reach
// the client either way, which is the property that actually matters.

export async function handler(event) {
  try {
    const key = event.queryStringParameters?.key;
    if (!key || !key.startsWith('content/images/')) {
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
        'Cache-Control': 'public, max-age=31536000, immutable'
      },
      body: result.base64,
      isBase64Encoded: true
    };
  } catch (err) {
    return { statusCode: 500, body: err.message };
  }
}
