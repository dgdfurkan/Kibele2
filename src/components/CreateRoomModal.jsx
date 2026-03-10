import React, { useState } from 'react';
import { LucideX, LucideLock, LucideUnlock, LucideSparkles } from 'lucide-react';
import { createRoom } from '../services/dbService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const CreateRoomModal = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsSubmitting(true);
        try {
            await createRoom(name, user.uid, isPrivate, "", description);
            onClose();
            setName('');
            setDescription('');
            setIsPrivate(false);
            showToast("İlham odan başarıyla kuruldu canım! Artık hazırsın. ✨");
        } catch (error) {
            console.error("Error creating room:", error);
            showToast("Oda oluşturulurken bir hata oluştu.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                <div className="p-8">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-accent-blue/10 text-accent-blue rounded-xl">
                                <LucideSparkles size={24} />
                            </div>
                            <h2 className="text-2xl font-display font-semibold">Yeni İlham Odası</h2>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <LucideX size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-text-main mb-2">Oda İsmi</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Örn: VCD141. Kitap Tasarımı"
                                className="w-full px-4 py-3 rounded-xl border border-border-light focus:ring-2 focus:ring-accent-blue/20 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-main mb-2">Açıklama</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Bu odada ne üzerine ilham toplayacaksın?"
                                rows="3"
                                className="w-full px-4 py-3 rounded-xl border border-border-light focus:ring-2 focus:ring-accent-blue/20 outline-none resize-none"
                            />
                        </div>

                        <div className="bg-gray-50 p-4 rounded-2xl flex items-center justify-between border border-border-light">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${isPrivate ? 'bg-accent-blue/10 text-accent-blue' : 'bg-green-100 text-green-600'}`}>
                                    {isPrivate ? <LucideLock size={18} /> : <LucideUnlock size={18} />}
                                </div>
                                <div>
                                    <div className="text-sm font-semibold">{isPrivate ? 'Özel Oda' : 'Açık Oda'}</div>
                                    <div className="text-xs text-text-muted">
                                        {isPrivate ? 'Sadece onayladığın kişiler girebilir.' : 'Başkaları da seni keşfedebilir.'}
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsPrivate(!isPrivate)}
                                className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${isPrivate ? 'bg-accent-blue' : 'bg-gray-300'}`}
                            >
                                <div className={`bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-300 ${isPrivate ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-accent-blue text-white py-4 rounded-2xl font-semibold hover:bg-opacity-90 transition-all shadow-lg shadow-accent-blue/20 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Oda Kuruluyor...' : 'Oda Kurmayı Başlat'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateRoomModal;
