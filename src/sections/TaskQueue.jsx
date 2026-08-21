import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Plus, Star } from 'lucide-react';
import { api } from '../lib/api.js';
import ProgressRing from '../components/ProgressRing.jsx';

export default function TaskQueue({ trackKey, track }) {
  const [tasks, setTasks] = useState(null);
  const [newTask, setNewTask] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.getProgress(trackKey)
      .then((data) => {
        if (cancelled) return;
        const saved = data.tasks || [];
        const savedIds = new Set(saved.map((t) => t.id));
        const merged = [
          ...saved,
          ...track.defaultTasks.filter((t) => !savedIds.has(t.id)).map((t) => ({ ...t, done: false }))
        ];
        setTasks(merged);
      })
      .catch((e) => setError(e.message));
    return () => { cancelled = true; };
  }, [trackKey]);

  async function toggleTask(taskId, done) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, done } : t)));
    try {
      await api.updateProgress(trackKey, taskId, done);
    } catch (e) {
      setError(e.message);
    }
  }

  function addTask() {
    if (!newTask.trim()) return;
    const id = `custom-${Date.now()}`;
    setTasks((prev) => [...prev, { id, title: newTask.trim(), section: 'task-queue', done: false, custom: true }]);
    setNewTask('');
    api.updateProgress(trackKey, id, false).catch((e) => setError(e.message));
  }

  if (error) {
    return <p className="text-sm text-red-600">Couldn't load your tasks: {error}</p>;
  }
  if (!tasks) {
    return <p className="text-sm text-ink-300">Loading your tasks...</p>;
  }

  const doneCount = tasks.filter((t) => t.done).length;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-4">
        <ProgressRing done={doneCount} total={tasks.length} size={48} />
        <div>
          <h1 className="font-display text-xl font-semibold text-ink-900">My Tasks</h1>
          <p className="text-sm text-ink-500">{doneCount} of {tasks.length} complete</p>
        </div>
      </div>

      <div className="mt-6 space-y-2">
        {[...tasks]
          .sort((a, b) => (b.starred ? 1 : 0) - (a.starred ? 1 : 0) || (a.done ? 1 : 0) - (b.done ? 1 : 0))
          .map((t) => (
          <button
            key={t.id}
            onClick={() => toggleTask(t.id, !t.done)}
            className="w-full flex items-center gap-3 p-3.5 bg-card border border-border rounded-xl text-left hover:border-navy/30 transition-colors"
          >
            {t.done ? (
              <CheckCircle2 className="text-success shrink-0" size={20} />
            ) : (
              <Circle className="text-ink-300 shrink-0" size={20} />
            )}
            <span className={`flex-1 text-sm ${t.done ? 'text-ink-300 line-through' : 'text-ink-900'}`}>
              {t.title}
            </span>
            {t.starred && <Star size={16} className="text-accent fill-accent shrink-0" />}
          </button>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTask()}
          placeholder="Add a task..."
          className="flex-1 border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40"
        />
        <button
          onClick={addTask}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-navy text-white text-sm font-medium rounded-xl hover:bg-navy-dark transition-colors"
        >
          <Plus size={16} /> Add
        </button>
      </div>
    </div>
  );
}
