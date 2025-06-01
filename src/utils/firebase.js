// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {getStorage} from 'firebase/storage';
import {getFirestore} from 'firebase/firestore';
import {getAuth} from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCjvIYdr8j9io07lfYVSox_VinCWmIsNM4",
  authDomain: "outfitgenerator-d60a5.firebaseapp.com",
  projectId: "outfitgenerator-d60a5",
  storageBucket: "outfitgenerator-d60a5.firebasestorage.app",
  messagingSenderId: "569963546935",
  appId: "1:569963546935:web:7542758aa95a59c6bbb2b2",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db =getFirestore(app);
export const store = getStorage(app);
export const auth = getAuth(app);