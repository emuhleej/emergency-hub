# Household Emergency Hub

A shared emergency info app for Em & Hameed - contacts, medical profiles,
doctors, insurance documents, and pet records with vaccine uploads, synced
in real time between both phones via Firebase.

## Entry code
The app opens to a keypad lock screen. Code: ****.
It stays unlocked until the app is fully closed. The code is never stored
in the page in readable form, and your Firestore data path is derived from
it - the wrong code can't reach the data.

## Pages
- **Contacts** - people & work numbers, split Em / Hameed, with one-tap
  Call / Text / Copy and search
- **Medical** - profiles (DOB, blood type, allergies, conditions),
  medications, and each person's doctors
- **Documents** - insurance card photos/PDFs plus policy-number notes,
  per person
- **Pets** - shared vet contacts, then a card per pet: profile, microchip,
  meds, vaccine & record uploads with Share

## Everyday use
- Tap **Edit** in the header to reveal all add/rename/delete controls;
  **Done** locks it back to view mode.
- Photos are compressed automatically on upload so they sync fast.
- The header pill shows sync status: **Local**, **Synced**, or **Sync error**.
- Changes made on one phone appear on the other within seconds once
  Firebase setup (DEPLOY.md Part 2) is complete.
- Add the page to both home screens (Safari: Share -> Add to Home Screen)
  so it opens fullscreen like an app.

## New in this version
- **Works offline** - installs as a real app (Add to Home Screen) and opens
  instantly with the last-synced data, even with no signal
- **First Responder card** - address, entry notes, household info, and ICE
  contacts; also viewable from the code screen WITHOUT the code (on purpose -
  keep door codes out of it)
- **Backup & Restore** - buttons at the bottom of the home page export/import
  everything, documents included
- **Camera capture** - upload tiles now offer "Take a photo" directly
- Phone and date fields open the number pad and auto-format as you type

## Files (upload ALL of these to the repo root)
- `index.html` - the app
- `sw.js` - offline support (service worker)
- `manifest.json` - app install metadata
- `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` - app icons
- `.nojekyll` - tells GitHub Pages to serve files as-is
- `DEPLOY.md` - setup steps
