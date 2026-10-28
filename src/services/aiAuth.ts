import { getApps, initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
export function getAIAuth() {
  if (!import.meta.env.VITE_FIREBASE_API_KEY || !import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || !import.meta.env.VITE_FIREBASE_PROJECT_ID) {
    throw new Error('AI sign-in is not configured.');
  }
  const app = getApps()[0] || initializeApp({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  });
  return getAuth(app);
}
export const signInAI = () => signInWithPopup(getAIAuth(), new GoogleAuthProvider());
export const signOutAI = () => signOut(getAIAuth());
