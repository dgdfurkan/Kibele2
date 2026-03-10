import React, { useState } from 'react';
import { LucideX, LucideLock, LucideUnlock, LucideUsers, LucideSend, LucideInfo } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { requestRoomAccess } from '../services/dbService';
import { useAuth } from '../context/AuthContext';

const RoomDetailModal = ({ room, isOpen, onClose, onEnterRoom }) => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [view, setView] = useState('detail'); // 'detail' or 'request'
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen || !room) return null;

    const handleEnterRoom = () => {
        onEnterRoom(room);
        onClose();
    };

    const handleSendRequest = async () => {
        if (!reason.trim()) {
            showToast("Lütfen neden katılmak istediğini kısaca belirt canım! ✨", "error");
            return;
        }

        setLoading(true);
        try {
            await requestRoomAccess(room.id, room.name, user, room.creatorId, reason);
            showToast("İsteğin başarıyla gönderildi! Onay bekliyoruz. ✨");
            onClose();
            setView('detail');
            setReason('');
        } catch (error) {
            showToast("İstek gönderilirken bir hata oluştu.", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-lg bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                {/* Header Image/Pattern */}
                <div className="h-32 bg-gradient-to-br from-accent-blue/20 to-surface-light relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-white/50 hover:bg-white rounded-full transition-all text-text-main"
                    >
                        <LucideX size={20} />
                    </button>
                    <div className="absolute -bottom-6 left-8 p-4 bg-white rounded-2xl shadow-lg text-accent-blue">
                        {room.isPrivate ? <LucideLock size={32} /> : <LucideUnlock size={32} />}
                    </div>
                </div>

                <div className="pt-10 p-8">
                    {view === 'detail' ? (
                        <>
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${room.isPrivate ? 'bg-text-main text-white' : 'bg-accent-blue/10 text-accent-blue'}`}>
                                    {room.isPrivate ? 'Özel Oda' : 'Açık Oda'}
                                </span>
                                <div className="flex items-center gap-1 text-text-muted text-xs font-medium">
                                    <LucideUsers size={12} />
                                    {room.participants?.length || 0} Katılımcı
                                </div>
                            </div>

                            <h2 className="text-3xl font-display font-bold mb-4">{room.name}</h2>

                            <p className="text-text-muted leading-relaxed mb-8 italic">
                                "{room.description || "Bu oda yaratıcı süreçlerin paylaşıldığı özel bir alan."}"
                            </p>

                            <div className="flex gap-4">
                                {room.participants?.includes(user?.uid) || room.creatorId === user?.uid ? (
                                    <button
                                        className="flex-1 bg-accent-blue text-white py-4 rounded-2xl font-semibold hover:bg-accent-blue-hover transition-all shadow-lg shadow-accent-blue/20"
                                        onClick={handleEnterRoom}
                                    >
                                        Odaya Gir
                                    </button>
                                ) : (
                                    <button
                                        className="flex-1 bg-accent-blue text-white py-4 rounded-2xl font-semibold hover:bg-accent-blue-hover transition-all shadow-lg shadow-accent-blue/20"
                                        onClick={() => setView('request')}
                                    >
                                        {room.isPrivate ? 'Katılma İsteği At' : 'Odaya Katıl'}
                                    </button>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="animate-in slide-in-from-right duration-300">
                            <h3 className="text-2xl font-display font-bold mb-2">Katılım İsteği</h3>
                            <p className="text-text-muted text-sm mb-6">
                                '{room.name}' odasına neden katılmak istediğini kısaca açıklar mısın? Oda sahibi bu bilgiye göre onay verecek.
                            </p>

                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Örn: Görsel iletişim tasarımı öğrencisiyim, süreci takip etmek istiyorum..."
                                className="w-full h-32 p-4 bg-surface-light rounded-2xl border border-border-light focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue outline-none transition-all resize-none mb-6 text-sm"
                            />

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setView('detail')}
                                    className="flex-1 py-4 text-text-muted font-semibold hover:text-text-main transition-all"
                                >
                                    Geri Dön
                                </button>
                                <button
                                    disabled={loading}
                                    onClick={handleSendRequest}
                                    className="flex-[2] bg-accent-blue text-white py-4 rounded-2xl font-semibold hover:bg-accent-blue-hover transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {loading ? 'Gönderiliyor...' : (
                                        <>
                                            İsteği Gönder <LucideSend size={18} />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RoomDetailModal;
