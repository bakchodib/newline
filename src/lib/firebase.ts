
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const auth = getAuth(app);
const db = getFirestore(app);

// Initialize Analytics only if it's supported
const analytics = isSupported().then(yes => yes ? getAnalytics(app) : null);


export { app, auth, db, analytics };
