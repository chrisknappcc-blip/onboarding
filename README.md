# Onboarding Hub

Scaffold for the BDR/AE onboarding app discussed with John and Cole. Same stack as Cipher: React/Vite, Netlify Functions, Azure Blob Storage — auth is **Netlify Identity**.

See **DEPLOY.md** for pushing this to its own repo, standing up the Netlify site, and setting manager roles for Chris/Cole/John.

## What's here

- `src/config/tracks.js` - defines sections + default task checklist per team ("bdr", "ae"). Add a new key here to spin up another team's variant without touching component code.
- `src/lib/identity.jsx` - Netlify Identity wrapper (login/logout, current user, roles, track) exposed via `useIdentity()`.
- `src/sections/` - one component per nav section. Playbook, HubSpot Walkthrough, Gong Library, App Walkthroughs, and Intranet all render through the shared `ContentSection.jsx`, which pulls JSON from Azure Blob via `get-content`.
- `src/sections/TaskQueue.jsx` - the checklist. Seeded from `defaultTasks` in tracks.js, syncs done/not-done to Azure Blob per user, supports adding custom tasks.
- `src/sections/TeamProgress.jsx` - manager-only view. Shows everyone on a track, click into any person to see their full checklist, toggle their tasks, or add a new task just for them. Gated by the `manager` role in Netlify Identity.
- `netlify/functions/` - get-progress, update-progress, get-content, get-team-progress. All using the existing `AZURE_STORAGE_ACCOUNT_NAME` / `AZURE_STORAGE_SAS_TOKEN` pattern. Auth comes from `context.clientContext.user`, which Netlify populates automatically from the Identity JWT — no manual token verification needed.

## Who can do what

- Everyone: view their own sections, check off their own tasks, add tasks to themselves.
- Anyone with the `manager` role (set Chris, Cole, John): see the Team Progress tab, view any individual's full checklist, toggle their tasks, and add tasks directly to a specific person.

## Still needs before this is real

1. **Track + manager assignment**: set `app_metadata.track` ("bdr" or "ae") and `app_metadata.roles: ["manager"]` per user via the Netlify CLI/Identity Admin API — see DEPLOY.md step 4.
2. **SAS token permissions**: the team progress list view needs List ("l") permission on the container. Check whether the existing `AZURE_STORAGE_SAS_TOKEN` has that, or if it needs regenerating.
3. **Content**: nothing is written to `content/{track}/{section}.json` yet — sections will render their empty state until content is uploaded. Once you've got the playbook text, HubSpot walkthrough steps, and Gong links ready, I can write a quick script to push them into blob storage in the right shape (see `ContentSection.jsx` for the block format: `text`, `link`, `video`).

## Env vars (Netlify)

```
AZURE_STORAGE_ACCOUNT_NAME=carepathiqdata
AZURE_STORAGE_SAS_TOKEN=
AZURE_ONBOARDING_CONTAINER=onboarding-hub
```

## Local dev

```
npm install
netlify dev
```
