import React, { useState, useEffect } from 'react';
import { LucideAward, LucideUpload, LucideImage, LucideCheckCircle, LucideX, LucideSparkles } from 'lucide-react';
import { subscribeToRoomItems, addRoomItem, deleteRoomItem } from '../../services/dbService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const FinalWorkView = ({ room, targetUserId }) => {
    const { user, isAdmin } = useAuth();
    const { showToast } = useToast();
    const [finalWork, setFinalWork] = useState(null);
    const [loading, setLoading] = useState(false);

    // Archive / Read-only logic also applies here
    const now = new Date();
    const deadlineDate = room?.deadline?.toDate ? room.deadline.toDate() : (room?.deadline ? new Date(room.deadline) : null);
    const isArchiveMode = room?.isActive === false || (deadlineDate && now > deadlineDate);

    useEffect(() => {
        if (!room?.id || !targetUserId) return;
        const unsubscribe = subscribeToRoomItems(room.id, 'final', targetUserId, (data) => {
            // Only one final work per student for now
            setFinalWork(data[0] || null);
        });
        return () => unsubscribe();
    }, [room?.id, targetUserId]);

    const handleUploadFinal = async () => {
        if (isArchiveMode) return;
        setLoading(true);
        // Mock image upload
        const mockUrl = "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=1200&auto=format&fit=crop";
        try {
            await addRoomItem(room.id, targetUserId, {
                type: 'image',
                content: mockUrl,
                title: 'Final Teslimatı',
                boardType: 'final',
                authorName: user.name || user.displayName || user.email.split('@')[0]
            });
            showToast("Final işin başarıyla yüklendi canım! Gurur duyuyoruz. 🎓✨");
        } catch (error) {
            showToast("Yükleme sırasında hata oluştu.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteFinal = async () => {
        if (isArchiveMode) return;
        if (!finalWork) return;
        try {
            await deleteRoomItem(finalWork.id);
            showToast("Teslimat geri çekildi.");
        } catch (error) {
            showToast("Hata oluştu.");
        }
    };

    return (
        <div className="h-full overflow-y-auto p-12 bg-white selection:bg-accent-blue selection:text-white scrollbar-hide">
            <div className="max-w-4xl mx-auto">
                <div className="mb-16 text-center">
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 rounded-[2rem] bg-accent-blue/10 flex items-center justify-center text-accent-blue shadow-xl shadow-accent-blue/5">
                            <LucideAward size={40} />
                        </div>
                    </div>
                    <h2 className="text-5xl font-display font-bold italic text-text-main mb-4 leading-tight">Final Teslimatı.</h2>
                    <p className="text-text-muted italic max-w-xl mx-auto">2 haftalık emeğinin en saf hali. Buraya yükleyeceğin iş, senin final imzan olacak canım. 🎓✨</p>
                </div>

                {finalWork ? (
                    <div className="relative group animate-in zoom-in-95 duration-700">
                        <div className="rounded-[3rem] overflow-hidden border border-border-light/40 shadow-2xl bg-white aspect-[4/3] relative">
                            <img src={finalWork.content} alt="Final Project" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2s]" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-12">
                                <div className="flex items-center gap-3 mb-2">
                                    <LucideCheckCircle className="text-green-400" size={24} />
                                    <span className="text-white font-black uppercase tracking-[0.2em] text-sm">Teslim Edildi</span>
                                </div>
                                <p className="text-white/60 text-xs italic">Son Güncelleme: {finalWork.createdAt?.toDate ? finalWork.createdAt.toDate().toLocaleString('tr-TR') : 'Yeni'}</p>
                            </div>

                            {!isArchiveMode && (user?.uid === targetUserId || isAdmin) && (
                                <button
                                    onClick={handleDeleteFinal}
                                    className="absolute top-8 right-8 p-4 bg-white/10 backdrop-blur-md text-white rounded-2xl hover:bg-red-500 transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <LucideX size={24} />
                                </button>
                            )}
                        </div>

                        <div className="mt-12 flex items-center justify-center gap-6">
                            <div className="h-px flex-1 bg-border-light/40"></div>
                            <LucideSparkles className="text-accent-blue/30" />
                            <div className="h-px flex-1 bg-border-light/40"></div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-surface-light border-2 border-dashed border-border-light/60 rounded-[3rem] p-24 text-center flex flex-col items-center justify-center group hover:border-accent-blue/40 transition-all duration-700">
                        <div className="w-20 h-20 rounded-full bg-white shadow-xl flex items-center justify-center text-text-muted mb-8 group-hover:scale-110 transition-transform">
                            <LucideUpload size={32} />
                        </div>
                        <h3 className="text-2xl font-display font-bold text-text-main mb-2">Henüz Teslimat Yapılmadı</h3>
                        <p className="text-text-muted italic mb-10 max-w-sm">Dönem sonu projesini veya final çalışmanı buradan yükleyebilirsin.</p>

                        {!isArchiveMode && (user?.uid === targetUserId || isAdmin) ? (
                            <button
                                onClick={handleUploadFinal}
                                disabled={loading}
                                className="px-12 py-5 bg-text-main text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-accent-blue transition-all shadow-xl shadow-accent-blue/10 disabled:opacity-50"
                            >
                                {loading ? 'Yükleniyor...' : 'Çalışmayı Teslim Et'}
                            </button>
                        ) : isArchiveMode ? (
                            <div className="px-12 py-5 bg-red-50 text-red-500 rounded-2xl font-bold italic text-sm flex items-center gap-2">
                                <LucideX size={18} /> Süre Doldu / Teslimatlar Kapandı
                            </div>
                        ) : (
                            <p className="text-xs text-text-muted italic">Teslimat yetkin bulunmuyor canım.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FinalWorkView;
