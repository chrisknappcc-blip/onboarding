import { useEffect, useState } from 'react';
import { GripVertical, Save, LayoutTemplate } from 'lucide-react';
import { api } from '../lib/api.js';
import { getTrack } from '../config/tracks.js';

const TRACK_OPTIONS = [
  { key: 'bdr', label: 'BDR Onboarding' },
  { key: 'ae', label: 'AE Onboarding' }
];

export default function StructureEditor() {
  const [trackKey, setTrackKey] = useState('bdr');
  const [sections, setSections] = useState([]);
  const [dragIndex, setDragIndex] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setSaved(false);
    api.getStructure(trackKey)
      .then((custom) => {
        setSections(custom?.sections || getTrack(trackKey).sections);
      })
      .catch(() => setSections(getTrack(trackKey).sections));
  }, [trackKey]);

  function handleDrop(targetIndex) {
    if (dragIndex === null || dragIndex === targetIndex) return;
    setSections((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    setDragIndex(null);
  }

  function updateLabel(index, label) {
    setSections((prev) => prev.map((s, i) => (i === index ? { ...s, label } : s)));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api.saveStructure(trackKey, sections);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-2.5">
        <LayoutTemplate size={22} className="text-navy" />
        <h1 className="font-display text-xl font-semibold text-ink-900">App Structure</h1>
      </div>
      <p className="text-sm text-ink-500 mt-1">
        Drag to reorder the tiles, or rename them. This changes the nav for everyone on this track.
      </p>

      <select
        value={trackKey}
        onChange={(e) => setTrackKey(e.target.value)}
        className="mt-4 text-sm border border-border rounded-lg px-3 py-2 bg-white"
      >
        {TRACK_OPTIONS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
      </select>

      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

      <div className="mt-4 bg-card border border-border rounded-xl overflow-hidden">
        {sections.map((s, i) => (
          <div
            key={s.key}
            draggable
            onDragStart={() => setDragIndex(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(i)}
            className={`flex items-center gap-3 px-4 py-3 bg-card ${i !== sections.length - 1 ? 'border-b border-border' : ''} ${dragIndex === i ? 'opacity-40' : ''}`}
          >
            <GripVertical size={16} className="text-ink-300 cursor-grab shrink-0" />
            <input
              value={s.label}
              onChange={(e) => updateLabel(i, e.target.value)}
              className="flex-1 text-sm border border-transparent hover:border-border focus:border-navy/40 rounded-lg px-2 py-1.5 focus:outline-none"
            />
          </div>
        ))}
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="flex items-center gap-1.5 mt-4 px-4 py-2.5 bg-navy text-white text-sm font-medium rounded-xl hover:bg-navy-dark disabled:opacity-50"
      >
        <Save size={15} /> {saving ? 'Saving...' : saved ? 'Saved' : 'Save order'}
      </button>

      <p className="text-xs text-ink-300 mt-3">
        Adding brand-new tiles (beyond the current six) isn't supported here yet — that still needs a code change. Reordering and renaming existing ones is fully self-serve.
      </p>
    </div>
  );
}
