import { collection, query, where, getDocs, setDoc, doc, serverTimestamp } from "firebase/firestore";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from '../firebase';

// Kayıt olma (Email + Şifre)
export const registerWithEmail = async (email, password, name) => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Firestore'da kullanıcı dökümanını oluştur
        await setDoc(doc(db, "users", user.uid), {
            name,
            email,
            role: "student",
            createdAt: serverTimestamp()
        });

        return user;
    } catch (error) {
        console.error("Registration Error:", error);
        throw error;
    }
};

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
