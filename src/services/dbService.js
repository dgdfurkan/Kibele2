import { collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp, doc, setDoc, getDoc, getDocs, increment } from "firebase/firestore";
import { db, firebaseConfig } from "../firebase";
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";

// Rooms logic
export const createRoom = async (name, creatorId, isPrivate = false, password = "", description = "") => {
    try {
        const docRef = await addDoc(collection(db, "rooms"), {
            name,
            creatorId,
            isPrivate,
            password,
            description,
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
export const fetchAllApprovedRequests = async () => {
    try {
        const q = query(collection(db, "room_requests"), where("status", "==", "approved"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.error("Error fetching approved requests:", e);
        return [];
    }
};

export const requestRoomAccess = async (roomId, roomName, user, roomOwnerId, reason = "") => {
    try {
        const requestRef = await addDoc(collection(db, "room_requests"), {
            roomId,
            roomName,
            roomOwnerId,
            uid: user.uid,
            userName: user.displayName || user.email,
            userEmail: user.email,
            reason,
            status: "pending",
            createdAt: serverTimestamp()
        });

        // Oda sahibine bildirim gönder
        await sendNotification(roomOwnerId, {
            type: "room_request",
            title: "Yeni Oda Katılım İsteği",
            message: `${user.displayName || user.email}, '${roomName}' odasına katılmak istiyor.`,
            relatedId: requestRef.id,
            roomId: roomId
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

        // 3. Kullanıcıya bildirim gönder
        await sendNotification(request.uid, {
            type: "request_approved",
            title: "Oda İsteğin Onaylandı! ✨",
            message: `'${request.roomName}' odasına giriş iznin verildi. Hadi içeri gir!`,
            roomId: request.roomId
        });

        return { success: true };
    } catch (e) {
        console.error("Error approving room request:", e);
        throw e;
    }
};

export const rejectRoomAccessRequest = async (request) => {
    try {
        await setDoc(doc(db, "room_requests", request.id), {
            status: "rejected",
            rejectedAt: serverTimestamp()
        }, { merge: true });

        // Kullanıcıya bildirim gönder
        await sendNotification(request.uid, {
            type: "request_rejected",
            title: "Oda İsteği Reddedildi",
            message: `'${request.roomName}' odasına katılım isteğin ne yazık ki onaylanmadı.`,
            roomId: request.roomId
        });

        return { success: true };
    } catch (e) {
        console.error("Error rejecting room request:", e);
        throw e;
    }
};

// --- Notifications System ---
export const sendNotification = async (userId, data) => {
    try {
        await addDoc(collection(db, "notifications"), {
            userId,
            ...data,
            read: false,
            createdAt: serverTimestamp()
        });
    } catch (e) {
        console.error("Error sending notification:", e);
    }
};

export const subscribeToNotifications = (userId, callback) => {
    const q = query(
        collection(db, "notifications"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
    );
    return onSnapshot(q, (snapshot) => {
        const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(notifications);
    });
};

export const markNotificationAsRead = async (notificationId) => {
    try {
        await setDoc(doc(db, "notifications", notificationId), {
            read: true
        }, { merge: true });
    } catch (e) {
        console.error("Error marking notification as read:", e);
    }
};
export const getRequestById = async (requestId) => {
    try {
        const docRef = doc(db, "room_requests", requestId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        }
        return null;
    } catch (e) {
        console.error("Error fetching request by ID:", e);
        return null;
    }
};
