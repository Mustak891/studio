
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

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
let app;

if (!firebaseConfig.apiKey) {
  console.error(
    'Firebase Error: API Key is missing. Please check your .env.local file and ensure NEXT_PUBLIC_FIREBASE_API_KEY is set and that you have restarted your development server.'
  );
  // Prevent Firebase initialization if API key is definitely missing
  // You might want to throw an error here or handle it more gracefully depending on your app's needs
}

if (!getApps().length) {
  if (firebaseConfig.apiKey) { // Only initialize if API key is present
    app = initializeApp(firebaseConfig);
  } else {
    // App will not be initialized, auth will likely fail later
    // This state should be handled, perhaps by showing an error message to the user
    console.error("Firebase app initialization skipped due to missing API key.");
  }
} else {
  app = getApp();
}

// Get Auth instance only if app was initialized
const auth = app ? getAuth(app) : null; // Make auth potentially null if app isn't initialized
const googleProvider = new GoogleAuthProvider();

// If auth is null, functions in AuthContext might fail. This needs to be handled.
if (!auth) {
    console.error("Firebase Auth could not be initialized because the Firebase app failed to initialize (likely due to a missing API key).");
}

export { app, auth, googleProvider };
