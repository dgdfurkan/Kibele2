import React, { useState, useEffect } from 'react';
import { LucideSearch, LucideX, LucideSparkles, LucideFilter, LucideCheck, LucideChevronDown, LucideChevronUp, LucidePlus, LucideRefreshCcw } from 'lucide-react';
import { searchArtsyArtworks, ARTSY_FILTERS } from '../services/artsyService';

const ArtsyExplorer = ({ onAddArtwork, onClose, isArchiveMode }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState({
        medium: 'all',
        period: 'all',
        color: 'all'
    });
    const [expandedFilters, setExpandedFilters] = useState({
        medium: true,
        period: false,
        color: true
    });

    useEffect(() => {
        handleSearch(true);
    }, [filters]);

    const handleSearch = async (isNew = true) => {
        setLoading(true);
        const currentPage = isNew ? 1 : page;
        try {
            const data = await searchArtsyArtworks({
                query,
                page: currentPage,
                ...filters
            });
            setResults(isNew ? data.items : [...results, ...data.items]);
            if (isNew) setPage(2);
            else setPage(page + 1);
        } catch (error) {
            console.error("Search Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleFilterSection = (section) => {
        setExpandedFilters(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const updateFilter = (type, id) => {
        if (isArchiveMode) return;
        setFilters(prev => ({
            ...prev,
            [type]: id
        }));
    };

    return (
        <div className="h-full flex flex-col bg-[#FDF8F5] dark:bg-[#1E1C1A] selection:bg-accent-blue selection:text-white border-l border-border-light/40 shadow-[-4px_0_24px_rgba(0,0,0,0.05)]">
            {/* Header */}
            <div className="p-8 border-b border-border-light/40 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="font-display text-2xl font-bold italic text-text-main flex items-center gap-2">
                        <LucideSparkles className="text-accent-blue" size={20} />
                        Derinlikli Kürasyon
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-surface-light rounded-xl transition-all text-text-muted hover:text-accent-blue">
                        <LucideX size={20} />
                    </button>
                </div>
                <p className="text-sm text-text-muted italic">Koleksiyonları teknik, dönem ve renk paletine göre keşfet canım. ✨</p>

                {/* Search Input */}
                <div className="mt-6 relative">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch(true)}
                        placeholder="Sanatçı, stil veya dönem ara..."
                        className="w-full bg-white rounded-2xl py-4 pl-12 pr-4 border border-border-light/40 focus:ring-4 focus:ring-accent-blue/5 focus:border-accent-blue/30 outline-none transition-all text-sm font-medium shadow-sm italic"
                    />
                    <LucideSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
                {/* Filter Sections */}
                <div className="bg-white rounded-[2rem] p-6 border border-border-light/40 shadow-sm space-y-4">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-text-muted flex items-center gap-2">
                            <LucideFilter size={12} /> Filtreler
                        </h3>
                        {Object.values(filters).some(v => v !== 'all') && (
                            <button
                                onClick={() => setFilters({ medium: 'all', period: 'all', color: 'all' })}
                                className="text-[10px] font-bold text-accent-blue hover:underline"
                            >
                                Temizle
                            </button>
                        )}
                    </div>

                    {/* Technique/Medium */}
                    <div className="border-b border-border-light/20 pb-4">
                        <button
                            onClick={() => toggleFilterSection('medium')}
                            className="w-full flex justify-between items-center text-xs font-bold text-text-main py-2"
                        >
                            Teknik/Medium
                            {expandedFilters.medium ? <LucideChevronUp size={14} /> : <LucideChevronDown size={14} />}
                        </button>
                        {expandedFilters.medium && (
                            <div className="mt-2 space-y-2">
                                {ARTSY_FILTERS.mediums.map(m => (
                                    <button
                                        key={m.id}
                                        onClick={() => updateFilter('medium', m.id)}
                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[11px] transition-all ${filters.medium === m.id ? 'bg-accent-blue/10 text-accent-blue font-bold' : 'hover:bg-surface-light text-text-muted'}`}
                                    >
                                        {m.name}
                                        {filters.medium === m.id && <LucideCheck size={12} />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Period/Style */}
                    <div className="border-b border-border-light/20 pb-4">
                        <button
                            onClick={() => toggleFilterSection('period')}
                            className="w-full flex justify-between items-center text-xs font-bold text-text-main py-2"
                        >
                            Dönem/Akım
                            {expandedFilters.period ? <LucideChevronUp size={14} /> : <LucideChevronDown size={14} />}
                        </button>
                        {expandedFilters.period && (
                            <div className="mt-2 space-y-2">
                                {ARTSY_FILTERS.periods.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => updateFilter('period', p.id)}
                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[11px] transition-all ${filters.period === p.id ? 'bg-accent-blue/10 text-accent-blue font-bold' : 'hover:bg-surface-light text-text-muted'}`}
                                    >
                                        {p.name}
                                        {filters.period === p.id && <LucideCheck size={12} />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Colors */}
                    <div>
                        <button
                            onClick={() => toggleFilterSection('color')}
                            className="w-full flex justify-between items-center text-xs font-bold text-text-main py-2"
                        >
                            Renk Tonu
                            {expandedFilters.color ? <LucideChevronUp size={14} /> : <LucideChevronDown size={14} />}
                        </button>
                        {expandedFilters.color && (
                            <div className="mt-4 flex flex-wrap gap-3 px-1">
                                {ARTSY_FILTERS.colors.map(c => (
                                    <button
                                        key={c.id}
                                        title={c.name}
                                        onClick={() => updateFilter('color', c.id)}
                                        className={`w-8 h-8 rounded-full border-2 transition-all ${filters.color === c.id ? 'border-accent-blue scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                                        style={{ backgroundColor: c.hex }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Results Grid */}
                <div className="grid grid-cols-2 gap-4 pb-20">
                    {results.map((item, i) => (
                        <div key={`${item.id}-${i}`} className="group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 border border-border-light/40 aspect-[3/4]">
                            <img
                                src={item.thumbnail || item.image_url}
                                alt={item.title}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4 backdrop-blur-[1px]">
                                <p className="text-[9px] text-white font-black uppercase tracking-widest mb-1 truncate">{item.title}</p>
                                <button
                                    onClick={() => onAddArtwork(item)}
                                    disabled={isArchiveMode}
                                    className="w-full py-3 bg-white text-text-main rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-accent-blue hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <LucidePlus size={14} /> Panoya Ekle
                                </button>
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="col-span-2 py-10 flex flex-col items-center justify-center text-text-muted gap-4">
                            <LucideRefreshCcw className="animate-spin" size={24} />
                            <span className="text-[10px] font-bold uppercase tracking-widest italic shadow-sm">Kürasyon Hazırlanıyor...</span>
                        </div>
                    )}
                    {!loading && results.length > 0 && (
                        <button
                            onClick={() => handleSearch(false)}
                            className="col-span-2 py-4 text-[10px] font-black uppercase tracking-widest text-text-muted hover:text-accent-blue transition-all"
                        >
                            Daha Fazla Görsel Yükle
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ArtsyExplorer;
