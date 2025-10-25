// Firebase Configuration Template for Store Planner Pro
// DO NOT commit your actual credentials to GitHub!
// 
// Instructions:
// 1. Copy this file to 'firebase-config.js' (which is in .gitignore)
// 2. Replace the placeholder values with your actual Firebase credentials
// 3. Never commit firebase-config.js to GitHub

const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com"
};

// Initialize Firebase
let app, db, auth;

function initializeFirebase() {
  if (!firebase.apps.length) {
    app = firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    auth = firebase.auth();
    console.log('Firebase initialized successfully');
  }
  return { app, db, auth };
}

// Export for use in other modules
window.FirebaseConfig = {
  config: firebaseConfig,
  initialize: initializeFirebase
};
