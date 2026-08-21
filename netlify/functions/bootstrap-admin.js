// This is the one function in the app that does NOT check for a logged-in
// user - it exists specifically to solve the bootstrap problem: you can't
// log into Manage Access to create your first account if you don't have an
// account yet. Instead, it's gated by a shared secret you set as an env var.
//
// IMPORTANT: once you've used this to create your own admin account, either
// delete this file (and redeploy) or at minimum remove the
// BOOTSTRAP_ADMIN_SECRET env var. Leaving a secret-gated "create an admin
// account" endpoint live indefinitely is an unnecessary standing risk.

export async function handler(event, context) {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method not allowed' };
    }

    const configuredSecret = process.env.BOOTSTRAP_ADMIN_SECRET;
    if (!configuredSecret) {
      return { statusCode: 500, body: JSON.stringify({ error: 'BOOTSTRAP_ADMIN_SECRET is not set in Netlify env vars yet.' }) };
    }

    const { secret, email, fullName, password, userId } = JSON.parse(event.body || '{}');
    if (secret !== configuredSecret) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Invalid secret' }) };
    }

    const identity = context.clientContext?.identity;
    if (!identity) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Identity admin context not available - is Identity enabled on this site?' }) };
    }
    const { url, token } = identity;

    // Fixup path: confirm an existing (already-created-but-unconfirmed)
    // account by id, without trying to recreate it.
    if (userId) {
      const confirmRes = await fetch(`${url}/admin/users/${userId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmed_at: new Date().toISOString() })
      });
      if (!confirmRes.ok) {
        const text = await confirmRes.text().catch(() => '');
        throw new Error(`Confirm failed: ${confirmRes.status} ${text}`);
      }
      return { statusCode: 200, body: JSON.stringify({ ok: true, confirmed: userId }) };
    }

    if (!email || !password) {
      return { statusCode: 400, body: JSON.stringify({ error: 'email and password are required' }) };
    }

    const res = await fetch(`${url}/admin/users`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: fullName ? { full_name: fullName } : undefined,
        app_metadata: {
          roles: ['admin'],
          track: 'bdr',
          defaultTeamView: 'mine',
          mustChangePassword: true
        }
      })
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Bootstrap create failed: ${res.status} ${text}`);
    }

    const created = await res.json();

    // email_confirm: true at creation time isn't reliably honored - force
    // confirmation explicitly as a follow-up so login doesn't hit
    // "Email not confirmed".
    const confirmRes = await fetch(`${url}/admin/users/${created.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmed_at: new Date().toISOString() })
    });
    if (!confirmRes.ok) {
      const text = await confirmRes.text().catch(() => '');
      throw new Error(`Account created but confirming email failed: ${confirmRes.status} ${text}`);
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true, id: created.id }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
