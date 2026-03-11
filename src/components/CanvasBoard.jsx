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
    const isDrawingRef = useRef(false);

    // 1. LocalStorage Yedekleme (Kota dostu veri koruma)
    useEffect(() => {
        if (!roomId || !isLoaded) return;
        const backupKey = `kibele_backup_${roomId}`;

        // İlk yüklemede yedeği kontrol et
        const backup = localStorage.getItem(backupKey);
        if (backup && store.allRecords().length <= 1) {
            try {
                const data = JSON.parse(backup);
                store.put(data);
                console.log("[Kibele] Yerel yedek yüklendi.");
            } catch (e) { }
        }

        // Periyodik yedekle (Her 5 saniyede bir yerel hafızaya at - Kotayla alakası yok, bedava)
        const backupInterval = setInterval(() => {
            const allRecords = store.allRecords();
            if (allRecords.length > 1) {
                localStorage.setItem(backupKey, JSON.stringify(allRecords));
            }
        }, 5000);

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
                } else if (change.type === 'added' || change.type === 'modified') {
                    // Sadece dışarıdan gelen (başka kullanıcı) verisini uygula
                    if (data.updatedBy !== user.uid) {
                        store.put([data.shape]);
                    }
                }
            });
            if (!isLoaded) setIsLoaded(true);
        }, (error) => {
            if (error.code === 'resource-exhausted') setSyncStatus('error');
        });

        // B. Store'dan Firestore'a (Local -> Remote - AGGRESSIVE THROTTLING)
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
                    pendingWritesRef.current.delete(record.id);
                    hasChanges = true;
                }
            });

            if (hasChanges) {
                setSyncStatus('syncing');
                // Sadece kalem havadayken veya belirli aralıklarla yaz
                if (!isDrawingRef.current) {
                    scheduleSync();
                }
            }
        }, { source: 'user', scope: 'document' });

        const scheduleSync = () => {
            if (window[`timer_${roomId}`]) return;

            // Yazma sıklığını 5 saniyeye çıkardık (Kota için en kritik adım)
            window[`timer_${roomId}`] = setTimeout(async () => {
                window[`timer_${roomId}`] = null;

                const writes = Array.from(pendingWritesRef.current.values());
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
                            updatedAt: new Date()
                        }, { merge: true });
                    });

                    deletes.forEach(id => {
                        const shapeRef = doc(db, 'rooms', roomId, 'shapes', id);
                        batch.delete(shapeRef);
                    });

                    await batch.commit();
                    setSyncStatus('synced');
                    console.log(`[Kibele Quota] ${writes.length + deletes.length} işlem tek seferde kaydedildi. Yazma kotasından tasarruf sağlandı. 📉`);
                } catch (error) {
                    setSyncStatus('error');
                    // Hata durumunda bekleyenleri geri koy
                    writes.forEach(w => pendingWritesRef.current.set(w.id, w));
                    deletes.forEach(d => pendingDeletesRef.current.add(d));
                }
            }, 5000);
        };

        // Pointer takibi: Çizim sırasında senkronizasyonu durdurup kalem kalkınca tetikler
        const handlePointerUp = () => {
            isDrawingRef.current = false;
            scheduleSync();
        };
        const handlePointerDown = () => {
            isDrawingRef.current = true;
        };

        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('pointerdown', handlePointerDown);

        return () => {
            unsubscribe();
            cleanup();
            window.removeEventListener('pointerup', handlePointerUp);
            window.removeEventListener('pointerdown', handlePointerDown);
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
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-blue">Kibele Hazırlanıyor...</p>
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

            <div className="absolute bottom-6 right-6 z-[10] flex flex-col items-end gap-2">
                {syncStatus === 'syncing' && (
                    <div className="glass-card px-3 py-1.5 flex items-center gap-2 bg-blue-50/80 backdrop-blur-md border-blue-100 shadow-lg">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-spin" />
                        <span className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">Senkronize Ediliyor...</span>
                    </div>
                )}
                {syncStatus === 'synced' && (
                    <div className="glass-card px-3 py-1.5 flex items-center gap-2 bg-green-50/80 backdrop-blur-md border-green-100 shadow-lg">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-[9px] font-bold text-green-600 uppercase tracking-widest">Buluta Kaydedildi</span>
                    </div>
                )}
                {syncStatus === 'error' && (
                    <div className="glass-card px-3 py-1.5 flex items-center gap-2 bg-red-50/80 backdrop-blur-md border-red-100 shadow-lg">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-[9px] font-bold text-red-600 uppercase tracking-widest text-center leading-tight">
                            Günlük Kota Doldu<br />Veriler Cihazına Kaydediliyor
                        </span>
                    </div>
                )}
            </div>

            <div className="absolute bottom-6 left-6 z-[10]">
                <div className="glass-card px-4 py-2 flex items-center gap-2 border border-white/40 shadow-xl bg-white/60 backdrop-blur-md">
                    <div className="w-2 h-2 rounded-full bg-accent-blue" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-main">{roomName}</span>
                </div>
            </div>
        </div>
    );
};

export default CanvasBoard;
