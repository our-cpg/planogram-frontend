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

// Initialize Firebase immediately
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
  console.log('Firebase initialized successfully');
} else {
  console.log('Firebase already initialized');
}
