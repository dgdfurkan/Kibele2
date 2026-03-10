import { LucideX, LucideLock, LucideUnlock, LucideUsers, LucideSend, LucideInfo, LucideCalendar, LucideUser, LucideCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { requestRoomAccess, getUsersProfiles, getUserProfile, joinRoom, getUserRoomRequestStatus } from '../services/dbService';
import { useAuth } from '../context/AuthContext';
import React, { useState, useEffect } from 'react';

const RoomDetailModal = ({ room, isOpen, onClose, onEnterRoom }) => {
    const { user, isAdmin } = useAuth();
    const { showToast } = useToast();
    const [view, setView] = useState('detail'); // 'detail' or 'request'
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [participantsInfo, setParticipantsInfo] = useState([]);
    const [creatorInfo, setCreatorInfo] = useState(null);
    const [requestStatus, setRequestStatus] = useState(null);

    useEffect(() => {
        if (isOpen && room) {
            fetchDetails();
        }
    }, [isOpen, room]);

    const fetchDetails = async () => {
        if (!room.participants) return;

        // Katılımcı bilgilerini çek
        const profiles = await getUsersProfiles(room.participants);
        setParticipantsInfo(profiles);

        // Kurucu bilgisini çek
        if (room.creatorId) {
            const creator = await getUserProfile(room.creatorId);
            setCreatorInfo(creator);
        }

        // İstek durumunu çek (eğer katılımcı değilse)
        if (user && !room.participants.includes(user.uid) && room.creatorId !== user.uid) {
            const status = await getUserRoomRequestStatus(room.id, user.uid);
            setRequestStatus(status);
        }
    };

    if (!isOpen || !room) return null;

    const handleEnterRoom = () => {
        onEnterRoom(room);
        onClose();
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return "...";
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
    };

    const handleJoinPublicRoom = async () => {
        setLoading(true);
        try {
            await joinRoom(room.id, user.uid);
            showToast("Odaya başarıyla katıldın! Hoş geldin. ✨");
            // Detayları yenile
            fetchDetails();
        } catch (error) {
            showToast("Odaya katılırken bir hata oluştu.", "error");
        } finally {
            setLoading(false);
        }
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
                                {room.isActive === false && (
                                    <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-red-500 text-white">
                                        Pasif Oda
                                    </span>
                                )}
                                <div className="flex items-center gap-1 text-text-muted text-xs font-medium">
                                    <LucideUsers size={12} />
                                    {room.participants?.length || 0} Katılımcı
                                </div>
                            </div>

                            <h2 className="text-3xl font-display font-bold mb-1">{room.name}</h2>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-6">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted/60 flex items-center gap-1">
                                    <LucideUser size={10} className="text-accent-blue" />
                                    Kurucu: <span className="text-text-main">{creatorInfo?.name || room.creatorName || "İsimsiz Kurucu"}</span>
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted/60 flex items-center gap-1">
                                    <LucideCalendar size={10} className="text-accent-blue" />
                                    Kuruluş: <span className="text-text-main">{formatDate(room.createdAt)}</span>
                                </span>
                                {room.deadline && (
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-orange-500 flex items-center gap-1">
                                        <LucideCalendar size={10} />
                                        Bitiş: <span className="font-black">{formatDate(room.deadline)}</span>
                                    </span>
                                )}
                            </div>

                            <div className="bg-surface-light/50 p-6 rounded-[2rem] border border-border-light/30 mb-6">
                                <span className="text-[10px] font-black uppercase tracking-widest text-accent-blue block mb-2 opacity-50">Oda Açıklaması</span>
                                <p className="text-text-main leading-relaxed text-sm">
                                    {room.description || "Bu oda yaratıcı süreçlerin paylaşıldığı özel bir alan."}
                                </p>
                            </div>

                            {/* Katılımcılar Listesi */}
                            <div className="mb-8">
                                <span className="text-[10px] font-black uppercase tracking-widest text-text-muted/40 block mb-3">Katılımcılar ({room.participants?.length || 0})</span>
                                <div className="flex flex-wrap gap-2">
                                    {participantsInfo.map((p) => (
                                        <div key={p.id} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-border-light/50 shadow-sm">
                                            <div className="relative">
                                                <LucideUser size={12} className="text-text-muted" />
                                                {p.isOnline && (
                                                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full border border-white shadow-sm" />
                                                )}
                                            </div>
                                            <span className="text-[11px] font-medium text-text-main">{p.name || "Kullanıcı"}</span>
                                        </div>
                                    ))}
                                    {participantsInfo.length === 0 && (
                                        <span className="text-xs text-text-muted italic opacity-50">Katılımcı bilgileri yükleniyor...</span>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-4">
                                {room.participants?.includes(user?.uid) || room.creatorId === user?.uid || isAdmin ? (
                                    <button
                                        className="flex-1 bg-accent-blue text-white py-4 rounded-2xl font-semibold hover:bg-accent-blue-hover transition-all shadow-lg shadow-accent-blue/20"
                                        onClick={handleEnterRoom}
                                    >
                                        Odaya Gir
                                    </button>
                                ) : requestStatus?.status === 'pending' ? (
                                    <button
                                        disabled
                                        className="flex-1 bg-orange-100 text-orange-600 py-4 rounded-2xl font-semibold border border-orange-200 flex items-center justify-center gap-2"
                                    >
                                        <LucideCircle size={16} className="animate-pulse" />
                                        İsteğin Beklemede
                                    </button>
                                ) : room.isActive === false ? (
                                    <button
                                        disabled
                                        className="flex-1 bg-gray-100 text-gray-400 py-4 rounded-2xl font-semibold border border-gray-200"
                                    >
                                        Oda Pasif
                                    </button>
                                ) : (
                                    <button
                                        disabled={loading}
                                        className="flex-1 bg-accent-blue text-white py-4 rounded-2xl font-semibold hover:bg-accent-blue-hover transition-all shadow-lg shadow-accent-blue/20 disabled:opacity-50"
                                        onClick={() => room.isPrivate ? setView('request') : handleJoinPublicRoom()}
                                    >
                                        {loading ? 'İşleniyor...' : (room.isPrivate ? 'Katılma İsteği At' : 'Odaya Katıl')}
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
