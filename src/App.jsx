import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { LucideHome, LucideLayers, LucideMessageSquare, LucideUser, LucidePlus, LucideChevronDown, LucideSearch, LucideBell, LucideCheck, LucideX, LucideTrash2, LucideRefreshCcw, LucideFolderOpen } from 'lucide-react';
import { fetchAICArtworks, AIC_FILTERS } from './services/aicApi';
import { useAuth } from './context/AuthContext';
import { useToast } from './context/ToastContext';
import KibelePartner from './components/KibelePartner';
import InspirationSystem from './components/InspirationSystem';
import AdminPanel from './components/AdminPanel';
import RegisterModal from './components/RegisterModal';
import LoginModal from './components/LoginModal';
import NotificationDropdown from './components/NotificationDropdown';
import RequestActionModal from './components/RequestActionModal';
import RoomSelector from './components/RoomSelector';
import { auth, db, rtdb } from './firebase';
import { ref, push } from 'firebase/database';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { subscribeToRooms, requestRoomAccess } from './services/dbService';

import RoomRequestView from './views/RoomView/RoomRequestView';
import InspirationWorkspace from './views/RoomView/InspirationWorkspace';
import AdminProjectsView from './views/AdminProjectsView';

gsap.registerPlugin(ScrollTrigger);

function App() {
    const heroRef = useRef(null);
    const { user, isAdmin } = useAuth();
    const { showToast } = useToast();

    // States
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);
    const [artworks, setArtworks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [rooms, setRooms] = useState([]);
    const [currentView, setCurrentView] = useState('hub'); // hub, request, workspace, projects
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [userRequests, setUserRequests] = useState([]);
    const [isDashboardOpen, setIsDashboardOpen] = useState(false);
    const [selectedRequestId, setSelectedRequestId] = useState(null);
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

    const [filters, setFilters] = useState({
        artists: [],
        places: [],
        artwork_type: [],
        styles: [],
        subjects: [],
        classifications: [],
        medium: [],
        departments: [],
        colors: [],
        color_hex: '',
        sort: 'relevance',
        date_start: undefined,
        date_end: undefined
    });
    const [expandedFilters, setExpandedFilters] = useState({
        sort_options: false,
        artists: false,
        places: false,
        artwork_type: false,
        date: false,
        color: false,
        styles: false,
        subjects: false,
        classifications: false,
        medium: false,
        departments: false
    });
    const [queryText, setQueryText] = useState('');
    const [enlargedArtwork, setEnlargedArtwork] = useState(null);
    const [userRooms, setUserRooms] = useState([]);
    const [selectedRoomId, setSelectedRoomId] = useState('');
    const lastSearchRef = useRef(null);

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalArtworks, setTotalArtworks] = useState(0);
    const [returnToRooms, setReturnToRooms] = useState(false);

    // Fetch user's joined rooms for the Lightbox Room Selector
    useEffect(() => {
        if (!user) return;
        const unsubscribe = subscribeToRooms((allRooms) => {
            const joinedRooms = allRooms.filter(r => 
                (r.participants?.includes(user.uid) || r.creatorId === user.uid) && r.isActive !== false
            );
            setUserRooms(joinedRooms);
            if (joinedRooms.length > 0) {
                setSelectedRoomId(joinedRooms[0].id);
            }
        });
        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        const unsubscribeRooms = subscribeToRooms(setRooms);

        let unsubscribeRequests = () => { };
        if (user) {
            const q = query(collection(db, "room_requests"), where("uid", "==", user.uid));
            unsubscribeRequests = onSnapshot(q, (snapshot) => {
                setUserRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            }, (error) => {
                console.warn("Room requests permission or listener error:", error.message);
                setUserRequests([]);
            });
        }

        return () => {
            unsubscribeRooms();
            unsubscribeRequests();
        };
    }, [user]);

    useEffect(() => {
        handleFetchArtworks();
    }, [filters, page]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (queryText !== lastSearchRef.current) {
                setPage(1);
                handleFetchArtworks();
                lastSearchRef.current = queryText;
            }
        }, 600);
        return () => clearTimeout(timer);
    }, [queryText]);

    const handleFetchArtworks = async () => {
        setLoading(true);
        const data = await fetchAICArtworks({
            page: page,
            query: queryText,
            filters: filters
        });
        setArtworks(data.items || []);
        setTotalPages(data.totalPages || 1);
        setTotalArtworks(data.total ?? 0);
        setLoading(false);
    };

    const toggleFilter = (type, id) => {
        setFilters(prev => {
            const current = prev[type] || [];
            const next = current.includes(id)
                ? current.filter(item => item !== id)
                : [...current, id];
            return { ...prev, [type]: next };
        });
        setPage(1);
    };

    const clearFilters = () => {
        setFilters({ 
            artists: [],
            places: [],
            artwork_type: [],
            styles: [],
            subjects: [],
            classifications: [],
            medium: [],
            departments: [],
            colors: [],
            color_hex: '',
            sort: 'relevance',
            date_start: undefined,
            date_end: undefined
        });
        setQueryText('');
        setPage(1);
    };

    const toggleSection = (section) => {
        setExpandedFilters(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const handleRemoteAddArtwork = async (artwork) => {
        if (!selectedRoomId) {
            showToast("Lütfen bir oda seçin.", "error");
            return;
        }

        const currentCanvasRoomId = `${selectedRoomId}_${user.uid}`;
        const shapeId = `shape:${Date.now()}`;

        const shape = {
            id: shapeId,
            typeName: 'shape',
            type: 'image',
            x: 100,
            y: 100,
            rotation: 0,
            index: 'a1',
            opacity: 1,
            isLocked: false,
            parentId: 'page:page',
            meta: {
                creatorId: user.uid,
                creatorName: user.name || user.displayName || 'Sanatçı',
                createdAt: Date.now()
            },
            props: {
                w: 400,
                h: 400 * (artwork.aspect_ratio || 1),
                rel: 'external',
                src: artwork.image_url || artwork.thumbnail || "",
                url: artwork.image_url || artwork.thumbnail || "",
                name: artwork.title || "İsimsiz Görsel",
                isAnimated: false,
                mimeType: 'image/jpeg',
                playing: false
            }
        };

        try {
            const externalRef = ref(rtdb, `canvas_sync/${currentCanvasRoomId}/external_shapes`);
            await push(externalRef, shape);
            showToast("Görsel ilham odasına eklendi! ✨");
            setEnlargedArtwork(null);
        } catch (error) {
            console.error("Error adding artwork to canvas remotely:", error);
            showToast("Görsel eklenirken bir hata oluştu.", "error");
        }
    };

    const handleLogout = () => signOut(auth);

    const handleRoomClick = (room) => {
        if (!user) {
            setIsLoginOpen(true);
            return;
        }

        setSelectedRoom(room);

        // Katılım durumunu kontrol et
        const isParticipant = room.participants?.includes(user.uid) || isAdmin || room.creatorId === user.uid;

        if (room.isPrivate && !isParticipant) {
            setCurrentView('request');
        } else {
            setCurrentView('workspace');
        }
    };

    const handleRequestAccess = async (reason = "") => {
        if (!user || !selectedRoom) return;
        try {
            await requestRoomAccess(selectedRoom.id, selectedRoom.name, user, selectedRoom.creatorId, reason);
        } catch (error) {
            showToast("İstek gönderilirken bir hata oluştu: " + error.message, "error");
        }
    };

    useEffect(() => {
        let ctx = gsap.context(() => {
            gsap.from(".hero-text", {
                y: 60,
                opacity: 0,
                duration: 1.2,
                stagger: 0.2,
                ease: "power3.out",
                delay: 0.5
            });
        }, heroRef);

        return () => ctx.revert();
    }, []);

    // View Navigation Logic
    const liveSelectedRoom = selectedRoom ? rooms.find(r => r.id === selectedRoom.id) : null;

    const handleSmoothScroll = (e, targetId) => {
        e.preventDefault();
        const element = document.getElementById(targetId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    useEffect(() => {
        if (currentView === 'hub' && returnToRooms) {
            setTimeout(() => {
                const targetId = user ? 'inspiration-rooms' : 'hubs';
                const el = document.getElementById(targetId);
                if (el) el.scrollIntoView({ behavior: 'auto', block: 'center' });
            }, 100);
            setReturnToRooms(false);
        }
    }, [currentView, returnToRooms, user]);

    // Check if user should be kicked out of the current workspace
    useEffect(() => {
        if (currentView === 'workspace' && liveSelectedRoom && user && !isAdmin) {
            const isParticipant = liveSelectedRoom.participants?.includes(user.uid) || liveSelectedRoom.creatorId === user.uid;
            if (!isParticipant) {
                setCurrentView('hub');
                // Optionally show a toast here via a global context, but App doesn't have useToast yet inside the local scope if it wraps it.
            }
        }
    }, [liveSelectedRoom, user, isAdmin, currentView]);

    return (
        <>
            {currentView === 'request' ? (
                <RoomRequestView
                    room={liveSelectedRoom || selectedRoom}
                    onBack={() => {
                        setCurrentView('hub');
                        setReturnToRooms(true);
                    }}
                    onRequestAccess={(reason) => handleRequestAccess(reason)}
                    isPending={userRequests.some(r => r.roomId === selectedRoom?.id && r.status === 'pending')}
                />
            ) : currentView === 'workspace' ? (
                <InspirationWorkspace room={liveSelectedRoom || selectedRoom} onBack={() => {
                    setCurrentView('hub');
                    setReturnToRooms(true);
                }} />
            ) : currentView === 'projects' ? (
                <AdminProjectsView onClose={() => setCurrentView('hub')} />
            ) : (
                <div className="min-h-screen bg-background text-text-main font-sans selection:bg-accent-blue selection:text-white">
                    <AdminPanel rooms={rooms} openOverride={isDashboardOpen} onOpenChange={setIsDashboardOpen} showToast={showToast} />

                    <nav className="fixed top-4 sm:top-8 left-1/2 -translate-x-1/2 z-[100] w-[95%] sm:w-[90%] max-w-5xl transition-all duration-500">
                        <div className="glass-card px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <img src="./logo.svg" alt="Kibele Logo" className="w-7 h-7 sm:w-9 sm:h-9" />
                                <div className="font-serif text-xl sm:text-2xl font-bold tracking-tight">Kibele.</div>
                            </div>
                            <div className="hidden lg:flex items-center gap-10 text-xs font-bold uppercase tracking-widest text-text-muted">
                                <a href="#kesfet" onClick={(e) => handleSmoothScroll(e, 'kesfet')} className="hover:text-accent-blue transition-colors">Keşfet</a>
                                <a href="#nasil-calisir" onClick={(e) => handleSmoothScroll(e, 'nasil-calisir')} className="hover:text-accent-blue transition-colors">Yöntem</a>
                                <a href="#inspiration-rooms" onClick={(e) => handleSmoothScroll(e, user ? 'inspiration-rooms' : 'hubs')} className="hover:text-accent-blue transition-colors">İlham Odaları</a>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-4">
                                {user ? (
                                    <div className="flex items-center gap-1 sm:gap-4">
                                        {isAdmin && (
                                            <div className="hidden sm:flex items-center gap-1">
                                                <button
                                                    onClick={() => setCurrentView('projects')}
                                                    className="p-2.5 text-accent-blue hover:bg-accent-blue/5 rounded-full transition-all relative group"
                                                    title="Projelerim"
                                                >
                                                    <LucideFolderOpen size={21} />
                                                </button>
                                                <button
                                                    onClick={() => setIsDashboardOpen(true)}
                                                    className="p-2.5 text-accent-blue hover:bg-accent-blue/5 rounded-full transition-all relative group"
                                                    title="Yönetim Paneli"
                                                >
                                                    <LucideLayers size={21} />
                                                </button>
                                            </div>
                                        )}

                                        <NotificationDropdown onRequestClick={(id) => {
                                            setSelectedRequestId(id);
                                            setIsRequestModalOpen(true);
                                        }} />

                                        <div className="flex items-center gap-3 pl-4 border-l border-border-light">
                                            <div className="flex flex-col items-end hidden sm:flex">
                                                <span className="text-xs font-bold text-text-main leading-tight">
                                                    {user.name || user.displayName || user.email.split('@')[0]}
                                                </span>
                                                <button onClick={handleLogout} className="text-[10px] font-bold text-text-muted hover:text-red-500 uppercase tracking-tighter transition-colors">Çıkış Yap</button>
                                            </div>
                                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-accent-blue to-accent-blue-hover flex items-center justify-center text-xs sm:text-sm font-bold text-white shadow-lg shadow-accent-blue/20 ring-2 ring-white">
                                                {(user.name || user.displayName || user.email)?.charAt(0).toUpperCase()}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => setIsLoginOpen(true)} className="text-xs font-bold uppercase tracking-widest hover:text-accent-blue transition-colors">Giriş</button>
                                        <button
                                            onClick={() => setIsRegisterOpen(true)}
                                            className="bg-text-main text-white py-2.5 px-6 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-accent-blue transition-all"
                                        >Kayıt Ol</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </nav>

                    <section ref={heroRef} className="h-screen flex items-center px-[5%] relative overflow-hidden pt-20">
                        <div className="max-w-4xl z-10">
                            <h1 className="text-3xl sm:text-5xl lg:text-7xl mb-4 sm:mb-8 hero-text leading-[1.1]">
                                Yaratıcı dünyanızın <br />
                                <i className="text-text-muted font-normal">bir parçası</i>
                            </h1>
                            <p className="text-base sm:text-xl text-text-muted mb-8 sm:mb-12 max-w-xl hero-text leading-relaxed">
                                Sanatçı tercihlerini, estetik filtreleri ve teknik seçimleri anlayan;
                                sizi süreçten dışlamayan yeni nesil kürasyon ve ilham motoru.
                            </p>
                            <div className="flex gap-4 hero-text">
                                <button className="btn-primary">Diyaloğa Başla</button>
                                <button className="btn-secondary">Süreci İzle</button>
                            </div>
                        </div>

                        <div className="absolute right-0 top-0 w-1/2 h-full hidden lg:flex items-center justify-center">
                            <div className="relative w-96 h-96">
                                <div className="absolute top-1/4 left-0 w-6 h-6 rounded-full bg-text-main shadow-[0_0_30px_rgba(45,50,53,0.4)] animate-pulse" />
                                <div className="absolute bottom-1/4 right-0 w-6 h-6 rounded-full bg-accent-blue shadow-[0_0_30px_rgba(100,180,210,0.4)] animate-pulse" />
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1px] h-64 bg-gradient-to-b from-transparent via-accent-blue to-transparent rotate-45 opacity-50" />
                            </div>
                        </div>
                    </section>

                    <section id="kesfet" className="py-32 px-[5%] bg-surface">
                        <div className="max-w-7xl mx-auto">
                            <div className="max-w-2xl mb-12">
                                <h2 className="text-5xl mb-6">Derinlikli Kürasyon</h2>
                                <p className="text-lg text-text-muted">Aradığınızı kelimelerle değil, estetik referanslarla bulun.</p>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
                                {/* FILTER SIDEBAR (Compact like articfilters.html) */}
                                <aside className="lg:sticky lg:top-32 h-fit">
                                    <div className="o-collection-filters w-full bg-white rounded-2xl shadow-sm border border-border-light/40 overflow-hidden" id="collectionFilters">
                                        <div className="p-4 bg-surface-light/30 border-b border-border-light/40">
                                            <div className="relative group">
                                                <input
                                                    type="text"
                                                    value={queryText}
                                                    onChange={(e) => setQueryText(e.target.value)}
                                                    placeholder="Eser veya sanatçı ara..."
                                                    className="w-full bg-white rounded-xl py-2 pl-9 pr-3 outline-none text-sm border border-border-light/40 focus:border-accent-blue/50"
                                                />
                                                <LucideSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
                                            </div>
                                        </div>
                                        <div className="o-collection-filters__scroll-area p-4">
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Filtreler</span>
                                                {Object.values(filters).some(arr => arr.length > 0) && (
                                                    <button onClick={clearFilters} className="text-[10px] font-bold text-red-500 hover:text-red-600 transition-colors flex items-center gap-1 uppercase tracking-wider">
                                                        <LucideTrash2 size={10} /> Temizle
                                                    </button>
                                                )}
                                            </div>

                                            <div className="o-accordion o-collection-filters__filters space-y-2">
                                                {[
                                                    { key: 'sort_options', title: 'Sort', type: 'radio', stateKey: 'sort' },
                                                    { key: 'artists', title: 'Artists', type: 'checkbox', stateKey: 'artists' },
                                                    { key: 'places', title: 'Places', type: 'checkbox', stateKey: 'places' },
                                                    { key: 'artwork_type', title: 'Artwork Type', type: 'checkbox', stateKey: 'artwork_type' },
                                                    { key: 'date', title: 'Date', type: 'custom_date', stateKey: 'date' },
                                                    { key: 'color', title: 'Color', type: 'custom_color', stateKey: 'color' },
                                                    { key: 'styles', title: 'Styles', type: 'checkbox', stateKey: 'styles' },
                                                    { key: 'subjects', title: 'Subjects', type: 'checkbox', stateKey: 'subjects' },
                                                    { key: 'classifications', title: 'Classifications', type: 'checkbox', stateKey: 'classifications' },
                                                    { key: 'medium', title: 'Medium', type: 'checkbox', stateKey: 'medium' },
                                                    { key: 'departments', title: 'Departments', type: 'checkbox', stateKey: 'departments' }
                                                ].map((section) => (
                                                    <div key={section.key} className="border border-border-light/40 rounded-xl overflow-hidden">
                                                        <p 
                                                            className="o-accordion__trigger f-tag-2 p-3 flex justify-between items-center cursor-pointer bg-surface-light/30 hover:bg-surface-light/50 transition-colors m-0"
                                                            onClick={() => toggleSection(section.key)}
                                                        >
                                                            <span className="font-semibold text-sm">
                                                                {section.title} 
                                                                {section.type === 'checkbox' && filters[section.stateKey]?.length > 0 && ` (${filters[section.stateKey].length})`}
                                                                {section.type === 'custom_color' && filters.color_hex && ` (1)`}
                                                                {section.type === 'custom_date' && (filters.date_start || filters.date_end) && ` (1)`}
                                                            </span>
                                                            <LucideChevronDown size={14} className={`transition-transform duration-300 text-text-muted ${expandedFilters[section.key] ? 'rotate-180' : ''}`} />
                                                        </p>
                                                        {expandedFilters[section.key] && (
                                                            <div className="o-accordion__panel p-3 border-t border-border-light/40 bg-white o-accordion__panel-content m-filters">
                                                                {section.type === 'checkbox' && (
                                                                    <ul className="m-filters__list max-h-[180px] overflow-y-auto space-y-1 scrollbar-hide m-0 p-0 list-none">
                                                                        {AIC_FILTERS[section.key]?.map(item => (
                                                                            <li key={item.id} className="m-0 p-0">
                                                                                <button 
                                                                                    onClick={() => toggleFilter(section.stateKey, item.id)} 
                                                                                    className={`checkbox f-secondary w-full text-left px-2 py-1.5 rounded-md text-[13px] transition-all flex items-center gap-2 ${filters[section.stateKey]?.includes(item.id) ? 'bg-accent-blue/10 text-accent-blue font-medium' : 'hover:bg-surface-light text-text-muted'}`}
                                                                                >
                                                                                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${filters[section.stateKey]?.includes(item.id) ? 'bg-accent-blue border-accent-blue text-white' : 'border-border-light'}`}>
                                                                                        {filters[section.stateKey]?.includes(item.id) && <LucideCheck size={10} strokeWidth={3} />}
                                                                                    </div>
                                                                                    <span className="truncate">{item.name}</span>
                                                                                </button>
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                )}
                                                                {section.type === 'radio' && (
                                                                    <ul className="m-filters__list max-h-[180px] overflow-y-auto space-y-1 scrollbar-hide m-0 p-0 list-none">
                                                                        {AIC_FILTERS[section.key]?.map(item => (
                                                                            <li key={item.id} className="m-0 p-0">
                                                                                <button 
                                                                                    onClick={() => setFilters(prev => ({...prev, sort: item.id}))} 
                                                                                    className={`checkbox f-secondary w-full text-left px-2 py-1.5 rounded-md text-[13px] transition-all flex items-center gap-2 ${filters.sort === item.id ? 'bg-accent-blue/10 text-accent-blue font-medium' : 'hover:bg-surface-light text-text-muted'}`}
                                                                                >
                                                                                    <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${filters.sort === item.id ? 'bg-accent-blue border-accent-blue text-white' : 'border-border-light'}`}>
                                                                                        {filters.sort === item.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                                                                    </div>
                                                                                    <span className="truncate">{item.name}</span>
                                                                                </button>
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                )}
                                                                {section.type === 'custom_color' && (
                                                                    <div className="flex flex-col gap-3">
                                                                        <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Color values (HEX)</label>
                                                                        <div className="flex items-center gap-2">
                                                                            <input 
                                                                                type="color" 
                                                                                value={filters.color_hex || '#ff3e3e'} 
                                                                                onChange={(e) => setFilters(prev => ({...prev, color_hex: e.target.value}))}
                                                                                className="w-10 h-10 rounded cursor-pointer border-0 p-0"
                                                                            />
                                                                            <input 
                                                                                type="text" 
                                                                                className="f-secondary outline-none border border-border-light/40 rounded px-2 py-1 w-full text-sm uppercase" 
                                                                                value={filters.color_hex || ''}
                                                                                placeholder="#RRGGBB"
                                                                                onChange={(e) => setFilters(prev => ({...prev, color_hex: e.target.value}))}
                                                                            />
                                                                        </div>
                                                                        <button 
                                                                            onClick={() => {
                                                                                if (!filters.color_hex) setFilters(prev => ({...prev, color_hex: '#ff3e3e'}));
                                                                            }} 
                                                                            className="o-color-picker__submit bg-surface-light hover:bg-border-light/40 text-text-main text-sm font-semibold py-2 px-4 rounded-md transition-colors w-full flex justify-center items-center gap-2"
                                                                        >
                                                                            <span style={{ backgroundColor: filters.color_hex || '#ff3e3e' }} className="w-3 h-3 rounded-full inline-block"></span>
                                                                            Seç ve Uygula
                                                                        </button>
                                                                        {filters.color_hex && (
                                                                            <button onClick={() => setFilters(prev => ({...prev, color_hex: ''}))} className="text-xs text-red-500 hover:text-red-600 font-medium text-center">Rengi Temizle</button>
                                                                        )}
                                                                    </div>
                                                                )}
                                                                {section.type === 'custom_date' && (
                                                                    <div className="flex flex-col gap-3">
                                                                        <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Tarih Aralığı (Yıl)</label>
                                                                        <div className="flex items-center gap-2">
                                                                            <input 
                                                                                type="number" 
                                                                                className="f-secondary outline-none border border-border-light/40 rounded px-2 py-1 w-full text-sm" 
                                                                                value={filters.date_start || ''}
                                                                                placeholder="Başlangıç"
                                                                                onChange={(e) => setFilters(prev => ({...prev, date_start: e.target.value ? parseInt(e.target.value) : undefined}))}
                                                                            />
                                                                            <span className="text-text-muted">-</span>
                                                                            <input 
                                                                                type="number" 
                                                                                className="f-secondary outline-none border border-border-light/40 rounded px-2 py-1 w-full text-sm" 
                                                                                value={filters.date_end || ''}
                                                                                placeholder="Bitiş"
                                                                                onChange={(e) => setFilters(prev => ({...prev, date_end: e.target.value ? parseInt(e.target.value) : undefined}))}
                                                                            />
                                                                        </div>
                                                                        {(filters.date_start !== undefined || filters.date_end !== undefined) && (
                                                                            <button onClick={() => setFilters(prev => ({...prev, date_start: undefined, date_end: undefined}))} className="text-xs text-red-500 hover:text-red-600 font-medium text-center mt-2">Tarihi Temizle</button>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </aside>

                                {/* RESULTS GRID & LIGHTBOX */}
                                <main className="relative min-h-[600px]">
                                    {loading && (
                                        <div className="absolute inset-0 z-20 bg-background/50 backdrop-blur-sm flex items-center justify-center rounded-[2rem]">
                                            <div className="flex flex-col items-center">
                                                <LucideRefreshCcw size={32} className="text-accent-blue animate-spin mb-4" />
                                                <span className="text-sm font-bold uppercase tracking-widest text-text-muted animate-pulse">Eserler Yükleniyor...</span>
                                            </div>
                                        </div>
                                    )}
                                    
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {artworks.length > 0 ? artworks.map((art, i) => (
                                            <div 
                                                key={art.id || i} 
                                                className="group relative aspect-square bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 cursor-pointer border border-border-light/40"
                                                onClick={() => setEnlargedArtwork(art)}
                                            >
                                                <img
                                                    src={art.thumbnail || art.image_url}
                                                    alt={art.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                                    loading="lazy"
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                        e.target.parentElement.innerHTML = `<div class="w-full h-full bg-surface-light flex items-center justify-center text-xs text-text-muted text-center p-4">${art.title}</div>`;
                                                    }}
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end">
                                                    <div className="p-4 w-full transform translate-y-2 group-hover:translate-y-0 transition-transform">
                                                        <h4 className="text-sm font-bold text-white mb-1 line-clamp-1">{art.title}</h4>
                                                        {art.artist && <p className="text-[10px] text-white/80 line-clamp-1">{art.artist}</p>}
                                                    </div>
                                                </div>
                                            </div>
                                        )) : (
                                            !loading && (
                                                <div className="col-span-full flex flex-col items-center justify-center py-32 text-text-muted bg-white rounded-3xl border border-dashed border-border-light/60">
                                                    <LucideSearch size={48} className="mb-4 opacity-20" />
                                                    <p>Kriterlere uygun sonuç bulunamadı.</p>
                                                    <button onClick={clearFilters} className="mt-4 text-xs font-bold text-accent-blue uppercase tracking-widest hover:underline">Filtreleri Temizle</button>
                                                </div>
                                            )
                                        )}
                                    </div>

                                    {totalPages > 1 && (
                                        <div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-6">
                                            <p className="text-sm text-text-muted order-2 sm:order-1">
                                                Sayfa <span className="font-bold text-text-main">{page}</span> / <span className="font-bold text-text-main">{totalPages}</span>
                                                {totalArtworks > 0 && (
                                                    <span className="ml-2" title="Artic.edu tüm eserleri sayar; bizde sadece görseli olan eserler gösterilir.">
                                                        ({totalArtworks.toLocaleString('tr-TR')} sonuç, görseli olanlar)
                                                    </span>
                                                )}
                                            </p>
                                            <div className="flex items-center gap-2 order-1 sm:order-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                                    disabled={page <= 1}
                                                    className="px-4 py-2.5 rounded-xl text-sm font-bold border border-border-light/60 bg-white hover:bg-surface-light disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                                >
                                                    Önceki
                                                </button>
                                                <div className="flex items-center gap-1">
                                                    {(() => {
                                                        const show = 5;
                                                        let start = Math.max(1, page - Math.floor(show / 2));
                                                        let end = Math.min(totalPages, start + show - 1);
                                                        if (end - start + 1 < show) start = Math.max(1, end - show + 1);
                                                        const pages = [];
                                                        if (start > 1) {
                                                            pages.push(1);
                                                            if (start > 2) pages.push('…');
                                                        }
                                                        for (let i = start; i <= end; i++) pages.push(i);
                                                        if (end < totalPages) {
                                                            if (end < totalPages - 1) pages.push('…');
                                                            pages.push(totalPages);
                                                        }
                                                        return pages.map((p, i) =>
                                                            p === '…' ? (
                                                                <span key={`ellip-${i}`} className="px-2 text-text-muted">…</span>
                                                            ) : (
                                                                <button
                                                                    key={p}
                                                                    type="button"
                                                                    onClick={() => setPage(p)}
                                                                    className={`min-w-[2.25rem] h-9 rounded-xl text-sm font-bold transition-all ${page === p ? 'bg-accent-blue text-white shadow-md shadow-accent-blue/25' : 'bg-white border border-border-light/60 hover:bg-surface-light text-text-main'}`}
                                                                >
                                                                    {p}
                                                                </button>
                                                            )
                                                        );
                                                    })()}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                                    disabled={page >= totalPages}
                                                    className="px-4 py-2.5 rounded-xl text-sm font-bold border border-border-light/60 bg-white hover:bg-surface-light disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                                >
                                                    Sonraki
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </main>

                                {/* LIGHTBOX MODAL WITH ROOM SELECTOR */}
                                {enlargedArtwork && (
                                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-background/90 backdrop-blur-sm" onClick={() => setEnlargedArtwork(null)}>
                                        <div 
                                            className="bg-white rounded-3xl overflow-hidden shadow-2xl border border-border-light/40 w-full max-w-5xl max-h-[90vh] flex flex-col md:flex-row relative animate-in zoom-in-95 duration-300"
                                            onClick={e => e.stopPropagation()}
                                        >
                                            <button 
                                                onClick={() => setEnlargedArtwork(null)}
                                                className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/50 backdrop-blur-md shadow-sm border border-white/50 flex items-center justify-center text-text-main hover:bg-white hover:text-red-500 transition-all hover:scale-105"
                                            >
                                                <LucideX size={20} />
                                            </button>

                                            {/* Image Area */}
                                            <div className="md:w-[60%] bg-[#F5F5F5] flex items-center justify-center p-6 min-h-[40vh] md:min-h-[70vh]">
                                                <img 
                                                    src={enlargedArtwork.image_url || enlargedArtwork.thumbnail} 
                                                    alt={enlargedArtwork.title} 
                                                    className="max-w-full max-h-[80vh] rounded-xl object-contain shadow-2xl"
                                                />
                                            </div>

                                            {/* Details & Actions Area */}
                                            <div className="md:w-[40%] p-8 flex flex-col bg-white overflow-y-auto">
                                                <div className="flex-1">
                                                    <h3 className="text-2xl font-serif font-bold text-text-main mb-2 leading-tight pr-8">{enlargedArtwork.title}</h3>
                                                    {enlargedArtwork.artist && (
                                                        <p className="text-text-muted font-medium mb-6 flex items-center gap-2">
                                                            <div className="w-1 h-1 rounded-full bg-accent-blue"></div>
                                                            {enlargedArtwork.artist}
                                                        </p>
                                                    )}
                                                    
                                                    <div className="space-y-4 mb-6 pt-4 border-t border-border-light/30">
                                                        {enlargedArtwork.medium && (
                                                            <div>
                                                                <span className="block text-[10px] font-black uppercase tracking-widest text-text-muted/60 mb-1">Teknik & Tür</span>
                                                                <p className="text-sm font-medium text-text-main">{enlargedArtwork.medium}</p>
                                                            </div>
                                                        )}
                                                        {enlargedArtwork.style && (
                                                            <div>
                                                                <span className="block text-[10px] font-black uppercase tracking-widest text-text-muted/60 mb-1">Akım / Stil</span>
                                                                <p className="text-sm font-medium text-text-main">{enlargedArtwork.style}</p>
                                                            </div>
                                                        )}
                                                        {enlargedArtwork.place && (
                                                            <div>
                                                                <span className="block text-[10px] font-black uppercase tracking-widest text-text-muted/60 mb-1">Coğrafya</span>
                                                                <p className="text-sm font-medium text-text-main">{enlargedArtwork.place}</p>
                                                            </div>
                                                        )}
                                                                                          <div className="pt-6 border-t border-border-light/40 mt-auto">
                                                    {user ? (
                                                        <div className="space-y-4">
                                                            <div className="flex flex-col gap-2">
                                                                <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">Buraya Ekle:</label>
                                                                
                                                                {userRooms.length > 0 ? (
                                                                    <RoomSelector 
                                                                        userRooms={userRooms} 
                                                                        selectedRoomId={selectedRoomId} 
                                                                        onSelectRoom={setSelectedRoomId}
                                                                        placeholder="Oda Seçiniz"
                                                                    />
                                                                ) : (
                                                                    <p className="text-xs text-orange-500 font-medium bg-orange-50 p-3 rounded-xl border border-orange-100">Henüz katıldığın bir ilham odası yok.</p>
                                                                )}
                                                            </div>

                                                            <button 
                                                                onClick={() => handleRemoteAddArtwork(enlargedArtwork)}
                                                                disabled={!selectedRoomId || selectedRoomId === ''}
                                                                className="w-full bg-accent-blue hover:bg-accent-blue-hover text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-accent-blue/20 disabled:opacity-50 disabled:cursor-not-allowed group active:scale-95"
                                                            >
                                                                <LucidePlus size={18} className="group-hover:scale-110 transition-transform" /> 
                                                                İlham Odasına Gönder
                                                            </button>
                                                        </div>
                                                     ) : (
                                                         <div className="bg-surface-light/50 p-4 rounded-2xl border border-border-light/40 text-center">
                                                             <p className="text-sm font-medium text-text-main mb-3">İlham odasına eklemek için giriş yapmalısın.</p>
                                                             <button onClick={() => { setEnlargedArtwork(null); setIsLoginOpen(true); }} className="text-xs font-bold bg-white px-4 py-2 rounded-lg border border-border-light hover:bg-text-main hover:text-white transition-colors">Giriş Yap</button>
                                                         </div>
                                                     )}
                                                 </div>
                                             </div>
                                         </div>
                                     </div>
                                 </div>
                             </div>
                         )}
                     </div>
                 </div>
             </section>


                    <section id="partner" className="py-20 bg-background">
                        <div className="mt-20">
                            <KibelePartner />
                        </div>
                    </section>

                    {user ? (
                        <section id="inspiration-rooms" className="py-20 bg-surface">
                            <InspirationSystem onEnterRoom={handleRoomClick} />
                        </section>
                    ) : (
                        <section id="hubs" className="py-32 px-[5%] bg-surface">
                            <div className="max-w-7xl mx-auto relative">
                                <div className="max-w-2xl mb-20">
                                    <h2 className="text-5xl mb-6">İlham Odaları</h2>
                                    <p className="text-lg text-text-muted">Estetik kümelenmeleri keşfedin.</p>
                                </div>

                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 relative">
                                    {rooms.map((room) => (
                                        <div
                                            key={room.id}
                                            onClick={() => handleRoomClick(room)}
                                            className={`p-6 rounded-3xl transition-all duration-500 group cursor-pointer hover:-translate-y-1.5 ${room.isPrivate ? 'bg-text-main text-white shadow-xl shadow-text-main/10' : 'bg-background glass-card hover:bg-white border border-border-light/50'}`}
                                        >
                                            <div className="text-2xl mb-4">{room.isPrivate ? '🔒' : '✨'}</div>
                                            <h3 className="text-lg font-bold mb-2 line-clamp-1">{room.name}</h3>
                                            <p className={`text-xs ${room.isPrivate ? 'text-white/60' : 'text-text-muted'} line-clamp-2`}>
                                                {room.isPrivate ? 'Erişim izni gereklidir.' : room.description || 'Açık ilham odası.'}
                                            </p>
                                        </div>
                                    ))}

                                    {isAdmin && (
                                        <button
                                            onClick={() => setIsCreateModalOpen(true)}
                                            className="p-6 rounded-3xl border-2 border-dashed border-text-main/10 flex flex-col items-center justify-center gap-2 hover:border-accent-blue hover:text-accent-blue transition-all group cursor-pointer bg-surface-light/30"
                                        >
                                            <LucidePlus size={24} className="opacity-20 group-hover:opacity-100" />
                                            <span className="font-serif text-base">Yeni Oda Aç</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </section>
                    )}

                    <footer className="footer">
                        <div className="footer-content">
                            <div className="footer-brand">
                                <h2>Kibele.</h2>
                                <p>Sanat ve teknoloji arasında <br />ilham verici bir köprü.</p>
                            </div>
                            <div className="footer-links">
                                <div className="link-column">
                                    <h4>Platform</h4>
                                    <a href="#">Kürasyon</a>
                                    <a href="#">Sanatçılar</a>
                                    <a href="#">Topluluk</a>
                                </div>
                                <div className="link-column">
                                    <h4>Şirket</h4>
                                    <h4>Manifesto</h4>
                                    <a href="#">İletişim</a>
                                    <a href="#">Gizlilik</a>
                                </div>
                            </div>
                        </div>
                        <div className="footer-bottom">
                            <p>&copy; 2026 Kibele. Tüm hakları bir sanatçıya aittir.</p>
                        </div>
                    </footer>

                    <RegisterModal
                        isOpen={isRegisterOpen}
                        onClose={() => setIsRegisterOpen(false)}
                    />

                    <LoginModal
                        isOpen={isLoginOpen}
                        onClose={() => setIsLoginOpen(false)}
                    />

                    <RequestActionModal
                        requestId={selectedRequestId}
                        isOpen={isRequestModalOpen}
                        onClose={() => setIsRequestModalOpen(false)}
                    />
                </div>
            )}
        </>
    );
}

export default App;
