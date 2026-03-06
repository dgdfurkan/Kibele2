import React from 'react';
import { LucideLock, LucideChevronRight, LucideClock, LucideArrowRight } from 'lucide-react';

const RoomRequestView = ({ room, onBack, onRequestAccess, isPending }) => {
    return (
        <div className="min-h-screen bg-[#FDF5F2] dark:bg-[#121212] pt-32 pb-16 px-4 flex flex-col items-center justify-center animate-in fade-in duration-700">
            {/* Breadcrumbs */}
            <div className="w-full max-w-3xl mb-8 flex items-center text-sm text-gray-500 dark:text-gray-400 font-medium">
                <button onClick={onBack} className="hover:text-dark dark:hover:text-white transition-colors">Kibele.</button>
                <LucideChevronRight size={14} className="mx-2" />
                <button onClick={onBack} className="hover:text-dark dark:hover:text-white transition-colors">İlham Odaları</button>
                <LucideChevronRight size={14} className="mx-2" />
                <span className="text-text-main dark:text-white">{room?.name || 'Oda Detayı'}</span>
            </div>

            {/* Request Card */}
            <div className="w-full max-w-3xl glass-card rounded-3xl p-10 md:p-14 shadow-xl flex flex-col items-center text-center relative overflow-hidden bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/40 dark:border-white/10">
                {/* Decorative Blurs */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent-blue rounded-full mix-blend-multiply filter blur-3xl opacity-20 transform translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-soft-peach rounded-full mix-blend-multiply filter blur-3xl opacity-20 transform -translate-x-1/2 translate-y-1/2"></div>

                {/* Icon */}
                <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-full bg-yellow-50 dark:bg-yellow-900/30 text-yellow-500 mb-6 shadow-inner">
                    <LucideLock size={36} />
                </div>

                <h1 className="font-serif text-4xl md:text-5xl font-semibold text-text-main dark:text-white mb-4">
                    {room?.name || 'VCD141. Asg1'}
                </h1>
                <p className="text-lg text-text-muted dark:text-gray-300 mb-6">
                    {room?.description || 'Kitap Tasarımı Ödevi - Book Design Assignment'}
                </p>

                {/* Status Bar */}
                <div className="flex items-center space-x-4 mb-10">
                    <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-sm font-medium border border-green-200 dark:border-green-800">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        <span>Aktif</span>
                    </div>
                    <div className="flex items-center text-sm text-text-muted dark:text-gray-400">
                        <LucideClock size={16} className="mr-1.5" />
                        <span>Teslim: 24 Mayıs 2024</span>
                    </div>
                </div>

                {/* Action Section */}
                {!isPending ? (
                    <div className="w-full max-w-md flex flex-col space-y-4">
                        <p className="text-sm text-text-muted dark:text-gray-400 px-6">
                            Bu ilham odasına erişim sağlamak için eğitmeninizin onayına ihtiyacınız var.
                        </p>
                        <button
                            onClick={onRequestAccess}
                            className="bg-accent-blue hover:bg-opacity-90 text-white font-medium py-4 px-8 rounded-2xl transition-all shadow-lg hover:shadow-accent-blue/20 flex items-center justify-center space-x-2 group"
                        >
                            <span>İlham Odasına Katılma İsteği Gönder</span>
                            <LucideArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                ) : (
                    <div className="w-full max-w-md mx-auto mt-4">
                        <div className="w-full bg-gray-100 dark:bg-zinc-800 text-text-muted dark:text-gray-400 font-medium py-4 px-8 rounded-2xl flex items-center justify-center space-x-3 border border-gray-200 dark:border-zinc-700">
                            <div className="animate-spin h-5 w-5 border-2 border-accent-blue border-t-transparent rounded-full"></div>
                            <span>İstek Beklemede</span>
                        </div>
                        <p className="text-xs text-center text-text-muted mt-4 italic">
                            Eğitmeniniz isteğinizi değerlendiriyor. Onaylandığında bildirim alacaksınız canım.
                        </p>
                    </div>
                )}

                <div className="w-full h-px bg-gray-200 dark:bg-zinc-800 my-10"></div>

                <p className="text-[10px] uppercase tracking-widest text-text-muted/50 font-semibold">
                    Kibele Education Design System
                </p>
            </div>
        </div>
    );
};

export default RoomRequestView;
