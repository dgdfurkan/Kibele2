import * as Y from 'yjs';
import { ref, onValue, set, off, push, onChildAdded } from 'firebase/database';
import { rtdb } from '../firebase';

/**
 * A basic Yjs provider for Firebase Realtime Database.
 * It sends binary updates as base64 strings to a 'updates' list in RTDB.
 */
export class FirebaseRTDBProvider {
    constructor(roomId, ydoc) {
        this.roomId = roomId;
        this.ydoc = ydoc;
        this.roomRef = ref(rtdb, `canvas_sync/${roomId}`);
        this.updatesRef = ref(rtdb, `canvas_sync/${roomId}/updates`);
        
        // Listen for remote updates
        this._listener = onChildAdded(this.updatesRef, (snapshot) => {
            const updateBase64 = snapshot.val();
            if (updateBase64) {
                const update = Uint8Array.from(atob(updateBase64), c => c.charCodeAt(0));
                Y.applyUpdate(this.ydoc, update, this);
            }
        });

        // Send local updates
        this.ydoc.on('update', (update, origin) => {
            if (origin !== this) {
                const updateBase64 = btoa(String.fromCharCode(...update));
                push(this.updatesRef, updateBase64);
            }
        });
    }

    destroy() {
        off(this.updatesRef, 'child_added', this._listener);
        this.ydoc.off('update', this.onUpdate);
    }
}
