import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { approveRoomAccessRequest, rejectRoomAccessRequest } from '../services/dbService';
import { LucideCheck, LucideX, LucideBell, LucideUser, LucideLoader2, LucideSparkles, LucideMail, LucideFileText, LucideLayers } from 'lucide-react';

const AdminPanel = () => {
    const { isAdmin } = useAuth();
    const [requests, setRequests] = useState([]);
    const [isDashboardOpen, setIsDashboardOpen] = useState(false);
    const [processingId, setProcessingId] = useState(null);

    useEffect(() => {
        if (!isAdmin) return;

        const q = query(collection(db, "room_requests"), where("status", "==", "pending"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, [isAdmin]);

    const handleApprove = async (request) => {
        if (!confirm(`${request.userName} adlı kullanıcının ${request.roomName} odasına katılım isteğini onaylamak istiyor musunuz?`)) return;

        setProcessingId(request.id);
        try {
            await approveRoomAccessRequest(request);
            alert("Katılım isteği başarıyla onaylandı.");
        } catch (error) {
            alert("Hata oluştu: " + error.message);
        }
        setProcessingId(null);
    };

    const handleReject = async (requestId) => {
        if (!confirm("Bu katılım isteğini reddetmek istediğinize emin misiniz?")) return;

        setProcessingId(requestId);
        try {
            await rejectRoomAccessRequest(requestId);
            alert("Katılım isteği başarıyla reddedildi.");
        } catch (error) {
            alert("Hata oluştu: " + error.message);
        }
        setProcessingId(null);
    };

    if (!isAdmin) return null;

    return (
        <>
            {/* Bildirim Simgesi - Dashboard Tetikleyici */}
            <div className="fixed top-24 left-8 z-[150]">
                <button
                    onClick={() => setIsDashboardOpen(true)}
                    className="w-14 h-14 glass-card flex items-center justify-center text-accent-blue hover:scale-110 active:scale-95 transition-all shadow-xl border-accent-blue/20 relative group"
                >
                    <LucideBell size={24} className="group-hover:rotate-12 transition-transform" />
                    {requests.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white border-2 border-white shadow-lg animate-pulse">
                            {requests.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Premium Dashboard Modal */}
            {isDashboardOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-12 animate-in fade-in duration-500">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-text-main/10 backdrop-blur-3xl"
                        onClick={() => setIsDashboardOpen(false)}
                    />

                    {/* Dashboard Container */}
                    <div className="glass-card w-full max-w-6xl max-h-[90vh] flex flex-col relative z-10 overflow-hidden shadow-[0_32px_128px_-16px_rgba(0,0,0,0.3)] animate-in slide-in-from-bottom-8 duration-700">
                        {/* Header */}
                        <div className="p-8 border-b border-text-main/5 flex items-center justify-between bg-white/10">
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <h2 className="text-4xl font-serif">Hoca Dashboard</h2>
                                    <div className="bg-accent-blue/10 text-accent-blue px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase">Oda Katılım Yönetimi</div>
                                </div>
                                <p className="text-text-muted text-sm italic">Öğrencilerin oda katılım taleplerini incele ve onaylamanı yap.</p>
                            </div>
                            <button
                                onClick={() => setIsDashboardOpen(false)}
                                className="w-12 h-12 rounded-full flex items-center justify-center text-text-muted hover:bg-red-50 hover:text-red-500 transition-all"
                            >
                                <LucideX size={28} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-surface-light/20">
                            {requests.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center opacity-30 py-20">
                                    <div className="w-32 h-32 bg-text-main/5 rounded-full flex items-center justify-center mb-6">
                                        <LucideSparkles size={48} />
                                    </div>
                                    <h3 className="text-2xl font-serif mb-2 text-center text-text-main">Bekleyen İstek Yok</h3>
                                    <p className="text-sm text-center">Şu an onay bekleyen bir oda katılım talebi bulunmuyor.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {requests.map(req => (
                                        <div
                                            key={req.id}
                                            className="glass-card !bg-white/40 p-8 border-white/50 hover:border-accent-blue/40 transition-all group relative overflow-hidden flex flex-col justify-between"
                                        >
                                            {/* Name & Room Section */}
                                            <div className="relative z-10">
                                                <div className="flex items-center gap-4 mb-6">
                                                    <div className="w-14 h-14 bg-gradient-to-br from-accent-blue to-accent-blue/40 rounded-3xl flex items-center justify-center text-white text-xl font-serif shadow-lg group-hover:scale-110 transition-transform">
                                                        {req.userName.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-2xl font-medium tracking-tight text-text-main group-hover:text-accent-blue transition-colors">{req.userName}</h4>
                                                        <div className="flex items-center gap-1.5 text-text-muted text-xs">
                                                            <LucideMail size={12} /> {req.userEmail}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Target Room */}
                                                <div className="mb-8">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <LucideLayers size={14} className="text-accent-blue" />
                                                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">Katılmak İstediği Oda</span>
                                                    </div>
                                                    <div className="bg-white/60 p-5 rounded-3xl border border-white/80 text-lg font-medium text-text-main shadow-inner flex items-center gap-3">
                                                        <span className="text-2xl">🚪</span> {req.roomName}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex gap-4 relative z-10 pt-4 mt-auto">
                                                <button
                                                    disabled={!!processingId}
                                                    onClick={() => handleApprove(req)}
                                                    className="flex-[2] bg-accent-blue text-white py-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-3 hover:bg-accent-blue-hover hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-xl shadow-accent-blue/20"
                                                >
                                                    {processingId === req.id ? <LucideLoader2 size={18} className="animate-spin" /> : <LucideCheck size={18} />}
                                                    KATILIMI ONAYLA
                                                </button>
                                                <button
                                                    disabled={!!processingId}
                                                    onClick={() => handleReject(req.id)}
                                                    className="flex-1 bg-white/80 text-text-muted py-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-red-50 hover:text-red-500 hover:scale-[1.02] transition-all border border-white disabled:opacity-50"
                                                >
                                                    <LucideX size={18} /> REDDET
                                                </button>
                                            </div>

                                            {/* Decorative Background Element */}
                                            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-accent-blue/5 rounded-full blur-3xl group-hover:bg-accent-blue/10 transition-colors" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-white/5 border-t border-text-main/5 text-center">
                            <p className="text-[10px] uppercase tracking-widest text-text-muted opacity-60">Kibele2 İlham Odası Yönetim Sistemi © 2026</p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default AdminPanel;
