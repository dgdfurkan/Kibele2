import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { adminApproveAndCreateAccount } from '../services/dbService';
import { LucideCheck, LucideX, LucideBell, LucideUser, LucideLoader2 } from 'lucide-react';

const AdminPanel = () => {
    const { isAdmin } = useAuth();
    const [requests, setRequests] = useState([]);
    const [processingId, setProcessingId] = useState(null);

    useEffect(() => {
        if (!isAdmin) return;

        const q = query(collection(db, "access_requests"), where("status", "==", "pending"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, [isAdmin]);

    const handleApprove = async (request) => {
        if (!confirm(`${request.name} adlı kullanıcının hesabını onaylayıp oluşturmak istiyor musunuz?`)) return;

        setProcessingId(request.id);
        try {
            await adminApproveAndCreateAccount(request);
            alert("Hesap başarıyla oluşturuldu ve onaylandı.");
        } catch (error) {
            alert("Hata oluştu: " + error.message);
        }
        setProcessingId(null);
    };

    if (!isAdmin) return null;

    return (
        <div className="fixed top-24 left-8 z-50">
            <div className="relative group">
                <button className="w-12 h-12 glass-card flex items-center justify-center text-accent-blue hover:bg-accent-blue hover:text-white transition-all shadow-lg">
                    <LucideBell size={20} />
                    {requests.length > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white border-2 border-white animate-pulse">{requests.length}</span>}
                </button>

                <div className="absolute top-0 left-full ml-4 w-[400px] glass-card p-6 opacity-0 translate-x-4 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 group-hover:pointer-events-auto transition-all duration-500 shadow-2xl border-accent-blue/20">
                    <div className="flex items-center justify-between mb-6 border-b border-text-main/5 pb-4">
                        <h3 className="font-serif text-xl">Onay Bekleyenler</h3>
                        <span className="text-[10px] uppercase tracking-widest text-text-muted">{requests.length} TALEP</span>
                    </div>

                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {requests.length === 0 ? (
                            <div className="text-center py-10 opacity-40">
                                <LucideUser size={32} className="mx-auto mb-2" />
                                <p className="text-xs italic">Şu an inceleme bekleyen bir başvuru bulunmuyor.</p>
                            </div>
                        ) : requests.map(req => (
                            <div key={req.id} className="p-5 bg-surface-light rounded-[2rem] border border-text-main/5 text-sm transition-all hover:border-accent-blue/30">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="font-medium text-lg">{req.name}</div>
                                    <span className="text-[9px] bg-accent-blue/10 text-accent-blue px-2 py-0.5 rounded-full uppercase tracking-tighter italic">Yeni Talep</span>
                                </div>
                                <div className="text-xs text-text-muted mb-4 pb-4 border-b border-text-main/5">{req.email}</div>

                                <div className="mb-6">
                                    <div className="text-[9px] uppercase tracking-widest text-text-muted mb-2">Tanıtım & Motivasyon</div>
                                    <p className="text-xs text-text-main leading-relaxed italic bg-white/50 p-3 rounded-xl border border-dashed border-text-main/10">
                                        "{req.intro || 'Kendini tanıtıcı bir metin bırakmamış.'}"
                                    </p>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        disabled={!!processingId}
                                        onClick={() => handleApprove(req)}
                                        className="flex-1 bg-accent-blue text-white py-3 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 hover:bg-accent-blue-hover transition-all disabled:opacity-50 shadow-md shadow-accent-blue/10"
                                    >
                                        {processingId === req.id ? <LucideLoader2 size={14} className="animate-spin" /> : <LucideCheck size={14} />}
                                        Hesabı Oluştur & Onayla
                                    </button>
                                    <button className="w-12 h-12 bg-surface-light text-text-muted rounded-2xl flex items-center justify-center hover:text-red-500 hover:bg-red-50 transition-all">
                                        <LucideX size={16} />
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
