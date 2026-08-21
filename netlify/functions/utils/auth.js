// With Netlify Identity enabled, any request that includes
// `Authorization: Bearer <jwt>` (see src/lib/api.js) gets automatically
// verified and decoded by Netlify's runtime into context.clientContext.user.
// No manual JWT verification needed here - that's the point of using
// Netlify's own auth instead of a third-party provider.

export function getUser(context) {
  const user = context?.clientContext?.user;
  if (!user) {
    throw new Error('Not signed in (no Netlify Identity user on request)');
  }
  return user;
}

export function getUserId(context) {
  return getUser(context).sub;
}

export function getUserName(context) {
  const user = getUser(context);
  return user.user_metadata?.full_name || user.email;
}

export function isManager(context) {
  const user = context?.clientContext?.user;
  const roles = user?.app_metadata?.roles || [];
  return roles.includes('manager');
}
