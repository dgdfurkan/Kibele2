import { ref, onValue, set, push, onChildAdded, onChildChanged, onChildRemoved, remove, get } from 'firebase/database';
import { rtdb } from '../firebase';
import { Awareness } from 'y-protocols/awareness';
import { IndexeddbPersistence } from 'y-indexeddb';

export class FirebaseRTDBProvider {
    constructor(roomId, ydoc, userInfo = {}) {
        this.roomId = roomId;
        this.ydoc = ydoc;
        this.awareness = new Awareness(ydoc);
        
        // 0. Local Persistence (IndexedDB)
        this.indexeddb = new IndexeddbPersistence(roomId, ydoc);
        
        this.awareness.setLocalStateField('user', {
            name: userInfo.name || 'Sanatçı',
            color: userInfo.color || '#3399ff',
            ...userInfo
        });

        this.roomRef = ref(rtdb, `canvas_sync/${roomId}`);
        this.snapshotRef = ref(rtdb, `canvas_sync/${roomId}/snapshot`);
        this.updatesRef = ref(rtdb, `canvas_sync/${roomId}/updates`);
        this.awarenessRef = ref(rtdb, `canvas_sync/${roomId}/awareness`);
        
        this._updateCount = 0;
        this._isCompacting = false;

        // 1. Initial Load: Snapshot
        this._initSnapshot();

        // 2. Remote updates listener
        this._unsubscribeUpdates = onChildAdded(this.updatesRef, (snapshot) => {
            const updateBase64 = snapshot.val();
            if (updateBase64 && this.ydoc && !this.ydoc.destroyed) {
                try {
                    const update = Uint8Array.from(atob(updateBase64), c => c.charCodeAt(0));
                    Y.applyUpdate(this.ydoc, update, this);
                    
                    this._updateCount++;
                    // GC: Every 100 updates, merge into snapshot
                    if (this._updateCount > 100 && !this._isCompacting) {
                        this._compactHistory();
                    }
                } catch (e) { console.error("Update error:", e); }
            }
        });

        // 3. Local updates sender
        this._pendingUpdates = [];
        this._debounceTimer = null;

        this._ydocUpdateListener = (update, origin) => {
            if (origin !== this && origin !== this.indexeddb) {
                this._pendingUpdates.push(update);
                if (this._debounceTimer) clearTimeout(this._debounceTimer);
                this._debounceTimer = setTimeout(() => {
                    if (this._pendingUpdates.length > 0) {
                        try {
                            const mergedUpdate = Y.mergeUpdates(this._pendingUpdates);
                            const updateBase64 = btoa(String.fromCharCode(...mergedUpdate));
                            push(this.updatesRef, updateBase64);
                            this._pendingUpdates = [];
                        } catch (e) { console.error("Sync error:", e); }
                    }
                }, 250);
            }
        };
        this.ydoc.on('update', this._ydocUpdateListener);

        // 4. Awareness (Cursors) - FULL SYNC
        this._awarenessDebounceTimer = null;
        this._awarenessUpdateListener = ({ added, updated, removed }, origin) => {
            if (origin !== 'remote') {
                if (this._awarenessDebounceTimer) clearTimeout(this._awarenessDebounceTimer);
                this._awarenessDebounceTimer = setTimeout(() => {
                    const state = this.awareness.getLocalState();
                    if (state) {
                        set(ref(rtdb, `canvas_sync/${roomId}/awareness/${this.ydoc.clientID}`), state);
                    }
                }, 400); // Debounce cursor traffic
            }
        };
        this.awareness.on('update', this._awarenessUpdateListener);

        // Listen for all awareness events
        this._listeners = [
            onChildAdded(this.awarenessRef, (snap) => {
                const id = parseInt(snap.key);
                if (id !== this.ydoc.clientID) this.awareness.setLocalState(snap.val(), 'remote');
            }),
            onChildChanged(this.awarenessRef, (snap) => {
                const id = parseInt(snap.key);
                if (id !== this.ydoc.clientID) this.awareness.setLocalState(snap.val(), 'remote');
            }),
            onChildRemoved(this.awarenessRef, (snap) => {
                const id = parseInt(snap.key);
                if (id !== this.ydoc.clientID) this.awareness.removeMember(id);
            })
        ];

        // Disconnect cleanup
        onValue(ref(rtdb, '.info/connected'), (snap) => {
            if (snap.val() === true) {
                import('firebase/database').then(({ onDisconnect, ref }) => {
                    const presenceRef = ref(rtdb, `canvas_sync/${roomId}/awareness/${this.ydoc.clientID}`);
                    onDisconnect(presenceRef).remove();
                });
            }
        });
    }

    async _initSnapshot() {
        try {
            const snap = await get(this.snapshotRef);
            if (snap.exists()) {
                const update = Uint8Array.from(atob(snap.val()), c => c.charCodeAt(0));
                Y.applyUpdate(this.ydoc, update, 'initial');
            }
        } catch (e) { console.error("Snapshot error:", e); }
    }

    async _compactHistory() {
        if (this._isCompacting) return;
        this._isCompacting = true;
        try {
            const snapshot = Y.encodeStateAsUpdate(this.ydoc);
            const base64 = btoa(String.fromCharCode(...snapshot));
            await set(this.snapshotRef, base64);
            await remove(this.updatesRef);
            this._updateCount = 0;
            console.log("History GC completed 🧹");
        } catch (e) { console.error("GC error:", e); } finally {
            this._isCompacting = false;
        }
    }

    destroy() {
        if (this._unsubscribeUpdates) this._unsubscribeUpdates();
        if (this._listeners) this._listeners.forEach(unsub => unsub());
        
        if (this.ydoc) this.ydoc.off('update', this._ydocUpdateListener);
        if (this.awareness) {
            this.awareness.off('update', this._awarenessUpdateListener);
            this.awareness.destroy();
        }
        
        set(ref(rtdb, `canvas_sync/${this.roomId}/awareness/${this.ydoc.clientID}`), null);
    }
}
