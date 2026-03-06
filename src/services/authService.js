import { collection, query, where, getDocs, setDoc, doc, serverTimestamp } from "firebase/firestore";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from '../firebase';

// Username tabanlı login yardımı
export const loginWithUsername = async (username, password) => {
    try {
        // 1. Username -> Email eşleşmesini bul
        const q = query(collection(db, "users"), where("username", "==", username));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            throw new Error("Kullanıcı kaydı bulunamadı. Lütfen kullanıcı adınızı kontrol edin veya erken erişim onay sürecini bekleyin.");
        }

        const userData = querySnapshot.docs[0].data();
        const email = userData.email;

        // 2. Firebase Auth ile giriş yap
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
