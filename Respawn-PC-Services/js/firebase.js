// ============================================================
// RESPawn PC Services
// SHARED FIREBASE CONFIGURATION
// ============================================================

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

import {
    getAuth
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
    getFirestore
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";


// ============================================================
// FIREBASE CONFIG
// ============================================================

const firebaseConfig = {
    apiKey: "AIzaSyDSOvQm64Hee-UeLGtNEaiIJaYIOA1oFQo",
    authDomain: "respawn-a7bb6.firebaseapp.com",
    projectId: "respawn-a7bb6",
    storageBucket: "respawn-a7bb6.firebasestorage.app",
    messagingSenderId: "163458571734",
    appId: "1:163458571734:web:e7048d2fe73e5324ca5877"
};


// ============================================================
// INITIALIZE FIREBASE
// ============================================================

export const app = initializeApp(firebaseConfig);


// ============================================================
// AUTH
// ============================================================

export const auth = getAuth(app);


// ============================================================
// FIRESTORE
// ============================================================

export const db = getFirestore(app);