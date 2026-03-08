import { collection, addDoc, query, onSnapshot, orderBy, serverTimestamp, doc, setDoc, getDoc, getDocs, increment } from "firebase/firestore";
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

// Student Management
export const fetchAllStudents = async () => {
    try {
        const q = query(collection(db, "users"), where("role", "==", "student"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.error("Error fetching students:", e);
        return [];
    }
};

// Room Access Requests
export const requestRoomAccess = async (roomId, roomName, user) => {
    try {
        await addDoc(collection(db, "room_requests"), {
            roomId,
            roomName,
            uid: user.uid,
            userName: user.displayName || user.email,
            userEmail: user.email,
            status: "pending",
            createdAt: serverTimestamp()
        });
        return { success: true };
    } catch (e) {
        console.error("Error requesting room access: ", e);
        throw e;
    }
};

export const subscribeToRoomRequests = (callback) => {
    const q = query(collection(db, "room_requests"), where("status", "==", "pending"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
        const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(requests);
    });
};

export const approveRoomAccessRequest = async (request) => {
    try {
        // 1. Oda dökümanını güncelle (participants listesine ekle)
        const roomRef = doc(db, "rooms", request.roomId);
        const roomSnap = await getDoc(roomRef);

        if (roomSnap.exists()) {
            const roomData = roomSnap.data();
            const currentParticipants = roomData.participants || [];

            if (!currentParticipants.includes(request.uid)) {
                try {
                    await setDoc(roomRef, {
                        participants: [...currentParticipants, request.uid]
                    }, { merge: true });
                } catch (updateError) {
                    console.error("Room participants update failed:", updateError);
                    // Continue to approve request anyway, or throw? Let's throw to be safe
                    throw updateError;
                }
            }
        }

        // 2. İsteği onaylandı olarak işaretle
        await setDoc(doc(db, "room_requests", request.id), {
            status: "approved",
            approvedAt: serverTimestamp()
        }, { merge: true });

        return { success: true };
    } catch (e) {
        console.error("Error approving room request:", e);
        throw e;
    }
};

export const rejectRoomAccessRequest = async (requestId) => {
    try {
        await setDoc(doc(db, "room_requests", requestId), {
            status: "rejected",
            rejectedAt: serverTimestamp()
        }, { merge: true });
        return { success: true };
    } catch (e) {
        console.error("Error rejecting room request:", e);
        throw e;
    }
};
