import React, { useState } from 'react';
import { LucideShare2, LucideMoreHorizontal, LucidePlus, LucideEdit3, LucideFileUp, LucideSparkles, LucideX, LucideSearch, LucideRefreshCcw, LucideFilter } from 'lucide-react';

const SharedBoardView = ({ room, onBack }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const [boardItems] = useState([
        { id: 1, type: 'image', url: 'https://images.unsplash.com/photo-1549490349-8643362247b5?q=80&w=800', author: 'Ayşe' },
        { id: 2, type: 'note', text: '"Kapakta kullanılacak serif fontun, metin içindeki sans-serif ile yarattığı kontrast modern bir his vermeli."', author: 'Ali', color: 'bg-[#FFFDF0]' },
        { id: 3, type: 'image', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=800', title: 'Grid Referansı' },
    ]);

    return (
        <div className="h-screen overflow-hidden flex flex-col bg-[#FDFBF7] dark:bg-[#1A1A1A] text-text-main dark:text-white transition-colors duration-300">
            {/* Nav Header */}
            <header className="h-20 border-b border-black/5 dark:border-white/5 bg-white dark:bg-zinc-900 flex items-center justify-between px-8 flex-shrink-0 z-50 shadow-sm transition-all">
                <div className="flex items-center gap-6">
                    <button onClick={onBack} className="font-serif font-bold text-3xl italic tracking-tighter text-accent-blue">Kibele.</button>
                    <div className="h-8 w-px bg-black/10 dark:bg-white/10"></div>
                    <div className="flex flex-col">
                        <span className="text-[10px] text-accent-blue uppercase tracking-[0.2em] font-black">Ortak İlham Odası</span>
                        <span className="text-sm font-semibold text-text-main dark:text-white">{room?.name || 'VCD Kitap Tasarımı'}</span>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3 text-xs font-bold text-text-muted dark:text-gray-400">
                        <div className="flex -space-x-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="w-9 h-9 rounded-full border-2 border-white dark:border-zinc-900 bg-soft-peach flex items-center justify-center shadow-lg">
                                    <span className="text-[10px]">U{i}</span>
                                </div>
                            ))}
                        </div>
                        <span className="ml-2 font-mono tracking-widest">+2 KATILIMCI</span>
                    </div>
                    <button className="flex items-center gap-2 px-5 py-2.5 rounded-2xl border border-black/10 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all text-xs font-bold uppercase tracking-widest shadow-sm">
                        <LucideShare2 size={16} /> Paylaş
                    </button>
                    <button className="w-10 h-10 rounded-2xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
                        <LucideMoreHorizontal size={24} />
                    </button>
                </div>
            </header>

            <main className="flex-1 flex overflow-hidden relative">
                {/* Board Content */}
                <div className="flex-1 overflow-y-auto p-10 pb-32 relative scrollbar-hide">
                    <div className="max-w-7xl mx-auto">
                        <div className="mb-12">
                            <h1 className="font-serif text-5xl font-bold mb-3 italic">Ortak İlham Panosu</h1>
                            <p className="text-lg text-text-muted dark:text-gray-400 max-w-2xl leading-relaxed">Ekip ile toplanan referanslar ve yaratıcı fikirler canım.</p>
                        </div>

                        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-8 space-y-8">
                            {boardItems.map(item => (
                                <div key={item.id} className="break-inside-avoid group relative rounded-[2rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-700 bg-white dark:bg-zinc-800 border border-black/5 dark:border-white/5">
                                    {item.type === 'image' ? (
                                        <div className="relative">
                                            <img src={item.url} alt="Reference" className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-[1.2s]" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
                                                <button className="w-12 h-12 rounded-full bg-white text-zinc-900 flex items-center justify-center hover:bg-zinc-100 shadow-2xl"><LucidePlus size={20} /></button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className={`${item.color} dark:bg-zinc-800/80 p-8 pt-10`}>
                                            <LucideEdit3 size={16} className="text-orange-500 mb-6" />
                                            <p className="font-serif text-xl italic leading-relaxed text-text-main dark:text-white">
                                                {item.text}
                                            </p>
                                            <div className="mt-8 pt-6 border-t border-black/5 dark:border-white/5 flex items-center gap-3">
                                                <div className="w-6 h-6 rounded-full bg-zinc-200"></div>
                                                <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{item.author} ekledi</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Toolbar */}
                    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 md:left-auto md:right-[460px] md:translate-x-0 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-3xl border border-white/40 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-[2rem] px-4 py-3 flex items-center gap-2 z-40 animate-in slide-in-from-bottom-5 duration-700">
                        <button className="flex items-center gap-3 px-6 py-3 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-all text-xs font-bold uppercase tracking-widest text-text-main dark:text-white">
                            <LucideEdit3 size={18} className="text-accent-blue" /> Yazı
                        </button>
                        <div className="w-px h-8 bg-black/10 dark:bg-white/10 mx-1"></div>
                        <button className="flex items-center gap-3 px-6 py-3 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-all text-xs font-bold uppercase tracking-widest text-text-main dark:text-white">
                            <LucideFileUp size={18} className="text-accent-blue" /> Yükle
                        </button>
                        <div className="w-px h-8 bg-black/10 dark:bg-white/10 mx-1"></div>
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className={`flex items-center gap-3 px-8 py-3 rounded-2xl transition-all text-xs font-bold uppercase tracking-widest shadow-lg ${isSidebarOpen ? 'bg-accent-blue text-white shadow-accent-blue/20' : 'bg-white/50 text-accent-blue hover:bg-accent-blue hover:text-white'}`}
                        >
                            <LucideSparkles size={18} /> Derinlikli Kürasyon
                        </button>
                    </div>
                </div>

                {/* Sidebar: Deep Curation Tools */}
                <aside className={`w-[450px] flex-shrink-0 border-l border-black/5 dark:border-white/5 bg-[#FDF8F5] dark:bg-zinc-950 flex flex-col z-50 shadow-2xl transition-all duration-700 ${isSidebarOpen ? 'mr-0' : '-mr-[450px]'}`}>
                    <div className="p-8 border-b border-black/5 dark:border-white/5 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md sticky top-0 z-10">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-serif text-3xl font-bold italic text-text-main dark:text-white">Derinlikli Kürasyon</h2>
                            <button
                                onClick={() => setIsSidebarOpen(false)}
                                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                            >
                                <LucideX size={20} />
                            </button>
                        </div>
                        <p className="text-sm text-text-muted dark:text-gray-400">Aradığınızı kelimelerle değil, estetik referanslarla bulun canım.</p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-hide">
                        {/* Search Bar */}
                        <div className="relative">
                            <LucideSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                            <input
                                placeholder="Sanat eseri ara..."
                                className="w-full pl-12 pr-6 py-4 rounded-2xl bg-white dark:bg-zinc-800 border-none shadow-sm focus:ring-2 focus:ring-accent-blue/20 transition-all text-sm"
                            />
                        </div>

                        {/* Results Grid - Using placeholders for now */}
                        <div className="grid grid-cols-2 gap-4">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="group relative rounded-2xl overflow-hidden aspect-[3/4] bg-zinc-200 dark:bg-zinc-800 animate-pulse">
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                                        <button className="w-full py-3 bg-white text-zinc-900 rounded-xl text-xs font-bold uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all">
                                            Panoya Ekle
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button className="w-full py-4 border-2 border-dashed border-black/10 dark:border-white/10 rounded-2xl text-xs font-bold uppercase tracking-widest text-text-muted hover:text-accent-blue hover:border-accent-blue/30 transition-all flex items-center justify-center gap-2">
                            Daha Fazla Gör <LucideRefreshCcw size={14} className="animate-spin-slow" />
                        </button>
                    </div>

                    {/* Footer Filters */}
                    <div className="p-6 bg-white dark:bg-zinc-900 border-t border-black/5 dark:border-white/5">
                        <button className="w-full flex items-center justify-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-accent-blue">
                            <LucideFilter size={14} /> Filtreleri Yönet
                        </button>
                    </div>
                </aside>
            </main>
        </div>
    );
};

export default SharedBoardView;
