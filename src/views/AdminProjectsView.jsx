import React, { useState, useEffect } from 'react';
import { LucidePlus, LucideX, LucideEdit3, LucideTrash2, LucideExternalLink, LucideCalendar, LucideType, LucideLink2, LucideFileText, LucideChevronLeft, LucideSave } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { addAdminProject, subscribeToAdminProjects, updateAdminProject, deleteAdminProject } from '../services/dbService';

const AdminProjectsView = ({ onClose }) => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [projects, setProjects] = useState([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingProject, setEditingProject] = useState(null);
    const [loading, setLoading] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        date: '',
        fonts: '',
        notes: '',
        links: [{ label: '', url: '' }]
    });

    useEffect(() => {
        if (!user) return;
        const unsubscribe = subscribeToAdminProjects(user.uid, setProjects);
        return () => unsubscribe();
    }, [user]);

    const resetForm = () => {
        setFormData({ name: '', date: '', fonts: '', notes: '', links: [{ label: '', url: '' }] });
        setEditingProject(null);
        setIsFormOpen(false);
    };

    const openEditForm = (project) => {
        setFormData({
            name: project.name || '',
            date: project.date || '',
            fonts: project.fonts || '',
            notes: project.notes || '',
            links: project.links?.length > 0 ? project.links : [{ label: '', url: '' }]
        });
        setEditingProject(project);
        setIsFormOpen(true);
    };

    const handleAddLink = () => {
        setFormData(prev => ({ ...prev, links: [...prev.links, { label: '', url: '' }] }));
    };

    const handleUpdateLink = (index, field, value) => {
        setFormData(prev => {
            const newLinks = [...prev.links];
            newLinks[index] = { ...newLinks[index], [field]: value };
            return { ...prev, links: newLinks };
        });
    };

    const handleRemoveLink = (index) => {
        setFormData(prev => ({
            ...prev,
            links: prev.links.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            showToast("Proje adı gerekli.", "error");
            return;
        }
        setLoading(true);

        const cleanLinks = formData.links.filter(l => l.url.trim());
        const data = { ...formData, links: cleanLinks };

        try {
            if (editingProject) {
                await updateAdminProject(user.uid, editingProject.id, data);
                showToast("Proje güncellendi! ✨");
            } else {
                await addAdminProject(user.uid, data);
                showToast("Proje eklendi! 🎉");
            }
            resetForm();
        } catch (error) {
            showToast("Bir hata oluştu.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (projectId) => {
        try {
            await deleteAdminProject(user.uid, projectId);
            showToast("Proje silindi.");
        } catch (error) {
            showToast("Silme işlemi başarısız.", "error");
        }
    };

    const formatDate = (d) => {
        if (!d) return '';
        if (d.toDate) return d.toDate().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
        return new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    return (
        <div className="fixed inset-0 z-[200] bg-background/80 backdrop-blur-xl flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl border border-border-light/40 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-border-light/40 bg-surface-light/30 flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={onClose} className="p-2 -ml-2 hover:bg-white rounded-xl transition-all text-text-muted hover:text-text-main">
                            <LucideChevronLeft size={20} />
                        </button>
                        <div>
                            <h2 className="text-2xl font-display font-bold italic text-text-main">Projelerim</h2>
                            <p className="text-xs text-text-muted font-medium">Portföy & proje yönetimi</p>
                        </div>
                    </div>
                    <button
                        onClick={() => { resetForm(); setIsFormOpen(true); }}
                        className="flex items-center gap-2 bg-accent-blue hover:bg-accent-blue-hover text-white px-5 py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-accent-blue/20"
                    >
                        <LucidePlus size={16} /> Yeni Proje
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
                    {projects.length === 0 && !isFormOpen ? (
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                            <LucideFileText size={56} className="text-text-muted/20 mb-4" />
                            <p className="font-display text-lg italic text-text-muted mb-2">Henüz proje eklenmedi.</p>
                            <p className="text-sm text-text-muted/60">Portföyüne proje eklemek için "Yeni Proje" butonuna tıkla.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {projects.map(project => (
                                <div key={project.id} className="group bg-white border border-border-light/40 rounded-2xl p-6 hover:shadow-md transition-all">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-lg font-bold text-text-main mb-1">{project.name}</h3>
                                            <div className="flex flex-wrap gap-3 text-xs text-text-muted mb-3">
                                                {project.date && (
                                                    <span className="flex items-center gap-1">
                                                        <LucideCalendar size={12} /> {formatDate(project.date)}
                                                    </span>
                                                )}
                                                {project.fonts && (
                                                    <span className="flex items-center gap-1">
                                                        <LucideType size={12} /> {project.fonts}
                                                    </span>
                                                )}
                                            </div>
                                            {project.notes && (
                                                <p className="text-sm text-text-muted/80 leading-relaxed mb-3 line-clamp-3">{project.notes}</p>
                                            )}
                                            {project.links?.length > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    {project.links.map((link, i) => (
                                                        <a
                                                            key={i}
                                                            href={link.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent-blue/5 hover:bg-accent-blue/10 text-accent-blue rounded-lg text-xs font-bold transition-colors"
                                                        >
                                                            <LucideExternalLink size={12} /> {link.label || link.url}
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                            <button
                                                onClick={() => openEditForm(project)}
                                                className="p-2 hover:bg-surface-light rounded-lg transition-all text-text-muted hover:text-accent-blue"
                                                title="Düzenle"
                                            >
                                                <LucideEdit3 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(project.id)}
                                                className="p-2 hover:bg-red-50 rounded-lg transition-all text-text-muted hover:text-red-500"
                                                title="Sil"
                                            >
                                                <LucideTrash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Form Modal */}
                {isFormOpen && (
                    <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 flex flex-col overflow-hidden rounded-3xl">
                        <div className="flex items-center justify-between px-8 py-6 border-b border-border-light/40 bg-surface-light/30 flex-shrink-0">
                            <h3 className="text-xl font-display font-bold italic">{editingProject ? 'Projeyi Düzenle' : 'Yeni Proje Ekle'}</h3>
                            <button onClick={resetForm} className="p-2 hover:bg-white rounded-xl text-text-muted"><LucideX size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-5 scrollbar-hide">
                            {/* Project Name */}
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-text-muted/60 mb-2">Proje Adı *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-4 py-3 bg-surface-light/50 rounded-xl border border-border-light/40 outline-none text-sm focus:ring-2 focus:ring-accent-blue/20 focus:bg-white transition-all"
                                    placeholder="Örn: Kibele — Dijital Sanat Platformu"
                                    required
                                />
                            </div>

                            {/* Date */}
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-text-muted/60 mb-2">Tarih</label>
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                                    className="w-full px-4 py-3 bg-surface-light/50 rounded-xl border border-border-light/40 outline-none text-sm focus:ring-2 focus:ring-accent-blue/20 focus:bg-white transition-all"
                                />
                            </div>

                            {/* Fonts */}
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-text-muted/60 mb-2">Fontlar</label>
                                <input
                                    type="text"
                                    value={formData.fonts}
                                    onChange={(e) => setFormData(prev => ({ ...prev, fonts: e.target.value }))}
                                    className="w-full px-4 py-3 bg-surface-light/50 rounded-xl border border-border-light/40 outline-none text-sm focus:ring-2 focus:ring-accent-blue/20 focus:bg-white transition-all"
                                    placeholder="Örn: Inter, Playfair Display, Outfit"
                                />
                            </div>

                            {/* Links */}
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-text-muted/60 mb-2">Kaynak Linkleri</label>
                                <div className="space-y-2">
                                    {formData.links.map((link, i) => (
                                        <div key={i} className="flex gap-2 items-center">
                                            <input
                                                type="text"
                                                value={link.label}
                                                onChange={(e) => handleUpdateLink(i, 'label', e.target.value)}
                                                className="w-1/3 px-3 py-2.5 bg-surface-light/50 rounded-lg border border-border-light/40 outline-none text-sm focus:ring-2 focus:ring-accent-blue/20 focus:bg-white transition-all"
                                                placeholder="Etiket"
                                            />
                                            <input
                                                type="url"
                                                value={link.url}
                                                onChange={(e) => handleUpdateLink(i, 'url', e.target.value)}
                                                className="flex-1 px-3 py-2.5 bg-surface-light/50 rounded-lg border border-border-light/40 outline-none text-sm focus:ring-2 focus:ring-accent-blue/20 focus:bg-white transition-all"
                                                placeholder="https://..."
                                            />
                                            {formData.links.length > 1 && (
                                                <button type="button" onClick={() => handleRemoveLink(i)} className="p-1.5 text-red-400 hover:text-red-600 transition-colors shrink-0">
                                                    <LucideX size={14} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <button type="button" onClick={handleAddLink} className="text-xs font-bold text-accent-blue hover:underline flex items-center gap-1">
                                        <LucidePlus size={12} /> Link Ekle
                                    </button>
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-text-muted/60 mb-2">Notlar</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                    className="w-full px-4 py-3 bg-surface-light/50 rounded-xl border border-border-light/40 outline-none text-sm focus:ring-2 focus:ring-accent-blue/20 focus:bg-white transition-all resize-none min-h-[100px]"
                                    placeholder="Proje hakkında notlar..."
                                    rows={4}
                                />
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-accent-blue hover:bg-accent-blue-hover text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-accent-blue/20 disabled:opacity-50"
                            >
                                <LucideSave size={18} />
                                {editingProject ? 'Güncelle' : 'Projeyi Kaydet'}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminProjectsView;
