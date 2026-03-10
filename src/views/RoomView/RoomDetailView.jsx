import React, { useState, useEffect } from 'react';
import { LucideLock, LucideSettings, LucidePlus, LucideImage, LucideZoomIn, LucideMoreHorizontal, LucideSchool, LucideSend, LucidePlusCircle, LucideX, LucideLayers } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { subscribeToRoomItems, addRoomItem, deleteRoomItem } from '../../services/dbService';
import { useToast } from '../../context/ToastContext';

const RoomDetailView = ({ room, isSidebarOpen, onSidebarToggle, targetUserId }) => {
    const { user, isAdmin } = useAuth();
    const { showToast } = useToast();
    const [items, setItems] = useState([]);
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
    const [newNote, setNewNote] = useState('');
    const [loading, setLoading] = useState(false);

    // Use current user's UID if targetUserId is not provided (students)
    const effectiveUserId = targetUserId || user?.uid;

    useEffect(() => {
        if (!room?.id || !effectiveUserId) return;
        const unsubscribe = subscribeToRoomItems(room.id, 'personal', effectiveUserId, setItems);
        return () => unsubscribe();
    }, [room?.id, effectiveUserId]);

    const handleAddNote = async () => {
        if (!newNote.trim()) return;
        setLoading(true);
        try {
            await addRoomItem(room.id, effectiveUserId, {
                type: 'note',
                content: newNote,
                boardType: 'personal',
                authorName: user.name || user.displayName || user.email.split('@')[0]
            });
            setNewNote('');
            setIsNoteModalOpen(false);
            showToast("Notun yanına iliştirildi canım! ✨");
        } catch (error) {
            showToast("Not eklenirken bir hata oluştu.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteItem = async (itemId) => {
        try {
            await deleteRoomItem(itemId);
            showToast("Öge silindi.");
        } catch (error) {
            showToast("Silme işlemi başarısız.", "error");
        }
    };

    return (
        <div className="h-full flex overflow-hidden">
            <main className="flex-1 overflow-y-auto p-8 pb-32 scrollbar-hide">
                <div className="max-w-5xl mx-auto">
                    {/* Page Header (Internal) */}
                    <div className="mb-12">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-accent-blue/5 text-accent-blue rounded-full border border-accent-blue/10">
                                {isAdmin && effectiveUserId !== user.uid ? "Öğrenci Çalışma Alanı" : "Bireysel Çalışma Alanı"}
                            </span>
                            {isAdmin && effectiveUserId !== user.uid && (
                                <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-green-500/10 text-green-600 rounded-full border border-green-500/20">
                                    Moderatör Erişimi Aktif
                                </span>
                            )}
                        </div>
                        <h2 className="text-4xl font-display font-bold italic text-text-main mb-4 leading-tight">
                            {isAdmin && effectiveUserId !== user.uid ? "Öğrenci Referansları" : "Referanslarım"} & <br />
                            <span className="text-text-muted">{isAdmin && effectiveUserId !== user.uid ? "Fikir Notları." : "Fikir Notlarım."}</span>
                        </h2>
                    </div>

                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-2 text-text-muted">
                            <LucideLayers size={18} />
                            <span className="text-xs font-bold uppercase tracking-widest">{items.length} ÖGE</span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsNoteModalOpen(true)}
                                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white border border-border-light shadow-sm hover:shadow-md transition-all text-xs font-bold uppercase tracking-widest"
                            >
                                <LucidePlus size={16} /> Not Ekle
                            </button>
                            <button className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-text-main text-white shadow-lg hover:bg-accent-blue transition-all text-xs font-bold uppercase tracking-widest">
                                <LucidePlusCircle size={16} /> Görsel Yükle
                            </button>
                        </div>
                    </div>

                    {/* Masonry Grid */}
                    <div className="columns-1 md:columns-2 gap-8 space-y-8">
                        {items.map((item) => (
                            <div key={item.id} className="break-inside-avoid animate-in zoom-in-95 duration-500 group relative">
                                {item.type === 'note' ? (
                                    <div className="bg-white/50 backdrop-blur-sm rounded-[2.5rem] p-10 border border-border-light/40 shadow-sm hover:shadow-xl hover:shadow-accent-blue/5 transition-all duration-500 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleDeleteItem(item.id)} className="p-2 text-text-muted hover:text-red-500"><LucideX size={14} /></button>
                                        </div>
                                        <p className="font-display text-2xl italic leading-relaxed text-text-main whitespace-pre-line">
                                            {item.content}
                                        </p>
                                        <div className="mt-10 pt-8 border-t border-border-light/30 flex justify-between items-center">
                                            <span className="text-[10px] text-text-muted font-black uppercase tracking-[0.2em]">Fikir Notu</span>
                                            <div className="w-1.5 h-1.5 rounded-full bg-accent-blue/30"></div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-[2.5rem] overflow-hidden bg-white border border-border-light/40 shadow-sm hover:shadow-2xl transition-all duration-700">
                                        <img
                                            src={item.content}
                                            alt={item.title}
                                            className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-1000"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.parentElement.classList.add('bg-surface-light', 'flex', 'items-center', 'justify-center', 'min-h-[200px]');
                                                const fallbackImg = "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=800&auto=format&fit=crop";
                                                if (e.target.src !== fallbackImg) {
                                                    e.target.src = fallbackImg;
                                                    e.target.style.display = 'block';
                                                    e.target.className += " grayscale opacity-30";
                                                }
                                            }}
                                        />
                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 backdrop-blur-[2px] flex items-center justify-center gap-4">
                                            <button className="p-3 bg-white rounded-full text-text-main shadow-2xl"><LucideZoomIn size={20} /></button>
                                            <button onClick={() => handleDeleteItem(item.id)} className="p-3 bg-white text-red-500 rounded-full shadow-2xl"><LucideX size={20} /></button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {items.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-32 text-text-muted/40 text-center">
                            <LucideLayers size={64} className="mb-6 opacity-10" />
                            <p className="text-sm font-bold uppercase tracking-widest">Alan şimdilik boş canım.</p>
                            <p className="text-xs mt-2 italic shadow-sm">Buraya yükleyeceğin her şey sadece senin ve Kibele Hoca'nın arasında.</p>
                        </div>
                    )}
                </div>
            </main>

            {/* AI Sidebar */}
            <aside className={`w-[420px] bg-white border-l border-border-light/40 flex flex-col transition-all duration-700 ${isSidebarOpen ? 'mr-0' : '-mr-[420px]'}`}>
                <div className="p-8 border-b border-border-light/40 bg-surface-light/30 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-accent-blue flex items-center justify-center text-white shadow-xl shadow-accent-blue/20">
                        <LucideSchool size={24} />
                    </div>
                    <div>
                        <h3 className="font-display font-bold text-lg text-text-main italic">Kibele Hoca</h3>
                        <span className="text-[10px] text-accent-blue font-black uppercase tracking-widest">Yapay Zeka Rehberi</span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
                    <div className="bg-surface-light/40 p-6 rounded-[2rem] rounded-tl-none border border-border-light/30 text-sm leading-relaxed text-text-main shadow-sm">
                        Hoş geldin canım! '{room?.name}' odasında seninleyim. Burada topladığın her türlü görsele teknik ve estetik açıdan yorum yapabilirim. Sanatçı tercihlerini bana her zaman sorabilirsin. ✨
                    </div>
                    {/* Mock chat messages would go here */}
                </div>

                <div className="p-8 border-t border-border-light/40 bg-white">
                    <div className="flex items-center gap-3 bg-surface-light rounded-3xl p-3 border border-border-light/40 focus-within:border-accent-blue/30 focus-within:ring-4 focus-within:ring-accent-blue/5 transition-all group">
                        <button className="p-2 text-text-muted hover:text-accent-blue"><LucidePlusCircle size={24} /></button>
                        <input
                            placeholder="Kibele'ye danış..."
                            className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 font-medium"
                        />
                        <button className="bg-accent-blue text-white p-3 rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all">
                            <LucideSend size={20} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Note Modal */}
            {isNoteModalOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={() => setIsNoteModalOpen(false)} />
                    <div className="relative w-full max-w-xl bg-white rounded-[3rem] p-12 shadow-2xl animate-in fade-in zoom-in duration-300">
                        <h3 className="text-3xl font-display font-bold mb-2 italic">Yeni Fikir Notu.</h3>
                        <p className="text-text-muted text-sm mb-8 italic">Aklına eseni buraya karala canım, Kibele hatırlar.</p>

                        <textarea
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            placeholder="Görsel hiyerarşi üzerine düşüncelerim..."
                            className="w-full h-48 bg-surface-light rounded-[2rem] p-6 border-none focus:ring-2 focus:ring-accent-blue/20 outline-none transition-all resize-none mb-8 text-lg font-serif italic"
                            autoFocus
                        />

                        <div className="flex gap-4">
                            <button
                                onClick={() => setIsNoteModalOpen(false)}
                                className="flex-1 py-4 text-text-muted font-bold uppercase tracking-widest text-xs"
                            >
                                Vazgeç
                            </button>
                            <button
                                onClick={handleAddNote}
                                disabled={loading || !newNote.trim()}
                                className="flex-[2] bg-text-main text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-accent-blue transition-all shadow-xl shadow-accent-blue/10 disabled:opacity-50"
                            >
                                {loading ? 'Ekleniyor...' : 'PanoYa İliştir'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoomDetailView;
