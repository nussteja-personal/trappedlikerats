// firebase.js
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore"; // ✅ IMPORTANT

// Your Firebase config (from project settings)
const firebaseConfig = {
  apiKey: "AIzaSyDkUMcE43qL10RReP7-hlF0k6XBO2J3aCo",
  authDomain: "trapped-like-rats.firebaseapp.com",
  projectId: "trapped-like-rats",
  storageBucket: "trapped-like-rats.firebasestorage.app",
  messagingSenderId: "511064349191",
  appId: "1:511064349191:web:c53ddc04b274c9d579a8a2",
  measurementId: "G-1HB2LDXH5Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Export Firestore database reference
export const db = getFirestore(app);
