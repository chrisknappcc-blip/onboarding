import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useIdentity } from './lib/identity.jsx';
import Layout from './components/Layout.jsx';
import ProfileGate from './components/ProfileGate.jsx';
import RequirePasswordChange from './components/RequirePasswordChange.jsx';
import { getTrack } from './config/tracks.js';

import Intro from './sections/Intro.jsx';
import Playbook from './sections/Playbook.jsx';
import HubSpotWalkthrough from './sections/HubSpotWalkthrough.jsx';
import GongLibrary from './sections/GongLibrary.jsx';
import AppWalkthroughs from './sections/AppWalkthroughs.jsx';
import Intranet from './sections/Intranet.jsx';
import TaskQueue from './sections/TaskQueue.jsx';
import TeamProgress from './sections/TeamProgress.jsx';
import TeamAdmin from './sections/TeamAdmin.jsx';
import ContentManager from './sections/ContentManager.jsx';

export default function App() {
  const { user, initialized, login } = useIdentity();

  useEffect(() => {
    if (!initialized || user) return;
    // If this load came from an invite/confirmation/recovery email link,
    // netlify-identity-widget already auto-opens its own contextual form
    // (e.g. "set your password") using the token in the URL hash. Forcing
    // open('login') here would override that with a plain login tab and
    // throw away the invite context - so skip it when a token is present.
    const hash = window.location.hash || '';
    const hasAuthToken = /(invite_token|confirmation_token|recovery_token|access_token)=/.test(hash);
    if (!hasAuthToken) login();
  }, [initialized, user]);

  if (!initialized) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-ink-300 bg-surface">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-surface">
        <div className="w-10 h-10 rounded-lg bg-navy flex items-center justify-center">
          <span className="text-white font-display font-semibold text-lg">O</span>
        </div>
        <div className="text-center">
          <h1 className="font-display text-xl font-semibold text-ink-900">Onboarding Hub</h1>
          <p className="text-sm text-ink-500 mt-1">Sign in to continue.</p>
        </div>
        <button
          onClick={login}
          className="px-5 py-2.5 bg-navy text-white text-sm font-medium rounded-xl hover:bg-navy-dark transition-colors"
        >
          Log in
        </button>
      </div>
    );
  }

  return (
    <RequirePasswordChange>
      <ProfileGate>
        <AuthedApp />
      </ProfileGate>
    </RequirePasswordChange>
  );
}

function AuthedApp() {
  const { track: trackKey, hasTeamAccess, isAdmin } = useIdentity();
  const track = getTrack(trackKey);

  return (
    <Layout track={track} hasTeamAccess={hasTeamAccess} isAdmin={isAdmin}>
      <Routes>
        <Route path="/" element={<Navigate to="/intro" replace />} />
        <Route path="/intro" element={<Intro />} />
        <Route path="/playbook" element={<Playbook trackKey={trackKey} />} />
        <Route path="/hubspot-walkthrough" element={<HubSpotWalkthrough trackKey={trackKey} />} />
        <Route path="/gong-library" element={<GongLibrary trackKey={trackKey} />} />
        <Route path="/app-walkthroughs" element={<AppWalkthroughs trackKey={trackKey} />} />
        <Route path="/intranet" element={<Intranet trackKey={trackKey} />} />
        <Route path="/task-queue" element={<TaskQueue trackKey={trackKey} track={track} />} />
        {hasTeamAccess && (
          <Route path="/team-progress" element={<TeamProgress trackKey={trackKey} />} />
        )}
        {hasTeamAccess && (
          <Route path="/content-library" element={<ContentManager />} />
        )}
        {isAdmin && (
          <Route path="/team-admin" element={<TeamAdmin />} />
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
