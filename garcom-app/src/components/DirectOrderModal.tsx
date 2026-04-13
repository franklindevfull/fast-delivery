import React, { useState, useEffect } from 'react';
import { Minus, Plus, X, Search, LayoutGrid, Check, Trash2 } from 'lucide-react';
import { db } from '../api';
import { formatCurrency } from '../utils';
import type { User, Product, OrderItem, SaleType, StoreStatus } from '../types';
import Modal from './Modal';
import ClientSelector from './ClientSelector';

interface DirectOrderModalProps {
    user: User;
    onClose: () => void;
    onRefresh: () => void;
    storeStatus?: StoreStatus;
    resolvedWaiterId?: string | null;
}

const DirectOrderModal: React.FC<DirectOrderModalProps> = ({ user, onClose, onRefresh, storeStatus, resolvedWaiterId }) => {
    const orderType: SaleType = 'COUNTER';
    const [products, setProducts] = useState<Product[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [cart, setCart] = useState<OrderItem[]>([]);
    const [showCartItems, setShowCartItems] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showClientSelect, setShowClientSelect] = useState(false);
    const [settings, setSettings] = useState<any>(null);

    // Pizza States
    const [selectedPizzaForLaunch, setSelectedPizzaForLaunch] = useState<Product | null>(null);
    const [selectedProductForAddons, setSelectedProductForAddons] = useState<Product | null>(null);
    const [pizzaFlavors, setPizzaFlavors] = useState<Product[]>([]);
    const [isPizzaSelectionMode, setIsPizzaSelectionMode] = useState(false);
    const [pizzaModalQuantity, setPizzaModalQuantity] = useState(1);
    const [pizzaObservation, setPizzaObservation] = useState('');

    const [modal, setModal] = useState<{
        isOpen: boolean;
        type: 'success' | 'error' | 'alert' | 'confirm';
        title: string;
        message: string;
        onConfirm?: () => void;
    }>({ isOpen: false, type: 'alert', title: '', message: '' });

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const data = await db.getProducts();
                setProducts(data);
                const st = await db.getSettings();
                setSettings(st);
            } catch (e) {
                console.error(e);
            }
        };
        fetchProducts();
    }, []);

    const showAlert = (title: string, message: string, type: any = 'info', onConfirm?: () => void) => {
        setModal({ isOpen: true, title, message, type, onConfirm });
    };

    const addToCart = (product: Product, quantity = 1, flavors?: Product[], observations?: string, price?: number, selectedAddons?: any[]) => {
        setCart(prev => {
            if (flavors?.length || observations || selectedAddons?.length) {
                return [...prev, {
                    uid: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    productId: product.id,
                    productName: product.name,
                    product,
                    quantity,
                    price: price || product.price,
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
                uid: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                productId: product.id,
                productName: product.name,
                product,
                quantity,
                price: price || product.price
            }];
        });
    };

    const updateCartQuantity = (productId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.productId === productId) {
                const newQty = Math.max(0, item.quantity + delta);
                return newQty === 0 ? null : { ...item, quantity: newQty };
            }
            return item;
        }).filter(Boolean) as OrderItem[]);
    };

    const handleConfirmOrder = () => {
        if (cart.length === 0) return;
        setShowClientSelect(true);
    };

    const submitOrder = async (clientId: string | null, clientName: string) => {
        setLoading(true);
        setShowClientSelect(false);
        try {
            const total = cart.reduce((acc, item) => {
                const addonsTotal = item.selectedAddons?.reduce((sum, a) => sum + a.price, 0) || 0;
                return acc + ((item.price + addonsTotal) * item.quantity);
            }, 0);
            const orderPayload = {
                id: `PED-${Date.now()}`,
                type: orderType,
                status: 'PENDING',
                clientId,
                clientName,
                waiterId: resolvedWaiterId || user.waiterId || user.id,
                total,
                items: cart.map(item => ({
                    uid: item.uid,
                    productId: item.productId,
                    quantity: item.quantity,
                    price: item.price,
                    observations: item.observations,
                    selectedAddons: item.selectedAddons,
                    pizzaFlavors: item.pizzaFlavors
                }))
            };

            await db.createOrder(orderPayload);
            showAlert('Sucesso', 'Pedido lançado com sucesso!', 'success', () => {
                onRefresh();
                onClose();
            });
        } catch (e: any) {
            showAlert('Erro', e.message || 'Erro ao lançar pedido', 'error');
        } finally {
            setLoading(false);
        }
    };

    const cartTotal = cart.reduce((acc, item) => {
        const addonsTotal = item.selectedAddons?.reduce((sum, a) => sum + a.price, 0) || 0;
        return acc + ((item.price + addonsTotal) * item.quantity);
    }, 0);
    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex flex-col animate-in fade-in duration-300" onClick={onClose}>
            <div
                className="mt-auto bg-white w-full rounded-t-[3rem] max-h-[92vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-500 overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <header className="p-8 pb-4 flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="px-4 py-1.5 bg-slate-900 text-white text-[10px] font-black rounded-full uppercase tracking-widest shadow-lg">Lançamento Direto</span>
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">Novo Balcão</h2>
                    </div>
                    <button onClick={onClose} className="p-3 bg-slate-100 rounded-2xl text-slate-400 active:scale-90 transition-all">
                        <X size={24} />
                    </button>
                </header>

                {/* Subtitle/Description */}
                <div className="px-8 mb-6">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 p-3 rounded-2xl text-center border border-slate-100 italic">
                        O pedido será processado como venda direta no balcão e enviado para a cozinha.
                    </p>
                </div>

                {/* Product Search */}
                <div className="px-8 mb-4 group relative">
                    <Search className="absolute left-12 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar produto..."
                        className="w-full pl-12 pr-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-700 font-bold outline-none text-sm placeholder-slate-300 shadow-inner focus:ring-2 focus:ring-blue-500/10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Product List */}
                <main className="flex-1 overflow-y-auto px-8 pb-4 hide-scrollbar">
                    <div className="space-y-3">
                        {filteredProducts.map(product => {
                            const cartItem = cart.find(p => p.productId === product.id);
                            const quantity = cartItem?.quantity || 0;

                            return (
                                <div key={product.id} className="premium-card p-4 flex justify-between items-center gap-3">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="w-10 h-10 bg-slate-50 rounded-xl overflow-hidden shadow-inner flex items-center justify-center shrink-0">
                                            {product.imageUrl ? (
                                                <img src={product.imageUrl} className="w-full h-full object-cover" />
                                            ) : (
                                                <LayoutGrid className="text-slate-200" size={16} />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-black text-slate-800 uppercase mb-0.5 truncate">{product.name}</p>
                                            <p className="text-[8px] font-black text-blue-600 tracking-tighter">{formatCurrency(product.price)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        {product.maxAvailability !== undefined && product.maxAvailability <= 0 ? (
                                            <span className="px-2 py-1 bg-red-100 text-red-600 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                                Esgotado
                                            </span>
                                        ) : quantity > 0 && !product.isPizza ? (
                                            <div className="flex items-center bg-slate-50 rounded-lg p-0.5 gap-1 border border-slate-100">
                                                <button
                                                    onClick={() => updateCartQuantity(product.id, -1)}
                                                    className="w-8 h-8 rounded-md bg-white shadow-sm flex items-center justify-center font-black text-slate-400 active:scale-90"
                                                >
                                                    <Minus size={12} />
                                                </button>
                                                <span className="w-6 text-center font-black text-xs text-slate-700">{quantity}</span>
                                                <button
                                                    onClick={() => updateCartQuantity(product.id, 1)}
                                                    className="w-8 h-8 rounded-md bg-blue-600 shadow-sm flex items-center justify-center font-black text-white active:scale-90"
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
                                                        setPizzaModalQuantity(1);
                                                        setIsPizzaSelectionMode(false);
                                                        setPizzaObservation('');
                                                    } else if (product.addonGroups && product.addonGroups.length > 0) {
                                                        setSelectedProductForAddons(product);
                                                    } else {
                                                        addToCart(product);
                                                    }
                                                }}
                                                className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg active:scale-95"
                                            >
                                                <Plus size={18} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Modal de Adicionais */}
                    {selectedProductForAddons && (() => {
                        const product = selectedProductForAddons;
                        const [selectedOptions, setSelectedOptions] = useState<any[]>([]);
                        const [observations, setObservations] = useState('');
                        const [quantity, setQuantity] = useState(1);

                        const groups = product.addonGroups?.map(ag => ag.addonGroup).filter(g => g.active) || [];

                        const isValid = groups.every(group => {
                            if (!group.isRequired) return true;
                            return selectedOptions.some(opt => opt.groupId === group.id);
                        });

                        const handleToggleOption = (group: any, option: any) => {
                            if (group.type === 'SINGLE') {
                                setSelectedOptions(prev => [
                                    ...prev.filter(o => o.groupId !== group.id),
                                    { ...option, groupId: group.id, groupName: group.name }
                                ]);
                            } else {
                                const exists = selectedOptions.find(o => o.id === option.id);
                                if (exists) {
                                    setSelectedOptions(prev => prev.filter(o => o.id !== option.id));
                                } else {
                                    setSelectedOptions(prev => [...prev, { ...option, groupId: group.id, groupName: group.name }]);
                                }
                            }
                        };

                        const addonsTotal = selectedOptions.reduce((sum, opt) => sum + opt.price, 0);
                        const subtotal = (product.price + addonsTotal) * quantity;

                        return (
                            <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-slate-900/60 backdrop-blur-sm px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] mb-20 animate-in fade-in duration-300">
                                <div className="bg-white mx-auto w-full max-h-[85vh] rounded-[2rem] shadow-2xl flex flex-col animate-in slide-in-from-bottom border border-slate-100 overflow-hidden" onClick={e => e.stopPropagation()}>
                                    <div className="p-5 border-b border-slate-100 flex justify-between items-start bg-slate-50 sticky top-0 z-10">
                                        <div>
                                            <h3 className="text-lg font-black text-slate-800 leading-tight uppercase tracking-tighter">{product.name}</h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Personalize seu pedido</p>
                                        </div>
                                        <button onClick={() => setSelectedProductForAddons(null)} className="p-2 bg-white text-slate-400 rounded-full hover:bg-rose-50 hover:text-rose-500 shadow-sm transition-colors active:scale-95">
                                            <Plus size={16} className="rotate-45" />
                                        </button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-5 pb-8 space-y-8 hide-scrollbar">
                                        {groups.map(group => (
                                            <div key={group.id} className="space-y-4">
                                                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                                    <div>
                                                        <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">{group.name}</h4>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{group.type === 'SINGLE' ? 'Escolha um' : 'Escolha vários'}</p>
                                                    </div>
                                                    {group.isRequired && (
                                                        <span className="px-3 py-1 bg-slate-900 text-white text-[8px] font-black rounded-lg uppercase tracking-widest">Obrigatório</span>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-1 gap-2">
                                                    {group.options.filter(o => o.active).map(option => {
                                                        const isSelected = selectedOptions.some(o => o.id === option.id);
                                                        return (
                                                            <button
                                                                key={option.id}
                                                                onClick={() => handleToggleOption(group, option)}
                                                                className={`p-4 rounded-2xl border-2 transition-all flex justify-between items-center text-left ${isSelected ? 'bg-blue-50 border-blue-600 shadow-lg shadow-blue-500/10' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200'}`}>
                                                                        {isSelected && <Check size={12} strokeWidth={3} />}
                                                                    </div>
                                                                    <span className={`text-[11px] font-black uppercase ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>{option.name}</span>
                                                                </div>
                                                                {option.price > 0 && <span className={`text-[10px] font-black ${isSelected ? 'text-blue-600' : 'text-slate-400'}`}>+ {formatCurrency(option.price)}</span>}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}

                                        <div className="space-y-3 pt-4">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Observações</h4>
                                            <textarea
                                                placeholder="Ex: Sem cebola, ponto da carne..."
                                                value={observations}
                                                onChange={e => setObservations(e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl font-bold text-xs text-slate-700 outline-none focus:ring-4 focus:ring-blue-100 placeholder-slate-300 resize-none h-24"
                                            />
                                        </div>

                                        <div className="flex items-center justify-between bg-slate-900 p-2 rounded-[1.8rem] shadow-xl text-white">
                                            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center font-black active:scale-90 transition-transform text-lg">-</button>
                                            <div className="flex flex-col items-center">
                                                <span className="text-sm font-black italic tracking-tighter">{quantity}</span>
                                                <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 opacity-50">Quantidade</span>
                                            </div>
                                            <button onClick={() => setQuantity(quantity + 1)} className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center font-black active:scale-90 transition-transform text-lg">+</button>
                                        </div>
                                    </div>

                                    <div className="p-6 bg-white border-t border-slate-100 flex gap-3">
                                        <button
                                            disabled={!isValid}
                                            onClick={() => {
                                                addToCart(product, quantity, undefined, observations || undefined, product.price, selectedOptions);
                                                setSelectedProductForAddons(null);
                                            }}
                                            className={`flex-1 py-5 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] flex justify-between px-6 items-center shadow-xl transition-all active:scale-[0.98] ${isValid ? 'bg-blue-600 text-white shadow-blue-500/30' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
                                        >
                                            <span>{isValid ? 'Adicionar ao Pedido' : 'Selecione as opções'}</span>
                                            {isValid && <span className="text-sm font-black tracking-tighter">{formatCurrency(subtotal)}</span>}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </main>

                {/* Footer Actions */}
                <div className="p-8 pt-4 bg-white border-t border-slate-50 flex flex-col gap-4 z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                    {cart.length > 0 && (
                        <div className="flex flex-col gap-4">
                            {showCartItems && (
                                <div className="space-y-2 mb-2 max-h-48 overflow-y-auto pr-2 animate-in slide-in-from-bottom-2 duration-200">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2">Itens no Lançamento</p>
                                    {cart.map((item) => (
                                        <div key={item.uid} className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                            <div className="min-w-0 flex-1 mr-4">
                                                <p className="text-[11px] font-black text-slate-800 uppercase truncate">
                                                    {item.quantity}x {item.productName || item.product?.name || 'Produto'} {formatCurrency(item.price, false)}
                                                </p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <p className="text-[10px] font-black text-slate-900 tracking-tighter">
                                                    {formatCurrency((item.price + (item.selectedAddons?.reduce((s, a) => s + a.price, 0) || 0)) * item.quantity)}
                                                </p>
                                                {item.selectedAddons && item.selectedAddons.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 justify-end max-w-[150px]">
                                                        {item.selectedAddons.map((addon: any, idx: number) => (
                                                            <span key={idx} className="text-[7px] font-black bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md border border-blue-100/50 uppercase tracking-widest">
                                                                + {addon.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
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
                                        <p className="text-xs font-black text-slate-900 uppercase tracking-tighter">Resumo</p>
                                        <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">{showCartItems ? 'Ocultar' : 'Ver Tudo'}</p>
                                    </div>
                                </button>
                                <p className="text-2xl font-black text-blue-600 tracking-tighter">{formatCurrency(cartTotal)}</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCart([])}
                                    className="p-5 bg-slate-100 text-slate-400 rounded-[2rem] font-black uppercase text-[11px] tracking-widest active:scale-95 transition-all"
                                    title="Limpar Tudo"
                                >
                                    <Trash2 size={20} />
                                </button>
                                <button
                                    onClick={() => {
                                        if (storeStatus?.status === 'offline') return;
                                        handleConfirmOrder();
                                    }}
                                    disabled={loading || storeStatus?.status === 'offline'}
                                    className={`flex-1 py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 ${storeStatus?.status === 'offline' ? 'grayscale opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <Check size={20} />
                                    {loading ? 'Processando...' : (storeStatus?.status === 'offline' ? 'Loja Offline' : 'Prosseguir')}
                                </button>
                            </div>
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

                {showClientSelect && (
                    <ClientSelector
                        onSelect={(id, name) => submitOrder(id, name)}
                        onClose={() => setShowClientSelect(false)}
                        title="Dono do Pedido"
                    />
                )}
            </div>
        </div>
    );
};

export default DirectOrderModal;
