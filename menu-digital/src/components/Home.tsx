import React, { useState, useEffect } from 'react';
import { MOCK_CATEGORIES, fetchProducts, fetchSettings } from '../api';
import { CartItem, Product } from '../types';

interface HomeProps {
    cart: CartItem[];
    addToCart: (item: CartItem) => void;
    updateQuantity: (cartId: string, qty: number) => void;
}

const Home: React.FC<HomeProps> = ({ cart, addToCart, updateQuantity }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<string[]>(['Todos', ...MOCK_CATEGORIES]);
    const [activeCategory, setActiveCategory] = useState('Todos');
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [settings, setSettings] = useState<any>(null);

    // Pizza States
    const [selectedPizzaForLaunch, setSelectedPizzaForLaunch] = useState<Product | null>(null);
    const [pizzaFlavors, setPizzaFlavors] = useState<Product[]>([]);
    const [isPizzaSelectionMode, setIsPizzaSelectionMode] = useState(false);
    const [pizzaModalQuantity, setPizzaModalQuantity] = useState(1);
    const [pizzaObservation, setPizzaObservation] = useState('');

    useEffect(() => {
        const loadProducts = async () => {
            const data = await fetchProducts();
            setProducts(data);

            // Extrair categorias reais dos produtos se existirem
            const uniqueCategories = Array.from(new Set(data.map(p => p.category))).filter(Boolean);
            if (uniqueCategories.length > 0) {
                setCategories(['Todos', ...uniqueCategories]);
            }

            const sysSettings = await fetchSettings();
            setSettings(sysSettings);

            setIsLoading(false);
        };
        loadProducts();
    }, []);

    // Filtra produtos pela categoria ativa E pelo termo de busca
    const filteredProducts = products.filter(p => {
        // visibility filter
        if (p.showInMenu === false) return false;

        const matchesCategory = activeCategory === 'Todos' || p.category === activeCategory;
        const query = setSearchTerm ? searchTerm.toLowerCase().trim() : ''; 
        const matchesSearch = query ? p.name.toLowerCase().includes(query) : true;
        return matchesCategory && matchesSearch;
    });

    const featuredProducts = products.filter(p => p.isFeatured && p.showInMenu !== false);

    if (isLoading) {
        return (
            <div className="flex justify-center p-12">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="pb-32 px-4 space-y-8 pt-4 animate-fade-in">
            {/* Search Bar Falsa / Destaque */}
            <div className="bg-white p-2 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-3 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-300 ml-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="O que você deseja pedir?"
                    className="w-full bg-transparent border-none text-sm font-black text-slate-700 placeholder-slate-400 focus:outline-none py-2"
                />
            </div>

            {/* Featured Products Section */}
            {featuredProducts.length > 0 && activeCategory === 'Todos' && !searchTerm && (
                <div className="space-y-3 animate-in fade-in slide-in-from-left duration-700">
                    <h2 className="text-sm font-black text-blue-600 uppercase tracking-tighter px-0 flex items-center gap-2">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 fill-blue-600" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        Destaques da Casa
                    </h2>
                    <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4">
                        {featuredProducts.map(product => (
                            <div 
                                key={`featured-${product.id}`}
                                onClick={() => {
                                    if (product.isPizza) {
                                        setSelectedPizzaForLaunch(product);
                                        setPizzaFlavors([]);
                                        setPizzaModalQuantity(1);
                                        setIsPizzaSelectionMode(false);
                                        setPizzaObservation('');
                                    } else {
                                        addToCart({ ...product, quantity: 1, cartId: Math.random().toString(36).substr(2, 9) });
                                    }
                                }}
                                className="min-w-[140px] max-w-[140px] bg-blue-600 rounded-3xl p-3 flex flex-col shadow-lg shadow-blue-200 relative overflow-hidden active:scale-95 transition-all group"
                            >
                                <div className="absolute -top-4 -right-4 w-12 h-12 bg-white/10 rounded-full blur-xl"></div>
                                <div className="w-full aspect-square bg-white rounded-2xl overflow-hidden mb-2.5 flex items-center justify-center p-1 relative">
                                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-xl" />
                                    <div className="absolute top-1 right-1">
                                         <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-amber-400 fill-amber-400" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                    </div>
                                </div>
                                <h5 className="text-white font-bold text-[10px] leading-tight line-clamp-2 h-6 mb-1.5 uppercase tracking-tighter">{product.name}</h5>
                                <div className="flex justify-between items-center mt-auto">
                                    <span className="text-white font-black text-xs">R$ {product.price.toFixed(2)}</span>
                                    <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center text-white">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Categorias */}
            <div className="space-y-3">
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-tighter px-0">Categorias</h2>
                <div className="flex gap-2.5 overflow-x-auto hide-scrollbar pb-2 -mx-4 px-4">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`shrink-0 px-5 py-2.5 rounded-2xl text-[10px] sm:text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 ${activeCategory === cat
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-100'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Lista de Produtos */}
            <div className="space-y-4">
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-tighter mb-4">
                    {searchTerm ? `Resultados para "${searchTerm}"` : activeCategory}
                </h2>
                {filteredProducts.length === 0 ? (
                    <p className="text-center text-slate-400 font-bold py-8">Nenhum produto encontrado.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredProducts.map(product => {
                            const cartItem = product.isPizza ? undefined : cart.find(i => i.id === product.id && !i.pizzaFlavors?.length && !i.observations);
                            const quantity = cartItem?.quantity || 0;

                            return (
                                <div key={product.id} className="bg-white p-3 sm:p-4 rounded-3xl border border-slate-100 shadow-sm flex gap-3 sm:gap-4 overflow-hidden relative group h-full">
                                    {/* Imagem */}
                                    <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-2xl overflow-hidden bg-slate-50 group-hover:shadow-inner transition-all">
                                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0">
                                        <div className="min-w-0">
                                            <h3 className="text-xs sm:text-sm font-black text-slate-800 leading-tight uppercase tracking-tighter line-clamp-2 break-words">{product.name}</h3>
                                        </div>

                                        <div className="flex items-center justify-between mt-1 sm:mt-2">
                                            <span className="text-base sm:text-lg font-black text-blue-600 tracking-tighter shrink-0">
                                                R$ {product.price.toFixed(2)}
                                            </span>

                                            {/* Controles de Quantidade */}
                                            {product.maxAvailability !== undefined && product.maxAvailability <= 0 ? (
                                                <span className="px-3 sm:px-4 py-1.5 sm:py-2 bg-red-100 text-red-600 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest shrink-0">
                                                    Esgotado
                                                </span>
                                            ) : quantity > 0 && !product.isPizza ? (
                                                <div className="flex items-center bg-slate-100 rounded-xl p-0.5 sm:p-1 gap-1.5 sm:gap-2 shadow-inner shrink-0">
                                                    <button
                                                        onClick={() => updateQuantity(cartItem!.cartId, quantity - 1)}
                                                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white shadow-sm flex items-center justify-center font-black text-slate-500 active:scale-90 transition-transform"
                                                    >
                                                        -
                                                    </button>
                                                    <span className="w-5 text-center font-black text-xs sm:text-sm">{quantity}</span>
                                                    <button
                                                        onClick={() => updateQuantity(cartItem!.cartId, quantity + 1)}
                                                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-600 shadow-sm shadow-blue-500/50 flex items-center justify-center font-black text-white active:scale-90 transition-transform"
                                                    >
                                                        +
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
                                                        } else {
                                                            addToCart({ ...product, quantity: 1, cartId: Math.random().toString(36).substr(2, 9) });
                                                        }
                                                    }}
                                                    className="px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-900 text-white rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all shrink-0"
                                                >
                                                    Pedir
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

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
                        <div className="bg-white max-w-2xl mx-auto w-full h-[90vh] rounded-t-[2.5rem] shadow-2xl flex flex-col animate-in slide-in-from-bottom-10 border-t border-slate-100">
                            {/* Header */}
                            <div className="p-6 pb-4 border-b border-slate-100 flex justify-between items-start bg-slate-50/50 rounded-t-[2.5rem] sticky top-0 z-10 backdrop-blur-xl">
                                <div>
                                    <span className="text-[10px] font-black uppercase text-blue-500 tracking-widest bg-blue-50 px-3 py-1 rounded-full mb-2 inline-block">
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
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8">
                                {/* Base Flavor */}
                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> Sabor Principal Selecionado
                                    </h4>
                                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex justify-between items-center relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        <div className="font-bold text-blue-900">{selectedPizzaForLaunch.name}</div>
                                        <div className="text-sm font-black text-blue-600">R$ {selectedPizzaForLaunch.price.toFixed(2)}</div>
                                    </div>
                                </div>

                                {/* Additional Flavors Question */}
                                {maxFlavors > 1 && !isPizzaSelectionMode && pizzaFlavors.length === 0 && (
                                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col items-center text-center space-y-4">
                                        <div className="w-14 h-14 bg-blue-100 text-blue-500 rounded-2xl flex items-center justify-center mb-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 11h.01"/><path d="M11 15h.01"/><path d="M16 16h.01"/><path d="m2 16 20 6-6-20A20 20 0 0 0 2 16"/><path d="M5.71 17.11a17.04 17.04 0 0 1 11.4-11.4"/></svg>
                                        </div>
                                        <p className="text-[13px] font-bold text-slate-700">Deseja adicionar outros sabores?</p>
                                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-1 mb-4">Você pode adicionar até {maxFlavors - 1} sabores extras.</p>
                                        <div className="flex w-full gap-3 mt-4">
                                            <button onClick={() => setIsPizzaSelectionMode(true)} className="flex-1 py-4 bg-white border border-slate-200 rounded-2xl font-black text-[11px] text-slate-700 uppercase tracking-widest hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm">
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
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                                                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex justify-between items-center group ${isSelected ? 'bg-blue-50 border-blue-500' : 'bg-white border-slate-100'}`}
                                                        style={{ opacity: !isSelected && !canAdd ? 0.5 : 1 }}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-300 bg-slate-50'}`}>
                                                                {isSelected && <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                                            </div>
                                                            <div className={`font-bold text-sm ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>{p.name}</div>
                                                        </div>
                                                        <div className={`text-xs font-black tracking-tighter ${isSelected ? 'text-blue-600' : 'text-slate-400'}`}>
                                                            R$ {p.price.toFixed(2)}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Observações e Quantidade */}
                                <div className="space-y-4 pt-4 border-t border-slate-100">
                                    <div className="flex gap-4">
                                        <div className="flex-1 space-y-2">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Observações</h4>
                                            <input
                                                type="text"
                                                placeholder="Ex: Sem cebola, massa fina..."
                                                className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl font-bold text-sm focus:ring-4 focus:ring-blue-50 outline-none text-slate-800 placeholder:text-slate-400 transition-all"
                                                value={pizzaObservation}
                                                onChange={e => setPizzaObservation(e.target.value)}
                                            />
                                        </div>
                                        <div className="w-28 space-y-2">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 text-center">Qtde</h4>
                                            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-1.5 rounded-2xl">
                                                <button onClick={() => setPizzaModalQuantity(Math.max(1, pizzaModalQuantity - 1))} className="w-10 h-10 flex items-center justify-center bg-white rounded-xl text-slate-500 hover:text-blue-500 font-bold shadow-sm transition-colors">-</button>
                                                <span className="font-black text-slate-700">{pizzaModalQuantity}</span>
                                                <button onClick={() => setPizzaModalQuantity(pizzaModalQuantity + 1)} className="w-10 h-10 flex items-center justify-center bg-white rounded-xl text-slate-500 hover:text-blue-500 font-bold shadow-sm transition-colors">+</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Footer */}
                            <div className="p-6 bg-white border-t border-slate-100 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sticky bottom-0 rounded-b-[2.5rem]">
                                <button
                                    onClick={() => {
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

                                        addToCart({
                                            ...selectedPizzaForLaunch, 
                                            price: modalSubTotal / pizzaModalQuantity,
                                            cartId: Math.random().toString(36).substr(2, 9),
                                            quantity: pizzaModalQuantity,
                                            pizzaFlavors: allFlavors,
                                            observations: finalObs || undefined
                                        });
                                        setSelectedPizzaForLaunch(null);
                                    }}
                                    className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-[12px] tracking-widest shadow-xl shadow-blue-200 flex justify-between items-center px-6 active:scale-[0.98] transition-transform"
                                >
                                    <span>Adicionar ao Carrinho</span>
                                    <span>R$ {modalSubTotal.toFixed(2)}</span>
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
