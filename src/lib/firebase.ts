import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCOGy4ejvlXEhwU2ShOjtgfATmMoPVC9x0",
    authDomain: "studio-1386887967-ba1d0.firebaseapp.com",
    projectId: "studio-1386887967-ba1d0",
    storageBucket: "studio-1386887967-ba1d0.firebasestorage.app",
    messagingSenderId: "206071179813",
    appId: "1:206071179813:web:589ede05114345e5036dcc"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
