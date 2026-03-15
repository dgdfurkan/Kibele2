import React, { useState, useEffect } from 'react';
import { LucideAward, LucideUpload, LucideLink, LucideExternalLink, LucideHistory, LucideCheckCircle, LucideX, LucideSparkles, LucideCalendar, LucideClock } from 'lucide-react';
import { subscribeToRoomItems, addRoomItem, deleteRoomItem, subscribeToAllFinalWorks } from '../../services/dbService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const FinalWorkView = ({ room, targetUserId, participants = [] }) => {
    const { user, isAdmin } = useAuth();
    const { showToast } = useToast();
    const [finalWorks, setFinalWorks] = useState([]);
    const [allFinalWorks, setAllFinalWorks] = useState({});
    const [loading, setLoading] = useState(false);
    const [newLink, setNewLink] = useState('');
    const [newTitle, setNewTitle] = useState('');
    const [viewMode, setViewMode] = useState(isAdmin ? 'overview' : 'individual');

    // Archive / Read-only logic
    const now = new Date();
    const deadlineDate = room?.deadline?.toDate ? room.deadline.toDate() : (room?.deadline ? new Date(room.deadline) : null);
    const isArchiveMode = room?.isActive === false || (deadlineDate && now > deadlineDate);
    const maxRevisions = room?.maxRevisions || 2;

    useEffect(() => {
        if (!room?.id) return;
        
        // Subscribe to individual works for current target
        if (targetUserId) {
            const unsubscribeIndividual = subscribeToRoomItems(room.id, 'final', targetUserId, (data) => {
                setFinalWorks([...data].reverse());
            });
            
            // If admin, also subscribe to everything for the table
            let unsubscribeAll = () => {};
            if (isAdmin) {
                unsubscribeAll = subscribeToAllFinalWorks(room.id, (data) => {
                    setAllFinalWorks(data);
                });
            }

            return () => {
                unsubscribeIndividual();
                unsubscribeAll();
            };
        }
    }, [room?.id, targetUserId, isAdmin]);

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
                authorName: user.name || user.displayName || user.email.split('@')[0],
                revisionNumber: finalWorks.length + 1
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
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000 || timestamp);
        return date.toLocaleString('tr-TR', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const AdminOverviewTable = () => {
        const sortedSubmissions = participants
            .filter(p => p.role !== 'admin')
            .map(p => ({
                ...p,
                submissions: allFinalWorks[p.id] || []
            }))
            .sort((a, b) => (b.submissions.length > 0 ? 1 : -1) - (a.submissions.length > 0 ? 1 : -1));

        return (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white rounded-[2rem] border border-border-light/40 overflow-hidden shadow-2xl shadow-accent-blue/5">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-surface-light/30 border-b border-border-light/20">
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-muted">Öğrenci</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-muted">Durum</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-muted text-center">Revizeler</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-muted">Son Güncelleme</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-muted text-right">Eylem</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-light/10">
                            {sortedSubmissions.map((p) => {
                                const latestSub = p.submissions[0];
                                return (
                                    <tr key={p.id} className="hover:bg-surface-light/20 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-accent-blue/10 flex items-center justify-center font-bold text-accent-blue border border-accent-blue/10">
                                                    {p.name?.charAt(0) || '?'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-text-main">{p.name || 'İsimsiz'}</p>
                                                    <p className="text-[10px] text-text-muted font-medium italic">{p.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            {p.submissions.length > 0 ? (
                                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-green-600 rounded-full border border-green-100 italic text-[10px] font-bold">
                                                    <LucideCheckCircle size={10} /> Teslim Edildi
                                                </div>
                                            ) : (
                                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-50 text-gray-400 rounded-full border border-gray-100 italic text-[10px] font-bold">
                                                    <LucideClock size={10} /> Bekleniyor
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <span className={`text-xs font-black ${p.submissions.length >= maxRevisions ? 'text-green-600' : 'text-accent-blue'}`}>
                                                {p.submissions.length} / {maxRevisions}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="text-[10px] text-text-muted font-medium">
                                                {latestSub ? formatDate(latestSub.createdAt) : '—'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            {latestSub && (
                                                <a
                                                    href={latestSub.content}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-text-main text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-accent-blue transition-all shadow-lg shadow-accent-blue/10"
                                                >
                                                    Link <LucideExternalLink size={10} />
                                                </a>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full overflow-y-auto p-12 bg-white selection:bg-accent-blue selection:text-white scrollbar-hide">
            <div className="max-w-5xl mx-auto">
                <div className="mb-16">
                    <div className="flex justify-between items-start mb-12">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 rounded-[1.5rem] bg-accent-blue/10 flex items-center justify-center text-accent-blue border border-accent-blue/10 shadow-xl shadow-accent-blue/5">
                                <LucideAward size={32} />
                            </div>
                            <div>
                                <h2 className="text-4xl font-display font-bold italic text-text-main mb-1">Final Teslimatları.</h2>
                                <p className="text-text-muted text-xs italic tracking-tight">Proje yolculuğunun en zirve noktası ve büyük sonuç.</p>
                            </div>
                        </div>

                        {isAdmin && (
                            <div className="flex bg-surface-light p-1 rounded-2xl border border-border-light/40">
                                <button
                                    onClick={() => setViewMode('overview')}
                                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'overview' ? 'bg-white text-accent-blue shadow-lg shadow-accent-blue/5' : 'text-text-muted hover:text-text-main'}`}
                                >
                                    Genel Bakış
                                </button>
                                <button
                                    onClick={() => setViewMode('individual')}
                                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'individual' ? 'bg-white text-accent-blue shadow-lg shadow-accent-blue/5' : 'text-text-muted hover:text-text-main'}`}
                                >
                                    Bireysel İzleme
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {isAdmin && viewMode === 'overview' ? (
                    <AdminOverviewTable />
                ) : (
                    <div className="grid grid-cols-1 gap-12 max-w-4xl mx-auto">
                        {isAdmin && user?.uid !== targetUserId && (
                            <div className="mb-4 inline-flex items-center gap-2 px-6 py-3 bg-text-main text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] animate-in slide-in-from-top-4 shadow-2xl">
                                <LucideSparkles size={14} className="text-accent-blue" />
                                Şu an izlenen öğrenci: <span className="text-accent-blue">{(participants.find(p => p.id === targetUserId)?.name || "Bilinmeyen Öğrenci").toUpperCase()}</span>
                            </div>
                        )}

                        {/* Submission Form - Only for student owner */}
                        {!isArchiveMode && !isAdmin && user?.uid === targetUserId && finalWorks.length < maxRevisions && (
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
                                            placeholder="Revize Mesajın (Örn: Logolar güncellendi)"
                                            value={newTitle}
                                            onChange={(e) => setNewTitle(e.target.value)}
                                            className="bg-white px-6 py-4 rounded-2xl border border-border-light outline-none focus:ring-2 focus:ring-accent-blue/20 text-sm italic shadow-sm"
                                        />
                                        <input
                                            type="url"
                                            required
                                            placeholder="Google Drive, Figma veya Behance linkin"
                                            value={newLink}
                                            onChange={(e) => setNewLink(e.target.value)}
                                            className="bg-white px-6 py-4 rounded-2xl border border-border-light outline-none focus:ring-2 focus:ring-accent-blue/20 text-sm shadow-sm"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-text-main text-white py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] hover:bg-accent-blue transition-all shadow-xl shadow-accent-blue/5 disabled:opacity-50"
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
                                <div className="py-20 text-center opacity-30 italic">henüz bir teslimat yapılmamış...</div>
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
                                                        <div className="text-[10px] font-medium italic">{formatDate(work.createdAt)}</div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <a href={work.content} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface-light text-text-main text-[10px] font-bold uppercase tracking-widest hover:bg-accent-blue hover:text-white transition-all border border-border-light/40">
                                                    LİNKİ AÇ <LucideExternalLink size={12} />
                                                </a>
                                                {!isArchiveMode && (user?.uid === targetUserId || isAdmin) && (
                                                    <button onClick={() => handleDeleteFinal(work)} className="p-2.5 text-text-muted hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                                                        <LucideX size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FinalWorkView;
