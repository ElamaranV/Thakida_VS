import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from 'firebase/firestore';
import { GoogleAuthProvider } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCNRUAYSWWl5YlhQHf2Bsez8mWvwFwQpp4",
  authDomain: "thakida-b957f.firebaseapp.com",
  databaseURL: "https://thakida-b957f-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "thakida-b957f",
  storageBucket: "thakida-b957f.firebasestorage.app",
  messagingSenderId: "219480594633",
  appId: "1:219480594633:web:030c3743ea41d63dbd1518",
  measurementId: "G-TG51D63L58"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

// Initialize other services
const googleProvider = new GoogleAuthProvider();
const firestore = getFirestore(app);

// // Modified Analytics initialization (React Native compatible)
// let analytics;
// if (typeof window !== 'undefined') {
//   const { getAnalytics, isSupported } = require("firebase/analytics");
//   isSupported().then((supported) => {
//     if (supported) analytics = getAnalytics(app);
//   });
// }

export { app, auth, firestore, googleProvider };