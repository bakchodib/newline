// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCL77cBUaywr84qDscxCyy0PM_gRnxp7p0",
  authDomain: "jlsfinalhai.firebaseapp.com",
  projectId: "jlsfinalhai",
  storageBucket: "jlsfinalhai.appspot.com",
  messagingSenderId: "90437797359",
  appId: "1:90437797359:web:ee86797f9863e64a7ea21a",
  measurementId: "G-ZSV85HDRT1"
};


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);


export { db, auth, app };
