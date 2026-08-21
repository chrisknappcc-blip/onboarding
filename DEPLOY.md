# Deploying Onboarding Hub to its own repo + Netlify site

## 1. Push to a new GitHub repo

```
cd onboarding-hub
git init
git add .
git commit -m "Initial scaffold"
```

Create an empty repo on GitHub (no README/gitignore, this project already has both), then:

```
git remote add origin https://github.com/<your-org-or-username>/onboarding-hub.git
git branch -M main
git push -u origin main
```

## 2. Create the Netlify site

1. Netlify dashboard → **Add new site** → **Import an existing project** → connect the `onboarding-hub` GitHub repo.
2. Build settings should auto-detect from `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`
3. Deploy.

## 3. Turn on Netlify Identity

1. Site settings → **Identity** → **Enable Identity**.
2. Under **Registration**, set to **Invite only** (so randoms can't self-signup).
3. Under **Services** → **Git Gateway**, you can leave this off — it's only needed if you want Identity users editing content through Netlify CMS, which this app doesn't use.

## 4. Invite people and set their roles/track

Identity doesn't have a UI for custom fields by default, so roles and track live in **app_metadata**, which you set per user:

1. Site settings → Identity → **Invite users** → enter their email. They'll get an email to set a password.
2. Once they've accepted, go to that user's row → there's no direct app_metadata editor in the UI, so this is set via the Identity Admin API or a one-time script. Simplest path for a small team: use the Netlify CLI.

```
netlify api updateUser --data '{
  "id": "<user-id-from-identity-tab>",
  "app_metadata": { "roles": ["manager"], "track": "bdr" }
}'
```

- Give **Chris, Cole, and John** `"roles": ["manager"]` so they see Team Progress.
- Give each new BDR `"track": "bdr"`, each new AE `"track": "ae"`.
- A manager can also just be on the `"bdr"` or `"ae"` track themselves if they want their own checklist too — roles and track are independent fields.

If inviting more than a handful of people, it's worth asking me to write a small script that batches this via the Identity Admin API instead of doing it one by one.

## 5. Environment variables (Site settings → Environment variables)

```
AZURE_STORAGE_ACCOUNT_NAME=carepathiqdata
AZURE_STORAGE_SAS_TOKEN=<needs read+write+list on the onboarding-hub container - see note below>
AZURE_ONBOARDING_CONTAINER=onboarding-hub
```

**SAS token note:** the Team Progress view lists all blobs under `progress/{track}/` to build the roster, which needs **List ("l")** permission in addition to read/write. If your existing SAS token was scoped for Cipher without list access, generate a new one for this container (or a container-level token) with Read, Write, List, Create permissions.

## 6. Create the Azure container

If `onboarding-hub` doesn't exist yet as a container in the `carepathiqdata` storage account, create it (private access) before first deploy — the functions assume it exists.

## Local dev

```
npm install
netlify dev
```

`netlify dev` runs Identity locally against your live site's Identity instance (you'll be prompted to log in / link the site on first run).
