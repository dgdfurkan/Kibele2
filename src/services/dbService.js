import { collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp, doc, setDoc, getDoc, getDocs, increment, arrayUnion, writeBatch, limit } from "firebase/firestore";
import { db } from "../firebase";

// Activity Logging Helper
export const logRoomActivity = async (roomId, activityData) => {
    try {
        await addDoc(collection(db, "rooms", roomId, "activity"), {
            ...activityData,
            timestamp: serverTimestamp()
        });
    } catch (e) {
        console.error("Error logging room activity:", e);
    }
};

// Rooms logic
export const createRoom = async (name, creatorId, isPrivate = false, password = "", description = "", deadline = null, isActive = true, maxRevisions = 2) => {
    // Timeout Promise (10 saniye)
    const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("İstek zaman aşımına uğradı (Muhtemelen günlük kota doldu)")), 10000)
    );

    try {
        const roomPromise = addDoc(collection(db, "rooms"), {
            name,
            creatorId,
            creatorName: typeof description === 'string' ? "Bilinmeyen Kurucu" : (description.creatorName || "Bilinmeyen Kurucu"),
            isPrivate,
            password,
            description: typeof description === 'string' ? description : (description.text || ""),
            deadline: deadline,
            isActive: isActive,
            maxRevisions: maxRevisions,
            createdAt: serverTimestamp(),
            participants: [creatorId]
        });

        // Hangi söz (promise) önce dönerse: Ekleme mi yoksa Timeout mu?
        const docRef = await Promise.race([roomPromise, timeout]);

        // İlk oda kurulma logu
        await logRoomActivity(docRef.id, {
            type: 'system_creation',
            userId: creatorId,
            authorName: typeof description === 'string' ? "Kurucu" : (description.creatorName || "Kurucu"),
            detail: `Oda kuruldu.`
        });

        return docRef.id;
    } catch (e) {
        if (e.message?.includes("quota") || e.code === "resource-exhausted") {
            console.error("Kibele: Firestore Yazma Kotası Doldu! 🛑");
            throw new Error("Günlük kullanım limitine ulaşıldı. Lütfen yarın tekrar dene canım! ✨");
        }
        console.error("Error creating room: ", e);
        throw e;
    }
};

export const updateRoomSettings = async (roomId, data) => {
    try {
        const roomRef = doc(db, "rooms", roomId);
        await setDoc(roomRef, data, { merge: true });
        return { success: true };
    } catch (e) {
        console.error("Error updating room settings: ", e);
        throw e;
    }
};

export const removeParticipantFromRoom = async (roomId, userId, reason = "") => {
    try {
        const roomRef = doc(db, "rooms", roomId);
        const roomSnap = await getDoc(roomRef);
        if (roomSnap.exists()) {
            const data = roomSnap.data();
            const participants = data.participants || [];
            const updatedParticipants = participants.filter(id => id !== userId);

            await setDoc(roomRef, { participants: updatedParticipants }, { merge: true });

            // Süreç logu ekle
            await logRoomActivity(roomId, {
                type: 'system_leave',
                userId: userId,
                authorName: "Kullanıcı", // İsim bilgisi o an yoksa fallback
                detail: `Odadan ayrıldı/çıkarıldı.`
            });

            // Kullanıcıya bildirim gönder
            await sendNotification(userId, {
                type: "kicked_from_room",
                title: "Odadan Çıkarıldın 🔒",
                message: `'${data.name}' odasından çıkarıldın. Sebep: ${reason || 'Belirtilmedi'}`,
                roomId: roomId,
                isSystem: true
            });

            return { success: true };
        }
        return { success: false, error: "Room not found" };
    } catch (e) {
        console.error("Error removing participant: ", e);
        throw e;
    }
};

export const deleteRoom = async (roomId) => {
    try {
        const { deleteDoc } = await import("firebase/firestore");
        await deleteDoc(doc(db, "rooms", roomId));
        return { success: true };
    } catch (e) {
        console.error("Error deleting room: ", e);
        throw e;
    }
};

export const subscribeToRooms = (callback) => {
    const q = query(collection(db, "rooms"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
        const rooms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(rooms);
    }, (error) => {
        console.error("Error subscribing to rooms:", error);
        callback([]);
    });
};

// Participant Metadata (Privacy etc.)
export const setRoomParticipantPrivacy = async (roomId, userId, isPublic) => {
    try {
        const docId = `${roomId}_${userId}`;
        await setDoc(doc(db, "room_privacy", docId), {
            roomId,
            userId,
            isPublic,
            updatedAt: serverTimestamp()
        }, { merge: true });
        return true;
    } catch (e) {
        console.error("Error setting privacy:", e);
        throw e;
    }
};

export const getRoomParticipantPrivacy = async (roomId, userId) => {
    try {
        const docId = `${roomId}_${userId}`;
        const docSnap = await getDoc(doc(db, "room_privacy", docId));
        return docSnap.exists() ? docSnap.data().isPublic : false; // Default to private
    } catch (e) {
        console.error("Error getting privacy:", e);
        return false;
    }
};

export const subscribeToParticipantPrivacy = (roomId, userId, callback) => {
    const docId = `${roomId}_${userId}`;
    return onSnapshot(doc(db, "room_privacy", docId), (doc) => {
        if (doc.exists()) {
            callback(doc.data().isPublic);
        } else {
            callback(false);
        }
    });
};

export const fetchRoomPrivacySettings = async (roomId) => {
    try {
        const q = query(collection(db, "room_privacy"), where("roomId", "==", roomId));
        const querySnapshot = await getDocs(q);
        const settings = {};
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            settings[data.userId] = data.isPublic;
        });
        return settings;
    } catch (e) {
        console.error("Error fetching room privacy settings:", e);
        return {};
    }
};

// User Management
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

export const fetchAllAdmins = async () => {
    try {
        const q = query(collection(db, "users"), where("role", "==", "admin"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.error("Error fetching admins:", e);
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
            userName: user.name || user.displayName || "Kibele Kullanıcısı",
            reason,
            status: "pending",
            createdAt: serverTimestamp()
        });

        // Tüm adminleri bul ve Hepsine (veya Kurucuya) bildirim gönder
        const admins = await fetchAllAdmins();
        
        // Eğer odanın kurucusu admin değilse (artık kural gereği admin ama yine de emin olmak için ekliyoruz) 
        // veya kurucu bilgisini de listeye katmak istiyorsak Set kullanabiliriz.
        const targetUserIds = new Set(admins.map(admin => admin.id));
        targetUserIds.add(roomOwnerId); // Her ihtimale karşı kurucuyu da ekle

        const batchPromises = Array.from(targetUserIds).map(adminId => {
             return sendNotification(adminId, {
                type: "room_request",
                title: "Yeni Oda Katılım İsteği",
                message: `${user.name || user.displayName || 'Bir kullanıcı'}, '${roomName}' odasına katılmak istiyor.`,
                relatedId: requestRef.id,
                roomId: roomId
            });
        });

        await Promise.all(batchPromises);

        return { success: true };
    } catch (e) {
        console.error("Error requesting room access: ", e);
        throw e;
    }
};

export const subscribeToRoomRequests = (callback) => {
    const q = query(collection(db, "room_requests"), where("status", "==", "pending"));
    return onSnapshot(q, (snapshot) => {
        let requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Client-side sorting
        requests.sort((a, b) => {
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            return timeB - timeA;
        });

        callback(requests);
    }, (error) => {
        console.error("Error subscribing to room requests:", error);
        callback([]);
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

        // 4. Süreç logu ekle
        await logRoomActivity(request.roomId, {
            type: 'system_join',
            userId: request.uid,
            authorName: request.userName || "Yeni Katılımcı",
            detail: "Odaya katıldı."
        });

        return { success: true };
    } catch (e) {
        console.error("Error approving room request:", e);
        throw e;
    }
};

export const rejectRoomAccessRequest = async (requestOrId) => {
    try {
        let requestId = null;
        let requestData = null;

        if (typeof requestOrId === 'string') {
            requestId = requestOrId;
            const reqSnap = await getDoc(doc(db, "room_requests", requestId));
            if(reqSnap.exists()) {
               requestData = reqSnap.data();
            }
        } else {
            requestId = requestOrId.id;
            requestData = requestOrId;
        }

        const requestRef = doc(db, "room_requests", requestId);
        await setDoc(requestRef, { status: "rejected" }, { merge: true });
        
        // Kullanıcıya bildirim gönder
        if (requestData && requestData.uid) {
            await sendNotification(requestData.uid, {
                type: "request_rejected",
                title: "Oda İsteği Onaylanmadı 🚫",
                message: `'${requestData.roomName}' odasına yaptığın katılım isteği şu an için kabul edilmedi.`,
                roomId: requestData.roomId
            });
        }

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
        where("userId", "==", userId)
        // orderBy removed to avoid index requirement
    );
    return onSnapshot(q, (snapshot) => {
        let notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Client-side sorting
        notifications.sort((a, b) => {
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            return timeB - timeA;
        });

        callback(notifications);
    }, (error) => {
        console.error("Error subscribing to notifications:", error);
        callback([]);
    });
};

export const markNotificationAsRead = async (notificationId) => {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000));
    try {
        const updatePromise = setDoc(doc(db, "notifications", notificationId), {
            read: true
        }, { merge: true });
        await Promise.race([updatePromise, timeout]);
    } catch (e) {
        if (e.message !== "Timeout") {
            console.error("Error marking notification as read:", e);
        }
    }
};

export const clearAllNotifications = async (userId) => {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Kota sınırına ulaşıldı veya bağlantı zaman aşımına uğradı.")), 8000));
    try {
        const q = query(collection(db, "notifications"), where("userId", "==", userId));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) return { success: true };

        const batch = writeBatch(db);
        querySnapshot.forEach((doc) => {
            batch.delete(doc.ref);
        });

        const commitPromise = batch.commit();
        await Promise.race([commitPromise, timeout]);
        return { success: true };
    } catch (e) {
        if (e.code === 'resource-exhausted' || e.message?.includes('quota')) {
            throw new Error("Günlük bildirim temizleme kotası doldu. Lütfen yarın tekrar dene canım! ✨");
        }
        console.error("Error clearing notifications:", e);
        throw e;
    }
};
export const getUserRoomRequestStatus = async (roomId, userId) => {
    try {
        const q = query(
            collection(db, "room_requests"),
            where("roomId", "==", roomId),
            where("uid", "==", userId)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            // En son isteği döndür (normalde tek olmalı ama garanti olsun)
            const requests = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            requests.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            return requests[0];
        }
        return null;
    } catch (e) {
        console.error("Error fetching request status:", e);
        return null;
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
// Birden fazla kullanıcı profilini ID'lere göre getir
export const getUsersProfiles = async (uids) => {
    if (!uids || uids.length === 0) return [];

    try {
        const profiles = [];
        // Firestore 'in' sorgusu max 10 item alabilir. Eğer daha fazlaysa chunklara bölmek gerekir.
        // Şimdilik 10 katılımcı sınırı (MVP için) yeterli.
        const q = query(collection(db, "users"), where("__name__", "in", uids.slice(0, 10)));
        const querySnapshot = await getDocs(q);

        querySnapshot.forEach((doc) => {
            profiles.push({ id: doc.id, ...doc.data() });
        });

        return profiles;
    } catch (error) {
        console.error("Error fetching user profiles:", error);
        return [];
    }
};

// Tek bir kullanıcı profilini getir
export const getUserProfile = async (uid) => {
    if (!uid) return null;
    try {
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            return { id: userSnap.id, ...userSnap.data() };
        }
        return null;
    } catch (error) {
        console.error("Error fetching user profile:", error);
        return null;
    }
};
// --- Room Items (Images, Notes, etc.) ---
export const addRoomItem = async (roomId, userId, itemData) => {
    try {
        const itemRef = await addDoc(collection(db, "room_items"), {
            roomId,
            userId,
            authorName: itemData.authorName || "Kullanıcı",
            type: itemData.type, // 'image', 'note', 'link'
            content: itemData.content, // url or text
            title: itemData.title || "",
            boardType: itemData.boardType || "personal", // 'personal' or 'shared'
            createdAt: serverTimestamp()
        });

        // Eğer final teslimatı ise süreç loguna ekle
        if (itemData.boardType === 'final') {
            await logRoomActivity(roomId, {
                type: 'system_final_delivery',
                userId,
                authorName: itemData.authorName || "Kullanıcı",
                detail: itemData.title || "Proje teslimatı yapıldı.",
                content: itemData.content // Linki loga ekliyoruz ki süreçten tııklanabilsin
            });
        }

        return itemRef.id;
    } catch (e) {
        console.error("Error adding room item: ", e);
        throw e;
    }
};

export const deleteRoomItem = async (itemId) => {
    try {
        const { deleteDoc } = await import("firebase/firestore");
        await deleteDoc(doc(db, "room_items", itemId));
        return { success: true };
    } catch (e) {
        console.error("Error deleting room item: ", e);
        throw e;
    }
};

export const subscribeToRoomItems = (roomId, boardType, userId, callback) => {
    let q;
    if (boardType === 'shared') {
        q = query(
            collection(db, "room_items"),
            where("roomId", "==", roomId),
            where("boardType", "==", "shared")
            // orderBy removed to avoid composite index requirement
        );
    } else {
        q = query(
            collection(db, "room_items"),
            where("roomId", "==", roomId),
            where("userId", "==", userId),
            where("boardType", "==", boardType)
            // orderBy removed to avoid composite index requirement
        );
    }

    return onSnapshot(q, (snapshot) => {
        let items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Client-side sorting as a fallback for missing indexes
        // We sort by createdAt (serverTimestamp) descendently
        items.sort((a, b) => {
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            return timeB - timeA;
        });

        callback(items);
    }, (error) => {
        console.error("Error subscribing to room items:", error);
        callback([]);
    });
};

// Doğrudan odaya katıl (Açık odalar için)
export const joinRoom = async (roomId, userId) => {
    try {
        const roomRef = doc(db, "rooms", roomId);
        await setDoc(roomRef, {
            participants: arrayUnion(userId)
        }, { merge: true });

        // Süreç logu ekle
        await logRoomActivity(roomId, {
            type: 'system_join',
            userId: userId,
            authorName: "Bir katılımcı",
            detail: "Odaya katıldı."
        });

        return { success: true };
    } catch (e) {
        console.error("Error joining room: ", e);
        throw e;
    }
};

export const notifyParticipantsOfCanvasUpdate = async (roomId, currentUserId, currentUserName, roomName) => {
    try {
        const { getDoc } = await import("firebase/firestore");
        const roomRef = doc(db, "rooms", roomId);
        const roomSnap = await getDoc(roomRef);
        if (roomSnap.exists()) {
            const data = roomSnap.data();
            const participants = data.participants || [];
            const creatorId = data.creatorId;

            // Tüm katılımcılar + kurucu (kendisi hariç)
            const targets = [...new Set([...participants, creatorId])].filter(id => id !== currentUserId);

            const batch = targets.map(targetId => sendNotification(targetId, {
                type: "canvas_update",
                title: "Moodboard Güncellendi! 🎨",
                message: `${currentUserName}, '${roomName}' odasındaki ortak panoda yeni ilhamlar oluşturdu. bi' bak istersen canım! ✨`,
                roomId: roomId,
                isSystem: true
            }));

            await Promise.all(batch);
        }
    } catch (e) {
        console.error("Error notifying participants: ", e);
    }
};

// --- Kibele AI Chat History ---
export const saveKibeleChatMessage = async (userId, roomId, role, text) => {
    try {
        const targetRoomId = roomId || "global";
        const messagesRef = collection(db, `users/${userId}/kibele_chats/${targetRoomId}/messages`);
        
        await addDoc(messagesRef, {
            role,      // 'user' or 'ai'
            text,
            createdAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Error saving Kibele chat: ", error);
    }
};

export const subscribeToKibeleChat = (userId, roomId, callback) => {
    if (!userId) return () => {};

    const targetRoomId = roomId || "global";
    const messagesRef = collection(db, `users/${userId}/kibele_chats/${targetRoomId}/messages`);
    const qSub = query(messagesRef, orderBy("createdAt", "asc"));
    
    return onSnapshot(qSub, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(messages);
    }, (error) => {
        console.error("Error subscribing to Kibele chat:", error);
    });
};

// --- CURATION SYSTEM ---

/**
 * Saves an artwork to the room's curation collection.
 * @param {string} roomId 
 * @param {object} artwork 
 * @param {object} user 
 */
export const curateRoomArtwork = async (roomId, artwork, user) => {
    if (!roomId || !artwork || !user) throw new Error("Missing parameters for curation");

    const curationRef = collection(db, "rooms", roomId, "curations");
    const docData = {
        ...artwork,
        curatedBy: user.uid,
        curatedByName: user.name || user.displayName || 'Sanatçı',
        curatedAt: serverTimestamp()
    };

    const docId = `art_${artwork.id || Date.now()}`;
    await setDoc(doc(curationRef, docId), docData);

    // Log the activity
    await logRoomActivity(roomId, {
        type: 'system_curation',
        message: `${user.name || user.displayName || 'Birisi'} yeni bir eseri kürasyona ekledi: ${artwork.title}`,
        userName: user.name || user.displayName || 'Sanatçı',
        userId: user.uid,
        authorName: user.name || user.displayName || 'Sanatçı',
        details: {
            artworkTitle: artwork.title,
            artworkId: artwork.id
        }
    });

    return docId;
};

/**
 * Subscribes to the room's curation collection.
 * @param {string} roomId 
 * @param {function} callback 
 */
export const subscribeToCurations = (roomId, callback) => {
    const curationRef = collection(db, "rooms", roomId, "curations");
    const q = query(curationRef, orderBy("curatedAt", "desc"));

    return onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(items);
    }, (error) => {
        console.error("Curations subscription error:", error);
        callback([]);
    });
};

