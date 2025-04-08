// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const auth = getAuth(app);
const analytics = getAnalytics(app);
const googleProvider = new GoogleAuthProvider();

export {app, auth, googleProvider};