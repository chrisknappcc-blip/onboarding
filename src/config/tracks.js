// Each "track" is a team's onboarding path. Add a new track here to spin up
// a variant (e.g. Cole's team) without touching component code.
// Content (doc bodies, video links, etc.) is NOT stored here - this file only
// defines structure. Actual content lives in Azure Blob and is fetched by
// section + track key at runtime (see netlify/functions/get-content.js).

export const TRACKS = {
  bdr: {
    label: 'BDR Onboarding',
    manager: 'chris.knapp',
    sections: [
      { key: 'task-queue', label: 'My Tasks', icon: 'ListChecks' },
      { key: 'hubspot-walkthrough', label: 'HubSpot Walkthrough', icon: 'MousePointerClick', searchable: true },
      { key: 'gong-library', label: 'Gong Recordings', icon: 'PlayCircle' },
      { key: 'app-walkthroughs', label: 'Tools We Use', icon: 'LayoutGrid', searchable: true },
      { key: 'intranet', label: 'Valuable Links', icon: 'Globe' },
      { key: 'playbook', label: 'Playbook', icon: 'BookOpen', searchable: true }
    ],
    // Seed tasks - editable later via the task queue UI, this is just the
    // default checklist a new BDR starts with.
    defaultTasks: [
      { id: 'intro-complete', title: 'Complete the Intro', section: 'intro' },
      { id: 'bdr-1', title: 'Read the BDR Playbook', section: 'playbook' },
      { id: 'bdr-2', title: 'Complete HubSpot walkthrough', section: 'hubspot-walkthrough' },
      { id: 'bdr-3', title: 'Watch 3 Gong calls tagged "discovery"', section: 'gong-library' },
      { id: 'bdr-4', title: 'Set up Cipher access', section: 'app-walkthroughs' },
      { id: 'bdr-5', title: 'Shadow a live call with a teammate', section: 'gong-library' },
      { id: 'bdr-6', title: 'Send first 10 prospecting emails', section: 'task-queue' }
    ]
  },
  ae: {
    label: 'AE Onboarding (Cole\'s Team)',
    manager: 'cole',
    sections: [
      { key: 'task-queue', label: 'My Tasks', icon: 'ListChecks' },
      { key: 'hubspot-walkthrough', label: 'HubSpot Walkthrough', icon: 'MousePointerClick', searchable: true },
      { key: 'gong-library', label: 'Gong Recordings', icon: 'PlayCircle' },
      { key: 'app-walkthroughs', label: 'Tools We Use', icon: 'LayoutGrid', searchable: true },
      { key: 'intranet', label: 'Valuable Links', icon: 'Globe' },
      { key: 'playbook', label: 'Playbook', icon: 'BookOpen', searchable: true }
    ],
    defaultTasks: [
      { id: 'intro-complete', title: 'Complete the Intro', section: 'intro' },
      { id: 'ae-1', title: 'Read the Account Executive Orientation Guide', section: 'playbook' },
      { id: 'ae-2', title: 'Complete HubSpot walkthrough', section: 'hubspot-walkthrough' },
      { id: 'ae-3', title: 'Watch 3 Gong calls tagged "demo"', section: 'gong-library' },
      { id: 'ae-4', title: 'Review Account Management Playbook', section: 'playbook' },
      { id: 'ae-5', title: 'Shadow a live demo', section: 'gong-library' }
    ]
  }
};

export function getTrack(trackKey) {
  return TRACKS[trackKey] || TRACKS.bdr;
}
