// With Netlify Identity enabled, any request that includes
// `Authorization: Bearer <jwt>` (see src/lib/api.js) gets automatically
// verified and decoded by Netlify's runtime into context.clientContext.user.
// No manual JWT verification needed here.

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

export function getUserEmail(context) {
  return getUser(context).email;
}

export function getUserName(context) {
  const user = getUser(context);
  return user.user_metadata?.full_name || user.email;
}

// "admin" (Chris, John): full visibility across every team.
// "manager" (Cole): visibility restricted server-side to people whose
// app_metadata.managerId matches this user's email - the client cannot
// override this by passing a different scope.
export function getRoles(context) {
  return context?.clientContext?.user?.app_metadata?.roles || [];
}

export function isAdmin(context) {
  return getRoles(context).includes('admin');
}

export function isManagerRole(context) {
  return getRoles(context).includes('manager');
}

export function hasTeamAccess(context) {
  return isAdmin(context) || isManagerRole(context);
}

// Who a person reports to, used to tag their progress blob so managers can
// be filtered to just their own reports. Set via app_metadata.managerId
// (the manager's email) - see DEPLOY.md.
export function getManagerId(context) {
  return context?.clientContext?.user?.app_metadata?.managerId || null;
}

// Where an admin's Team Progress view starts: "mine" (Chris) or "all" (John).
// Managers (non-admin) never get a choice - always "mine".
export function getDefaultTeamView(context) {
  return context?.clientContext?.user?.app_metadata?.defaultTeamView || 'mine';
}

export function getUserTrack(context) {
  return context?.clientContext?.user?.app_metadata?.track || 'bdr';
}
