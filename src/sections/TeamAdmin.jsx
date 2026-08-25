import { useEffect, useState } from 'react';
import { Save, ShieldCheck, UserPlus, Copy, Check } from 'lucide-react';
import { api } from '../lib/api.js';

const ROLE_OPTIONS = [
  { value: '', label: 'No access' },
  { value: 'manager', label: 'Manager (own team only)' },
  { value: 'admin', label: 'Admin (everyone)' }
];

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = new Uint8Array(12);
  (window.crypto || window.msCrypto).getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

function AddMemberForm({ managers, teams, onCreated }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('');
  const [track, setTrack] = useState('bdr');
  const [managerId, setManagerId] = useState('');
  const [team, setTeam] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null); // { email, password }
  const [copied, setCopied] = useState(false);

  async function create() {
    if (!email.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const password = generatePassword();
      const appMetadata = {
        roles: role ? [role] : [],
        track,
        managerId: managerId || undefined,
        team: team || undefined,
        mustChangePassword: true
      };
      await api.createTeamUser(email.trim(), fullName.trim(), password, appMetadata);
      setResult({ email: email.trim(), password });
      setEmail('');
      setFullName('');
      setRole('');
      setManagerId('');
      setTeam('');
      onCreated();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function copyCreds() {
    navigator.clipboard.writeText(`Email: ${result.email}\nTemporary password: ${result.password}\nLog in at: ${window.location.origin}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (result) {
    return (
      <div className="mb-4 p-4 bg-success/10 border border-success/30 rounded-xl">
        <p className="text-sm font-medium text-ink-900">Account created for {result.email}</p>
        <p className="text-sm text-ink-700 mt-1">
          Temporary password: <span className="font-mono font-semibold">{result.password}</span>
        </p>
        <p className="text-xs text-ink-500 mt-1">
          Send this to them directly (Slack, text, in person) — not email, since that's what caused the invite link problem. They'll be asked to set their own password the moment they log in with it.
        </p>
        <div className="flex gap-2 mt-3">
          <button onClick={copyCreds} className="flex items-center gap-1.5 px-3 py-1.5 bg-navy text-white text-xs font-medium rounded-lg hover:bg-navy-dark">
            {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy details'}
          </button>
          <button onClick={() => setResult(null)} className="px-3 py-1.5 text-xs font-medium text-ink-500 hover:text-ink-900">
            Add another
          </button>
        </div>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 mb-4 px-4 py-2.5 bg-navy text-white text-sm font-medium rounded-xl hover:bg-navy-dark transition-colors"
      >
        <UserPlus size={16} /> Add team member
      </button>
    );
  }

  return (
    <div className="mb-4 p-4 bg-card border border-border rounded-xl">
      <p className="text-sm font-medium text-ink-900 mb-3">Add team member</p>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <div className="grid grid-cols-2 gap-2.5">
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Full name"
          className="text-sm border border-border rounded-lg px-3 py-2"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          type="email"
          className="text-sm border border-border rounded-lg px-3 py-2"
        />
        <select value={role} onChange={(e) => setRole(e.target.value)} className="text-sm border border-border rounded-lg px-2 py-2 bg-white">
          {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={track} onChange={(e) => setTrack(e.target.value)} className="text-sm border border-border rounded-lg px-2 py-2 bg-white">
          <option value="bdr">BDR</option>
          <option value="ae">AE</option>
        </select>
        <select value={managerId} onChange={(e) => setManagerId(e.target.value)} className="text-sm border border-border rounded-lg px-2 py-2 bg-white">
          <option value="">Reports to — none —</option>
          {managers.map((m) => <option key={m.id} value={m.email}>{m.fullName || m.email}</option>)}
        </select>
        <select value={team} onChange={(e) => setTeam(e.target.value)} className="text-sm border border-border rounded-lg px-2 py-2 bg-white col-span-2">
          <option value="">Sub-team — none —</option>
          {teams.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={create}
          disabled={saving || !email.trim()}
          className="px-4 py-2 bg-navy text-white text-sm font-medium rounded-lg hover:bg-navy-dark disabled:opacity-50"
        >
          {saving ? 'Creating...' : 'Create account'}
        </button>
        <button onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-ink-500 hover:text-ink-900">
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function TeamAdmin() {
  const [users, setUsers] = useState(null);
  const [teams, setTeams] = useState([]);
  const [newTeamLabel, setNewTeamLabel] = useState('');
  const [error, setError] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [savedId, setSavedId] = useState(null);
  const [drafts, setDrafts] = useState({});

  function refresh() {
    return api.listTeamUsers()
      .then((data) => {
        setUsers(data.users);
        setDrafts((prevDrafts) => {
          const next = { ...prevDrafts };
          data.users.forEach((u) => {
            if (!next[u.id]) {
              next[u.id] = {
                role: (u.appMetadata.roles || [])[0] || '',
                track: u.appMetadata.track || 'bdr',
                managerId: u.appMetadata.managerId || '',
                team: u.appMetadata.team || '',
                defaultTeamView: u.appMetadata.defaultTeamView || 'mine'
              };
            }
          });
          return next;
        });
      })
      .catch((e) => setError(e.message));
  }

  function refreshTeams() {
    api.listTeams().then((r) => setTeams(r.teams || [])).catch(() => {});
  }

  useEffect(() => { refresh(); refreshTeams(); }, []);

  async function addTeam() {
    if (!newTeamLabel.trim()) return;
    try {
      await api.addTeam(newTeamLabel.trim());
      setNewTeamLabel('');
      refreshTeams();
    } catch (e) {
      setError(e.message);
    }
  }

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
        team: d.team || undefined,
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

      <div className="mt-6 flex items-center gap-2">
        <input
          value={newTeamLabel}
          onChange={(e) => setNewTeamLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTeam()}
          placeholder="Add a sub-team (e.g. 'Client Executive')"
          className="text-sm border border-border rounded-lg px-3 py-2 w-64"
        />
        <button onClick={addTeam} className="px-3 py-2 bg-navy text-white text-xs font-medium rounded-lg hover:bg-navy-dark">
          Add team
        </button>
        {teams.length > 0 && (
          <span className="text-xs text-ink-300">Existing: {teams.map((t) => t.label).join(', ')}</span>
        )}
      </div>
      <p className="text-xs text-ink-300 mt-1">
        For renaming, removing, or nesting teams into sub-structures (e.g. Client Executive under Client Success), use the fuller team manager in Content Library.
      </p>

      <div className="mt-3">
        <AddMemberForm managers={managers} teams={teams} onCreated={refresh} />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1.4fr_0.9fr_0.7fr_1fr_0.9fr_0.7fr_108px] gap-3 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-300 border-b border-border">
          <span>Person</span>
          <span>Access</span>
          <span>Track</span>
          <span>Reports to</span>
          <span>Sub-team</span>
          <span>Default view</span>
          <span></span>
        </div>
        {users.map((u) => {
          const d = drafts[u.id] || {};
          return (
            <div
              key={u.id}
              className="grid grid-cols-[1.4fr_0.9fr_0.7fr_1fr_0.9fr_0.7fr_108px] gap-3 items-center px-5 py-3 border-b border-border last:border-b-0"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-ink-900 truncate">{u.fullName || u.email}</div>
                <div className="text-xs text-ink-300 truncate">{u.email}</div>
              </div>

              <select
                value={d.role}
                onChange={(e) => updateDraft(u.id, 'role', e.target.value)}
                className="w-full text-sm border border-border rounded-lg px-2 py-1.5 bg-white"
              >
                {ROLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              <select
                value={d.track}
                onChange={(e) => updateDraft(u.id, 'track', e.target.value)}
                className="w-full text-sm border border-border rounded-lg px-2 py-1.5 bg-white"
              >
                <option value="bdr">BDR</option>
                <option value="ae">AE</option>
              </select>

              <select
                value={d.managerId}
                onChange={(e) => updateDraft(u.id, 'managerId', e.target.value)}
                className="w-full text-sm border border-border rounded-lg px-2 py-1.5 bg-white"
              >
                <option value="">— none —</option>
                {managers
                  .filter((m) => m.id !== u.id)
                  .map((m) => (
                    <option key={m.id} value={m.email}>{m.fullName || m.email}</option>
                  ))}
              </select>

              <select
                value={d.team}
                onChange={(e) => updateDraft(u.id, 'team', e.target.value)}
                className="w-full text-sm border border-border rounded-lg px-2 py-1.5 bg-white"
              >
                <option value="">— none —</option>
                {teams.map((t) => {
                  const parent = teams.find((p) => p.key === t.parentKey);
                  return <option key={t.key} value={t.key}>{parent ? `${t.label} (under ${parent.label})` : t.label}</option>;
                })}
              </select>

              {d.role === 'admin' ? (
                <select
                  value={d.defaultTeamView}
                  onChange={(e) => updateDraft(u.id, 'defaultTeamView', e.target.value)}
                  className="w-full text-sm border border-border rounded-lg px-2 py-1.5 bg-white"
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
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-navy text-white text-xs font-medium rounded-lg hover:bg-navy-dark transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                <Save size={13} />
                {savedId === u.id ? 'Saved' : savingId === u.id ? 'Saving...' : 'Save'}
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-ink-300 mt-3">
        "Add team member" creates the account directly with a password you hand them yourself — no email link required, which sidesteps corporate email scanners invalidating Netlify's invite links before they're clicked. Existing accounts (including anyone invited the old way) show up in the table below.
      </p>
    </div>
  );
}
