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
            {/* Grid structure */}
            {filteredRooms.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredRooms.map((room) => (
                        <div
                            key={room.id}
                            onClick={() => handleRoomClick(room)}
                            className="group/card relative h-auto min-h-[220px] rounded-3xl overflow-hidden transition-all duration-500 hover:shadow-xl hover:-translate-y-1 cursor-pointer bg-white border border-border-light/40 flex flex-col"
                        >
                            {/* Card Header Background - Minimalist */}
                            <div className="h-16 bg-gradient-to-br from-surface-light/50 to-white relative">
                                <div className="absolute top-4 left-4 flex items-center gap-1.5">
                                    <div className={`p-1.5 rounded-xl shadow-sm ${room.isPrivate ? 'bg-text-main text-white' : 'bg-white text-accent-blue border border-border-light'}`}>
                                        {room.isPrivate ? <LucideLock size={12} /> : <LucideUnlock size={12} />}
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-text-muted/40 bg-white/50 px-2 py-0.5 rounded-full border border-border-light/20">
                                        {room.isPrivate ? 'Özel' : 'Açık'}
                                    </span>
                                </div>
                            </div>

                            <div className="px-5 pb-5 flex flex-col flex-grow -mt-2 relative z-10">
                                <div className="mb-2">
                                    <h3 className="text-lg font-display font-bold group-hover/card:text-accent-blue transition-colors duration-300 leading-tight line-clamp-1">
                                        {room.name}
                                    </h3>
                                    <div className="flex items-center gap-1.5 text-text-muted text-[10px] font-medium opacity-60">
                                        Kurucu: {room.creatorName ? room.creatorName.split(' ')[0] : "Kibele Küratörü"}
                                    </div>
                                </div>

                                <p className="text-text-muted text-[11px] line-clamp-2 mb-4 flex-grow leading-relaxed opacity-80">
                                    {room.description || "Yaratıcı ilham alanı."}
                                </p>

                                <div className="flex items-center justify-between pt-3 border-t border-border-light/30">
                                    <div className="flex items-center gap-2 text-text-muted text-[10px] font-bold">
                                        <LucideUsers size={12} className="text-accent-blue" />
                                        {room.participants?.length || 0}
                                    </div>

                                    <div className="flex items-center gap-1 text-accent-blue text-[10px] font-black uppercase tracking-tighter opacity-0 group-hover/card:opacity-100 transition-all transform translate-x-1 group-hover/card:translate-x-0">
                                        GİR <LucideArrowRight size={10} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
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
