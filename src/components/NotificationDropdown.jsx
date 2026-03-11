import React, { useState, useRef, useEffect } from 'react';
import { LucideBell, LucideCheck, LucideExternalLink, LucideCircle } from 'lucide-react';
import { subscribeToNotifications, markNotificationAsRead, clearAllNotifications } from '../services/dbService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import RequestActionModal from './RequestActionModal';

const NotificationDropdown = ({ onRequestClick }) => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [lastNotifId, setLastNotifId] = useState(null);
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (!user) return;
        const unsubscribe = subscribeToNotifications(user.uid, (newNotifs) => {
            setNotifications(newNotifs);

            // Gerçek zamanlı Toast bildirimi
            const unread = newNotifs.filter(n => !n.read);
            if (unread.length > 0) {
                const latest = unread[0];
                if (latest.id !== lastNotifId) {
                    showToast(latest.message);
                    setLastNotifId(latest.id);
                }
            }
        });
        return () => unsubscribe();
    }, [user, lastNotifId, showToast]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    const handleNotificationClick = async (notif) => {
        if (!notif.read) {
            await markNotificationAsRead(notif.id);
        }

        if (notif.type === 'room_request' && notif.relatedId && onRequestClick) {
            onRequestClick(notif.relatedId);
        }

        setIsOpen(false);
    };

    const handleClearAll = async () => {
        if (notifications.length === 0) return;
        try {
            await clearAllNotifications(user.uid);
            showToast("Tüm bildirimler temizlendi canım! 🧹");
            setIsOpen(false);
        } catch (error) {
            showToast("Bildirimler temizlenirken bir hata oluştu.", "error");
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2.5 bg-surface-light hover:bg-white rounded-full transition-all relative group shadow-sm border border-border-light"
            >
                <LucideBell size={20} className={unreadCount > 0 ? 'text-accent-blue' : 'text-text-muted'} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-4 w-80 bg-white rounded-3xl shadow-2xl border border-border-light overflow-hidden z-[110] animate-in slide-in-from-top-2 duration-200">
                    <div className="p-5 border-b border-border-light flex items-center justify-between bg-surface-light/50">
                        <h3 className="font-display font-bold">Bildirimler</h3>
                        <span className="text-[10px] font-bold text-accent-blue bg-accent-blue/10 px-2 py-1 rounded-full">{unreadCount} Okunmamış</span>
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length > 0 ? notifications.map((notif) => (
                            <div
                                key={notif.id}
                                onClick={() => handleNotificationClick(notif)}
                                className={`p-4 border-b border-border-light hover:bg-surface-light transition-all cursor-pointer relative group ${!notif.read ? 'bg-accent-blue/[0.02]' : ''}`}
                            >
                                {!notif.read && <LucideCircle size={8} className="absolute left-2 top-1/2 -translate-y-1/2 text-accent-blue fill-accent-blue" />}
                                <div className="pl-4">
                                    <h4 className={`text-sm mb-1 ${!notif.read ? 'font-bold' : 'font-medium'}`}>{notif.title}</h4>
                                    <p className="text-xs text-text-muted line-clamp-2 leading-relaxed">{notif.message}</p>
                                    <span className="text-[10px] text-text-muted/60 mt-2 block">
                                        {notif.createdAt?.toDate().toLocaleDateString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <LucideExternalLink size={14} className="text-accent-blue" />
                                </div>
                            </div>
                        )) : (
                            <div className="p-12 text-center text-text-muted">
                                <LucideBell size={32} className="mx-auto mb-3 opacity-20" />
                                <p className="text-sm">Henüz bir bildirim yok canım. ✨</p>
                            </div>
                        )}
                    </div>

                    {notifications.length > 0 && (
                        <div className="p-4 flex items-center justify-between bg-surface-light/30 gap-4 border-t border-border-light">
                            <button className="text-[10px] font-bold text-text-muted hover:text-accent-blue transition-colors uppercase tracking-widest">
                                Tümünü Gör
                            </button>
                            <button
                                onClick={handleClearAll}
                                className="text-[10px] font-bold text-red-500/60 hover:text-red-500 transition-colors uppercase tracking-widest"
                            >
                                Bildirimleri Temizle
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationDropdown;
