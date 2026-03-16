import React, { useState, useEffect, useMemo } from 'react';
import { LucidePlus, LucideX, LucideEdit3, LucideTrash2, LucideExternalLink, LucideCalendar, LucideType, LucideFileText, LucideChevronLeft, LucideSave, LucideSearch, LucideTag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { addAdminProject, subscribeToAdminProjects, updateAdminProject, deleteAdminProject } from '../services/dbService';

const TR_MONTHS = ['ocak', 'şubat', 'mart', 'nisan', 'mayıs', 'haziran', 'temmuz', 'ağustos', 'eylül', 'ekim', 'kasım', 'aralık'];

function getDateSearchableString(dateVal) {
    if (!dateVal) return '';
    let d;
    if (dateVal.toDate) d = dateVal.toDate();
    else if (typeof dateVal === 'string') d = new Date(dateVal);
    else d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    const day = d.getDate();
    const month = d.getMonth();
    const year = d.getFullYear();
    const pad = (n) => String(n).padStart(2, '0');
    const parts = [
        String(year),
        pad(month + 1),
        pad(day),
        `${pad(day)}.${pad(month + 1)}`,
        `${pad(day)}-${pad(month + 1)}`,
        `${pad(day)}.${pad(month + 1)}.${year}`,
        `${pad(day)}-${pad(month + 1)}-${year}`,
        TR_MONTHS[month],
        `${day} ${TR_MONTHS[month]}`,
        `${TR_MONTHS[month]} ${day}`,
        String(day)
    ];
    return parts.join(' ').toLowerCase();
}

function getProjectSearchableString(project) {
    const dateStr = getDateSearchableString(project.date);
    const linksStr = (project.links || []).map(l => [l.label, l.url].filter(Boolean).join(' ')).join(' ');
    const tagsStr = Array.isArray(project.tags) ? project.tags.join(' ') : (project.tags || '');
    const parts = [
        project.name || '',
        project.fonts || '',
        project.notes || '',
        project.description || '',
        project.category || '',
        project.coverImageUrl || '',
        linksStr,
        tagsStr,
        dateStr
    ];
    return parts.join(' ').toLowerCase();
}

function matchesSearch(project, query) {
    const searchable = getProjectSearchableString(project);
    const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return true;
    return tokens.every(token => searchable.includes(token));
}

const AdminProjectsView = ({ onClose }) => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [projects, setProjects] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingProject, setEditingProject] = useState(null);
    const [detailProject, setDetailProject] = useState(null);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        date: '',
        fonts: '',
        notes: '',
        description: '',
        category: '',
        tags: '',
        coverImageUrl: '',
        links: [{ label: '', url: '' }]
    });

    useEffect(() => {
        if (!user) return;
        const unsubscribe = subscribeToAdminProjects(user.uid, setProjects);
        return () => unsubscribe();
    }, [user]);

    const filteredProjects = useMemo(
        () => projects.filter(p => matchesSearch(p, searchQuery)),
        [projects, searchQuery]
    );

    const resetForm = () => {
        setFormData({
            name: '', date: '', fonts: '', notes: '', description: '', category: '', tags: '', coverImageUrl: '',
            links: [{ label: '', url: '' }]
        });
        setEditingProject(null);
        setIsFormOpen(false);
    };

    const openEditForm = (project) => {
        setDetailProject(null);
        setFormData({
            name: project.name || '',
            date: project.date ? (project.date.toDate ? project.date.toDate().toISOString().slice(0, 10) : String(project.date).slice(0, 10)) : '',
            fonts: project.fonts || '',
            notes: project.notes || '',
            description: project.description || '',
            category: project.category || '',
            tags: Array.isArray(project.tags) ? project.tags.join(', ') : (project.tags || ''),
            coverImageUrl: project.coverImageUrl || '',
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
        const cleanLinks = formData.links.filter(l => l.url?.trim());
        const tagsArray = formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
        const data = {
            name: formData.name.trim(),
            date: formData.date || null,
            fonts: formData.fonts.trim() || null,
            notes: formData.notes.trim() || null,
            description: formData.description.trim() || null,
            category: formData.category.trim() || null,
            tags: tagsArray,
            coverImageUrl: formData.coverImageUrl.trim() || null,
            links: cleanLinks
        };
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
            setDetailProject(null);
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
        <div className="min-h-screen bg-background text-text-main font-sans">
            <div className="max-w-6xl mx-auto pt-28 pb-16 px-4 sm:px-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                    <div className="flex items-center gap-4">
                        <button onClick={onClose} className="p-2.5 -ml-2 hover:bg-surface-light rounded-xl transition-all text-text-muted hover:text-text-main">
                            <LucideChevronLeft size={22} />
                        </button>
                        <div>
                            <h2 className="text-3xl font-display font-bold italic text-text-main">Projelerim</h2>
                            <p className="text-sm text-text-muted font-medium">Portföy & proje yönetimi</p>
                        </div>
                    </div>
                    <button
                        onClick={() => { resetForm(); setIsFormOpen(true); }}
                        className="flex items-center gap-2 bg-accent-blue hover:bg-accent-blue-hover text-white px-5 py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-accent-blue/20 shrink-0"
                    >
                        <LucidePlus size={16} /> Yeni Proje
                    </button>
                </div>

                {/* Search */}
                {projects.length > 0 && (
                    <div className="mb-8">
                        <div className="relative">
                            <LucideSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="İsim, font, tarih (15 mart, 15.03, 2024...), link, açıklama, etiket..."
                                className="w-full pl-11 pr-4 py-3 bg-white border border-border-light/40 rounded-xl text-sm placeholder:text-text-muted/70 focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue/40 outline-none transition-all"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-text-muted hover:text-text-main rounded-lg hover:bg-surface-light"
                                >
                                    <LucideX size={16} />
                                </button>
                            )}
                        </div>
                        {searchQuery && (
                            <p className="mt-2 text-xs text-text-muted">
                                {filteredProjects.length} proje bulundu
                            </p>
                        )}
                    </div>
                )}

                {/* Content - Grid */}
                <div>
                    {projects.length === 0 && !isFormOpen ? (
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                            <LucideFileText size={56} className="text-text-muted/20 mb-4" />
                            <p className="font-display text-lg italic text-text-muted mb-2">Henüz proje eklenmedi.</p>
                            <p className="text-sm text-text-muted/60">Portföyüne proje eklemek için &quot;Yeni Proje&quot; butonuna tıkla.</p>
                        </div>
                    ) : filteredProjects.length === 0 ? (
                        <div className="py-16 text-center">
                            <LucideSearch size={48} className="text-text-muted/30 mx-auto mb-4" />
                            <p className="text-text-muted font-medium">Arama kriterine uyan proje yok.</p>
                            <p className="text-sm text-text-muted/70 mt-1">Farklı kelimeler dene veya aramayı temizle.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredProjects.map(project => (
                                <button
                                    key={project.id}
                                    type="button"
                                    onClick={() => setDetailProject(project)}
                                    className="group text-left bg-white border border-border-light/40 rounded-2xl overflow-hidden hover:shadow-lg hover:border-accent-blue/20 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                                >
                                    <div className="aspect-[4/5] bg-surface-light/50 relative overflow-hidden">
                                        {project.coverImageUrl ? (
                                            <img
                                                src={project.coverImageUrl}
                                                alt=""
                                                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center text-text-muted/30">
                                                <LucideFileText size={48} />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                    <div className="p-4">
                                        <h3 className="font-bold text-text-main line-clamp-2 mb-1">{project.name}</h3>
                                        <div className="flex flex-wrap gap-2 text-xs text-text-muted">
                                            {project.date && (
                                                <span className="flex items-center gap-1">
                                                    <LucideCalendar size={10} /> {formatDate(project.date)}
                                                </span>
                                            )}
                                            {project.fonts && (
                                                <span className="flex items-center gap-1 line-clamp-1">
                                                    <LucideType size={10} /> {project.fonts}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Detail Modal */}
            {detailProject && (
                <div className="fixed inset-0 z-[200] bg-background/90 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl shadow-2xl border border-border-light/40 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden my-8">
                        <div className="relative flex-shrink-0">
                            {detailProject.coverImageUrl ? (
                                <div className="aspect-video bg-surface-light">
                                    <img
                                        src={detailProject.coverImageUrl}
                                        alt=""
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            ) : (
                                <div className="aspect-video bg-surface-light/50 flex items-center justify-center text-text-muted/30">
                                    <LucideFileText size={64} />
                                </div>
                            )}
                            <div className="absolute top-4 right-4 flex items-center gap-2">
                                <button
                                    onClick={() => openEditForm(detailProject)}
                                    className="p-2.5 bg-white/95 hover:bg-white rounded-xl shadow-lg text-text-muted hover:text-accent-blue transition-all flex items-center gap-2 font-bold text-sm"
                                >
                                    <LucideEdit3 size={16} /> Düzenle
                                </button>
                                <button
                                    onClick={() => {
                                        if (confirm('Bu projeyi silmek istediğinize emin misiniz?')) handleDelete(detailProject.id);
                                    }}
                                    className="p-2.5 bg-white/95 hover:bg-red-50 rounded-xl shadow-lg text-text-muted hover:text-red-500 transition-all"
                                    title="Sil"
                                >
                                    <LucideTrash2 size={16} />
                                </button>
                                <button
                                    onClick={() => setDetailProject(null)}
                                    className="p-2.5 bg-white/95 hover:bg-surface-light rounded-xl shadow-lg text-text-muted"
                                >
                                    <LucideX size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 space-y-6">
                            <div>
                                <h3 className="text-2xl font-display font-bold italic text-text-main mb-3">{detailProject.name}</h3>
                                <div className="flex flex-wrap gap-3 text-sm text-text-muted">
                                    {detailProject.date && (
                                        <span className="flex items-center gap-1.5">
                                            <LucideCalendar size={14} /> {formatDate(detailProject.date)}
                                        </span>
                                    )}
                                    {detailProject.fonts && (
                                        <span className="flex items-center gap-1.5">
                                            <LucideType size={14} /> {detailProject.fonts}
                                        </span>
                                    )}
                                    {detailProject.category && (
                                        <span className="flex items-center gap-1.5">
                                            <LucideTag size={14} /> {detailProject.category}
                                        </span>
                                    )}
                                </div>
                                {detailProject.tags?.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {detailProject.tags.map((tag, i) => (
                                            <span key={i} className="px-2.5 py-1 bg-accent-blue/10 text-accent-blue rounded-lg text-xs font-medium">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {detailProject.description && (
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-text-muted/60 mb-2">Açıklama</h4>
                                    <p className="text-sm text-text-main leading-relaxed whitespace-pre-line">{detailProject.description}</p>
                                </div>
                            )}
                            {detailProject.notes && (
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-text-muted/60 mb-2">Notlar</h4>
                                    <p className="text-sm text-text-muted/90 leading-relaxed whitespace-pre-line">{detailProject.notes}</p>
                                </div>
                            )}
                            {detailProject.links?.length > 0 && (
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-text-muted/60 mb-2">Linkler</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {detailProject.links.map((link, i) => (
                                            <a
                                                key={i}
                                                href={link.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent-blue/5 hover:bg-accent-blue/10 text-accent-blue rounded-xl text-sm font-bold transition-colors"
                                            >
                                                <LucideExternalLink size={14} /> {link.label || link.url}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Form Modal */}
            {isFormOpen && (
                <div className="fixed inset-0 z-[210] bg-background/80 backdrop-blur-xl flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl border border-border-light/40 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between px-8 py-6 border-b border-border-light/40 bg-surface-light/30 flex-shrink-0">
                            <h3 className="text-xl font-display font-bold italic">{editingProject ? 'Projeyi Düzenle' : 'Yeni Proje Ekle'}</h3>
                            <button onClick={resetForm} className="p-2 hover:bg-white rounded-xl text-text-muted"><LucideX size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-5">
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
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-text-muted/60 mb-2">Kapak Görseli URL</label>
                                <input
                                    type="url"
                                    value={formData.coverImageUrl}
                                    onChange={(e) => setFormData(prev => ({ ...prev, coverImageUrl: e.target.value }))}
                                    className="w-full px-4 py-3 bg-surface-light/50 rounded-xl border border-border-light/40 outline-none text-sm focus:ring-2 focus:ring-accent-blue/20 focus:bg-white transition-all"
                                    placeholder="https://..."
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-text-muted/60 mb-2">Tarih</label>
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                                    className="w-full px-4 py-3 bg-surface-light/50 rounded-xl border border-border-light/40 outline-none text-sm focus:ring-2 focus:ring-accent-blue/20 focus:bg-white transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-text-muted/60 mb-2">Fontlar</label>
                                <input
                                    type="text"
                                    value={formData.fonts}
                                    onChange={(e) => setFormData(prev => ({ ...prev, fonts: e.target.value }))}
                                    className="w-full px-4 py-3 bg-surface-light/50 rounded-xl border border-border-light/40 outline-none text-sm focus:ring-2 focus:ring-accent-blue/20 focus:bg-white transition-all"
                                    placeholder="Örn: Inter, Playfair Display"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-text-muted/60 mb-2">Kategori</label>
                                <input
                                    type="text"
                                    value={formData.category}
                                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                    className="w-full px-4 py-3 bg-surface-light/50 rounded-xl border border-border-light/40 outline-none text-sm focus:ring-2 focus:ring-accent-blue/20 focus:bg-white transition-all"
                                    placeholder="Örn: Kitap Tasarımı, Branding"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-text-muted/60 mb-2">Etiketler (virgülle ayırın)</label>
                                <input
                                    type="text"
                                    value={formData.tags}
                                    onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                                    className="w-full px-4 py-3 bg-surface-light/50 rounded-xl border border-border-light/40 outline-none text-sm focus:ring-2 focus:ring-accent-blue/20 focus:bg-white transition-all"
                                    placeholder="Örn: vcd, tipografi, kapak"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-text-muted/60 mb-2">Açıklama</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full px-4 py-3 bg-surface-light/50 rounded-xl border border-border-light/40 outline-none text-sm focus:ring-2 focus:ring-accent-blue/20 focus:bg-white transition-all resize-none min-h-[80px]"
                                    placeholder="Proje açıklaması..."
                                    rows={3}
                                />
                            </div>
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
                </div>
            )}
        </div>
    );
};

export default AdminProjectsView;
