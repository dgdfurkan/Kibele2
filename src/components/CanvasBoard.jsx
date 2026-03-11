import React, { useEffect, useState, useRef } from 'react';
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

    // Senkronizasyon Kuyrukları (Refs)
    const pendingWritesRef = useRef(new Map());
    const pendingDeletesRef = useRef(new Set());
    const lastNotifRef = useRef(0);

    // 1. tldraw lisans anahtarı kontrolü
    useEffect(() => {
        const key = import.meta.env.VITE_TLDRAW_LICENSE_KEY;
        if (!key) {
            console.warn("⚠️ Kibele Uyarı: tldraw lisans anahtarı VITE_TLDRAW_LICENSE_KEY üzerinden okunamadı.");
        }
    }, []);

    // 2. Ana Senkronizasyon Döngüsü
    useEffect(() => {
        if (!roomId || !store) return;

        console.log(`[Kibele Canvas] Subscribing: ${roomId}`);
        const shapesCol = collection(db, 'rooms', roomId, 'shapes');

        // A. Firestore'dan Store'a (Remote -> Local)
        const unsubscribe = onSnapshot(shapesCol, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                const data = change.doc.data();
                const id = change.doc.id;

                if (change.type === 'removed') {
                    store.remove([id]);
                } else {
                    store.put([data.shape]);
                }
            });
            if (!isLoaded) setIsLoaded(true);
        }, (error) => {
            console.error("[Kibele Canvas] Firestore Dinleme Hatası:", error);
        });

        // B. Store'dan Firestore'a (Local -> Remote - Throttled)
        const cleanup = store.listen((entry) => {
            if (isReadOnly) return;
            const { added, updated, removed } = entry.changes;

            // Değişiklikleri kuyruğa al
            Object.values(added).forEach(record => {
                if (record.typeName === 'shape') {
                    pendingWritesRef.current.set(record.id, record);
                    pendingDeletesRef.current.delete(record.id);
                }
            });

            Object.values(updated).forEach(([, record]) => {
                if (record.typeName === 'shape') {
                    pendingWritesRef.current.set(record.id, record);
                    pendingDeletesRef.current.delete(record.id);
                }
            });

            Object.values(removed).forEach(record => {
                if (record.typeName === 'shape') {
                    pendingDeletesRef.current.add(record.id);
                    pendingWritesRef.current.delete(record.id);
                }
            });

            if (pendingWritesRef.current.size > 0 || pendingDeletesRef.current.size > 0) {
                scheduleSync();
            }

            // Bildirim tetikleyici (Smart Throttling)
            if (Object.keys(added).length > 0 || Object.keys(updated).length > 0) {
                handleSmartNotification();
            }
        }, { source: 'user', scope: 'document' });

        // Helper: Toplu Yazma
        const scheduleSync = () => {
            if (window[`sync_timer_${roomId}`]) return;

            window[`sync_timer_${roomId}`] = setTimeout(async () => {
                window[`sync_timer_${roomId}`] = null;

                const writes = Array.from(pendingWritesRef.current.values());
                const deletes = Array.from(pendingDeletesRef.current.values());

                pendingWritesRef.current.clear();
                pendingDeletesRef.current.clear();

                if (writes.length === 0 && deletes.length === 0) return;

                try {
                    const batch = writeBatch(db);

                    writes.forEach(record => {
                        const shapeRef = doc(db, 'rooms', roomId, 'shapes', record.id);
                        batch.set(shapeRef, {
                            shape: record,
                            updatedBy: user.uid,
                            updatedByName: user.name || user.displayName || user.email,
                            updatedAt: new Date()
                        }, { merge: true });
                    });

                    deletes.forEach(id => {
                        const shapeRef = doc(db, 'rooms', roomId, 'shapes', id);
                        batch.delete(shapeRef);
                    });

                    await batch.commit();
                    console.log(`[Kibele Sync] ${writes.length} yazma, ${deletes.length} silme tamamlandı.`);

                    if (writes.some(w => w.type === 'image')) {
                        logActivity('shape_update', 'tuvale yeni içerikler ekledi.');
                    }
                } catch (error) {
                    console.error("[Kibele Sync] Hata:", error);
                }
            }, 1500); // Kota koruması için 1.5 saniye throttle
        };

        const logActivity = (type, detail) => {
            const lastLogKey = `last_log_${roomId}_${type}`;
            const now = Date.now();
            if (window[lastLogKey] && now - window[lastLogKey] < 15000) return;
            window[lastLogKey] = now;

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
            }).catch(e => console.warn("[Log] Kota hatası olabilir:", e.message));
        };

        const handleSmartNotification = () => {
            const now = Date.now();
            if (now - lastNotifRef.current > 600000) { // 10 dakikada bir bildirim (Ultra spam koruması)
                lastNotifRef.current = now;
                const originalRoomId = roomId.split('_')[0];
                notifyParticipantsOfCanvasUpdate(originalRoomId, user.uid, user.name || user.displayName || user.email, roomName);
            }
        };

        return () => {
            unsubscribe();
            cleanup();
            if (window[`sync_timer_${roomId}`]) {
                clearTimeout(window[`sync_timer_${roomId}`]);
                window[`sync_timer_${roomId}`] = null;
            }
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
