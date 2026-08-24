import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Circle, Star, ArrowRight } from 'lucide-react';
import { api } from '../lib/api.js';
import { useIdentity } from '../lib/identity.jsx';

export default function Dashboard({ track }) {
  const { track: trackKey, user } = useIdentity();
  const [tasks, setTasks] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getProgress(trackKey)
      .then((data) => {
        const saved = data.tasks || [];
        const savedIds = new Set(saved.map((t) => t.id));
        const merged = [
          ...saved,
          ...track.defaultTasks.filter((t) => !savedIds.has(t.id)).map((t) => ({ ...t, done: false }))
        ];
        setTasks(merged);
      })
      .catch((e) => setError(e.message));
  }, [trackKey]);

  const firstName = (user?.user_metadata?.full_name || user?.email || '').split(/[\s@]/)[0];

  async function toggleTask(taskId, done) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, done } : t)));
    try {
      await api.updateProgress(trackKey, taskId, done);
    } catch (e) {
      setError(e.message);
    }
  }

  const outstanding = tasks
    ? [...tasks.filter((t) => !t.done)].sort((a, b) => (b.starred ? 1 : 0) - (a.starred ? 1 : 0))
    : [];

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-semibold text-ink-900">
        Welcome{firstName ? `, ${firstName}` : ''}
      </h1>
      <p className="text-sm text-ink-500 mt-1">Here's where to pick up your onboarding.</p>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-300">To-Do</h2>
          <Link to="/task-queue" className="flex items-center gap-1 text-xs font-medium text-navy hover:text-navy-dark">
            View all <ArrowRight size={12} />
          </Link>
        </div>

        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

        {!tasks ? (
          <p className="text-sm text-ink-300 mt-3">Loading...</p>
        ) : outstanding.length === 0 ? (
          <div className="mt-3 p-6 bg-card border border-border rounded-xl text-center">
            <p className="text-sm text-ink-300">Nothing outstanding — you're caught up.</p>
          </div>
        ) : (
          <div className="mt-3 bg-card border border-border rounded-xl overflow-hidden">
            {outstanding.slice(0, 8).map((t, i) => (
              <button
                key={t.id}
                onClick={() => toggleTask(t.id, true)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface/60 transition-colors ${
                  i !== Math.min(outstanding.length, 8) - 1 ? 'border-b border-border' : ''
                }`}
              >
                <Circle className="text-ink-300 shrink-0" size={18} />
                <span className="flex-1 text-sm text-ink-900">{t.title}</span>
                {t.starred && <Star size={15} className="text-lime fill-lime shrink-0" />}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
