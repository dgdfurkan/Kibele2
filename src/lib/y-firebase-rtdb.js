import * as Y from 'yjs';
import { ref, onValue, set, off, push, onChildAdded, remove } from 'firebase/database';
import { rtdb } from '../firebase';
import { Awareness } from 'y-protocols/awareness';

/**
 * A bit more advanced Yjs provider for Firebase Realtime Database.
 * Includes Awareness support for cursors/presence.
 */
export class FirebaseRTDBProvider {
    constructor(roomId, ydoc, userInfo = {}) {
        this.roomId = roomId;
        this.ydoc = ydoc;
        this.awareness = new Awareness(ydoc);
        
        // Set local awareness state
        this.awareness.setLocalStateField('user', {
            name: userInfo.name || 'Sanatçı',
            color: userInfo.color || '#3399ff',
            ...userInfo
        });

        this.roomRef = ref(rtdb, `canvas_sync/${roomId}`);
        this.updatesRef = ref(rtdb, `canvas_sync/${roomId}/updates`);
        this.awarenessRef = ref(rtdb, `canvas_sync/${roomId}/awareness`);
        
        // 1. Remote updates listener
        // Modular SDK: onChildAdded returns an unsubscribe function
        this._unsubscribeUpdates = onChildAdded(this.updatesRef, (snapshot) => {
            const updateBase64 = snapshot.val();
            if (updateBase64 && this.ydoc && !this.ydoc.destroyed) {
                try {
                    const update = Uint8Array.from(atob(updateBase64), c => c.charCodeAt(0));
                    Y.applyUpdate(this.ydoc, update, this);
                } catch (e) {
                    console.error("Yjs update error:", e);
                }
            }
        });

        // 2. Local updates sender (Debounced to save bandwidth/costs)
        this._pendingUpdates = [];
        this._debounceTimer = null;

        this._ydocUpdateListener = (update, origin) => {
            if (origin !== this) {
                // Collect updates
                this._pendingUpdates.push(update);
                
                if (this._debounceTimer) clearTimeout(this._debounceTimer);
                
                this._debounceTimer = setTimeout(() => {
                    if (this._pendingUpdates.length > 0) {
                        try {
                            // Merge all pending updates into one for efficiency
                            const mergedUpdate = Y.mergeUpdates(this._pendingUpdates);
                            const updateBase64 = btoa(String.fromCharCode(...mergedUpdate));
                            push(this.updatesRef, updateBase64);
                            this._pendingUpdates = [];
                        } catch (e) {
                            console.error("Yjs update merge/push error:", e);
                        }
                    }
                }, 150); // 150ms debounce
            }
        };
        this.ydoc.on('update', this._ydocUpdateListener);

        // 3. Awareness (Presence) Sync (Also slightly debounced)
        this._awarenessDebounceTimer = null;
        this._awarenessUpdateListener = ({ added, updated, removed }, origin) => {
            if (origin !== 'remote') {
                if (this._awarenessDebounceTimer) clearTimeout(this._awarenessDebounceTimer);
                
                this._awarenessDebounceTimer = setTimeout(() => {
                    const state = this.awareness.getLocalState();
                    if (state) {
                        set(ref(rtdb, `canvas_sync/${roomId}/awareness/${this.ydoc.clientID}`), state);
                    }
                }, 200);
            }
        };
        this.awareness.on('update', this._awarenessUpdateListener);

        this._unsubscribeAwareness = onChildAdded(this.awarenessRef, (snapshot) => {
            const clientID = parseInt(snapshot.key);
            if (clientID !== this.ydoc.clientID) {
                const state = snapshot.val();
                this.awareness.setLocalState(state, 'remote');
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
