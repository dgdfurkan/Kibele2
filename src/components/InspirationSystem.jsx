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
                                className="min-w-[280px] md:min-w-[320px] snap-start"
                            >
                                <div className="group/card relative h-[380px] rounded-[2.5rem] overflow-hidden transition-all duration-700 hover:shadow-[0_20px_50px_rgba(100,180,210,0.15)] hover:-translate-y-2 cursor-pointer bg-white border border-border-light/50 flex flex-col">
                                    {/* Card Header Background */}
                                    <div className="h-24 bg-gradient-to-br from-surface-light to-white relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-accent-blue/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover/card:bg-accent-blue/10 transition-all duration-700" />

                                        <div className="absolute top-6 left-6 flex items-center gap-2">
                                            <div className={`p-2.5 rounded-2xl shadow-sm ${room.isPrivate ? 'bg-text-main text-white' : 'bg-white text-accent-blue border border-border-light'}`}>
                                                {room.isPrivate ? <LucideLock size={16} /> : <LucideUnlock size={16} />}
                                            </div>
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted/60 bg-surface-light px-2.5 py-1 rounded-full border border-border-light/30">
                                                {room.isPrivate ? 'Özel' : 'Açık'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="px-8 pb-8 flex flex-col flex-grow -mt-4 relative z-10">
                                        <div className="mb-4">
                                            <h3 className="text-2xl font-display font-bold mb-1 group-hover/card:text-accent-blue transition-colors duration-500 leading-tight">
                                                {room.name}
                                            </h3>
                                            <div className="flex items-center gap-2 text-text-muted text-[11px] font-medium italic">
                                                <div className="w-1.5 h-1.5 rounded-full bg-accent-blue/40" />
                                                Kurucu: {room.creatorName || "Kibele Küratörü"}
                                            </div>
                                        </div>

                                        <p className="text-text-muted text-sm line-clamp-3 mb-6 flex-grow leading-relaxed">
                                            {room.description || "Bu oda, yaratıcı süreçlerin paylaşıldığı ve estetik birikimin toplandığı özel bir ilham alanıdır."}
                                        </p>

                                        <div className="flex items-center justify-between pt-6 border-t border-border-light/40">
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-1.5 text-text-muted text-xs font-bold">
                                                    <LucideUsers size={14} className="text-accent-blue" />
                                                    {room.participants?.length || 0}
                                                </div>
                                                {room.creatorId === user?.uid && (
                                                    <span className="text-[9px] font-black uppercase tracking-tighter text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">
                                                        Senin
                                                    </span>
                                                )}
                                            </div>

                                            <button className="w-10 h-10 rounded-full bg-surface-light flex items-center justify-center text-text-muted group-hover/card:bg-accent-blue group-hover/card:text-white transition-all duration-500 shadow-sm border border-border-light/50">
                                                <LucideArrowRight size={18} />
                                            </button>
                                        </div>
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
