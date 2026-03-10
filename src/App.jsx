import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { LucideHome, LucideLayers, LucideMessageSquare, LucideUser, LucidePlus, LucideChevronDown, LucideSearch, LucideBell } from 'lucide-react';
import { fetchAICArtworks } from './services/aicApi';
import { useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import KibelePartner from './components/KibelePartner';
import InspirationSystem from './components/InspirationSystem';
import AdminPanel from './components/AdminPanel';
import RegisterModal from './components/RegisterModal';
import LoginModal from './components/LoginModal';
import NotificationDropdown from './components/NotificationDropdown';
import RequestActionModal from './components/RequestActionModal';
import { auth, db } from './firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { subscribeToRooms, requestRoomAccess } from './services/dbService';

import RoomRequestView from './views/RoomView/RoomRequestView';
import InspirationWorkspace from './views/RoomView/InspirationWorkspace';

gsap.registerPlugin(ScrollTrigger);

function App() {
    const heroRef = useRef(null);
    const { user, isAdmin } = useAuth();

    // States
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);
    const [artworks, setArtworks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [rooms, setRooms] = useState([]);
    const [currentView, setCurrentView] = useState('hub'); // hub, request, workspace
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [userRequests, setUserRequests] = useState([]);
    const [isDashboardOpen, setIsDashboardOpen] = useState(false);
    const [selectedRequestId, setSelectedRequestId] = useState(null);
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

    const [filters, setFilters] = useState({
        query: '',
        technique: '',
        movement: '',
        geography: '',
        medium: 'painting',
        style: '',
        place: '',
        color: 'blue'
    });
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

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
        setPage(1);
    }, [filters.medium, filters.style, filters.place]);

    const handleFetchArtworks = async () => {
        setLoading(true);
        const data = await fetchAICArtworks({
            page: page,
            filters: {
                medium: filters.medium,
                style: filters.style,
                place: filters.place
            }
        });
        setArtworks(data.items || []);
        setTotalPages(data.totalPages || 1);
        setLoading(false);
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
            alert("İstek gönderilirken bir hata oluştu: " + error.message);
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
    return (
        <ToastProvider>
            {currentView === 'request' ? (
                <RoomRequestView
                    room={selectedRoom}
                    onBack={() => setCurrentView('hub')}
                    onRequestAccess={(reason) => handleRequestAccess(reason)}
                    isPending={userRequests.some(r => r.roomId === selectedRoom?.id && r.status === 'pending')}
                />
            ) : currentView === 'workspace' ? (
                <InspirationWorkspace room={selectedRoom} onBack={() => setCurrentView('hub')} />
            ) : (
                <div className="min-h-screen bg-background text-text-main font-sans selection:bg-accent-blue selection:text-white">
                    <AdminPanel rooms={rooms} openOverride={isDashboardOpen} onOpenChange={setIsDashboardOpen} />

                    <nav className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-5xl transition-all duration-500">
                        <div className="glass-card px-8 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <img src="./logo.svg" alt="Kibele Logo" className="w-9 h-9" />
                                <div className="font-serif text-2xl font-bold tracking-tight">Kibele.</div>
                            </div>
                            <div className="hidden lg:flex items-center gap-10 text-xs font-bold uppercase tracking-widest text-text-muted">
                                <a href="#kesfet" className="hover:text-accent-blue transition-colors">Keşfet</a>
                                <a href="#nasil-calisir" className="hover:text-accent-blue transition-colors">Yöntem</a>
                                <a href="#inspiration-rooms" className="hover:text-accent-blue transition-colors">İlham Odaları</a>
                            </div>
                            <div className="flex items-center gap-4">
                                {user ? (
                                    <div className="flex items-center gap-4">
                                        {isAdmin && (
                                            <button
                                                onClick={() => setIsDashboardOpen(true)}
                                                className="p-2.5 text-accent-blue hover:bg-accent-blue/5 rounded-full transition-all relative group"
                                                title="Yönetim Paneli"
                                            >
                                                <LucideLayers size={21} />
                                            </button>
                                        )}

                                        <NotificationDropdown onRequestClick={(id) => {
                                            setSelectedRequestId(id);
                                            setIsRequestModalOpen(true);
                                        }} />

                                        <div className="flex items-center gap-3 pl-4 border-l border-border-light">
                                            <div className="flex flex-col items-end hidden sm:flex">
                                                <span className="text-xs font-bold text-text-main leading-tight">
                                                    {user.displayName || user.email.split('@')[0]}
                                                </span>
                                                <button onClick={handleLogout} className="text-[10px] font-bold text-text-muted hover:text-red-500 uppercase tracking-tighter transition-colors">Çıkış Yap</button>
                                            </div>
                                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-accent-blue to-accent-blue-hover flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-accent-blue/20 ring-2 ring-white">
                                                {user.displayName?.charAt(0) || user.email?.charAt(0).toUpperCase()}
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

                    <section ref={heroRef} className="h-screen flex items-center px-[5%] relative overflow-hidden">
                        <div className="max-w-4xl z-10">
                            <h1 className="text-7xl mb-8 hero-text leading-[1.1]">
                                Sizin yaratıcı dünyanızın <br />
                                <i className="text-text-muted font-normal">bir parçası</i>, <br />
                                işinizin sonu <span className="text-accent-blue">değil.</span>
                            </h1>
                            <p className="text-xl text-text-muted mb-12 max-w-xl hero-text leading-relaxed">
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
                        <div className="max-w-2xl mb-20">
                            <h2 className="text-5xl mb-6">Derinlikli Kürasyon</h2>
                            <p className="text-lg text-text-muted">Aradığınızı kelimelerle değil, estetik referanslarla bulun.</p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-12 lg:gap-16">
                            <aside className="lg:sticky lg:top-32 h-fit">
                                <div className="glass-card p-6 lg:p-8">
                                    <h3 className="text-sm font-semibold mb-6 uppercase tracking-wider text-text-muted">Filtreler</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-8">
                                        <div>
                                            <div className="flex justify-between items-center mb-4 cursor-pointer group" onClick={() => setFilters(prev => ({ ...prev, techniqueOpen: !prev.techniqueOpen }))}>
                                                <span className="font-medium group-hover:text-accent-blue transition-colors">Teknik</span>
                                                <LucideChevronDown size={16} />
                                            </div>
                                            <div className="space-y-3 pl-2">
                                                {['painting', 'photography', 'sculpture', 'textile', 'print'].map(m => (
                                                    <label key={m} className="flex items-center gap-3 cursor-pointer group">
                                                        <input type="checkbox" className="hidden" checked={filters.medium === m} onChange={() => setFilters(prev => ({ ...prev, medium: m }))} />
                                                        <div className={`w-4 h-4 border transition-all rounded ${filters.medium === m ? 'bg-accent-blue border-accent-blue' : 'border-text-muted group-hover:border-accent-blue'}`} />
                                                        <span className={`text-sm capitalize ${filters.medium === m ? 'text-text-main font-medium' : 'text-text-muted'}`}>{m}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between items-center mb-4 cursor-pointer group" onClick={() => setFilters(prev => ({ ...prev, movementOpen: !prev.movementOpen }))}>
                                                <span className="font-medium group-hover:text-accent-blue transition-colors">Sanat Akımı</span>
                                                <LucideChevronDown size={16} />
                                            </div>
                                            <div className="space-y-3 pl-2">
                                                {['Modernism', 'Impressionism', 'Surrealism', 'Ancient Egyptian', 'Pop Art'].map(s => (
                                                    <label key={s} className="flex items-center gap-3 cursor-pointer group">
                                                        <input type="checkbox" className="hidden" checked={filters.style === s} onChange={() => setFilters(prev => ({ ...prev, style: s }))} />
                                                        <div className={`w-4 h-4 border transition-all rounded ${filters.style === s ? 'bg-accent-blue border-accent-blue' : 'border-text-muted group-hover:border-accent-blue'}`} />
                                                        <span className={`text-sm capitalize ${filters.style === s ? 'text-text-main font-medium' : 'text-text-muted'}`}>{s}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between items-center mb-4 cursor-pointer group" onClick={() => setFilters(prev => ({ ...prev, geographyOpen: !prev.geographyOpen }))}>
                                                <span className="font-medium group-hover:text-accent-blue transition-colors">Coğrafya</span>
                                                <LucideChevronDown size={16} />
                                            </div>
                                            <div className="space-y-3 pl-2">
                                                {['France', 'Japan', 'Egypt', 'Netherlands', 'USA'].map(p => (
                                                    <label key={p} className="flex items-center gap-3 cursor-pointer group">
                                                        <input type="checkbox" className="hidden" checked={filters.place === p} onChange={() => setFilters(prev => ({ ...prev, place: p }))} />
                                                        <div className={`w-4 h-4 border transition-all rounded ${filters.place === p ? 'bg-accent-blue border-accent-blue' : 'border-text-muted group-hover:border-accent-blue'}`} />
                                                        <span className={`text-sm capitalize ${filters.place === p ? 'text-text-main font-medium' : 'text-text-muted'}`}>{p}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between items-center mb-4">
                                                <span className="font-medium">Renk</span>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {['black', 'white', 'red', 'yellow', 'blue', 'green'].map(c => (
                                                    <button key={c} onClick={() => setFilters(prev => ({ ...prev, color: c }))} className={`w-8 h-8 rounded-full border-2 transition-all ${filters.color === c ? 'border-text-main scale-110 shadow-md' : 'border-transparent hover:scale-105'}`} style={{ backgroundColor: c === 'white' ? '#fff' : c, border: c === 'white' ? '1px solid #ddd' : '' }} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </aside>

                            <main className="relative min-h-[600px]">
                                {loading && (
                                    <div className="absolute inset-0 z-20 bg-background/50 backdrop-blur-sm flex items-center justify-center rounded-[2rem]">
                                        <div className="w-12 h-12 border-4 border-accent-blue border-t-transparent rounded-full animate-spin" />
                                    </div>
                                )}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                    {artworks.length > 0 ? artworks.map((art, i) => (
                                        <div key={art.id || i} className="group relative aspect-[4/5] rounded-[2rem] overflow-hidden bg-white shadow-sm cursor-pointer hover:shadow-xl transition-all duration-700">
                                            <img
                                                src={art.image_url || art.thumbnail}
                                                alt={art.title}
                                                className="absolute inset-0 w-full h-full object-cover transition-all duration-700"
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                    e.target.parentElement.classList.add('bg-surface-light', 'flex', 'items-center', 'justify-center');
                                                    // Fallback image as last resort
                                                    const fallbackImg = "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=800&auto=format&fit=crop";
                                                    if (e.target.src !== fallbackImg) {
                                                        e.target.src = fallbackImg;
                                                        e.target.style.display = 'block';
                                                        e.target.className += " grayscale opacity-30";
                                                    }
                                                }}
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-700" />
                                            <div className="absolute bottom-0 left-0 w-full p-8 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 bg-gradient-to-t from-background to-transparent">
                                                <h4 className="text-2xl mb-1 line-clamp-1">{art.title}</h4>
                                                <div className="flex gap-2 flex-wrap">
                                                    <span className="text-xs text-text-muted capitalize bg-surface-light px-2 py-1 rounded-md">{art.medium}</span>
                                                    {art.style && <span className="text-xs text-accent-blue bg-accent-blue/5 px-2 py-1 rounded-md">{art.style}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    )) : (
                                        !loading && (
                                            <div className="col-span-full flex flex-col items-center justify-center py-32 text-text-muted">
                                                <LucideSearch size={48} className="mb-4 opacity-20" />
                                                <p>Kriterlere uygun sonuç bulunamadı.</p>
                                            </div>
                                        )
                                    )}
                                </div>

                                {totalPages > 1 && (
                                    <div className="mt-16 flex justify-center items-center gap-3">
                                        {[...Array(Math.min(totalPages, 7))].map((_, i) => {
                                            const pageNum = i + 1;
                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => setPage(pageNum)}
                                                    className={`w-3 h-3 rounded-full transition-all duration-300 ${page === pageNum ? 'bg-accent-blue scale-125' : 'bg-text-muted/20 hover:bg-accent-blue/40'}`}
                                                    title={`Sayfa ${pageNum}`}
                                                />
                                            );
                                        })}
                                        {totalPages > 7 && <span className="text-text-muted text-xs">...</span>}
                                    </div>
                                )}
                            </main>
                        </div>
                    </section>

                    <section id="nasil-calisir" className="py-32 px-[5%] bg-background">
                        <div className="max-w-2xl mx-auto text-center mb-20">
                            <h2 className="text-5xl mb-6">Yaratıcı Diyalog Nasıl İşler?</h2>
                            <p className="text-lg text-text-muted">Kontrol her zaman sizde. Kibele, süreci devralmaz, sürece ilham katar.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                            {[
                                { num: "01", title: "Seçim & Analiz", desc: "Mevcut taslaklarınızı veya beğendiğiniz sanatçıların tarzlarını yükleyin. Yapay zeka, yönelimlerinizi estetik bir dille analiz eder." },
                                { num: "02", title: "Eşleşme & Sentez", desc: "Seçtiğiniz parametrelere göre (renk paleti, akım) kendi tarzınız ile global ilham kaynaklarını harmanlar.", active: true },
                                { num: "03", title: "Yeni Perspektivler", desc: "Doğrudan 'bitmiş iş' üretmek yerine, size yeni dokular, formlar ve kompozisyon yolları önerir." }
                            ].map((step, i) => (
                                <div key={i} className={`p-12 rounded-[2rem] border transition-all duration-500 group hover:-translate-y-2 ${step.active ? 'bg-white border-accent-blue/30 shadow-xl shadow-accent-blue/5' : 'bg-surface-light/50 border-transparent hover:bg-white hover:shadow-xl'}`}>
                                    <div className={`font-serif text-6xl mb-6 italic transition-colors duration-500 ${step.active ? 'text-accent-blue opacity-100' : 'text-text-muted opacity-20 group-hover:text-accent-blue group-hover:opacity-100'}`}>{step.num}</div>
                                    <h3 className="text-2xl mb-4">{step.title}</h3>
                                </div>
                            ))}
                        </div>

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
                                    <p className="text-lg text-text-muted">Kendi disiplininize özel eğitilmiş estetik kümelenmeleri keşfedin.</p>
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

                                    <button
                                        onClick={() => setIsLoginOpen(true)}
                                        className="p-6 rounded-3xl border-2 border-dashed border-text-main/10 flex flex-col items-center justify-center gap-2 hover:border-accent-blue hover:text-accent-blue transition-all group cursor-pointer bg-surface-light/30"
                                    >
                                        <LucidePlus size={24} className="opacity-20 group-hover:opacity-100" />
                                        <span className="font-serif text-base">Yeni Oda Aç</span>
                                    </button>
                                </div>
                            </div>
                        </section>
                    )}

                    <footer className="footer">
                        <div className="footer-content">
                            <div className="footer-brand">
                                <h2>Kibele.</h2>
                                <p>Yapay zeka işinizi elinizden almayacak, <br />aksine hayal gücünüzün sınırlarını genişletecek.</p>
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
        </ToastProvider>
    );
}

export default App;
