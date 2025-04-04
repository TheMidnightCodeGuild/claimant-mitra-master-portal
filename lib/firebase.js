// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // Added Firestore import

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC4xW-t2Ft5TpA_pnCXvXhse-LkVGKWYeU",
  authDomain: "claimantmitra-cd5cc.firebaseapp.com",
  projectId: "claimantmitra-cd5cc",
  storageBucket: "claimantmitra-cd5cc.appspot.com",
  messagingSenderId: "616984723944",
  appId: "1:616984723944:web:958fcccee816c14db3245d",
  measurementId: "G-T6XYXCEQZE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app); // Initialize Firestore

export { auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, db }; // Export Firestore