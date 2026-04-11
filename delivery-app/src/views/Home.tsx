import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { socket } from '../services/socket';
import type { Product, StoreStatus, Client, BusinessSettings } from '../types';
import { Icons } from '../constants';
import { useCart } from '../CartContext';
import CustomAlert from '../components/CustomAlert';
import CompleteProfileModal from '../components/CompleteProfileModal';
import ProfilePhotoModal from '../components/ProfilePhotoModal';
import ProfileQuickModal from '../components/ProfileQuickModal';
import NotificationCenterModal from '../components/NotificationCenterModal';
import ChangePasswordModal from '../components/ChangePasswordModal';
import EngagementModal from '../components/EngagementModal';
import { useUI } from '../UIContext';
import { formatCurrency } from '../services/formatUtils';

// Swiper Imports
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

import CheckoutTab from '../components/CheckoutTab';

const Home: React.FC = () => {
    const { addToCart, items, total } = useCart();
    const navigate = useNavigate();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState<'CARDAPIO' | 'CARRINHO'>('CARDAPIO');
    const { setIsSidebarOpen } = useUI();
    const [showMenu, setShowMenu] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState('Todos');
    const [storeStatus, setStoreStatus] = useState<StoreStatus | null>(null);
    const [settings, setSettings] = useState<BusinessSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [client, setClient] = useState<Client | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showLogoutAlert, setShowLogoutAlert] = useState(false);
    const [showCompleteProfile, setShowCompleteProfile] = useState(false);
    const [showProfilePhotoModal, setShowProfilePhotoModal] = useState(false);
    const [showProfileQuickModal, setShowProfileQuickModal] = useState(false);
    const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
    const [showNotificationCenter, setShowNotificationCenter] = useState(false);
    const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
    const [highlightCampaign, setHighlightCampaign] = useState<any | null>(null);
    const [showIncompleteAlert, setShowIncompleteAlert] = useState(false);

    // Pizza States
    const [selectedPizzaForLaunch, setSelectedPizzaForLaunch] = useState<Product | null>(null);
    const [pizzaFlavors, setPizzaFlavors] = useState<Product[]>([]);
    const [isPizzaSelectionMode, setIsPizzaSelectionMode] = useState(false);
    const [pizzaModalQuantity, setPizzaModalQuantity] = useState(1);
    const [pizzaObservation, setPizzaObservation] = useState('');

    // Biometric States
    const [isBiometricLoading, setIsBiometricLoading] = useState(false);
    const [isValidatingBiometric, setIsValidatingBiometric] = useState(false);
    const [biometricError, setBiometricError] = useState('');

    const isProfileIncomplete = !!(client && (client.phone === '00000000000' || !client.street || !client.cep));


    useEffect(() => {
        async function fetchNotifications(clientId: string) {
            try {
                const res = await api.getNotifications(clientId);
                // Calcula não lidos
                const readCampaigns: string[] = JSON.parse(localStorage.getItem('delivery_app_read_campaigns') || '[]');
                const readCoupons: string[] = JSON.parse(localStorage.getItem('delivery_app_read_coupons') || '[]');

                let unreadCount = 0;
                res.campaigns.forEach(c => { if (!readCampaigns.includes(c.id)) unreadCount++; });
                res.coupons.forEach(c => { if (!readCoupons.includes(c.id)) unreadCount++; });
                
                setUnreadNotificationsCount(unreadCount);

                // Highlight In-App Modal (Só mostra a 1ª In-App não lida por vez)
                const unreadInAppCampaign = res.campaigns.find(c => !readCampaigns.includes(c.id) && (c.type === 'IN_APP' || c.type === 'BOTH'));
                if (unreadInAppCampaign) {
                    setHighlightCampaign(unreadInAppCampaign);
                }
            } catch (e) {
                console.error('Error fetching unread notifications:', e);
            }
        }

        const clientStr = localStorage.getItem('delivery_app_client');
        if (clientStr) {
            try {
                const data = JSON.parse(clientStr);
                setClient(data);
                // Dispara a busca local imediatamente após achar o client
                fetchNotifications(data.id);
            } catch (e) {
                console.error("Error parsing client data", e);
            }
        }
        const fetchInitialData = async () => {
            try {
                const [p, status, s] = await Promise.all([
                    api.getProducts(),
                    api.getStoreStatus(),
                    api.getSettings()
                ]);
                setProducts(p);
                const cats = Array.from(new Set(p.map((prod: Product) => prod.category)));
                setCategories(['Todos', ...cats]);
                setStoreStatus(status as StoreStatus);
                setSettings(s as BusinessSettings);
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };

        fetchInitialData();

        // Polling settings every 15s to update Delivery ON/OFF status
        const interval = setInterval(async () => {
            try {
                const [status] = await Promise.all([
                    api.getStoreStatus()
                ]);
                setStoreStatus(status as StoreStatus);
            } catch (e) {
                console.error("Error polling settings", e);
            }
        }, 15000);

        socket.on('store_status_changed', (newStatus: StoreStatus) => {
            setStoreStatus(newStatus);
        });

        return () => {
            clearInterval(interval);
            socket.off('store_status_changed');
        };
    }, []);

    useEffect(() => {
        if (location.state?.openQuickModal) {
            setShowProfileQuickModal(true);
            // Clear state to avoid reopening on refresh
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    const handleToggleBiometric = async (isActive: boolean) => {
        if (!client) return;
        
        if (isActive) {
            // Desativar biometria
            try {
                setIsBiometricLoading(true);
                await api.deactivateBiometrics(client.id);
                const updatedClient = { ...client, webauthnId: undefined };
                localStorage.setItem('delivery_app_client', JSON.stringify(updatedClient));
                localStorage.removeItem(`biometric_enabled_${client.phone}`);
                setClient(updatedClient);
            } catch (err: any) {
                console.error('Biometric Deactivation Error:', err);
                setBiometricError(err.message || 'Erro ao desativar biometria.');
            } finally {
                setIsBiometricLoading(false);
            }
        } else {
            // Ativar biometria (código existente)
            try {
                setIsBiometricLoading(true);
                setIsValidatingBiometric(true);

                const options = await api.getBiometricRegisterOptions(client.id);
                
                const { startRegistration } = await import('@simplewebauthn/browser');
                const credential = await startRegistration({ optionsJSON: options });
                
                await api.verifyBiometricRegister(client.id, credential);
                
                // Update local client data
                const updatedClient = { ...client, webauthnId: 'configured' };
                localStorage.setItem('delivery_app_client', JSON.stringify(updatedClient));
                localStorage.setItem(`biometric_enabled_${client.phone}`, 'true');
                setClient(updatedClient);
            } catch (err: any) {
                console.error('Biometric Error:', err);
                const message = err.name === 'NotAllowedError' 
                    ? 'Operação cancelada ou tempo esgotado.' 
                    : (err.message || 'Erro ao configurar biometria.');
                
                setBiometricError(message);
            } finally {
                setIsBiometricLoading(false);
                setIsValidatingBiometric(false);
            }
        }
    };

    const filteredProducts = products.filter(p => {
        // visibility filter
        if (p.showInMenu === false) return false;

        const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
        const query = searchQuery.toLowerCase().trim();
        const matchesSearch = query ? p.name.toLowerCase().includes(query) : true;
        return matchesCategory && matchesSearch;
    });

    const featuredProducts = products.filter(p => p.isFeatured && p.showInMenu !== false);

    if (isLoading) return (
        <div className="h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center">
            <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
            <div className="font-black text-indigo-500 uppercase tracking-widest text-[10px] animate-pulse">Carregando Cardápio...</div>
        </div>
    );


    return (
        <div className="h-[calc(100vh-112px)] flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-500 overflow-hidden relative">
            <style>
                {`
                @keyframes slow-blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.3; }
                }
                .animate-slow-blink {
                    animation: slow-blink 2s infinite ease-in-out;
                }
                `}
            </style>
            
            {/* Sticky Header Container */}
            <div className="sticky top-0 z-[60] bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shadow-sm shadow-slate-200/20 dark:shadow-black/20">
                {/* Top Elements Row (Status, Greeting, Icons) */}
                <div className="pt-4 px-6 pb-2 relative overflow-hidden backdrop-blur-md">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-5"></div>
                    
                    <div className="flex items-center justify-between relative z-10">
                        {/* Left: Store Status */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="w-12 h-12 bg-[#4f39f6] dark:bg-indigo-600 rounded-2xl flex flex-col items-center justify-center gap-1.5 active:scale-90 transition-all shrink-0 shadow-lg shadow-indigo-200 dark:shadow-none"
                            >
                                <div className="w-6 h-1 bg-white rounded-full"></div>
                                <div className="w-6 h-1 bg-white rounded-full"></div>
                                <div className="w-6 h-1 bg-white rounded-full"></div>
                            </button>
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-100/50 dark:border-slate-700/50 whitespace-nowrap ${storeStatus?.status === 'offline' ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'}`}>
                                <Icons.Globe className={`w-3.5 h-3.5 ${storeStatus?.status !== 'offline' ? 'animate-pulse' : ''}`} />
                                <span className="text-[10px] font-black uppercase tracking-widest">
                                    {storeStatus?.status === 'offline' ? 'OFF' : 'ON'}
                                </span>
                            </div>
                        </div>

                        {/* Right: Greeting & Icons */}
                        <div className="flex items-center gap-2">
                            <div className="flex flex-col items-end mr-1">
                                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Olá,</span>
                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate max-w-[80px]">{client?.name?.split(' ')[0] || ''}</span>
                            </div>
                            
                            <button
                                onClick={() => setShowNotificationCenter(true)}
                                className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-sm border border-slate-100 dark:border-slate-700 active:scale-95 relative"
                            >
                                <Icons.Bell className="w-4 h-4" />
                                {unreadNotificationsCount > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-rose-500 text-white text-[10px] font-black uppercase flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 px-1 shadow-sm">
                                        {unreadNotificationsCount}
                                    </span>
                                )}
                            </button>

                            <button 
                                onClick={() => setShowProfileQuickModal(true)}
                                className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700 active:scale-95 overflow-hidden"
                            >
                                {client?.avatarUrl ? (
                                    <img src={client.avatarUrl} alt="Perfil" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="font-black text-indigo-600 dark:text-indigo-400 text-sm">{client?.name?.[0].toUpperCase() || 'U'}</span>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* App Title Center Row */}
                    <div className="flex flex-col items-center mt-2 relative z-10">
                        <h1 className="text-xl font-black text-slate-800 dark:text-white tracking-tighter uppercase whitespace-nowrap">
                            Delivery <span className="text-indigo-500">App</span>
                        </h1>
                        
                        {isProfileIncomplete && (
                            <button 
                                onClick={() => setShowCompleteProfile(true)}
                                className="text-[9px] font-black text-rose-500 uppercase tracking-widest animate-slow-blink hover:text-rose-600 dark:hover:text-rose-400 transition-colors mt-0.5"
                            >
                                ⚠️ Complete seu cadastro
                            </button>
                        )}
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex gap-4 mt-6 relative z-10">
                        <button
                            onClick={() => {
                                if (activeTab === 'CARRINHO') {
                                    setActiveTab('CARDAPIO');
                                    setShowMenu(true);
                                } else {
                                    setShowMenu(!showMenu);
                                }
                            }}
                            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all shadow-sm active:scale-95 ${activeTab === 'CARDAPIO' && showMenu ? 'bg-indigo-600 text-white shadow-indigo-200 dark:shadow-indigo-900/20' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-100 dark:border-slate-700'}`}
                        >
                            Cardápio
                        </button>
                        <button
                            onClick={() => setActiveTab('CARRINHO')}
                            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all shadow-sm active:scale-95 ${activeTab === 'CARRINHO' ? 'bg-indigo-600 text-white shadow-indigo-200 dark:shadow-indigo-900/20' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-100 dark:border-slate-700'}`}
                        >
                            Carrinho
                            {items.length > 0 && <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] ${activeTab === 'CARRINHO' ? 'bg-white text-indigo-600' : 'bg-indigo-500 text-white'}`}>{items.reduce((a, b) => a + b.quantity, 0)}</span>}
                        </button>
                    </div>
                </div>

                {/* Categories Sticky Row (Only for Cardápio + showMenu) */}
                {activeTab === 'CARDAPIO' && showMenu && (
                    <div className="flex flex-col bg-white dark:bg-slate-900 border-t border-slate-50/50 dark:border-slate-800">
                        {/* Search Field inside Sticky Header */}
                        <div className="px-6 py-3 relative">
                            <input
                                type="text"
                                placeholder="O que você quer comer hoje?"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-2xl font-bold text-sm focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-900/20 transition-all pl-12 shadow-sm"
                            />
                            <div className="absolute left-10 top-1/2 -translate-y-1/2 text-slate-400">
                                <Icons.Search className="w-4 h-4" />
                            </div>
                        </div>

                        {/* Category Buttons Carousel */}
                        <div className="flex gap-2 overflow-x-auto px-6 pb-3 no-scrollbar">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all whitespace-nowrap shadow-sm border ${selectedCategory === cat ? 'bg-indigo-600 text-white border-indigo-500 translate-y-[-1px]' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* TAB CONTENT */}
            {activeTab === 'CARDAPIO' ? (
                <div className="flex-1 flex flex-col animate-in fade-in duration-500 overflow-hidden">
                    {!showMenu ? (
                        /* Advertisement Banner Space - Fixed/Fitting screen */
                        <div className="flex-1 w-full relative group overflow-hidden">
                            <div className="w-full h-full bg-slate-50 dark:bg-slate-900/50 relative">
                                {settings && (settings.appBannerUrl || settings.appBannerUrl2 || settings.appBannerUrl3) ? (
                                    <Swiper
                                        modules={[Autoplay, Pagination, Navigation]}
                                        spaceBetween={0}
                                        slidesPerView={1}
                                        autoplay={{ delay: 5000, disableOnInteraction: false }}
                                        pagination={{ clickable: true, dynamicBullets: true }}
                                        navigation={true}
                                         observer={true}
                                         observeParents={true}
                                         loop={true}
                                         className="w-full h-full mySwiper"
                                        style={{
                                            // @ts-ignore
                                            '--swiper-navigation-color': '#fff',
                                            '--swiper-pagination-color': '#fff',
                                            '--swiper-navigation-size': '20px'
                                        }}
                                    >
                                        {settings.appBannerUrl && (
                                             <SwiperSlide key="banner-1" className="bg-slate-950 flex items-center justify-center">
                                                 <img src={settings.appBannerUrl} alt="Propaganda 1" className="w-full h-full object-contain" />
                                             </SwiperSlide>
                                        )}
                                        {settings.appBannerUrl2 && (
                                             <SwiperSlide key="banner-2" className="bg-slate-950 flex items-center justify-center">
                                                 <img src={settings.appBannerUrl2} alt="Propaganda 2" className="w-full h-full object-contain" />
                                             </SwiperSlide>
                                        )}
                                        {settings.appBannerUrl3 && (
                                             <SwiperSlide key="banner-3" className="bg-slate-950 flex items-center justify-center">
                                                 <img src={settings.appBannerUrl3} alt="Propaganda 3" className="w-full h-full object-contain" />
                                             </SwiperSlide>
                                        )}
                                    </Swiper>
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 p-8 text-center rounded-[2.5rem]">
                                        <Icons.ShoppingCart className="w-16 h-16 text-white/20 mb-4" />
                                        <h2 className="text-white font-black uppercase tracking-tighter text-2xl mb-2">Seja Bem-vindo!</h2>
                                        <p className="text-white/60 font-bold text-xs uppercase tracking-widest">Clique em cardápio para ver as delícias de hoje.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto no-scrollbar">
                            <div className={`flex flex-col gap-5 px-6 ${items.length > 0 ? 'pb-40' : 'pb-6'}`}>

                                {/* Featured Products Section */}
                                {featuredProducts.length > 0 && selectedCategory === 'Todos' && !searchQuery && (
                                    <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-left duration-700">
                                        <div className="flex items-center justify-between px-1">
                                            <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                                <Icons.Star size={12} className="fill-indigo-500" /> Mais Pedidos do Mês
                                            </h4>
                                        </div>
                                        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                                            {featuredProducts.map(product => (
                                                <div 
                                                    key={`featured-${product.id}`}
                                                    onClick={() => {
                                                        if (isProfileIncomplete) {
                                                            setShowIncompleteAlert(true);
                                                            return;
                                                        }
                                                        if (storeStatus?.status !== 'offline' && (product.maxAvailability === undefined || product.maxAvailability > 0)) {
                                                            if (product.isPizza) {
                                                                setSelectedPizzaForLaunch(product);
                                                                setPizzaFlavors([]);
                                                                setPizzaModalQuantity(1);
                                                                setIsPizzaSelectionMode(false);
                                                                setPizzaObservation('');
                                                            } else {
                                                                addToCart(product);
                                                            }
                                                        }
                                                    }}
                                                    className="min-w-[160px] max-w-[160px] bg-indigo-600 rounded-[2rem] p-4 flex flex-col shadow-lg shadow-indigo-200 dark:shadow-none relative overflow-hidden active:scale-[0.98] transition-all group"
                                                >
                                                    <div className="absolute -top-4 -right-4 w-16 h-16 bg-white/10 rounded-full blur-xl"></div>
                                                    <div className="w-full aspect-square bg-white/10 rounded-2xl overflow-hidden mb-3 flex items-center justify-center relative">
                                                        {product.imageUrl ? (
                                                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                        ) : (
                                                            <Icons.ShoppingCart className="w-8 h-8 text-white/30" />
                                                        )}
                                                        <div className="absolute top-2 right-2">
                                                             <Icons.Star size={12} className="text-amber-400 fill-amber-400" />
                                                        </div>
                                                    </div>
                                                    <h5 className="text-white font-bold text-[11px] leading-tight line-clamp-2 h-7 mb-2">{product.name}</h5>
                                                    <div className="flex justify-between items-center mt-auto">
                                                        <span className="text-white font-black text-xs">{formatCurrency(product.price)}</span>
                                                        <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center text-white">
                                                            <Icons.Plus size={14} strokeWidth={3} />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Products Grid */}
                                <div className="px-6 grid grid-cols-1 gap-5 animate-in slide-in-from-bottom-4 duration-500">
                                {filteredProducts.map(product => (
                                        <div 
                                            key={product.id}
                                            onClick={() => {
                                                if (isProfileIncomplete) {
                                                    setShowIncompleteAlert(true);
                                                }
                                            }}
                                            className={`bg-white dark:bg-slate-800 p-4 rounded-[2rem] flex gap-4 shadow-sm border ${product.maxAvailability !== undefined && product.maxAvailability <= 0 ? 'border-red-100 dark:border-red-900/50 opacity-75' : 'border-slate-100 dark:border-slate-700 hover:shadow-md hover:border-indigo-100 dark:hover:border-indigo-800 cursor-pointer group active:scale-[0.98]'} items-center transition-all relative overflow-hidden`}
                                        >
                                            <div className="w-28 h-28 bg-slate-50 dark:bg-slate-900/50 rounded-2xl overflow-hidden shrink-0 relative flex items-center justify-center text-slate-300 dark:text-slate-700">
                                                {product.imageUrl ? (
                                                    <img src={product.imageUrl} alt={product.name} className={`w-full h-full object-cover transition-transform duration-700 ${product.maxAvailability !== undefined && product.maxAvailability <= 0 ? 'grayscale' : 'group-hover:scale-110'}`} />
                                                ) : (
                                                    <Icons.ShoppingCart className="w-8 h-8 opacity-50" />
                                                )}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                            </div>
                                            <div className="flex-1 py-1">
                                                <div className="flex justify-between items-start">
                                                    <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1">{product.category}</p>
                                                    {product.maxAvailability !== undefined && product.maxAvailability <= 0 && (
                                                        <span className="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Esgotado</span>
                                                    )}
                                                </div>
                                                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight line-clamp-2">{product.name}</h3>
                                                <div className="flex justify-between items-center mt-3">
                                                    <span className="text-lg font-black text-slate-800 dark:text-white tracking-tighter">{formatCurrency(product.price)}</span>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (isProfileIncomplete) {
                                                                setShowIncompleteAlert(true);
                                                                return;
                                                            }
                                                            if (storeStatus?.status !== 'offline' && (product.maxAvailability === undefined || product.maxAvailability > 0)) {
                                                                if (product.isPizza) {
                                                                    setSelectedPizzaForLaunch(product);
                                                                    setPizzaFlavors([]);
                                                                    setPizzaModalQuantity(1);
                                                                    setIsPizzaSelectionMode(false);
                                                                    setPizzaObservation('');
                                                                } else {
                                                                    addToCart(product);
                                                                }
                                                            }
                                                        }}
                                                        disabled={storeStatus?.status === 'offline' || (product.maxAvailability !== undefined && product.maxAvailability <= 0)}
                                                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold active:scale-90 transition-all shadow-sm ${storeStatus?.status === 'offline' || (product.maxAvailability !== undefined && product.maxAvailability <= 0) ? 'bg-slate-100 dark:bg-slate-700 text-slate-300 dark:text-slate-500 cursor-not-allowed' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 dark:hover:bg-indigo-500 hover:text-white group-hover:shadow-indigo-200 dark:group-hover:shadow-indigo-900/40'}`}
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            ) : (
                <CheckoutTab onOrderPlaced={() => navigate('/history')} />
            )}

            {/* Sticky Cart Footer (Only if in Cardápio and has items) */}
            {activeTab === 'CARDAPIO' && items.length > 0 && storeStatus?.status !== 'offline' && (
                <div className="fixed bottom-32 left-6 right-6 animate-in slide-in-from-bottom duration-300 z-[60]">
                    <button
                        onClick={() => {
                            setActiveTab('CARRINHO');
                            setShowMenu(false);
                        }}
                        className="w-full p-5 rounded-3xl font-black uppercase text-[10px] tracking-widest flex justify-between items-center bg-indigo-600 text-white shadow-2xl shadow-indigo-200 dark:shadow-black/40 active:scale-95 transition-transform"
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-indigo-500 w-6 h-6 rounded-lg text-[10px] flex items-center justify-center">{items.reduce((a, b) => a + b.quantity, 0)}</div>
                            <span>Ver Carrinho / Finalizar</span>
                        </div>
                        <span className="font-black">{formatCurrency(total)}</span>
                    </button>
                </div>
            )}

            <CustomAlert
                isOpen={showLogoutAlert}
                title="SAIR DO SISTEMA"
                message="DESEJA REALMENTE SAIR DA APLICAÇÃO E VOLTAR PARA O LOGIN?"
                onConfirm={() => {
                    api.logout();
                    window.location.reload();
                }}
                onCancel={() => setShowLogoutAlert(false)}
                type="QUESTION"
            />

            {client && (
                <CompleteProfileModal 
                    isOpen={showCompleteProfile}
                    client={client}
                    onComplete={(updatedClient) => {
                        setClient(updatedClient);
                        localStorage.setItem('delivery_app_client', JSON.stringify(updatedClient));
                        setShowCompleteProfile(false);
                    }}
                    onClose={() => setShowCompleteProfile(false)}
                />
            )}

            <ProfilePhotoModal 
                isOpen={showProfilePhotoModal}
                onClose={() => {
                    setShowProfilePhotoModal(false);
                    setShowProfileQuickModal(true);
                }}
                onPhotoSelected={async (base64: string | null) => {
                    if (client) {
                        try {
                            const updated = await api.updateClient(client.id, { avatarUrl: base64 });
                            setClient(updated);
                            localStorage.setItem('delivery_app_client', JSON.stringify(updated));
                        } catch (e) {
                            console.error("Error updating avatar", e);
                        }
                    }
                }}
            />

            {client && (
                <ProfileQuickModal 
                    isOpen={showProfileQuickModal}
                    onClose={() => setShowProfileQuickModal(false)}
                    client={client}
                    onEditPhoto={() => {
                        setShowProfileQuickModal(false);
                        setShowProfilePhotoModal(true);
                    }}
                    onChangePassword={() => {
                        setShowProfileQuickModal(false);
                        setShowChangePasswordModal(true);
                    }}
                    onToggleBiometric={handleToggleBiometric}
                    isBiometricLoading={isBiometricLoading}
                />
            )}

            {client && (
                <ChangePasswordModal 
                    isOpen={showChangePasswordModal}
                    onClose={(reopenProfile) => {
                        setShowChangePasswordModal(false);
                        if (reopenProfile) setShowProfileQuickModal(true);
                    }}
                    client={client}
                />
            )}

            {client && (
                <NotificationCenterModal 
                    isOpen={showNotificationCenter}
                    onClose={() => setShowNotificationCenter(false)}
                    clientId={client.id}
                    onAllRead={() => {
                        // Resets the counter and saves everything to local storage
                        setUnreadNotificationsCount(0);
                        api.getNotifications(client.id).then(res => {
                            const readCamp = JSON.parse(localStorage.getItem('delivery_app_read_campaigns') || '[]');
                            const readCoup = JSON.parse(localStorage.getItem('delivery_app_read_coupons') || '[]');
                            res.campaigns.forEach(c => { if (!readCamp.includes(c.id)) readCamp.push(c.id); });
                            res.coupons.forEach(c => { if (!readCoup.includes(c.id)) readCoup.push(c.id); });
                            localStorage.setItem('delivery_app_read_campaigns', JSON.stringify(readCamp));
                            localStorage.setItem('delivery_app_read_coupons', JSON.stringify(readCoup));
                        });
                    }}
                />
            )}

            {/* Highlight Central Modal para Campanhas In-App não lidas - Modernizado */}
            {highlightCampaign && (
                <EngagementModal 
                    campaign={highlightCampaign}
                    onClose={() => {
                        // Marcar como lido e fechar
                        const readCamp = JSON.parse(localStorage.getItem('delivery_app_read_campaigns') || '[]');
                        if (!readCamp.includes(highlightCampaign.id)) {
                            readCamp.push(highlightCampaign.id);
                            localStorage.setItem('delivery_app_read_campaigns', JSON.stringify(readCamp));
                            setUnreadNotificationsCount(prev => Math.max(0, prev - 1));
                        }
                        setHighlightCampaign(null);
                    }}
                />
            )}

            {/* Biometric Validation Overlay */}
            {isValidatingBiometric && (
                <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="w-24 h-24 bg-indigo-500 rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-indigo-500/20 animate-pulse">
                        <Icons.Fingerprint className="w-12 h-12 text-white" />
                    </div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tighter italic mb-2">Aguardando Validação</h2>
                    <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest text-center px-12 leading-relaxed">
                        Por favor, use sua biometria conforme solicitado pelo seu dispositivo.
                    </p>
                    <div className="mt-8 flex gap-1">
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    </div>
                </div>
            )}

            <CustomAlert 
                isOpen={!!biometricError}
                title="ERRO NA BIOMETRIA"
                message={biometricError}
                onConfirm={() => setBiometricError('')}
                type="DANGER"
            />

            <CustomAlert
                isOpen={showIncompleteAlert}
                title="CADASTRO INCOMPLETO"
                message="PARA REALIZAR PEDIDOS, VOCÊ PRECISA PRIMEIRO COMPLETAR SEU CADASTRO CLICANDO NA MENSAGEM '⚠️ COMPLETE SEU CADASTRO' NO TOPO DA TELA."
                onConfirm={() => setShowIncompleteAlert(false)}
                type="INFO"
                confirmText="ENTENDI"
            />

            {/* Modal de Pizza */}
            {selectedPizzaForLaunch && (() => {
                const maxFlavors = selectedPizzaForLaunch.pizzaSize === 'P' ? 2 : selectedPizzaForLaunch.pizzaSize === 'M' ? 3 : selectedPizzaForLaunch.pizzaSize === 'G' ? 4 : 1;
                const availablePizzaProducts = products.filter(p => p.isPizza && p.pizzaSize === selectedPizzaForLaunch.pizzaSize && p.id !== selectedPizzaForLaunch.id && p.price > 0 && (p.maxAvailability === undefined || p.maxAvailability > 0));

                let modalSubTotal = selectedPizzaForLaunch.price;
                if (pizzaFlavors.length > 0) {
                    if (settings?.pizzaPriceRule === 'AVERAGE') {
                        const totalPrices = selectedPizzaForLaunch.price + pizzaFlavors.reduce((sum, f) => sum + f.price, 0);
                        modalSubTotal = totalPrices / (pizzaFlavors.length + 1);
                    } else {
                        // HIGHEST
                        let highest = selectedPizzaForLaunch.price;
                        pizzaFlavors.forEach(f => { if (f.price > highest) highest = f.price; });
                        modalSubTotal = highest;
                    }
                }
                modalSubTotal *= pizzaModalQuantity;

                return (
                    <div className="fixed inset-0 z-[150] flex flex-col justify-end bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-slate-900 w-full h-[90vh] rounded-t-[2.5rem] shadow-2xl flex flex-col animate-in slide-in-from-bottom-10 border-t border-slate-100 dark:border-slate-800">
                            {/* Header */}
                            <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-slate-50/50 dark:bg-slate-900 rounded-t-[2.5rem] sticky top-0 z-10 backdrop-blur-xl">
                                <div>
                                    <span className="text-[10px] font-black uppercase text-indigo-500 tracking-widest bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full mb-2 inline-block">
                                        Pizza {selectedPizzaForLaunch.pizzaSize} (Até {maxFlavors} sabores)
                                    </span>
                                    <h3 className="text-xl font-black text-slate-800 dark:text-white leading-tight">
                                        {selectedPizzaForLaunch.name}
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setSelectedPizzaForLaunch(null)}
                                    className="p-2.5 bg-white dark:bg-slate-800 text-slate-400 rounded-full hover:bg-rose-50 hover:text-rose-500 transition-all shadow-sm border border-slate-100 dark:border-slate-700"
                                >
                                    <Icons.X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8">
                                {/* Base Flavor */}
                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div> Sabor Principal Selecionado
                                    </h4>
                                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl flex justify-between items-center relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        <div className="font-bold text-indigo-900 dark:text-indigo-200">{selectedPizzaForLaunch.name}</div>
                                        <div className="text-sm font-black text-indigo-600 dark:text-indigo-400">{formatCurrency(selectedPizzaForLaunch.price)}</div>
                                    </div>
                                </div>

                                {/* Additional Flavors Question */}
                                {maxFlavors > 1 && !isPizzaSelectionMode && pizzaFlavors.length === 0 && (
                                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700/50 flex flex-col items-center text-center space-y-4">
                                        <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-500 rounded-2xl flex items-center justify-center mb-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pizza"><path d="M15 11h.01"/><path d="M11 15h.01"/><path d="M16 16h.01"/><path d="m2 16 20 6-6-20A20 20 0 0 0 2 16"/><path d="M5.71 17.11a17.04 17.04 0 0 1 11.4-11.4"/></svg>
                                        </div>
                                        <p className="text-[13px] font-bold text-slate-700 dark:text-slate-300">Deseja adicionar outros sabores?</p>
                                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-1 mb-4">Você pode adicionar até {maxFlavors - 1} sabores extras.</p>
                                        <div className="flex w-full gap-3 mt-4">
                                            <button onClick={() => setIsPizzaSelectionMode(true)} className="flex-1 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-2xl font-black text-[11px] text-slate-700 dark:text-slate-200 uppercase tracking-widest hover:border-indigo-500 dark:hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-all shadow-sm">
                                                Sim, Dividir Pizza
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Flavors Selection Grid */}
                                {(isPizzaSelectionMode || pizzaFlavors.length > 0) && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="flex justify-between items-center px-1">
                                            <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div> Sabores Extras ({pizzaFlavors.length}/{maxFlavors - 1})
                                            </h4>
                                        </div>
                                        <div className="grid grid-cols-1 gap-3">
                                            {availablePizzaProducts.map(p => {
                                                const isSelected = pizzaFlavors.find(f => f.id === p.id);
                                                const canAdd = pizzaFlavors.length < maxFlavors - 1;
                                                return (
                                                    <div
                                                        key={p.id}
                                                        onClick={() => {
                                                            if (isSelected) {
                                                                setPizzaFlavors(prev => prev.filter(f => f.id !== p.id));
                                                            } else if (canAdd) {
                                                                setPizzaFlavors(prev => [...prev, p]);
                                                            }
                                                        }}
                                                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex justify-between items-center group ${isSelected ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-500' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}
                                                        style={{ opacity: !isSelected && !canAdd ? 0.5 : 1 }}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700'}`}>
                                                                {isSelected && <Icons.Check className="w-3 h-3 text-white" />}
                                                            </div>
                                                            <div className={`font-bold text-sm ${isSelected ? 'text-indigo-900 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>{p.name}</div>
                                                        </div>
                                                        <div className={`text-xs font-black tracking-tighter ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}>
                                                        {formatCurrency(p.price)}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Observações e Quantidade */}
                                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <div className="flex gap-4">
                                        <div className="flex-1 space-y-2">
                                            <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Observações</h4>
                                            <input
                                                type="text"
                                                placeholder="Ex: Sem cebola, massa fina..."
                                                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl font-bold text-sm focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-900/20 outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400 transition-all"
                                                value={pizzaObservation}
                                                onChange={e => setPizzaObservation(e.target.value)}
                                            />
                                        </div>
                                        <div className="w-28 space-y-2">
                                            <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1 text-center">Qtde</h4>
                                            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-1.5 rounded-2xl">
                                                <button onClick={() => setPizzaModalQuantity(Math.max(1, pizzaModalQuantity - 1))} className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-700 rounded-xl text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 font-bold shadow-sm transition-colors">-</button>
                                                <span className="font-black text-slate-700 dark:text-slate-200">{pizzaModalQuantity}</span>
                                                <button onClick={() => setPizzaModalQuantity(pizzaModalQuantity + 1)} className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-700 rounded-xl text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 font-bold shadow-sm transition-colors">+</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Footer */}
                            <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sticky bottom-0">
                                <button
                                    onClick={() => {
                                        // Utiliza const observations = `Sabores: ${pizzaFlavors.map(f => f.name).join(', ')}`;
                                        // O que o usuário digitar na obs também;
                                        // Só que vamos passar os sabores e obs via addCustomToCart
                                        let finalObs = pizzaObservation;
                                        if (settings?.pizzaNfeRule === 'OBSERVATION') {
                                            const flavoursStr = [selectedPizzaForLaunch.name, ...pizzaFlavors.map(f => f.name)].join(', ');
                                            if (finalObs) finalObs = `${flavoursStr} | Obs: ${finalObs}`;
                                            else finalObs = `${flavoursStr}`;
                                        }

                                        const allFlavors = [
                                            selectedPizzaForLaunch,
                                            ...pizzaFlavors
                                        ].map(f => ({
                                            ...f,
                                            fraction: 1 / (pizzaFlavors.length + 1)
                                        }));

                                        addToCart(
                                            {...selectedPizzaForLaunch, price: modalSubTotal / pizzaModalQuantity}, 
                                            pizzaModalQuantity, 
                                            allFlavors as any,
                                            finalObs || undefined
                                        );
                                        setSelectedPizzaForLaunch(null);
                                    }}
                                    className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase text-[12px] tracking-widest shadow-xl shadow-indigo-200 dark:shadow-indigo-900/30 flex justify-between items-center px-6 active:scale-[0.98] transition-transform"
                                >
                                    <span>Adicionar ao Carrinho</span>
                                    <span>{formatCurrency(modalSubTotal)}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default Home;
