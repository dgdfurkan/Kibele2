import React, { useState, useEffect } from 'react';
import { LucideHistory, LucideClock, LucideMessageCircle, LucideImage, LucideSparkles, LucidePencil, LucideUserPlus, LucideUserMinus, LucideDoorOpen, LucideAward, LucideLink } from 'lucide-react';
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
                return dateB - dateA; // Newest first for activity feed feel
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
        const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000 || timestamp);
        return date.toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
    };

    const getLogIcon = (type) => {
        switch (type) {
            case 'image': return <LucideImage size={18} className="text-accent-blue" />;
            case 'note': return <LucideMessageCircle size={18} className="text-accent-blue" />;
            case 'canvas_activity': return <LucidePencil size={18} className="text-accent-blue" />;
            case 'system_creation': return <LucideDoorOpen size={18} className="text-green-600" />;
            case 'system_join': return <LucideUserPlus size={18} className="text-green-600" />;
            case 'system_leave': return <LucideUserMinus size={18} className="text-red-500" />;
            case 'system_final_delivery': return <LucideAward size={18} className="text-orange-500" />;
            case 'system_curation': return <LucideSparkles size={18} className="text-accent-blue" />;
            default: return <LucideSparkles size={18} className="text-accent-blue" />;
        }
    };

    const getLogLabel = (type) => {
        switch (type) {
            case 'image': return { text: 'Görsel Referans', color: 'bg-blue-50 text-blue-600' };
            case 'note': return { text: 'Fikir/Not', color: 'bg-orange-50 text-orange-600' };
            case 'canvas_activity': return { text: 'Tuval Güncellemesi', color: 'bg-accent-blue/10 text-accent-blue' };
            case 'system_creation': return { text: 'Oda Kurulumu', color: 'bg-green-50 text-green-600' };
            case 'system_join': return { text: 'Yeni Katılım', color: 'bg-green-50 text-green-600' };
            case 'system_leave': return { text: 'Ayrılık', color: 'bg-red-50 text-red-600' };
            case 'system_final_delivery': return { text: 'Final Teslimatı', color: 'bg-orange-100 text-orange-700' };
            case 'system_curation': return { text: 'Kürasyona Ekleme', color: 'bg-accent-blue/5 text-accent-blue' };
            default: return { text: 'Etkinlik', color: 'bg-gray-100 text-gray-600' };
        }
    };

    return (
        <div className="h-full overflow-y-auto p-12 bg-[#FDFBF7] selection:bg-accent-blue selection:text-white scrollbar-hide">
            <div className="max-w-3xl mx-auto">
                <div className="mb-16">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="px-4 py-1.5 bg-accent-blue/5 text-accent-blue rounded-full border border-accent-blue/10 flex items-center gap-2">
                            <LucideHistory size={14} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Süreç Logları (Audit Trail)</span>
                        </div>
                    </div>
                    <h2 className="text-4xl font-display font-bold italic text-text-main mb-4 leading-tight">Referans Tüneli.</h2>
                    <p className="text-text-muted italic text-sm">Odanın ilk nefesinden, tuvaldeki son fırça darbesine ve final teslimatına kadar tüm yolculuk. ✨</p>
                </div>

                <div className="relative border-l-2 border-border-light/40 ml-4 pl-12 space-y-12 pb-32">
                    {auditItems.map((item, index) => {
                        const labelStyle = getLogLabel(item.type);
                        return (
                            <div key={item.id} className="relative animate-in slide-in-from-left-4 duration-500" style={{ animationDelay: `${index * 50}ms` }}>
                                {/* Dot */}
                                <div className={`absolute -left-[58px] top-0 w-10 h-10 rounded-2xl bg-white border-2 flex items-center justify-center shadow-lg z-10 transition-transform hover:scale-110 ${
                                    item.type.startsWith('system') ? 'border-green-200 shadow-green-100' : 'border-accent-blue shadow-accent-blue/10'}`}>
                                    {getLogIcon(item.type)}
                                </div>

                                <div className="bg-white rounded-[2rem] p-8 border border-border-light/30 shadow-sm hover:shadow-xl transition-all duration-500 group relative overflow-hidden">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-text-main">{item.authorName || item.userName || 'Kullanıcı'}</span>
                                            <div className="w-1 h-1 rounded-full bg-text-muted/30"></div>
                                            <span className="text-[10px] font-bold text-text-muted flex items-center gap-1">
                                                <LucideClock size={10} /> {formatDate(item.createdAt || item.timestamp)}
                                            </span>
                                        </div>
                                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${labelStyle.color}`}>
                                            {labelStyle.text}
                                        </span>
                                    </div>

                                    {item.type === 'image' ? (
                                        <div className="rounded-2xl overflow-hidden border border-border-light/20 aspect-video mb-4">
                                            <img src={item.content} alt="Process step" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                        </div>
                                    ) : item.type === 'canvas_activity' ? (
                                        <div className="bg-surface-light/30 p-4 rounded-xl border border-border-light/20">
                                            <div className="flex items-center gap-4 mb-3">
                                                <LucideSparkles size={20} className="text-accent-blue animate-pulse" />
                                                <p className="text-sm font-bold text-text-main">Tuval üzerinde {item.activities?.length || 1} işlem gerçekleştirdi:</p>
                                            </div>
                                            <ul className="space-y-2 ml-9">
                                                {item.activities ? [...new Set(item.activities)].map((act, i) => (
                                                    <li key={i} className="text-xs text-text-muted list-disc italic">{act}</li>
                                                )) : (
                                                    <li className="text-xs text-text-muted list-disc italic">{item.detail || 'Sonsuz tuvalde değişiklikler yapıldı. ✨'}</li>
                                                )}
                                            </ul>
                                        </div>
                                    ) : item.type === 'system_final_delivery' ? (
                                        <div className="flex items-center gap-4 bg-orange-50/50 p-6 rounded-2xl border border-orange-100">
                                            <div className="p-3 bg-white rounded-xl shadow-sm text-orange-500">
                                                <LucideAward size={24} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-orange-800 leading-tight mb-1">{item.detail}</p>
                                                <p className="text-[10px] text-orange-600 font-medium italic">Giriş başarıyla kaydedildi ve arşivlendi. ✨</p>
                                            </div>
                                        </div>
                                    ) : item.type.startsWith('system') ? (
                                        <div className="bg-green-50/30 p-4 rounded-xl border border-green-100/50 flex items-center gap-3">
                                            <LucideCheckCircle size={16} className="text-green-500" />
                                            <p className="text-sm italic font-medium text-green-800">{item.detail}</p>
                                        </div>
                                    ) : (
                                        <p className="font-serif italic text-xl text-text-main leading-relaxed mb-4">"{item.content}"</p>
                                    )}

                                    <p className="text-[10px] text-text-muted italic opacity-60 mt-4">#{index + 1} nolu süreç kaydı</p>
                                </div>
                            </div>
                        );
                    })}

                    {auditItems.length === 0 && (
                        <div className="py-20 text-center text-text-muted/40 italic">
                            Henüz kayıtlı bir süreç verisi yok canım.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuditTrailView;
