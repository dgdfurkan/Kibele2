import React, { useState, useEffect } from 'react';
import { LucideChevronLeft, LucideUsers, LucideUser, LucideLayers, LucideSparkles, LucideMessageSquare, LucideUserCheck, LucideSearch, LucideAward, LucideHistory, LucideLock, LucideSettings } from 'lucide-react';
import FinalWorkView from './FinalWorkView';
import AuditTrailView from './AuditTrailView';
import RoomSettingsModal from '../../components/RoomSettingsModal';
import CanvasBoard from '../../components/CanvasBoard';
import { useAuth } from '../../context/AuthContext';
import { getUsersProfiles, deleteRoom, fetchRoomPrivacySettings } from '../../services/dbService';
import { useToast } from '../../context/ToastContext';
import ArtsyExplorer from '../../components/ArtsyExplorer';
import { db, rtdb } from '../../firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { ref, push } from 'firebase/database';

const InspirationWorkspace = ({ room, onBack }) => {
    const { user, isAdmin } = useAuth();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('personal'); // FIX: Default to personal board
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

    // RBAC: Room metadata and status
    const isCreator = room?.creatorId === user?.uid;
    const isArchived = room?.isActive === false || (room?.deadline && (room.deadline.toDate ? room.deadline.toDate() : new Date(room.deadline)) < new Date());

    // RBAC: Admin state for viewing specific participants
    const [participants, setParticipants] = useState([]);
    const [selectedParticipantId, setSelectedParticipantId] = useState(null);
    const [isParticipantDrawerOpen, setIsParticipantDrawerOpen] = useState(false);

    useEffect(() => {
        if (!room?.id) return;

        const loadParticipants = async () => {
            const profiles = await getUsersProfiles(room.participants || []);
            const privacySettings = await fetchRoomPrivacySettings(room.id);

            const enrichedProfiles = profiles.map(p => ({
                ...p,
                isPublic: privacySettings[p.id] || false
            }));

            const visibleProfiles = enrichedProfiles.filter(p =>
                isAdmin || p.id === user.uid || p.isPublic
            );

            setParticipants(visibleProfiles);
            if (!selectedParticipantId) {
                setSelectedParticipantId(user.uid);
            }
        };

        loadParticipants();
    }, [isAdmin, room?.id, room?.participants, user.uid]);

    const activeParticipant = participants.find(p => p.id === selectedParticipantId) || { name: user.name || user.displayName || user.email.split('@')[0], id: user.uid };

    // Tuvale Artsy görseli ekleme mantığı
    const handleAddArtworkToCanvas = async (artwork) => {
        if (isArchived) return;

        const currentCanvasRoomId = activeTab === 'shared' ? `${room.id}_shared` : `${room.id}_${selectedParticipantId || user.uid}`;
        const shapeId = `shape:${Date.now()}`;

        // tldraw image shape structure
        const shape = {
            id: shapeId,
            typeName: 'shape',
            type: 'image',
            x: 100, // Varsayılan pozisyon
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
                src: artwork.image_url || artwork.thumbnail,
                name: artwork.title,
                isAnimated: false,
                mimeType: 'image/jpeg'
            }
        };

        try {
            // NEW: Realtime Database "External Addition" Model
            const externalRef = ref(rtdb, `canvas_sync/${currentCanvasRoomId}/external_shapes`);
            await push(externalRef, shape);
            
            showToast("Görsel tuvale eklendi canım! ✨");
        } catch (error) {
            console.error("Error adding artwork to canvas:", error);
            showToast("Görsel eklenirken bir hata oluştu.", "error");
        }
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'shared':
                return (
                    <div className="w-full h-full p-4 lg:p-8 flex gap-8">
                        <div className="flex-1 relative">
                            <CanvasBoard
                                key={`shared_${room.id}`}
                                roomId={`${room.id}_shared`}
                                baseRoomId={room.id} // NEW: Firestore'daki asıl oda ID'si
                                user={user}
                                roomName={room.name}
                                isReadOnly={true} // FIX: Shared board locked for now
                                roomCreatorId={room.creatorId}
                                boardType="shared"
                            />
                        </div>
                        {isSidebarOpen && (
                            <div className="w-[400px] h-full flex-shrink-0 animate-in slide-in-from-right-8 duration-500">
                                <ArtsyExplorer
                                    onAddArtwork={handleAddArtworkToCanvas}
                                    onClose={() => setIsSidebarOpen(false)}
                                    isArchiveMode={isArchived}
                                />
                            </div>
                        )}
                    </div>
                );
            case 'personal':
                return (
                    <div className="w-full h-full p-4 lg:p-8 flex gap-8">
                        <div className="flex-1 relative">
                            <CanvasBoard
                                key={`personal_${room.id}_${selectedParticipantId || user.uid}`}
                                roomId={`${room.id}_${selectedParticipantId || user.uid}`}
                                baseRoomId={room.id} // NEW
                                user={user}
                                roomName={`${room.name} - ${selectedParticipantId ? activeParticipant.name : 'Kişisel Pano'}`}
                                isReadOnly={isArchived || (selectedParticipantId && selectedParticipantId !== user.uid && !isAdmin)}
                                roomCreatorId={room.creatorId}
                                selectedParticipantId={selectedParticipantId || user.uid}
                                boardType="personal"
                            />
                        </div>
                        {isSidebarOpen && user.uid === (selectedParticipantId || user.uid) && (
                            <div className="w-[400px] h-full flex-shrink-0 animate-in slide-in-from-right-8 duration-500">
                                <ArtsyExplorer
                                    onAddArtwork={handleAddArtworkToCanvas}
                                    onClose={() => setIsSidebarOpen(false)}
                                    isArchiveMode={isArchived}
                                />
                            </div>
                        )}
                    </div>
                );
            case 'final':
                return <FinalWorkView room={room} isArchived={isArchived} />;
            case 'logs':
                return <AuditTrailView roomId={room.id} userId={selectedParticipantId || user.uid} />;
            default:
                return null;
        }
    };

    return (
        <div className="h-screen flex flex-col bg-background overflow-hidden selection:bg-accent-blue selection:text-white">
            {/* Top Navigation */}
            <nav className="h-20 border-b border-border-light/40 bg-white/80 backdrop-blur-xl flex items-center justify-between px-8 flex-shrink-0 z-[60]">
                <div className="flex items-center gap-6">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-surface-light rounded-xl transition-all text-text-muted hover:text-accent-blue"
                    >
                        <LucideChevronLeft size={24} />
                    </button>
                    <div className="h-8 w-px bg-border-light/60"></div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-blue">İlham Odası</span>
                            <span className="w-1 h-1 rounded-full bg-text-muted/30"></span>
                            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{room?.name}</span>
                            {isArchived && (
                                <span className="ml-2 px-2 py-0.5 rounded-lg bg-orange-50 text-orange-600 text-[8px] font-black uppercase tracking-widest border border-orange-100 flex items-center gap-1">
                                    <LucideLock size={8} /> Arşiv
                                </span>
                            )}
                        </div>
                        <h1 className="text-lg font-display font-bold text-text-main italic -mt-0.5">
                            {activeTab === 'shared' ? 'Ortak Moodboard' :
                                activeTab === 'final' ? `Final İşi: ${activeParticipant.name || 'Ben'}` :
                                    activeTab === 'logs' ? `Süreç: ${activeParticipant.name || 'Ben'}` :
                                        `Pano: ${activeParticipant.name || 'Ben'}`}
                        </h1>
                    </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex bg-surface-light/50 p-1.5 rounded-2xl border border-border-light/40 shadow-inner">
                    <button
                        onClick={() => setActiveTab('personal')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'personal'
                            ? 'bg-white text-accent-blue shadow-lg shadow-accent-blue/5'
                            : 'text-text-muted hover:text-text-main'
                            }`}
                    >
                        <LucideUser size={14} /> Pano
                    </button>
                    <button
                        disabled
                        onClick={() => {}}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all opacity-50 cursor-not-allowed text-text-muted"
                        title="Ortak pano geçici olarak kilitlidir."
                    >
                        <LucideLock size={14} /> Ortak (Kilitli)
                    </button>
                    <button
                        onClick={() => setActiveTab('final')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'final'
                            ? 'bg-white text-accent-blue shadow-lg shadow-accent-blue/5'
                            : 'text-text-muted hover:text-text-main'
                            }`}
                    >
                        <LucideAward size={14} /> Final
                    </button>
                    <button
                        onClick={() => setActiveTab('logs')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'logs'
                            ? 'bg-white text-accent-blue shadow-lg shadow-accent-blue/5'
                            : 'text-text-muted hover:text-text-main'
                            }`}
                    >
                        <LucideHistory size={14} /> Süreç
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    {(isAdmin || isCreator) && (
                        <button
                            onClick={() => setIsSettingsModalOpen(true)}
                            className="p-3 bg-surface-light text-text-muted hover:text-accent-blue rounded-2xl transition-all border border-border-light/40 shadow-sm"
                            title="Oda Ayarları"
                        >
                            <LucideSettings size={20} />
                        </button>
                    )}

                    {(isAdmin || isCreator) && (
                        <button
                            onClick={() => setIsParticipantDrawerOpen(!isParticipantDrawerOpen)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-blue/10 text-accent-blue border border-accent-blue/20 text-[10px] font-black uppercase tracking-widest hover:bg-accent-blue/20 transition-all"
                        >
                            <LucideUsers size={14} /> Katılımcılar ({participants.length})
                        </button>
                    )}

                    {(activeTab === 'shared' || (activeTab === 'personal' && !selectedParticipantId)) && (
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className={`p-3 rounded-2xl transition-all ${isSidebarOpen ? 'bg-accent-blue text-white shadow-lg shadow-accent-blue/20' : 'bg-surface-light text-text-muted hover:text-accent-blue'}`}
                            title="Kürasyon Gezgini"
                        >
                            <LucideSparkles size={20} />
                        </button>
                    )}

                    <div className="flex -space-x-3 items-center mr-2">
                        {participants.slice(0, 3).map((p, i) => (
                            <div key={p.id} className="w-9 h-9 rounded-full border-2 border-white bg-gradient-to-br from-accent-blue/20 to-accent-blue/5 flex items-center justify-center text-[10px] font-bold shadow-sm" title={p.name}>
                                {p.name?.charAt(0) || i + 1}
                            </div>
                        ))}
                    </div>
                </div>
            </nav>

            {/* Modals */}
            <RoomSettingsModal
                isOpen={isSettingsModalOpen}
                onClose={() => setIsSettingsModalOpen(false)}
                room={room}
            />

            {/* Admin Participant Drawer */}
            {(isAdmin || isCreator) && isParticipantDrawerOpen && (
                <div className="absolute top-20 right-8 w-80 bg-white/90 backdrop-blur-2xl border border-border-light/40 shadow-2xl rounded-3xl p-6 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-text-muted mb-6">Öğrenci Listesi</h3>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-hide">
                        {participants.map(p => (
                            <button
                                key={p.id}
                                onClick={() => {
                                    setSelectedParticipantId(p.id);
                                    setIsParticipantDrawerOpen(false);
                                }}
                                className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${selectedParticipantId === p.id ? 'bg-accent-blue text-white shadow-xl shadow-accent-blue/20' : 'hover:bg-surface-light text-text-main'}`}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${selectedParticipantId === p.id ? 'bg-white/20' : 'bg-accent-blue/10 text-accent-blue'}`}>
                                    {p.name?.charAt(0) || '?'}
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-bold">{p.name || 'İsimsiz'}</p>
                                    <p className={`text-[10px] uppercase font-black tracking-widest ${selectedParticipantId === p.id ? 'text-white/60' : 'text-text-muted'}`}>{p.role || 'Öğrenci'}</p>
                                </div>
                                {selectedParticipantId === p.id && <LucideUserCheck size={16} className="ml-auto" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">
                <main className="flex-1 overflow-hidden relative">
                    {renderTabContent()}
                </main>
            </div>
        </div>
    );
};

export default InspirationWorkspace;
