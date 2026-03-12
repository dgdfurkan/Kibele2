import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Tldraw, createTLStore, defaultShapeUtils } from 'tldraw';
import 'tldraw/tldraw.css';
import { db } from '../firebase';
import { onSnapshot, doc, setDoc, updateDoc, deleteField, writeBatch, getDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { notifyParticipantsOfCanvasUpdate } from '../services/dbService';

const CanvasBoard = ({ roomId, isReadOnly = false, roomName }) => {
    const { user } = useAuth();
    const [store] = useState(() => createTLStore({ shapeUtils: defaultShapeUtils }));
    const [isLoaded, setIsLoaded] = useState(false);
    const [syncStatus, setSyncStatus] = useState('synced'); // 'synced', 'syncing', 'error'
    
    // Senkronizasyon Kuyrukları (Refs)
    const pendingWritesRef = useRef(new Map());
    const pendingDeletesRef = useRef(new Set());
    const lastNotifRef = useRef(0);
    const isInteractingRef = useRef(false);
    const remoteUpdateBufferRef = useRef(new Map());

    // 1. LocalStorage Yedekleme (Son Savunma Hattı)
    useEffect(() => {
        if (!roomId || !isLoaded) return;
        const backupKey = `kibele_backup_${roomId}`;
        
        const backup = localStorage.getItem(backupKey);
        if (backup && store.allRecords().length <= 1) {
            try {
                const data = JSON.parse(backup);
                store.put(data);
                console.log("[Kibele] Local storage restore.");
            } catch (e) { }
        }

        const backupInterval = setInterval(() => {
            const allRecords = store.allRecords();
            if (allRecords.length > 1) {
                localStorage.setItem(backupKey, JSON.stringify(allRecords));
            }
        }, 5000);

        return () => clearInterval(backupInterval);
    }, [roomId, isLoaded, store]);

    // 2. Ultra-Düşük Kota & Çatışma Önleme Senkronizasyonu
    useEffect(() => {
        if (!roomId || !store) return;

        // TEK DOKÜMAN MODELİ: Her şekil için ayrı read/write yerine, tek bir kanvas dokümanı.
        // Bu sayede okuma (read) maliyeti 100-500 kat azalır.
        const canvasDocRef = doc(db, 'rooms', roomId, 'canvas', 'data');

        // A. Firestore'dan Store'a (Remote -> Local)
        let isFirstSnapshot = true;
        const unsubscribe = onSnapshot(canvasDocRef, (snapshot) => {
            if (!snapshot.exists()) {
                if (isFirstSnapshot) {
                    isFirstSnapshot = false;
                    setIsLoaded(true);
                }
                return;
            }

            const data = snapshot.data();
            const remoteShapesMap = data.shapes || {};
            const lastUpdatedBy = data.lastUpdatedBy;
            
            const toPut = [];
            const toRemove = [];

            // Tüm mevcut kayıtları kontrol et
            Object.keys(remoteShapesMap).forEach(id => {
                const shape = remoteShapesMap[id];
                // Eğer başkası güncellediyse veya ilk yüklemeyse uygula
                if (isFirstSnapshot || lastUpdatedBy !== user.uid) {
                    // EĞER ŞU AN KULLANICI ETKİLEŞİMDEYSE (Çiziyorsa), bu güncellemeyi TAMPONLA (Yarıda kalmayı önler)
                    if (isInteractingRef.current) {
                        remoteUpdateBufferRef.current.set(id, shape);
                    } else {
                        toPut.push(shape);
                    }
                }
            });

            // Firestore'da silinmiş olanları yerelde de sil
            store.allRecords().forEach(record => {
                if (record.typeName === 'shape' && !remoteShapesMap[record.id]) {
                    toRemove.push(record.id);
                }
            });

            if (toPut.length > 0) store.put(toPut);
            if (toRemove.length > 0) store.remove(toRemove);

            if (isFirstSnapshot) {
                isFirstSnapshot = false;
                setIsLoaded(true);
            }
        }, (error) => {
            console.error("[Kibele Sync Error]", error);
            if (error.code === 'resource-exhausted') setSyncStatus('error');
            if (!isLoaded) setIsLoaded(true);
        });

        // B. Store'dan Firestore'a (Local -> Remote)
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
                // Kullanıcı etkileşimi bittiğinde senkronize et (Yarıda kalmayı önler)
                if (!isInteractingRef.current) {
                    scheduleSync();
                }
            }
        }, { source: 'user', scope: 'document' });

        const scheduleSync = async () => {
            if (window[`timer_${roomId}`]) return;

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
                    // ATOMIC UPDATE: Sadece değişen field'ları güncelle (Dot notation)
                    const updates = {
                        lastUpdatedBy: user.uid,
                        updatedAt: new Date()
                    };

                    writes.forEach(shape => {
                        updates[`shapes.${shape.id.replace(/:/g, '_')}`] = shape;
                    });

                    deletes.forEach(id => {
                        updates[`shapes.${id.replace(/:/g, '_')}`] = deleteField();
                    });

                    // Eğer döküman yoksa önce yarat
                    await setDoc(canvasDocRef, updates, { merge: true });
                    setSyncStatus('synced');
                } catch (error) {
                    console.error("[Sync Failed]", error);
                    setSyncStatus('error');
                    writes.forEach(w => pendingWritesRef.current.set(w.id, w));
                    deletes.forEach(id => pendingDeletesRef.current.add(id));
                }
            }, 3000); // 3 saniye dengeleyici aralık
        };

        const handlePointerUp = () => {
            isInteractingRef.current = false;
            
            // 1. Tamponlanmış dış güncellemeleri uygula
            if (remoteUpdateBufferRef.current.size > 0) {
                const shapes = Array.from(remoteUpdateBufferRef.current.values());
                store.put(shapes);
                remoteUpdateBufferRef.current.clear();
            }

            // 2. Kendi değişikliklerini gönder
            scheduleSync();
        };

        const handlePointerDown = () => {
            isInteractingRef.current = true;
        };

        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('pointerdown', handlePointerDown);

        return () => {
            unsubscribe();
            cleanup();
            window.removeEventListener('pointerup', handlePointerUp);
            window.removeEventListener('pointerdown', handlePointerDown);
            if (window[`timer_${roomId}`]) clearTimeout(window[`timer_${roomId}`]);
        };
    }, [roomId, store, user, isReadOnly, roomName, isLoaded]);

    return (
        <div className="w-full h-full relative border border-border-light/20 rounded-[2rem] overflow-hidden bg-white shadow-inner">
            {!isLoaded && (
                <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-accent-blue border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-blue">İlham Odası Hazırlanıyor...</p>
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
                            Kota Dolu (Yerel Kayıtta)<br/>Veri kaybı yok merak etme ✨
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
