import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Tldraw, createTLStore, defaultShapeUtils } from 'tldraw';
import 'tldraw/tldraw.css';
import * as Y from 'yjs';
import { FirebaseRTDBProvider } from '../lib/y-firebase-rtdb';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, onChildAdded, remove } from 'firebase/database';
import { db, rtdb } from '../firebase';

const CanvasBoard = ({ roomId, user, isReadOnly = false, roomName = "İlham Odası" }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [syncStatus, setSyncStatus] = useState('synced');
    const [activeUsersCount, setActiveUsersCount] = useState(1);
    
    // tldraw store
    const store = useMemo(() => createTLStore({ shapeUtils: defaultShapeUtils }), []);

    useEffect(() => {
        if (!roomId || !user) return;

        const ydoc = new Y.Doc();
        const yShapes = ydoc.getMap('shapes');
        
        // Uzman tavsiyesi: Kullanıcı bilgileriyle provider başlatılıyor
        const provider = new FirebaseRTDBProvider(roomId, ydoc, {
            name: user.name || user.displayName || 'Anonim',
            id: user.uid,
            color: user.color || `#${Math.floor(Math.random()*16777215).toString(16)}`
        });

        let isUpdatingRemote = false;

        // Active Users Tracking via Awareness
        const handleAwarenessChange = () => {
            const states = provider.awareness.getStates();
            setActiveUsersCount(states.size);
        };
        provider.awareness.on('change', handleAwarenessChange);

        // 1. Yjs -> tldraw (Remote updates coming in)
        const handleYjsChange = () => {
            isUpdatingRemote = true;
            store.mergeRemoteChanges(() => {
                // Get all shapes from Yjs
                const remoteShapesMap = yShapes.toJSON();
                
                // Sync to tldraw store
                Object.values(remoteShapesMap).forEach((shape) => {
                    const existing = store.get(shape.id);
                    if (!existing || JSON.stringify(existing) !== JSON.stringify(shape)) {
                        store.put([shape]);
                    }
                });

                // Handle deletions
                store.allRecords().forEach(record => {
                    if (record.typeName === 'shape' && !remoteShapesMap[record.id]) {
                        store.remove([record.id]);
                    }
                });
            });
            isUpdatingRemote = false;
            setSyncStatus('synced');
            if (!isLoaded) setIsLoaded(true);
        };

        yShapes.observe(handleYjsChange);

        // 2. tldraw -> Yjs (Local updates going out)
        const unlisten = store.listen((update) => {
            if (isUpdatingRemote) return;
            
            setSyncStatus('syncing');
            ydoc.transact(() => {
                Object.values(update.changes.added).forEach(record => {
                    if (record.typeName === 'shape') yShapes.set(record.id, record);
                });
                Object.values(update.changes.updated).forEach(([oldRecord, newRecord]) => {
                    if (newRecord.typeName === 'shape') yShapes.set(newRecord.id, newRecord);
                });
                Object.values(update.changes.removed).forEach(record => {
                    if (record.typeName === 'shape') yShapes.delete(record.id);
                });
            }, 'local');
            
            // Debounce syncing status to 'synced'
            const timer = setTimeout(() => setSyncStatus('synced'), 2000);
            return () => clearTimeout(timer);
        });

        // 3. Initial Load from Firestore (Optional Archive/Snapshot)
        const loadInitialSnapshot = async () => {
            try {
                const docRef = doc(db, `rooms/${roomId}/canvas/data`);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    const data = snap.data();
                    if (data.shapes && yShapes.size === 0) {
                        ydoc.transact(() => {
                            Object.entries(data.shapes).forEach(([id, shape]) => {
                                yShapes.set(id, shape);
                            });
                        });
                    }
                }
            } catch (error) {
                console.error("Initial load failed:", error);
            }
            if (!isLoaded) setIsLoaded(true);
        };

        loadInitialSnapshot();

        // 5. Listen for External Additions (e.g. from ArtsyExplorer) via RTDB
        const externalRef = ref(rtdb, `canvas_sync/${roomId}/external_shapes`);
        
        const unlistenExternal = onChildAdded(externalRef, (snapshot) => {
            const shape = snapshot.val();
            if (shape && shape.id) {
                ydoc.transact(() => {
                    yShapes.set(shape.id, shape);
                }, 'external');
                // Remove the message after processing
                remove(ref(rtdb, `canvas_sync/${roomId}/external_shapes/${snapshot.key}`));
            }
        });

        // 4. Periodic Snapshot to Firestore (Once every 5 mins for backup)
        const snapshotInterval = setInterval(async () => {
            if (isReadOnly) return;
            const currentShapes = yShapes.toJSON();
            if (Object.keys(currentShapes).length > 0) {
                try {
                    await setDoc(doc(db, `rooms/${roomId}/canvas/data`), {
                        shapes: currentShapes,
                        lastSnapshot: new Date().toISOString()
                    }, { merge: true });
                } catch (e) {
                    console.warn("Snapshot backup failed (Quota?)", e);
                }
            }
        }, 300000); // 5 mins

        return () => {
            provider.destroy();
            ydoc.destroy();
            unlisten();
            clearInterval(snapshotInterval);
        };
    }, [roomId, store, user, isReadOnly]);

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
                {activeUsersCount > 1 && (
                    <div className="glass-card px-3 py-1.5 flex items-center gap-2 bg-indigo-50/80 backdrop-blur-md border-indigo-100 shadow-lg">
                        <div className="flex -space-x-1.5">
                            {[...Array(Math.min(activeUsersCount, 3))].map((_, i) => (
                                <div key={i} className="w-2.5 h-2.5 rounded-full border border-white bg-indigo-400" />
                            ))}
                        </div>
                        <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest">{activeUsersCount} Sanatçı Aktif</span>
                    </div>
                )}
                {syncStatus === 'syncing' && (
                    <div className="glass-card px-3 py-1.5 flex items-center gap-2 bg-blue-50/80 backdrop-blur-md border-blue-100 shadow-lg">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-spin" />
                        <span className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">Senkronize Ediliyor...</span>
                    </div>
                )}
                {syncStatus === 'synced' && (
                    <div className="glass-card px-3 py-1.5 flex items-center gap-2 bg-green-50/80 backdrop-blur-md border-green-100 shadow-lg">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-[9px] font-bold text-green-600 uppercase tracking-widest">Buluta Kaydedildi (RTDB)</span>
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
