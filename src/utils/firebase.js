// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {
  getAuth,
  getAdditionalUserInfo,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
} from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCjvIYdr8j9io07lfYVSox_VinCWmIsNM4",
  authDomain: "outfitgenerator-d60a5.firebaseapp.com",
  projectId: "outfitgenerator-d60a5",
  storageBucket: "outfitgenerator-d60a5.firebasestorage.app",
  messagingSenderId: "569963546935",
  appId: "1:569963546935:web:7542758aa95a59c6bbb2b2",
};

// Initialize Firebase. Firestore and Storage are only accessed through the backend.
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Sign ups are temporarily closed. Set to true to reopen them.
// This only gates the UI. To enforce it server side, also turn off
// "Enable create (sign-up)" in Firebase Console > Authentication > Settings.
export const SIGNUPS_OPEN = false;

const providers = {
  google: () => new GoogleAuthProvider(),
  github: () => new GithubAuthProvider(),
};

// Google and GitHub popups create an account on first use, so while sign ups
// are closed we remove any account that was created by this sign in.
export const signInWithProvider = async (name) => {
  const result = await signInWithPopup(auth, providers[name]());
  if (!SIGNUPS_OPEN && getAdditionalUserInfo(result)?.isNewUser) {
    await result.user.delete();
    throw Object.assign(new Error(), { code: 'app/signups-closed' });
  }
  return result.user;
};

const AUTH_MESSAGES = {
  'app/signups-closed': 'Sign ups are closed right now. Only existing accounts can log in.',
  'auth/invalid-credential': 'That email and password do not match an account.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/user-not-found': 'No account uses that email.',
  'auth/wrong-password': 'That email and password do not match an account.',
  'auth/email-already-in-use': 'An account already uses that email. Try logging in.',
  'auth/weak-password': 'Use a password with at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts. Wait a minute and try again.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/account-exists-with-different-credential':
    'An account with this email already exists. Log in with the method you used before.',
  'auth/admin-restricted-operation': 'Sign ups are closed right now. Only existing accounts can log in.',
};

// Popups closed by the user are not errors worth showing.
export const isCancelledPopup = (err) =>
  err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request';

export const authErrorMessage = (err) =>
  AUTH_MESSAGES[err?.code] || 'Something went wrong. Please try again.';
