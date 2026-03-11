import React, { useEffect, useState, useCallback } from 'react';
import { Tldraw, createTLStore, defaultShapeUtils } from 'tldraw';
import 'tldraw/tldraw.css';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { sendNotification, notifyParticipantsOfCanvasUpdate } from '../services/dbService';

const CanvasBoard = ({ roomId, isReadOnly = false, roomName }) => {
    const { user } = useAuth();
    const [store] = useState(() => createTLStore({ shapeUtils: defaultShapeUtils }));
    const [isLoaded, setIsLoaded] = useState(false);
    const activityTimeoutRef = React.useRef(null);
    const pendingUpdatesRef = React.useRef(new Map());

    // Debug: tldraw lisans anahtarı kontrolü
    useEffect(() => {
        const key = import.meta.env.VITE_TLDRAW_LICENSE_KEY;
        if (!key) {
            console.warn("⚠️ Kibele Uyarı: tldraw lisans anahtarı VITE_TLDRAW_LICENSE_KEY üzerinden okunamadı.");
        } else {
            console.log("✅ Kibele Bilgi: tldraw lisans anahtarı başarıyla algılandı.");
        }
    }, []);

    // Senkronizasyon durumu takibi
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        if (!roomId || !store) return;

        console.log(`Subscribing to shapes for room: ${roomId}`);
        const shapesCol = collection(db, 'rooms', roomId, 'shapes');

        // 1. Firestore'dan Store'a Senkronizasyon (Gelen Değişiklikler)
        const unsubscribe = onSnapshot(shapesCol, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                const data = change.doc.data();
                const id = change.doc.id;

                if (change.type === 'removed') {
                    store.remove([id]);
                } else {
                    // Yerel değişikliği tetiklememek için "remote" işareti ile ekle
                    store.put([data.shape]);
                }
            });
            if (!isLoaded) setIsLoaded(true);
        });

        // 2. Store'dan Firestore'a Senkronizasyon (Giden Değişiklikler)
        const cleanup = store.listen((entry) => {
            if (isReadOnly) return;

            const updates = entry.changes.updated;
            const additions = entry.changes.added;
            const removals = entry.changes.removed;

            // --- EKLEMELER ---
            Object.values(additions).forEach(async (record) => {
                if (record.typeName === 'shape') {
                    await setDoc(doc(db, 'rooms', roomId, 'shapes', record.id), {
                        shape: record,
                        updatedBy: user.uid,
                        updatedByName: user.displayName || user.email,
                        updatedAt: new Date(),
                        actionType: 'create'
                    }, { merge: true });

                    logActivity('shape_add', `${record.type === 'image' ? 'bir görsel referans' : 'yeni bir şekil'} ekledi.`);
                }
            });

            // --- GÜNCELLEMELER (Throttled) ---
            Object.values(updates).forEach(([, record]) => {
                if (record.typeName === 'shape') {
                    pendingUpdatesRef.current.set(record.id, record);
                }
            });

            // --- SİLMELER ---
            Object.values(removals).forEach(async (record) => {
                if (record.typeName === 'shape') {
                    await deleteDoc(doc(db, 'rooms', roomId, 'shapes', record.id));
                    logActivity('shape_remove', 'bir öğeyi tuvalden kaldırdı.');
                }
            });

            // Throttled update trigger
            if (pendingUpdatesRef.current.size > 0) {
                scheduleSync();
            }

            // Bildirim ve Log mekanizması (Smart Throttling)
            if (Object.keys(additions).length > 0 || Object.keys(updates).length > 0) {
                handleSmartNotification();
            }
        }, { source: 'user', scope: 'document' });

        // Yardımcı Fonksiyonlar (Sync & Notification)
        const scheduleSync = () => {
            if (window[`sync_timer_${roomId}`]) return;

            window[`sync_timer_${roomId}`] = setTimeout(async () => {
                const updatesToPush = Array.from(pendingUpdatesRef.current.values());
                pendingUpdatesRef.current.clear();
                window[`sync_timer_${roomId}`] = null;

                if (updatesToPush.length > 0) {
                    const batch = writeBatch(db);
                    updatesToPush.forEach(record => {
                        const shapeRef = doc(db, 'rooms', roomId, 'shapes', record.id);
                        batch.set(shapeRef, {
                            shape: record,
                            updatedBy: user.uid,
                            updatedByName: user.displayName || user.email,
                            updatedAt: new Date(),
                            actionType: 'update'
                        }, { merge: true });
                    });
                    await batch.commit();
                    console.log(`Synced ${updatesToPush.length} updates to Firestore.`);
                }
            }, 500); // 500ms throttle for updates
        };

        const logActivity = (type, detail) => {
            const activityRef = doc(collection(db, 'rooms', roomId, 'activity'));
            setDoc(activityRef, {
                type: 'canvas_activity',
                activityType: type,
                userId: user.uid,
                userName: user.name || user.displayName || user.email.split('@')[0],
                detail: detail,
                timestamp: new Date(),
                roomId: roomId,
                roomName: roomName
            });
        };

        const handleSmartNotification = () => {
            const now = Date.now();
            const lastNotif = window[`last_notif_${roomId}`] || 0;

            // 5 dakikada bir "çalışıyor" bildirimi gönder (spam önleme)
            if (now - lastNotif > 300000) {
                window[`last_notif_${roomId}`] = now;

                // Odadaki diğerlerine fısılda
                const originalRoomId = roomId.split('_')[0];
                notifyParticipantsOfCanvasUpdate(originalRoomId, user.uid, user.displayName || user.email, roomName);

                // Süreç loguna genel bir "çalışmaya devam ediyor" ekle
                logActivity('work_continue', 'tuval üzerinde çalışmaya devam ediyor...');
            }
        };

        return () => {
            unsubscribe();
            cleanup();
        };
    }, [roomId, store, user, isReadOnly, roomName]);

    return (
        <div className="w-full h-full relative border border-border-light/20 rounded-[2rem] overflow-hidden bg-white shadow-inner">
            {!isLoaded && (
                <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-accent-blue border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-blue animate-pulse">Sonsuz Tuval Hazırlanıyor...</p>
                </div>
            )}
            <div className="absolute inset-0">
                <Tldraw
                    store={store}
                    licenseKey={import.meta.env.VITE_TLDRAW_LICENSE_KEY}
                    readOnly={isReadOnly}
                    showMenu={!isReadOnly}
                    showToolbar={!isReadOnly}
                    showUI={true}
                    inferDarkMode={false}
                />
            </div>

            {/* Canvas Overlay Info */}
            <div className="absolute bottom-6 left-6 z-[10] flex items-center gap-3">
                <div className="glass-card px-4 py-2 flex items-center gap-2 border border-white/40 shadow-xl">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-main">Canlı Moodboard</span>
                </div>
            </div>
        </div>
    );
};

export default CanvasBoard;
