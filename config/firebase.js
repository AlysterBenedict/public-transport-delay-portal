import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDK9Xrh9grhtH9hcDQNtg8AzEn3CQJM2F0",
  authDomain: "transitdelay-22f53.firebaseapp.com",
  projectId: "transitdelay-22f53",
  storageBucket: "transitdelay-22f53.firebasestorage.app",
  messagingSenderId: "1015474806560",
  appId: "1:1015474806560:web:595617285cbe948719c145",
  measurementId: "G-6TCVW5VWMT"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };