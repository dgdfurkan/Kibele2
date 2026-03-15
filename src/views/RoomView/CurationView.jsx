import React, { useEffect, useState } from 'react';
import { LucideSparkles, LucidePlus, LucideExternalLink, LucideSearch, LucideLoader2 } from 'lucide-react';
import { subscribeToCurations } from '../../services/dbService';

const CurationView = ({ roomId, onAddToCanvas, isArchiveMode }) => {
    const [curations, setCurations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!roomId) return;
        
        const unsubscribe = subscribeToCurations(roomId, (items) => {
            setCurations(items);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [roomId]);

    const filteredCurations = curations.filter(item => 
        (item.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.artist || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="w-full h-full flex flex-col bg-[#FDF8F5] p-6 lg:p-10 overflow-hidden">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div className="max-w-2xl">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-2xl bg-accent-blue/10 flex items-center justify-center text-accent-blue shadow-sm">
                            <LucideSparkles size={20} />
                        </div>
                        <h2 className="text-3xl font-display font-bold text-text-main italic tracking-tight">Kürasyon Odası</h2>
                    </div>
                    <p className="text-text-muted leading-relaxed">
                        Keşfet tünelinden beğendiğiniz ve odaya sakladığınız ilham kaynakları burada toplanır. 
                        İstediğiniz an bunları tuvale çekebilir veya referans alabilirsiniz.
                    </p>
                </div>

                <div className="relative group min-w-[300px]">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Kürasyonda ara..."
                        className="w-full bg-white rounded-2xl py-3.5 pl-11 pr-4 outline-none text-sm border border-border-light/40 shadow-sm transition-all focus:ring-2 focus:ring-accent-blue/10 focus:border-accent-blue/30"
                    />
                    <LucideSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                </div>
            </div>

            {/* Content Section */}
            <div className="flex-1 overflow-y-auto scrollbar-hide">
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center">
                        <LucideLoader2 size={40} className="text-accent-blue animate-spin mb-4" />
                        <p className="text-sm font-bold uppercase tracking-widest text-text-muted animate-pulse">Kürasyonlar Yükleniyor...</p>
                    </div>
                ) : filteredCurations.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 pb-20">
                        {filteredCurations.map((item) => (
                            <div 
                                key={item.id} 
                                className="group bg-white rounded-3xl overflow-hidden border border-border-light/40 shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col"
                            >
                                <div className="relative aspect-[3/4] overflow-hidden bg-[#F5F5F5]">
                                    <img 
                                        src={item.image_url || item.thumbnail} 
                                        alt={item.title} 
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-3">
                                        {!isArchiveMode && (
                                            <button 
                                                onClick={() => onAddToCanvas(item)}
                                                className="w-12 h-12 rounded-2xl bg-white text-accent-blue shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                                                title="Tuvale Ekle"
                                            >
                                                <LucidePlus size={24} />
                                            </button>
                                        )}
                                        <a 
                                            href={item.image_url || item.thumbnail} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="w-12 h-12 rounded-2xl bg-black/40 backdrop-blur-md text-white border border-white/20 flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                                            title="Tam Boyut Gör"
                                        >
                                            <LucideExternalLink size={20} />
                                        </a>
                                    </div>
                                </div>
                                <div className="p-5 flex flex-col flex-1">
                                    <h4 className="font-bold text-text-main text-sm line-clamp-2 mb-1 group-hover:text-accent-blue transition-colors">{item.title}</h4>
                                    <p className="text-[10px] text-text-muted uppercase font-black tracking-widest mb-3 line-clamp-1">{item.artist || 'Sanatçı Bilinmiyor'}</p>
                                    
                                    <div className="mt-auto pt-4 border-t border-border-light/40 flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-bold text-text-muted/60 uppercase">Ekleyen</span>
                                            <span className="text-[10px] font-bold text-text-main">{item.curatedByName}</span>
                                        </div>
                                        <div className="w-6 h-6 rounded-lg bg-surface-light flex items-center justify-center text-[10px] font-black text-text-muted">
                                            {item.curatedByName?.charAt(0)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center bg-white/40 border-2 border-dashed border-border-light/60 rounded-[3rem]">
                        <div className="w-20 h-20 rounded-full bg-surface-light flex items-center justify-center mb-6 opacity-40">
                            <LucideSearch size={32} className="text-text-muted" />
                        </div>
                        <h3 className="text-xl font-bold text-text-main mb-2">Henüz kürasyon yok</h3>
                        <p className="text-text-muted max-w-xs text-center px-6">
                            Keşfet kısmından dilediğiniz eserleri kürasyona ekleyerek burada biriktirebilirsiniz.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CurationView;
