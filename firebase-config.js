// Firebase Configuration for Store Planner Pro
const firebaseConfig = {
  apiKey: "AIzaSyBZ6qLt8KVgV877K6IBy0pwZ5a9y1FqGLY",
  authDomain: "storeplannerpro.firebaseapp.com",
  projectId: "storeplannerpro",
  storageBucket: "storeplannerpro.firebasestorage.app",
  messagingSenderId: "339443807903",
  appId: "1:339443807903:web:f24e76cc784f7177b494aa",
  measurementId: "G-KJQBWV6LBD",
  databaseURL: "https://storeplannerpro-default-rtdb.firebaseio.com"
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
