import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Plus, ChevronLeft, Star } from 'lucide-react';
import { api } from '../lib/api.js';
import { useIdentity } from '../lib/identity.jsx';
import ProgressRing from '../components/ProgressRing.jsx';

export default function TeamProgress({ trackKey }) {
  const { isAdmin, defaultTeamView } = useIdentity();
  const [scope, setScope] = useState(defaultTeamView);
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  function refresh(currentScope = scope) {
    api.getTeamProgress(trackKey, currentScope).then(setPayload).catch((e) => setError(e.message));
  }

  useEffect(() => { refresh(scope); }, [trackKey, scope]);

  if (error) return <p className="text-sm text-red-600">Couldn't load team progress: {error}</p>;
  if (!payload) return <p className="text-sm text-ink-300">Loading team progress...</p>;

  const rows = payload.rows;
  const person = rows.find((r) => r.userId === selected);

  if (person) {
    return (
      <IndividualView
        trackKey={trackKey}
        person={person}
        onBack={() => setSelected(null)}
        onChanged={() => refresh(scope)}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-ink-900">Team Progress</h1>
          <p className="text-sm text-ink-500 mt-1">Click into anyone to see their checklist or add a task.</p>
        </div>
        {payload.canToggleScope && (
          <div className="flex bg-white border border-border rounded-lg p-0.5">
            {[{ key: 'mine', label: 'My Team' }, { key: 'all', label: 'All Teams' }].map((opt) => (
              <button
                key={opt.key}
                onClick={() => setScope(opt.key)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  scope === opt.key ? 'bg-navy text-white' : 'text-ink-500 hover:text-ink-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 bg-white border border-border rounded-xl overflow-hidden">
        {rows.map((r, i) => (
          <button
            key={r.userId}
            onClick={() => setSelected(r.userId)}
            className={`w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-surface transition-colors ${
              i !== rows.length - 1 ? 'border-b border-border' : ''
            }`}
          >
            <ProgressRing done={r.doneCount} total={r.totalCount} size={36} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-ink-900">{r.name}</div>
              <div className="text-xs text-ink-300">Last active {r.lastActive}</div>
            </div>
            <div className="text-sm text-ink-500">{r.doneCount} / {r.totalCount}</div>
          </button>
        ))}
        {rows.length === 0 && (
          <div className="py-10 text-center text-sm text-ink-300">No one on this track yet.</div>
        )}
      </div>
    </div>
  );
}

function IndividualView({ trackKey, person, onBack, onChanged }) {
  const [tasks, setTasks] = useState(person.tasks);
  const [newTask, setNewTask] = useState('');
  const [error, setError] = useState(null);
  const done = tasks.filter((t) => t.done).length;

  async function toggle(taskId, doneState) {
    const task = tasks.find((t) => t.id === taskId);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, done: doneState } : t)));
    try {
      await api.updateUserTask(trackKey, person.userId, taskId, doneState, { title: task?.title, section: task?.section });
      onChanged();
    } catch (e) {
      setError(e.message);
    }
  }

  async function toggleStar(task) {
    const next = !task.starred;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, starred: next } : t)));
    try {
      await api.setTaskStarred(trackKey, person.userId, task.id, next, task.done);
      onChanged();
    } catch (e) {
      setError(e.message);
    }
  }

  async function addTask() {
    if (!newTask.trim()) return;
    const title = newTask.trim();
    setNewTask('');
    try {
      await api.addTaskForUser(trackKey, person.userId, title);
      setTasks((prev) => [...prev, { id: `pending-${Date.now()}`, title, done: false }]);
      onChanged();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="max-w-2xl">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900 transition-colors">
        <ChevronLeft size={16} /> Back to team
      </button>

      <div className="flex items-center gap-4 mt-4">
        <ProgressRing done={done} total={tasks.length} size={48} />
        <div>
          <h1 className="font-display text-xl font-semibold text-ink-900">{person.name}</h1>
          <p className="text-sm text-ink-500">{done} of {tasks.length} complete · last active {person.lastActive}</p>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

      <div className="mt-6 space-y-2">
        {[...tasks].sort((a, b) => (b.starred ? 1 : 0) - (a.starred ? 1 : 0) || (a.done ? 1 : 0) - (b.done ? 1 : 0)).map((t) => (
          <div
            key={t.id}
            className="w-full flex items-center gap-3 p-3.5 bg-card border border-border rounded-xl hover:border-navy/30 transition-colors"
          >
            <button onClick={() => toggle(t.id, !t.done)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
              {t.done ? (
                <CheckCircle2 className="text-success shrink-0" size={20} />
              ) : (
                <Circle className="text-ink-300 shrink-0" size={20} />
              )}
              <span className={`text-sm truncate ${t.done ? 'text-ink-300 line-through' : 'text-ink-900'}`}>
                {t.title}
              </span>
            </button>
            <button
              onClick={() => toggleStar(t)}
              title={t.starred ? 'Remove priority' : 'Mark as priority'}
              className="shrink-0 p-1 -m-1"
            >
              <Star
                size={18}
                className={t.starred ? 'text-accent fill-accent' : 'text-ink-300 hover:text-accent'}
              />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTask()}
          placeholder={`Add a task for ${person.name.split(' ')[0]}...`}
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
