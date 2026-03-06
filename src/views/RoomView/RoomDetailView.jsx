import React, { useState } from 'react';
import { LucideLock, LucideSettings, LucidePlus, LucideImage, LucideZoomIn, LucideMoreHorizontal, LucideSchool, LucideSend, LucidePlusCircle } from 'lucide-react';
import KibeleChat from '../../components/KibeleChat';

const RoomDetailView = ({ room, onBack }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Mock data for masonry items
    const [items] = useState([
        { id: 1, type: 'image', url: 'https://images.unsplash.com/photo-1544413647-ad3499413247?q=80&w=800', title: 'Brutalist Architecture' },
        { id: 2, type: 'note', text: 'TYPO\n\nİsviçre stili dikey dizgi denemesi', color: 'bg-white' },
        { id: 3, type: 'image', url: 'https://images.unsplash.com/photo-1513364233144-b8a910c81062?q=80&w=800', title: 'Book Layout' },
        { id: 4, type: 'image', url: 'https://images.unsplash.com/photo-1581456410214-411a04467568?q=80&w=800', title: 'Typography' },
        { id: 5, type: 'note', text: 'Asimetrik grid sistemi taslağı', color: 'bg-zinc-100' },
        { id: 6, type: 'image', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=800', title: 'Concrete Texture' },
    ]);

    return (
        <div className="min-h-screen bg-[#F5F3F1] dark:bg-[#1A1A1A] transition-colors duration-300">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-40 px-6 py-6">
                <div className="max-w-7xl mx-auto flex items-center justify-between bg-white/80 dark:bg-zinc-800/80 backdrop-blur-xl rounded-full px-8 py-4 shadow-sm border border-white/40 dark:border-white/10">
                    <div className="flex items-center gap-3">
                        <button onClick={onBack} className="text-2xl font-serif font-semibold text-text-main dark:text-white">Kibele.</button>
                    </div>
                    <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
                        <button onClick={onBack} className="text-text-muted dark:text-gray-300 hover:text-accent-blue transition-colors">Odalarım</button>
                        <button className="text-text-main dark:text-white font-semibold">Aktif Çalışma</button>
                    </nav>
                    <div className="flex items-center gap-4">
                        <div className="flex -space-x-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-zinc-800 bg-soft-peach flex items-center justify-center overflow-hidden">
                                    <span className="text-[10px] font-bold">U{i}</span>
                                </div>
                            ))}
                        </div>
                        <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors">
                            <LucideSettings size={20} className="text-text-muted" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="pt-32 pb-24 px-6 md:px-12 lg:px-24">
                <div className="max-w-7xl mx-auto">
                    {/* Room Info */}
                    <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-xs font-bold px-3 py-1 bg-white dark:bg-zinc-800 rounded-full shadow-sm text-accent-blue flex items-center gap-1.5 border border-accent-blue/10">
                                    <LucideLock size={12} /> Özel Alan
                                </span>
                                <span className="text-text-muted dark:text-gray-400 text-xs tracking-wider uppercase font-medium">{room?.category || 'VCD Kitap Tasarımı Projesi'}</span>
                            </div>
                            <h1 className="text-4xl md:text-6xl font-serif font-bold text-text-main dark:text-white mb-4 italic">
                                {room?.name || 'İlham Odası'}
                            </h1>
                            <p className="text-lg text-text-muted dark:text-gray-400 max-w-2xl leading-relaxed">
                                {room?.description || 'Bu alanda VCD proje ödevim için topladığım brutalist mimari, tipografi ve kitap düzeni referanslarını biriktiriyorum.'}
                            </p>
                        </div>
                        <div className="flex bg-white/50 dark:bg-zinc-800/50 p-1.5 rounded-2xl shadow-sm border border-white/40 dark:border-white/10 self-start md:self-auto backdrop-blur-sm">
                            <button className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-accent-blue text-white shadow-xl shadow-accent-blue/20 transition-all">
                                Bireysel Alan
                            </button>
                            <button className="px-6 py-2.5 rounded-xl text-sm font-medium text-text-muted dark:text-gray-400 hover:text-text-main transition-all">
                                Ortak Pano
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-8 items-start">
                        {/* Content Area */}
                        <div className="lg:w-2/3 w-full">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-2xl font-serif font-semibold text-text-main dark:text-white flex items-center gap-3">
                                    <LucideImage className="text-accent-blue" /> Referanslar
                                </h2>
                                <div className="flex items-center gap-3">
                                    <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white dark:bg-zinc-800 shadow-sm border border-white dark:border-white/10 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-zinc-700 transition-all">
                                        <LucidePlus size={18} /> Yeni Ekle
                                    </button>
                                </div>
                            </div>

                            {/* Masonry-like Grid */}
                            <div className="columns-1 md:columns-2 gap-6 space-y-6">
                                {items.map((item) => (
                                    <div key={item.id} className="break-inside-avoid animate-in zoom-in-95 duration-500">
                                        {item.type === 'image' ? (
                                            <div className="group relative rounded-3xl overflow-hidden bg-white dark:bg-zinc-800 shadow-sm border border-white dark:border-white/10 hover:shadow-2xl hover:shadow-accent-blue/10 transition-all duration-500">
                                                <img src={item.url} alt={item.title} className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700" />
                                                <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <p className="text-white text-sm font-medium">{item.title}</p>
                                                </div>
                                                <div className="absolute top-4 right-4 flex gap-2 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                                                    <button className="p-2 bg-white/90 rounded-full text-zinc-900 shadow-xl overflow-hidden backdrop-blur-sm"><LucideZoomIn size={16} /></button>
                                                    <button className="p-2 bg-white/90 rounded-full text-zinc-900 shadow-xl overflow-hidden backdrop-blur-sm"><LucideMoreHorizontal size={16} /></button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className={`${item.color} dark:bg-zinc-800 rounded-3xl p-8 border border-white dark:border-white/10 shadow-sm hover:shadow-xl transition-all duration-500`}>
                                                <p className="font-serif text-xl italic text-text-main dark:text-white whitespace-pre-line leading-relaxed">
                                                    {item.text}
                                                </p>
                                                <div className="mt-6 pt-6 border-t border-black/5 dark:border-white/5 flex justify-between items-center">
                                                    <span className="text-[10px] text-text-muted uppercase tracking-widest font-bold">Fikir Notu</span>
                                                    <button className="text-text-muted hover:text-text-main transition-colors"><LucideMoreHorizontal size={18} /></button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Sidebar: Kibele AI Chat */}
                        <div className="lg:w-1/3 w-full sticky top-32">
                            <div className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl rounded-[2.5rem] border border-white dark:border-white/10 shadow-2xl overflow-hidden flex flex-col h-[700px]">
                                {/* Chat Header */}
                                <div className="p-6 border-b border-black/5 dark:border-white/5 bg-soft-peach/30 dark:bg-zinc-800/30 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-accent-blue flex items-center justify-center text-white shadow-lg">
                                            <LucideSchool size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-serif font-bold text-text-main dark:text-white">Kibele Hoca</h3>
                                            <span className="text-[10px] text-accent-blue font-bold uppercase tracking-widest">Yapay Zeka Destekli Rehber</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Minimal Chat View */}
                                <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                                    <div className="bg-zinc-100 dark:bg-zinc-800/50 p-4 rounded-[1.5rem] rounded-tl-none text-sm text-text-main dark:text-gray-300 border border-black/5">
                                        Görsellerindeki blok yapılarla uyumlu olması için metin bloklarını asimetrik ama keskin hatlarla yerleştirmeni öneririm. "it is okey", harika gidiyorsun!
                                    </div>
                                    <div className="flex justify-end">
                                        <div className="bg-accent-blue text-white p-4 rounded-[1.5rem] rounded-tr-none text-sm shadow-lg shadow-accent-blue/20 max-w-[80%]">
                                            Hocam, renk paletinde brutalist etkiyi nasıl daha fazla vurgulayabilirim?
                                        </div>
                                    </div>
                                    <div className="bg-soft-peach/20 dark:bg-zinc-800 border-2 border-accent-blue/10 p-5 rounded-[1.5rem] rounded-tl-none text-sm">
                                        <p className="mb-4">Şu referanslara bir göz at canım, bu paletler senin tasarımına çok yakışır:</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="rounded-xl overflow-hidden aspect-video bg-zinc-200"></div>
                                            <div className="rounded-xl overflow-hidden aspect-video bg-zinc-300"></div>
                                        </div>
                                    </div>
                                </div>

                                {/* Chat Input */}
                                <div className="p-6 border-t border-black/5 dark:border-white/5 bg-white/50 dark:bg-zinc-900/50">
                                    <div className="relative flex items-center gap-2 bg-white dark:bg-zinc-800 rounded-2xl p-2.5 shadow-inner border border-black/5 group-focus-within:border-accent-blue transition-all">
                                        <button className="p-2 text-text-muted hover:text-accent-blue transition-all">
                                            <LucidePlusCircle size={22} />
                                        </button>
                                        <input
                                            placeholder="Kibele'ye danış..."
                                            className="w-full bg-transparent border-none focus:ring-0 text-sm py-2"
                                        />
                                        <button className="bg-accent-blue text-white p-2.5 rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all">
                                            <LucideSend size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default RoomDetailView;
