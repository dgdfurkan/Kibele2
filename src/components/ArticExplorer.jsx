import React, { useState, useEffect, useRef } from 'react';
import { LucideSearch, LucideX, LucideSparkles, LucideRefreshCcw, LucideTrash2, LucideChevronDown, LucideCheck, LucideSend, LucideExternalLink } from 'lucide-react';
import { fetchAICArtworks, AIC_FILTERS } from '../services/aicApi';
import { useAuth } from '../context/AuthContext';
import { subscribeToRooms, curateRoomArtwork } from '../services/dbService';
import { useToast } from '../context/ToastContext';

const ArticExplorer = ({ onCurateArtwork, onClose, isArchiveMode, currentRoomId }) => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const [filters, setFilters] = useState({
        artwork_type: [],
        artists: [],
        places: [],
        styles: [],
        subjects: [],
        classifications: [],
        medium: [],
        departments: [],
        color_hex: '',
        sort: 'relevance'
    });

    const [expandedFilters, setExpandedFilters] = useState({});
    const [enlargedArtwork, setEnlargedArtwork] = useState(null);
    const [userRooms, setUserRooms] = useState([]);
    const [selectedRoomId, setSelectedRoomId] = useState(currentRoomId || '');
    const [roomSelectorOpen, setRoomSelectorOpen] = useState(false);

    const lastSearchRef = useRef(null);

    // Fetch user's joined rooms
    useEffect(() => {
        if (!user) return;
        const unsubscribe = subscribeToRooms((allRooms) => {
            const joinedRooms = allRooms.filter(r =>
                (r.participants?.includes(user.uid) || r.creatorId === user.uid) && r.isActive !== false
            );
            setUserRooms(joinedRooms);
            if (!selectedRoomId && currentRoomId) {
                setSelectedRoomId(currentRoomId);
            } else if (!selectedRoomId && joinedRooms.length > 0) {
                setSelectedRoomId(joinedRooms[0].id);
            }
        });
        return () => unsubscribe();
    }, [user]);

    // Filter change triggers search
    useEffect(() => {
        handleSearch(true);
    }, [filters]);

    // Debounced text search
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
            const data = await fetchAICArtworks({
                query,
                page: currentPage,
                limit: 20,
                filters
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
        setFilters({ artwork_type: [], artists: [], places: [], styles: [], subjects: [], classifications: [], medium: [], departments: [], color_hex: '', sort: 'relevance' });
    };

    const toggleSection = (section) => {
        setExpandedFilters(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const handleSendToCuration = async (artwork) => {
        if (isArchiveMode) return;

        // If we have a direct curation handler and it's the current room
        if (onCurateArtwork && selectedRoomId === currentRoomId) {
            onCurateArtwork(artwork);
            setEnlargedArtwork(null);
            showToast("Kürasyona eklendi! ✨");
            return;
        }

        if (!selectedRoomId) {
            showToast("Lütfen bir oda seçin.", "error");
            return;
        }

        try {
            await curateRoomArtwork(selectedRoomId, artwork, user);
            showToast("İlham odası kürasyonuna eklendi! ✨");
            setEnlargedArtwork(null);
        } catch (error) {
            console.error("Error curating artwork:", error);
            showToast("Kürasyona eklenirken bir hata oluştu.", "error");
        }
    };

    // Filter section renderer
    const renderFilterSection = (key, label, items) => (
        <div key={key} className="border border-border-light/40 rounded-xl overflow-hidden">
            <button
                className="w-full p-3 flex justify-between items-center cursor-pointer bg-surface-light/30 hover:bg-surface-light/50 transition-colors"
                onClick={() => toggleSection(key)}
            >
                <span className="font-semibold text-sm">{label} {filters[key]?.length > 0 && `(${filters[key].length})`}</span>
                <LucideChevronDown size={14} className={`transition-transform duration-300 ${expandedFilters[key] ? 'rotate-180' : ''}`} />
            </button>
            {expandedFilters[key] && (
                <div className="p-3 border-t border-border-light/40 bg-white">
                    <ul className="max-h-40 overflow-y-auto space-y-1 scrollbar-hide m-0 p-0 list-none">
                        {items.map(s => (
                            <li key={s.id} className="m-0 p-0">
                                <button
                                    onClick={() => toggleFilter(key, s.id)}
                                    className={`w-full text-left px-2 py-1.5 rounded-md text-xs transition-all flex items-center gap-2 ${filters[key].includes(s.id) ? 'bg-accent-blue/10 text-accent-blue font-medium' : 'hover:bg-surface-light'}`}
                                >
                                    <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 ${filters[key].includes(s.id) ? 'bg-accent-blue border-accent-blue text-white' : 'border-border-light'}`}>
                                        {filters[key].includes(s.id) && <LucideCheck size={10} strokeWidth={3} />}
                                    </div>
                                    <span className="truncate">{s.name}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );

    // Color filter renderer
    const renderColorFilter = () => (
        <div className="border border-border-light/40 rounded-xl overflow-hidden">
            <button
                className="w-full p-3 flex justify-between items-center cursor-pointer bg-surface-light/30 hover:bg-surface-light/50 transition-colors"
                onClick={() => toggleSection('colors')}
            >
                <span className="font-semibold text-sm">Renkler {filters.color_hex && '(1)'}</span>
                <LucideChevronDown size={14} className={`transition-transform duration-300 ${expandedFilters.colors ? 'rotate-180' : ''}`} />
            </button>
            {expandedFilters.colors && (
                <div className="p-3 border-t border-border-light/40 bg-white">
                    <div className="flex flex-wrap gap-2">
                        {[
                            { hex: '#EF4444', name: 'Kırmızı' },
                            { hex: '#F97316', name: 'Turuncu' },
                            { hex: '#FBBF24', name: 'Sarı' },
                            { hex: '#10B981', name: 'Yeşil' },
                            { hex: '#3B82F6', name: 'Mavi' },
                            { hex: '#A855F7', name: 'Mor' },
                            { hex: '#EC4899', name: 'Pembe' },
                            { hex: '#000000', name: 'Siyah' },
                            { hex: '#FFFFFF', name: 'Beyaz' }
                        ].map(c => (
                            <button
                                key={c.hex}
                                onClick={() => setFilters(prev => ({ ...prev, color_hex: prev.color_hex === c.hex ? '' : c.hex }))}
                                className={`w-7 h-7 rounded-full border-2 transition-all shrink-0 flex items-center justify-center ${filters.color_hex === c.hex ? 'ring-2 ring-accent-blue ring-offset-2 scale-110' : 'border-border-light/40 hover:scale-110'}`}
                                style={{ backgroundColor: c.hex }}
                                title={c.name}
                            >
                                {filters.color_hex === c.hex && <LucideCheck size={12} className={c.hex === '#FFFFFF' || c.hex === '#FBBF24' ? 'text-text-main' : 'text-white'} strokeWidth={3} />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    // Sort selector
    const renderSortSelector = () => (
        <div className="border border-border-light/40 rounded-xl overflow-hidden">
            <button
                className="w-full p-3 flex justify-between items-center cursor-pointer bg-surface-light/30 hover:bg-surface-light/50 transition-colors"
                onClick={() => toggleSection('sort')}
            >
                <span className="font-semibold text-sm">Sıralama</span>
                <LucideChevronDown size={14} className={`transition-transform duration-300 ${expandedFilters.sort ? 'rotate-180' : ''}`} />
            </button>
            {expandedFilters.sort && (
                <div className="p-3 border-t border-border-light/40 bg-white">
                    <div className="space-y-1">
                        {AIC_FILTERS.sort_options.map(s => (
                            <button
                                key={s.id}
                                onClick={() => setFilters(prev => ({ ...prev, sort: s.id }))}
                                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${filters.sort === s.id ? 'bg-accent-blue/10 text-accent-blue font-bold' : 'hover:bg-surface-light'}`}
                            >
                                {s.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    // Detail label renderer
    const DetailRow = ({ label, value }) => {
        if (!value) return null;
        return (
            <div className="mb-3">
                <span className="block text-[10px] font-black uppercase tracking-widest text-text-muted/60 mb-0.5">{label}</span>
                <p className="text-sm font-medium text-text-main leading-relaxed" dangerouslySetInnerHTML={{ __html: value }}></p>
            </div>
        );
    };

    // Custom Room Selector Component
    const RoomSelector = () => {
        const selectedRoom = userRooms.find(r => r.id === selectedRoomId);
        return (
            <div className="relative">
                <button
                    onClick={() => setRoomSelectorOpen(!roomSelectorOpen)}
                    className="w-full flex items-center justify-between gap-3 bg-surface-light/50 hover:bg-surface-light border border-border-light/40 rounded-xl px-4 py-3 transition-all"
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-accent-blue/10 flex items-center justify-center shrink-0">
                            <LucideSparkles size={14} className="text-accent-blue" />
                        </div>
                        <div className="text-left min-w-0">
                            <p className="text-xs font-bold text-text-main truncate">
                                {selectedRoomId === currentRoomId ? 'Bu Odanın Kürasyonu' : selectedRoom?.name || 'Oda Seçin'}
                            </p>
                            <p className="text-[10px] text-text-muted truncate">Kürasyon sekmesine eklenir</p>
                        </div>
                    </div>
                    <LucideChevronDown size={16} className={`text-text-muted transition-transform duration-200 shrink-0 ${roomSelectorOpen ? 'rotate-180' : ''}`} />
                </button>

                {roomSelectorOpen && (
                    <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-2xl border border-border-light/40 shadow-2xl z-50 max-h-[280px] overflow-y-auto scrollbar-hide animate-in fade-in slide-in-from-bottom-2 duration-200">
                        <div className="p-2 space-y-1">
                            {/* Current room option */}
                            {currentRoomId && (
                                <button
                                    onClick={() => { setSelectedRoomId(currentRoomId); setRoomSelectorOpen(false); }}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${selectedRoomId === currentRoomId ? 'bg-accent-blue text-white' : 'hover:bg-surface-light'}`}
                                >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${selectedRoomId === currentRoomId ? 'bg-white/20' : 'bg-accent-blue/10'}`}>
                                        <LucideSparkles size={14} className={selectedRoomId === currentRoomId ? 'text-white' : 'text-accent-blue'} />
                                    </div>
                                    <div className="text-left min-w-0">
                                        <p className="text-sm font-bold truncate">Bu Odanın Kürasyonu</p>
                                        <p className={`text-[10px] truncate ${selectedRoomId === currentRoomId ? 'text-white/60' : 'text-text-muted'}`}>Mevcut oda</p>
                                    </div>
                                    {selectedRoomId === currentRoomId && <LucideCheck size={16} className="ml-auto shrink-0" />}
                                </button>
                            )}

                            {/* Divider */}
                            {currentRoomId && userRooms.length > 0 && (
                                <div className="px-3 py-1">
                                    <div className="h-px bg-border-light/40"></div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-text-muted/50 mt-2 mb-1">Diğer Odalar</p>
                                </div>
                            )}

                            {/* Other rooms */}
                            {userRooms.filter(r => r.id !== currentRoomId).map(room => (
                                <button
                                    key={room.id}
                                    onClick={() => { setSelectedRoomId(room.id); setRoomSelectorOpen(false); }}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${selectedRoomId === room.id ? 'bg-accent-blue text-white' : 'hover:bg-surface-light'}`}
                                >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs ${selectedRoomId === room.id ? 'bg-white/20' : 'bg-surface-light'}`}>
                                        {room.name?.charAt(0) || '?'}
                                    </div>
                                    <div className="text-left min-w-0">
                                        <p className="text-sm font-bold truncate">{room.name}</p>
                                        <p className={`text-[10px] truncate ${selectedRoomId === room.id ? 'text-white/60' : 'text-text-muted'}`}>{room.participants?.length || 0} katılımcı</p>
                                    </div>
                                    {selectedRoomId === room.id && <LucideCheck size={16} className="ml-auto shrink-0" />}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col bg-[#FDF8F5] dark:bg-[#1E1C1A] border-l border-border-light/40 shadow-[-4px_0_24px_rgba(0,0,0,0.05)] overflow-hidden">
            {/* STICKY TOP SECTION */}
            <div className="flex-shrink-0 z-20 bg-white/90 backdrop-blur-xl border-b border-border-light/40 shadow-sm p-4 w-full">
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-accent-blue/10 flex items-center justify-center text-accent-blue">
                            <LucideSparkles size={16} />
                        </div>
                        <div>
                            <h2 className="text-lg font-display font-bold text-text-main leading-tight italic">Derinlikli Kürasyon</h2>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-text-muted">Art Institute of Chicago</p>
                        </div>
                    </div>
                    {onClose && (
                        <button onClick={onClose} className="p-1.5 hover:bg-surface-light rounded-lg transition-all text-text-muted">
                            <LucideX size={18} />
                        </button>
                    )}
                </div>

                <div className="relative group">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Sanatçı, eser, dönem, teknik ara..."
                        className="w-full bg-surface-light/50 rounded-xl py-2.5 pl-10 pr-4 outline-none text-sm transition-all shadow-inner focus:bg-white focus:ring-2 focus:ring-accent-blue/20"
                    />
                    <LucideSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                    {loading && <LucideRefreshCcw className="absolute right-3 top-1/2 -translate-y-1/2 text-accent-blue animate-spin" size={14} />}
                </div>
            </div>

            {/* SCROLLABLE MAIN CONTENT */}
            <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col">

                {/* FILTERS */}
                <div className="w-full border-b border-border-light/40 bg-white" id="collectionFilters">
                    <div className="p-4">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Filtreler</span>
                            {(Object.values(filters).some(v => Array.isArray(v) ? v.length > 0 : (v && v !== 'relevance'))) && (
                                <button onClick={clearFilters} className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors flex items-center gap-1">
                                    <LucideTrash2 size={12} /> Temizle
                                </button>
                            )}
                        </div>

                        <div className="space-y-2">
                            {renderFilterSection('artwork_type', 'Eser Türü', AIC_FILTERS.artwork_type)}
                            {renderFilterSection('artists', 'Sanatçılar', AIC_FILTERS.artists)}
                            {renderFilterSection('departments', 'Departmanlar', AIC_FILTERS.departments)}
                            {renderFilterSection('styles', 'Dönem & Stil', AIC_FILTERS.styles)}
                            {renderFilterSection('places', 'Coğrafya', AIC_FILTERS.places)}
                            {renderFilterSection('classifications', 'Sınıflandırma', AIC_FILTERS.classifications)}
                            {renderFilterSection('medium', 'Malzeme', AIC_FILTERS.medium)}
                            {renderFilterSection('subjects', 'Konular', AIC_FILTERS.subjects)}
                            {renderColorFilter()}
                            {renderSortSelector()}
                        </div>
                    </div>
                </div>

                {/* RESULTS GRID */}
                <div className="p-4 flex-1 pb-24">
                    {results.length > 0 ? (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            {results.map((item, index) => (
                                <div
                                    key={item.id || index}
                                    className="group relative aspect-square bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer border border-border-light/40"
                                    onClick={() => setEnlargedArtwork(item)}
                                >
                                    <img
                                        src={item.thumbnail}
                                        alt={item.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        loading="lazy"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.parentElement.innerHTML = `<div class="w-full h-full bg-surface-light flex items-center justify-center text-xs text-text-muted text-center p-2">${item.title}</div>`;
                                        }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end">
                                        <div className="p-2 w-full transform translate-y-2 group-hover:translate-y-0 transition-transform">
                                            <p className="text-[10px] text-white font-bold line-clamp-2 leading-tight">{item.title}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        !loading && (
                            <div className="h-full flex flex-col items-center justify-center text-text-muted py-20">
                                <LucideSearch size={32} className="mb-3 opacity-20" />
                                <p className="text-sm">Sonuç bulunamadı.</p>
                            </div>
                        )
                    )}

                    {hasMore && results.length > 0 && !loading && (
                        <button
                            onClick={() => handleSearch(false)}
                            className="w-full mt-6 py-3 rounded-xl bg-white border border-border-light/40 text-sm font-bold text-accent-blue hover:bg-surface-light transition-colors"
                        >
                            Daha Fazla Göster
                        </button>
                    )}

                    {loading && results.length > 0 && (
                        <div className="mt-4 flex justify-center">
                            <LucideRefreshCcw size={20} className="text-accent-blue animate-spin" />
                        </div>
                    )}
                </div>
            </div>

            {/* LIGHTBOX MODAL WITH DETAIL + ROOM SELECTOR */}
            {enlargedArtwork && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md" onClick={() => setEnlargedArtwork(null)}>
                    <div
                        className="bg-white rounded-3xl overflow-hidden shadow-2xl border border-border-light/40 w-full max-w-5xl max-h-[92vh] flex flex-col md:flex-row relative animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setEnlargedArtwork(null)}
                            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm shadow-sm flex items-center justify-center text-text-main hover:bg-white hover:text-red-500 transition-colors"
                        >
                            <LucideX size={18} />
                        </button>

                        {/* Image Area */}
                        <div className="md:w-1/2 bg-black/5 flex items-center justify-center p-6 min-h-[40vh]">
                            <img
                                src={enlargedArtwork.image_url || enlargedArtwork.thumbnail}
                                alt={enlargedArtwork.title}
                                className="max-w-full max-h-[80vh] rounded-xl object-contain shadow-md"
                            />
                        </div>

                        {/* Details & Actions Area */}
                        <div className="md:w-1/2 flex flex-col bg-white overflow-y-auto">
                            {/* Artwork Details */}
                            <div className="flex-1 p-8">
                                <h3 className="text-2xl font-display font-bold text-text-main mb-1 leading-tight pr-8">{enlargedArtwork.title}</h3>
                                {enlargedArtwork.artist && (
                                    <p className="text-text-muted font-medium mb-1 text-sm">{enlargedArtwork.artist}</p>
                                )}
                                {enlargedArtwork.date_display && (
                                    <p className="text-accent-blue font-bold text-sm mb-4">{enlargedArtwork.date_display}</p>
                                )}

                                <div className="space-y-0 border-t border-border-light/30 pt-4">
                                    <DetailRow label="Teknik / Malzeme" value={enlargedArtwork.medium} />
                                    <DetailRow label="Boyutlar" value={enlargedArtwork.dimensions} />
                                    <DetailRow label="Tür" value={enlargedArtwork.artwork_type_title} />
                                    <DetailRow label="Sınıflandırma" value={enlargedArtwork.classification_title} />
                                    <DetailRow label="Yer / Köken" value={enlargedArtwork.place} />
                                    <DetailRow label="Departman" value={enlargedArtwork.department_title} />
                                    <DetailRow label="Referans No" value={enlargedArtwork.main_reference_number} />
                                    <DetailRow label="Kredi" value={enlargedArtwork.credit_line} />

                                    {enlargedArtwork.style_titles?.length > 0 && (
                                        <div className="mb-3">
                                            <span className="block text-[10px] font-black uppercase tracking-widest text-text-muted/60 mb-1">Stiller</span>
                                            <div className="flex flex-wrap gap-1">
                                                {enlargedArtwork.style_titles.map((s, i) => (
                                                    <span key={i} className="px-2 py-0.5 bg-surface-light rounded-full text-[10px] font-medium text-text-muted">{s}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {enlargedArtwork.subject_titles?.length > 0 && (
                                        <div className="mb-3">
                                            <span className="block text-[10px] font-black uppercase tracking-widest text-text-muted/60 mb-1">Konular</span>
                                            <div className="flex flex-wrap gap-1">
                                                {enlargedArtwork.subject_titles.slice(0, 8).map((s, i) => (
                                                    <span key={i} className="px-2 py-0.5 bg-accent-blue/5 rounded-full text-[10px] font-medium text-accent-blue">{s}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {enlargedArtwork.description && (
                                        <div className="mt-4 pt-4 border-t border-border-light/30">
                                            <span className="block text-[10px] font-black uppercase tracking-widest text-text-muted/60 mb-2">Hakkında</span>
                                            <p className="text-sm text-text-muted leading-relaxed italic" dangerouslySetInnerHTML={{ __html: enlargedArtwork.description }}></p>
                                        </div>
                                    )}
                                </div>

                                {/* AIC Link */}
                                <a
                                    href={`https://www.artic.edu/artworks/${enlargedArtwork.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 mt-4 text-xs font-bold text-accent-blue hover:underline"
                                >
                                    <LucideExternalLink size={12} /> Art Institute of Chicago'da Görüntüle
                                </a>
                            </div>

                            {/* Room Selector & Send Button */}
                            {!isArchiveMode && (
                                <div className="p-6 border-t border-border-light/40 bg-surface-light/30 space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-text-muted block">Kürasyona Gönder</label>
                                    <RoomSelector />
                                    <button
                                        onClick={() => handleSendToCuration(enlargedArtwork)}
                                        disabled={!selectedRoomId}
                                        className="w-full bg-accent-blue hover:bg-accent-blue-hover text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-accent-blue/20 disabled:opacity-50 disabled:cursor-not-allowed group"
                                    >
                                        <LucideSparkles size={18} className="group-hover:animate-pulse" />
                                        İlham Odasına Gönder
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ArticExplorer;
