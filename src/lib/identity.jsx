import { createContext, useContext, useEffect, useState } from 'react';
import netlifyIdentity from 'netlify-identity-widget';

const IdentityContext = createContext(null);

export function IdentityProvider({ children }) {
  const [user, setUser] = useState(netlifyIdentity.currentUser());
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    netlifyIdentity.on('init', (u) => { setUser(u); setInitialized(true); });
    netlifyIdentity.on('login', (u) => { setUser(u); netlifyIdentity.close(); });
    netlifyIdentity.on('logout', () => setUser(null));
    netlifyIdentity.init();

    return () => {
      netlifyIdentity.off('init');
      netlifyIdentity.off('login');
      netlifyIdentity.off('logout');
    };
  }, []);

  const meta = user?.app_metadata || {};
  const roles = meta.roles || [];

  const value = {
    user,
    initialized,
    login: () => netlifyIdentity.open('login'),
    logout: () => netlifyIdentity.logout(),
    roles,
    isAdmin: roles.includes('admin'),          // Chris, John - see everyone
    isManagerRole: roles.includes('manager'),  // Cole - scoped to his own team
    hasTeamAccess: roles.includes('admin') || roles.includes('manager'),
    track: meta.track || 'bdr',
    // "mine" (Chris) or "all" (John) - only relevant for admins
    defaultTeamView: meta.defaultTeamView || 'mine',
    // Whoever manages this person - used to key their own content library
    managerId: meta.managerId || user?.email || null,
    email: user?.email || null
  };

  return <IdentityContext.Provider value={value}>{children}</IdentityContext.Provider>;
}

export function useIdentity() {
  const ctx = useContext(IdentityContext);
  if (!ctx) throw new Error('useIdentity must be used inside IdentityProvider');
  return ctx;
}
