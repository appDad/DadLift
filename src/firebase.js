import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai";

/* ===== Admin — keep in sync with adminEmail() in firestore.rules ===== */
export const ADMIN_EMAIL = "egabel@gmail.com";

/* Config comes from .env.local (see .env.example) — never committed.
   These are publishable client identifiers, but keeping them out of the
   repo means no secret-scanner noise and no copy-paste reuse. */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FB_API_KEY,
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FB_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FB_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FB_APP_ID,
};

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

if (!firebaseConfig.apiKey) {
  throw new Error("Missing Firebase config — copy .env.example to .env.local and fill it in.");
}

export const app = initializeApp(firebaseConfig);

/* App Check — in dev, prints a debug token to the console on first run.
   Register it: Firebase console → App Check → Apps → DadLift → ⋮ → Manage debug tokens. */
if (import.meta.env.DEV) {
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}
try {
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });
} catch (e) {
  /* App Check failure shouldn't brick the app while enforcement is off */
}

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

const ai = getAI(app, { backend: new GoogleAIBackend() });
export const coachModel = getGenerativeModel(ai, { model: "gemini-2.5-flash" });
