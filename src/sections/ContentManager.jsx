import { useEffect, useState } from 'react';
import { Trash2, Pencil, Plus, Library, Upload, X, Save, FolderInput, Check, FileText } from 'lucide-react';
import { api } from '../lib/api.js';
import { useIdentity } from '../lib/identity.jsx';

const SECTIONS = [
  { key: 'intro-about', label: 'Intro: About the Company', kind: 'blocks' },
  { key: 'intro-offerings', label: 'Intro: Our Offerings', kind: 'blocks' },
  { key: 'intro-structure', label: 'Intro: Company Structure', kind: 'blocks' },
  { key: 'intro-team', label: 'Intro: Team Structure', kind: 'blocks' },
  { key: 'intro-network', label: 'Intro: Who Else You\'ll Work With', kind: 'blocks' },
  { key: 'playbook', label: 'Playbook', kind: 'blocks' },
  { key: 'gong-library', label: 'Gong Recordings', kind: 'blocks' },
  { key: 'app-walkthroughs', label: 'Tools We Use', kind: 'blocks' },
  { key: 'intranet', label: 'Intranet', kind: 'blocks' },
  { key: 'tasks', label: 'My Tasks (default checklist)', kind: 'tasks' }
];

export default function ContentManager() {
  const { isAdmin, email } = useIdentity();
  const [section, setSection] = useState('playbook');
  const [managers, setManagers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [target, setTarget] = useState(''); // '' = me, 'team:key', an email, or 'shared'
  const [data, setData] = useState(null); // { managerId, mine, library }
  const [error, setError] = useState(null);
  const [editingBlock, setEditingBlock] = useState(null);

  const sectionConfig = SECTIONS.find((s) => s.key === section);
  const effectiveTarget = target || undefined; // undefined = "me", handled server-side

  useEffect(() => {
    if (isAdmin) {
      api.listTeamUsers()
        .then((res) => {
          const list = res.users.filter((u) => (u.appMetadata.roles || []).some((r) => ['admin', 'manager'].includes(r)));
          setManagers(list);
        })
        .catch(() => {});
    }
    api.listTeams().then((r) => setTeams(r.teams || [])).catch(() => {});
  }, [isAdmin]);

  function refreshTeams() {
    api.listTeams().then((r) => setTeams(r.teams || [])).catch(() => {});
  }

  function refresh() {
    api.listContent(section, effectiveTarget)
      .then(setData)
      .catch((e) => setError(e.message));
  }

  useEffect(() => { refresh(); setEditingBlock(null); }, [section, target]);

  async function addFromLibrary(blockId) {
    if (!blockId) return;
    try {
      await api.addFromLibrary(section, blockId, effectiveTarget);
      refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  async function remove(blockId) {
    try {
      await api.removeContent(section, blockId, effectiveTarget);
      if (editingBlock?.id === blockId) setEditingBlock(null);
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

      <div className="flex flex-wrap gap-2.5 mt-5">
        <select
          value={section}
          onChange={(e) => setSection(e.target.value)}
          className="text-sm border border-border rounded-lg px-3 py-2 bg-white"
        >
          {SECTIONS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="text-sm border border-border rounded-lg px-3 py-2 bg-white"
        >
          <option value="">Me ({email})</option>
          {teams.length > 0 && (
            <optgroup label="Teams">
              {teams.filter((t) => !t.parentKey).flatMap((t) => [
                <option key={t.key} value={`team:${t.key}`}>{t.label}</option>,
                ...teams.filter((c) => c.parentKey === t.key).map((c) => (
                  <option key={c.key} value={`team:${c.key}`}>{'\u00A0\u00A0\u00A0\u00A0↳ ' + c.label}</option>
                ))
              ])}
            </optgroup>
          )}
          {isAdmin && (
            <optgroup label="Track defaults (applies to everyone on that track)">
              <option value="bdr">BDR (all)</option>
              <option value="ae">AE (all)</option>
            </optgroup>
          )}
          {isAdmin && managers.filter((m) => m.email !== email).length > 0 && (
            <optgroup label="Managers">
              {managers.filter((m) => m.email !== email).map((m) => (
                <option key={m.id} value={m.email}>{m.fullName || m.email}</option>
              ))}
            </optgroup>
          )}
          {isAdmin && <option value="shared">Organization-wide (everyone)</option>}
        </select>
      </div>

      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

      {isAdmin && (
        <PresetsPanel sourceManagerId={target || email} teams={teams} managers={managers} email={email} onApplied={refresh} />
      )}

      {isAdmin && (
        <TeamsManagerPanel teams={teams} onChanged={refreshTeams} />
      )}

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
                  className={`flex items-center gap-3 px-4 py-3 ${i !== data.mine.length - 1 ? 'border-b border-border' : ''} ${editingBlock?.id === b.id ? 'bg-navy/5' : ''}`}
                >
                  <span className="flex-1 text-sm text-ink-900 truncate">
                    {sectionConfig.kind === 'tasks' ? b.text : (b.label || b.text || b.url)}
                  </span>
                  <button onClick={() => setEditingBlock(b)} className="text-ink-300 hover:text-navy shrink-0">
                    <Pencil size={15} />
                  </button>
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
                  <option key={b.id} value={b.id}>
                    {b.label || b.text || b.url}{b.addedByName ? ` — ${b.addedByName}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-300 mb-2">
              {editingBlock ? 'Edit item' : 'Add new'}
            </p>
            <ManualAddForm
              key={editingBlock?.id || 'new'}
              kind={sectionConfig.kind}
              section={section}
              managerId={effectiveTarget}
              editingBlock={editingBlock}
              onSaved={() => { setEditingBlock(null); refresh(); }}
              onCancelEdit={() => setEditingBlock(null)}
            />
          </div>
        </>
      )}
    </div>
  );
}

function PresetsPanel({ sourceManagerId, teams, managers, email, onApplied }) {
  const [presets, setPresets] = useState([]);
  const [newName, setNewName] = useState('');
  const [applyName, setApplyName] = useState('');
  const [applyTarget, setApplyTarget] = useState('');
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [renamingKey, setRenamingKey] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  function refresh() {
    api.listPresets().then((r) => setPresets(r.presets || [])).catch((e) => setError(e.message));
  }

  useEffect(() => { if (open) refresh(); }, [open]);

  async function savePreset() {
    if (!newName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.savePreset(newName.trim(), sourceManagerId);
      setNewName('');
      refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function submitRename(oldName) {
    if (!renameValue.trim() || renameValue.trim() === oldName) {
      setRenamingKey(null);
      return;
    }
    try {
      await api.renamePreset(oldName, renameValue.trim());
      setRenamingKey(null);
      refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  async function applyPreset() {
    if (!applyName || !applyTarget) return;
    setApplying(true);
    setError(null);
    try {
      await api.applyPreset(applyName, applyTarget);
      onApplied();
    } catch (e) {
      setError(e.message);
    } finally {
      setApplying(false);
    }
  }

  async function removePreset(name) {
    try {
      await api.deletePreset(name);
      refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 mt-4 text-sm font-medium text-navy hover:text-navy-dark"
      >
        <FolderInput size={15} /> Presets (save/apply a full content bundle across every section)
      </button>
    );
  }

  return (
    <div className="mt-4 p-4 bg-navy/5 border border-navy/20 rounded-xl">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-ink-900">Presets</p>
        <button onClick={() => setOpen(false)} className="text-ink-300 hover:text-ink-700"><X size={15} /></button>
      </div>
      <p className="text-xs text-ink-500 mt-1">
        A preset snapshots everything (Intro chapters, Playbook, Gong, Tools, Tasks) for the person selected above, under a name. Apply it to instantly set up someone else the same way.
      </p>

      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

      <div className="flex gap-2 mt-3">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Name this bundle (e.g. 'BDR Standard')"
          className="flex-1 text-sm border border-border rounded-lg px-3 py-2"
        />
        <button
          onClick={savePreset}
          disabled={saving || !newName.trim()}
          className="flex items-center gap-1.5 px-3 py-2 bg-navy text-white text-xs font-medium rounded-lg hover:bg-navy-dark disabled:opacity-50"
        >
          <Save size={13} /> {saving ? 'Saving...' : 'Save current as preset'}
        </button>
      </div>

      {presets.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-300 mb-2">Apply a saved preset</p>
          <div className="space-y-1.5">
            {presets.map((p) => (
              <div key={p.name} className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
                {renamingKey === p.name ? (
                  <>
                    <input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && submitRename(p.name)}
                      autoFocus
                      className="flex-1 text-sm border border-navy/40 rounded px-2 py-1"
                    />
                    <button onClick={() => submitRename(p.name)} className="text-navy hover:text-navy-dark"><Check size={14} /></button>
                    <button onClick={() => setRenamingKey(null)} className="text-ink-300 hover:text-ink-700"><X size={14} /></button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-ink-900">{p.name}</span>
                    <button onClick={() => { setRenamingKey(p.name); setRenameValue(p.name); }} className="text-ink-300 hover:text-navy"><Pencil size={13} /></button>
                    <button onClick={() => removePreset(p.name)} className="text-ink-300 hover:text-red-600"><Trash2 size={14} /></button>
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <select value={applyName} onChange={(e) => setApplyName(e.target.value)} className="text-sm border border-border rounded-lg px-2 py-2 bg-white">
              <option value="">Preset...</option>
              {presets.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
            </select>
            <select value={applyTarget} onChange={(e) => setApplyTarget(e.target.value)} className="flex-1 text-sm border border-border rounded-lg px-2 py-2 bg-white">
              <option value="">Apply to...</option>
              <option value={email}>Me ({email})</option>
              {teams.map((t) => <option key={t.key} value={`team:${t.key}`}>{t.label}</option>)}
              {managers.filter((m) => m.email !== email).map((m) => (
                <option key={m.id} value={m.email}>{m.fullName || m.email}</option>
              ))}
              <option value="shared">Organization-wide</option>
            </select>
            <button
              onClick={applyPreset}
              disabled={applying || !applyName || !applyTarget}
              className="px-3 py-2 bg-navy text-white text-xs font-medium rounded-lg hover:bg-navy-dark disabled:opacity-50"
            >
              {applying ? 'Applying...' : 'Apply'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TeamsManagerPanel({ teams, onChanged }) {
  const [open, setOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newParent, setNewParent] = useState('');
  const [editingKey, setEditingKey] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [editParent, setEditParent] = useState('');
  const [error, setError] = useState(null);

  const topLevel = teams.filter((t) => !t.parentKey);
  const childrenOf = (key) => teams.filter((t) => t.parentKey === key);

  async function add() {
    if (!newLabel.trim()) return;
    try {
      await api.addTeam(newLabel.trim(), newParent || undefined);
      setNewLabel('');
      setNewParent('');
      onChanged();
    } catch (e) {
      setError(e.message);
    }
  }

  function startEdit(t) {
    setEditingKey(t.key);
    setEditLabel(t.label);
    setEditParent(t.parentKey || '');
  }

  async function saveEdit(key) {
    try {
      await api.editTeam(key, editLabel.trim(), editParent || null);
      setEditingKey(null);
      onChanged();
    } catch (e) {
      setError(e.message);
    }
  }

  async function remove(key) {
    try {
      await api.removeTeam(key);
      onChanged();
    } catch (e) {
      setError(e.message);
    }
  }

  function TeamRow({ t, indent }) {
    const isEditing = editingKey === t.key;
    return (
      <div className="border-b border-border last:border-b-0">
        <div className="flex items-center gap-2 px-3 py-2" style={{ paddingLeft: `${12 + indent * 20}px` }}>
          {isEditing ? (
            <>
              <input
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveEdit(t.key)}
                autoFocus
                className="flex-1 text-sm border border-navy/40 rounded px-2 py-1"
              />
              <select
                value={editParent}
                onChange={(e) => setEditParent(e.target.value)}
                className="text-xs border border-border rounded px-1.5 py-1 bg-white"
              >
                <option value="">No parent (top-level)</option>
                {teams.filter((o) => o.key !== t.key).map((o) => (
                  <option key={o.key} value={o.key}>Under: {o.label}</option>
                ))}
              </select>
              <button onClick={() => saveEdit(t.key)} className="text-navy hover:text-navy-dark"><Check size={14} /></button>
              <button onClick={() => setEditingKey(null)} className="text-ink-300 hover:text-ink-700"><X size={14} /></button>
            </>
          ) : (
            <>
              <span className="flex-1 text-sm text-ink-900">{t.label}</span>
              <button onClick={() => startEdit(t)} className="text-ink-300 hover:text-navy"><Pencil size={13} /></button>
              <button onClick={() => remove(t.key)} className="text-ink-300 hover:text-red-600"><Trash2 size={14} /></button>
            </>
          )}
        </div>
        {childrenOf(t.key).map((child) => <TeamRow key={child.key} t={child} indent={indent + 1} />)}
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 mt-3 text-sm font-medium text-navy hover:text-navy-dark"
      >
        <FolderInput size={15} /> Manage teams (rename, remove, organize into sub-teams)
      </button>
    );
  }

  return (
    <div className="mt-4 p-4 bg-navy/5 border border-navy/20 rounded-xl">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-ink-900">Teams</p>
        <button onClick={() => setOpen(false)} className="text-ink-300 hover:text-ink-700"><X size={15} /></button>
      </div>
      <p className="text-xs text-ink-500 mt-1">
        Give a team a parent to nest it — e.g. "Client Executive" and "Client Delivery" under "Client Success."
      </p>

      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

      <div className="mt-3 bg-card border border-border rounded-lg overflow-hidden">
        {topLevel.length === 0 ? (
          <div className="p-4 text-center text-sm text-ink-300">No teams yet.</div>
        ) : (
          topLevel.map((t) => <TeamRow key={t.key} t={t} indent={0} />)
        )}
      </div>

      <div className="flex gap-2 mt-3">
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="New team name"
          className="flex-1 text-sm border border-border rounded-lg px-3 py-2"
        />
        <select
          value={newParent}
          onChange={(e) => setNewParent(e.target.value)}
          className="text-sm border border-border rounded-lg px-2 py-2 bg-white"
        >
          <option value="">No parent (top-level)</option>
          {teams.map((t) => <option key={t.key} value={t.key}>Under: {t.label}</option>)}
        </select>
        <button onClick={add} className="px-3 py-2 bg-navy text-white text-xs font-medium rounded-lg hover:bg-navy-dark">
          Add
        </button>
      </div>
    </div>
  );
}

function ManualAddForm({ kind, section, managerId, editingBlock, onSaved, onCancelEdit }) {
  const isEditing = Boolean(editingBlock);
  const [type, setType] = useState(editingBlock?.type === 'link' ? 'link' : editingBlock?.type === 'file' ? 'file' : 'text');
  const [text, setText] = useState(editingBlock?.text || '');
  const [label, setLabel] = useState(editingBlock?.label || '');
  const [url, setUrl] = useState(editingBlock?.url || '');
  const [description, setDescription] = useState(editingBlock?.description || '');
  const [thumbnail, setThumbnail] = useState(editingBlock?.thumbnail || '');
  const [customLabel, setCustomLabel] = useState('');
  const [uploading, setUploading] = useState(false);
  const [fileInfo, setFileInfo] = useState(
    editingBlock?.type === 'file' ? { url: editingBlock.url, fileName: editingBlock.fileName, contentType: editingBlock.contentType } : null
  );
  const [fileUploading, setFileUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleDocSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setError('File is too large - please use one under 4MB');
      return;
    }
    setFileUploading(true);
    setError(null);
    try {
      const dataBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const uploaded = await api.uploadFile(dataBase64, file.type || 'application/octet-stream', file.name);
      setFileInfo(uploaded);
      if (!label) setLabel(file.name);
    } catch (e) {
      setError(e.message);
    } finally {
      setFileUploading(false);
      e.target.value = '';
    }
  }

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('Image is too large - please use one under 2MB');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const dataBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { url: uploadedUrl } = await api.uploadImage(dataBase64, file.type);
      setThumbnail(uploadedUrl);
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const block = kind === 'tasks'
        ? { type: 'task', text }
        : type === 'link'
          ? { type: 'link', label, url, description: description || undefined, thumbnail: thumbnail || undefined }
          : type === 'file'
            ? { type: 'file', label: label || fileInfo?.fileName, url: fileInfo?.url, fileName: fileInfo?.fileName, contentType: fileInfo?.contentType, description: description || undefined }
            : { type: 'text', text };

      if (isEditing) {
        await api.editContent(section, editingBlock.id, block, managerId);
      } else {
        await api.addManualContent(section, block, managerId, customLabel || undefined);
        setText(''); setLabel(''); setUrl(''); setDescription(''); setThumbnail(''); setCustomLabel('');
      }
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const canSubmit = kind === 'tasks'
    ? text.trim()
    : type === 'link' ? url.trim()
    : type === 'file' ? Boolean(fileInfo?.url)
    : text.trim();

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
            <button
              onClick={() => setType('file')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg ${type === 'file' ? 'bg-navy text-white' : 'bg-surface text-ink-500'}`}
            >
              File
            </button>
          </div>
          {type === 'text' ? (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paragraph of playbook content... use **bold** and __underline__ for emphasis"
              rows={3}
              className="w-full text-sm border border-border rounded-lg px-3 py-2"
            />
          ) : type === 'file' ? (
            <div className="space-y-2">
              <div className="border border-border rounded-lg p-3">
                {fileInfo ? (
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-navy shrink-0" />
                    <span className="flex-1 text-sm text-ink-900 truncate">{fileInfo.fileName}</span>
                    <button onClick={() => setFileInfo(null)} className="text-xs text-ink-300 hover:text-red-600">Remove</button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-1.5 py-3 bg-surface text-ink-700 text-sm font-medium rounded-lg cursor-pointer hover:bg-border">
                    <Upload size={15} />
                    {fileUploading ? 'Uploading...' : 'Choose a file to upload (Word, PDF, Excel, PowerPoint - under 4MB)'}
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt"
                      className="hidden"
                      onChange={handleDocSelect}
                      disabled={fileUploading}
                    />
                  </label>
                )}
              </div>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Label shown to the person (defaults to the file name)"
                className="w-full text-sm border border-border rounded-lg px-3 py-2"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description or note about this file (optional)"
                rows={2}
                className="w-full text-sm border border-border rounded-lg px-3 py-2"
              />
            </div>
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
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description or note about this link (optional)"
                rows={2}
                className="w-full text-sm border border-border rounded-lg px-3 py-2"
              />

              <div className="border border-border rounded-lg p-3">
                <p className="text-xs font-medium text-ink-500 mb-2">Thumbnail (optional - defaults to the site's favicon)</p>
                <div className="flex items-center gap-3">
                  {thumbnail && (
                    <img src={thumbnail} alt="" className="w-10 h-10 rounded object-cover border border-border shrink-0" />
                  )}
                  <label className="flex items-center gap-1.5 px-3 py-1.5 bg-surface text-ink-700 text-xs font-medium rounded-lg cursor-pointer hover:bg-border">
                    <Upload size={13} />
                    {uploading ? 'Uploading...' : thumbnail ? 'Replace image' : 'Upload image'}
                    <input type="file" accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml" className="hidden" onChange={handleFileSelect} disabled={uploading} />
                  </label>
                  {thumbnail && (
                    <button onClick={() => setThumbnail('')} className="text-xs text-ink-300 hover:text-red-600">Remove</button>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-ink-300">or paste a URL:</span>
                  <input
                    value={thumbnail.startsWith('/.netlify') ? '' : thumbnail}
                    onChange={(e) => setThumbnail(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 text-xs border border-border rounded-lg px-2 py-1.5"
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {!isEditing && (
        <input
          value={customLabel}
          onChange={(e) => setCustomLabel(e.target.value)}
          placeholder="Save this as (for the reuse dropdown) — e.g. 'Team Structure - Client Executive'"
          className="w-full text-sm border border-border rounded-lg px-3 py-2 mt-2"
        />
      )}

      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={submit}
          disabled={saving || uploading || !canSubmit}
          className="flex items-center gap-1.5 px-4 py-2 bg-navy text-white text-sm font-medium rounded-lg hover:bg-navy-dark disabled:opacity-50"
        >
          <Plus size={15} /> {saving ? 'Saving...' : isEditing ? 'Save changes' : 'Add'}
        </button>
        {isEditing && (
          <button
            onClick={onCancelEdit}
            className="flex items-center gap-1 px-3 py-2 text-sm text-ink-500 hover:text-ink-900"
          >
            <X size={14} /> Cancel
          </button>
        )}
      </div>
    </div>
  );
}
