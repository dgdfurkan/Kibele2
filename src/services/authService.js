import { collection, query, where, getDocs, getDoc, setDoc, doc, serverTimestamp, increment } from "firebase/firestore";
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
            email: user.email,
            uid: user.uid
        };

        if (!userSnap.exists()) {
            // Döküman yoksa oluştur (Sıfırdan tam döküman)
            console.log("[AuthService] No profile found, creating new one for:", user.uid);
            await setDoc(userRef, {
                ...baseData,
                name: user.displayName || email.split('@')[0],
                role: "student",
                createdAt: serverTimestamp()
            });
        } else {
            // Döküman varsa sadece metrikleri güncelle (Merge role alanını korur)
            console.log("[AuthService] Existing profile found, merging metrics for:", user.uid);
            await setDoc(userRef, baseData, { merge: true });
        }

        return user;
    } catch (error) {
        console.error("Login Error:", error);
        throw error;
    }
};

// Online durumunu güncelle (Heartbeat)
export const updateOnlineStatus = async (uid, isOnline) => {
    try {
        const userRef = doc(db, "users", uid);
        await setDoc(userRef, {
            isOnline,
            lastActive: serverTimestamp() // Sadece son aktiflik, son giriş DEĞİL
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
