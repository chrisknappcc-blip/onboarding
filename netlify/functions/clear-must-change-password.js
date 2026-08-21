// Unlike manage-team.js, this does NOT require the admin role - any logged-in
// user can call it, but only to modify their OWN app_metadata, and only the
// mustChangePassword field. It never accepts a target userId, so there's no
// way to use this to touch anyone else's account or escalate your own roles.

export async function handler(event, context) {
  try {
    const user = context.clientContext?.user;
    if (!user) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Not signed in' }) };
    }
    const identity = context.clientContext?.identity;
    if (!identity) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Identity admin context not available' }) };
    }
    const { url, token } = identity;

    const updatedMetadata = { ...(user.app_metadata || {}), mustChangePassword: false };

    const res = await fetch(`${url}/admin/users/${user.sub}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_metadata: updatedMetadata })
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Clear flag failed: ${res.status} ${text}`);
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
