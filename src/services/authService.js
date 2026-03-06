import { collection, query, where, getDocs, setDoc, doc, serverTimestamp } from "firebase/firestore";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from '../firebase';

// Email tabanlı login
export const loginWithEmail = async (email, password) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        console.error("Login Error:", error);
        throw error;
    }
};

// Kayıt/Başvuru sırasında username kontrolü
export const isUsernameTaken = async (username) => {
    const q = query(collection(db, "users"), where("username", "==", username));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
};
