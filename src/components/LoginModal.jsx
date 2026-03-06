import React, { useState } from 'react';
import { LucideX, LucideLogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const LoginModal = ({ isOpen, onClose }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { loginWithEmail } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await loginWithEmail(email, password);
            onClose();
        } catch (err) {
            setError(err.message || 'Giriş yapılamadı.');
        }
        setLoading(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-text-main/20 backdrop-blur-xl">
            <div className="glass-card w-full max-w-md p-10 relative">
                <button onClick={onClose} className="absolute top-6 right-6 text-text-muted hover:text-text-main transition-colors">
                    <LucideX size={24} />
                </button>

                <div className="mb-8">
                    <h2 className="text-3xl font-serif mb-2">Giriş Yap</h2>
                    <p className="text-sm text-text-muted italic">Kaldığın yerden devam et, it is okey.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-[10px] uppercase tracking-widest text-text-muted mb-2 ml-1">E-posta</label>
                        <input
                            required
                            type="email"
                            className="w-full bg-surface-light border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-accent-blue outline-none transition-all"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase tracking-widest text-text-muted mb-2 ml-1">Şifre</label>
                        <input
                            required
                            type="password"
                            className="w-full bg-surface-light border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-accent-blue outline-none transition-all"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    {error && <p className="text-red-500 text-xs ml-1">{error}</p>}

                    <button
                        disabled={loading}
                        className="w-full btn-primary py-5 rounded-[1.5rem] flex items-center justify-center gap-2"
                    >
                        {loading ? "Giriş Yapılıyor..." : (
                            <>
                                Giriş Yap <LucideLogIn size={18} />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginModal;
