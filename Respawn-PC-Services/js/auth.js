// ============================================================
// RESPawn PC Services
// AUTHENTICATION
// Shows the actual stage/error instead of labeling every failure
// as an incorrect email or password.
// ============================================================

import {
    setPersistence,
    browserLocalPersistence,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
    doc,
    getDoc,
    setDoc
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

import {
    auth,
    db
} from "./firebase.js";

import {
    setButtonLoading
} from "./ui.js";


// ============================================================
// PERSISTENCE
// ============================================================

const persistenceReady = setPersistence(
    auth,
    browserLocalPersistence
).catch((error) => {
    console.error("Firebase persistence error:", error);
    return null;
});


// ============================================================
// PAGE / AUTH STATE
// ============================================================

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

let authActionInProgress = false;
let initialAuthCheckPending = true;


function getMessageElement() {
    return document.getElementById(
        loginForm ? "loginMessage" : "registerMessage"
    );
}


function showFormMessage(message, isError = true) {
    const element = getMessageElement();

    if (!element) {
        return;
    }

    element.textContent = message;
    element.className = isError
        ? "form-message error"
        : "form-message success";
}


// ============================================================
// FIREBASE AUTH ERROR MESSAGES
// ============================================================

function explainAuthError(error) {
    const code = error?.code || "";

    switch (code) {
        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":
        case "auth/invalid-login-credentials":
            return "Firebase rejected these credentials. Check the exact email and password, and confirm this account exists in Authentication > Users in the respawn-a7bb6 project.";

        case "auth/invalid-email":
            return "The email address format is invalid.";

        case "auth/user-disabled":
            return "This Firebase account is disabled. Enable it in Firebase Console > Authentication > Users.";

        case "auth/too-many-requests":
            return "Firebase temporarily blocked sign-in attempts. Wait a few minutes, then try again.";

        case "auth/network-request-failed":
            return "Firebase could not reach the authentication service. Check your internet connection or browser extensions.";

        case "auth/invalid-api-key":
            return "Firebase rejected the API key. Verify js/firebase.js against the Web App configuration in Firebase Console.";

        case "auth/operation-not-allowed":
            return "Email/password sign-in is disabled. Enable it under Firebase Console > Authentication > Sign-in method.";

        case "auth/unauthorized-domain":
            return "This website domain is not authorized for Firebase Authentication. Add respawn-a7bb6.web.app under Authentication > Settings > Authorized domains.";

        case "auth/weak-password":
            return "The password must contain at least 6 characters.";

        case "auth/email-already-in-use":
            return "This email already has a Firebase Authentication account. Sign in instead of registering again.";

        default:
            return `Firebase error: ${code || error?.message || "Unknown error"}. Open the browser console for details.`;
    }
}


// ============================================================
// GET PROFILE AND REDIRECT
// ============================================================

async function getDestinationForUser(user) {
    let profileSnapshot;

    try {
        profileSnapshot = await getDoc(
            doc(db, "users", user.uid)
        );
    } catch (error) {
        error.authStage = "profile";
        throw error;
    }

    if (!profileSnapshot.exists()) {
        const error = new Error("PROFILE_MISSING");
        error.code = "app/profile-missing";
        error.authStage = "profile";
        throw error;
    }

    const profile = profileSnapshot.data();

    return profile.role === "admin"
        ? "/admin-dashboard.html"
        : "/dashboard.html";
}


function explainProfileError(error, user) {
    if (error?.code === "app/profile-missing") {
        return `Firebase accepted the login for ${user?.email || "this account"}, but its Firestore profile is missing. In Firestore, create users/${user.uid} with fields uid, email, fullName, and role (customer or admin).`;
    }

    if (error?.code === "permission-denied") {
        return `Firebase accepted the login, but Firestore denied access to users/${user.uid}. Check that the Firestore rules are published and that the document ID exactly matches this account's UID.`;
    }

    if (error?.code === "unavailable") {
        return "Firebase accepted the login, but Firestore is temporarily unavailable. Check the connection and try again.";
    }

    return `Firebase accepted the login, but loading the user profile failed (${error?.code || error?.message || "unknown error"}). Check Firestore rules and the users/{UID} document.`;
}


async function redirectByRole(user) {
    const destination = await getDestinationForUser(user);
    window.location.replace(destination);
}


// ============================================================
// LOGIN
// ============================================================

if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const button = document.getElementById("loginButton");
        const message = document.getElementById("loginMessage");
        const email = document.getElementById("loginEmail").value.trim();
        const password = document.getElementById("loginPassword").value;

        message.textContent = "";
        message.className = "form-message";
        authActionInProgress = true;

        let stage = "authentication";
        let signedInUser = null;

        setButtonLoading(
            button,
            true,
            "Logging in...",
            "Login"
        );

        try {
            await persistenceReady;

            const credential = await signInWithEmailAndPassword(
                auth,
                email,
                password
            );

            signedInUser = credential.user;
            stage = "profile";

            const destination = await getDestinationForUser(
                credential.user
            );

            window.location.replace(destination);

        } catch (error) {
            console.error("Login failed at stage:", stage, error);

            if (stage === "authentication") {
                showFormMessage(explainAuthError(error));
            } else {
                showFormMessage(explainProfileError(error, signedInUser));
            }

        } finally {
            authActionInProgress = false;

            setButtonLoading(
                button,
                false,
                "Logging in...",
                "Login"
            );
        }
    });
}


// ============================================================
// REGISTER
// ============================================================

if (registerForm) {
    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const button = document.getElementById("registerButton");
        const message = document.getElementById("registerMessage");
        const name = document.getElementById("registerName").value.trim();
        const email = document.getElementById("registerEmail").value.trim();
        const password = document.getElementById("registerPassword").value;

        message.textContent = "";
        message.className = "form-message";
        authActionInProgress = true;

        let stage = "authentication";

        setButtonLoading(
            button,
            true,
            "Creating account...",
            "Create Account"
        );

        try {
            if (name.length < 2) {
                throw new Error("NAME_TOO_SHORT");
            }

            await persistenceReady;

            const credential = await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );

            const user = credential.user;
            stage = "profile";

            await setDoc(
                doc(db, "users", user.uid),
                {
                    uid: user.uid,
                    fullName: name,
                    email,
                    role: "customer"
                }
            );

            window.location.replace("/dashboard.html");

        } catch (error) {
            console.error("Registration failed at stage:", stage, error);

            if (error.message === "NAME_TOO_SHORT") {
                showFormMessage("Please enter your full name.");

            } else if (stage === "profile") {
                showFormMessage(
                    `The Firebase Authentication account was created, but its Firestore profile could not be saved (${error.code || error.message}). Check Firestore rules. Do not register the same email again.`
                );

            } else {
                showFormMessage(explainAuthError(error));
            }

        } finally {
            authActionInProgress = false;

            setButtonLoading(
                button,
                false,
                "Creating account...",
                "Create Account"
            );
        }
    });
}


// ============================================================
// AUTO-REDIRECT FOR ALREADY SIGNED-IN USERS
// Only handle the initial persisted session. Login and registration
// submissions perform their own redirect to avoid racing each other.
// ============================================================

onAuthStateChanged(auth, async (user) => {
    if (!initialAuthCheckPending) {
        return;
    }

    initialAuthCheckPending = false;

    if (!user || authActionInProgress) {
        return;
    }

    try {
        await redirectByRole(user);
    } catch (error) {
        console.error("Initial session profile check failed:", error);

        if (loginForm) {
            showFormMessage(explainProfileError(error, user));
        } else if (registerForm) {
            showFormMessage(explainProfileError(error, user));
        }
    }
});
