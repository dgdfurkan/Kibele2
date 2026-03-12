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
        this._listener = onChildAdded(this.updatesRef, (snapshot) => {
            const updateBase64 = snapshot.val();
            if (updateBase64) {
                const update = Uint8Array.from(atob(updateBase64), c => c.charCodeAt(0));
                Y.applyUpdate(this.ydoc, update, this);
            }
        });

        // 2. Local updates sender
        this.ydoc.on('update', (update, origin) => {
            if (origin !== this) {
                const updateBase64 = btoa(String.fromCharCode(...update));
                push(this.updatesRef, updateBase64);
            }
        });

        // 3. Awareness (Presence) Sync
        this.awareness.on('update', ({ added, updated, removed }, origin) => {
            if (origin !== 'remote') {
                const state = this.awareness.getLocalState();
                if (state) {
                    set(ref(rtdb, `canvas_sync/${roomId}/awareness/${this.ydoc.clientID}`), state);
                }
            }
        });

        this._awarenessListener = onChildAdded(this.awarenessRef, (snapshot) => {
            const clientID = parseInt(snapshot.key);
            if (clientID !== this.ydoc.clientID) {
                const state = snapshot.val();
                this.awareness.setLocalState(state, 'remote');
            }
        });

        // Cleanup on disconnect
        const presenceRef = ref(rtdb, `canvas_sync/${roomId}/awareness/${this.ydoc.clientID}`);
        onValue(ref(rtdb, '.info/connected'), (snap) => {
            if (snap.val() === true) {
                // Note: Standard RTDB onDisconnect for presence cleanup
                import('firebase/database').then(({ onDisconnect }) => {
                    onDisconnect(presenceRef).remove();
                });
            }
        });
    }

    destroy() {
        off(this.updatesRef, 'child_added', this._listener);
        off(this.awarenessRef, 'child_added', this._awarenessListener);
        set(ref(rtdb, `canvas_sync/${this.roomId}/awareness/${this.ydoc.clientID}`), null);
        this.awareness.destroy();
    }
}
