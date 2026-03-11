import React, { useEffect, useState, useRef, useCallback } from 'react';
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
    const [syncStatus, setSyncStatus] = useState('synced'); // 'synced', 'syncing', 'error'

    // Senkronizasyon Kuyrukları (Refs)
    const pendingWritesRef = useRef(new Map());
    const pendingDeletesRef = useRef(new Set());
    const lastNotifRef = useRef(0);

    // 1. LocalStorage Yedekleme (Kota dolduğunda veri kaybını önlemek için)
    useEffect(() => {
        if (!roomId || !isLoaded) return;
        const backupKey = `kibele_backup_${roomId}`;

        // İlk yüklemede yedeği kontrol et (Eğer Firestore boşsa ve yedek varsa)
        const backup = localStorage.getItem(backupKey);
        if (backup && store.allRecords().length <= 1) { // Sadece schema varken
            try {
                const data = JSON.parse(backup);
                store.put(data);
                console.log("[Kibele] Yerel yedekten veri geri yüklendi.");
            } catch (e) {
                console.error("[Kibele] Yedek yükleme hatası:", e);
            }
        }

        // Periyodik yedekle (Her 2 saniyede bir yerel hafızaya at)
        const backupInterval = setInterval(() => {
            const allRecords = store.allRecords();
            if (allRecords.length > 1) {
                localStorage.setItem(backupKey, JSON.stringify(allRecords));
            }
        }, 2000);

        return () => clearInterval(backupInterval);
    }, [roomId, isLoaded, store]);

    // 2. Ana Senkronizasyon Döngüsü
    useEffect(() => {
        if (!roomId || !store) return;

        const shapesCol = collection(db, 'rooms', roomId, 'shapes');

        // A. Firestore'dan Store'a (Remote -> Local)
        const unsubscribe = onSnapshot(shapesCol, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                const data = change.doc.data();
                const id = change.doc.id;

                if (change.type === 'removed') {
                    if (store.get(id)) store.remove([id]);
                } else {
                    store.put([data.shape]);
                }
            });
            if (!isLoaded) setIsLoaded(true);
        }, (error) => {
            if (error.code === 'resource-exhausted') {
                setSyncStatus('error');
            }
        });

        // B. Store'dan Firestore'a (Local -> Remote - Throttled)
        const cleanup = store.listen((entry) => {
            if (isReadOnly) return;
            const { added, updated, removed } = entry.changes;

            let hasChanges = false;
            Object.values(added).forEach(record => {
                if (record.typeName === 'shape') {
                    pendingWritesRef.current.set(record.id, record);
                    pendingDeletesRef.current.delete(record.id);
                    hasChanges = true;
                }
            });

            Object.values(updated).forEach(([, record]) => {
                if (record.typeName === 'shape') {
                    pendingWritesRef.current.set(record.id, record);
                    pendingDeletesRef.current.delete(record.id);
                    hasChanges = true;
                }
            });

            Object.values(removed).forEach(record => {
                if (record.typeName === 'shape') {
                    pendingDeletesRef.current.add(record.id);
                    pendingWritesRef.current.set(record.id, null); // Map'ten silmek yerine null koyup batch'te atlayacağız
                    hasChanges = true;
                }
            });

            if (hasChanges) {
                setSyncStatus('syncing');
                scheduleSync();
                handleSmartNotification();
            }
        }, { source: 'user', scope: 'document' });

        const scheduleSync = () => {
            if (window[`timer_${roomId}`]) return;

            window[`timer_${roomId}`] = setTimeout(async () => {
                window[`timer_${roomId}`] = null;

                const writes = Array.from(pendingWritesRef.current.values()).filter(Boolean);
                const deletes = Array.from(pendingDeletesRef.current.values());

                if (writes.length === 0 && deletes.length === 0) {
                    setSyncStatus('synced');
                    return;
                }

                pendingWritesRef.current.clear();
                pendingDeletesRef.current.clear();

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
                    setSyncStatus('synced');

                    if (writes.some(w => w.type === 'image')) {
                        logActivity('shape_update', 'tuvale yeni içerikler ekledi.');
                    }
                } catch (error) {
                    console.error("[Kibele Sync] Hata:", error);
                    setSyncStatus('error');
                    // Hata durumunda bekleyenleri geri koy (bir sonraki deneme için)
                    writes.forEach(w => pendingWritesRef.current.set(w.id, w));
                    deletes.forEach(d => pendingDeletesRef.current.add(d));
                }
            }, 2000); // 2 saniye throttle (Kotayı en üst düzeyde korur)
        };

        const logActivity = (type, detail) => {
            const lastLogKey = `last_log_${roomId}_${type}`;
            const now = Date.now();
            if (window[lastLogKey] && now - window[lastLogKey] < 30000) return;
            window[lastLogKey] = now;

            const activityRef = doc(collection(db, 'rooms', roomId.split('_')[0], 'activity'));
            setDoc(activityRef, {
                type: 'canvas_activity',
                activityType: type,
                userId: user.uid,
                userName: user.name || user.displayName || user.email.split('@')[0],
                detail: detail,
                timestamp: new Date(),
                roomId: roomId,
                roomName: roomName
            }).catch(() => { });
        };

        const handleSmartNotification = () => {
            const now = Date.now();
            if (now - lastNotifRef.current > 900000) { // 15 dakika
                lastNotifRef.current = now;
                const originalRoomId = roomId.split('_')[0];
                notifyParticipantsOfCanvasUpdate(originalRoomId, user.uid, user.name || user.displayName || user.email, roomName);
            }
        };

        // Sayfadan ayrılırken son bir kez kaydetmeyi dene
        const handleBeforeUnload = () => {
            if (pendingWritesRef.current.size > 0 || pendingDeletesRef.current.size > 0) {
                // Not: Asenkron işlemler garanti değil ama localStorage yedeği zaten periyodik çalışıyor.
                localStorage.setItem(`kibele_backup_${roomId}`, JSON.stringify(store.allRecords()));
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            unsubscribe();
            cleanup();
            window.removeEventListener('beforeunload', handleBeforeUnload);
            if (window[`timer_${roomId}`]) {
                clearTimeout(window[`timer_${roomId}`]);
                window[`timer_${roomId}`] = null;
            }
        };
    }, [roomId, store, user, isReadOnly, roomName, isLoaded]);

    return (
        <div className="w-full h-full relative border border-border-light/20 rounded-[2rem] overflow-hidden bg-white shadow-inner">
            {!isLoaded && (
                <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-accent-blue border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-blue animate-pulse">Tuval Hazırlanıyor...</p>
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

            {/* Sync Status Indicator */}
            <div className="absolute bottom-6 right-6 z-[10]">
                {syncStatus === 'syncing' && (
                    <div className="glass-card px-3 py-1.5 flex items-center gap-2 border-white/40 shadow-xl bg-blue-50/50">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-spin" />
                        <span className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">Kaydediliyor...</span>
                    </div>
                )}
                {syncStatus === 'synced' && (
                    <div className="glass-card px-3 py-1.5 flex items-center gap-2 border-white/40 shadow-xl bg-green-50/50">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-[9px] font-bold text-green-600 uppercase tracking-widest">Buluta Kaydedildi</span>
                    </div>
                )}
                {syncStatus === 'error' && (
                    <div className="glass-card px-3 py-1.5 flex items-center gap-2 border-red-100 shadow-xl bg-red-50">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-[9px] font-bold text-red-600 uppercase tracking-widest">Kota Dolu (Yerel Kayıtta)</span>
                    </div>
                )}
            </div>

            <div className="absolute bottom-6 left-6 z-[10] flex items-center gap-3">
                <div className="glass-card px-4 py-2 flex items-center gap-2 border border-white/40 shadow-xl">
                    <div className="w-2 h-2 rounded-full bg-accent-blue animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-main">{roomName}</span>
                </div>
            </div>
        </div>
    );
};

export default CanvasBoard;
