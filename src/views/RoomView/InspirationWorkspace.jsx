import React, { useState, useEffect } from 'react';
import { LucideChevronLeft, LucideUsers, LucideUser, LucideLayers, LucideSparkles, LucideMessageSquare, LucideUserCheck, LucideSearch } from 'lucide-react';
import RoomDetailView from './RoomDetailView';
import SharedBoardView from './SharedBoardView';
import { useAuth } from '../../context/AuthContext';
import { getUsersProfiles, deleteRoom } from '../../services/dbService';
import { useToast } from '../../context/ToastContext';

const InspirationWorkspace = ({ room, onBack }) => {
    const { user, isAdmin } = useAuth();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('personal'); // 'personal' or 'shared'
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // RBAC: Admin state for viewing specific participants
    const [participants, setParticipants] = useState([]);
    const [selectedParticipantId, setSelectedParticipantId] = useState(null);
    const [isParticipantDrawerOpen, setIsParticipantDrawerOpen] = useState(false);

    useEffect(() => {
        if (isAdmin && room?.participants?.length > 0) {
            getUsersProfiles(room.participants).then(profiles => {
                setParticipants(profiles);
                // Default to current user if they are in participants, or the first participant
                if (!selectedParticipantId) {
                    setSelectedParticipantId(user.uid);
                }
            });
        } else {
            setSelectedParticipantId(user.uid);
        }
    }, [isAdmin, room?.participants, user.uid]);

    const activeParticipant = participants.find(p => p.id === selectedParticipantId) || { name: user.name, id: user.uid };

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
                            {isAdmin && (
                                <button
                                    onClick={async () => {
                                        if (window.confirm("Bu odayı ve içindeki tüm verileri silmek istediğine emin misin canım? Bu işlem geri alınamaz.")) {
                                            try {
                                                await deleteRoom(room.id);
                                                showToast("Oda başarıyla uçuruldu canım! ✨");
                                                onBack();
                                            } catch (error) {
                                                showToast("Oda silinirken bir hata oluştu.", "error");
                                            }
                                        }
                                    }}
                                    className="ml-2 px-2 py-0.5 rounded-lg bg-red-50 text-red-500 text-[8px] font-black hover:bg-red-500 hover:text-white transition-all"
                                >
                                    ODAYI SIL
                                </button>
                            )}
                        </div>
                        <h1 className="text-lg font-display font-bold text-text-main italic -mt-0.5">
                            {activeTab === 'shared' ? 'Ortak Pano' : `Pano: ${activeParticipant.name || 'Ben'}`}
                        </h1>
                    </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex bg-surface-light/50 p-1.5 rounded-2xl border border-border-light/40 shadow-inner">
                    <button
                        onClick={() => setActiveTab('personal')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'personal'
                            ? 'bg-white text-accent-blue shadow-lg shadow-accent-blue/5'
                            : 'text-text-muted hover:text-text-main'
                            }`}
                    >
                        <LucideUser size={14} /> {isAdmin ? 'Öğrenci Panoları' : 'Bireysel Alan'}
                    </button>
                    <button
                        onClick={() => setActiveTab('shared')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'shared'
                            ? 'bg-white text-accent-blue shadow-lg shadow-accent-blue/5'
                            : 'text-text-muted hover:text-text-main'
                            }`}
                    >
                        <LucideUsers size={14} /> Ortak Pano
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    {isAdmin && activeTab === 'personal' && (
                        <button
                            onClick={() => setIsParticipantDrawerOpen(!isParticipantDrawerOpen)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-blue/10 text-accent-blue border border-accent-blue/20 text-[10px] font-black uppercase tracking-widest hover:bg-accent-blue/20 transition-all"
                        >
                            <LucideUsers size={14} /> Katılımcılar ({participants.length})
                        </button>
                    )}

                    <div className="flex -space-x-3 items-center mr-2">
                        {participants.slice(0, 3).map((p, i) => (
                            <div key={p.id} className="w-9 h-9 rounded-full border-2 border-white bg-gradient-to-br from-accent-blue/20 to-accent-blue/5 flex items-center justify-center text-[10px] font-bold shadow-sm" title={p.name}>
                                {p.name?.charAt(0) || i + 1}
                            </div>
                        ))}
                    </div>
                    {activeTab === 'personal' ? (
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className={`p-3 rounded-2xl transition-all ${isSidebarOpen ? 'bg-accent-blue text-white shadow-lg shadow-accent-blue/20' : 'bg-surface-light text-text-muted hover:text-accent-blue'}`}
                            title="Kibele Hoca (AI)"
                        >
                            <LucideMessageSquare size={20} />
                        </button>
                    ) : (
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className={`p-3 rounded-2xl transition-all ${isSidebarOpen ? 'bg-accent-blue text-white shadow-lg shadow-accent-blue/20' : 'bg-surface-light text-text-muted hover:text-accent-blue'}`}
                            title="Derinlikli Kürasyon"
                        >
                            <LucideSparkles size={20} />
                        </button>
                    )}
                </div>
            </nav>

            {/* Admin Participant Drawer */}
            {isAdmin && isParticipantDrawerOpen && (
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
                    {activeTab === 'personal' ? (
                        <RoomDetailView
                            room={room}
                            isSidebarOpen={isSidebarOpen}
                            onSidebarToggle={() => setIsSidebarOpen(!isSidebarOpen)}
                            targetUserId={selectedParticipantId}
                        />
                    ) : (
                        <SharedBoardView
                            room={room}
                            isSidebarOpen={isSidebarOpen}
                            onSidebarToggle={() => setIsSidebarOpen(!isSidebarOpen)}
                        />
                    )}
                </main>
            </div>
        </div>
    );
};

export default InspirationWorkspace;
