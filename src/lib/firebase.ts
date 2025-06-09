
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';

// For debugging: Log if environment variables are loaded (client-side only)
if (typeof window !== 'undefined') {
  console.log(
    'Firebase Init: NEXT_PUBLIC_FIREBASE_API_KEY loaded:',
    !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  );
  console.log(
    'Firebase Init: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN loaded:',
    !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  );
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
let app: FirebaseApp | undefined;
let auth: Auth | null = null;
const googleProvider = new GoogleAuthProvider();

if (!firebaseConfig.apiKey) {
  console.error(
    'Firebase Critical Error: NEXT_PUBLIC_FIREBASE_API_KEY is missing or empty in your .env.local file. Firebase cannot be initialized. Please add it and restart your development server.'
  );
} else {
  if (!getApps().length) {
    try {
      app = initializeApp(firebaseConfig);
    } catch (e) {
      console.error("Firebase Error: Failed to initialize Firebase app. This could be due to invalid configuration values even if the API key is present.", e);
    }
  } else {
    app = getApp();
  }

  if (app) {
    try {
      auth = getAuth(app);
    } catch (e) {
       console.error("Firebase Error: Failed to get Auth instance. This may occur if the app was initialized with an invalid API key or configuration.", e);
    }
  }
}

if (!auth) {
    console.error(
      "Firebase Auth could not be initialized. This often means the Firebase app itself failed to initialize or auth could not be obtained. Common reasons include: \n" +
      "1. A missing or empty NEXT_PUBLIC_FIREBASE_API_KEY in your .env.local file.\n" +
      "2. An incorrect or invalid API key value in NEXT_PUBLIC_FIREBASE_API_KEY.\n" +
      "3. Other missing or incorrect Firebase configuration values (authDomain, projectId, etc.) in .env.local.\n" +
      "4. Your Firebase project settings might not authorize this app's domain (check 'Authorized domains' in Firebase Authentication settings).\n" +
      "5. Google Sign-In (or other providers) may not be enabled in your Firebase project.\n" +
      "Please double-check your .env.local file and your Firebase project console settings, then restart your development server."
    );
}

export { app, auth, googleProvider };
