import { useIdentity } from '../lib/identity.jsx';
import Sidebar from './Sidebar.jsx';

export default function Layout({ track, isManager, children }) {
  const { user, logout } = useIdentity();

  return (
    <div className="min-h-screen flex">
      <Sidebar track={track} isManager={isManager} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-6 shrink-0">
          <span className="text-sm font-medium text-gray-500">{track.label}</span>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{user?.email}</span>
            <button onClick={logout} className="text-sm text-gray-400 hover:text-gray-600">
              Log out
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  );
}
