import React, { useState, useEffect } from 'react';
import { LucideChevronLeft, LucideUsers, LucideUser, LucideLayers, LucideSparkles, LucideMessageSquare } from 'lucide-react';
import RoomDetailView from './RoomDetailView';
import SharedBoardView from './SharedBoardView';
import { useAuth } from '../../context/AuthContext';

const InspirationWorkspace = ({ room, onBack }) => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('personal'); // 'personal' or 'shared'

    // UI states can be managed here to be shared between views if needed
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
                        </div>
                        <h1 className="text-lg font-display font-bold text-text-main italic -mt-0.5">Workspace</h1>
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
                        <LucideUser size={14} /> Bireysel Alan
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
                    <div className="flex -space-x-3 items-center mr-2">
                        {room?.participants?.slice(0, 3).map((pId, i) => (
                            <div key={pId} className="w-9 h-9 rounded-full border-2 border-white bg-gradient-to-br from-accent-blue/20 to-accent-blue/5 flex items-center justify-center text-[10px] font-bold shadow-sm">
                                {i + 1}
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

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">
                <main className="flex-1 overflow-hidden relative">
                    {activeTab === 'personal' ? (
                        <RoomDetailView
                            room={room}
                            isSidebarOpen={isSidebarOpen}
                            onSidebarToggle={() => setIsSidebarOpen(!isSidebarOpen)}
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
