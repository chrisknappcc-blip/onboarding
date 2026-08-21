import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export default function Dashboard({ track }) {
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    api.getProgress(track.label).catch(() => {});
  }, [track]);

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900">Welcome</h1>
      <p className="text-sm text-gray-500 mt-1">Here's where to pick up your onboarding.</p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {track.sections.map((s) => (
          <Link
            key={s.key}
            to={`/${s.key}`}
            className="p-4 bg-white border border-gray-200 rounded-lg hover:border-brand/40 transition-colors"
          >
            <span className="text-sm font-medium text-gray-800">{s.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
