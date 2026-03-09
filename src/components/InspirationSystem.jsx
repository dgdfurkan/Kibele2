import React, { useState, useEffect } from 'react';
import { LucideSearch, LucidePlus, LucideLock, LucideUnlock, LucideLayers, LucideUsers, LucideArrowRight } from 'lucide-react';
import { subscribeToRooms, requestRoomAccess } from '../services/dbService';
import { useAuth } from '../context/AuthContext';
import CreateRoomModal from './CreateRoomModal';

const InspirationSystem = () => {
    const { user } = useAuth();
    const [rooms, setRooms] = useState([]);
    const [activeTab, setActiveTab] = useState('explore'); // 'explore' or 'my-rooms'
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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

    const handleJoinRequest = async (room) => {
        if (!user) {
            alert("İstek göndermek için giriş yapmalısın canım!");
            return;
        }
        try {
            await requestRoomAccess(room.id, room.name, user, room.creatorId);
            alert("İsteğin gönderildi canım. It is okey, onay bekliyoruz! ✨");
        } catch (error) {
            console.error("Join request error:", error);
            alert("Bir hata oluştu, tekrar dene.");
        }
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
                        placeholder="İlham odası ara... (örn: VCD, İlüstrasyon)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-2xl border border-border-light focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue outline-none transition-all"
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

            {/* Masonry Grid */}
            {filteredRooms.length > 0 ? (
                <div className="masonry-grid">
                    {filteredRooms.map((room) => (
                        <div key={room.id} className="masonry-item group cursor-pointer">
                            <div className="glass-panel p-6 rounded-3xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-2 rounded-xl bg-accent-blue/10 text-accent-blue">
                                        {room.isPrivate ? <LucideLock size={20} /> : <LucideUnlock size={20} />}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs font-medium px-3 py-1 bg-surface-light rounded-full border border-border-light">
                                        <LucideUsers size={14} />
                                        {room.participants?.length || 0} Üye
                                    </div>
                                </div>

                                <h3 className="text-xl font-display font-semibold mb-2 group-hover:text-accent-blue transition-colors">
                                    {room.name}
                                </h3>

                                <p className="text-text-muted text-sm line-clamp-3 mb-6">
                                    {room.description || "Bu oda için henüz bir açıklama girilmemiş."}
                                </p>

                                <div className="flex items-center justify-between mt-auto">
                                    <div className="flex -space-x-2">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-200" />
                                        ))}
                                    </div>

                                    {room.participants?.includes(user?.uid) || room.creatorId === user?.uid ? (
                                        <button className="text-accent-blue text-sm font-semibold flex items-center gap-1">
                                            İçeri Gir <LucideArrowRight size={14} />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleJoinRequest(room)}
                                            className="bg-accent-blue/10 text-accent-blue px-4 py-1.5 rounded-xl text-sm font-semibold hover:bg-accent-blue hover:text-white transition-all"
                                        >
                                            {room.isPrivate ? 'İstek Gönder' : 'Katıl'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 glass-panel rounded-3xl">
                    <LucideLayers className="mx-auto text-text-muted mb-4" size={48} />
                    <h3 className="text-xl font-medium mb-1">Henüz buna uygun bir oda yok.</h3>
                    <p className="text-text-muted">Kendi odanı kurarak ilk adımı sen atabilirsin canım! ✨</p>
                </div>
            )}

            <CreateRoomModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
        </div>
    );
};

export default InspirationSystem;
