import React, { useState } from 'react';
import { LucideX, LucideSparkles } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const EarlyAccessModal = ({ isOpen, onClose }) => {
    const [formData, setFormData] = useState({
        username: '',
        name: '',
        email: '',
        password: '',
        intro: ''
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await addDoc(collection(db, "access_requests"), {
                ...formData,
                status: "pending",
                createdAt: serverTimestamp()
            });
            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setFormData({ name: '', email: '', password: '', intro: '' });
            }, 3000);
        } catch (error) {
            console.error("Error sending request:", error);
        }
        setLoading(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-text-main/20 backdrop-blur-xl">
            <div className="glass-card w-full max-w-lg p-10 relative overflow-hidden">
                <button onClick={onClose} className="absolute top-6 right-6 text-text-muted hover:text-text-main transition-colors">
                    <LucideX size={24} />
                </button>

                {success ? (
                    <div className="text-center py-10 animate-in fade-in zoom-in duration-500">
                        <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">✓</div>
                        <h3 className="text-2xl font-serif mb-2">Başvurun Kibele Hoca'ya İletildi!</h3>
                        <p className="text-text-muted">Bu bir kayıt formu değil, erişim talebidir canım. Kibele Hoca seni onaylayıp sisteme eklediğinde giriş yapabileceksin. Beklemede kal "it is okey".</p>
                    </div>
                ) : (
                    <>
                        <div className="mb-8">
                            <h2 className="text-3xl font-serif mb-2">Erken Erişim</h2>
                            <p className="text-sm text-text-muted italic">Kibele ile diyaloğa girmek için ilk adımı at, it is okey.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest text-text-muted mb-2 ml-1">Kullanıcı Adı</label>
                                <input
                                    required
                                    className="w-full bg-surface-light border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-accent-blue outline-none transition-all"
                                    placeholder="kibele_canim"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] uppercase tracking-widest text-text-muted mb-2 ml-1">İsim Soyisim</label>
                                    <input
                                        required
                                        className="w-full bg-surface-light border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-accent-blue outline-none transition-all"
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
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest text-text-muted mb-2 ml-1">Şifre Belirle</label>
                                <input
                                    required
                                    type="password"
                                    className="w-full bg-surface-light border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-accent-blue outline-none transition-all"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest text-text-muted mb-2 ml-1">Kibele Hocaya Kendini Tanıt</label>
                                <textarea
                                    required
                                    rows={3}
                                    className="w-full bg-surface-light border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-accent-blue outline-none transition-all resize-none"
                                    placeholder="Nelerle ilgilenirsin canım? Sanat senin için ne ifade eder?"
                                    value={formData.intro}
                                    onChange={(e) => setFormData({ ...formData, intro: e.target.value })}
                                />
                            </div>
                            <button
                                disabled={loading}
                                className="w-full btn-primary py-5 rounded-[1.5rem] flex items-center justify-center gap-2 group"
                            >
                                {loading ? "Gönderiliyor..." : (
                                    <>
                                        Talebi Gönder <LucideSparkles size={18} className="group-hover:rotate-12 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};

export default EarlyAccessModal;
