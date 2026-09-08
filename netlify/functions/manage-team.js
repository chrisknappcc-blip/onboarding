import { isAdmin, getUserId } from './utils/auth.js';

// Uses Netlify's built-in Identity Admin credentials, which Netlify attaches
// to every function invocation on an Identity-enabled site as
// context.clientContext.identity = { url, token }. This is NOT the same as
// context.clientContext.user (the caller's own decoded JWT) - it's a
// site-level admin credential for calling GoTrue's Admin API directly.
// We gate all use of it behind our own isAdmin() check below, since Netlify
// hands us this credential regardless of the caller's role.

export async function handler(event, context) {
  try {
    if (!isAdmin(context)) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Admin role required' }) };
    }

    const identity = context.clientContext?.identity;
    if (!identity) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Identity admin context not available - is Identity enabled on this site?' }) };
    }
    const { url, token } = identity;
    const authHeader = { Authorization: `Bearer ${token}` };

    if (event.httpMethod === 'GET') {
      const res = await fetch(`${url}/admin/users?per_page=200`, { headers: authHeader });
      if (!res.ok) throw new Error(`Identity admin list failed: ${res.status}`);
      const data = await res.json();
      const users = (data.users || []).map((u) => ({
        id: u.id,
        email: u.email,
        fullName: u.user_metadata?.full_name || '',
        confirmed: Boolean(u.confirmed_at),
        appMetadata: u.app_metadata || {}
      }));
      return { statusCode: 200, body: JSON.stringify({ users, selfId: getUserId(context) }) };
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');

      // Create a new user directly with a password, bypassing Netlify's
      // invite email entirely. Exists because corporate email scanners
      // (e.g. Microsoft Defender Safe Links) pre-fetch links in incoming
      // mail to scan them, which burns Netlify Identity's one-time invite
      // token before the real person ever clicks it.
      if (body.action === 'create') {
        const { email, fullName, password, appMetadata } = body;
        if (!email || !password) {
          return { statusCode: 400, body: JSON.stringify({ error: 'email and password are required' }) };
        }
        const res = await fetch(`${url}/admin/users`, {
          method: 'POST',
          headers: { ...authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`Identity admin create failed: ${res.status} ${text}`);
        }
        const created = await res.json();

        // Fields sent at creation time (confirm status, app_metadata)
        // aren't reliably applied on Netlify's implementation - only a
        // follow-up PUT actually sticks, so everything goes there instead.
        // "confirm" (a plain boolean) is the field Netlify's own GoTrue
        // fork actually reads - confirmed_at and email_confirm are both
        // silently ignored, the former being Supabase's naming convention
        // for the same underlying project, not Netlify's.
        const patchRes = await fetch(`${url}/admin/users/${created.id}`, {
          method: 'PUT',
          headers: { ...authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            confirm: true,
            app_metadata: appMetadata || {},
            ...(fullName ? { user_metadata: { full_name: fullName } } : {})
          })
        });
        if (!patchRes.ok) {
          const text = await patchRes.text().catch(() => '');
          throw new Error(`Account created but confirming/setting role failed: ${patchRes.status} ${text}`);
        }

        return { statusCode: 200, body: JSON.stringify({ id: created.id }) };
      }

      // Safe fixup for an account that got stuck unconfirmed (e.g. created
      // before this fix existed) - only ever touches the confirm field,
      // never roles or other metadata, so it can't accidentally grant
      // access.
      if (body.action === 'confirm') {
        const { userId } = body;
        if (!userId) return { statusCode: 400, body: JSON.stringify({ error: 'userId is required' }) };
        const res = await fetch(`${url}/admin/users/${userId}`, {
          method: 'PUT',
          headers: { ...authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({ confirm: true })
        });
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`Confirm failed: ${res.status} ${text}`);
        }
        const updated = await res.json();
        // Read it back fresh so the caller can see whether it actually took,
        // rather than trusting a 200 that might not reflect a real change.
        const verifyRes = await fetch(`${url}/admin/users/${userId}`, { headers: authHeader });
        const verified = verifyRes.ok ? await verifyRes.json() : null;
        return {
          statusCode: 200,
          body: JSON.stringify({
            ok: true,
            confirmedAtFromResponse: updated.confirmed_at || null,
            confirmedAtVerified: verified?.confirmed_at || null
          })
        };
      }

      // Existing path: update roles/track/managerId on an existing user.
      const { userId, appMetadata } = body;
      if (!userId || !appMetadata) {
        return { statusCode: 400, body: JSON.stringify({ error: 'userId and appMetadata are required' }) };
      }
      const res = await fetch(`${url}/admin/users/${userId}`, {
        method: 'PUT',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_metadata: appMetadata })
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Identity admin update failed: ${res.status} ${text}`);
      }
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, body: 'Method not allowed' };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
