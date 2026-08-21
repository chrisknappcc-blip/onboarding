import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useIdentity } from './lib/identity.jsx';
import Layout from './components/Layout.jsx';
import { getTrack } from './config/tracks.js';

import Dashboard from './sections/Dashboard.jsx';
import Playbook from './sections/Playbook.jsx';
import HubSpotWalkthrough from './sections/HubSpotWalkthrough.jsx';
import GongLibrary from './sections/GongLibrary.jsx';
import AppWalkthroughs from './sections/AppWalkthroughs.jsx';
import Intranet from './sections/Intranet.jsx';
import TaskQueue from './sections/TaskQueue.jsx';
import TeamProgress from './sections/TeamProgress.jsx';

export default function App() {
  const { user, initialized, login } = useIdentity();

  useEffect(() => {
    if (initialized && !user) login();
  }, [initialized, user]);

  if (!initialized) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50">
        <p className="text-sm text-gray-500">Sign in to continue.</p>
        <button
          onClick={login}
          className="px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark"
        >
          Log in
        </button>
      </div>
    );
  }

  return <AuthedApp />;
}

function AuthedApp() {
  const { track: trackKey, roles } = useIdentity();
  const track = getTrack(trackKey);
  const isManager = roles.includes('manager');

  return (
    <Layout track={track} isManager={isManager}>
      <Routes>
        <Route path="/" element={<Dashboard track={track} />} />
        <Route path="/playbook" element={<Playbook trackKey={trackKey} />} />
        <Route path="/hubspot-walkthrough" element={<HubSpotWalkthrough trackKey={trackKey} />} />
        <Route path="/gong-library" element={<GongLibrary trackKey={trackKey} />} />
        <Route path="/app-walkthroughs" element={<AppWalkthroughs trackKey={trackKey} />} />
        <Route path="/intranet" element={<Intranet trackKey={trackKey} />} />
        <Route path="/task-queue" element={<TaskQueue trackKey={trackKey} track={track} />} />
        {isManager && (
          <Route path="/team-progress" element={<TeamProgress trackKey={trackKey} />} />
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
