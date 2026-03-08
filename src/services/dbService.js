import { collection, addDoc, query, onSnapshot, orderBy, serverTimestamp, doc, setDoc, getDoc } from "firebase/firestore";
import { db, firebaseConfig } from "../firebase";
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";

// Rooms logic
export const createRoom = async (name, creatorId, isPrivate = false, password = "") => {
    try {
        const docRef = await addDoc(collection(db, "rooms"), {
            name,
            creatorId,
            isPrivate,
            password,
            createdAt: serverTimestamp(),
            participants: [creatorId]
        });
        return docRef.id;
    } catch (e) {
        console.error("Error creating room: ", e);
        return null;
    }
};

export const subscribeToRooms = (callback) => {
    const q = query(collection(db, "rooms"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
        const rooms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(rooms);
    });
};

// Admin: Hoca tarafından onay ve hesap oluşturma
export const adminApproveAndCreateAccount = async (request) => {
    // İkincil bir Firebase app oluşturarak admin oturumunu koruyoruz
    const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
    const secondaryAuth = getAuth(secondaryApp);

    try {
        // 1. Firebase Auth hesabı oluştur (Formdaki mail ve şifre ile)
        const userCredential = await createUserWithEmailAndPassword(
            secondaryAuth,
            request.email,
            request.password
        );
        const newUser = userCredential.user;

        // 2. Firestore üzerinde kullanıcı dökümanını oluştur
        await setDoc(doc(db, "users", newUser.uid), {
            name: request.name,
            email: request.email,
            role: "student",
            createdAt: serverTimestamp(),
            fromRequest: request.id
        });

        // 3. Talebi "onaylandı" olarak işaretle
        await setDoc(doc(db, "access_requests", request.id), {
            status: "approved",
            approvedAt: serverTimestamp(),
            approvedUid: newUser.uid
        }, { merge: true });

        // İkincil auth oturumunu kapat ve app'i temizle
        await signOut(secondaryAuth);
        await secondaryApp.delete();

        return { success: true };
    } catch (e) {
        console.error("Onay ve kayıt hatası:", e);
        await secondaryApp.delete();
        throw e;
    }
};
