
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
      console.error("Firebase Error: Failed to initialize Firebase app. This could be due to invalid configuration values even if the API key is present. Ensure all NEXT_PUBLIC_FIREBASE_... variables in .env.local are correct.", e);
    }
  } else {
    app = getApp();
  }

  if (app) {
    try {
      auth = getAuth(app);
    } catch (e) {
       console.error("Firebase Error: Failed to get Auth instance. This may occur if the app was initialized with an invalid API key or configuration. Verify .env.local and Firebase project settings.", e);
    }
  }
}

if (!auth) {
    console.error(
      "CRITICAL FIREBASE ERROR: Firebase Auth object could not be initialized. \n" +
      "This is a fundamental problem meaning no Firebase Authentication features will work.\n" +
      "Common reasons include:\n" +
      "1. MISSING or EMPTY 'NEXT_PUBLIC_FIREBASE_API_KEY' in your .env.local file.\n" +
      "2. INCORRECT or INVALID value for 'NEXT_PUBLIC_FIREBASE_API_KEY'.\n" +
      "3. Other MISSING or INCORRECT Firebase configuration values (e.g., 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 'NEXT_PUBLIC_FIREBASE_PROJECT_ID') in .env.local.\n" +
      "4. Firebase project settings might not authorize this app's domain (check 'Authorized domains' in Firebase Authentication -> Settings).\n" +
      "5. 'Google' (or other) sign-in provider NOT ENABLED in Firebase Authentication -> Sign-in method.\n\n" +
      "IMMEDIATE ACTIONS REQUIRED:\n" +
      "A. CAREFULLY VERIFY ALL `NEXT_PUBLIC_FIREBASE_...` variables in your `.env.local` file against your Firebase project settings (Project settings > General > Your apps > SDK setup and configuration).\n" +
      "B. ENSURE 'Google' sign-in provider is ENABLED in Firebase console (Authentication -> Sign-in method).\n" +
      "C. ENSURE your current development domain (e.g., *.cloudworkstations.dev, localhost) are listed under 'Authorized domains' in Firebase Authentication settings.\n" +
      "D. CRITICAL: AFTER ANY CHANGES TO .env.local, YOU MUST RESTART your Next.js development server (stop it with Ctrl+C, then run `npm run dev`).\n"
    );
}

export { app, auth, googleProvider };
