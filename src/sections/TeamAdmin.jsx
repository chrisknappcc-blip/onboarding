import { useEffect, useState } from 'react';
import { Save, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api.js';

const ROLE_OPTIONS = [
  { value: '', label: 'No access' },
  { value: 'manager', label: 'Manager (own team only)' },
  { value: 'admin', label: 'Admin (everyone)' }
];

export default function TeamAdmin() {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [savedId, setSavedId] = useState(null);
  const [drafts, setDrafts] = useState({});

  useEffect(() => {
    api.listTeamUsers()
      .then((data) => {
        setUsers(data.users);
        const initial = {};
        data.users.forEach((u) => {
          initial[u.id] = {
            role: (u.appMetadata.roles || [])[0] || '',
            track: u.appMetadata.track || 'bdr',
            managerId: u.appMetadata.managerId || '',
            defaultTeamView: u.appMetadata.defaultTeamView || 'mine'
          };
        });
        setDrafts(initial);
      })
      .catch((e) => setError(e.message));
  }, []);

  const managers = users
    ? users.filter((u) => {
        const d = drafts[u.id];
        return d && (d.role === 'admin' || d.role === 'manager');
      })
    : [];

  function updateDraft(userId, field, value) {
    setDrafts((prev) => ({ ...prev, [userId]: { ...prev[userId], [field]: value } }));
  }

  async function save(userId) {
    const d = drafts[userId];
    setSavingId(userId);
    setError(null);
    try {
      const appMetadata = {
        roles: d.role ? [d.role] : [],
        track: d.track,
        managerId: d.managerId || undefined,
        defaultTeamView: d.role === 'admin' ? d.defaultTeamView : undefined
      };
      await api.updateTeamUser(userId, appMetadata);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, appMetadata } : u))
      );
      setSavedId(userId);
      setTimeout(() => setSavedId(null), 1500);
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingId(null);
    }
  }

  if (error && !users) return <p className="text-sm text-red-600">Couldn't load users: {error}</p>;
  if (!users) return <p className="text-sm text-ink-300">Loading team members...</p>;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-2.5">
        <ShieldCheck size={22} className="text-navy" />
        <h1 className="font-display text-xl font-semibold text-ink-900">Manage Access</h1>
      </div>
      <p className="text-sm text-ink-500 mt-1">
        Set who's an admin, who's a manager, and which track and manager each person is assigned to.
      </p>

      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

      <div className="mt-6 bg-card border border-border rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1.6fr_1fr_1fr_1.2fr_0.8fr_auto] gap-3 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-300 border-b border-border">
          <span>Person</span>
          <span>Access</span>
          <span>Track</span>
          <span>Reports to</span>
          <span>Default view</span>
          <span></span>
        </div>
        {users.map((u) => {
          const d = drafts[u.id] || {};
          return (
            <div
              key={u.id}
              className="grid grid-cols-[1.6fr_1fr_1fr_1.2fr_0.8fr_auto] gap-3 items-center px-5 py-3 border-b border-border last:border-b-0"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-ink-900 truncate">{u.fullName || u.email}</div>
                <div className="text-xs text-ink-300 truncate">{u.email}</div>
              </div>

              <select
                value={d.role}
                onChange={(e) => updateDraft(u.id, 'role', e.target.value)}
                className="text-sm border border-border rounded-lg px-2 py-1.5 bg-white"
              >
                {ROLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              <select
                value={d.track}
                onChange={(e) => updateDraft(u.id, 'track', e.target.value)}
                className="text-sm border border-border rounded-lg px-2 py-1.5 bg-white"
              >
                <option value="bdr">BDR</option>
                <option value="ae">AE</option>
              </select>

              <select
                value={d.managerId}
                onChange={(e) => updateDraft(u.id, 'managerId', e.target.value)}
                className="text-sm border border-border rounded-lg px-2 py-1.5 bg-white"
              >
                <option value="">— none —</option>
                {managers
                  .filter((m) => m.id !== u.id)
                  .map((m) => (
                    <option key={m.id} value={m.email}>{m.fullName || m.email}</option>
                  ))}
              </select>

              {d.role === 'admin' ? (
                <select
                  value={d.defaultTeamView}
                  onChange={(e) => updateDraft(u.id, 'defaultTeamView', e.target.value)}
                  className="text-sm border border-border rounded-lg px-2 py-1.5 bg-white"
                >
                  <option value="mine">Mine</option>
                  <option value="all">All</option>
                </select>
              ) : (
                <span className="text-sm text-ink-300">—</span>
              )}

              <button
                onClick={() => save(u.id)}
                disabled={savingId === u.id}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-navy text-white text-xs font-medium rounded-lg hover:bg-navy-dark transition-colors disabled:opacity-50"
              >
                <Save size={13} />
                {savedId === u.id ? 'Saved' : savingId === u.id ? 'Saving...' : 'Save'}
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-ink-300 mt-3">
        People show up here once they've accepted their Netlify Identity invite. New hires still need to be invited first from Netlify's site dashboard (Site settings → Identity → Invite users) — everything after that happens here.
      </p>
    </div>
  );
}
