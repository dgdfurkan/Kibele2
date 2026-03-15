import React, { useState, useEffect, useRef } from 'react';
import { LucideSearch, LucideX, LucideSparkles, LucideRefreshCcw, LucideTrash2, LucideChevronDown, LucideCheck, LucidePlus } from 'lucide-react';
import { searchArtsyArtworks, ARTSY_FILTERS } from '../services/artsyService';
import { useAuth } from '../context/AuthContext';
import { subscribeToRooms } from '../services/dbService';
import { rtdb } from '../firebase';
import { ref, push } from 'firebase/database';
import { useToast } from '../context/ToastContext';

const ArtsyExplorer = ({ onAddArtwork, onCurateArtwork, onClose, isArchiveMode }) => {
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
        colors: [],
        places: []
    });

    const [expandedFilters, setExpandedFilters] = useState({
        artwork_type: false,
        artists: false,
        places: false,
        colors: false
    });

    const [enlargedArtwork, setEnlargedArtwork] = useState(null);
    const [userRooms, setUserRooms] = useState([]);
    const [selectedRoomId, setSelectedRoomId] = useState('');

    const lastSearchRef = useRef(null);

    // Fetch user's joined rooms for the Lightbox Room Selector
    useEffect(() => {
        if (!user) return;
        const unsubscribe = subscribeToRooms((allRooms) => {
            const joinedRooms = allRooms.filter(r => 
                (r.participants?.includes(user.uid) || r.creatorId === user.uid) && r.isActive !== false
            );
            setUserRooms(joinedRooms);
            if (joinedRooms.length > 0) {
                setSelectedRoomId(joinedRooms[0].id);
            }
        });
        return () => unsubscribe();
    }, [user]);

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

    const handleRemoteAddArtwork = async (artwork) => {
        if (isArchiveMode) return;
        
        // If they want to add to current workspace, use prop
        if (onAddArtwork && (!selectedRoomId || selectedRoomId === 'current')) {
            onAddArtwork(artwork);
            setEnlargedArtwork(null);
            return;
        }

        // If they want to curate
        if (onCurateArtwork && selectedRoomId === 'curation') {
            onCurateArtwork(artwork);
            setEnlargedArtwork(null);
            return;
        }

        // Otherwise write to remote RTDB for the selected room
        if (!selectedRoomId) {
            showToast("Lütfen bir oda seçin.", "error");
            return;
        }

        const currentCanvasRoomId = `${selectedRoomId}_${user.uid}`; // Assuming personal board
        const shapeId = `shape:${Date.now()}`;

        const shape = {
            id: shapeId,
            typeName: 'shape',
            type: 'image',
            x: 100,
            y: 100,
            rotation: 0,
            index: 'a1',
            opacity: 1,
            isLocked: false,
            parentId: 'page:page',
            meta: {
                creatorId: user.uid,
                creatorName: user.name || user.displayName || 'Sanatçı',
                createdAt: Date.now()
            },
            props: {
                w: 400,
                h: 400 * (artwork.aspect_ratio || 1),
                rel: 'external',
                src: artwork.image_url || artwork.thumbnail || "",
                url: artwork.image_url || artwork.thumbnail || "",
                name: artwork.title || "İsimsiz Görsel",
                isAnimated: false,
                mimeType: 'image/jpeg',
                playing: false
            }
        };

        try {
            const externalRef = ref(rtdb, `canvas_sync/${currentCanvasRoomId}/external_shapes`);
            await push(externalRef, shape);
            showToast("Görsel ilham odasına eklendi! ✨");
            setEnlargedArtwork(null);
        } catch (error) {
            console.error("Error adding artwork to canvas remotely:", error);
            showToast("Görsel eklenirken bir hata oluştu.", "error");
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#FDF8F5] dark:bg-[#1E1C1A] border-l border-border-light/40 shadow-[-4px_0_24px_rgba(0,0,0,0.05)] overflow-hidden">
            {/* STICKY TOP SECTION: Header + Search */}
            <div className="flex-shrink-0 z-20 bg-white/90 backdrop-blur-xl border-b border-border-light/40 shadow-sm p-4 w-full">
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-accent-blue/10 flex items-center justify-center text-accent-blue">
                            <LucideSparkles size={16} />
                        </div>
                        <div>
                            <h2 className="text-lg font-display font-bold text-text-main leading-tight italic">Derinlikli Kürasyon</h2>
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
                        placeholder="Search artworks, artists, styles..."
                        className="w-full bg-surface-light/50 rounded-xl py-2.5 pl-10 pr-4 outline-none text-sm transition-all shadow-inner focus:bg-white focus:ring-2 focus:ring-accent-blue/20"
                    />
                    <LucideSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                    {loading && <LucideRefreshCcw className="absolute right-3 top-1/2 -translate-y-1/2 text-accent-blue animate-spin" size={14} />}
                </div>
            </div>

            {/* SCROLLABLE MAIN CONTENT: EXACT HTML MAPPING FOR FILTERS + GRID */}
            <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col">
                
                {/* o-collection-filters (Compact Layout) */}
                <div className="o-collection-filters w-full border-b border-border-light/40 bg-white" id="collectionFilters">
                    <div className="o-collection-filters__scroll-area p-4">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Filtreler</span>
                            {Object.values(filters).some(arr => arr.length > 0) && (
                                <button onClick={clearFilters} className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors flex items-center gap-1">
                                    <LucideTrash2 size={12} /> Temizle
                                </button>
                            )}
                        </div>

                        <div className="o-accordion o-collection-filters__filters space-y-2">
                            {/* Artists */}
                            <div className="border border-border-light/40 rounded-xl overflow-hidden">
                                <p 
                                    className="o-accordion__trigger f-tag-2 p-3 flex justify-between items-center cursor-pointer bg-surface-light/30 hover:bg-surface-light/50 transition-colors m-0"
                                    onClick={() => toggleSection('artists')}
                                >
                                    <span className="font-semibold text-sm">Artists {filters.artists.length > 0 && `(${filters.artists.length})`}</span>
                                    <LucideChevronDown size={14} className={`transition-transform duration-300 ${expandedFilters.artists ? 'rotate-180' : ''}`} />
                                </p>
                                {expandedFilters.artists && (
                                    <div className="o-accordion__panel p-3 border-t border-border-light/40 bg-white o-accordion__panel-content m-filters">
                                        <div className="m-filters__whittle-down mb-3 relative">
                                            <input type="text" className="f-secondary w-full border border-border-light rounded-lg px-3 py-1.5 text-xs outline-none focus:border-accent-blue/50" placeholder="Find Artists" />
                                        </div>
                                        <ul className="m-filters__list max-h-40 overflow-y-auto space-y-1 scrollbar-hide m-0 p-0 list-none">
                                            {ARTSY_FILTERS.artists.map(s => (
                                                <li key={s.id} className="m-0 p-0">
                                                    <button 
                                                        onClick={() => toggleFilter('artists', s.id)} 
                                                        className={`checkbox f-secondary w-full text-left px-2 py-1.5 rounded-md text-xs transition-all flex items-center gap-2 ${filters.artists.includes(s.id) ? 'bg-accent-blue/10 text-accent-blue font-medium' : 'hover:bg-surface-light'}`}
                                                    >
                                                        <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 ${filters.artists.includes(s.id) ? 'bg-accent-blue border-accent-blue text-white' : 'border-border-light'}`}>
                                                            {filters.artists.includes(s.id) && <LucideCheck size={10} strokeWidth={3} />}
                                                        </div>
                                                        <span className="truncate">{s.name}</span>
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            {/* Places */}
                            <div className="border border-border-light/40 rounded-xl overflow-hidden">
                                <p 
                                    className="o-accordion__trigger f-tag-2 p-3 flex justify-between items-center cursor-pointer bg-surface-light/30 hover:bg-surface-light/50 transition-colors m-0"
                                    onClick={() => toggleSection('places')}
                                >
                                    <span className="font-semibold text-sm">Places {filters.places.length > 0 && `(${filters.places.length})`}</span>
                                    <LucideChevronDown size={14} className={`transition-transform duration-300 ${expandedFilters.places ? 'rotate-180' : ''}`} />
                                </p>
                                {expandedFilters.places && (
                                    <div className="o-accordion__panel p-3 border-t border-border-light/40 bg-white o-accordion__panel-content m-filters">
                                        <div className="m-filters__whittle-down mb-3 relative">
                                            <input type="text" className="f-secondary w-full border border-border-light rounded-lg px-3 py-1.5 text-xs outline-none focus:border-accent-blue/50" placeholder="Find Places" />
                                        </div>
                                        <ul className="m-filters__list max-h-40 overflow-y-auto space-y-1 scrollbar-hide m-0 p-0 list-none">
                                            {ARTSY_FILTERS.places.map(p => (
                                                <li key={p.id} className="m-0 p-0">
                                                    <button 
                                                        onClick={() => toggleFilter('places', p.id)} 
                                                        className={`checkbox f-secondary w-full text-left px-2 py-1.5 rounded-md text-xs transition-all flex items-center gap-2 ${filters.places.includes(p.id) ? 'bg-accent-blue/10 text-accent-blue font-medium' : 'hover:bg-surface-light'}`}
                                                    >
                                                        <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 ${filters.places.includes(p.id) ? 'bg-accent-blue border-accent-blue text-white' : 'border-border-light'}`}>
                                                            {filters.places.includes(p.id) && <LucideCheck size={10} strokeWidth={3} />}
                                                        </div>
                                                        <span className="truncate">{p.name}</span>
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            {/* Artwork Type */}
                            <div className="border border-border-light/40 rounded-xl overflow-hidden">
                                <p 
                                    className="o-accordion__trigger f-tag-2 p-3 flex justify-between items-center cursor-pointer bg-surface-light/30 hover:bg-surface-light/50 transition-colors m-0"
                                    onClick={() => toggleSection('artwork_type')}
                                >
                                    <span className="font-semibold text-sm">Artwork Type {filters.artwork_type.length > 0 && `(${filters.artwork_type.length})`}</span>
                                    <LucideChevronDown size={14} className={`transition-transform duration-300 ${expandedFilters.artwork_type ? 'rotate-180' : ''}`} />
                                </p>
                                {expandedFilters.artwork_type && (
                                    <div className="o-accordion__panel p-3 border-t border-border-light/40 bg-white o-accordion__panel-content m-filters">
                                        <div className="m-filters__whittle-down mb-3 relative">
                                            <input type="text" className="f-secondary w-full border border-border-light rounded-lg px-3 py-1.5 text-xs outline-none focus:border-accent-blue/50" placeholder="Find Artwork Types" />
                                        </div>
                                        <ul className="m-filters__list max-h-40 overflow-y-auto space-y-1 scrollbar-hide m-0 p-0 list-none">
                                            {ARTSY_FILTERS.artwork_type.map(m => (
                                                <li key={m.id} className="m-0 p-0">
                                                    <button 
                                                        onClick={() => toggleFilter('artwork_type', m.id)} 
                                                        className={`checkbox f-secondary w-full text-left px-2 py-1.5 rounded-md text-xs transition-all flex items-center gap-2 ${filters.artwork_type.includes(m.id) ? 'bg-accent-blue/10 text-accent-blue font-medium' : 'hover:bg-surface-light'}`}
                                                    >
                                                        <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 ${filters.artwork_type.includes(m.id) ? 'bg-accent-blue border-accent-blue text-white' : 'border-border-light'}`}>
                                                            {filters.artwork_type.includes(m.id) && <LucideCheck size={10} strokeWidth={3} />}
                                                        </div>
                                                        <span className="truncate">{m.name}</span>
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            {/* Colors */}
                            <div className="border border-border-light/40 rounded-xl overflow-hidden">
                                <p 
                                    className="o-accordion__trigger f-tag-2 p-3 flex justify-between items-center cursor-pointer bg-surface-light/30 hover:bg-surface-light/50 transition-colors m-0"
                                    onClick={() => toggleSection('colors')}
                                >
                                    <span className="font-semibold text-sm">Colors {filters.colors.length > 0 && `(${filters.colors.length})`}</span>
                                    <LucideChevronDown size={14} className={`transition-transform duration-300 ${expandedFilters.colors ? 'rotate-180' : ''}`} />
                                </p>
                                {expandedFilters.colors && (
                                    <div className="o-accordion__panel p-3 border-t border-border-light/40 bg-white o-accordion__panel-content m-filters">
                                        <div className="flex flex-wrap gap-2">
                                            {ARTSY_FILTERS.colors.map(c => (
                                                <button
                                                    key={c.id}
                                                    onClick={() => toggleFilter('colors', c.id)}
                                                    className={`w-6 h-6 rounded-full border border-border-light/40 transition-all shrink-0 flex items-center justify-center ${filters.colors.includes(c.id) ? 'ring-2 ring-accent-blue ring-offset-1 scale-110' : 'hover:scale-110'}`}
                                                    style={{ backgroundColor: c.hex }}
                                                    title={c.name}
                                                >
                                                    {filters.colors.includes(c.id) && <LucideCheck size={10} className={c.id === 'white' || c.id === 'yellow' ? 'text-text-main' : 'text-white'} strokeWidth={3} />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* RESULTS GRID (4 on md+, 2 on mobile) */}
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

            {/* LIGHTBOX MODAL WITH ROOM SELECTOR */}
            {enlargedArtwork && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md" onClick={() => setEnlargedArtwork(null)}>
                    <div 
                        className="bg-white rounded-3xl overflow-hidden shadow-2xl border border-border-light/40 w-full max-w-4xl max-h-[90vh] flex flex-col md:flex-row relative animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <button 
                            onClick={() => setEnlargedArtwork(null)}
                            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm shadow-sm flex items-center justify-center text-text-main hover:bg-white hover:text-red-500 transition-colors"
                        >
                            <LucideX size={18} />
                        </button>

                        {/* Image Area */}
                        <div className="md:w-3/5 bg-black/5 flex items-center justify-center p-6 min-h-[40vh]">
                            <img 
                                src={enlargedArtwork.image_url || enlargedArtwork.thumbnail} 
                                alt={enlargedArtwork.title} 
                                className="max-w-full max-h-[80vh] rounded-xl object-contain shadow-md"
                            />
                        </div>

                        {/* Details & Actions Area */}
                        <div className="md:w-2/5 p-8 flex flex-col bg-white overflow-y-auto">
                            <div className="flex-1">
                                <h3 className="text-2xl font-display font-bold text-text-main mb-2 leading-tight pr-8">{enlargedArtwork.title}</h3>
                                {enlargedArtwork.artist && (
                                    <p className="text-text-muted font-medium mb-4">{enlargedArtwork.artist}</p>
                                )}
                                
                                <div className="space-y-3 mb-6 border-t border-border-light/30 pt-4">
                                    {enlargedArtwork.medium && (
                                        <div>
                                            <span className="block text-[10px] font-black uppercase tracking-widest text-text-muted/60 mb-0.5">Teknik</span>
                                            <p className="text-sm font-medium">{enlargedArtwork.medium}</p>
                                        </div>
                                    )}
                                    {enlargedArtwork.date && (
                                        <div>
                                            <span className="block text-[10px] font-black uppercase tracking-widest text-text-muted/60 mb-0.5">Tarih</span>
                                            <p className="text-sm font-medium">{enlargedArtwork.date}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="pt-6 border-t border-border-light/40 mt-auto">
                                {!isArchiveMode && (
                                    <div className="space-y-4">
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">Buraya Ekle:</label>
                                            
                                            {/* Show onAddArtwork context as "Mevcut Pano", followed by other rooms */}
                                                    {userRooms.length > 0 || onAddArtwork || onCurateArtwork ? (
                                                        <select 
                                                            value={selectedRoomId}
                                                            onChange={(e) => setSelectedRoomId(e.target.value)}
                                                            className="w-full bg-surface border border-border-light/40 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-accent-blue/50 focus:ring-2 focus:ring-accent-blue/10 appearance-none"
                                                            style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
                                                        >
                                                            {onAddArtwork && <option value="current">Mevcut Panoya Ekle</option>}
                                                            {onCurateArtwork && <option value="curation">Oda Kürasyonuna Kaydet</option>}
                                                            {userRooms.map((r, i) => (
                                                                <option key={r.id || i} value={r.id}>{r.name}</option>
                                                            ))}
                                                        </select>
                                            ) : (
                                                <p className="text-xs text-orange-500 font-medium bg-orange-50 p-3 rounded-xl border border-orange-100">Henüz katıldığın bir ilham odası yok.</p>
                                            )}
                                        </div>

                                                <button 
                                                    onClick={() => handleRemoteAddArtwork(enlargedArtwork)}
                                                    disabled={(!selectedRoomId || selectedRoomId === '') && !onAddArtwork && !onCurateArtwork}
                                                    className="w-full bg-accent-blue hover:bg-accent-blue-hover text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-accent-blue/20 disabled:opacity-50 disabled:cursor-not-allowed group"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {selectedRoomId === 'curation' ? <LucideSparkles size={18} /> : <LucidePlus size={18} />}
                                                        {selectedRoomId === 'curation' ? 'Kürasyona Kaydet' : 'Odaya Gönder'}
                                                    </div>
                                                </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ArtsyExplorer;
