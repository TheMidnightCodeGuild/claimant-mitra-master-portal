// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCLqq6kKv6rTKj6FVnyD0ihbF1nlKGUP98",
  authDomain: "claimantmitra-f5be0.firebaseapp.com", 
  projectId: "claimantmitra-f5be0",
  storageBucket: "claimantmitra-f5be0.firebasestorage.app",
  messagingSenderId: "764422627319",
  appId: "1:764422627319:web:b2aadb557f24ce938358f2",
  measurementId: "G-BEXEY5MNMH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { 
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  db,
  storage
};