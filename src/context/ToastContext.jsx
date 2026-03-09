import React, { createContext, useContext, useState, useCallback } from 'react';
import { LucideCheckCircle, LucideXCircle, LucideInfo, LucideX } from 'lucide-react';

const ToastContext = createContext();

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within a ToastProvider');
    return context;
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = 'success') => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);

        setTimeout(() => {
            setToasts((prev) => prev.filter((toast) => toast.id !== id));
        }, 4000);
    }, []);

    const removeToast = (id) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`pointer-events-auto flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border glass-panel animate-in slide-in-from-right duration-300 ${toast.type === 'error' ? 'border-red-100 bg-red-50/90' : 'border-accent-blue/20 bg-white/90'
                            }`}
                    >
                        <div className={toast.type === 'error' ? 'text-red-500' : 'text-accent-blue'}>
                            {toast.type === 'error' ? <LucideXCircle size={20} /> : <LucideCheckCircle size={20} />}
                        </div>
                        <p className="text-sm font-medium text-text-main">{toast.message}</p>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="ml-2 p-1 hover:bg-black/5 rounded-full transition-colors text-text-muted"
                        >
                            <LucideX size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
