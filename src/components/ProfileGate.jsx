import { useState } from 'react';
import netlifyIdentity from 'netlify-identity-widget';
import { useIdentity } from '../lib/identity.jsx';

// Netlify Identity's default login/signup form only collects email + password.
// This fills the gap: if someone hasn't set a name yet, ask once, save it to
// their own user_metadata, then get out of the way for good.
export default function ProfileGate({ children }) {
  const { user } = useIdentity();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const hasName = Boolean(user?.user_metadata?.full_name);

  if (hasName) return children;

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await netlifyIdentity.currentUser().update({ data: { full_name: name.trim() } });
      // Full reload rather than local state update - simplest reliable way
      // to get the refreshed user_metadata flowing through the whole app
      // (header, dashboard greeting, Team Progress roster, etc.) at once.
      window.location.reload();
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="w-full max-w-sm bg-card border border-border rounded-xl p-6">
        <h1 className="font-display text-lg font-semibold text-ink-900">What's your name?</h1>
        <p className="text-sm text-ink-500 mt-1">
          Just so the rest of the team knows who's who.
        </p>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          placeholder="Full name"
          className="w-full mt-4 border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40"
        />
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        <button
          onClick={save}
          disabled={saving || !name.trim()}
          className="w-full mt-3 px-4 py-2.5 bg-navy text-white text-sm font-medium rounded-xl hover:bg-navy-dark transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
