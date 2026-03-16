import React, { useState } from 'react';
import { LucideChevronDown, LucideSparkles, LucideCheck } from 'lucide-react';

const RoomSelector = ({ 
    userRooms = [], 
    selectedRoomId, 
    onSelectRoom, 
    currentRoomId,
    placeholder = "Oda Seçin",
    label = "Kürasyon Sekmesine Eklenir"
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectedRoom = userRooms.find(r => r.id === selectedRoomId);

    return (
        <div className="relative w-full">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between gap-3 bg-surface-light/50 hover:bg-surface-light border border-border-light/40 rounded-xl px-4 py-3 transition-all"
            >
                <div className="flex items-center gap-3 min-w-0 text-left">
                    <div className="w-8 h-8 rounded-lg bg-accent-blue/10 flex items-center justify-center shrink-0">
                        <LucideSparkles size={14} className="text-accent-blue" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-bold text-text-main truncate">
                            {selectedRoomId === currentRoomId 
                                ? 'Bu Odanın Kürasyonu' 
                                : selectedRoom?.name || placeholder}
                        </p>
                        <p className="text-[10px] text-text-muted truncate">{label}</p>
                    </div>
                </div>
                <LucideChevronDown size={16} className={`text-text-muted transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-2xl border border-border-light/40 shadow-2xl z-50 max-h-[280px] overflow-y-auto scrollbar-hide animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="p-2 space-y-1">
                        {/* Current room option if provided */}
                        {currentRoomId && (
                            <button
                                type="button"
                                onClick={() => { onSelectRoom(currentRoomId); setIsOpen(false); }}
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

                        {/* Divider if currentRoomId provided and there are other rooms */}
                        {currentRoomId && userRooms.length > 0 && (
                            <div className="px-3 py-1">
                                <div className="h-px bg-border-light/40"></div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-text-muted/50 mt-2 mb-1">Diğer Odalar</p>
                            </div>
                        )}

                        {/* Filtered list (exclude currentRoomId because it was already rendered above) */}
                        {userRooms.filter(r => r.id !== currentRoomId).map(room => (
                            <button
                                key={room.id}
                                type="button"
                                onClick={() => { onSelectRoom(room.id); setIsOpen(false); }}
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

                        {userRooms.length === 0 && !currentRoomId && (
                            <div className="p-4 text-center text-xs text-text-muted italic">
                                Katıldığınız oda bulunmuyor.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoomSelector;
