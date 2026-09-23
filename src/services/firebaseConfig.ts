import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "bingo2gether-f2631.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "bingo2gether-f2631",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "bingo2gether-f2631.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "227802289191",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:227802289191:web:ae13d4720072e463cfea02",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-84P3Y8FDFL"
};

const app = firebaseConfig.apiKey 
    ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApp())
    : null;

export const auth = app ? getAuth(app) : null;
export const googleProvider = new GoogleAuthProvider();
export default app;
