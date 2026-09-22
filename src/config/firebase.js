import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Firebase Console එකෙන් ලැබුණු Config Keys ටික මෙතැනට Paste කරන්න
const firebaseConfig = {
  apiKey: "AIzaSyAMovbM2A-TKlGdMmInEzcwqAg7L9iq8QI",
  authDomain: "smartcare-ae6a4.firebaseapp.com",
  projectId: "smartcare-ae6a4",
  storageBucket: "smartcare-ae6a4.firebasestorage.app",
  messagingSenderId: "672594393868",
  appId: "1:672594393868:web:cdb919914daab7cb77a729",
  measurementId: "G-NXR8BC8RSM"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// React Native Persistence සඳහා ආරක්ෂිතව Auth Initialize කිරීම
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e) {
  // දැනටමත් Auth instance එකක් පවතී නම් එය ලබා ගැනීම
  auth = getAuth(app);
}

const db = getFirestore(app);

export { auth, db };