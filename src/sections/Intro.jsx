import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { api } from '../lib/api.js';
import { useIdentity } from '../lib/identity.jsx';
import { ContentBlock } from './ContentSection.jsx';

export const INTRO_CHAPTERS = [
  { key: 'intro-about', label: 'About the Company' },
  { key: 'intro-offerings', label: 'Our Offerings' },
  { key: 'intro-structure', label: 'Company Structure' },
  { key: 'intro-team', label: 'Team Structure' },
  { key: 'intro-network', label: "Who Else You'll Work With" }
];

export default function Intro() {
  const { track: trackKey, managerId, user } = useIdentity();
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [content, setContent] = useState({});
  const [error, setError] = useState(null);
  const [finishing, setFinishing] = useState(false);

  const firstName = (user?.user_metadata?.full_name || user?.email || '').split(/[\s@]/)[0];
  const chapter = INTRO_CHAPTERS[index];

  useEffect(() => {
    Promise.all(INTRO_CHAPTERS.map((c) => api.getContent(trackKey, c.key, managerId)))
      .then((results) => {
        const byKey = {};
        INTRO_CHAPTERS.forEach((c, i) => { byKey[c.key] = results[i]; });
        setContent(byKey);
      })
      .catch((e) => setError(e.message));
  }, [trackKey, managerId]);

  async function finish() {
    setFinishing(true);
    try {
      await api.updateProgress(trackKey, 'intro-complete', true, {
        title: 'Complete the Intro',
        section: 'intro'
      });
    } catch (e) {
      // Don't block navigation on this - worst case they see it unchecked
      // and it self-heals next time they toggle anything.
    }
    navigate('/task-queue');
  }

  const current = content[chapter.key];

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-semibold text-ink-900">
        Welcome{firstName ? `, ${firstName}` : ''}
      </h1>
      <p className="text-sm text-ink-500 mt-1">A quick introduction before you dive in.</p>

      <div className="flex items-center gap-1.5 mt-6">
        {INTRO_CHAPTERS.map((c, i) => (
          <button
            key={c.key}
            onClick={() => setIndex(i)}
            className={`h-1.5 flex-1 rounded-full transition-colors ${i === index ? 'bg-navy' : i < index ? 'bg-navy/40' : 'bg-border'}`}
          />
        ))}
      </div>

      <div className="mt-5 bg-card border border-border rounded-xl p-6 min-h-[280px]">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-300">
          {index + 1} of {INTRO_CHAPTERS.length}
        </p>
        <h2 className="font-display text-lg font-semibold text-ink-900 mt-1">{chapter.label}</h2>

        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

        {!current ? (
          <p className="text-sm text-ink-300 mt-4">Loading...</p>
        ) : !current.blocks || current.blocks.length === 0 ? (
          <p className="text-sm text-ink-300 mt-4">
            Content for this section is on the way — check with your manager if you have questions in the meantime.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {current.blocks.map((block, i) => <ContentBlock key={i} block={block} />)}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-4">
        <button
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-ink-500 hover:text-ink-900 disabled:opacity-30 disabled:hover:text-ink-500"
        >
          <ChevronLeft size={16} /> Back
        </button>
        {index < INTRO_CHAPTERS.length - 1 ? (
          <button
            onClick={() => setIndex((i) => Math.min(INTRO_CHAPTERS.length - 1, i + 1))}
            className="flex items-center gap-1 px-4 py-2 bg-navy text-white text-sm font-medium rounded-lg hover:bg-navy-dark"
          >
            Next <ChevronRight size={16} />
          </button>
        ) : (
          <button
            onClick={finish}
            disabled={finishing}
            className="flex items-center gap-1.5 px-4 py-2 bg-navy text-white text-sm font-medium rounded-lg hover:bg-navy-dark disabled:opacity-50"
          >
            <Check size={16} /> {finishing ? 'Finishing...' : "Finish - I'm done"}
          </button>
        )}
      </div>
    </div>
  );
}
