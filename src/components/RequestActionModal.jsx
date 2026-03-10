import React, { useState, useEffect } from 'react';
import { LucideX, LucideUser, LucideMessageSquare, LucideCheck, LucideXCircle, LucideLoader } from 'lucide-react';
import { getRequestById, approveRoomAccessRequest, rejectRoomAccessRequest } from '../services/dbService';
import { useToast } from '../context/ToastContext';

const RequestActionModal = ({ requestId, isOpen, onClose }) => {
    const { showToast } = useToast();
    const [request, setRequest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        if (isOpen && requestId) {
            fetchRequest();
        }
    }, [isOpen, requestId]);

    const fetchRequest = async () => {
        setLoading(true);
        const data = await getRequestById(requestId);
        setRequest(data);
        setLoading(false);
    };

    const handleAction = async (approved) => {
        if (!request) return;
        setActionLoading(true);
        try {
            if (approved) {
                await approveRoomAccessRequest(request);
                showToast("Katılım isteği onaylandı! ✨");
            } else {
                await rejectRoomAccessRequest(request);
                showToast("Katılım isteği reddedildi.");
            }
            onClose();
        } catch (error) {
            showToast("İşlem yapılırken bir hata oluştu.", "error");
        } finally {
            setActionLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

            <div className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-8">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-2xl font-display font-bold">Katılım İsteği</h2>
                        <button onClick={onClose} className="p-2 hover:bg-surface-light rounded-full transition-all">
                            <LucideX size={20} />
                        </button>
                    </div>

                    {loading ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-4">
                            <LucideLoader className="animate-spin text-accent-blue" size={32} />
                            <p className="text-sm text-text-muted">İstek detayları yükleniyor...</p>
                        </div>
                    ) : request ? (
                        <div className="space-y-6">
                            <div className="flex items-center gap-4 p-4 bg-surface-light rounded-2xl">
                                <div className="w-12 h-12 rounded-xl bg-accent-blue/10 flex items-center justify-center text-accent-blue">
                                    <LucideUser size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg leading-snug">{request.userName}</h3>
                                    <p className="text-xs text-text-muted">{request.userEmail}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted block mb-1">Oda</span>
                                    <p className="font-medium">{request.roomName}</p>
                                </div>

                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted block mb-1">Katılım Nedeni</span>
                                    <div className="p-4 bg-surface-light/50 rounded-2xl italic text-sm text-text-main leading-relaxed border border-border-light">
                                        "{request.reason || "Neden belirtilmemiş."}"
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    disabled={actionLoading}
                                    onClick={() => handleAction(false)}
                                    className="flex-1 py-4 px-6 border border-border-light rounded-2xl font-bold text-red-500 hover:bg-red-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <LucideXCircle size={18} /> Reddet
                                </button>
                                <button
                                    disabled={actionLoading}
                                    onClick={() => handleAction(true)}
                                    className="flex-[1.5] py-4 px-6 bg-accent-blue text-white rounded-2xl font-bold hover:bg-accent-blue-hover transition-all flex items-center justify-center gap-2 shadow-lg shadow-accent-blue/20 disabled:opacity-50"
                                >
                                    <LucideCheck size={18} /> Onayla
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="py-12 text-center text-text-muted">
                            <p>İstek bulunamadı veya silinmiş olabilir.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RequestActionModal;
