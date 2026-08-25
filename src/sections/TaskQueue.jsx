import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, Plus, Star } from 'lucide-react';
import { api } from '../lib/api.js';
import { useIdentity } from '../lib/identity.jsx';
import ProgressRing from '../components/ProgressRing.jsx';

export default function TaskQueue({ trackKey, track }) {
  const { managerId, team } = useIdentity();
  const [tasks, setTasks] = useState(null);
  const [newTask, setNewTask] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.getProgress(trackKey),
      // A manager's own task template (Content Library) takes precedence
      // over the hardcoded defaults in tracks.js, if they've set one up.
      api.getContent(trackKey, 'tasks', managerId, team).catch(() => ({ blocks: [] }))
    ])
      .then(([data, templateContent]) => {
        if (cancelled) return;
        const templateTasks = (templateContent.blocks || [])
          .filter((b) => b.type === 'task')
          .map((b) => ({ id: b.id, title: b.text, section: 'task-queue', category: b.category || null }));
        const defaults = templateTasks.length > 0 ? templateTasks : track.defaultTasks;

        const saved = data.tasks || [];
        const savedIds = new Set(saved.map((t) => t.id));
        const merged = [
          ...saved,
          ...defaults.filter((t) => !savedIds.has(t.id)).map((t) => ({ ...t, done: false }))
        ];
        setTasks(merged);
      })
      .catch((e) => setError(e.message));
    return () => { cancelled = true; };
  }, [trackKey, managerId, team]);

  async function toggleTask(taskId, done) {
    const task = tasks.find((t) => t.id === taskId);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, done } : t)));
    try {
      await api.updateProgress(trackKey, taskId, done, { title: task?.title, section: task?.section });
    } catch (e) {
      setError(e.message);
    }
  }

  function addTask() {
    if (!newTask.trim()) return;
    const id = `custom-${Date.now()}`;
    const title = newTask.trim();
    setTasks((prev) => [...prev, { id, title, section: 'task-queue', done: false, custom: true }]);
    setNewTask('');
    api.updateProgress(trackKey, id, false, { title, section: 'task-queue' }).catch((e) => setError(e.message));
  }

  if (error) {
    return <p className="text-sm text-red-600">Couldn't load your tasks: {error}</p>;
  }
  if (!tasks) {
    return <p className="text-sm text-ink-300">Loading your tasks...</p>;
  }

  const doneCount = tasks.filter((t) => t.done).length;

  // Group by category, preserving first-seen category order. Uncategorized
  // tasks (the hardcoded track defaults, custom personal add-ons) land in a
  // trailing "General" group so nothing gets silently dropped.
  const groups = [];
  const groupIndex = {};
  tasks.forEach((t) => {
    const cat = t.category || 'General';
    if (!(cat in groupIndex)) {
      groupIndex[cat] = groups.length;
      groups.push({ name: cat, tasks: [] });
    }
    groups[groupIndex[cat]].tasks.push(t);
  });
  // Keep "General" last if it exists alongside real categories.
  groups.sort((a, b) => (a.name === 'General' ? 1 : 0) - (b.name === 'General' ? 1 : 0));

  function sortTasks(list) {
    return [...list].sort((a, b) => (b.starred ? 1 : 0) - (a.starred ? 1 : 0) || (a.done ? 1 : 0) - (b.done ? 1 : 0));
  }

  function TaskRow({ t }) {
    const opensSomewhere = t.section && t.section !== 'task-queue';
    return (
      <div className="w-full flex items-center gap-3 p-3.5 bg-card border border-border rounded-xl hover:border-navy/30 transition-colors">
        <button onClick={() => toggleTask(t.id, !t.done)} className="shrink-0">
          {t.done ? (
            <CheckCircle2 className="text-success" size={20} />
          ) : (
            <Circle className="text-ink-300" size={20} />
          )}
        </button>
        {opensSomewhere ? (
          <Link to={`/${t.section}`} className={`flex-1 text-sm hover:underline ${t.done ? 'text-ink-300 line-through' : 'text-ink-900'}`}>
            {t.title}
          </Link>
        ) : (
          <span className={`flex-1 text-sm ${t.done ? 'text-ink-300 line-through' : 'text-ink-900'}`}>
            {t.title}
          </span>
        )}
        {t.starred && <Star size={16} className="text-lime fill-lime shrink-0" />}
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-4">
        <ProgressRing done={doneCount} total={tasks.length} size={48} />
        <div>
          <h1 className="font-display text-xl font-semibold text-ink-900">My Tasks</h1>
          <p className="text-sm text-ink-500">{doneCount} of {tasks.length} complete</p>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {groups.map((group) => {
          const groupDone = group.tasks.filter((t) => t.done).length;
          return (
            <div key={group.name}>
              {groups.length > 1 && (
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-300">{group.name}</h2>
                  <span className="text-xs text-ink-300">{groupDone}/{group.tasks.length}</span>
                </div>
              )}
              <div className="space-y-2">
                {sortTasks(group.tasks).map((t) => <TaskRow key={t.id} t={t} />)}
              </div>
            </div>
          );
        })}
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
