import React, { useState, useEffect } from 'react';
import { LucideHistory, LucideClock, LucideMessageCircle, LucideImage, LucideSparkles, LucidePencil, LucideUserPlus, LucideUserMinus, LucideDoorOpen, LucideAward, LucideLink, LucideCheckCircle, LucideSettings } from 'lucide-react';
import { subscribeToRoomItems } from '../../services/dbService';
import { db } from '../../firebase';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';

const AuditTrailView = ({ roomId, userId }) => {
    const [auditItems, setAuditItems] = useState([]);

    useEffect(() => {
        if (!roomId) return;

        // 1. Legacy Room Items (Grid based)
        const unsubscribeItems = subscribeToRoomItems(roomId, 'personal', userId, (data) => {
            updateMergedItems(data, 'item');
        });

        // 2. Room Activity Collection (System Logs + Canvas Activity)
        const activityCol = collection(db, 'rooms', roomId, 'activity');
        const q = query(activityCol, orderBy('timestamp', 'asc'));
        const unsubscribeActivity = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            updateMergedItems(data, 'activity');
        });

        // State merging and grouping helper
        const itemsMap = new Map();
        const updateMergedItems = (newData, source) => {
            newData.forEach(item => {
                itemsMap.set(item.id, { ...item, source });
            });

            const merged = Array.from(itemsMap.values()).sort((a, b) => {
                const dateA = (a.createdAt || a.timestamp)?.toDate ? (a.createdAt || a.timestamp).toDate() : new Date(a.createdAt || a.timestamp);
                const dateB = (b.createdAt || b.timestamp)?.toDate ? (b.createdAt || b.timestamp).toDate() : new Date(b.createdAt || b.timestamp);
                return dateB - dateA; // Newest first
            });

            // Grouping logic: Group consecutive activities by same user within 15 mins (only for canvas)
            const grouped = [];
            merged.forEach((item, idx) => {
                const prev = grouped[grouped.length - 1];
                const itemDate = (item.createdAt || item.timestamp)?.toDate ? (item.createdAt || item.timestamp).toDate() : new Date(item.createdAt || item.timestamp);
                const prevDate = prev ? ((prev.createdAt || prev.timestamp)?.toDate ? (prev.createdAt || prev.timestamp).toDate() : new Date(prev.createdAt || prev.timestamp)) : null;

                const isSameUser = prev && (prev.userId === item.userId || prev.authorName === item.authorName);
                const isRecent = prevDate && (Math.abs(itemDate - prevDate) < 15 * 60 * 1000); // 15 mins
                const isCanvas = item.type === 'canvas_activity';
                const isSameType = prev && prev.type === item.type && isCanvas;

                if (isSameUser && isRecent && isSameType) {
                    if (!prev.activities) prev.activities = [prev.detail || prev.content];
                    prev.activities.push(item.detail || item.content);
                    prev.timestamp = item.timestamp;
                } else {
                    grouped.push({ ...item });
                }
            });

            setAuditItems(grouped);
        };

        return () => {
            unsubscribeItems();
            unsubscribeActivity();
        };
    }, [roomId, userId]);

    const formatDate = (timestamp) => {
        if (!timestamp) return '...';
        const date = timestamp?.toDate ? timestamp.toDate() : (timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp));
        return date.toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    const getLogIcon = (type) => {
        switch (type) {
            case 'image': return <LucideImage size={14} className="text-accent-blue" />;
            case 'note': return <LucideMessageCircle size={14} className="text-accent-blue" />;
            case 'canvas_activity': return <LucidePencil size={14} className="text-accent-blue" />;
            case 'system_creation': return <LucideDoorOpen size={14} className="text-green-600" />;
            case 'system_join': return <LucideUserPlus size={14} className="text-green-600" />;
            case 'system_leave': return <LucideUserMinus size={14} className="text-red-500" />;
            case 'system_final_delivery': return <LucideAward size={14} className="text-orange-500" />;
            case 'system_curation': return <LucideSparkles size={14} className="text-accent-blue" />;
            case 'system_update': return <LucideSettings size={14} className="text-accent-blue" />;
            default: return <LucideSparkles size={14} className="text-accent-blue" />;
        }
    };

    const getLogLabel = (type) => {
        switch (type) {
            case 'image': return { text: 'Referans', color: 'text-blue-500' };
            case 'note': return { text: 'Fikir', color: 'text-orange-500' };
            case 'canvas_activity': return { text: 'Tuval', color: 'text-accent-blue' };
            case 'system_creation': return { text: 'Oluşturma', color: 'text-green-600' };
            case 'system_join': return { text: 'Katılım', color: 'text-green-600' };
            case 'system_leave': return { text: 'Ayrılma', color: 'text-red-500' };
            case 'system_final_delivery': return { text: 'Teslimat', color: 'text-orange-600' };
            case 'system_curation': return { text: 'Kürasyon', color: 'text-accent-blue' };
            case 'system_update': return { text: 'Ayarlar', color: 'text-accent-blue' };
            default: return { text: 'Etkinlik', color: 'text-gray-400' };
        }
    };

    return (
        <div className="h-full overflow-y-auto p-12 bg-white selection:bg-accent-blue selection:text-white scrollbar-hide">
            <div className="max-w-2xl mx-auto">
                <div className="mb-20">
                    <h2 className="text-3xl font-display font-medium text-text-main mb-2">Referans Tüneli.</h2>
                    <p className="text-text-muted text-xs italic tracking-tight">Odanın tüm gelişim süreci, en saf haliyle.</p>
                </div>

                <div className="relative border-l border-border-light/40 ml-2 pl-10 space-y-10 pb-32">
                    {auditItems.map((item, index) => {
                        const label = getLogLabel(item.type);
                        return (
                            <div key={item.id} className="relative group/item animate-in fade-in slide-in-from-left-2 duration-500" style={{ animationDelay: `${index * 30}ms` }}>
                                {/* Mini Dot */}
                                <div className={`absolute -left-[45px] top-1 w-2.5 h-2.5 rounded-full bg-white border border-border-light z-10 group-hover/item:scale-125 transition-transform ${
                                    item.type.startsWith('system') ? 'border-green-300' : 'border-accent-blue/30'}`} />

                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-text-main">{item.authorName || item.userName || 'Kullanıcı'}</span>
                                        <span className="text-[8px] font-black uppercase tracking-widest opacity-40">•</span>
                                        <span className={`text-[9px] font-bold uppercase tracking-wider ${label.color}`}>{label.text}</span>
                                        <span className="text-[9px] text-text-muted/40 font-medium ml-auto">{formatDate(item.createdAt || item.timestamp)}</span>
                                    </div>

                                    <div className="pl-4 border-l border-border-light/20">
                                        {item.type === 'image' ? (
                                            <div className="w-24 aspect-square rounded-lg overflow-hidden border border-border-light/40 opacity-80 hover:opacity-100 transition-opacity cursor-zoom-in">
                                                <img src={item.content} alt="Process step" className="w-full h-full object-cover" />
                                            </div>
                                        ) : item.type === 'canvas_activity' ? (
                                            <div className="space-y-1 px-4 py-2 bg-surface-light/30 rounded-lg">
                                                {item.activities ? [...new Set(item.activities)].map((act, i) => (
                                                    <p key={i} className="text-[11px] text-text-muted italic leading-relaxed">— {act}</p>
                                                )) : (
                                                    <p className="text-[11px] text-text-muted italic leading-relaxed">— {item.detail || 'Tuvalde fırça izleri bırakıldı.'}</p>
                                                )}
                                            </div>
                                        ) : item.type === 'system_final_delivery' ? (
                                            <div className="px-4 py-3 bg-orange-50/40 rounded-lg border border-orange-100/30">
                                                <p className="text-[11px] font-bold text-orange-800 leading-tight mb-0.5">
                                                    {item.revisionNumber ? `${item.revisionNumber}. Revize Teslim Edildi` : 'Proje Teslimatı Yapıldı'}
                                                </p>
                                                {item.content && item.content.startsWith('http') && (
                                                    <a href={item.content} target="_blank" rel="noreferrer" className="text-[9px] text-orange-600 hover:underline flex items-center gap-1">
                                                        Teslimatı Gör <LucideLink size={8} />
                                                    </a>
                                                )}
                                            </div>
                                        ) : item.type.startsWith('system') ? (
                                            <p className="text-[11px] italic font-medium text-text-main/70">{item.detail}</p>
                                        ) : (
                                            <div className="space-y-1">
                                                {/* Öğrenci notları ve başlıkları gizleniyor - sadece tip görünür */}
                                                <p className="text-[14px] font-serif italic text-text-main/40 leading-relaxed leading-snug">
                                                    {item.type === 'note' ? "Bir fikir/not paylaştı." : "Bir içerik ekledi."}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {auditItems.length === 0 && (
                        <div className="py-20 text-center text-text-muted/20 text-xs italic">
                            Henüz bir iz bırakılmamış...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuditTrailView;
