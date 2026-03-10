import React, { useState, useEffect } from 'react';
import { LucideShare2, LucideMoreHorizontal, LucidePlus, LucideEdit3, LucideFileUp, LucideSparkles, LucideX, LucideSearch, LucideRefreshCcw, LucideFilter, LucideSend, LucidePlusCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { subscribeToRoomItems, addRoomItem, deleteRoomItem } from '../../services/dbService';
import { useToast } from '../../context/ToastContext';
import { fetchAICArtworks } from '../../services/aicApi';

const SharedBoardView = ({ room, isSidebarOpen, onSidebarToggle }) => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [items, setItems] = useState([]);
    const [curationResults, setCurationResults] = useState([]);
    const [curationLoading, setCurationLoading] = useState(false);
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
    const [newNote, setNewNote] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!room?.id) return;
        const unsubscribe = subscribeToRoomItems(room.id, 'shared', null, setItems);
        return () => unsubscribe();
    }, [room?.id]);

    useEffect(() => {
        if (isSidebarOpen) {
            handleFetchCuration();
        }
    }, [isSidebarOpen]);

    const handleFetchCuration = async () => {
        setCurationLoading(true);
        const data = await fetchAICArtworks({ page: 1, filters: { medium: 'painting' } });
        setCurationResults(data.items || []);
        setCurationLoading(false);
    };

    const handleAddNote = async () => {
        if (!newNote.trim()) return;
        setLoading(true);
        try {
            await addRoomItem(room.id, user.uid, {
                type: 'note',
                content: newNote,
                boardType: 'shared',
                authorName: user.displayName || user.email.split('@')[0]
            });
            setNewNote('');
            setIsNoteModalOpen(false);
            showToast("Fikir panoya eklendi! ✨");
        } catch (error) {
            showToast("Not eklenirken hata oluştu.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleAddCurationItem = async (art) => {
        try {
            await addRoomItem(room.id, user.uid, {
                type: 'image',
                content: art.image_url || art.thumbnail,
                title: art.title,
                boardType: 'shared',
                authorName: user.displayName || user.email.split('@')[0]
            });
            showToast("Sanat eseri ortak panoya taşındı! 🖼️✨");
        } catch (error) {
            showToast("Eser eklenemedi.", "error");
        }
    };

    const handleDeleteItem = async (itemId) => {
        try {
            await deleteRoomItem(itemId);
            showToast("Öge kaldırıldı.");
        } catch (error) {
            showToast("İşlem başarısız.");
        }
    };

    return (
        <div className="h-full flex overflow-hidden">
            <main className="flex-1 overflow-y-auto p-10 pb-32 relative scrollbar-hide">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-12">
                        <div className="flex items-center justify-between mb-4">
                            <h1 className="font-display text-5xl font-bold italic tracking-tight">Ortak İlham Panosu.</h1>
                            <div className="flex -space-x-3 items-center">
                                {room?.participants?.map((p, i) => (
                                    <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-soft-peach flex items-center justify-center text-[10px] font-bold shadow-lg">
                                        {i + 1}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <p className="text-lg text-text-muted leading-relaxed max-w-2xl italic">Ekipten gelen anlık referanslar ve kolektif yaratıcılık alanı canım.</p>
                    </div>

                    <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-8 space-y-8">
                        {items.map(item => (
                            <div key={item.id} className="break-inside-avoid group relative rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-700 bg-white border border-border-light/40 relative">
                                {item.type === 'image' ? (
                                    <div className="relative">
                                        <img src={item.content} alt="Reference" className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-[1.2s]" />
                                        <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-start gap-1">
                                            <p className="text-white text-[10px] font-black uppercase tracking-widest">{item.authorName} EKLEDİ</p>
                                            <p className="text-white/80 text-xs italic">{item.title}</p>
                                        </div>
                                        <div className="absolute top-4 right-4 flex gap-2 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                                            <button onClick={() => handleDeleteItem(item.id)} className="p-3 bg-white text-red-500 rounded-full shadow-2xl"><LucideX size={18} /></button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-[#FFFDF0] p-10 pt-12 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleDeleteItem(item.id)} className="p-2 text-text-muted hover:text-red-500"><LucideX size={14} /></button>
                                        </div>
                                        <LucideEdit3 size={16} className="text-orange-400 mb-8" />
                                        <p className="font-serif text-xl italic leading-relaxed text-text-main whitespace-pre-line">
                                            {item.content}
                                        </p>
                                        <div className="mt-10 pt-8 border-t border-black/5 flex items-center gap-3">
                                            <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div>
                                            <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">{item.authorName} PAYLAŞTI</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {items.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-40 text-center opacity-20">
                            <LucideSparkles size={80} className="mb-6" />
                            <p className="text-sm font-black uppercase tracking-[0.3em]">Henüz ortak bir kıvılcım yok.</p>
                        </div>
                    )}

                    {/* Quick Toolbar */}
                    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-white/70 backdrop-blur-3xl border border-white/40 shadow-2xl rounded-[2.5rem] px-6 py-4 flex items-center gap-4 z-[70] animate-in slide-in-from-bottom-8 duration-1000">
                        <button onClick={() => setIsNoteModalOpen(true)} className="flex items-center gap-3 px-6 py-3 rounded-2xl hover:bg-black/5 transition-all text-[10px] font-black uppercase tracking-widest text-text-main group">
                            <LucideEdit3 size={20} className="text-accent-blue group-hover:scale-110 transition-transform" /> Fikir Yaz
                        </button>
                        <div className="w-px h-8 bg-black/10 mx-2"></div>
                        <button className="flex items-center gap-3 px-6 py-3 rounded-2xl hover:bg-black/5 transition-all text-[10px] font-black uppercase tracking-widest text-text-main group">
                            <LucideFileUp size={20} className="text-accent-blue group-hover:scale-110 transition-transform" /> Görsel At
                        </button>
                    </div>
                </div>
            </main>

            {/* Curation Sidebar */}
            <aside className={`w-[450px] flex-shrink-0 border-l border-border-light/40 bg-surface-light flex flex-col z-50 shadow-2xl transition-all duration-700 ${isSidebarOpen ? 'mr-0' : '-mr-[450px]'}`}>
                <div className="p-10 border-b border-border-light/40 bg-white/50 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="font-display text-3xl font-bold italic text-text-main leading-tight">Derinlikli <br /> <span className="text-accent-blue">Kürasyon.</span></h2>
                        <button onClick={onSidebarToggle} className="p-3 hover:bg-black/5 rounded-2xl transition-all"><LucideX size={20} /></button>
                    </div>
                    <p className="text-sm text-text-muted italic">Kelimelerle değil, estetik referanslarla keşıf yap canım.</p>
                </div>

                <div className="flex-1 overflow-y-auto p-10 space-y-10 scrollbar-hide">
                    <div className="relative group">
                        <LucideSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent-blue transition-colors" size={20} />
                        <input
                            placeholder="Sanat eseri ara..."
                            className="w-full pl-14 pr-6 py-5 rounded-[2rem] bg-white border-none shadow-sm focus:ring-4 focus:ring-accent-blue/5 transition-all text-sm font-medium"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        {curationLoading ? (
                            [1, 2, 3, 4, 5, 6].map(i => <div key={i} className="aspect-[3/4] rounded-3xl bg-surface-light/50 animate-pulse border border-border-light/20"></div>)
                        ) : curationResults.map((art, i) => (
                            <div key={i} className="group relative rounded-3xl overflow-hidden aspect-[3/4] shadow-sm hover:shadow-xl transition-all duration-500 bg-white border border-border-light/30">
                                <img src={art.thumbnail} alt={art.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-5 backdrop-blur-[2px]">
                                    <button
                                        onClick={() => handleAddCurationItem(art)}
                                        className="w-full py-4 bg-white text-text-main rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all"
                                    >
                                        Panoya Taşı
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={handleFetchCuration}
                        className="w-full py-6 border-2 border-dashed border-border-light/60 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] text-text-muted hover:text-accent-blue hover:border-accent-blue/40 transition-all flex items-center justify-center gap-3 group"
                    >
                        KEŞFETMEYE DEVAM ET <LucideRefreshCcw size={16} className="group-hover:rotate-180 transition-transform duration-700" />
                    </button>
                </div>
            </aside>

            {/* Note Modal */}
            {isNoteModalOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={() => setIsNoteModalOpen(false)} />
                    <div className="relative w-full max-w-xl bg-white rounded-[3rem] p-12 shadow-2xl animate-in fade-in zoom-in duration-300 border border-white/20">
                        <h3 className="text-3xl font-display font-bold mb-2 italic">Kolektif Fikir.</h3>
                        <p className="text-text-muted text-sm mb-8 italic">Panoya herkesin göreceği bir not bırak canım.</p>

                        <textarea
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            placeholder="Bu teknik hakkında ne düşünüyorsunuz?"
                            className="w-full h-48 bg-surface-light rounded-[2rem] p-8 border-none focus:ring-4 focus:ring-accent-blue/10 outline-none transition-all resize-none mb-8 text-xl font-serif italic"
                            autoFocus
                        />

                        <div className="flex gap-4">
                            <button onClick={() => setIsNoteModalOpen(false)} className="flex-1 py-4 text-text-muted font-bold uppercase tracking-widest text-[10px]">Vazgeç</button>
                            <button
                                onClick={handleAddNote}
                                disabled={loading || !newNote.trim()}
                                className="flex-[2] bg-accent-blue text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-accent-blue-hover transition-all shadow-xl shadow-accent-blue/20"
                            >
                                {loading ? 'Paylaşılıyor...' : 'Herkesle Paylaş'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SharedBoardView;
