import { useIdentity } from '../lib/identity.jsx';
import Sidebar from './Sidebar.jsx';

export default function Layout({ track, hasTeamAccess, isAdmin, children }) {
  const { user, logout } = useIdentity();
  const initials = (user?.user_metadata?.full_name || user?.email || '?')
    .split(/[\s@]/)[0]
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen flex bg-surface">
      <Sidebar track={track} hasTeamAccess={hasTeamAccess} isAdmin={isAdmin} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-white flex items-center justify-between px-8 shrink-0">
          <span className="text-sm font-medium text-ink-500">{track.label}</span>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-navy/[0.08] text-navy text-xs font-semibold flex items-center justify-center">
              {initials}
            </div>
            <button onClick={logout} className="text-sm text-ink-300 hover:text-ink-700 transition-colors">
              Log out
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  );
}
