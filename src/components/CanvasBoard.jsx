import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Tldraw, createTLStore, defaultShapeUtils, track, useEditor, useSelectionEvents } from 'tldraw';
import 'tldraw/tldraw.css';
import * as Y from 'yjs';
import { FirebaseRTDBProvider } from '../lib/y-firebase-rtdb';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, onChildAdded, remove } from 'firebase/database';
import { db, rtdb } from '../firebase';
import { sendNotification } from '../services/dbService';

// --- Custom Components for tldraw ---

// Zarif bir şekilde şekil sahibini gösteren bileşen
const CustomSelectionForeground = track(({ boundShapes }) => {
    const editor = useEditor();
    const selectionIds = editor.getSelectedShapeIds();
    
    // Sadece tek bir şekil seçiliyse sahibini göster
    if (selectionIds.length !== 1) return null;
    
    const shape = editor.getShape(selectionIds[0]);
    if (!shape || !shape.meta?.creatorName) return null;

    return (
        <div 
            style={{
                position: 'absolute',
                top: -8, // Daha da yakınlaştırdık
                left: 0,
                transform: 'translateY(-100%)', // Şeklin tam üzerinde başlamasını sağlar
                padding: '3px 10px',
                background: 'rgba(99, 102, 241, 0.98)',
                backdropFilter: 'blur(8px)',
                color: 'white',
                fontSize: '10px',
                fontWeight: '900',
                borderRadius: '8px',
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                zIndex: 1000,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                border: '1px solid rgba(255,255,255,0.2)'
            }}
        >
            ✍️ {shape.meta.creatorName}
        </div>
    );
});

// @ Mention Dropdown Bileşeni
const MentionDropdown = track(({ participants, onSelect }) => {
    const editor = useEditor();
    const editingShapeId = editor.getEditingShapeId();
    if (!editingShapeId) return null;

    const shape = editor.getShape(editingShapeId);
    if (!shape || shape.type !== 'text') return null;

    const text = shape.props.text || '';
    const cursorIndex = editor.getInstanceState().cursor.type === 'text' ? 0 : -1; // Basit yaklaşım
    
    // @ işaretinden sonra gelen kelimeyi bul
    const lastAtPos = text.lastIndexOf('@');
    if (lastAtPos === -1) return null;

    // Eğer @ işaretinden sonra boşluk varsa gösterme
    const query = text.slice(lastAtPos + 1).toLowerCase();
    if (query.includes(' ')) return null;

    const filtered = participants.filter(p => 
        (p.name || p.displayName || '').toLowerCase().includes(query)
    ).slice(0, 5);

    if (filtered.length === 0) return null;

    const bounds = editor.getShapePageBounds(shape);
    if (!bounds) return null;

    const { x, y, w, h } = editor.viewportToPage(editor.getSelectionPageBounds() || bounds);

    return (
        <div 
            className="absolute z-[1000] bg-white/90 backdrop-blur-xl border border-indigo-100 rounded-xl shadow-2xl p-1 w-48 animate-in fade-in zoom-in-95 duration-200"
            style={{
                top: bounds.maxY + 10,
                left: bounds.minX
            }}
        >
            <div className="px-2 py-1.5 text-[8px] font-black uppercase tracking-widest text-indigo-400 border-b border-indigo-50 mb-1">
                Kimi Etiketleyeceksin? ✨
            </div>
            {filtered.map(p => (
                <button
                    key={p.id}
                    onMouseDown={(e) => {
                        e.preventDefault();
                        onSelect(p);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-2 hover:bg-indigo-50 rounded-lg transition-all text-left group"
                >
                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold">
                        {p.name?.charAt(0) || '👤'}
                    </div>
                    <div>
                        <div className="text-[11px] font-bold text-gray-700 group-hover:text-indigo-600">{p.name}</div>
                        <div className="text-[8px] text-gray-400 uppercase font-bold tracking-tighter">{p.role || 'Öğrenci'}</div>
                    </div>
                </button>
            ))}
        </div>
    );
});

const components = {
    SelectionForeground: CustomSelectionForeground,
    OnTheCanvas: ({ children }) => children, // Placeholder for our custom wrapper
};

// --- Helpers for Mentions ---
const sentMentions = new Set(); // Spam önleyici: [roomId-name-time]

const handleMentions = async (text, roomId, roomName, currentUser, participants) => {
    if (!text || !text.includes('@')) return;

    // Regex: @ işaretinden sonra gelen kelimeleri yakala (boşluklara kadar)
    const mentionRegex = /@(\w+)/g;
    let match;
    const mentions = [];
    
    while ((match = mentionRegex.exec(text)) !== null) {
        mentions.push(match[1].toLowerCase());
    }

    if (mentions.length === 0) return;

    // Katılımcılar arasında eşleşme ara
    mentions.forEach(async (mentionName) => {
        const targetUser = participants.find(p => 
            (p.name || p.displayName || '').toLowerCase().replace(/\s/g, '').includes(mentionName)
        );

        if (targetUser && targetUser.id !== currentUser.uid) {
            const mentionKey = `${roomId}-${targetUser.id}-${mentionName}`;
            
            // Eğer son 1 dakika içinde bu kişiye bu odada mention atılmadıysa gönder
            if (!sentMentions.has(mentionKey)) {
                sentMentions.add(mentionKey);
                setTimeout(() => sentMentions.delete(mentionKey), 60000); // 1 dk cooldown

                await sendNotification(targetUser.id, {
                    type: "canvas_mention",
                    title: "Senden Bahsedildi! 🔔",
                    message: `${currentUser.name || currentUser.displayName || 'Birisi'}, '${roomName}' odasında senden bahsetti.`,
                    roomId: roomId,
                    isSystem: false,
                    senderName: currentUser.name || currentUser.displayName
                });
                console.log(`Mention sent to ${targetUser.id}`);
            }
        }
    });
};

const CanvasBoard = ({ roomId, baseRoomId, user, isReadOnly = false, roomName = "İlham Odası", roomCreatorId, boardType = "shared", selectedParticipantId }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [syncStatus, setSyncStatus] = useState('synced');
    const [activeUsersCount, setActiveUsersCount] = useState(1);
    const [participants, setParticipants] = useState([]);
    const participantsRef = useRef([]); // Listener için güncel liste
    const [taggableUsers, setTaggableUsers] = useState([]); // Mention atılabilecekler
    
    // tldraw store
    const store = useMemo(() => createTLStore({ shapeUtils: defaultShapeUtils }), []);

    // Sync status management refs
    const syncTimerRef = useRef(null);
    const lastSyncStartTimeRef = useRef(0);
    const MIN_SYNC_DISPLAY_TIME = 800; // ms
    const SYNC_SETTLE_TIME = 2000; // ms

    useEffect(() => {
        if (!roomId || !user) return;
        let isActive = true;

        // Katılımcıları çek (Mention eşleşmesi için)
        const fetchParticipants = async () => {
            try {
                // FIX: shared odalarda da ana oda dökümanını kullanmak için baseRoomId kullanımı
                const roomRef = doc(db, "rooms", baseRoomId || roomId.split('_')[0]);
                const roomSnap = await getDoc(roomRef);
                if (roomSnap.exists()) {
                    const uids = roomSnap.data().participants || [];
                    const profiles = await getUsersProfiles(uids);
                    setParticipants(profiles);
                    participantsRef.current = profiles;

                    // 🛡️ Bağlamsal Mention Filtreleme
                    if (boardType === 'shared') {
                        // Ortak oda: Herkes herkesi görebilir (kendisi hariç)
                        setTaggableUsers(profiles.filter(p => p.id !== user.uid));
                    } else {
                        // Bireysel oda: Öğrenci sadece Hocayı, Hoca sadece o Öğrenciyi görür
                        const creator = profiles.find(p => p.id === roomCreatorId);
                        const student = profiles.find(p => p.id === selectedParticipantId);
                        
                        if (user.uid === roomCreatorId) {
                            // Ben hocayım: Sadece o öğrenciyi etiketleyebilirim
                            setTaggableUsers(student ? [student] : []);
                        } else {
                            // Ben öğrenciyim: Sadece hocayı etiketleyebilirim
                            setTaggableUsers(creator ? [creator] : []);
                        }
                    }
                }
            } catch (err) {
                console.error("Participants fetch failed:", err);
            }
        };
        fetchParticipants();

        const ydoc = new Y.Doc();
        const yShapes = ydoc.getMap('shapes');
        
        let provider = null;
        // Sadece RTDB URL'si varsa provider'ı başlat
        if (import.meta.env.VITE_FIREBASE_DATABASE_URL) {
            provider = new FirebaseRTDBProvider(roomId, ydoc, {
                name: user.name || user.displayName || 'Anonim',
                id: user.uid,
                color: user.color || `#${Math.floor(Math.random()*16777215).toString(16)}`
            });

            // Awareness listener sadece provider varsa
            const handleAwarenessChange = () => {
                const states = provider.awareness.getStates();
                setActiveUsersCount(states.size);
            };
            provider.awareness.on('change', handleAwarenessChange);
        } else {
            console.warn("RTDB URL missing, skipping real-time sync. Only Firestore snapshots will work.");
        }

        let isUpdatingRemote = false;

        // 1. Yjs -> tldraw (Remote updates coming in)
        const handleYjsChange = () => {
            isUpdatingRemote = true;
            store.mergeRemoteChanges(() => {
                const remoteShapesMap = yShapes.toJSON();
                Object.values(remoteShapesMap).forEach((shape) => {
                    const existing = store.get(shape.id);
                    if (!existing || JSON.stringify(existing) !== JSON.stringify(shape)) {
                        store.put([shape]);
                    }
                });
                store.allRecords().forEach(record => {
                    if (record.typeName === 'shape' && !remoteShapesMap[record.id]) {
                        store.remove([record.id]);
                    }
                });
            });
            isUpdatingRemote = false;
            
            // Remote güncellemeler gelince hemen 'synced' deme, akışı bozma
            if (syncStatus === 'syncing') {
                const now = Date.now();
                const diff = now - lastSyncStartTimeRef.current;
                if (diff > MIN_SYNC_DISPLAY_TIME) {
                    setSyncStatus('synced');
                }
            }
            setIsLoaded(true);
        };

        yShapes.observe(handleYjsChange);

        // 2. tldraw -> Yjs (Local updates going out)
        const unlisten = store.listen((update) => {
            if (isUpdatingRemote) return;
            
            // Debounced Sync Status
            if (syncStatus !== 'syncing') {
                setSyncStatus('syncing');
                lastSyncStartTimeRef.current = Date.now();
            }

            if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
            
            ydoc.transact(() => {
                Object.values(update.changes.added).forEach(record => {
                    if (record.typeName === 'shape') {
                        // 👤 Attribution: Sadece gerçekten yeni olan (meta'sı olmayan) şekillere ekle
                        if (!record.meta?.creatorId) {
                            const meta = {
                                ...record.meta,
                                creatorId: user.uid,
                                creatorName: user.name || user.displayName || 'Sanatçı',
                                createdAt: Date.now()
                            };
                            const shapeToSync = { ...record, meta };
                            yShapes.set(record.id, shapeToSync);

                            if (record.type === 'text' && record.props.text?.includes('@')) {
                                handleMentions(record.props.text, roomId, roomName, user, taggableUsers);
                            }
                        } else {
                            yShapes.set(record.id, record);
                        }
                    }
                });
                Object.values(update.changes.updated).forEach(([oldRecord, newRecord]) => {
                    if (newRecord.typeName === 'shape') {
                        // FIX: Meta'nın korunmasını garanti edelim
                        const meta = newRecord.meta?.creatorId ? newRecord.meta : oldRecord.meta;
                        const shapeToSync = { ...newRecord, meta };
                        yShapes.set(newRecord.id, shapeToSync);

                        if (newRecord.type === 'text' && 
                            newRecord.props.text !== oldRecord.props.text && 
                            newRecord.props.text?.includes('@')) {
                            handleMentions(newRecord.props.text, roomId, roomName, user, taggableUsers);
                        }
                    }
                });
                Object.values(update.changes.removed).forEach(record => {
                    if (record.typeName === 'shape') yShapes.delete(record.id);
                });
            }, 'local');
            
            // Transition back to 'synced' after activity stops
            syncTimerRef.current = setTimeout(() => {
                const now = Date.now();
                const timeInSync = now - lastSyncStartTimeRef.current;
                
                // Minimum süre kontrolü - titremeyi engeller
                if (timeInSync >= MIN_SYNC_DISPLAY_TIME) {
                    setSyncStatus('synced');
                } else {
                    // Eğer minimum süreden önce bittiyse, kalanı bekle
                    syncTimerRef.current = setTimeout(() => {
                        setSyncStatus('synced');
                    }, MIN_SYNC_DISPLAY_TIME - timeInSync);
                }
            }, SYNC_SETTLE_TIME);
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
            setIsLoaded(true);
        };

        loadInitialSnapshot();

        // Safety Force Load (5 seconds)
        const safetyTimeout = setTimeout(() => {
            setIsLoaded(true);
        }, 5000);

        // 5. Listen for External Additions (e.g. from ArtsyExplorer) via RTDB
        const externalRef = ref(rtdb, `canvas_sync/${roomId}/external_shapes`);
        
        // Modular SDK: onChildAdded returns an unsubscribe function
        const unsubscribeExternal = onChildAdded(externalRef, (snapshot) => {
            const shape = snapshot.val();
            if (shape && shape.id) {
                ydoc.transact(() => {
                    yShapes.set(shape.id, shape);
                }, 'external');
                // Remove the message after processing
                remove(ref(rtdb, `canvas_sync/${roomId}/external_shapes/${snapshot.key}`));
            }
        });

        // 4. Periodic Snapshot to Firestore (CRITICAL: Only by owner & less frequent)
        const snapshotInterval = setInterval(async () => {
            // Sadece oda sahibi yedek alsın ve 15 dakikada bir (300000 * 3)
            const isOwner = user.uid === roomCreatorId;
            if (isReadOnly || !isActive || !isOwner) return;
            
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
        }, 900000); // 15 mins (was 5 mins)

        return () => {
            isActive = false;
            if (provider) provider.destroy();
            ydoc.destroy();
            unlisten();
            unsubscribeExternal(); 
            clearInterval(snapshotInterval);
            clearTimeout(safetyTimeout);
            if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
        };
    }, [roomId, store, user, isReadOnly, taggableUsers]); // taggableUsers eklendi

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
                    components={{
                        ...components,
                        OnTheCanvas: ({ children }) => (
                            <>
                                {children}
                                {!isReadOnly && (
                                    <MentionDropdown 
                                        participants={taggableUsers}
                                        onSelect={(targetUser) => {
                                            const editingId = editor.getEditingShapeId();
                                            if (editingId) {
                                                const shape = editor.getShape(editingId);
                                                const text = shape.props.text || '';
                                                const lastAtPos = text.lastIndexOf('@');
                                                const newText = text.slice(0, lastAtPos) + `@${targetUser.name} `;
                                                
                                                editor.updateShape({
                                                    id: editingId,
                                                    type: 'text',
                                                    props: { text: newText }
                                                });
                                            }
                                        }}
                                    />
                                )}
                            </>
                        )
                    }}
                    onMount={(editor) => {
                        window.editor = editor;
                    }}
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
