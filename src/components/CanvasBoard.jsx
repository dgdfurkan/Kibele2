import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Tldraw, createTLStore, defaultShapeUtils, track, useEditor, useSelectionEvents } from 'tldraw';
import 'tldraw/tldraw.css';
import * as Y from 'yjs';
import { FirebaseRTDBProvider } from '../lib/y-firebase-rtdb';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, onChildAdded, remove } from 'firebase/database';
import { db, rtdb } from '../firebase';
import { sendNotification, getUsersProfiles } from '../services/dbService';

// --- Custom Components for tldraw ---

// Zarif bir şekilde şekil sahibini gösteren bileşen
const CustomSelectionForeground = track(({ boundShapes }) => {
    const editor = useEditor();
    const selectionIds = editor.getSelectedShapeIds();
    
    // Sadece tek bir şekil seçiliyse sahibini göster
    if (selectionIds.length !== 1) return null;
    
    const shape = editor.getShape(selectionIds[0]);
    if (!shape || !shape.meta?.creatorName) return null;

    const bounds = editor.getShapePageBounds(shape);
    if (!bounds) return null;

    // Viewport koordinatlarına dönüştürerek zoom'dan etkilenmemesini sağlayalım
    const pagePoint = { x: bounds.minX, y: bounds.minY };
    const viewportPoint = editor.pageToViewport(pagePoint);

    return (
        <div 
            style={{
                position: 'fixed', // tldraw overlay katmanında viewport'a sabitlemek için
                top: viewportPoint.y - 12,
                left: viewportPoint.x,
                transform: 'translateY(-100%)',
                padding: '4px 12px',
                background: 'rgba(79, 70, 229, 0.98)', // Indigo-600
                backdropFilter: 'blur(12px)',
                color: 'white',
                fontSize: '11px',
                fontWeight: '900',
                borderRadius: '10px',
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
                boxShadow: '0 8px 24px rgba(79, 70, 229, 0.3)',
                zIndex: 99999,
                textTransform: 'none', // AI-like büyük harf yerine doğal
                letterSpacing: '-0.01em',
                border: '1px solid rgba(255,255,255,0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
            }}
        >
            <span style={{ opacity: 0.8 }}>✍️</span>
            <span>{shape.meta.creatorName}</span>
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
    
    const lastAtPos = text.lastIndexOf('@');
    if (lastAtPos === -1) return null;

    const query = text.slice(lastAtPos + 1).toLowerCase();
    if (query.includes(' ')) return null;

    const filtered = participants.filter(p => 
        (p.name || p.displayName || '').toLowerCase().includes(query)
    ).slice(0, 5);

    if (filtered.length === 0) return null;

    const bounds = editor.getShapePageBounds(shape);
    if (!bounds) return null;
    const viewportBounds = editor.pageToViewport({ x: bounds.minX, y: bounds.maxY });

    return (
        <div 
            className="fixed z-[100000] bg-white/95 backdrop-blur-2xl border border-indigo-100 rounded-2xl shadow-[0_20px_50px_rgba(79,70,229,0.2)] p-1.5 w-52 animate-in fade-in zoom-in-95 duration-200"
            style={{
                top: viewportBounds.y + 12,
                left: viewportBounds.x
            }}
        >
            <div className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-indigo-500/60 border-b border-indigo-50/50 mb-1.5 flex items-center justify-between">
                <span>Etiketle ✨</span>
                <span className="text-[8px] bg-indigo-50 px-1.5 py-0.5 rounded-full text-indigo-400">{filtered.length} Kişi</span>
            </div>
            {filtered.map(p => (
                <button
                    key={p.id}
                    onMouseDown={(e) => {
                        e.preventDefault();
                        onSelect(p);
                    }}
                    className="w-full flex items-center gap-3 px-2.5 py-2.5 hover:bg-indigo-50/80 rounded-xl transition-all text-left group"
                >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-white text-indigo-600 flex items-center justify-center text-xs font-black shadow-sm border border-indigo-50">
                        {p.name?.charAt(0).toUpperCase() || '👤'}
                    </div>
                    <div>
                        <div className="text-[12px] font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{p.name}</div>
                        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{p.role === 'hoca' ? '🎓 Hoca' : '🎨 Sanatçı'}</div>
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
    const [activeUsers, setActiveUsers] = useState([]); // Array of { id, name, color }
    const [participants, setParticipants] = useState([]);
    const participantsRef = useRef([]); 
    const [taggableUsers, setTaggableUsers] = useState([]); 
    
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
        const yStore = ydoc.getMap('store'); // Full store sync (shapes, pages, assets)
        
        let provider = null;
        if (import.meta.env.VITE_FIREBASE_DATABASE_URL) {
            provider = new FirebaseRTDBProvider(roomId, ydoc, {
                name: user.name || user.displayName || 'Anonim',
                id: user.uid,
                color: user.color || `#${Math.floor(Math.random()*16777215).toString(16)}`
            });

            const handleAwarenessChange = () => {
                const states = provider.awareness.getStates();
                const onlineUsers = Array.from(states.values()).map(s => ({
                    id: s.user?.id,
                    name: s.user?.name,
                    color: s.user?.color
                })).filter(u => u.id); // Valid users only
                setActiveUsers(onlineUsers);
            };
            provider.awareness.on('change', handleAwarenessChange);
        } else {
            console.warn("RTDB URL missing, skipping real-time sync. Only Firestore snapshots will work.");
        }

        let isUpdatingRemote = false;

        // 1. Yjs -> tldraw (Full sync)
        const handleYjsChange = () => {
            isUpdatingRemote = true;
            store.mergeRemoteChanges(() => {
                const remoteData = yStore.toJSON();
                
                // Add/Update
                Object.values(remoteData).forEach((record) => {
                    const existing = store.get(record.id);
                    if (!existing || JSON.stringify(existing) !== JSON.stringify(record)) {
                        store.put([record]);
                    }
                });

                // Remove
                store.allRecords().forEach(record => {
                    // Sadece paylaşılan tipleri sil (bazı tipler yerel olmalı)
                    const syncableTypes = ['shape', 'page', 'asset', 'instance_page_state'];
                    if (syncableTypes.includes(record.typeName) && !remoteData[record.id]) {
                        store.remove([record.id]);
                    }
                });
            });
            isUpdatingRemote = false;
            
            if (syncStatus === 'syncing') {
                const now = Date.now();
                const diff = now - lastSyncStartTimeRef.current;
                if (diff > MIN_SYNC_DISPLAY_TIME) setSyncStatus('synced');
            }
            setIsLoaded(true);
        };

        yStore.observe(handleYjsChange);

        // 2. tldraw -> Yjs (Full sync)
        const unlisten = store.listen((update) => {
            if (isUpdatingRemote) return;
            
            if (syncStatus !== 'syncing') {
                setSyncStatus('syncing');
                lastSyncStartTimeRef.current = Date.now();
            }

            if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
            
            ydoc.transact(() => {
                const syncableTypes = ['shape', 'page', 'asset', 'instance_page_state'];

                // ADDED
                Object.values(update.changes.added).forEach(record => {
                    if (syncableTypes.includes(record.typeName)) {
                        if (record.typeName === 'shape' && !record.meta?.creatorId) {
                            const meta = {
                                ...record.meta,
                                creatorId: user.uid,
                                creatorName: user.name || user.displayName || 'Sanatçı',
                                createdAt: Date.now()
                            };
                            yStore.set(record.id, { ...record, meta });

                            if (record.type === 'text' && record.props.text?.includes('@')) {
                                handleMentions(record.props.text, roomId, roomName, user, taggableUsers);
                            }
                        } else {
                            yStore.set(record.id, record);
                        }
                    }
                });

                // UPDATED
                Object.values(update.changes.updated).forEach(([oldRecord, newRecord]) => {
                    if (syncableTypes.includes(newRecord.typeName)) {
                        let finalRecord = newRecord;
                        if (newRecord.typeName === 'shape') {
                            const meta = newRecord.meta?.creatorId ? newRecord.meta : oldRecord.meta;
                            finalRecord = { ...newRecord, meta };
                            
                            if (newRecord.type === 'text' && 
                                newRecord.props.text !== oldRecord.props.text && 
                                newRecord.props.text?.includes('@')) {
                                handleMentions(newRecord.props.text, roomId, roomName, user, taggableUsers);
                            }
                        }
                        yStore.set(newRecord.id, finalRecord);
                    }
                });

                // REMOVED
                Object.values(update.changes.removed).forEach(record => {
                    if (syncableTypes.includes(record.typeName)) {
                        yStore.delete(record.id);
                    }
                });
            }, 'local');
            
            syncTimerRef.current = setTimeout(() => {
                const now = Date.now();
                const timeInSync = now - lastSyncStartTimeRef.current;
                if (timeInSync >= MIN_SYNC_DISPLAY_TIME) setSyncStatus('synced');
                else syncTimerRef.current = setTimeout(() => setSyncStatus('synced'), MIN_SYNC_DISPLAY_TIME - timeInSync);
            }, SYNC_SETTLE_TIME);
        });

        const loadInitialSnapshot = async () => {
            if (!isActive) return;
            try {
                const docRef = doc(db, `rooms/${roomId}/canvas/data`);
                const snap = await getDoc(docRef);
                if (snap.exists() && isActive) {
                    const data = snap.data();
                    if (data.records && yStore.size === 0) {
                        ydoc.transact(() => {
                            Object.entries(data.records).forEach(([id, record]) => {
                                yStore.set(id, record);
                            });
                        });
                    }
                }
            } catch (error) {
                console.error("Initial load failed:", error);
            }
            if (isActive) setIsLoaded(true);
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

        // 4. Periodic Snapshot to Firestore (Once every 5 mins for backup)
        let snapshotInterval = setInterval(async () => {
            if (isReadOnly || !isActive) return;
            const currentRecords = yStore.toJSON();
            if (Object.keys(currentRecords).length > 0) {
                try {
                    await setDoc(doc(db, `rooms/${roomId}/canvas/data`), {
                        records: currentRecords,
                        lastSnapshot: new Date().toISOString()
                    }, { merge: true });
                } catch (e) {
                    console.warn("Snapshot backup failed", e);
                }
            }
        }, 300000); // 5 mins

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
                        
                        // Kullanıcı tercihlerini yükle
                        const loadUserPrefs = async () => {
                            try {
                                const prefRef = doc(db, `users/${user.uid}/preferences/canvas`);
                                const snap = await getDoc(prefRef);
                                if (snap.exists()) {
                                    const prefs = snap.data();
                                    if (prefs.isGridMode !== undefined) {
                                        editor.user.updateUserPreferences({ isGridMode: prefs.isGridMode });
                                    }
                                }
                            } catch (e) {
                                console.warn("User prefs load failed:", e);
                            }
                        };
                        loadUserPrefs();
                    }}
                />
            </div>

            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
                <div className="flex -space-x-3 overflow-hidden pointer-events-auto hover:space-x-1 transition-all">
                    {activeUsers.map((u, i) => (
                        <div 
                            key={`${u.id}-${i}`}
                            className="w-10 h-10 rounded-full border-4 border-white shadow-xl flex items-center justify-center text-[11px] font-black uppercase tracking-tighter cursor-pointer hover:-translate-y-2 transition-transform"
                            style={{ background: u.color || '#6366f1', color: 'white' }}
                            title={u.name}
                        >
                            {u.name?.charAt(0).toUpperCase()}
                        </div>
                    ))}
                    {activeUsers.length > 5 && (
                        <div className="w-10 h-10 rounded-full border-4 border-white bg-slate-100 flex items-center justify-center text-[10px] font-extrabold text-slate-400">
                            +{activeUsers.length - 5}
                        </div>
                    )}
                </div>
            </div>

            <div className="absolute bottom-6 right-6 z-[10] flex flex-col items-end gap-3">
                <div className="glass-card px-4 py-2 bg-white/60 backdrop-blur-xl border-white/40 shadow-2xl flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${syncStatus === 'syncing' ? 'bg-blue-500 animate-pulse' : 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]'}`} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                            {syncStatus === 'syncing' ? 'Buluta Senkronize Oluyor...' : 'Buluta Kaydedildi'}
                        </span>
                    </div>
                    <div className="h-4 w-[1px] bg-slate-200" />
                    <button 
                        onClick={() => {
                            const current = window.editor.user.getUserPreferences().isGridMode;
                            window.editor.user.updateUserPreferences({ isGridMode: !current });
                            // RTDB'ye kişisel ayarı kaydet
                            setDoc(doc(db, `users/${user.uid}/preferences/canvas`), { isGridMode: !current }, { merge: true });
                        }}
                        className="text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-700 transition-colors"
                    >
                        Izgara: {window.editor?.user.getUserPreferences().isGridMode ? 'Açık' : 'Kapalı'}
                    </button>
                </div>
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
