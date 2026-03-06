import { collection, addDoc, query, onSnapshot, orderBy, serverTimestamp, doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

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

// Admin stuff: teacher approving access
export const approveAccessRequest = async (requestId, userId, classAssignment = "Genel") => {
    try {
        await setDoc(doc(db, "users", userId), {
            role: "student",
            class: classAssignment,
            approvedAt: serverTimestamp()
        }, { merge: true });

        await setDoc(doc(db, "access_requests", requestId), {
            status: "approved",
            approvedAt: serverTimestamp()
        }, { merge: true });

        return true;
    } catch (e) {
        console.error("Approval error:", e);
        return false;
    }
};
