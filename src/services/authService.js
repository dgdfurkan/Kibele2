import { collection, query, where, getDocs, setDoc, doc, serverTimestamp } from "firebase/firestore";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from '../firebase';

// Email tabanlı login
export const loginWithEmail = async (email, password) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        // Kullanıcı bulunamadıysa başvuruları kontrol et
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
            const q = query(collection(db, "access_requests"), where("email", "==", email), where("status", "==", "pending"));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                throw new Error("Erişim talebiniz alındı ve şu an Kibele Hoca tarafından inceleniyor. Onaylandığında giriş yapabileceksiniz.");
            }

            throw new Error("Kullanıcı kaydı bulunamadı. Erken erişim talebinde bulunduysanız lütfen onay sürecini bekleyin.");
        }

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
