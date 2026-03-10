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
                        className="flex gap-6 overflow-x-auto pb-8 scrollbar-hide snap-x"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {filteredRooms.map((room) => (
                            <div
                                key={room.id}
                                onClick={() => handleRoomClick(room)}
                                className="min-w-[280px] md:min-w-[320px] snap-start"
                            >
                                <div className="glass-panel p-8 rounded-[2.5rem] transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 cursor-pointer border border-white/50 h-full flex flex-col">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-center gap-2">
                                            <div className={`p-3 rounded-2xl ${room.isPrivate ? 'bg-text-main text-white' : 'bg-accent-blue/10 text-accent-blue'}`}>
                                                {room.isPrivate ? <LucideLock size={20} /> : <LucideUnlock size={20} />}
                                            </div>
                                            {room.creatorId === user?.uid && (
                                                <span className="text-[10px] font-bold bg-green-500/10 text-green-600 px-3 py-1.5 rounded-xl border border-green-500/20 uppercase tracking-widest">
                                                    Senin Odan
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs font-bold px-4 py-1.5 bg-surface-light rounded-full border border-border-light uppercase tracking-wider">
                                            <LucideUsers size={14} />
                                            {room.participants?.length || 0} Üye
                                        </div>
                                    </div>

                                    <h3 className="text-2xl font-display font-bold mb-3 line-clamp-1">
                                        {room.name}
                                    </h3>

                                    <p className="text-text-muted text-sm line-clamp-3 mb-8 italic flex-grow">
                                        "{room.description || "Bu oda yaratıcı dünyaların keşfedildiği özel bir alandır."}"
                                    </p>

                                    <div className="flex items-center justify-between pt-6 border-t border-border-light/50">
                                        <div className="flex -space-x-3">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="w-9 h-9 rounded-full border-2 border-white bg-gradient-to-br from-surface-light to-border-light flex items-center justify-center text-[10px] font-bold text-text-muted">
                                                    {i}
                                                </div>
                                            ))}
                                        </div>

                                        <span className="text-accent-blue text-sm font-bold flex items-center gap-2 group/btn">
                                            İncele <LucideArrowRight size={16} className="transition-transform group-hover/btn:translate-x-1" />
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
