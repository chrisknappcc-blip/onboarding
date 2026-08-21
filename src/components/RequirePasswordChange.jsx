import { useState } from 'react';
import netlifyIdentity from 'netlify-identity-widget';
import { useIdentity } from '../lib/identity.jsx';
import { api } from '../lib/api.js';

export default function RequirePasswordChange({ children }) {
  const { user } = useIdentity();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const mustChange = Boolean(user?.app_metadata?.mustChangePassword);
  if (!mustChange) return children;

  async function save() {
    if (password.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await netlifyIdentity.currentUser().update({ password });
      await api.clearMustChangePassword();
      window.location.reload();
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="w-full max-w-sm bg-card border border-border rounded-xl p-6">
        <h1 className="font-display text-lg font-semibold text-ink-900">Set a new password</h1>
        <p className="text-sm text-ink-500 mt-1">
          You're using a temporary password. Set your own before continuing.
        </p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password"
          className="w-full mt-4 border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40"
        />
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          placeholder="Confirm new password"
          className="w-full mt-2 border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40"
        />
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        <button
          onClick={save}
          disabled={saving || !password || !confirm}
          className="w-full mt-3 px-4 py-2.5 bg-navy text-white text-sm font-medium rounded-xl hover:bg-navy-dark transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Set password and continue'}
        </button>
      </div>
    </div>
  );
}
