import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Plus, ChevronLeft } from 'lucide-react';
import { api } from '../lib/api.js';

export default function TeamProgress({ trackKey }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null); // userId of the person being viewed

  function refresh() {
    api.getTeamProgress(trackKey).then(setRows).catch((e) => setError(e.message));
  }

  useEffect(refresh, [trackKey]);

  if (error) return <p className="text-sm text-red-600">Couldn't load team progress: {error}</p>;
  if (!rows) return <p className="text-sm text-gray-400">Loading team progress...</p>;

  const person = rows.find((r) => r.userId === selected);

  if (person) {
    return (
      <IndividualView
        trackKey={trackKey}
        person={person}
        onBack={() => setSelected(null)}
        onChanged={refresh}
      />
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900">Team Progress</h1>
      <p className="text-sm text-gray-500 mt-1">Click into anyone to see their checklist or add a task.</p>
      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="text-left text-gray-400 border-b border-gray-200">
            <th className="py-2 font-medium">Name</th>
            <th className="py-2 font-medium">Tasks Done</th>
            <th className="py-2 font-medium">Last Active</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.userId}
              onClick={() => setSelected(r.userId)}
              className="border-b border-gray-100 cursor-pointer hover:bg-gray-50"
            >
              <td className="py-3 text-gray-800">{r.name}</td>
              <td className="py-3 text-gray-600">{r.doneCount} / {r.totalCount}</td>
              <td className="py-3 text-gray-400">{r.lastActive}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={3} className="py-6 text-center text-gray-400">No one on this track yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function IndividualView({ trackKey, person, onBack, onChanged }) {
  const [tasks, setTasks] = useState(person.tasks);
  const [newTask, setNewTask] = useState('');
  const [error, setError] = useState(null);

  async function toggle(taskId, done) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, done } : t)));
    try {
      await api.updateUserTask(trackKey, person.userId, taskId, done);
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
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
        <ChevronLeft size={16} /> Back to team
      </button>
      <h1 className="text-xl font-semibold text-gray-900 mt-3">{person.name}</h1>
      <p className="text-sm text-gray-500 mt-1">
        {tasks.filter((t) => t.done).length} of {tasks.length} tasks complete · last active {person.lastActive}
      </p>

      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

      <div className="mt-6 space-y-2">
        {tasks.map((t) => (
          <button
            key={t.id}
            onClick={() => toggle(t.id, !t.done)}
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
          placeholder={`Add a task for ${person.name.split(' ')[0]}...`}
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
