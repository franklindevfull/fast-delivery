
import React, { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Order, OrderStatus, OrderStatusLabels, Product, InventoryItem, User, SaleType, OrderItem, Waiter, BusinessSettings } from '../types';
import { db } from '../services/db';
import { socket } from '../services/socket';
import { Icons } from '../constants';
import { useDigitalAlert } from '../hooks/useDigitalAlert';
import { useToast } from '../hooks/useToast';
import { formatAddress, formatCurrency } from '../services/formatUtils';
import { AddonDisplay } from '../components/AddonDisplay';



const getPizzaPiecesBySize = (size: string) => {
  const s = size.toUpperCase();
  if (s === 'P' || s.includes('BROTO')) return 4;
  if (s === 'M') return 6;
  if (s === 'G') return 8;
  if (s === 'GG' || s.includes('FAMILIA')) return 12;
  return 8; // Default
};

const Kitchen: React.FC = () => {
  const { addToast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const triggerPrint = useReactToPrint({ contentRef });
  const { isAlerting, dismissAlert } = useDigitalAlert();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [viewTab, setViewTab] = useState<'FILA' | 'HISTORICO'>('FILA');
  const [isLoading, setIsLoading] = useState(false);
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null);
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);
  const [viewingItemsOrder, setViewingItemsOrder] = useState<Order | null>(null);
  const [excludedFichas, setExcludedFichas] = useState<Set<string>>(new Set());

  // Controle de seleção local por pedido: { orderId: [uids selecionados] }
  const [selectedItems, setSelectedItems] = useState<Record<string, string[]>>({});
  const [acknowledgedOrders, setAcknowledgedOrders] = useState<Set<string>>(new Set());

  const prevItemCounts = useRef<Record<string, number>>({});
  const lastOrdersCount = useRef<number>(0);

  useEffect(() => {
    const session = db.getCurrentSession();
    if (session) setCurrentUser(session.user);

    refreshData(true);
    const interval = setInterval(() => refreshData(false), 10000); // 10s para Render Free

    // Socket.io Real-time
    const handleRealtimeUpdate = () => refreshData(false);
    socket.on('newOrder', handleRealtimeUpdate);
    socket.on('tableStatusChanged', handleRealtimeUpdate);
    socket.on('orderStatusChanged', handleRealtimeUpdate);

    return () => {
      clearInterval(interval);
      socket.off('newOrder', handleRealtimeUpdate);
      socket.off('tableStatusChanged', handleRealtimeUpdate);
      socket.off('orderStatusChanged', handleRealtimeUpdate);
    };
  }, [viewTab]);

  const refreshData = async (isFirstLoad: boolean) => {
    setIsLoading(true);
    try {
      const allOrders = await db.getOrders();
      const allProducts = await db.getProducts();
      const allInventory = await db.getInventory();
      const allWaiters = await db.getWaiters();
      const settings = await db.getSettings();

      const now = new Date();
      // Filtro de 07 dias: mantém pedidos da última semana na memória do frontend
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const recentOrders = allOrders.filter(o => {
          const orderDate = new Date(o.createdAt);
          return orderDate >= sevenDaysAgo;
      });

      // Filtro inteligente: Pedidos ativos (não finalizados ou cancelados) QUE POSSUEM itens em preparo. Agora os pedidos ficam na tela até o pagamento = DELIVERED, independentemente se os itens estão prontos.
      const activeOrders = recentOrders.filter(o =>
        o.status !== OrderStatus.CANCELLED &&
        o.status !== OrderStatus.DELIVERED &&
        o.items.length > 0 &&
        !(o.isOriginDeliveryApp && o.status === OrderStatus.PENDING)
      );

      // Detectar novos itens em pedidos existentes para resetar o blink
      activeOrders.forEach(order => {
        const currentCount = order.items.length;
        const prevCount = prevItemCounts.current[order.id] || 0;

        if (currentCount > prevCount && !isFirstLoad) {
          // Se aumentou o número de itens, remove do acknowledged para voltar a piscar
          setAcknowledgedOrders(prev => {
            const next = new Set(prev);
            next.delete(order.id);
            return next;
          });
        }
        prevItemCounts.current[order.id] = currentCount;
      });

      lastOrdersCount.current = activeOrders.length;

      if (viewTab === 'FILA') {
        setOrders(activeOrders.sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
      } else {
        // Histórico mostra pedidos recentes que tem itens prontos
        const finished = recentOrders.filter(o => o.items.some(it => it.isReady))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setOrders(finished);
      }

      setProducts(allProducts);
      setInventory(allInventory);
      setWaiters(allWaiters);
      setBusinessSettings(settings);
    } catch (error) {
      console.error("Error refreshing Kitchen data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleItemSelection = (orderId: string, itemUid: string) => {
    // Acknowledge order on any interaction
    if (!acknowledgedOrders.has(orderId)) {
      setAcknowledgedOrders(prev => new Set(prev).add(orderId));
    }
    setSelectedItems(prev => {
      const current = prev[orderId] || [];
      const next = current.includes(itemUid)
        ? current.filter(uid => uid !== itemUid)
        : [...current, itemUid];
      return { ...prev, [orderId]: next };
    });
  };

  const markSelectedAsReady = async (order: Order) => {
    if (!currentUser) return;
    const itemsToMark = selectedItems[order.id] || [];
    if (itemsToMark.length === 0) {
      addToast({ title: 'Aviso', message: "Selecione ao menos um item para finalizar.", type: 'INFO' });
      return;
    }

    const updatedItems = order.items.map(it => {
      if (itemsToMark.includes(it.uid)) {
        return { ...it, isReady: true, readyAt: new Date().toISOString() };
      }
      return it;
    });

    const allReady = updatedItems.every(it => it.isReady);
    const anyReady = updatedItems.some(it => it.isReady);
    const updatedOrder: Order = {
      ...order,
      items: updatedItems,
      status: allReady ? OrderStatus.READY : (anyReady ? OrderStatus.PARTIALLY_READY : OrderStatus.PREPARING)
    };

    try {
      await db.markItemsReady(order.id, itemsToMark, currentUser);
    } catch (error: any) {
      addToast({ title: 'Erro', message: error.message || "Erro ao salvar pedido na cozinha.", type: 'DANGER' });
    }

    setSelectedItems(prev => {
      const next = { ...prev };
      delete next[order.id];
      return next;
    });

    await refreshData(false);
  };

  const handlePrint = (order: Order) => {
    setPrintingOrder(order);
    setExcludedFichas(new Set()); // Reset exclusions on new print
  };


  const translateOrderType = (type: SaleType | string) => {
    switch (type) {
      case SaleType.COUNTER: return 'Balcão';
      case SaleType.TABLE: return 'Mesa';
      case SaleType.OWN_DELIVERY: return 'Delivery';
      default: return type;
    }
  };

  const getWaiterName = (waiterId?: string) => {
    if (!waiterId) return 'Garçom Externo';
    return waiters.find(w => w.id === waiterId)?.name || 'Garçom';
  };

  return (
    <div className="h-full flex flex-col space-y-6 rounded-[2rem] p-6 transition-all duration-300 relative" onClick={() => { if (isAlerting) dismissAlert(); }}>
      {isLoading && (
        <div className="absolute top-0 left-6 right-6 h-1 bg-indigo-100/20 overflow-hidden z-20 rounded-full">
          <div className="h-full bg-indigo-600 animate-[loading_2s_infinite]"></div>
        </div>
      )}
      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
      <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 mb-8 no-print shrink-0 mt-2">
        <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-1.5 md:p-2 rounded-2xl md:rounded-full w-full md:w-max shadow-sm border border-slate-100 dark:border-slate-800 overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setViewTab('FILA')}
            className={`flex-1 md:flex-none px-6 md:px-8 py-3 md:py-3.5 rounded-xl md:rounded-full text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${viewTab === 'FILA' ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            Fila de Produção
          </button>
          <button
            onClick={() => setViewTab('HISTORICO')}
            className={`flex-1 md:flex-none px-6 md:px-8 py-3 md:py-3.5 rounded-xl md:rounded-full text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${viewTab === 'HISTORICO' ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            Histórico de Produção
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {orders.length > 0 ? (
          viewTab === 'FILA' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 md:gap-x-6 gap-y-10 md:gap-y-14 h-full overflow-y-auto pr-2 custom-scrollbar content-start items-start pb-4">
              {orders.map(order => (
                <div
                  key={order.id}
                  onClick={() => {
                    if (!acknowledgedOrders.has(order.id)) {
                      setAcknowledgedOrders(prev => new Set(prev).add(order.id));
                    }
                  }}
                  className={`bg-white dark:bg-slate-800 rounded-[2rem] border-2 transition-all flex flex-col overflow-hidden shadow-sm hover:shadow-xl border-blue-100 dark:border-blue-900/30 ${!acknowledgedOrders.has(order.id) ? 'animate-moderate-blink border-blue-400 dark:border-blue-500' : ''}`}
                >
                  <div className="flex flex-col p-6 bg-blue-50 dark:bg-blue-900/20">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter truncate">
                          {translateOrderType(order.type)} {order.tableNumber ? `- MESA ${order.tableNumber}` : ''}
                        </h4>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest truncate">
                          {order.clientName || 'Cliente Direto'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrint(order);
                          }}
                          className="p-2 bg-white dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl shadow-sm hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 transition-all active:scale-90"
                          title="Imprimir Cupom de Produção"
                        >
                          <Icons.Print size={14} />
                        </button>
                        <span className="text-[10px] font-black bg-white dark:bg-blue-900/40 px-3 py-1 rounded-full text-blue-600 dark:text-blue-400 shadow-sm">
                          {new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(order.createdAt))}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 md:p-6 flex-1 flex flex-col min-h-0">
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                        Itens Pendentes
                      </p>
                    </div>
                    <div className="space-y-2 overflow-y-auto pr-1 custom-scrollbar max-h-[350px] md:max-h-[450px]">
                      {order.items.filter(it => !it.skipKitchen).map((item) => {
                        const product = products.find(p => p.id === item.productId);
                        const isSelected = (selectedItems[order.id] || []).includes(item.uid);
                        const isReady = item.isReady;

                        return (
                          <div key={item.uid} className={`space-y-1 animate-in fade-in duration-300 ${isReady ? 'opacity-60 grayscale' : ''}`}>
                            <label className={`block ${isReady ? 'cursor-default pointer-events-none' : 'cursor-pointer'} bg-white dark:bg-slate-900/40 p-3 rounded-xl border transition-all shadow-sm ${isSelected ? 'border-blue-600 dark:border-blue-500 ring-2 ring-blue-50 dark:ring-blue-900/20' : 'border-slate-100 dark:border-slate-800 hover:border-blue-100 dark:hover:border-blue-900/40'}`}>
                              <div className="flex items-center gap-3">
                                {!isReady ? (
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleItemSelection(order.id, item.uid)}
                                    className="w-4 h-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500"
                                  />
                                ) : (
                                  <Icons.Check className="w-5 h-5 text-emerald-500" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className={`font-black text-slate-700 dark:text-slate-300 uppercase text-[11px] truncate ${isReady ? 'line-through text-slate-500 dark:text-slate-500' : ''}`}>
                                    <span className="text-blue-600 dark:text-blue-400 text-xs">{item.quantity}x</span> {product?.name}
                                    {item.selectedAddons && item.selectedAddons.length > 0 && (
                                      <span className="ml-2 text-[8px] bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-md font-black uppercase tracking-widest">
                                        + Adicionais
                                      </span>
                                    )}
                                  </p>
                                  {item.observations && (
                                    <p className="inline-block text-[9px] text-orange-600 dark:text-orange-400 font-bold bg-orange-100/50 dark:bg-orange-900/20 px-2 py-0.5 rounded-md mt-1 border border-orange-200/50 dark:border-orange-900/30">
                                      Obs: {item.observations}
                                    </p>
                                  )}
                                  <AddonDisplay 
                                    addons={item.selectedAddons || []} 
                                    products={products} 
                                    className="text-[9px] font-bold text-blue-600 dark:text-blue-400 mt-1 pl-1"
                                  />
                                  
                                  {/* Ficha Técnica / Instruções de Preparo */}
                                  {(() => {
                                    const itemsToRenderMap = new Set();
                                    const itemsToRender = [];
                                    
                                    const hasFlavors = item.pizzaFlavors && Array.isArray(item.pizzaFlavors) && item.pizzaFlavors.length > 0;
                                    
                                    // Adiciona o produto principal se tiver ficha E não houver sabores (para evitar duplicidade)
                                    if (!hasFlavors && ((product?.recipe && product.recipe.length > 0) || product?.preparation)) {
                                      itemsToRender.push({ id: product?.id || 'main', name: product?.name, recipe: product?.recipe, preparation: product?.preparation });
                                      itemsToRenderMap.add(product?.id || 'main');
                                    }
                                    
                                    // Adiciona sabores se houver
                                    if (item.pizzaFlavors && Array.isArray(item.pizzaFlavors)) {
                                      item.pizzaFlavors.forEach((pf: any) => {
                                        if (!itemsToRenderMap.has(pf.productId)) {
                                          const flavorProd = products.find(p => p.id === pf.productId);
                                          if ((flavorProd?.recipe && flavorProd.recipe.length > 0) || flavorProd?.preparation) {
                                            itemsToRender.push({ id: pf.productId, name: flavorProd?.name, recipe: flavorProd?.recipe, preparation: flavorProd?.preparation });
                                            itemsToRenderMap.add(pf.productId);
                                          }
                                        }
                                      });
                                    }

                                    if (itemsToRender.length === 0) return null;

                                    return (
                                      <div className="mt-3 space-y-3">
                                        {itemsToRender.map((info, idx) => (
                                          <div key={idx} className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-inner">
                                            {info.recipe && info.recipe.length > 0 && (
                                              <div className="mb-2 last:mb-0">
                                                <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                                  <Icons.Alert size={10} className="text-slate-400" /> Ficha Técnica: {info.name}
                                                </p>
                                                <div className="space-y-1">
                                                  {info.recipe.map((r, rIdx) => {
                                                    const invItem = inventory.find(inv => inv.id === r.inventoryItemId);
                                                    const totalQty = r.quantity * item.quantity;
                                                    return (
                                                      <div key={rIdx} className="flex items-center gap-2 pl-1">
                                                        <div className="w-1 h-1 rounded-full bg-blue-500/40" />
                                                        <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-tight">
                                                          {invItem?.name}: <span className="text-blue-600 dark:text-blue-400 font-black">{totalQty} {invItem?.unit}</span>
                                                        </p>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              </div>
                                            )}

                                            {info.preparation && (
                                              <div className="mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                                                <p className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                                  <Icons.View size={10} /> Preparo: {info.name}
                                                </p>
                                                <p className="text-[10px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed whitespace-pre-wrap pl-1 italic">
                                                  {info.preparation}
                                                </p>
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-4 md:p-6 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 shrink-0">
                    {!order.items.every(it => it.isReady) && (
                      <button
                        onClick={() => markSelectedAsReady(order)}
                        className="w-full py-5 md:py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm md:text-xs uppercase rounded-2xl shadow-xl shadow-blue-200 dark:shadow-blue-900/20 transition-all active:scale-95 flex items-center justify-center gap-3"
                      >
                        <Icons.Check size={18} />
                        Concluir Selecionados
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full overflow-auto bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Status</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tipo / Origem</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Atendimento</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Data / Hora</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {orders.map(order => (
                    <tr key={order.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/20 group transition-colors">
                      <td className="px-8 py-5">
                        <span className="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase text-white shadow-sm bg-emerald-500">
                          CONCLUÍDO
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <p className="font-black text-slate-800 dark:text-white text-[11px] uppercase tracking-tighter">
                          {translateOrderType(order.type)} {order.tableNumber ? `(Mesa ${order.tableNumber})` : ''}
                        </p>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase truncate max-w-[150px]">
                          {order.clientName || 'Cliente Direto'}
                        </p>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-[9px] font-black text-slate-500">
                            {getWaiterName(order.waiterId).charAt(0)}
                          </div>
                          <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                            {getWaiterName(order.waiterId)}
                          </p>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                            {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                          </p>
                          <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase">
                            {new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(order.createdAt))}
                          </p>
                        </div>
                      </td>

                      <td className="px-8 py-5">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setViewingItemsOrder(order)}
                            className="p-2.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl transition-all"
                            title="Ver Itens / Imprimir Cupom"
                          >
                            <Icons.Print size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-800 p-8">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mx-auto text-slate-100 dark:text-slate-800 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <p className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.2em] text-xs">Cozinha em dia! Sem pendências.</p>
          </div>
        )}
      </div>

      {/* Modal de Itens Preparados */}
      {viewingItemsOrder && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-200 border border-slate-100 dark:border-slate-800">
            <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Itens Preparados</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">
                  {translateOrderType(viewingItemsOrder.type)} {viewingItemsOrder.tableNumber ? `- Mesa ${viewingItemsOrder.tableNumber}` : ''}
                </p>
              </div>
              <button
                onClick={() => setViewingItemsOrder(null)}
                className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-2xl hover:text-red-500 transition-all"
              >
                <Icons.X size={20} />
              </button>
            </div>

            <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-3">
                {viewingItemsOrder.items.filter(it => it.isReady).map((item) => {
                  const product = products.find(p => p.id === item.productId);
                  return (
                    <div key={item.uid} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-slate-800 dark:text-slate-200 uppercase text-xs">
                          <span className="text-blue-600 dark:text-blue-400">{item.quantity}x</span> {product?.name}
                        </p>
                        {item.observations && (
                          <p className="text-[9px] text-orange-600 dark:text-orange-400 font-bold mt-1">
                            Obs: {item.observations}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <span className="text-[8px] font-black text-emerald-500 dark:text-emerald-400 uppercase bg-emerald-100 dark:bg-emerald-900/40 px-2 py-1 rounded-md">
                          PRONTO
                        </span>
                        {item.readyAt && (
                          <p className="text-[8px] text-slate-400 font-bold mt-1 italic">
                            {new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(item.readyAt))}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-8 bg-slate-50/50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button
                onClick={() => {
                  handlePrint(viewingItemsOrder);
                  setViewingItemsOrder(null);
                }}
                className="flex-1 py-4 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all flex items-center justify-center gap-2"
              >
                <Icons.Print size={14} />
                Imprimir Cupom
              </button>
              <button
                onClick={() => setViewingItemsOrder(null)}
                className="px-8 py-4 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest border border-slate-200 dark:border-slate-700 transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {printingOrder && businessSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md overflow-hidden">
          <div className="flex flex-col md:flex-row gap-6 max-w-4xl w-full max-h-[95vh]">
            {/* Controle de Seleção */}
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-2xl border border-slate-100 dark:border-slate-800 flex-1 overflow-y-auto no-print">
              <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter mb-4">Opções de Impressão</h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mb-6">Selecione quais fichas técnicas deseja imprimir:</p>
              
              <div className="space-y-6">
                {printingOrder.items.map((it, itIdx) => {
                  const product = products.find(p => p.id === it.productId);
                  const fichasMap = new Map();
                  
                  const hasFlavors = it.pizzaFlavors && Array.isArray(it.pizzaFlavors) && it.pizzaFlavors.length > 0;
                  
                  // Adiciona o produto principal 
                  // Sempre adiciona se for pizza para garantir que o tamanho apareça, ou se tiver ficha
                  if (!hasFlavors || product?.isPizza) {
                    if ((product?.recipe && product.recipe.length > 0) || product?.preparation || product?.isPizza) {
                      fichasMap.set(product?.id || 'main', { id: `${it.uid}-main`, name: product?.name });
                    }
                  }
                  
                  if (it.pizzaFlavors && Array.isArray(it.pizzaFlavors)) {
                    it.pizzaFlavors.forEach((pf: any) => {
                      // Se já adicionamos este produto (mesmo como principal), pulamos se o nome for igual
                      if (!fichasMap.has(pf.productId)) {
                        const flavorProd = products.find(p => p.id === pf.productId);
                        // Sempre adiciona sabores de pizza na lista de opções
                        fichasMap.set(pf.productId, { id: `${it.uid}-${pf.productId}`, name: flavorProd?.name || pf.name });
                      }
                    });
                  }

                  const fichas = Array.from(fichasMap.values());
                  if (fichas.length === 0) return null;

                  return (
                    <div key={itIdx} className="space-y-3">
                      <p className="text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase">
                        {it.quantity}X {product?.name}
                        {product?.isPizza && product.pizzaSize && (
                          <span className="ml-2 text-[9px] text-slate-500 dark:text-slate-400 lowercase font-bold">
                            ({getPizzaPiecesBySize(product.pizzaSize)} pedaços, {it.pizzaFlavors?.length || 1} {it.pizzaFlavors?.length > 1 ? 'sabores' : 'sabor'})
                          </span>
                        )}
                      </p>
                      <div className="grid grid-cols-1 gap-2">
                        {fichas.map(ficha => (
                          <label key={ficha.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                            <input 
                              type="checkbox" 
                              checked={!excludedFichas.has(ficha.id)} 
                              onChange={() => {
                                setExcludedFichas(prev => {
                                  const next = new Set(prev);
                                  if (next.has(ficha.id)) next.delete(ficha.id);
                                  else next.add(ficha.id);
                                  return next;
                                });
                              }}
                              className="w-4 h-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tight">{ficha.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div ref={contentRef} className="is-receipt cupom animate-in zoom-in duration-200 shadow-2xl overflow-y-auto">
            <div className="text-center mb-1">
              <h2 className="font-bold text-[10px] uppercase tracking-tighter mb-0">{businessSettings.name}</h2>
              <p className="text-[8px] font-black uppercase">
                {viewTab === 'FILA' ? 'PRODUÇÃO' : 'CONSUMO'}
              </p>
              

              <div className="section-divider"></div>

              {printingOrder.tableNumber && (
                <>
                  <p className="font-bold text-[14px]">MESA {printingOrder.tableNumber}</p>
                  <div className="section-divider"></div>
                </>
              )}
            </div>

            <div className="text-[9px] mb-1">
              <p>DATA: {new Date(printingOrder.createdAt).toLocaleDateString('pt-BR')} {new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(printingOrder.createdAt))}</p>
              <p>TIPO: {translateOrderType(printingOrder.type).toUpperCase()}</p>
              <p>CLIENTE: {(printingOrder.clientName || 'Cliente Direto').toUpperCase()}</p>
            </div>

            <div className="section-divider"></div>

            <div className="mb-1">
              {printingOrder.items.map((it, idx) => {
                const product = products.find(p => p.id === it.productId);
                const isReady = it.isReady;
                
                if (viewTab === 'HISTORICO' && !isReady) return null;

                return (
                  <div key={idx} className="border-b border-dotted border-black/10 last:border-0 py-1">
                    <div className={`flex justify-between font-bold uppercase ${isReady && viewTab === 'FILA' ? 'line-through opacity-50' : ''}`}>
                      <span className="text-[11px]">{it.quantity}X {(product?.name || 'Item').substring(0, 20)}</span>
                    </div>
                    
                    {it.observations && (
                      <p className="text-[10px] text-red-600 font-bold mb-1">
                        * {it.observations}
                      </p>
                    )}

                    <AddonDisplay 
                      addons={it.selectedAddons || []} 
                      products={products} 
                      className="text-[9px] font-bold text-black mt-1 mb-2 border-l-2 border-black/10 pl-2 ml-1"
                    />

                    {/* Ficha Técnica no Cupom com Suporte a Múltiplos Sabores e Filtro */}
                    {(() => {
                      const fichasMap = new Map();
                      
                      const hasFlavors = it.pizzaFlavors && Array.isArray(it.pizzaFlavors) && it.pizzaFlavors.length > 0;
                      
                      // Adiciona o produto principal se não houver sabores ou se for pizza
                      if (!hasFlavors || product?.isPizza) {
                        if ((product?.recipe && product.recipe.length > 0) || product?.preparation || product?.isPizza) {
                          fichasMap.set(product?.id || 'main', { id: `${it.uid}-main`, name: product?.name, recipe: product?.recipe, preparation: product?.preparation });
                        }
                      }

                      if (it.pizzaFlavors && Array.isArray(it.pizzaFlavors)) {
                        it.pizzaFlavors.forEach((pf: any) => {
                          if (!fichasMap.has(pf.productId)) {
                            const flavorProd = products.find(p => p.id === pf.productId);
                            fichasMap.set(pf.productId, { id: `${it.uid}-${pf.productId}`, name: flavorProd?.name || pf.name, recipe: flavorProd?.recipe, preparation: flavorProd?.preparation });
                          }
                        });
                      }

                      const itemsWithRecipe = Array.from(fichasMap.values()).filter(f => !excludedFichas.has(f.id));

                      return itemsWithRecipe.map((info, infoIdx) => {
                        const hasContent = (info.recipe && info.recipe.length > 0) || info.preparation;
                        if (!hasContent) return null;

                        return (
                        <div key={infoIdx} className="mt-1 ml-1 p-1 border-l-2 border-black/20 bg-slate-50">
                          <p className="text-[9px] font-black uppercase mb-0.5 border-b border-black/10">Ficha Técnica: {info.name}</p>
                          
                          {info.recipe && info.recipe.length > 0 && (
                            <div className="mb-1">
                              {info.recipe.map((r, rIdx) => {
                                const invItem = inventory.find(inv => inv.id === r.inventoryItemId);
                                const totalQty = r.quantity * it.quantity;
                                return (
                                  <p key={rIdx} className="text-[10px] font-bold leading-tight m-0">
                                    - {invItem?.name}: {totalQty} {invItem?.unit}
                                  </p>
                                );
                              })}
                            </div>
                          )}

                          {info.preparation && (
                            <div className="mt-1 pt-1 border-t border-black/5">
                              <p className="text-[10px] font-extrabold uppercase mb-0.5">Preparo: {info.name}</p>
                              <p className="text-[10px] leading-tight m-0 italic whitespace-pre-wrap font-medium">
                                {info.preparation}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })
                  })()}
                  </div>
                );
              })}
            </div>

            <div className="section-divider"></div>



            {viewTab === 'FILA' && (
              <div className="text-center pt-1 mb-2">
                <p className="text-[7px] font-black uppercase tracking-widest opacity-40 italic">Produção - Sem valor fiscal</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 no-print mt-4">
              <button
                onClick={async () => {
                  triggerPrint();
                  setPrintingOrder(null);
                }}
                className="bg-blue-600 text-white py-3 rounded-xl font-receipt font-black uppercase text-[10px] shadow-lg hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center no-print"
              >
                IMPRIMIR
              </button>
              <button
                onClick={() => setPrintingOrder(null)}
                className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 py-3 rounded-xl font-receipt font-black uppercase text-[10px] hover:bg-slate-300 dark:hover:bg-slate-700 active:scale-95 transition-all flex items-center justify-center no-print"
              >
                FECHAR
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </div>
  );
};

export default Kitchen;
