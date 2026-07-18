// Emergency Hub service worker - offline support + live auth bridge
const CACHE = 'ehub-v4';
const ASSETS = ['./manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

const SIGNIN_CSS = `
  .signin-card {
    width: min(380px, 100%);
    background: rgba(255,255,255,0.09);
    border: 1px solid rgba(255,255,255,0.16);
    border-radius: 28px;
    padding: 28px 22px;
    box-shadow: 0 18px 45px rgba(20,14,18,0.24);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }
  .google-btn:disabled { opacity: 0.7; cursor: wait; }
  .signin-open {
    color: #d9f1ec;
    font-size: 0.82rem;
    font-weight: 800;
    text-decoration: none;
    border-bottom: 1px solid rgba(217,241,236,0.55);
  }
  .signin-error { min-height: 1.2em; }
`;

const SIGNIN_HTML = `<div class="signin-overlay" id="signinOverlay">
  <div class="signin-card">
    <h2>Emergency <em>Hub</em></h2>
    <p>Sign in with Em or Hameed's approved Google account to sync this Hub.</p>
    <button class="google-btn" id="googleSignInBtn" onclick="googleSignIn()">
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
      <span class="google-btn-text">Sign in with Google</span>
    </button>
    <a class="signin-open" href="https://emuhleej.github.io/emergency-hub/" target="_blank" rel="noopener">Open in browser</a>
    <div class="signin-error" id="signinError"></div>
  </div>
</div>`;

const AUTH_SCRIPT = `// ---------- Google sign-in ----------
let firebaseModules = null;
async function loadFirebaseModules() {
  if (!firebaseModules) {
    const appM = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
    const fsM = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    const auM = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
    firebaseModules = { appM, fsM, auM };
  }
  return firebaseModules;
}
function allowedEmail(email) {
  return ALLOWED_EMAILS.map(e => e.toLowerCase()).includes(String(email || '').toLowerCase());
}
function setSigninMessage(message, isError) {
  const errEl = document.getElementById('signinError');
  if (!errEl) return;
  errEl.textContent = message || '';
  errEl.style.color = isError ? 'var(--amber-mid)' : 'rgba(255,255,255,0.72)';
}
function setSigninBusy(busy, label) {
  const btn = document.getElementById('googleSignInBtn');
  if (!btn) return;
  btn.disabled = !!busy;
  const text = btn.querySelector('.google-btn-text');
  if (text) text.textContent = busy ? (label || 'Checking...') : 'Sign in with Google';
}
async function getFirebaseApp(appM) {
  try { return appM.getApp(); } catch(e) { return appM.initializeApp(firebaseConfig); }
}
async function getPreparedAuth(appM, auM) {
  const app = await getFirebaseApp(appM);
  const auth = auM.getAuth(app);
  try { await auM.setPersistence(auth, auM.browserLocalPersistence); } catch (e) { console.warn('Auth persistence fallback:', e && e.code); }
  try { await auM.getRedirectResult(auth); } catch (e) { console.warn('Redirect result issue:', e && e.code); }
  return auth;
}
function waitForAuthUser(auM, auth, timeoutMs) {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  return new Promise(resolve => {
    let done = false;
    let timer = null;
    let unsub = () => {};
    const finish = user => {
      if (done) return;
      done = true;
      if (timer) clearTimeout(timer);
      unsub();
      resolve(user || auth.currentUser || null);
    };
    unsub = auM.onAuthStateChanged(auth, finish, () => finish(null));
    timer = setTimeout(() => finish(auth.currentUser || null), timeoutMs || 3500);
  });
}
async function googleSignIn() {
  setSigninMessage('', false);
  setSigninBusy(true, 'Opening Google...');
  try {
    const { appM, auM } = await loadFirebaseModules();
    const auth = await getPreparedAuth(appM, auM);
    const provider = new auM.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    let user = null;
    try {
      const result = await auM.signInWithPopup(auth, provider);
      user = result.user;
    } catch (e) {
      const code = (e && e.code) || '';
      if (code === 'auth/popup-blocked' ||
          code === 'auth/cancelled-popup-request' ||
          code === 'auth/operation-not-supported-in-this-environment' ||
          code === 'auth/web-storage-unsupported') {
        setSigninMessage('Opening Google in this browser...', false);
        await auM.signInWithRedirect(auth, provider);
        return;
      }
      throw e;
    }

    const email = user && user.email;
    if (!allowedEmail(email)) {
      await auM.signOut(auth);
      setSigninMessage((email || 'This account') + ' is not authorised for this hub.', true);
      return;
    }
    document.getElementById('signinOverlay').classList.remove('open');
    await initFirebase();
  } catch(e) {
    if (e && e.code === 'auth/popup-closed-by-user') {
      setSigninMessage('Google sign-in was closed before it finished.', true);
      return;
    }
    console.error('Sign-in error:', e);
    setSigninMessage('Sign-in failed. Open in browser, then try Google again.', true);
  } finally {
    setSigninBusy(false);
  }
}

async function initFirebase() {
  if (fb) return;
  if (!configLooksReal()) { setSync('local'); return; }
  try {
    const { appM, fsM, auM } = await loadFirebaseModules();
    const app = await getFirebaseApp(appM);
    const auth = await getPreparedAuth(appM, auM);
    const user = await waitForAuthUser(auM, auth, 3500);

    // If not signed in yet, show the Google sign-in overlay and stop here.
    // googleSignIn() will call initFirebase() again once auth succeeds.
    if (!user) {
      document.getElementById('signinOverlay').classList.add('open');
      setSigninMessage('Google sign-in is needed for synced household data.', false);
      return;
    }

    // Double-check the signed-in account is allowed
    if (!allowedEmail(user.email)) {
      await auM.signOut(auth);
      document.getElementById('signinOverlay').classList.add('open');
      setSigninMessage((user.email || 'This account') + ' is not authorised for this hub.', true);
      return;
    }

    let db;
    try { db = fsM.initializeFirestore(app, { localCache: fsM.persistentLocalCache() }); }
    catch (e) { db = fsM.getFirestore(app); }

    fb = {
      db,
      doc: fsM.doc, setDoc: fsM.setDoc, deleteDoc: fsM.deleteDoc,
      collection: fsM.collection, onSnapshot: fsM.onSnapshot
    };
    fb.coreRef = fb.doc(db, 'hubs', HOUSEHOLD_ID);
    fb.fileRef = id => fb.doc(db, 'hubs', HOUSEHOLD_ID, 'files', id);
    fb.filesCol = fb.collection(db, 'hubs', HOUSEHOLD_ID, 'files');

    fb.onSnapshot(fb.coreRef, snap => {
      if (!snap.exists()) { bootstrapUpload(); }
      else {
        const d = snap.data() || {};
        CORE_KEYS.forEach(k => { if (d[k] !== undefined) { data[k] = d[k]; cacheLocal(k); } });
        renderAll();
      }
      setSync('synced');
    }, err => { console.error(err); setSync('error', err); });

    fb.onSnapshot(fb.filesCol, snap => {
      const docs = [], petdocs = [];
      snap.forEach(s => { const f = s.data(); (f.kind === 'petdoc' ? petdocs : docs).push(f); });
      const byTime = (a, b) => (a.createdAt || 0) - (b.createdAt || 0);
      data.docs = docs.sort(byTime);
      data.petdocs = petdocs.sort(byTime);
      cacheLocal('docs'); cacheLocal('petdocs');
      renderDocs(); renderPets();
      setSync('synced');
    }, err => { console.error(err); setSync('error', err); });

  } catch (e) {
    console.error('Firebase init failed:', e);
    setSync('error', e);
  }
}
`;

function patchHtml(html) {
  let out = html;
  if (!out.includes('.signin-card')) out = out.replace('</style>', SIGNIN_CSS + '\n</style>');
  out = out.replace(/<div class="signin-overlay" id="signinOverlay">[\s\S]*?\n\n<div class="lock" id="lockScreen">/, SIGNIN_HTML + '\n\n<div class="lock" id="lockScreen">');
  out = out.replace(/\/\/ ---------- Google sign-in ----------[\s\S]*?\nfunction bootstrapUpload\(\)/, AUTH_SCRIPT + '\nfunction bootstrapUpload()');
  return out;
}

async function patchedShellResponse(response) {
  const html = await response.text();
  const headers = new Headers(response.headers);
  headers.set('content-type', 'text/html; charset=utf-8');
  return new Response(patchHtml(html), { status: response.status, statusText: response.statusText, headers });
}

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== 'ehub-runtime').map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Never intercept Firestore/auth traffic.
  if (url.hostname.includes('googleapis.com') || url.hostname.includes('firebaseio.com')) return;

  // App navigation: network first, patch the shell, fall back to the cached patched shell when offline.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => patchedShellResponse(res).then(patched => {
          const copy = patched.clone();
          caches.open(CACHE).then(c => c.put('./index.html', copy));
          return patched;
        }))
        .catch(() => caches.match('./index.html').then(hit => hit || caches.match('./')))
    );
    return;
  }

  // Everything else (app assets, fonts, Firebase SDK modules): cache first, then network.
  e.respondWith(
    caches.match(e.request).then(hit => {
      if (hit) return hit;
      return fetch(e.request).then(res => {
        if (res.ok || res.type === 'opaque') {
          const copy = res.clone();
          caches.open('ehub-runtime').then(c => c.put(e.request, copy));
        }
        return res;
      });
    })
  );
});
