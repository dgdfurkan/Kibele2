import React, { useState, useEffect } from 'react';
import { LucideX, LucideUserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const RegisterModal = ({ isOpen, onClose }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { register } = useAuth();

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await register(formData.email, formData.password, formData.name);
            onClose();
            setFormData({ name: '', email: '', password: '' });
        } catch (err) {
            setError(err.message || "Kayıt sırasında bir hata oluştu.");
        }
        setLoading(false);
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-text-main/20 backdrop-blur-xl cursor-pointer"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="glass-card w-full max-w-lg p-10 relative overflow-hidden cursor-default shadow-2xl">
                <button onClick={onClose} className="absolute top-6 right-6 text-text-muted hover:text-text-main transition-colors">
                    <LucideX size={24} />
                </button>

                <div className="mb-10">
                    <h2 className="text-4xl font-serif mb-2">Aramıza Katıl</h2>
                    <p className="text-sm text-text-muted italic">Kibele ekosistemine dahil ol, yaratıcılığı paylaş.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-[10px] uppercase tracking-widest text-text-muted mb-2 ml-1">İsim Soyisim</label>
                        <input
                            required
                            className="w-full bg-surface-light border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-accent-blue outline-none transition-all"
                            placeholder="Zeynep Sanatçı"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase tracking-widest text-text-muted mb-2 ml-1">E-Posta</label>
                        <input
                            required
                            type="email"
                            className="w-full bg-surface-light border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-accent-blue outline-none transition-all"
                            placeholder="e-posta@adresiniz.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase tracking-widest text-text-muted mb-2 ml-1">Şifre Belirle</label>
                        <input
                            required
                            type="password"
                            minLength={6}
                            className="w-full bg-surface-light border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-accent-blue outline-none transition-all"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>

                    {error && <p className="text-red-500 text-xs ml-1 bg-red-50 p-3 rounded-xl">{error}</p>}

                    <button
                        disabled={loading}
                        className="w-full btn-primary py-5 rounded-[1.5rem] flex items-center justify-center gap-2 group shadow-xl shadow-accent-blue/20"
                    >
                        {loading ? "Hesabın Oluşturuluyor..." : (
                            <>
                                Kayıt Ol ve Başla <LucideUserPlus size={18} className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default RegisterModal;
