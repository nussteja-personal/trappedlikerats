


// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

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

// Export Firestore so other modules can import it
export const db = getFirestore(app);
