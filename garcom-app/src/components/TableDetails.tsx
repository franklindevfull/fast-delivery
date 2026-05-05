import React, { useState, useEffect } from 'react';
import type { TableSession, Product, User, OrderItem, StoreStatus, BusinessSettings } from '../types';
import { db } from '../api';
import { X, Search, ShoppingCart, CheckCircle2, AlertCircle, Trash2, Plus, Minus, ArrowRight, LayoutGrid, RefreshCw, MessageSquare, Key, Eye, EyeOff } from 'lucide-react';
import { formatCurrency } from '../utils';
import Modal from './Modal';
import ClientSelector from './ClientSelector';
import { AddonDisplay } from './AddonDisplay';
import { ProductAddonModal } from './ProductAddonModal';

interface TableDetailsProps {
    table: TableSession;
    user: User;
    onClose: () => void;
    onRefresh: () => void;
    storeStatus?: StoreStatus;
    resolvedWaiterId?: string | null;
    settings?: BusinessSettings;
}

const TableDetails: React.FC<TableDetailsProps> = ({ table, user, onClose, onRefresh, storeStatus, resolvedWaiterId, settings }) => {
    const isSoftRejected = (() => {
        if (!table.pendingReviewItems) return false;
        try {
            const parsed = JSON.parse(table.pendingReviewItems);
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.rejection;
        } catch (e) {
            return table.pendingReviewItems.startsWith('REJECTED:');
        }
    })();

    const [activeTab, setActiveTab] = useState<'CONSUMPTION' | 'LAUNCH' | 'REVIEW'>(
        (table.hasPendingDigital && !isSoftRejected) ? 'REVIEW' : 'CONSUMPTION'
    );
    const [products, setProducts] = useState<Product[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [cart, setCart] = useState<OrderItem[]>([]);
    const [showCartItems, setShowCartItems] = useState(false);

    const [selectedProductForAddons, setSelectedProductForAddons] = useState<Product | null>(null);
    const [selectedPizzaForLaunch, setSelectedPizzaForLaunch] = useState<Product | null>(null);
    const [pizzaFlavors, setPizzaFlavors] = useState<Product[]>([]);
    const [isPizzaSelectionMode, setIsPizzaSelectionMode] = useState(false);
    const [pizzaModalQuantity, setPizzaModalQuantity] = useState(1);
    const [pizzaObservation, setPizzaObservation] = useState('');
    const [selectedAddonsForProduct, setSelectedAddonsForProduct] = useState<any[]>([]);

    const [loading, setLoading] = useState(false);
    const [showTransfer, setShowTransfer] = useState(false);
    const [transferTarget, setTransferTarget] = useState<number | ''>('');
    const [showClientSelect, setShowClientSelect] = useState(false);
    const [showPin, setShowPin] = useState(false);

    const actingWaiterId = resolvedWaiterId || user.waiterId || user.id;

    const isResponsible = user.permissions.includes('admin') ||
        !table.waiterId ||
        (table.waiterId === actingWaiterId) ||
        (table.waiterId === user.id) ||
        (table.waiter?.email?.toLowerCase() === user.email.toLowerCase());

    // Modal state
    const [modal, setModal] = useState<{
        isOpen: boolean;
        type: 'alert' | 'confirm' | 'success' | 'error';
        title: string;
        message: string;
        onConfirm?: () => void;
    }>({
        isOpen: false,
        type: 'alert',
        title: '',
        message: ''
    });

    const showAlert = (title: string, message: string, type: typeof modal.type = 'alert', onConfirm?: () => void) => {
        setModal({ isOpen: true, title, message, type, onConfirm });
    };

    useEffect(() => {
        if (activeTab === 'LAUNCH') {
            db.getProducts().then(setProducts).catch(console.error);
        }
    }, [activeTab]);

    const addToCart = (product: Product, quantity = 1, flavors?: Product[], observations?: string, price?: number, selectedAddons?: any[]) => {
        setCart(prev => {
            if (flavors?.length || observations || selectedAddons?.length) {
                return [...prev, {
                    id: `temp-${Date.now()}-${Math.random()}`,
                    uid: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                    productId: product.id,
                    productName: product.name,
                    quantity,
                    price: price || product.price,
                    isReady: false,
                    pizzaFlavors: flavors,
                    observations,
                    selectedAddons
                }];
            }
            const existing = prev.find(p => p.productId === product.id && !p.pizzaFlavors?.length && !p.observations && !p.selectedAddons?.length);
            if (existing) {
                return prev.map(p => p.productId === product.id ? { ...p, quantity: p.quantity + quantity } : p);
            }
            return [...prev, {
                id: `temp-${Date.now()}-${Math.random()}`,
                uid: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                productId: product.id,
                productName: product.name,
                quantity,
                price: price || product.price,
                isReady: false
            }];
        });
    };

    const updateCartQuantity = (productId: string, delta: number) => {
        setCart(prev => prev.map(p => {
            if (p.productId === productId) {
                const newQty = Math.max(0, p.quantity + delta);
                return { ...p, quantity: newQty };
            }
            return p;
        }).filter(p => p.quantity > 0));
    };

    const handleTransfer = async () => {
        if (!transferTarget) return;

        // Regra de negócio: somente o garçom responsável
        if (!isResponsible) {
            showAlert('Acesso Negado', 'Somente o garçom responsável por esta mesa pode transferi-lá.', 'error');
            return;
        }

        setLoading(true);
        try {
            await db.transferTable(table.tableNumber, Number(transferTarget), actingWaiterId, user.permissions);
            showAlert('Sucesso', 'Mesa transferida com sucesso!', 'success', () => {
                onRefresh();
                onClose();
            });
        } catch (e: any) {
            showAlert('Erro', e.message || 'Erro ao transferir mesa', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCheckout = async (clientId?: string, clientName?: string) => {
        if (!isResponsible) {
            showAlert('Acesso Negado', 'Somente o garçom responsável por esta mesa pode solicitar a conta.', 'error');
            return;
        }

        if (!clientId && !clientName) {
            setShowClientSelect(true);
            return;
        }

        // Hide selector before showing confirmation modal to prevent layering issues
        setShowClientSelect(false);

        showAlert('Confirmar Fechamento', `Deseja solicitar o fechamento para ${clientName}?`, 'confirm', async () => {
            setLoading(true);
            try {
                await db.requestCheckout(table.tableNumber, clientId, clientName, actingWaiterId, user.permissions);
                setShowClientSelect(false);
                onRefresh();
                onClose();
            } catch (e) {
                showAlert('Erro', 'Erro ao solicitar fechamento', 'error');
            } finally {
                setLoading(false);
            }
        });
    };

    const handleSave = async () => {
        if (!isResponsible) {
            showAlert('Acesso Negado', 'Somente o garçom responsável por esta mesa pode lançar itens.', 'error');
            return;
        }
        if (cart.length === 0) return;
        setLoading(true);
        try {
            await db.saveTableSession({
                tableNumber: table.tableNumber,
                items: [...table.items, ...cart.map(item => ({ ...item, id: undefined }))],
                status: 'occupied',
                clientId: table.clientId || null,
                clientName: table.clientName || `Mesa ${table.tableNumber}`,
                waiterId: actingWaiterId,
                userPermissions: user.permissions
            } as any);
            setCart([]);
            onRefresh();
            setActiveTab('CONSUMPTION');
            showAlert('Sucesso', 'Itens lançados com sucesso!', 'success');
        } catch (e) {
            showAlert('Erro', 'Erro ao lançar itens', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleApproveDigital = async () => {
        if (!isResponsible) {
            showAlert('Acesso Negado', 'Somente o garçom responsável por esta mesa pode aprovar pedidos.', 'error');
            return;
        }
        if (!table.pendingReviewItems) return;
        setLoading(true);
        try {
            const parsed = JSON.parse(table.pendingReviewItems);
            const itemsToApprove = Array.isArray(parsed) ? parsed : (parsed.items || []);

            if (itemsToApprove.length > 0) {
                // Enrich items to ensure legacy orders without price/name get populated
                const enrichedItemsToApprove = itemsToApprove.map((item: any) => {
                    const product = products.find(p => p.id === item.productId);
                    return {
                        ...item,
                        productName: item.productName || (product ? product.name : 'Item'),
                        price: typeof item.price === 'number' ? item.price : (product ? product.price : 0),
                        selectedAddons: item.selectedAddons ? (typeof item.selectedAddons === 'string' ? JSON.parse(item.selectedAddons) : item.selectedAddons) : []
                    };
                });

                const newItems = [...table.items, ...enrichedItemsToApprove];
                await db.saveTableSession({
                    tableNumber: table.tableNumber,
                    items: newItems,
                    status: 'occupied',
                    hasPendingDigital: false,
                    pendingReviewItems: null as any, // Explicitly null to clear in Prisma
                    clientId: table.clientId || null,
                    clientName: table.clientName || `Mesa ${table.tableNumber}`,
                    waiterId: actingWaiterId,
                    userPermissions: user.permissions
                } as any);
                onRefresh();
                setActiveTab('CONSUMPTION');
                showAlert('Sucesso', 'Pedido digital aprovado!', 'success');
            }
        } catch (e) {
            showAlert('Erro', 'Erro ao aprovar pedido digital', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleRejectDigital = async () => {
        if (!isResponsible) {
            showAlert('Acesso Negado', 'Somente o garçom responsável por esta mesa pode rejeitar pedidos.', 'error');
            return;
        }
        showAlert('Rejeitar Pedido', 'Deseja REJEITAR estes itens? O cliente será notificado.', 'confirm', async () => {
            setLoading(true);
            try {
                if (table.items.length === 0) {
                    await db.deleteTableSession(table.tableNumber, true);
                } else {
                    await db.saveTableSession({
                        tableNumber: table.tableNumber,
                        items: table.items,
                        status: table.items.length > 0 ? 'occupied' : 'available',
                        hasPendingDigital: false,
                        pendingReviewItems: null as any,
                        waiterId: actingWaiterId,
                        userPermissions: user.permissions
                    } as any, true);
                }
                onRefresh();
                onClose();
            } catch (e) {
                showAlert('Erro', 'Erro ao rejeitar pedido', 'error');
            } finally {
                setLoading(false);
            }
        });
    };

    const total = table.items.reduce((acc, item) => {
        const addonsTotal = item.selectedAddons?.reduce((sum, a) => sum + a.price, 0) || 0;
        return acc + ((item.price + addonsTotal) * item.quantity);
    }, 0);
    const cartTotal = cart.reduce((acc, item) => {
        const addonsTotal = item.selectedAddons?.reduce((sum, a) => sum + a.price, 0) || 0;
        return acc + ((item.price + addonsTotal) * item.quantity);
    }, 0);
    const hasPendingItems = table.items.some(it => !it.isReady);

    let pendingItems: any[] = [];
    try {
        if (table.pendingReviewItems && !isSoftRejected) {
            const parsed = JSON.parse(table.pendingReviewItems);
            let rawPending = Array.isArray(parsed) ? parsed : (parsed.items || []);

            // Enrich with product data for legacy items missing price/name
            pendingItems = rawPending.map((item: any) => {
                const product = products.find(p => p.id === item.productId);
                return {
                    ...item,
                    productName: item.productName || (product ? product.name : 'Item'),
                    price: typeof item.price === 'number' ? item.price : (product ? product.price : 0)
                };
            });
        }
    } catch (e) { }

    // Filter in lowercase
    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex flex-col animate-in fade-in duration-300"
            onClick={onClose}
        >
            <div
                className="mt-auto bg-white w-full rounded-t-[3rem] max-h-[92vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-500 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <header className="p-8 pb-4 flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="px-4 py-1.5 bg-blue-600 text-white text-[10px] font-black rounded-full uppercase tracking-widest shadow-lg shadow-blue-500/30">Mesa {table.tableNumber}</span>
                            {table.isOriginDigitalMenu && <span className="px-4 py-1.5 bg-fuchsia-600 text-white text-[10px] font-black rounded-full uppercase tracking-widest">App Digital</span>}
                            {table.status === 'billing' && <span className="px-4 py-1.5 bg-amber-500 text-white text-[10px] font-black rounded-full uppercase tracking-widest">Aguardando Pagamento</span>}
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">Gerenciar Mesa</h2>
                        {table.pin && (
                            <button
                                onClick={() => setShowPin(!showPin)}
                                className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-xl shadow-lg shadow-slate-900/10 active:scale-95 transition-all"
                            >
                                <Key size={12} className="text-blue-400" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                                    PIN: {showPin ? table.pin : '••••'}
                                </span>
                                {showPin ? <EyeOff size={12} className="text-slate-400" /> : <Eye size={12} className="text-slate-400" />}
                            </button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {table.status === 'occupied' && !showTransfer && isResponsible && (
                            <button
                                onClick={() => setShowTransfer(true)}
                                className="p-3 bg-slate-100 text-blue-600 rounded-2xl active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                            >
                                <RefreshCw size={18} />
                                Transferir
                            </button>
                        )}
                        <button onClick={onClose} className="p-3 bg-slate-100 rounded-2xl text-slate-400 active:scale-90 transition-all">
                            <X size={24} />
                        </button>
                    </div>
                </header>

                {/* Transfer UI Overlay */}
                {showTransfer && (
                    <div className="px-8 mb-6 animate-in slide-in-from-top duration-300">
                        <div className="p-6 bg-blue-50 border border-blue-100 rounded-[2rem] flex flex-col gap-4">
                            <div className="flex justify-between items-center">
                                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Transferir para Mesa:</h4>
                                <button onClick={() => setShowTransfer(false)} className="text-blue-400 font-bold text-[10px] uppercase">Cancelar</button>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <input
                                    type="number"
                                    placeholder="Nº Mesa"
                                    className="flex-1 bg-white border-none rounded-xl px-4 py-4 text-sm font-black outline-none focus:ring-2 focus:ring-blue-500/20"
                                    value={transferTarget}
                                    onChange={(e) => setTransferTarget(e.target.value === '' ? '' : Number(e.target.value))}
                                />
                                <button
                                    onClick={handleTransfer}
                                    disabled={!transferTarget || loading}
                                    className="px-8 py-4 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/30 disabled:opacity-50 active:scale-95 transition-all w-full sm:w-auto"
                                >
                                    Confirmar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="px-8 flex gap-2 mb-6 overflow-x-auto hide-scrollbar">
                    <button
                        onClick={() => setActiveTab('CONSUMPTION')}
                        className={`shrink-0 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'CONSUMPTION' ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}
                    >
                        Consumo
                    </button>
                    <button
                        onClick={() => {
                            if (storeStatus?.status === 'offline' || table.status === 'billing') return;
                            setActiveTab('LAUNCH');
                        }}
                        disabled={storeStatus?.status === 'offline' || table.status === 'billing'}
                        className={`shrink-0 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'LAUNCH' ? 'bg-slate-900 text-white shadow-lg' : (storeStatus?.status === 'offline' || table.status === 'billing' ? 'bg-slate-50 text-slate-200 cursor-not-allowed' : 'bg-slate-50 text-slate-400 border border-slate-100')}`}
                    >
                        Lançar
                    </button>
                    {table.hasPendingDigital && !isSoftRejected && (
                        <button
                            onClick={() => setActiveTab('REVIEW')}
                            className={`shrink-0 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'REVIEW' ? 'bg-amber-500 text-white shadow-lg animate-pulse' : 'bg-amber-50 text-amber-500 border border-amber-100'}`}
                        >
                            Digital (!)
                        </button>
                    )}
                </div>

                {/* Content Area */}
                <main className="flex-1 overflow-y-auto px-8 pb-4 hide-scrollbar">
                    {!isResponsible && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 animate-in fade-in zoom-in duration-300">
                            <AlertCircle className="text-red-500" size={20} />
                            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">
                                Esta mesa está sob responsabilidade de outro garçom.
                            </p>
                        </div>
                    )}
                    {activeTab === 'CONSUMPTION' && (
                        <div className="space-y-4">
                            {table.items.length === 0 ? (
                                <div className="text-center py-16">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
                                        <ShoppingCart size={32} className="text-slate-300" />
                                    </div>
                                    <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em]">Nenhum item lançado ainda</p>
                                </div>
                            ) : (
                                table.items.map((item: any, ix: number) => (
                                    <div key={ix} className="premium-card p-5 border-l-4 transition-all duration-300 group hover:translate-x-1" style={{ borderLeftColor: item.isReady ? '#10b981' : '#f59e0b' }}>
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-black text-slate-800 uppercase tracking-tight leading-tight mb-0.5 break-words">
                                                    {item.quantity}x {item.productName || item.product?.name || 'Item'} {formatCurrency(item.price, false)}
                                                </p>

                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                                                    {item.isReady ? (
                                                        <div className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md flex items-center gap-1">
                                                            <CheckCircle2 size={10} />
                                                            <span className="text-[9px] font-black uppercase tracking-widest">Pronto</span>
                                                        </div>
                                                    ) : (
                                                        <div className="px-2 py-0.5 bg-orange-50 text-orange-500 rounded-md flex items-center gap-1">
                                                            <RefreshCw size={10} />
                                                            <span className="text-[9px] font-black uppercase tracking-widest">Preparando</span>
                                                        </div>
                                                    )}

                                                    {item.observations && (
                                                        <div className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md flex items-center gap-1.5 border border-slate-200/50">
                                                            <MessageSquare size={10} className="shrink-0" />
                                                            <span className="text-[9px] font-bold italic truncate max-w-[180px]">{item.observations}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                                <p className="text-sm font-black text-slate-900 tracking-tighter">
                                                    {formatCurrency((item.price + (item.selectedAddons?.reduce((s: number, a: any) => s + a.price, 0) || 0)) * item.quantity)}
                                                </p>
                                            </div>
                                            <AddonDisplay 
                                                addons={item.selectedAddons || []} 
                                                products={products} 
                                                className="mt-3 text-[9px] font-black text-blue-500 uppercase tracking-widest pl-0.5"
                                            />
                                        </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'LAUNCH' && (
                        <div className="space-y-6">
                            <div className="relative group">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" size={20} />
                                <input
                                    type="text"
                                    placeholder="Buscar produto ou categoria..."
                                    className="w-full pl-14 pr-6 py-5 bg-slate-50 border-none rounded-[2rem] text-slate-700 font-bold outline-none text-sm placeholder-slate-300 shadow-inner focus:ring-2 focus:ring-blue-500/10"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value.toLowerCase())} // Lowercase search
                                />
                            </div>

                            <div className="space-y-3">
                                {filteredProducts.map(product => {
                                    const cartItem = cart.find(p => p.productId === product.id);
                                    const quantity = cartItem?.quantity || 0;

                                    return (
                                        <div key={product.id} className="premium-card p-3 sm:p-4 flex justify-between items-center gap-2 transition-all">
                                            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                                <div className="w-10 h-10 bg-slate-50 rounded-xl overflow-hidden shadow-inner flex items-center justify-center shrink-0">
                                                    {product.imageUrl ? (
                                                        <img src={product.imageUrl} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <LayoutGrid className="text-slate-200" size={16} />
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[11px] sm:text-xs font-black text-slate-800 uppercase leading-none mb-1 truncate">{product.name}</p>
                                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest truncate">{product.category}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                                                <p className="text-[10px] sm:text-[11px] font-black text-blue-600 tracking-tighter shrink-0">{formatCurrency(product.price)}</p>

                                                {product.maxAvailability !== undefined && product.maxAvailability <= 0 ? (
                                                    <span className="px-2 py-1 bg-red-100 text-red-600 rounded-lg text-[9px] font-black uppercase tracking-widest shrink-0">
                                                        Esgotado
                                                    </span>
                                                ) : quantity > 0 && !product.isPizza ? (
                                                    <div className="flex items-center bg-slate-50 rounded-lg p-0.5 gap-1 border border-slate-100 shrink-0">
                                                        <button
                                                            onClick={() => updateCartQuantity(product.id, -1)}
                                                            className="w-7 h-7 rounded-md bg-white shadow-sm flex items-center justify-center font-black text-slate-400 active:scale-90 transition-transform"
                                                        >
                                                            <Minus size={12} />
                                                        </button>
                                                        <span className="w-4 text-center font-black text-[10px] text-slate-700">{quantity}</span>
                                                        <button
                                                            onClick={() => updateCartQuantity(product.id, 1)}
                                                            className="w-7 h-7 rounded-md bg-blue-600 shadow-sm flex items-center justify-center font-black text-white active:scale-90 transition-transform"
                                                        >
                                                            <Plus size={12} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => {
                                                            if (product.isPizza) {
                                                                setSelectedPizzaForLaunch(product);
                                                                setPizzaFlavors([]);
                                                                setIsPizzaSelectionMode(false);
                                                                setPizzaModalQuantity(1);
                                                                setPizzaObservation('');
                                                                setSelectedAddonsForProduct([]);
                                                            } else if (product.addonGroups && product.addonGroups.length > 0) {
                                                                 setSelectedProductForAddons(product);
                                                            } else {
                                                                 addToCart(product);
                                                            }
                                                        }}
                                                        className="w-8 h-8 sm:w-9 sm:h-9 bg-slate-900 text-white rounded-lg flex items-center justify-center shadow-lg active:scale-95 transition-all shrink-0"
                                                    >
                                                        <Plus size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {activeTab === 'REVIEW' && (
                        <div className="space-y-6">
                            <div className="p-6 bg-amber-50 border border-amber-100 rounded-[2rem] flex items-start gap-4 shadow-sm shadow-amber-500/10">
                                <AlertCircle className="text-amber-500 shrink-0 mt-1" size={24} />
                                <div>
                                    <h4 className="text-xs font-black text-amber-600 uppercase tracking-widest mb-1">Novos Pedidos do Cliente</h4>
                                    <p className="text-[10px] text-amber-500/80 font-bold leading-relaxed uppercase">O cliente solicitou novos itens via QR Code. Verifique e aprove abaixo.</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {pendingItems.map((item: any, ix: number) => (
                                    <div key={ix} className="premium-card p-5 flex justify-between items-center border-amber-100 bg-amber-50/20">
                                        <div>
                                            <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{item.quantity}x {item.productName || 'Item'} {formatCurrency(item.price, false)}</p>
                                            {item.observations && <p className="text-[10px] text-amber-600 font-bold uppercase mt-1 italic tracking-tight">Obs: {item.observations}</p>}
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-slate-900 tracking-tighter">{formatCurrency(item.price * item.quantity)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4">
                                <button
                                    onClick={handleRejectDigital}
                                    className="py-5 bg-red-50 text-red-600 border border-red-100 rounded-[2rem] font-black uppercase text-[11px] tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <Trash2 size={18} />
                                    Rejeitar
                                </button>
                                <button
                                    onClick={handleApproveDigital}
                                    disabled={loading || storeStatus?.status === 'offline' || !isResponsible}
                                    className={`py-5 bg-emerald-600 text-white rounded-[2rem] font-black uppercase text-[11px] tracking-widest shadow-xl shadow-emerald-500/30 active:scale-95 transition-all flex items-center justify-center gap-2 ${storeStatus?.status === 'offline' || !isResponsible ? 'grayscale opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <CheckCircle2 size={18} />
                                    Aceitar Tudo
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Modal de Adicionais */}
                    {selectedProductForAddons && (
                        <ProductAddonModal 
                            product={selectedProductForAddons}
                            onClose={() => setSelectedProductForAddons(null)}
                            onConfirm={(product, quantity, observations, price, selectedOptions) => {
                                addToCart(product, quantity, undefined, observations || undefined, price, selectedOptions);
                                setSelectedProductForAddons(null);
                            }}
                        />
                    )}
                </main>

                {/* Sticky Actions Bar */}
                <div className="p-8 pt-4 bg-white border-t border-slate-50 flex flex-col gap-4 z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                    {activeTab === 'LAUNCH' && cart.length > 0 && (
                        <div className="flex flex-col gap-4">
                            {showCartItems && (
                                <div className="space-y-2 mb-2 max-h-48 overflow-y-auto pr-2 animate-in slide-in-from-bottom-2 duration-200">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2">Itens no Pedido</p>
                                    {cart.map((item) => (
                                        <div key={item.uid} className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                            <div className="min-w-0 flex-1 mr-4">
                                                <p className="text-[11px] font-black text-slate-800 uppercase truncate">
                                                    {item.quantity}x {item.productName} {formatCurrency(item.price, false)}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <p className="text-[10px] font-black text-slate-900 tracking-tighter">
                                                    {formatCurrency((item.price + (item.selectedAddons?.reduce((s, a) => s + a.price, 0) || 0)) * item.quantity)}
                                                </p>
                                                <button
                                                    onClick={() => updateCartQuantity(item.productId, -item.quantity)}
                                                    className="p-2 bg-red-50 text-red-500 rounded-xl active:scale-90 transition-transform"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="flex justify-between items-center px-4">
                                <button
                                    onClick={() => setShowCartItems(!showCartItems)}
                                    className="flex items-center gap-3 active:scale-95 transition-transform"
                                >
                                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black shadow-xl shadow-blue-500/30">
                                        {cart.reduce((s, i) => s + i.quantity, 0)}
                                    </div>
                                    <div className="text-left">
                                        <p className="text-xs font-black text-slate-900 uppercase tracking-tighter">Carrinho</p>
                                        <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">{showCartItems ? 'Ocultar' : 'Ver Itens'}</p>
                                    </div>
                                </button>
                                <p className="text-2xl font-black text-blue-600 tracking-tighter">{formatCurrency(cartTotal)}</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCart([])}
                                    className="p-5 bg-slate-100 text-slate-400 rounded-[2rem] font-black uppercase text-[11px] tracking-widest active:scale-95 transition-all"
                                    title="Limpar Carrinho"
                                >
                                    <Trash2 size={20} />
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={loading || !isResponsible}
                                    className={`flex-1 py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 ${!isResponsible ? 'grayscale opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <ArrowRight size={20} />
                                    {loading ? 'Lançando...' : 'Confirmar Lançamento'}
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'CONSUMPTION' && (
                        <div className="flex justify-between items-center gap-6">
                            <div className="flex-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 px-1">Total Consumido</p>
                                <p className="text-3xl font-black text-slate-900 tracking-tighter">{formatCurrency(total)}</p>
                            </div>
                            <button
                                onClick={() => handleCheckout()}
                                disabled={table.status === 'billing' || loading || !isResponsible || hasPendingItems}
                                className={`px-8 py-5 rounded-[2rem] font-black uppercase text-[11px] tracking-widest transition-all active:scale-95 shadow-xl ${table.status === 'billing' || !isResponsible || hasPendingItems ? 'bg-slate-50 text-slate-300 cursor-not-allowed border border-slate-100' : 'bg-blue-600 text-white shadow-blue-500/20 hover:bg-blue-700'}`}
                            >
                                {loading ? '...' : (table.status === 'billing' ? 'Conta Solicitada' : (hasPendingItems ? 'Itens Pendentes' : 'Solicitar Conta'))}
                            </button>
                        </div>
                    )}
                </div>

                <Modal
                    isOpen={modal.isOpen}
                    type={modal.type}
                    title={modal.title}
                    message={modal.message}
                    onConfirm={() => {
                        if (modal.onConfirm) modal.onConfirm();
                        setModal({ ...modal, isOpen: false });
                    }}
                    onClose={() => setModal({ ...modal, isOpen: false })}
                />

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
                    
                    const addonsTotal = selectedAddonsForProduct.reduce((sum, a) => sum + (a.price * a.quantity), 0);
                    modalSubTotal = (modalSubTotal + addonsTotal) * pizzaModalQuantity;

                    return (
                        <div className="fixed inset-0 z-[150] flex flex-col justify-end bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                            <div className="bg-white w-full h-[90vh] rounded-t-[2.5rem] shadow-2xl flex flex-col animate-in slide-in-from-bottom-10 border-t border-slate-100">
                                {/* Header */}
                                <div className="p-6 pb-4 border-b border-slate-100 flex justify-between items-start bg-slate-50/50 rounded-t-[2.5rem] sticky top-0 z-10 backdrop-blur-xl">
                                    <div>
                                        <span className="text-[10px] font-black uppercase text-indigo-500 tracking-widest bg-indigo-50 px-3 py-1 rounded-full mb-2 inline-block">
                                            Pizza {selectedPizzaForLaunch.pizzaSize} (Até {maxFlavors} sabores)
                                        </span>
                                        <h3 className="text-xl font-black text-slate-800 leading-tight">
                                            {selectedPizzaForLaunch.name}
                                        </h3>
                                    </div>
                                    <button
                                        onClick={() => setSelectedPizzaForLaunch(null)}
                                        className="p-2.5 bg-white text-slate-400 rounded-full hover:bg-rose-50 hover:text-rose-500 transition-all shadow-sm border border-slate-100"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8">
                                    {/* Base Flavor */}
                                    <div className="space-y-3">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div> Sabor Principal
                                        </h4>
                                        <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex justify-between items-center relative overflow-hidden group">
                                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                            <div className="font-bold text-indigo-900">{selectedPizzaForLaunch.name}</div>
                                            <div className="text-sm font-black text-indigo-600">{formatCurrency(selectedPizzaForLaunch.price)}</div>
                                        </div>
                                    </div>

                                    {/* Additional Flavors Question */}
                                    {maxFlavors > 1 && !isPizzaSelectionMode && pizzaFlavors.length === 0 && (
                                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col items-center text-center space-y-4">
                                            <div className="w-14 h-14 bg-indigo-100 text-indigo-500 rounded-2xl flex items-center justify-center mb-2">
                                                <LayoutGrid size={28} />
                                            </div>
                                            <p className="text-[13px] font-bold text-slate-700">Deseja adicionar outros sabores?</p>
                                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-1 mb-4">Você pode adicionar até {maxFlavors - 1} sabores extras.</p>
                                            <div className="flex w-full gap-3 mt-4">
                                                <button onClick={() => setIsPizzaSelectionMode(true)} className="flex-1 py-4 bg-white border border-slate-200 rounded-2xl font-black text-[11px] text-slate-700 uppercase tracking-widest hover:border-indigo-500 hover:text-indigo-600 transition-all shadow-sm">
                                                    Sim, Dividir Pizza
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Flavors Selection Grid */}
                                    {(isPizzaSelectionMode || pizzaFlavors.length > 0) && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <div className="flex justify-between items-center px-1">
                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
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
                                                            className={`p-4 rounded-2xl border transition-all cursor-pointer flex justify-between items-center group ${isSelected ? 'bg-indigo-50 border-indigo-500' : 'bg-white border-slate-100'}`}
                                                            style={{ opacity: !isSelected && !canAdd ? 0.5 : 1 }}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 bg-slate-50'}`}>
                                                                    {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                                                                </div>
                                                                <div className={`font-bold text-sm ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>{p.name}</div>
                                                            </div>
                                                            <div className={`text-xs font-black tracking-tighter ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`}>
                                                            {formatCurrency(p.price)}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Addon Groups for Pizza */}
                                    {selectedPizzaForLaunch.addonGroups?.map(({ addonGroup: group }: any) => (
                                        <div key={group.id} className="space-y-4">
                                            <div className="flex justify-between items-end">
                                                <div>
                                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div> {group.name}
                                                    </h4>
                                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                                                        {group.type === 'SINGLE' ? 'Selecione 1 opção' : 'Selecione uma ou mais'}
                                                    </p>
                                                </div>
                                                {group.isRequired && (
                                                    <span className="bg-amber-100 text-amber-600 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Obrigatório</span>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 gap-3">
                                                {group.options.filter((o: any) => o.active !== false).map((option: any) => {
                                                    const isSelected = selectedAddonsForProduct.find(a => a.addonOptionId === option.id);
                                                    const isOutOfStock = option.trackStock && option.stock <= 0;

                                                    return (
                                                        <div
                                                            key={option.id}
                                                            onClick={() => {
                                                                if (isOutOfStock) return;
                                                                
                                                                if (group.type === 'SINGLE') {
                                                                    const otherGroupOptions = group.options.map((o: any) => o.id);
                                                                    setSelectedAddonsForProduct(prev => [
                                                                        ...prev.filter(a => !otherGroupOptions.includes(a.addonOptionId)),
                                                                        { addonOptionId: option.id, name: option.name, price: option.price, quantity: 1, productId: option.productId, groupId: group.id, groupName: group.name }
                                                                    ]);
                                                                } else {
                                                                    if (isSelected) {
                                                                        setSelectedAddonsForProduct(prev => prev.filter(a => a.addonOptionId !== option.id));
                                                                    } else {
                                                                        setSelectedAddonsForProduct(prev => [...prev, { addonOptionId: option.id, name: option.name, price: option.price, quantity: 1, productId: option.productId, groupId: group.id, groupName: group.name }]);
                                                                    }
                                                                }
                                                            }}
                                                            className={`p-4 rounded-2xl border transition-all cursor-pointer flex justify-between items-center group ${isSelected ? 'bg-indigo-50 border-indigo-500' : 'bg-white border-slate-100'} ${isOutOfStock ? 'opacity-50 grayscale cursor-not-allowed' : 'active:scale-95'}`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-200'}`}>
                                                                    {isSelected && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                                                </div>
                                                                <div className="font-bold text-slate-700 text-sm">{option.name}</div>
                                                            </div>
                                                            <div className={`text-xs font-black ${isSelected ? 'text-indigo-600' : 'text-slate-500'}`}>
                                                                {option.price > 0 ? `+ ${formatCurrency(option.price)}` : 'Grátis'}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}

                                    {/* Observações e Quantidade */}
                                    <div className="space-y-4 pt-4 border-t border-slate-100">
                                        <div className="flex gap-4">
                                            <div className="flex-1 space-y-2">
                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Observações</h4>
                                                <input
                                                    type="text"
                                                    placeholder="Ex: Sem cebola, massa fina..."
                                                    className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl font-bold text-sm focus:ring-4 focus:ring-indigo-50 outline-none text-slate-800 placeholder:text-slate-400 transition-all"
                                                    value={pizzaObservation}
                                                    onChange={e => setPizzaObservation(e.target.value)}
                                                />
                                            </div>
                                            <div className="w-28 space-y-2">
                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 text-center">Qtde</h4>
                                                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-1.5 rounded-2xl">
                                                    <button onClick={() => setPizzaModalQuantity(Math.max(1, pizzaModalQuantity - 1))} className="w-10 h-10 flex items-center justify-center bg-white rounded-xl text-slate-500 hover:text-indigo-500 font-bold shadow-sm transition-colors">-</button>
                                                    <span className="font-black text-slate-700">{pizzaModalQuantity}</span>
                                                    <button onClick={() => setPizzaModalQuantity(pizzaModalQuantity + 1)} className="w-10 h-10 flex items-center justify-center bg-white rounded-xl text-slate-500 hover:text-indigo-500 font-bold shadow-sm transition-colors">+</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Footer */}
                                <div className="p-6 bg-white border-t border-slate-100 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sticky bottom-0">
                                    <button
                                        onClick={() => {
                                            // Validate mandatory addons
                                            const missingGroups = selectedPizzaForLaunch.addonGroups?.filter(({ addonGroup: group }: any) => {
                                                if (!group.isRequired) return false;
                                                const hasSelection = selectedAddonsForProduct.some(a => a.groupId === group.id);
                                                return !hasSelection;
                                            });

                                            if (missingGroups && missingGroups.length > 0) {
                                                showAlert('Atenção', `Selecione pelo menos uma opção para: ${missingGroups.map((g: any) => g.addonGroup.name).join(', ')}`, 'alert');
                                                return;
                                            }

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
                                                {...selectedPizzaForLaunch, price: (modalSubTotal / pizzaModalQuantity) - (selectedAddonsForProduct.reduce((s, a) => s + a.price, 0))}, 
                                                pizzaModalQuantity, 
                                                allFlavors as any,
                                                finalObs || undefined,
                                                modalSubTotal / pizzaModalQuantity,
                                                selectedAddonsForProduct
                                            );
                                            setSelectedPizzaForLaunch(null);
                                        }}
                                        className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase text-[12px] tracking-widest shadow-xl shadow-indigo-200 flex justify-between items-center px-6 active:scale-[0.98] transition-transform"
                                    >
                                        <span>Lançar Pizza</span>
                                        <span>{formatCurrency(modalSubTotal)}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {showClientSelect && (
                    <ClientSelector
                        onSelect={(id, name) => handleCheckout(id, name)}
                        onClose={() => setShowClientSelect(false)}
                    />
                )}
            </div>
        </div>
    );
};

export default TableDetails;
