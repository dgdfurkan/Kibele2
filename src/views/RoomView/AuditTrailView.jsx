import React, { useState, useEffect } from 'react';
import { LucideHistory, LucideClock, LucideMessageCircle, LucideImage, LucideSparkles, LucidePencil } from 'lucide-react';
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

        // 2. New Canvas Activity (tldraw based)
        const activityCol = collection(db, 'rooms', roomId, 'activity');
        const q = query(activityCol, orderBy('timestamp', 'asc'));
        const unsubscribeActivity = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'canvas_activity' }));
            updateMergedItems(data, 'activity');
        });

        // State merging helper
        const itemsMap = new Map();
        const updateMergedItems = (newData, source) => {
            newData.forEach(item => {
                itemsMap.set(item.id, { ...item, source });
            });

            const merged = Array.from(itemsMap.values()).sort((a, b) => {
                const dateA = (a.createdAt || a.timestamp)?.toDate ? (a.createdAt || a.timestamp).toDate() : new Date(a.createdAt || a.timestamp);
                const dateB = (b.createdAt || b.timestamp)?.toDate ? (b.createdAt || b.timestamp).toDate() : new Date(b.createdAt || b.timestamp);
                return dateA - dateB;
            });

            setAuditItems(merged);
        };

        return () => {
            unsubscribeItems();
            unsubscribeActivity();
        };
    }, [roomId, userId]);

    const formatDate = (timestamp) => {
        const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
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
                    <h2 className="text-4xl font-display font-bold italic text-text-main mb-4">Referans Tüneli.</h2>
                    <p className="text-text-muted italic text-sm">İlk ilhamdan tuvaldeki son fırça darbesine kadar tüm yaratıcı yolculuk. ✨</p>
                </div>

                <div className="relative border-l-2 border-border-light/40 ml-4 pl-12 space-y-16 pb-32">
                    {auditItems.map((item, index) => (
                        <div key={item.id} className="relative animate-in slide-in-from-left-4 duration-500" style={{ animationDelay: `${index * 50}ms` }}>
                            {/* Dot */}
                            <div className="absolute -left-[58px] top-0 w-10 h-10 rounded-2xl bg-white border-2 border-accent-blue flex items-center justify-center shadow-lg shadow-accent-blue/10 z-10 transition-transform hover:scale-110">
                                {item.type === 'image' ? <LucideImage size={18} className="text-accent-blue" /> :
                                    item.type === 'canvas_activity' ? <LucidePencil size={18} className="text-accent-blue" /> :
                                        <LucideMessageCircle size={18} className="text-accent-blue" />}
                            </div>

                            <div className="bg-white rounded-[2rem] p-8 border border-border-light/30 shadow-sm hover:shadow-xl transition-all duration-500 group relative overflow-hidden">
                                {item.type === 'canvas_activity' && (
                                    <div className="absolute top-0 left-0 w-1 h-full bg-accent-blue opacity-50"></div>
                                )}

                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-text-main">{item.authorName || item.userName || 'Kullanıcı'}</span>
                                        <div className="w-1 h-1 rounded-full bg-text-muted/30"></div>
                                        <span className="text-[10px] font-bold text-text-muted flex items-center gap-1">
                                            <LucideClock size={10} /> {formatDate(item.createdAt || item.timestamp)}
                                        </span>
                                    </div>
                                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${item.type === 'note' ? 'bg-orange-50 text-orange-600' :
                                            item.type === 'canvas_activity' ? 'bg-accent-blue/10 text-accent-blue' :
                                                'bg-blue-50 text-blue-600'}`}>
                                        {item.type === 'note' ? 'Fikir/Yorum' :
                                            item.type === 'canvas_activity' ? 'Tuval Güncellemesi' :
                                                'Görsel Referans'}
                                    </span>
                                </div>

                                {item.type === 'image' ? (
                                    <div className="rounded-2xl overflow-hidden border border-border-light/20 aspect-video mb-4">
                                        <img src={item.content} alt="Process step" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                    </div>
                                ) : item.type === 'canvas_activity' ? (
                                    <div className="flex items-center gap-4 bg-surface-light/30 p-4 rounded-xl border border-border-light/20">
                                        <LucideSparkles size={20} className="text-accent-blue animate-pulse" />
                                        <p className="text-sm font-medium text-text-main capitalize">Sonsuz tuvalde yeni ilhamlar oluşturuldu. ✨</p>
                                    </div>
                                ) : (
                                    <p className="font-serif italic text-xl text-text-main leading-relaxed mb-4">"{item.content}"</p>
                                )}

                                <p className="text-[10px] text-text-muted italic opacity-60">#{index + 1} nolu süreç kaydı</p>
                            </div>
                        </div>
                    ))}

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
