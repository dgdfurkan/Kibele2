import React, { useState, useEffect } from 'react';
import { LucideX, LucideLock, LucideUnlock, LucideSparkles, LucideTrash2, LucideUsers, LucideAlertCircle } from 'lucide-react';
import { updateRoomSettings, removeParticipantFromRoom, getUsersProfiles, sendNotification } from '../services/dbService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const RoomSettingsModal = ({ isOpen, onClose, room }) => {
    const { user, isAdmin } = useAuth();
    const { showToast } = useToast();
    const [name, setName] = useState(room?.name || '');
    const [description, setDescription] = useState(room?.description || '');
    const [isPrivate, setIsPrivate] = useState(room?.isPrivate || false);
    const [deadline, setDeadline] = useState('');
    const [isActive, setIsActive] = useState(room?.isActive !== false);
    const [maxRevisions, setMaxRevisions] = useState(room?.maxRevisions || 2);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Participant management
    const [participants, setParticipants] = useState([]);
    const [kickingUserId, setKickingUserId] = useState(null);
    const [kickReason, setKickReason] = useState('');

    useEffect(() => {
        if (room) {
            setName(room.name || '');
            setDescription(room.description || '');
            setIsPrivate(room.isPrivate || false);
            setIsActive(room.isActive !== false);

            if (room.deadline) {
                const date = room.deadline.toDate ? room.deadline.toDate() : new Date(room.deadline);
                setDeadline(date.toISOString().split('T')[0]);
            }
            setMaxRevisions(room.maxRevisions || 2);

            // Load participants detailed profiles for kicking
            if (room.participants) {
                getUsersProfiles(room.participants).then(setParticipants);
            }
        }
    }, [room, isOpen]);

    if (!isOpen) return null;

    const handleUpdate = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const newDeadline = deadline ? new Date(deadline) : null;
            
            // Check for changes to notify participants
            const deadlineChanged = room.deadline?.toDate ? 
                room.deadline.toDate().getTime() !== newDeadline?.getTime() : 
                new Date(room.deadline).getTime() !== newDeadline?.getTime();
            const revisionsChanged = room.maxRevisions !== maxRevisions;

            await updateRoomSettings(room.id, {
                name,
                description,
                isPrivate,
                deadline: newDeadline,
                isActive,
                maxRevisions,
                updatedAt: new Date()
            });

            // Send notifications if important settings changed
            if (deadlineChanged || revisionsChanged) {
                const participantsToNotify = room.participants?.filter(id => id !== user.uid) || [];
                const notificationPromises = participantsToNotify.map(participantId => 
                    sendNotification(participantId, {
                        type: 'room_update',
                        title: 'Oda Güncellemesi',
                        message: `'${name}' odasının ${deadlineChanged ? 'teslim tarihi' : ''} ${deadlineChanged && revisionsChanged ? 've' : ''} ${revisionsChanged ? 'revize hakkı' : ''} güncellendi canım! ✨`,
                        roomId: room.id,
                        roomName: name,
                        createdAt: new Date()
                    })
                );
                await Promise.all(notificationPromises);
            }

            showToast("Oda ayarları güncellendi canım! ✨");
            onClose();
        } catch (error) {
            showToast("Ayarlar güncellenirken hata oluştu.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleKick = async (participantId) => {
        try {
            await removeParticipantFromRoom(room.id, participantId, kickReason);
            setParticipants(prev => prev.filter(p => p.id !== participantId));
            setKickingUserId(null);
            setKickReason('');
            showToast("Kullanıcı odadan uzaklaştırıldı. 🔒");
        } catch (error) {
            showToast("Kullanıcı çıkartılamadı.", "error");
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
                <div className="p-8 border-b border-border-light flex justify-between items-center bg-surface-light/30">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-accent-blue/10 text-accent-blue rounded-xl">
                            <LucideSparkles size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-display font-semibold italic">Oda Yönetimi</h2>
                            <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Ayarlar & Katılımcılar</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors">
                        <LucideX size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-12 scrollbar-hide">
                    {/* General Settings Section */}
                    <section>
                        <h3 className="text-sm font-black uppercase tracking-widest text-text-muted mb-6 flex items-center gap-2">
                            Genel Bilgiler
                        </h3>
                        <form onSubmit={handleUpdate} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-text-main mb-2">Oda İsmi</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-border-light focus:ring-2 focus:ring-accent-blue/20 outline-none font-medium text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-text-main mb-2">Açıklama</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows="2"
                                    className="w-full px-4 py-3 rounded-xl border border-border-light focus:ring-2 focus:ring-accent-blue/20 outline-none text-sm resize-none italic"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-text-muted mb-2">Bitiş Tarihi</label>
                                    <input
                                        type="date"
                                        value={deadline}
                                        onChange={(e) => setDeadline(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-border-light focus:ring-2 focus:ring-accent-blue/20 outline-none text-xs font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-text-muted mb-2">Oda Durumu</label>
                                    <button
                                        type="button"
                                        onClick={() => setIsActive(!isActive)}
                                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${isActive ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}
                                    >
                                        <span className="text-[10px] font-black uppercase tracking-widest">{isActive ? 'AKTİF' : 'PASİF'}</span>
                                        <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                                    </button>
                                </div>
                            </div>

                            <div className="bg-surface-light p-4 rounded-2xl border border-border-light">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-text-muted mb-3 flex items-center gap-2">
                                    Revize Hakkı (Öğrenci Başına)
                                </label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="range"
                                        min="1"
                                        max="10"
                                        value={maxRevisions}
                                        onChange={(e) => setMaxRevisions(parseInt(e.target.value))}
                                        className="flex-1 accent-accent-blue"
                                    />
                                    <span className="w-10 h-10 flex items-center justify-center bg-white rounded-xl border border-border-light text-sm font-bold text-accent-blue">
                                        {maxRevisions}
                                    </span>
                                </div>
                                <p className="text-[9px] text-text-muted mt-2 italic">Öğrenciler final teslimatını en fazla bu kadar güncelleyebilir.</p>
                            </div>

                            <div className="p-4 bg-surface-light rounded-2xl flex items-center justify-between border border-border-light">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${isPrivate ? 'bg-accent-blue/10 text-accent-blue' : 'bg-green-100 text-green-600'}`}>
                                        {isPrivate ? <LucideLock size={18} /> : <LucideUnlock size={18} />}
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold">{isPrivate ? 'Gizli Oda' : 'Açık Oda'}</div>
                                        <div className="text-[10px] text-text-muted italic">
                                            {isPrivate ? 'Üyeler onay ile alınır.' : 'Herkes görebilir ve katılabilir.'}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsPrivate(!isPrivate)}
                                    className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${isPrivate ? 'bg-accent-blue' : 'bg-gray-300'}`}
                                >
                                    <div className={`bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-300 ${isPrivate ? 'translate-x-6' : 'translate-x-0'}`} />
                                </button>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-accent-blue text-white py-4 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-opacity-90 transition-all shadow-lg"
                            >
                                {isSubmitting ? 'Güncelleniyor...' : 'Ayarları Kaydet'}
                            </button>
                        </form>
                    </section>

                    {/* Participants Management Section */}
                    <section>
                        <h3 className="text-sm font-black uppercase tracking-widest text-text-muted mb-6 flex items-center gap-2">
                            <LucideUsers size={16} /> Katılımcıları Yönet
                        </h3>
                        <div className="space-y-4">
                            {participants.map(p => (
                                <div key={p.id} className="flex items-center gap-4 p-4 bg-white border border-border-light/40 rounded-2xl hover:shadow-md transition-all group">
                                    <div className="w-10 h-10 rounded-full bg-accent-blue/10 flex items-center justify-center font-bold text-accent-blue">
                                        {p.name?.charAt(0) || '?'}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold">{p.name || 'İsimsiz'}</p>
                                        <p className="text-[10px] uppercase font-black tracking-widest text-text-muted">{p.role}</p>
                                    </div>

                                    {p.id !== room.creatorId && p.id !== user.uid && (
                                        <button
                                            onClick={() => setKickingUserId(p.id)}
                                            className="p-3 text-text-muted hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                            title="Odadan Çıkar"
                                        >
                                            <LucideTrash2 size={18} />
                                        </button>
                                    )}
                                    {p.id === room.creatorId && (
                                        <span className="text-[8px] font-black bg-orange-50 text-orange-600 px-2 py-1 rounded-lg border border-orange-100 uppercase">Kurucu</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>

            {/* Kick Confirmation Prompt */}
            {kickingUserId && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setKickingUserId(null)} />
                    <div className="relative bg-white w-full max-w-md rounded-[2rem] p-8 shadow-2xl animate-in fade-in zoom-in duration-300 border border-white/20">
                        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-6">
                            <LucideAlertCircle size={32} />
                        </div>
                        <h3 className="text-2xl font-display font-bold mb-2 italic">Kullanıcıyı Çıkart?</h3>
                        <p className="text-text-muted text-sm mb-6 italic">Bu öğrenciyi odadan uzaklaştırmak üzeresin. Bir sebep eklemek ister misin? (Öğrenciye bildirilecek)</p>

                        <input
                            type="text"
                            value={kickReason}
                            onChange={(e) => setKickReason(e.target.value)}
                            placeholder="Örn: Projeye katılım sağlanmadı."
                            className="w-full bg-surface-light rounded-xl p-4 border-none focus:ring-2 focus:ring-red-500/20 outline-none mb-8 text-sm italic"
                            autoFocus
                        />

                        <div className="flex gap-4">
                            <button onClick={() => setKickingUserId(null)} className="flex-1 py-4 text-text-muted font-bold uppercase tracking-widest text-[10px]">İptal</button>
                            <button
                                onClick={() => handleKick(kickingUserId)}
                                className="flex-[2] bg-red-500 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-red-600 transition-all shadow-xl shadow-red-500/20"
                            >
                                Odadan Uzaklaştır
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoomSettingsModal;
