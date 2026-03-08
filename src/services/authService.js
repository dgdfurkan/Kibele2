import { collection, query, where, getDocs, setDoc, doc, serverTimestamp, increment } from "firebase/firestore";
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
        const userDoc = await getDocs(query(collection(db, "users"), where("__name__", "==", user.uid)));

        const baseData = {
            lastLogin: serverTimestamp(),
            loginCount: increment(1),
            isOnline: true,
            email: user.email,
            uid: user.uid
        };

        if (userDoc.empty) {
            // Döküman yoksa oluştur (varsayılan öğrenci rolü ile)
            await setDoc(userRef, {
                ...baseData,
                name: user.displayName || email.split('@')[0],
                role: "student",
                createdAt: serverTimestamp()
            });
        } else {
            // Döküman varsa sadece metrikleri güncelle (rolü koru)
            await setDoc(userRef, baseData, { merge: true });
        }

        return user;
    } catch (error) {
        console.error("Login Error:", error);
        throw error;
    }
};

// Online durumunu güncelle
export const updateOnlineStatus = async (uid, isOnline) => {
    try {
        const userRef = doc(db, "users", uid);
        await setDoc(userRef, {
            isOnline,
            lastLogin: serverTimestamp() // Son aktiflik olarak güncelle
        }, { merge: true });
    } catch (error) {
        console.error("Update Online Status Error:", error);
    }
};

// Kayıt/Başvuru sırasında username kontrolü
export const isUsernameTaken = async (username) => {
    const q = query(collection(db, "users"), where("username", "==", username));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
};
