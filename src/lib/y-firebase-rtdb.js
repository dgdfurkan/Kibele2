import * as Y from 'yjs';
import { ref, onValue, set, push, onChildAdded, remove, get } from 'firebase/database';
import { rtdb } from '../firebase';
import { Awareness } from 'y-protocols/awareness';
import { IndexeddbPersistence } from 'y-indexeddb';

export class FirebaseRTDBProvider {
    constructor(roomId, ydoc, userInfo = {}) {
        this.roomId = roomId;
        this.ydoc = ydoc;
        this.awareness = new Awareness(ydoc);
        
        // 0. Local Persistence (IndexedDB) - Reduces initial download
        this.indexeddb = new IndexeddbPersistence(roomId, ydoc);
        
        // Awareness state
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

        // 1. Initial Sync: Load Snapshot from DB once
        this._initSnapshot();

        // 2. Remote updates listener (Deltas after snapshot)
        this._unsubscribeUpdates = onChildAdded(this.updatesRef, (snapshot) => {
            const updateBase64 = snapshot.val();
            if (updateBase64 && this.ydoc && !this.ydoc.destroyed) {
                try {
                    const update = Uint8Array.from(atob(updateBase64), c => c.charCodeAt(0));
                    Y.applyUpdate(this.ydoc, update, this);
                    
                    this._updateCount++;
                    // GC: Every 150 updates, merge into snapshot to save bandwidth
                    if (this._updateCount > 150 && !this._isCompacting) {
                        this._compactHistory();
                    }
                } catch (e) {
                    console.error("Yjs update error:", e);
                }
            }
        });

        // 3. Local updates sender (Debounced & Merged)
        this._pendingUpdates = [];
        this._debounceTimer = null;

        this._ydocUpdateListener = (update, origin) => {
            if (origin !== this && origin !== this.indexeddb) { // Don't loop with IndexedDB
                this._pendingUpdates.push(update);
                if (this._debounceTimer) clearTimeout(this._debounceTimer);
                this._debounceTimer = setTimeout(() => {
                    if (this._pendingUpdates.length > 0) {
                        try {
                            const mergedUpdate = Y.mergeUpdates(this._pendingUpdates);
                            const updateBase64 = btoa(String.fromCharCode(...mergedUpdate));
                            push(this.updatesRef, updateBase64);
                            this._pendingUpdates = [];
                        } catch (e) { console.error("Update push error:", e); }
                    }
                }, 200);
            }
        };
        this.ydoc.on('update', this._ydocUpdateListener);

        // 4. Awareness (Presence) Sync
        this._awarenessDebounceTimer = null;
        this._awarenessUpdateListener = ({ added, updated, removed }, origin) => {
            if (origin !== 'remote') {
                if (this._awarenessDebounceTimer) clearTimeout(this._awarenessDebounceTimer);
                this._awarenessDebounceTimer = setTimeout(() => {
                    const state = this.awareness.getLocalState();
                    if (state) {
                        set(ref(rtdb, `canvas_sync/${roomId}/awareness/${this.ydoc.clientID}`), state);
                    }
                }, 500); // Slower awareness updates to save traffic
            }
        };
        this.awareness.on('update', this._awarenessUpdateListener);

        this._unsubscribeAwareness = onChildAdded(this.awarenessRef, (snapshot) => {
            const clientID = parseInt(snapshot.key);
            if (clientID !== this.ydoc.clientID) {
                this.awareness.setLocalState(snapshot.val(), 'remote');
            }
        });

        // Cleanup on disconnect
        const presenceRef = ref(rtdb, `canvas_sync/${roomId}/awareness/${this.ydoc.clientID}`);
        this._unsubscribeConnected = onValue(ref(rtdb, '.info/connected'), (snap) => {
            if (snap.val() === true) {
                import('firebase/database').then(({ onDisconnect }) => {
                    onDisconnect(presenceRef).remove();
                });
            }
        });
    }

    async _initSnapshot() {
        try {
            const snap = await get(this.snapshotRef);
            if (snap.exists()) {
                const base64 = snap.val();
                const update = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
                Y.applyUpdate(this.ydoc, update, 'initial');
            }
        } catch (e) {
            console.error("Snapshot load error:", e);
        }
    }

    async _compactHistory() {
        this._isCompacting = true;
        try {
            // Encode current state as a single "atomic" update
            const snapshot = Y.encodeStateAsUpdate(this.ydoc);
            const base64 = btoa(String.fromCharCode(...snapshot));
            
            // Save as new base snapshot and CLEAR updates list
            await set(this.snapshotRef, base64);
            await remove(this.updatesRef);
            
            this._updateCount = 0;
            console.log("Canvas history compacted successfully! 🧹✨");
        } catch (e) {
            console.error("Compaction error:", e);
        } finally {
            this._isCompacting = false;
        }
    }

    destroy() {
        // Modular SDK cleanup: call unsubscribe functions
        if (this._unsubscribeUpdates) this._unsubscribeUpdates();
        if (this._unsubscribeAwareness) this._unsubscribeAwareness();
        if (this._unsubscribeConnected) this._unsubscribeConnected();
        
        // Remove Yjs/Awareness listeners
        if (this.ydoc) {
            this.ydoc.off('update', this._ydocUpdateListener);
        }
        if (this.awareness) {
            this.awareness.off('update', this._awarenessUpdateListener);
            this.awareness.destroy();
        }

        // Final presence cleanup
        set(ref(rtdb, `canvas_sync/${this.roomId}/awareness/${this.ydoc.clientID}`), null);
    }
}
