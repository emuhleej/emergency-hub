# Deploy Guide

Your Firebase config is already pasted into index.html, so this is shorter
than usual.

## Part 1 - GitHub Pages

1. Create a new GitHub repository (e.g. `emergency-hub`).
2. Upload `index.html` and `.nojekyll` to the repository root.
3. Repo **Settings -> Pages -> Source**: select `main` branch, `/ (root)`, Save.
4. The app goes live at `https://<username>.github.io/emergency-hub/`
   within a minute or two.
5. Open it on both phones, enter the code, and add it to both home screens
   (Safari: Share -> Add to Home Screen).

## Part 2 - Finish Firebase (two console steps)

In https://console.firebase.google.com, project **emergency-contact-hub**:

1. **Build -> Firestore Database** - if you haven't created the database
   yet, do it now (production mode, US region).
2. **Build -> Authentication -> Get started -> Sign-in method ->
   Anonymous -> Enable.**
3. **Firestore Database -> Rules** - replace everything with this and Publish:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /hubs/{hub}/{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

Reload the app - the header pill should switch to **Synced**. The first
phone to connect uploads whatever it already has saved locally, so nothing
entered beforehand is lost.

## Notes

- The Firebase config being visible in a public repo is normal and safe -
  access is controlled by the rules and the entry code, not by hiding keys.
  Still, keep the repo URL and the code between the two of you.
- The entry code is 2580. To change it later, ask Claude to regenerate the
  lock constants (the code is stored as a hash, so it can't just be typed in).
- Firestore documents cap at 1 MB: images are auto-compressed on upload,
  and PDFs over ~650 KB are rejected with a suggestion to screenshot instead.
- Usage stays comfortably inside Firebase's free tier.

## Troubleshooting

- Pill says **Sync error** on GitHub Pages: rules not published, Anonymous
  auth not enabled, or Firestore database not created yet.
- Changes not appearing on the other phone: both phones must be on the same
  GitHub Pages URL and using the same entry code.
- Forgot to test: Call/Text/Share buttons need the real browser -
  they're blocked in preview sandboxes, never on GitHub Pages.
