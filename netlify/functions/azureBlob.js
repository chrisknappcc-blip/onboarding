// Matches the pattern used across Chris's other tools (Cipher, Persona Scout):
// AZURE_STORAGE_ACCOUNT_NAME + AZURE_STORAGE_SAS_TOKEN, not a connection string.

const ACCOUNT = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const SAS = process.env.AZURE_STORAGE_SAS_TOKEN;
const CONTAINER = process.env.AZURE_ONBOARDING_CONTAINER || 'onboarding-cc';

function blobUrl(blobName) {
  return `https://${ACCOUNT}.blob.core.windows.net/${CONTAINER}/${encodeURIComponent(blobName)}?${SAS}`;
}

export async function readJson(blobName, fallback = null) {
  const res = await fetch(blobUrl(blobName));
  if (res.status === 404) return fallback;
  if (!res.ok) throw new Error(`Azure read failed for ${blobName}: ${res.status}`);
  return res.json();
}

export async function writeJson(blobName, data) {
  const res = await fetch(blobUrl(blobName), {
    method: 'PUT',
    headers: {
      'x-ms-blob-type': 'BlockBlob',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`Azure write failed for ${blobName}: ${res.status}`);
  return true;
}

export async function writeBinary(blobName, base64Data, contentType) {
  const buffer = Buffer.from(base64Data, 'base64');
  const res = await fetch(blobUrl(blobName), {
    method: 'PUT',
    headers: {
      'x-ms-blob-type': 'BlockBlob',
      'Content-Type': contentType || 'application/octet-stream'
    },
    body: buffer
  });
  if (!res.ok) throw new Error(`Azure binary write failed for ${blobName}: ${res.status}`);
  return true;
}

export async function readBinary(blobName) {
  const res = await fetch(blobUrl(blobName));
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Azure binary read failed for ${blobName}: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  const contentType = res.headers.get('content-type') || 'application/octet-stream';
  return { base64: Buffer.from(arrayBuffer).toString('base64'), contentType };
}
