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
        mediums: [],
        styles: [],
        colors: []
    });

    const [expandedFilters, setExpandedFilters] = useState({
        mediums: true,
        styles: false,
        colors: true
    });

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

            setHasMore(data.items.length > 0);
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
        setFilters({ mediums: [], styles: [], colors: [] });
    };

    const toggleSection = (section) => {
        setExpandedFilters(prev => ({ ...prev, [section]: !prev[section] }));
    };

    return (
        <div className="h-full flex flex-col bg-[#FDF8F5] dark:bg-[#1E1C1A] selection:bg-accent-blue selection:text-white border-l border-border-light/40 shadow-[-4px_0_24px_rgba(0,0,0,0.05)] overflow-hidden">
            {/* Header */}
            <div className="p-8 border-b border-border-light/40 bg-white/80 backdrop-blur-md sticky top-0 z-20">
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-accent-blue/10 flex items-center justify-center text-accent-blue shadow-lg shadow-accent-blue/5">
                            <LucideSparkles size={22} />
                        </div>
                        <div>
                            <h2 className="font-display text-2xl font-bold italic text-text-main leading-tight">Derinlikli Kürasyon</h2>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Kibele AI x Art Institute of Chicago</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-surface-light rounded-xl transition-all text-text-muted hover:text-accent-blue">
                        <LucideX size={20} />
                    </button>
                </div>

                {/* Search Input */}
                <div className="mt-8 relative group">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Sanatçı, stil veya dönem ara..."
                        className="w-full bg-white rounded-2xl py-5 pl-14 pr-4 border border-border-light/40 focus:ring-8 focus:ring-accent-blue/5 focus:border-accent-blue/30 outline-none transition-all text-sm font-medium shadow-sm italic placeholder:text-text-muted/40"
                    />
                    <LucideSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent-blue transition-colors" size={20} />
                    {loading && <LucideRefreshCcw className="absolute right-5 top-1/2 -translate-y-1/2 text-accent-blue animate-spin" size={16} />}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
                {/* Active Filter Chips */}
                {(filters.mediums.length > 0 || filters.styles.length > 0 || filters.colors.length > 0) && (
                    <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2">
                        {[...filters.mediums, ...filters.styles, ...filters.colors].map(f => (
                            <div key={f} className="px-3 py-1.5 bg-accent-blue text-white rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-md shadow-accent-blue/20">
                                {f}
                                <button onClick={() => {
                                    if (filters.mediums.includes(f)) toggleFilter('mediums', f);
                                    else if (filters.styles.includes(f)) toggleFilter('styles', f);
                                    else toggleFilter('colors', f);
                                }}><LucideX size={10} /></button>
                            </div>
                        ))}
                        <button onClick={clearFilters} className="px-3 py-1.5 text-text-muted hover:text-red-500 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1">
                            <LucideTrash2 size={10} /> Temizle
                        </button>
                    </div>
                )}

                {/* Filter Sections */}
                <div className="space-y-4">
                    {/* Teknikler */}
                    <div className="bg-white rounded-[2.5rem] p-6 border border-border-light/40 shadow-sm overflow-hidden">
                        <button onClick={() => toggleSection('mediums')} className="w-full flex justify-between items-center group">
                            <span className="text-[11px] font-black uppercase tracking-widest text-text-muted group-hover:text-accent-blue transition-colors flex items-center gap-2">
                                <LucideFilter size={12} /> Teknik / Kategori
                            </span>
                            {expandedFilters.mediums ? <LucideChevronUp size={16} /> : <LucideChevronDown size={16} />}
                        </button>
                        {expandedFilters.mediums && (
                            <div className="mt-6 flex flex-wrap gap-2 animate-in zoom-in-95 duration-300">
                                {ARTSY_FILTERS.mediums.map(m => (
                                    <button
                                        key={m.id}
                                        onClick={() => toggleFilter('mediums', m.id)}
                                        className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all border ${filters.mediums.includes(m.id) ? 'bg-accent-blue border-accent-blue text-white shadow-lg shadow-accent-blue/20' : 'bg-surface-light/50 border-transparent text-text-muted hover:bg-white hover:border-border-light'}`}
                                    >
                                        {m.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Akımlar */}
                    <div className="bg-white rounded-[2.5rem] p-6 border border-border-light/40 shadow-sm overflow-hidden">
                        <button onClick={() => toggleSection('styles')} className="w-full flex justify-between items-center group">
                            <span className="text-[11px] font-black uppercase tracking-widest text-text-muted group-hover:text-accent-blue transition-colors flex items-center gap-2">
                                <LucideSparkles size={12} /> Dönem / Akım
                            </span>
                            {expandedFilters.styles ? <LucideChevronUp size={16} /> : <LucideChevronDown size={16} />}
                        </button>
                        {expandedFilters.styles && (
                            <div className="mt-6 grid grid-cols-1 gap-2 animate-in slide-in-from-top-4 duration-500">
                                {ARTSY_FILTERS.styles.map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => toggleFilter('styles', s.id)}
                                        className={`w-full text-left px-4 py-3 rounded-xl text-xs font-medium transition-all flex items-center justify-between ${filters.styles.includes(s.id) ? 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20' : 'hover:bg-surface-light text-text-muted'}`}
                                    >
                                        {s.name}
                                        {filters.styles.includes(s.id) && <LucideCheck size={14} />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Renkler */}
                    <div className="bg-white rounded-[2.5rem] p-6 border border-border-light/40 shadow-sm overflow-hidden">
                        <button onClick={() => toggleSection('colors')} className="w-full flex justify-between items-center group">
                            <span className="text-[11px] font-black uppercase tracking-widest text-text-muted group-hover:text-accent-blue transition-colors flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-gradient-to-tr from-red-500 via-green-500 to-blue-500"></span>
                                Renk Paleti
                            </span>
                            {expandedFilters.colors ? <LucideChevronUp size={16} /> : <LucideChevronDown size={16} />}
                        </button>
                        {expandedFilters.colors && (
                            <div className="mt-8 flex flex-wrap justify-center gap-5 px-4 animate-in zoom-in-50 duration-500">
                                {ARTSY_FILTERS.colors.map(c => (
                                    <button
                                        key={c.id}
                                        title={c.name}
                                        onClick={() => toggleFilter('colors', c.id)}
                                        className={`w-10 h-10 rounded-full border-2 transition-all relative ${filters.colors.includes(c.id) ? 'border-accent-blue scale-125 shadow-xl' : 'border-transparent hover:scale-110 shadow-sm'}`}
                                        style={{ backgroundColor: c.hex }}
                                    >
                                        {filters.colors.includes(c.id) && (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <LucideCheck size={16} className={c.id === 'white' ? 'text-text-main' : 'text-white'} />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Results Section */}
                <div className="pt-4">
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-text-muted mb-6 flex items-center gap-2 px-2">
                        {loading ? 'İlhamlar Keşfediliyor...' : `${results.length} Eser Bulundu`}
                    </h3>

                    <div className="grid grid-cols-2 gap-4 pb-32">
                        {results.map((item, i) => (
                            <div key={`${item.id}-${i}`} className="group relative bg-white rounded-[2rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-700 border border-border-light/40 aspect-[3/4.5] animate-in fade-in zoom-in-95" style={{ animationDelay: `${(i % 10) * 50}ms` }}>
                                <img
                                    src={item.thumbnail || item.image_url}
                                    alt={item.title}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[2s] ease-out grayscale group-hover:grayscale-0"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-5">
                                    <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                                        <p className="text-[10px] text-white font-black uppercase tracking-widest mb-1 line-clamp-2 leading-relaxed">{item.title}</p>
                                        <p className="text-[8px] text-white/60 italic mb-4 truncate">{item.artist || 'Bilinmeyen Sanatçı'}</p>
                                        <button
                                            onClick={() => onAddArtwork(item)}
                                            disabled={isArchiveMode}
                                            className="w-full py-3 bg-white text-text-main rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-accent-blue hover:text-white transition-all shadow-xl disabled:opacity-30"
                                        >
                                            <LucidePlus size={14} /> Panoya Ekle
                                        </button>
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
                                className="col-span-2 py-6 text-[10px] font-black uppercase tracking-[0.4em] text-text-muted hover:text-accent-blue transition-all disabled:opacity-50 flex items-center justify-center gap-4 group"
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
            </div>
        </div>
    );
};

export default ArtsyExplorer;
