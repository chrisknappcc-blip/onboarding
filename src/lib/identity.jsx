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

  const value = {
    user,
    initialized,
    login: () => netlifyIdentity.open('login'),
    logout: () => netlifyIdentity.logout(),
    // Roles are set as app_metadata.roles in the Netlify Identity dashboard
    // (Identity > select user > Edit > add role). Use "manager" for Chris,
    // Cole, and John so they see the Team Progress tab.
    roles: netlifyIdentity.currentUser()?.app_metadata?.roles || [],
    // Track is set the same way: app_metadata.track = "bdr" or "ae".
    track: netlifyIdentity.currentUser()?.app_metadata?.track || 'bdr'
  };

  return <IdentityContext.Provider value={value}>{children}</IdentityContext.Provider>;
}

export function useIdentity() {
  const ctx = useContext(IdentityContext);
  if (!ctx) throw new Error('useIdentity must be used inside IdentityProvider');
  return ctx;
}
