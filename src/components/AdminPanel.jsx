import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { approveAccessRequest } from '../services/dbService';
import { LucideCheck, LucideX, LucideBell } from 'lucide-react';

const AdminPanel = () => {
    const { user, isAdmin } = useAuth();
    const [requests, setRequests] = useState([]);

    useEffect(() => {
        if (!isAdmin) return;

        const q = query(collection(db, "access_requests"), where("status", "==", "pending"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, [isAdmin]);

    if (!isAdmin) return null;

    return (
        <div className="fixed top-24 left-8 z-50">
            <div className="relative group">
                <button className="w-12 h-12 glass-card flex items-center justify-center text-accent-blue hover:bg-accent-blue hover:text-white transition-all">
                    <LucideBell size={20} />
                    {requests.length > 0 && <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white">{requests.length}</span>}
                </button>

                <div className="absolute top-full left-0 mt-4 w-80 glass-card p-6 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-500">
                    <h3 className="font-serif text-lg mb-4">Hoca Paneli</h3>
                    <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                        {requests.length === 0 ? (
                            <p className="text-xs text-text-muted italic">Yeni talep yok canım.</p>
                        ) : requests.map(req => (
                            <div key={req.id} className="p-4 bg-surface-light/30 rounded-2xl border border-text-main/5 text-sm">
                                <div className="font-medium mb-1">{req.name}</div>
                                <div className="text-xs text-text-muted mb-3">{req.email}</div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => approveAccessRequest(req.id, req.userId)}
                                        className="flex-1 bg-accent-blue text-white py-2 rounded-xl text-xs flex items-center justify-center gap-1 hover:bg-accent-blue-hover transition-colors"
                                    >
                                        <LucideCheck size={14} /> Onayla
                                    </button>
                                    <button className="flex-1 bg-surface-light text-text-muted py-2 rounded-xl text-xs flex items-center justify-center gap-1">
                                        <LucideX size={14} /> Reddet
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
