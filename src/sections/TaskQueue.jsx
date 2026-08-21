import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Plus } from 'lucide-react';
import { api } from '../lib/api.js';

export default function TaskQueue({ trackKey, track }) {
  const [tasks, setTasks] = useState(null);
  const [newTask, setNewTask] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.getProgress(trackKey)
      .then((data) => {
        if (cancelled) return;
        // Merge default tasks with any saved completion state / custom tasks
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
    return <p className="text-sm text-gray-400">Loading your tasks...</p>;
  }

  const doneCount = tasks.filter((t) => t.done).length;

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-gray-900">My Tasks</h1>
      <p className="text-sm text-gray-500 mt-1">
        {doneCount} of {tasks.length} complete
      </p>

      <div className="mt-6 space-y-2">
        {tasks.map((t) => (
          <button
            key={t.id}
            onClick={() => toggleTask(t.id, !t.done)}
            className="w-full flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg text-left hover:border-brand/40 transition-colors"
          >
            {t.done ? (
              <CheckCircle2 className="text-brand shrink-0" size={20} />
            ) : (
              <Circle className="text-gray-300 shrink-0" size={20} />
            )}
            <span className={`text-sm ${t.done ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
              {t.title}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTask()}
          placeholder="Add a task..."
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
        <button
          onClick={addTask}
          className="flex items-center gap-1 px-3 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark"
        >
          <Plus size={16} /> Add
        </button>
      </div>
    </div>
  );
}
