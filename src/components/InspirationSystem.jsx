import React, { useState, useEffect, useRef } from 'react';
import { LucideSearch, LucidePlus, LucideLock, LucideUnlock, LucideLayers, LucideUsers, LucideArrowRight, LucideChevronLeft, LucideChevronRight } from 'lucide-react';
import { subscribeToRooms } from '../services/dbService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import CreateRoomModal from './CreateRoomModal';
import RoomDetailModal from './RoomDetailModal';

const InspirationSystem = ({ onEnterRoom }) => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [rooms, setRooms] = useState([]);
    const [activeTab, setActiveTab] = useState('explore'); // 'explore' or 'my-rooms'
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    const scrollRef = useRef(null);

    useEffect(() => {
        const unsubscribe = subscribeToRooms((updatedRooms) => {
            setRooms(updatedRooms);
        });
        return () => unsubscribe();
    }, []);

    const filteredRooms = rooms.filter(room => {
        const matchesSearch = room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            room.description?.toLowerCase().includes(searchQuery.toLowerCase());

        if (activeTab === 'my-rooms') {
            return matchesSearch && (room.creatorId === user?.uid || room.participants?.includes(user?.uid));
        }
        return matchesSearch;
    });

    const scroll = (direction) => {
        if (scrollRef.current) {
            const { scrollLeft, clientWidth } = scrollRef.current;
            const scrollTo = direction === 'left' ? scrollLeft - clientWidth / 2 : scrollLeft + clientWidth / 2;
            scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
        }
    };

    const handleRoomClick = (room) => {
        setSelectedRoom(room);
        setIsDetailModalOpen(true);
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-12" id="inspiration-rooms">
            {/* Header */}
            <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-display font-semibold mb-3">İlham Odaları</h1>
                    <p className="text-text-muted max-w-2xl text-lg italic">
                        "Fikirlerin paylaşıldığı, yaratıcılığın kurgulandığı topluluk alanları. Bir oda seç veya kendi dünyanı kur."
                    </p>
                </div>

                <div className="flex bg-surface-light p-1 rounded-full shadow-sm border border-border-light self-start">
                    <button
                        onClick={() => setActiveTab('explore')}
                        className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${activeTab === 'explore' ? 'bg-accent-blue text-white shadow-md' : 'text-text-muted hover:text-text-main'}`}
                    >
                        Keşfet
                    </button>
                    <button
                        onClick={() => setActiveTab('my-rooms')}
                        className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${activeTab === 'my-rooms' ? 'bg-accent-blue text-white shadow-md' : 'text-text-muted hover:text-text-main'}`}
                    >
                        Odalarım
                    </button>
                </div>
            </div>

            {/* Actions & Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
                <div className="relative flex-1">
                    <LucideSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                    <input
                        type="text"
                        placeholder="İlham odası ara... (örn: VCD)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white/40 backdrop-blur-md rounded-2xl border border-white/50 focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue outline-none transition-all placeholder:text-text-muted/50"
                    />
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-accent-blue text-white px-8 py-3 rounded-2xl font-medium hover:bg-opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-accent-blue/20"
                >
                    <LucidePlus size={20} />
                    Yeni Oda Kur
                </button>
            </div>

            {/* Carousel structure */}
            {filteredRooms.length > 0 ? (
                <div className="group relative">
                    <button
                        onClick={() => scroll('left')}
                        className="absolute -left-6 top-1/2 -translate-y-1/2 z-10 p-3 bg-white shadow-xl rounded-full text-text-muted hover:text-accent-blue opacity-0 group-hover:opacity-100 transition-all hidden md:block"
                    >
                        <LucideChevronLeft size={24} />
                    </button>

                    <div
                        ref={scrollRef}
                        className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide snap-x"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {filteredRooms.map((room) => (
                            <div
                                key={room.id}
                                onClick={() => handleRoomClick(room)}
                                className="min-w-[190px] md:min-w-[220px] snap-start"
                            >
                                <div className="glass-panel p-4 rounded-2xl transition-all duration-500 hover:shadow-lg hover:-translate-y-1 cursor-pointer border border-white/30 h-full flex flex-col group/card">
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="flex items-center gap-1.5">
                                            <div className={`p-2 rounded-lg ${room.isPrivate ? 'bg-text-main text-white' : 'bg-accent-blue/5 text-accent-blue'}`}>
                                                {room.isPrivate ? <LucideLock size={14} /> : <LucideUnlock size={14} />}
                                            </div>
                                            {room.creatorId === user?.uid && (
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-sm shadow-green-500/50" title="Senin Odan" />
                                            )}
                                        </div>
                                        <div className="text-[10px] font-bold text-text-muted/60 flex items-center gap-1">
                                            <LucideUsers size={10} />
                                            {room.participants?.length || 0}
                                        </div>
                                    </div>

                                    <h3 className="text-base font-display font-bold mb-1 line-clamp-1 group-hover/card:text-accent-blue transition-colors">
                                        {room.name}
                                    </h3>

                                    <p className="text-text-muted text-[11px] line-clamp-2 mb-4 italic flex-grow opacity-70 leading-relaxed">
                                        "{room.description || "Yaratıcı bir alan."}"
                                    </p>

                                    <div className="flex items-center justify-between pt-3 border-t border-border-light/20">
                                        <div className="flex -space-x-1.5">
                                            {[1, 2].map(i => (
                                                <div key={i} className="w-6 h-6 rounded-full border border-white bg-surface-light flex items-center justify-center text-[8px] font-bold text-text-muted">
                                                    {i}
                                                </div>
                                            ))}
                                        </div>

                                        <span className="text-accent-blue text-[11px] font-bold flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-all transform translate-x-1 group-hover/card:translate-x-0">
                                            Göz At <LucideArrowRight size={12} />
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={() => scroll('right')}
                        className="absolute -right-6 top-1/2 -translate-y-1/2 z-10 p-3 bg-white shadow-xl rounded-full text-text-muted hover:text-accent-blue opacity-0 group-hover:opacity-100 transition-all hidden md:block"
                    >
                        <LucideChevronRight size={24} />
                    </button>
                </div>
            ) : (
                <div className="text-center py-20 bg-surface-light/30 rounded-[3rem] border-2 border-dashed border-border-light">
                    <LucideLayers className="mx-auto text-text-muted mb-4 opacity-20" size={64} />
                    <h3 className="text-2xl font-display font-medium mb-1">Henüz buna uygun bir oda yok.</h3>
                    <p className="text-text-muted text-lg">Kendi odanı kurarak ilk adımı sen atabilirsin canım! ✨</p>
                </div>
            )}

            <CreateRoomModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
            <RoomDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                room={selectedRoom}
            />
        </div>
    );
};

export default InspirationSystem;
