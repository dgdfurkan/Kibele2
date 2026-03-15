import React, { useState, useEffect } from 'react';
import { LucideAward, LucideUpload, LucideLink, LucideExternalLink, LucideHistory, LucideCheckCircle, LucideX, LucideSparkles, LucideCalendar, LucideClock } from 'lucide-react';
import { subscribeToRoomItems, addRoomItem, deleteRoomItem } from '../../services/dbService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const FinalWorkView = ({ room, targetUserId }) => {
    const { user, isAdmin } = useAuth();
    const { showToast } = useToast();
    const [finalWorks, setFinalWorks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [newLink, setNewLink] = useState('');
    const [newTitle, setNewTitle] = useState('');

    // Archive / Read-only logic
    const now = new Date();
    const deadlineDate = room?.deadline?.toDate ? room.deadline.toDate() : (room?.deadline ? new Date(room.deadline) : null);
    const isArchiveMode = room?.isActive === false || (deadlineDate && now > deadlineDate);
    const maxRevisions = room?.maxRevisions || 2;

    useEffect(() => {
        if (!room?.id || !targetUserId) return;
        const unsubscribe = subscribeToRoomItems(room.id, 'final', targetUserId, (data) => {
            // Revisions are sorted descending by default in dbService, let's reverse for chronological order in UI
            setFinalWorks([...data].reverse());
        });
        return () => unsubscribe();
    }, [room?.id, targetUserId]);

    const handleUploadFinal = async (e) => {
        e.preventDefault();
        if (isArchiveMode) return;
        if (finalWorks.length >= maxRevisions) {
            showToast("Maksimum revize hakkın doldu canım.", "error");
            return;
        }
        if (!newLink.trim()) {
            showToast("Lütfen geçerli bir link gir.", "error");
            return;
        }

        setLoading(true);
        try {
            await addRoomItem(room.id, targetUserId, {
                type: 'link',
                content: newLink.trim(),
                title: newTitle.trim() || `${finalWorks.length + 1}. Revize`,
                boardType: 'final',
                authorName: user.name || user.displayName || user.email.split('@')[0]
            });
            showToast(`${finalWorks.length + 1}. revize başarıyla eklendi! ✨`);
            setNewLink('');
            setNewTitle('');
        } catch (error) {
            showToast("Yükleme sırasında hata oluştu.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteFinal = async (item) => {
        if (isArchiveMode) return;
        if (!confirm("Bu revizeyi silmek istediğine emin misin?")) return;
        try {
            await deleteRoomItem(item.id);
            showToast("Revize silindi.");
        } catch (error) {
            showToast("Hata oluştu.");
        }
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return "Şimdi";
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
        return date.toLocaleString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="h-full overflow-y-auto p-12 bg-white selection:bg-accent-blue selection:text-white scrollbar-hide">
            <div className="max-w-4xl mx-auto">
                <div className="mb-16 text-center">
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 rounded-[2rem] bg-accent-blue/10 flex items-center justify-center text-accent-blue shadow-xl shadow-accent-blue/5">
                            <LucideAward size={40} />
                        </div>
                    </div>
                    <h2 className="text-5xl font-display font-bold italic text-text-main mb-4 leading-tight">Proje Teslimatı.</h2>
                    <p className="text-text-muted italic max-w-xl mx-auto">
                        Buraya Google Drive, Figma veya Behance linklerini ekleyebilirsin. 
                        Revize hakkın: <span className="text-accent-blue font-bold">{maxRevisions}</span>.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-12">
                    {/* Submission Form */}
                    {!isArchiveMode && (user?.uid === targetUserId || isAdmin) && finalWorks.length < maxRevisions && (
                        <div className="glass-card !bg-surface-light p-8 border-dashed border-border-light relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
                                <LucideLink size={48} />
                            </div>
                            
                            <h3 className="text-lg font-display font-bold text-text-main mb-6 flex items-center gap-2">
                                <LucideUpload size={18} className="text-accent-blue" />
                                {finalWorks.length === 0 ? "İlk Teslimatını Yap" : `${finalWorks.length + 1}. Revizeni Ekle`}
                            </h3>
                            
                            <form onSubmit={handleUploadFinal} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input
                                        type="text"
                                        placeholder="Revize Mesajın (Opsiyonel)"
                                        value={newTitle}
                                        onChange={(e) => setNewTitle(e.target.value)}
                                        className="bg-white px-6 py-4 rounded-2xl border border-border-light outline-none focus:ring-2 focus:ring-accent-blue/20 text-sm italic"
                                    />
                                    <input
                                        type="url"
                                        required
                                        placeholder="Google Drive / Figma Linkin"
                                        value={newLink}
                                        onChange={(e) => setNewLink(e.target.value)}
                                        className="bg-white px-6 py-4 rounded-2xl border border-border-light outline-none focus:ring-2 focus:ring-accent-blue/20 text-sm"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-text-main text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-accent-blue transition-all shadow-xl shadow-accent-blue/5 disabled:opacity-50"
                                >
                                    {loading ? 'Yükleniyor...' : 'Link Olarak Teslim Et'}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Revisions List */}
                    <div className="space-y-6">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted flex items-center gap-2 mb-4">
                            <LucideHistory size={14} /> Teslimat Geçmişi
                        </h3>
                        
                        {finalWorks.length === 0 ? (
                            <div className="py-20 text-center opacity-30 italic">
                                henüz bir teslimat yapılmamış canım.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {finalWorks.map((work, index) => (
                                    <div key={work.id} className="glass-card !bg-white border-border-light/60 p-6 flex items-center justify-between group hover:border-accent-blue/20 transition-all">
                                        <div className="flex items-center gap-6">
                                            <div className="w-12 h-12 rounded-2xl bg-accent-blue/5 flex items-center justify-center text-accent-blue font-bold text-sm">
                                                {index + 1}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-text-main flex items-center gap-2">
                                                    {work.title}
                                                    <span className="text-[8px] font-black bg-green-50 text-green-600 px-2 py-0.5 rounded-full uppercase tracking-tighter">İşlendi</span>
                                                </h4>
                                                <div className="flex items-center gap-4 mt-1 opacity-60">
                                                    <div className="flex items-center gap-1.5 text-[10px] font-medium italic">
                                                        <LucideCalendar size={12} /> {formatDate(work.createdAt).split(',')[0]}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[10px] font-medium italic">
                                                        <LucideClock size={12} /> {formatDate(work.createdAt).split(',')[1]}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-3">
                                            <a
                                                href={work.content}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface-light text-text-main text-[10px] font-bold uppercase tracking-widest hover:bg-accent-blue hover:text-white transition-all border border-border-light/40"
                                            >
                                                LİNKİ AÇ <LucideExternalLink size={12} />
                                            </a>
                                            
                                            {!isArchiveMode && (user?.uid === targetUserId || isAdmin) && (
                                                <button
                                                    onClick={() => handleDeleteFinal(work)}
                                                    className="p-2.5 text-text-muted hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                                    title="Geri Çek"
                                                >
                                                    <LucideX size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {isArchiveMode && (
                        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center text-red-500 font-bold italic text-sm flex items-center justify-center gap-3">
                            <LucideX size={20} /> Oda Süresi Doldu veya Kapalı - Yeni Teslimat Yapılamaz
                        </div>
                    )}
                    
                    {!isArchiveMode && finalWorks.length >= maxRevisions && (
                        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6 text-center text-orange-600 font-bold italic text-sm flex items-center justify-center gap-3">
                            <LucideCheckCircle size={20} /> Tüm Revize Haklarını Kullandın! Başarılar ✨
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FinalWorkView;
