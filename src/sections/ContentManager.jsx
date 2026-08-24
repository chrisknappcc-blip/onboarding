import { useEffect, useState } from 'react';
import { Trash2, Plus, Library } from 'lucide-react';
import { api } from '../lib/api.js';
import { useIdentity } from '../lib/identity.jsx';

const SECTIONS = [
  { key: 'playbook', label: 'Playbook', kind: 'blocks' },
  { key: 'gong-library', label: 'Gong Recordings', kind: 'blocks' },
  { key: 'app-walkthroughs', label: 'Tools We Use', kind: 'blocks' },
  { key: 'tasks', label: 'My Tasks (default checklist)', kind: 'tasks' }
];

export default function ContentManager() {
  const { isAdmin, email } = useIdentity();
  const [section, setSection] = useState('playbook');
  const [managers, setManagers] = useState([]);
  const [targetManagerId, setTargetManagerId] = useState('');
  const [data, setData] = useState(null); // { managerId, mine, library }
  const [error, setError] = useState(null);

  const sectionConfig = SECTIONS.find((s) => s.key === section);

  useEffect(() => {
    if (isAdmin) {
      api.listTeamUsers()
        .then((res) => {
          const list = res.users.filter((u) => (u.appMetadata.roles || []).some((r) => ['admin', 'manager'].includes(r)));
          setManagers(list);
          if (!targetManagerId) setTargetManagerId(email);
        })
        .catch(() => {});
    }
  }, [isAdmin]);

  function refresh() {
    api.listContent(section, isAdmin ? targetManagerId : undefined)
      .then(setData)
      .catch((e) => setError(e.message));
  }

  useEffect(() => { refresh(); }, [section, targetManagerId]);

  async function addFromLibrary(blockId) {
    if (!blockId) return;
    try {
      await api.addFromLibrary(section, blockId, isAdmin ? targetManagerId : undefined);
      refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  async function remove(blockId) {
    try {
      await api.removeContent(section, blockId, isAdmin ? targetManagerId : undefined);
      refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  const libraryOptions = (data?.library || []).filter((b) => {
    const already = (data?.mine || []).some((m) => m.text === b.text && m.url === b.url);
    return !already;
  });

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2.5">
        <Library size={22} className="text-navy" />
        <h1 className="font-display text-xl font-semibold text-ink-900">Content Library</h1>
      </div>
      <p className="text-sm text-ink-500 mt-1">
        What each new hire sees is pulled from their manager's own content here.
      </p>

      <div className="flex gap-2.5 mt-5">
        <select
          value={section}
          onChange={(e) => setSection(e.target.value)}
          className="text-sm border border-border rounded-lg px-3 py-2 bg-white"
        >
          {SECTIONS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        {isAdmin && (
          <select
            value={targetManagerId}
            onChange={(e) => setTargetManagerId(e.target.value)}
            className="text-sm border border-border rounded-lg px-3 py-2 bg-white"
          >
            <option value={email}>Me ({email})</option>
            {managers.filter((m) => m.email !== email).map((m) => (
              <option key={m.id} value={m.email}>{m.fullName || m.email}</option>
            ))}
          </select>
        )}
      </div>

      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

      {!data ? (
        <p className="text-sm text-ink-300 mt-4">Loading...</p>
      ) : (
        <>
          <div className="mt-5 bg-card border border-border rounded-xl overflow-hidden">
            {(data.mine || []).length === 0 ? (
              <div className="p-6 text-center text-sm text-ink-300">Nothing added yet.</div>
            ) : (
              data.mine.map((b, i) => (
                <div
                  key={b.id}
                  className={`flex items-center gap-3 px-4 py-3 ${i !== data.mine.length - 1 ? 'border-b border-border' : ''}`}
                >
                  <span className="flex-1 text-sm text-ink-900 truncate">
                    {sectionConfig.kind === 'tasks' ? b.text : (b.label || b.text || b.url)}
                  </span>
                  <button onClick={() => remove(b.id)} className="text-ink-300 hover:text-red-600 shrink-0">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>

          {libraryOptions.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-300 mb-2">Reuse from library</p>
              <select
                onChange={(e) => { addFromLibrary(e.target.value); e.target.value = ''; }}
                defaultValue=""
                className="w-full text-sm border border-border rounded-lg px-3 py-2.5 bg-white"
              >
                <option value="" disabled>Select something someone else already added...</option>
                {libraryOptions.map((b) => (
                  <option key={b.id} value={b.id}>{b.label || b.text || b.url}</option>
                ))}
              </select>
            </div>
          )}

          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-300 mb-2">Add new</p>
            <ManualAddForm
              kind={sectionConfig.kind}
              section={section}
              managerId={isAdmin ? targetManagerId : undefined}
              onAdded={refresh}
            />
          </div>
        </>
      )}
    </div>
  );
}

function ManualAddForm({ kind, section, managerId, onAdded }) {
  const [type, setType] = useState('text');
  const [text, setText] = useState('');
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const block = kind === 'tasks'
        ? { type: 'task', text }
        : type === 'link'
          ? { type: 'link', label, url }
          : { type: 'text', text };
      await api.addManualContent(section, block, managerId);
      setText(''); setLabel(''); setUrl('');
      onAdded();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const canSubmit = kind === 'tasks' ? text.trim() : (type === 'link' ? url.trim() : text.trim());

  return (
    <div className="p-4 bg-card border border-border rounded-xl">
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

      {kind === 'tasks' ? (
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Task title"
          className="w-full text-sm border border-border rounded-lg px-3 py-2"
        />
      ) : (
        <>
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setType('text')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg ${type === 'text' ? 'bg-navy text-white' : 'bg-surface text-ink-500'}`}
            >
              Text
            </button>
            <button
              onClick={() => setType('link')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg ${type === 'link' ? 'bg-navy text-white' : 'bg-surface text-ink-500'}`}
            >
              Link
            </button>
          </div>
          {type === 'text' ? (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paragraph of playbook content..."
              rows={3}
              className="w-full text-sm border border-border rounded-lg px-3 py-2"
            />
          ) : (
            <div className="space-y-2">
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Label (e.g. 'Discovery call with Baptist Health')"
                className="w-full text-sm border border-border rounded-lg px-3 py-2"
              />
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="URL"
                className="w-full text-sm border border-border rounded-lg px-3 py-2"
              />
            </div>
          )}
        </>
      )}

      <button
        onClick={submit}
        disabled={saving || !canSubmit}
        className="flex items-center gap-1.5 mt-3 px-4 py-2 bg-navy text-white text-sm font-medium rounded-lg hover:bg-navy-dark disabled:opacity-50"
      >
        <Plus size={15} /> {saving ? 'Adding...' : 'Add'}
      </button>
    </div>
  );
}
