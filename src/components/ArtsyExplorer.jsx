import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LucideSearch, LucideX, LucideSparkles, LucideFilter, LucideCheck, LucideChevronDown, LucideChevronUp, LucidePlus, LucideRefreshCcw, LucideTrash2 } from 'lucide-react';
import { searchArtsyArtworks, ARTSY_FILTERS } from '../services/artsyService';

const ArtsyExplorer = ({ onAddArtwork, onClose, isArchiveMode }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    // Multi-select state
    const [filters, setFilters] = useState({
        artwork_type: [],
        artists: [],
        colors: [],
        places: []
    });

    const [expandedFilters, setExpandedFilters] = useState({
        artwork_type: false,
        artists: false,
        places: false,
        colors: true
    });

    const [enlargedArtwork, setEnlargedArtwork] = useState(null);

    const lastSearchRef = useRef(null);

    // Initial search and filter change
    useEffect(() => {
        handleSearch(true);
    }, [filters]);

    // Debounced search logic for text input
    useEffect(() => {
        const timer = setTimeout(() => {
            if (query !== lastSearchRef.current) {
                handleSearch(true);
                lastSearchRef.current = query;
            }
        }, 600);
        return () => clearTimeout(timer);
    }, [query]);

    const handleSearch = async (isNew = true) => {
        if (loading) return;
        setLoading(true);
        const currentPage = isNew ? 1 : page;

        try {
            const data = await searchArtsyArtworks({
                query,
                page: currentPage,
                ...filters
            });

            if (isNew) {
                setResults(data.items);
                setPage(2);
            } else {
                setResults(prev => [...prev, ...data.items]);
                setPage(prev => prev + 1);
            }

            setHasMore(data.items && data.items.length > 0);
        } catch (error) {
            console.error("Search Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleFilter = (type, id) => {
        if (isArchiveMode) return;
        setFilters(prev => {
            const current = prev[type];
            const next = current.includes(id)
                ? current.filter(item => item !== id)
                : [...current, id];
            return { ...prev, [type]: next };
        });
    };

    const clearFilters = () => {
        setFilters({ artwork_type: [], artists: [], colors: [], places: [] });
    };

    const toggleSection = (section) => {
        setExpandedFilters(prev => ({ ...prev, [section]: !prev[section] }));
    };

    return (
        <div className="h-full flex flex-col bg-[#FDF8F5] dark:bg-[#1E1C1A] border-l border-border-light/40 shadow-[-4px_0_24px_rgba(0,0,0,0.05)] overflow-hidden">
            {/* STICKY TOP SECTION: Header + Filters */}
            <div className="flex-shrink-0 z-20 bg-white/90 backdrop-blur-xl border-b border-border-light/40 shadow-sm">
                <div className="p-6 pb-2">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-accent-blue/10 flex items-center justify-center text-accent-blue">
                                <LucideSparkles size={18} />
                            </div>
                            <div>
                                <h2 className="text-xl font-display font-bold italic text-text-main leading-tight">Derinlikli Kürasyon</h2>
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-text-muted/60">Kibele AI x AIC Explorer</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-surface-light rounded-xl transition-all text-text-muted hover:text-accent-blue">
                            <LucideX size={20} />
                        </button>
                    </div>

                    <div className="relative group mb-4">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Sanatçı, stil veya dönem ara..."
                            className="w-full bg-white rounded-2xl py-4 pl-12 pr-4 border border-border-light/40 focus:ring-4 focus:ring-accent-blue/5 focus:border-accent-blue/30 outline-none transition-all text-sm font-medium shadow-sm italic placeholder:text-text-muted/30"
                        />
                        <LucideSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent-blue transition-colors" size={18} />
                        {loading && <LucideRefreshCcw className="absolute right-4 top-1/2 -translate-y-1/2 text-accent-blue animate-spin" size={14} />}
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT AREA: Filters on Left, Grid on Right */}
            <div className="flex-1 flex overflow-hidden">
                {/* Desktop: Sidebar Filters, Mobile: Accordion above grid */}
                <div className="w-full md:w-[280px] shrink-0 border-r border-border-light/40 flex flex-col bg-white">
                    <div className="p-4 border-b border-border-light/40 flex justify-between items-center sticky top-0 bg-white/90 z-20">
                        <span className="text-[10px] font-black uppercase tracking-widest text-text-muted flex items-center gap-2">
                            <LucideFilter size={10} /> Filtreler
                        </span>
                        {Object.values(filters).some(arr => arr.length > 0) && (
                            <button onClick={clearFilters} className="text-[10px] font-bold text-accent-blue hover:text-red-500 transition-colors flex items-center gap-1">
                                <LucideTrash2 size={10} /> Temizle
                            </button>
                        )}
                    </div>
                    
                    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-4">
                        {/* Eser Tipi Accordion */}
                        <div className="border-b border-border-light/40 pb-4">
                            <button 
                                onClick={() => toggleSection('artwork_type')} 
                                className="w-full flex justify-between items-center text-sm font-bold text-text-main group"
                            >
                                <span>Eser Tipi {filters.artwork_type.length > 0 && <span className="text-accent-blue ml-1">({filters.artwork_type.length})</span>}</span>
                                <LucideChevronDown size={14} className={`text-text-muted transition-transform duration-300 group-hover:text-accent-blue ${expandedFilters.artwork_type ? 'rotate-180' : ''}`} />
                            </button>
                            {expandedFilters.artwork_type && (
                                <div className="mt-3 space-y-1 animate-in slide-in-from-top-2 duration-200">
                                    {ARTSY_FILTERS.artwork_type.map(m => (
                                        <button 
                                            key={m.id} 
                                            onClick={() => toggleFilter('artwork_type', m.id)} 
                                            className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all flex items-center gap-3 group ${filters.artwork_type.includes(m.id) ? 'bg-accent-blue/10 text-accent-blue font-semibold' : 'hover:bg-surface-light text-text-muted hover:text-text-main'}`}
                                        >
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${filters.artwork_type.includes(m.id) ? 'bg-accent-blue border-accent-blue text-white' : 'border-border-light group-hover:border-accent-blue/50'}`}>
                                                {filters.artwork_type.includes(m.id) && <LucideCheck size={10} strokeWidth={3} />}
                                            </div>
                                            <span className="truncate">{m.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Sanatçı Accordion */}
                        <div className="border-b border-border-light/40 pb-4">
                            <button 
                                onClick={() => toggleSection('artists')} 
                                className="w-full flex justify-between items-center text-sm font-bold text-text-main group"
                            >
                                <span>Sanatçı {filters.artists.length > 0 && <span className="text-accent-blue ml-1">({filters.artists.length})</span>}</span>
                                <LucideChevronDown size={14} className={`text-text-muted transition-transform duration-300 group-hover:text-accent-blue ${expandedFilters.artists ? 'rotate-180' : ''}`} />
                            </button>
                            {expandedFilters.artists && (
                                <div className="mt-3 space-y-1 animate-in slide-in-from-top-2 duration-200">
                                    {ARTSY_FILTERS.artists.map(s => (
                                        <button 
                                            key={s.id} 
                                            onClick={() => toggleFilter('artists', s.id)} 
                                            className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all flex items-center gap-3 group ${filters.artists.includes(s.id) ? 'bg-accent-blue/10 text-accent-blue font-semibold' : 'hover:bg-surface-light text-text-muted hover:text-text-main'}`}
                                        >
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${filters.artists.includes(s.id) ? 'bg-accent-blue border-accent-blue text-white' : 'border-border-light group-hover:border-accent-blue/50'}`}>
                                                {filters.artists.includes(s.id) && <LucideCheck size={10} strokeWidth={3} />}
                                            </div>
                                            <span className="truncate">{s.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Ülke Accordion */}
                        <div className="border-b border-border-light/40 pb-4">
                            <button 
                                onClick={() => toggleSection('places')} 
                                className="w-full flex justify-between items-center text-sm font-bold text-text-main group"
                            >
                                <span>Ülke {filters.places.length > 0 && <span className="text-accent-blue ml-1">({filters.places.length})</span>}</span>
                                <LucideChevronDown size={14} className={`text-text-muted transition-transform duration-300 group-hover:text-accent-blue ${expandedFilters.places ? 'rotate-180' : ''}`} />
                            </button>
                            {expandedFilters.places && (
                                <div className="mt-3 space-y-1 animate-in slide-in-from-top-2 duration-200">
                                    {ARTSY_FILTERS.places.map(p => (
                                        <button 
                                            key={p.id} 
                                            onClick={() => toggleFilter('places', p.id)} 
                                            className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all flex items-center gap-3 group ${filters.places.includes(p.id) ? 'bg-accent-blue/10 text-accent-blue font-semibold' : 'hover:bg-surface-light text-text-muted hover:text-text-main'}`}
                                        >
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${filters.places.includes(p.id) ? 'bg-accent-blue border-accent-blue text-white' : 'border-border-light group-hover:border-accent-blue/50'}`}>
                                                {filters.places.includes(p.id) && <LucideCheck size={10} strokeWidth={3} />}
                                            </div>
                                            <span className="truncate">{p.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Renk Accordion */}
                        <div className="pb-4">
                            <button 
                                onClick={() => toggleSection('colors')} 
                                className="w-full flex justify-between items-center text-sm font-bold text-text-main group mb-3"
                            >
                                <span>Renk {filters.colors.length > 0 && <span className="text-accent-blue ml-1">({filters.colors.length})</span>}</span>
                                <LucideChevronDown size={14} className={`text-text-muted transition-transform duration-300 group-hover:text-accent-blue ${expandedFilters.colors ? 'rotate-180' : ''}`} />
                            </button>
                            {expandedFilters.colors && (
                                <div className="flex flex-wrap gap-3 animate-in fade-in duration-300">
                                    {ARTSY_FILTERS.colors.map(c => (
                                        <button
                                            key={c.id}
                                            onClick={() => toggleFilter('colors', c.id)}
                                            className={`w-6 h-6 rounded-full border border-border-light/40 transition-all shadow-sm shrink-0 flex items-center justify-center ${filters.colors.includes(c.id) ? 'ring-2 ring-accent-blue ring-offset-1 scale-110' : 'hover:scale-110 hover:shadow-md'}`}
                                            style={{ backgroundColor: c.hex }}
                                            title={c.name}
                                        >
                                            {filters.colors.includes(c.id) && <LucideCheck size={12} className={c.id === 'white' || c.id === 'yellow' ? 'text-text-main' : 'text-white'} strokeWidth={4} />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* SCROLLABLE RESULTS AREA */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide bg-[#FDF8F5] dark:bg-[#1E1C1A]">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {results.map((item, i) => (
                            <div 
                                key={`${item.id}-${i}`} 
                                className="group relative bg-white rounded-[2rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-700 border border-border-light/40 aspect-[3/4.5] animate-in fade-in zoom-in-95 cursor-pointer" 
                                style={{ animationDelay: `${(i % 10) * 50}ms` }}
                                onClick={() => setEnlargedArtwork(item)}
                            >
                                <img
                                    src={item.thumbnail || item.image_url}
                                    alt={item.title}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[2s] ease-out grayscale group-hover:grayscale-0"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-5 pointer-events-none">
                                    <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                                        <p className="text-[10px] text-white font-black uppercase tracking-widest mb-1 line-clamp-2 leading-relaxed">{item.title}</p>
                                        <p className="text-[8px] text-white/60 italic mb-4 truncate">{item.artist || 'Bilinmeyen Sanatçı'}</p>
                                        <div className="w-full py-3 bg-white text-text-main rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            İncele
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                    {loading && results.length === 0 && (
                        <div className="col-span-2 py-32 flex flex-col items-center justify-center text-text-muted space-y-4">
                            <div className="w-12 h-12 border-2 border-accent-blue/20 border-t-accent-blue rounded-full animate-spin" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Kürasyon Yükleniyor</span>
                        </div>
                    )}

                    {!loading && results.length === 0 && (
                        <div className="col-span-2 py-32 text-center text-text-muted/60 italic px-8">
                            <LucideSearch size={32} className="mx-auto mb-4 opacity-20" />
                            <p className="text-sm">Seçtiğin kriterlere uygun ilham bulunamadı canım. Filtreleri değiştirmeyi dene! ✨</p>
                        </div>
                    )}

                    {hasMore && results.length > 0 && (
                        <button
                            onClick={() => handleSearch(false)}
                            disabled={loading}
                            className="col-span-2 py-8 text-[10px] font-black uppercase tracking-[0.4em] text-text-muted hover:text-accent-blue transition-all disabled:opacity-50 flex items-center justify-center gap-4 group"
                        >
                            {loading ? 'Yükleniyor...' : (
                                <>
                                    <div className="h-px w-8 bg-border-light group-hover:bg-accent-blue transition-colors"></div>
                                    Daha Fazla Keşfet
                                    <div className="h-px w-8 bg-border-light group-hover:bg-accent-blue transition-colors"></div>
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* ENLARGED ARTWORK LIGHTBOX */}
            {enlargedArtwork && (
                <div 
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
                    onClick={() => setEnlargedArtwork(null)}
                >
                    <div 
                        className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center animate-in zoom-in-95" 
                        onClick={e => e.stopPropagation()}
                    >
                        <button 
                            onClick={() => setEnlargedArtwork(null)} 
                            className="absolute -top-12 right-0 text-white/70 hover:text-white p-2 transition-colors"
                        >
                            <LucideX size={24} />
                        </button>
                        
                        <div className="relative w-full rounded-2xl overflow-hidden bg-black/50 shadow-2xl flex items-center justify-center p-4">
                            <img 
                                src={enlargedArtwork.image_url} 
                                alt={enlargedArtwork.title} 
                                className="max-w-full max-h-[70vh] object-contain rounded-lg"
                            />
                        </div>

                        <div className="w-full mt-4 bg-surface-dark/90 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex-1">
                                <h3 className="text-white font-display font-bold text-xl mb-1">{enlargedArtwork.title}</h3>
                                <p className="text-white/70 text-sm">
                                    {enlargedArtwork.artist || 'Bilinmeyen Sanatçı'} 
                                    {enlargedArtwork.medium && <span className="opacity-50 mx-2">•</span>}
                                    {enlargedArtwork.medium}
                                    {enlargedArtwork.place && <span className="opacity-50 mx-2">•</span>}
                                    {enlargedArtwork.place}
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    onAddArtwork(enlargedArtwork);
                                    setEnlargedArtwork(null);
                                    onClose();
                                }}
                                disabled={isArchiveMode}
                                className="w-full sm:w-auto px-8 py-3.5 bg-accent-blue text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-white hover:text-accent-blue transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-accent-blue/20 shrink-0"
                            >
                                <LucidePlus size={16} /> Panoya Ekle
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </div>
    );
};

export default ArtsyExplorer;
