import { collection, query, where, getDocs, getDoc, setDoc, updateDoc, doc, serverTimestamp, increment } from "firebase/firestore";
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
        const user = userCredential.user;

        // Firestore'da kullanıcı dökümanını kontrol et ve güncelle/oluştur
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        const baseData = {
            lastLogin: serverTimestamp(),
            lastActive: serverTimestamp(),
            loginCount: increment(1),
            isOnline: true,
            email: user.email
            // Redundant UID removed based on user feedback
        };

        if (!userSnap.exists()) {
            await setDoc(userRef, {
                ...baseData,
                name: user.displayName || email.split('@')[0],
                role: "student",
                createdAt: serverTimestamp()
            });
        } else {
            await setDoc(userRef, baseData, { merge: true });
        }

        return user;
    } catch (error) {
        console.error("Login Error:", error);
        throw error;
    }
};

// Online durumunu güncelle (Heartbeat)
// updateDoc kullanıyoruz ki eğer döküman yoksa (hata varsa) yeni/boş döküman YARATMASIN.
export const updateOnlineStatus = async (uid, isOnline) => {
    try {
        const userRef = doc(db, "users", uid);
        await updateDoc(userRef, {
            isOnline,
            lastActive: serverTimestamp()
        });
    } catch (error) {
        // Dokuman yoksa updateDoc hata verir, bu sayede "golge dokuman" olusmaz
        console.warn("[AuthService] Online status update skipped: Document may not exist yet.");
    }
};

// Kayıt/Başvuru sırasında username kontrolü
export const isUsernameTaken = async (username) => {
    const q = query(collection(db, "users"), where("username", "==", username));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
};
