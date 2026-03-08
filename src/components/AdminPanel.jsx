import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { approveRoomAccessRequest, rejectRoomAccessRequest, fetchAllStudents, fetchAllApprovedRequests } from '../services/dbService';
import { LucideCheck, LucideX, LucideBell, LucideLoader2, LucideSparkles, LucideMail, LucideLayers, LucideUsers, LucideActivity, LucideClock, LucideCalendar } from 'lucide-react';

const AdminPanel = ({ rooms = [], openOverride, onOpenChange }) => {
    const { user, isAdmin } = useAuth();
    const [requests, setRequests] = useState([]);
    const [students, setStudents] = useState([]);
    const [approvedRequests, setApprovedRequests] = useState([]);
    const [activeTab, setActiveTab] = useState('requests'); // requests, students
    const [isDashboardOpen, setIsDashboardOpen] = useState(false);
    const [processingId, setProcessingId] = useState(null);
    const [loadingStudents, setLoadingStudents] = useState(false);

    // Prevent scrolling when dashboard is open
    useEffect(() => {
        if (isDashboardOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isDashboardOpen]);

    useEffect(() => {
        if (openOverride !== undefined) {
            setIsDashboardOpen(openOverride);
        }
    }, [openOverride]);

    const handleClose = () => {
        setIsDashboardOpen(false);
        if (onOpenChange) onOpenChange(false);
    };

    useEffect(() => {
        if (!isAdmin || !user) return;

        const q = query(
            collection(db, "room_requests"),
            where("status", "==", "pending"),
            where("roomOwnerId", "==", user.uid)
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const sortedRequests = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

            setRequests(sortedRequests);
        }, (error) => {
            console.warn("Management Dashboard listener error:", error.message);
            setRequests([]);
        });
        return () => unsubscribe();
    }, [isAdmin, user]);

    useEffect(() => {
        if (isDashboardOpen && activeTab === 'students') {
            loadStudents();
        }
    }, [isDashboardOpen, activeTab]);

    const loadStudents = async () => {
        setLoadingStudents(true);
        const [studentsData, approvedData] = await Promise.all([
            fetchAllStudents(),
            fetchAllApprovedRequests()
        ]);
        setStudents(studentsData);
        setApprovedRequests(approvedData);
        setLoadingStudents(false);
    };

    const handleApprove = async (request) => {
        if (!confirm(`${request.userName} adlı kullanıcının ${request.roomName} odasına katılım isteğini onaylamak istiyor musunuz?`)) return;

        setProcessingId(request.id);
        try {
            await approveRoomAccessRequest(request);
            alert("Katılım isteği başarıyla onaylandı.");
            if (activeTab === 'students') loadStudents();
        } catch (error) {
            alert("Hata oluştu: " + error.message);
        }
        setProcessingId(null);
    };

    const handleReject = async (requestId) => {
        if (!confirm("Bu katılım isteğini reddetmek istediğinize emin misiniz?")) return;

        setProcessingId(requestId);
        try {
            await rejectRoomAccessRequest(requestId);
            alert("Katılım isteği başarıyla reddedildi.");
        } catch (error) {
            alert("Hata oluştu: " + error.message);
        }
        setProcessingId(null);
    };

    if (!isAdmin) return null;

    const formatDate = (timestamp, includeTime = true) => {
        if (!timestamp) return "Hiç";
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);

        const options = { day: 'numeric', month: 'short', year: 'numeric' };
        if (includeTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
        }

        return date.toLocaleString('tr-TR', options);
    };

    const getStudentRooms = (studentId) => {
        const studentJoinedRooms = rooms.filter(room => room.participants?.includes(studentId));
        return studentJoinedRooms.map(room => {
            const approval = approvedRequests.find(req => req.roomId === room.id && req.uid === studentId);
            return {
                ...room,
                joinedAt: approval?.approvedAt || null
            };
        });
    };

    return (
        <>
            {isDashboardOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-12 animate-in fade-in duration-500">
                    <div
                        className="absolute inset-0 bg-text-main/10 backdrop-blur-3xl"
                        onClick={handleClose}
                    />

                    <div className="glass-card w-full max-w-6xl h-[85vh] flex flex-col relative z-10 overflow-hidden shadow-[0_32px_128px_-16px_rgba(0,0,0,0.3)] animate-in slide-in-from-bottom-8 duration-700">
                        <div className="p-8 border-b border-text-main/5 flex flex-col sm:flex-row items-center justify-between bg-white/10 gap-6 shrink-0">
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <h2 className="text-4xl font-serif tracking-tight">Öğrenci Yönetimi</h2>
                                    <div className="bg-accent-blue/10 text-accent-blue px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase">Admin Panel</div>
                                </div>
                                <p className="text-text-muted text-sm italic">Öğrenci verilerini ve katılım taleplerini buradan yönetin.</p>
                            </div>

                            <div className="flex bg-surface-light p-1 rounded-2xl border border-white">
                                <button
                                    onClick={() => setActiveTab('requests')}
                                    className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'requests' ? 'bg-white shadow-sm text-accent-blue' : 'text-text-muted hover:text-text-main'}`}
                                >
                                    <LucideBell size={14} /> Talepler {requests.length > 0 && <span className="bg-red-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[8px] animate-pulse">{requests.length}</span>}
                                </button>
                                <button
                                    onClick={() => setActiveTab('students')}
                                    className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'students' ? 'bg-white shadow-sm text-accent-blue' : 'text-text-muted hover:text-text-main'}`}
                                >
                                    <LucideUsers size={14} /> Öğrenciler
                                </button>
                            </div>

                            <button
                                onClick={handleClose}
                                className="sm:relative absolute top-8 right-8 w-12 h-12 rounded-full flex items-center justify-center text-text-muted hover:bg-red-50 hover:text-red-500 transition-all"
                            >
                                <LucideX size={28} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-surface-light/20 min-h-0">
                            {activeTab === 'requests' ? (
                                requests.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center opacity-30 py-20">
                                        <div className="w-32 h-32 bg-text-main/5 rounded-full flex items-center justify-center mb-6">
                                            <LucideSparkles size={48} />
                                        </div>
                                        <h3 className="text-2xl font-serif mb-2 text-center text-text-main">Bekleyen İstek Yok</h3>
                                        <p className="text-sm text-center">Şu an onay bekleyen bir oda katılım talebi bulunmuyor.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {requests.map(req => (
                                            <div
                                                key={req.id}
                                                className="glass-card !bg-white/40 p-8 border-white/50 hover:border-accent-blue/40 transition-all group relative overflow-hidden flex flex-col justify-between"
                                            >
                                                <div className="relative z-10">
                                                    <div className="flex items-center gap-4 mb-6">
                                                        <div className="w-14 h-14 bg-gradient-to-br from-accent-blue to-accent-blue/40 rounded-3xl flex items-center justify-center text-white text-xl font-serif shadow-lg">
                                                            {req.userName.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <h4 className="text-2xl font-medium tracking-tight text-text-main">{req.userName}</h4>
                                                            <div className="flex items-center gap-1.5 text-text-muted text-xs">
                                                                <LucideMail size={12} /> {req.userEmail}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="mb-8">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <LucideLayers size={14} className="text-accent-blue" />
                                                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">Katılmak İstediği Oda</span>
                                                        </div>
                                                        <div className="bg-white/60 p-5 rounded-3xl border border-white/80 text-lg font-medium text-text-main shadow-inner flex items-center gap-3">
                                                            <span className="text-2xl">🚪</span> {req.roomName}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-4 relative z-10 pt-4 mt-auto">
                                                    <button
                                                        disabled={!!processingId}
                                                        onClick={() => handleApprove(req)}
                                                        className="flex-[2] bg-accent-blue text-white py-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-3 hover:bg-accent-blue-hover hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-accent-blue/20 disabled:opacity-50"
                                                    >
                                                        {processingId === req.id ? <LucideLoader2 size={18} className="animate-spin" /> : <LucideCheck size={18} />}
                                                        ONAYLA
                                                    </button>
                                                    <button
                                                        disabled={!!processingId}
                                                        onClick={() => handleReject(req.id)}
                                                        className="flex-1 bg-white/80 text-text-muted py-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-red-50 hover:text-red-500 transition-all border border-white disabled:opacity-50"
                                                    >
                                                        <LucideX size={18} /> REDDET
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )
                            ) : (
                                <div className="space-y-4">
                                    {loadingStudents ? (
                                        <div className="py-20 flex flex-col items-center justify-center gap-4 opacity-40">
                                            <LucideLoader2 size={32} className="animate-spin text-accent-blue" />
                                            <p className="text-sm italic">Öğrenci listesi yükleniyor...</p>
                                        </div>
                                    ) : students.length === 0 ? (
                                        <p className="text-center py-20 text-text-muted italic">Kayıtlı öğrenci bulunamadı.</p>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-4">
                                            {students.map(student => {
                                                const joinedRooms = getStudentRooms(student.id);
                                                return (
                                                    <div key={student.id} className="glass-card !bg-white/40 px-6 py-4 border-white/60 hover:border-accent-blue/20 transition-all flex flex-wrap items-center justify-between gap-6 group">
                                                        <div className="flex items-center gap-4 flex-1 min-w-[300px]">
                                                            <div className="relative shrink-0">
                                                                <div className="w-12 h-12 rounded-2xl bg-surface-light flex items-center justify-center text-accent-blue font-bold text-lg shadow-sm border border-white">
                                                                    {student.name?.charAt(0) || '?'}
                                                                </div>
                                                                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${student.isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                                                            </div>
                                                            <div className="overflow-hidden">
                                                                <h5 className="font-bold text-text-main text-sm truncate">{student.name || 'İsimsiz'}</h5>
                                                                <div className="flex flex-col gap-0.5 mt-0.5">
                                                                    <p className="text-[10px] text-text-muted truncate">{student.email}</p>
                                                                    <div className="flex items-center gap-1 opacity-60">
                                                                        <LucideCalendar size={8} className="text-text-muted" />
                                                                        <span className="text-[8px] font-bold text-text-muted uppercase tracking-wider">Kayıt: {formatDate(student.createdAt, false)}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-10 shrink-0">
                                                            <div className="text-center">
                                                                <div className="text-[12px] font-serif font-bold text-text-main">{student.loginCount || 0}</div>
                                                                <div className="text-[8px] text-text-muted uppercase tracking-widest font-bold">Giriş</div>
                                                            </div>
                                                            <div className="text-right min-w-[120px]">
                                                                {student.isOnline ? (
                                                                    <div className="bg-green-50 text-green-600 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-green-100 animate-pulse inline-block">
                                                                        ŞU AN AKTİF
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <div className="text-[10px] font-medium text-text-main font-serif">{formatDate(student.lastLogin)}</div>
                                                                        <div className="text-[8px] text-text-muted uppercase tracking-widest font-bold">Son Görülme</div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex-1 min-w-[240px] flex items-center gap-3 overflow-hidden border-l border-text-main/5 pl-6">
                                                            <LucideLayers size={14} className="text-accent-blue shrink-0" />
                                                            <div className="flex flex-wrap gap-2">
                                                                {joinedRooms.length > 0 ? joinedRooms.map(room => (
                                                                    <div key={room.id} className="flex flex-col">
                                                                        <span className="text-[9px] font-bold px-2.5 py-0.5 rounded-lg bg-accent-blue/5 text-accent-blue border border-accent-blue/10 whitespace-nowrap">
                                                                            {room.name}
                                                                        </span>
                                                                        <span className="text-[7px] text-text-muted font-bold uppercase mt-0.5 ml-1 opacity-50">
                                                                            {formatDate(room.joinedAt, false)}
                                                                        </span>
                                                                    </div>
                                                                )) : (
                                                                    <span className="text-[9px] text-text-muted italic opacity-50">Henüz odaya katılmadı</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="p-6 bg-white/5 border-t border-text-main/5 text-center shrink-0">
                            <p className="text-[10px] uppercase tracking-widest text-text-muted opacity-60">Kibele2 Yönetim Arabirimi © 2026</p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default AdminPanel;
