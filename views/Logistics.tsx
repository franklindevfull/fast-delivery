
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DeliveryDriver, Order, OrderStatus, OrderStatusLabels, SaleType, User, Product, BusinessSettings } from '../types';
import { db } from '../services/db';
import { Icons } from '../constants';
import { socket, chatUnreadManager } from '../services/socket';
import { useToast } from '../hooks/useToast';
import { formatCurrency } from '../services/formatUtils';

import { useReactToPrint } from 'react-to-print';
import CustomAlert from '../components/CustomAlert';
import { AddonDisplay } from '../components/AddonDisplay';
import { getLocalIsoDate } from '../services/dateUtils';

const BlinkCSS = () => (
  <style>{`
        @keyframes blink {
            0% { opacity: 1; }
            50% { opacity: 0.3; }
            100% { opacity: 1; }
        }
        .animate-blink {
            animation: blink 0.8s infinite;
        }
    `}</style>
);

const paymentLabels: { [key: string]: string } = {
  'pix': 'PIX',
  'PIX': 'PIX',
  'cartao_credito': 'Cartão de Crédito',
  'CREDIT': 'Cartão de Crédito',
  'CRÉDITO': 'Cartão de Crédito',
  'cartao_debito': 'Cartão de Débito',
  'DEBIT': 'Cartão de Débito',
  'DÉBITO': 'Cartão de Débito',
  'dinheiro': 'Dinheiro',
  'CASH': 'Dinheiro',
  'DINHEIRO': 'Dinheiro'
};

const CheckoutTimer: React.FC<{ assignedAt: string, timeoutMinutes: number }> = ({ assignedAt, timeoutMinutes }) => {
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    const timer = setInterval(() => {
      const assigned = new Date(assignedAt).getTime();
      const now = new Date().getTime();
      const diff = (timeoutMinutes * 60000) - (now - assigned);
      if (diff <= 0) setTimeLeft('EXPIRADO');
      else {
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [assignedAt, timeoutMinutes]);
  return (
    <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-900/20 rounded-full border border-amber-100 dark:border-amber-800">
      <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
      <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">Expira em: {timeLeft}</span>
    </div>
  );
};


const Logistics: React.FC = () => {
  const { addToast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  const triggerPrint = useReactToPrint({ contentRef: printRef });
  const [drivers, setDrivers] = useState<DeliveryDriver[]>([]);
  const [readyOrders, setReadyOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef });
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<'PENDING' | 'HISTORY' | 'CHAT'>('PENDING');
  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
  const [historyStartDate, setHistoryStartDate] = useState(getLocalIsoDate());
  const [historyEndDate, setHistoryEndDate] = useState(getLocalIsoDate());
  const [historyDriverId, setHistoryDriverId] = useState<string>('TODOS');
  const [printingHistoryOrder, setPrintingHistoryOrder] = useState<Order | null>(null);
  const [viewingHistoryOrder, setViewingHistoryOrder] = useState<Order | null>(null);

  // Chat States
  const [selectedDriver, setSelectedDriver] = useState<DeliveryDriver | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newChatMessage, setNewChatMessage] = useState('');
  const [unreadDrivers, setUnreadDrivers] = useState<Set<string>>(chatUnreadManager.getUnreads());
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    refreshData();
    const session = db.getCurrentSession();
    if (session) setCurrentUser(session.user);

    const interval = setInterval(refreshData, 10000); // 10s para Render Free

    const handleNewMessage = (msg: any) => {
      if (activeTab === 'CHAT' && selectedDriver?.id === msg.driverId) {
        setChatMessages(prev => [...prev.filter(m => m.id !== msg.id), msg]);
      }
    };

    socket.on('drivers_updated', refreshData);
    socket.on('order_auto_rejected_global', refreshData);
    socket.on('new_message', handleNewMessage);

    return () => {
      clearInterval(interval);
      socket.off('drivers_updated');
      socket.off('order_auto_rejected_global');
      socket.off('new_message', handleNewMessage);
    };
  }, [activeTab, selectedDriver]);

  useEffect(() => {
    const unsubscribe = chatUnreadManager.subscribe((unreads) => {
      setUnreadDrivers(new Set(unreads));
    });
    setUnreadDrivers(new Set(chatUnreadManager.getUnreads()));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedDriver) {
      loadChatHistory(selectedDriver.id);
      chatUnreadManager.removeUnread(selectedDriver.id);
      setUnreadDrivers(new Set(chatUnreadManager.getUnreads()));
    }
  }, [selectedDriver]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const loadChatHistory = async (driverId: string) => {
    const history = await db.getChatHistory(driverId);
    setChatMessages(history);
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatMessage.trim() || !selectedDriver || !currentUser) return;

    try {
      const msgData = {
        driverId: selectedDriver.id,
        content: newChatMessage,
        senderName: 'Atendimento',
        isFromDriver: false
      };
      const savedMsg = await db.sendChatMessage(msgData);
      socket.emit('send_message', savedMsg);
      setNewChatMessage('');
      loadChatHistory(selectedDriver.id);
    } catch (e) {
      console.error("Erro ao enviar mensagem para motorista:", e);
    }
  };

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const [allDrivers, allOrders, allProds, settings] = await Promise.all([
        db.getDrivers(),
        db.getOrders(),
        db.getProducts(),
        db.getSettings()
      ]);
      setDrivers(allDrivers);
      setProducts(allProds);
      setBusinessSettings(settings);
      setReadyOrders(allOrders.filter(o =>
        o.type === SaleType.OWN_DELIVERY &&
        ([OrderStatus.READY, OrderStatus.OUT_FOR_DELIVERY] as OrderStatus[]).includes(o.status)
      ).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      setHistoryOrders(allOrders.filter(o => o.type === SaleType.OWN_DELIVERY && o.status === OrderStatus.DELIVERED));
    } catch (error) {
      console.error("Error refreshing Logistics data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const assignDriver = async (orderId: string, driverId: string) => {
    if (!currentUser) return;
    // O status continua Ready (Pronto), apenas atribuímos o motorista para que ele possa aceitar/recusar no APP
    await db.updateOrderStatus(orderId, OrderStatus.READY, currentUser, driverId);
    refreshData();
  };

  const getDriverName = (driverId?: string) => {
    if (!driverId) return 'Desconhecido';
    return drivers.find(d => d.id === driverId)?.name || 'Removido';
  };

  // Agrupamento para o cupom de entrega (Funciona para Pedido Atual ou Histórico)
  const groupedItems = useMemo(() => {
    const order = printingOrder || printingHistoryOrder;
    if (!order) return [];
    const grouped: Record<string, { name: string, quantity: number, price: number, selectedAddons: any[], observations?: string, isPizza: boolean }> = {};
    order.items.forEach(item => {
      const prod = products.find(p => p.id === item.productId);
      const isPizza = !!(prod?.isPizza || (item.pizzaFlavors && item.pizzaFlavors.length > 0));
      const addonKey = item.selectedAddons ? JSON.stringify(item.selectedAddons.map((a: any) => ({ id: a.id, quantity: a.quantity })).sort((a: any, b: any) => a.id.localeCompare(b.id))) : '';
      const key = (item.productId || item.product?.id || 'unknown') + (item.observations || '') + addonKey + (isPizza ? '_pizza' : '');
      
      if (!grouped[key]) {
        grouped[key] = {
          name: prod?.name || item.product?.name || '...',
          quantity: 0,
          price: item.price,
          selectedAddons: item.selectedAddons || [],
          observations: item.observations,
          isPizza
        };
      }
      grouped[key].quantity += (item.quantity || 1);
    });
    return Object.entries(grouped);
  }, [printingOrder, printingHistoryOrder, products]);

  return (
    <div className="p-6 h-full flex flex-col bg-slate-50 dark:bg-slate-950 relative">
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
      <BlinkCSS />
      <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 mb-8 no-print shrink-0">
        <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-1.5 md:p-2 rounded-2xl md:rounded-full w-full md:w-max shadow-sm border border-slate-100 dark:border-slate-800 overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setActiveTab('PENDING')}
            className={`flex-1 md:flex-none px-6 md:px-8 py-3 md:py-3.5 rounded-xl md:rounded-full text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'PENDING' ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            Entregas
          </button>
          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`flex-1 md:flex-none px-6 md:px-8 py-3 md:py-3.5 rounded-xl md:rounded-full text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'HISTORY' ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            Histórico
          </button>
          <button
            onClick={() => setActiveTab('CHAT')}
            className={`flex-1 md:flex-none px-6 md:px-8 py-3 md:py-3.5 rounded-xl md:rounded-full text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all relative whitespace-nowrap ${activeTab === 'CHAT' ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            Chat
            {unreadDrivers.size > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white dark:border-slate-800 animate-pulse shadow-sm" />}
          </button>
        </div>
      </div>

      {activeTab === 'PENDING' ? (
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col">
          {readyOrders.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {readyOrders.map(order => (
                <div key={order.id} className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-3xl md:rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col hover:shadow-xl transition-all h-max">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-black text-slate-800 dark:text-white uppercase text-lg">{order.id.split('-')[1] || order.id}</h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">{order.clientName}</p>
                </div>
                <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase text-white shadow-sm ${order.status === OrderStatus.READY ? 'bg-emerald-500' :
                  order.status === OrderStatus.OUT_FOR_DELIVERY ? 'bg-blue-600' : 'bg-slate-900'
                  }`}>
                  {OrderStatusLabels[order.status]}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Icons.Logistics className="w-5 h-5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                  <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Destino:</p>
                </div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-tight">{order.clientAddress || 'Endereço não informado'}</p>
              </div>

              <div className="flex justify-between items-center text-sm font-black text-slate-900 border-t border-slate-50 dark:border-slate-800 pt-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase">Total:</span>
                  <span className="text-slate-900 dark:text-white">{formatCurrency(order.total)}</span>
                </div>
                <button
                  onClick={() => setPrintingOrder(order)}
                  className="p-2 text-slate-300 dark:text-slate-600 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
                  title="Imprimir Cupom de Entrega"
                >
                  <Icons.Print />
                </button>
              </div>

              {order.status === OrderStatus.READY && !order.driverId ? (
                <div className="mt-4 space-y-3">
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Vincular Entregador:</p>
                  <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
                    {drivers.length > 0 ? drivers.map(driver => (
                      <button
                        key={driver.id}
                        onClick={() => assignDriver(order.id, driver.id)}
                        className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-left hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group/btn"
                      >
                        <div className="w-8 h-8 bg-slate-900 dark:bg-slate-700 rounded-lg flex items-center justify-center text-white text-[10px] font-black">{driver.name.charAt(0)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-black text-slate-800 dark:text-slate-200 truncate">{driver.name}</p>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-200 group-hover/btn:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                      </button>
                    )) : (
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold text-center italic py-2">Nenhum entregador online.</p>
                    )}
                  </div>
                </div>
              ) : (order.status === OrderStatus.OUT_FOR_DELIVERY || (order.status === OrderStatus.READY && order.driverId)) ? (
                <div className="mt-4 space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-black uppercase shadow-md">{getDriverName(order.driverId).charAt(0)}</div>
                    <div className="flex-1">
                      <p className="text-xs font-black text-blue-900 dark:text-blue-300 truncate">Com: {getDriverName(order.driverId)}</p>
                      <p className="text-[9px] text-blue-400 dark:text-blue-500 font-black uppercase mt-0.5">Veículo: {drivers.find(d => d.id === order.driverId)?.vehiclePlate || 'N/A'}</p>
                    </div>
                  </div>
                  {order.status === OrderStatus.READY && order.driverId ? (
                    <div className="mt-4 space-y-3">
                      <CheckoutTimer assignedAt={order.assignedAt!} timeoutMinutes={businessSettings?.orderTimeoutMinutes || 5} />
                      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl text-center">
                        <p className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">Aguardando aceite do entregador no APP...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 rounded-xl text-center">
                      <p className="text-[9px] font-black text-blue-800 dark:text-blue-300 uppercase tracking-widest">Entregador em Rota...</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-2xl text-center">
                  <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Entrega Finalizada</p>
                  <p className="text-[9px] text-emerald-400 dark:text-emerald-500 font-bold uppercase mt-1">Por: {getDriverName(order.driverId)}</p>
                </div>
              )}
            </div>
          ))}
          </div>
          ) : (
            <div className="w-full h-full flex-1 bg-white dark:bg-slate-900 p-20 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-500">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <Icons.Clock className="w-10 h-10 text-slate-200 dark:text-slate-700" />
              </div>
              <p className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em]">Sem entregas pendentes no momento...</p>
            </div>
          )}
        </div>
      ) : activeTab === 'CHAT' ? (
        <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex overflow-hidden animate-in slide-in-from-right duration-500">
          {/* Sidebar de Chats */}
          <div className="w-80 border-r border-slate-50 dark:border-slate-800 flex flex-col bg-slate-50/30 dark:bg-slate-800/10">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest">Chat Entregadores:</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 custom-scrollbar">
              {drivers.length > 0 ? drivers.map(driver => (
                <button
                  key={driver.id}
                  onClick={() => setSelectedDriver(driver)}
                  className={`flex items-center gap-3 p-4 rounded-3xl transition-all relative ${selectedDriver?.id === driver.id ? 'bg-white dark:bg-slate-800 shadow-md border border-slate-100 dark:border-slate-700 scale-[1.02]' : 'hover:bg-white/50 dark:hover:bg-slate-800'}`}
                >
                  {unreadDrivers.has(driver.id) && <span className="absolute top-3 right-3 w-3 h-3 bg-rose-500 rounded-full animate-pulse border-2 border-white dark:border-slate-900 shadow-sm" />}
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black uppercase text-sm ${selectedDriver?.id === driver.id ? 'bg-slate-900 dark:bg-blue-600 shadow-lg shadow-slate-500/20 dark:shadow-blue-900/40' : 'bg-slate-300 dark:bg-slate-700'} shrink-0`}>
                    {driver.name.charAt(0)}
                  </div>
                  <div className="flex-1 text-left min-w-0 pr-4">
                    <p className="text-sm font-black text-slate-800 dark:text-white truncate">{driver.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${driver.active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                      <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">{driver.active ? 'Online' : 'Offline'} / {driver.vehiclePlate}</span>
                    </div>
                  </div>
                </button>
              )) : (
                <p className="text-center text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase py-10 opacity-50">Nenhum entregador cadastrado</p>
              )}
            </div>
          </div>

          {/* Área de Chat */}
          <div className="flex-1 flex flex-col bg-white dark:bg-slate-900">
            {selectedDriver ? (
              <>
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/10 dark:bg-slate-800/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black uppercase text-sm shadow-xl bg-slate-900 dark:bg-blue-600 shadow-slate-500/10 dark:shadow-blue-900/40">
                      {selectedDriver.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-800 dark:text-white">{selectedDriver.name}</h4>
                      <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                        Entregador / {selectedDriver.vehicleType}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-4 custom-scrollbar bg-slate-50/20 dark:bg-slate-800/10">
                  {chatMessages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full py-20 grayscale opacity-40">
                      <Icons.Message className="w-16 h-16 mb-4 text-slate-200 dark:text-slate-700" />
                      <p className="text-xs font-black uppercase tracking-widest text-slate-300 dark:text-slate-600">Nenhuma mensagem neste chat</p>
                    </div>
                  )}
                  {chatMessages.map((msg, i) => (
                    <div key={msg.id || i} className={`flex ${msg.isFromDriver ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[70%] p-5 rounded-[2rem] shadow-sm text-sm ${msg.isFromDriver ? 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none' : 'bg-slate-900 dark:bg-blue-600 text-white rounded-tr-none'}`}>
                        <div className="flex justify-between items-center mb-1 gap-4">
                          <span className={`text-[8px] font-black uppercase tracking-widest ${msg.isFromDriver ? 'text-indigo-600 dark:text-indigo-400' : 'opacity-50'}`}>
                            {msg.isFromDriver ? (msg.senderName || selectedDriver?.name || 'Entregador') : 'Você'}
                          </span>
                          <span className="text-[8px] font-black opacity-30 uppercase tracking-tighter">
                            {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="font-bold leading-relaxed">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleSendChatMessage} className="p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-4">
                  <input
                    type="text"
                    value={newChatMessage}
                    onChange={e => setNewChatMessage(e.target.value)}
                    placeholder="Digite sua mensagem para o entregador..."
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 text-sm font-bold focus:ring-4 focus:ring-slate-500/10 dark:focus:ring-blue-500/10 transition-all outline-none text-slate-800 dark:text-white"
                  />
                  <button type="submit" className="px-8 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-slate-500/20 dark:shadow-blue-900/40 active:scale-95 transition-all">
                    Enviar
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-300 dark:text-slate-700 p-12 text-center">
                <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-6 transform rotate-12">
                  <Icons.Message className="w-12 h-12 text-slate-200 dark:text-slate-700" />
                </div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter mb-2">Comunicação com Frota</h3>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 max-w-xs leading-relaxed uppercase">Selecione um entregador ao lado para enviar mensagens e coordenar entregas em tempo real.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6 h-full overflow-hidden flex-1">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter">Histórico de Entregas</h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Registros de entregas finalizadas pelo sistema</p>
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Cliente / Pedido</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Entregador</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Data / Hora</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {historyOrders.length > 0 ? (
                  historyOrders.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(order => (
                    <tr key={order.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/20 group transition-colors">
                      <td className="px-8 py-5 text-left">
                        <span className="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase text-white shadow-sm bg-emerald-500">
                          ENTREGUE
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <p className="font-black text-slate-800 dark:text-white text-[11px] uppercase tracking-tighter">
                          {order.id.split('-')[1] || order.id}
                        </p>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase truncate max-w-[180px]">
                          {order.clientName}
                        </p>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center text-[9px] font-black text-emerald-600 dark:text-emerald-400">
                            {getDriverName(order.driverId).charAt(0)}
                          </div>
                          <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                            {getDriverName(order.driverId)}
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
                        <p className="text-[11px] font-black text-blue-600 dark:text-blue-400">
                          {formatCurrency(order.total)}
                        </p>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setViewingHistoryOrder(order)}
                            className="p-2.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl transition-all"
                            title="Ver Detalhes / Imprimir"
                          >
                            <Icons.Print size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <Icons.Clock className="w-12 h-12 mx-auto text-slate-200 dark:text-slate-800 mb-4" />
                      <p className="text-slate-400 dark:text-slate-600 font-bold uppercase tracking-widest text-xs">Nenhuma entrega no histórico.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      )
      }

      {/* DETALHES DA ENTREGA (MODAL) */}
      {viewingHistoryOrder && businessSettings && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-200 border border-transparent dark:border-slate-800">
            <div className="p-10 pb-0 flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter mb-1">Detalhes da Entrega</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest px-1">Resumo completo do pedido finalizado</p>
              </div>
              <button
                onClick={() => setViewingHistoryOrder(null)}
                className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-2xl hover:text-red-500 transition-all shadow-sm"
              >
                <Icons.X size={20} />
              </button>
            </div>

            <div className="p-10 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                  <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3">Cliente / Destino</p>
                  <p className="text-sm font-black text-slate-800 dark:text-white uppercase mb-1">{viewingHistoryOrder.clientName}</p>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 leading-tight">
                    {viewingHistoryOrder.clientAddress || 'Endereço não informado'}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                  <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3">Logística</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-white font-black uppercase text-sm shadow-md">
                      {getDriverName(viewingHistoryOrder.driverId).charAt(0)}
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-slate-800 dark:text-white uppercase">{getDriverName(viewingHistoryOrder.driverId)}</p>
                      <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">Entregador</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Itens do Pedido</p>
                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-[2rem] border border-slate-100 dark:border-slate-800 overflow-hidden">
                  <div className="max-h-[200px] overflow-y-auto p-4 custom-scrollbar">
                    {viewingHistoryOrder.items.map((item, idx) => {
                      const prod = products.find(p => p.id === item.productId);
                      return (
                        <div key={idx} className="flex flex-col py-3 border-b border-slate-100 dark:border-slate-800 last:border-0 px-2">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 flex items-center justify-center bg-slate-900 dark:bg-blue-600 text-white text-[10px] font-black rounded-lg">
                                {item.quantity}x
                              </span>
                              <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase">{(prod?.isPizza || (item.pizzaFlavors && item.pizzaFlavors.length > 0)) ? 'PIZZA ASSADA' : (prod?.name || item.product?.name || '...')}</span>
                            </div>
                            <span className="text-[11px] font-black text-slate-400 dark:text-slate-500">{formatCurrency(item.price, false)}</span>
                          </div>
                          <AddonDisplay showPrice onPriceFormat={(p) => new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(p)} 
                            addons={item.selectedAddons || []} 
                            products={products} 
                            className="text-[10px] font-bold text-blue-500 mt-1 ml-9"
                          />
                          {item.observations && (
                            <p className="text-[9px] font-bold text-slate-500 mt-1 ml-9 italic">📝 {item.observations}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-8 items-end">
                                 <div className="flex justify-between text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    <span>Taxa Entrega:</span>
                    <span>{formatCurrency(viewingHistoryOrder.deliveryFee || 0)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    <span>Pagamento:</span>
                    <span className="text-slate-800 dark:text-white font-black">{(paymentLabels[(viewingHistoryOrder.paymentMethod || '').toUpperCase()] || viewingHistoryOrder.paymentMethod || 'PENDENTE').toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tighter">Total Geral:</span>
                    <span className="text-xl font-black text-blue-600 dark:text-blue-400">{formatCurrency(viewingHistoryOrder.total)}</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setPrintingHistoryOrder(viewingHistoryOrder);
                      setViewingHistoryOrder(null);
                    }}
                    className="flex-1 py-4 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-slate-500/20 dark:shadow-blue-900/40 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Icons.Print size={16} /> Imprimir Cupom
                  </button>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* CUPOM DE ENTREGA AGRUPADO */}
      {printingOrder && businessSettings && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div ref={printRef} className="is-receipt cupom animate-in zoom-in duration-200">
            <div className="text-center mb-1">
              <h2 className="font-bold text-[10px] uppercase tracking-tighter mb-0">{businessSettings.name}</h2>
              <div className="section-divider"></div>
              <p className="text-[10px] font-black uppercase tracking-widest">{printingOrder?.status === 'CANCELLED' ? 'CANCELADO' : 'Comprovante'}</p>
              <div className="section-divider"></div>
            </div>

            <div className="text-[9px] mb-1">
              <p>DATA: {new Date(printingOrder.createdAt).toLocaleDateString('pt-BR')} {new Date(printingOrder.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
              <p>CLIENTE: {(printingOrder.clientName || 'NÃO IDENTIFICADO').toUpperCase()}</p>
              {printingOrder.clientPhone && <p>FONE: {printingOrder.clientPhone}</p>}
              
              {/* Só imprime endereço se for DELIVERY */}
              {(['DELIVERY', 'OWN_DELIVERY', 'THIRD_PARTY'].includes(printingOrder.type?.toUpperCase() || '')) && printingOrder.clientAddress && (
                <p className="font-bold border-t border-dotted border-black/20 mt-1 pt-1 uppercase leading-tight">ENTREGA: {printingOrder.clientAddress}</p>
              )}
              
              <p>PAGTO: {(paymentLabels[(printingOrder.paymentMethod || '').toUpperCase()] || printingOrder.paymentMethod || 'PENDENTE').toUpperCase()}</p>
              {printingOrder.tableNumber && <p className="font-black">MESA: {printingOrder.tableNumber}</p>}
            </div>

            <div className="section-divider"></div>

            <div className="mb-1">
              {groupedItems.map(([id, data]: [string, any]) => (
                <div key={id} className="border-b border-dotted border-black/10 py-1">
                  <div className="flex justify-between font-bold uppercase text-[10px]">
                    <span className="flex-1 pr-2 shrink-text">{data.quantity}X {data.isPizza ? 'PIZZA ASSADA' : data.name.substring(0, 25)}</span>
                    <span className="shrink-0">{formatCurrency(data.price * data.quantity, false)}</span>
                  </div>
                  <AddonDisplay showPrice onPriceFormat={(p) => new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(p)} 
                    addons={data.selectedAddons || []} 
                    products={products} 
                    className="text-[7px] font-bold uppercase text-slate-500 mt-0.5 ml-2"
                  />
                  {data.observations && (
                    <span className="text-[7px] font-bold uppercase text-slate-600 mt-0.5 ml-2 leading-tight italic block">📝 {data.observations}</span>
                  )}
                </div>
              ))}
            </div>

            <div className="section-divider"></div>

            <div className="flex justify-between items-center py-0.5 text-[9px] uppercase font-bold">
              <span>{printingOrder?.type === 'OWN_DELIVERY' ? 'SUBTOTAL' : 'VALOR DO PEDIDO'}:</span>
              <span>
                {formatCurrency(groupedItems.reduce((acc, [id, data]: [string, any]) => {
                  const addons = data.selectedAddons ? data.selectedAddons.reduce((s: number, a: any) => s + (a.price * a.quantity), 0) : 0;
                  return acc + (data.quantity * (data.price + addons));
                }, 0))}
              </span>
            </div>

            <div className="flex justify-between items-center py-0.5 text-[9px]">
              <span className="uppercase font-bold">TAXA ENTREGA:</span>
              <span className="font-bold">{formatCurrency(printingOrder.deliveryFee || 0)}</span>
            </div>

            <div className="flex justify-between items-end pt-1 mb-2">
              <span className="font-black text-[9px] uppercase tracking-widest">TOTAL:</span>
              <span className="text-xl font-black">{formatCurrency(printingOrder.total)}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 no-print mt-6">
              <button
                onClick={async () => {
                  if (!businessSettings || !printingOrder) return;
                  try {
                    addToast({ title: 'Impressão', message: 'Gerando cupom de entrega...', type: 'INFO' });
                    triggerPrint();
                    setPrintingOrder(null);
                  } catch (error: any) {
                    addToast({ title: 'Erro na Impressão', message: error.message || 'Falha ao comunicar com a impressora.', type: 'DANGER' });
                    setPrintingOrder(null);
                  }
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
      )}

      {/* CUPOM DE HISTÓRICO RESUMIDO */}
      {printingHistoryOrder && businessSettings && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div ref={contentRef} className="is-receipt cupom animate-in zoom-in duration-200">
            <div className="text-center mb-1">
              <h2 className="font-bold text-[10px] uppercase tracking-tighter mb-0">{businessSettings.name}</h2>
              <div className="section-divider"></div>
              <p className="text-[8px] font-black uppercase tracking-widest">Cópia de Comprovante</p>
              <div className="section-divider"></div>
            </div>

            <div className="text-[9px] mb-1">
              <p>DATA: {new Date(printingHistoryOrder.createdAt).toLocaleDateString('pt-BR')} {new Date(printingHistoryOrder.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
              <p>CLIENTE: {printingHistoryOrder.clientName}</p>
              {printingHistoryOrder.clientPhone && <p>FONE: {printingHistoryOrder.clientPhone}</p>}
              
              {/* Só imprime endereço se for DELIVERY */}
              {(['DELIVERY', 'OWN_DELIVERY', 'THIRD_PARTY'].includes(printingHistoryOrder.type?.toUpperCase() || '')) && printingHistoryOrder.clientAddress && (
                <p className="font-bold border-t border-dotted border-black/20 mt-1 pt-1 uppercase leading-tight">ENTREGA: {printingHistoryOrder.clientAddress}</p>
              )}

              <p>PAGTO: {(paymentLabels[(printingHistoryOrder.paymentMethod || '').toUpperCase()] || printingHistoryOrder.paymentMethod || 'PENDENTE').toUpperCase()}</p>
              <p className="font-bold border-t border-black/10 mt-1 pt-1 uppercase">ENTREGADOR: {getDriverName(printingHistoryOrder.driverId)}</p>
            </div>

            {groupedItems.length > 0 && (
              <div className="mb-1">
                {groupedItems.map(([id, data]: [string, any]) => (
                  <div key={id} className="border-b border-dotted border-black/10 py-1">
                    <div className="flex justify-between font-bold uppercase text-[10px]">
                      <span className="flex-1 pr-2 shrink-text">{data.quantity}X {data.isPizza ? 'PIZZA ASSADA' : data.name.substring(0, 25)}</span>
                      <span className="shrink-0">{formatCurrency(data.price * data.quantity, false)}</span>
                    </div>
                    <AddonDisplay showPrice onPriceFormat={(p) => new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(p)} 
                      addons={data.selectedAddons || []} 
                      products={products} 
                      className="text-[7px] font-bold uppercase text-slate-500 mt-0.5 ml-2"
                    />
                    {data.observations && (
                      <span className="text-[7px] font-bold uppercase text-slate-600 mt-0.5 ml-2 leading-tight italic block">📝 {data.observations}</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="section-divider"></div>

            <div className="flex justify-between items-center py-0.5 text-[9px] uppercase font-bold">
              <span>SUBTOTAL:</span>
              <span>
                {formatCurrency(groupedItems.reduce((acc, [id, data]: [string, any]) => {
                  const addons = data.selectedAddons ? data.selectedAddons.reduce((s: number, a: any) => s + (a.price * a.quantity), 0) : 0;
                  return acc + (data.quantity * (data.price + addons));
                }, 0))}
              </span>
            </div>

            <div className="flex justify-between items-center py-0.5 text-[9px]">
              <span className="uppercase font-bold">TAXA ENTREGA:</span>
              <span className="font-bold">{formatCurrency(printingHistoryOrder.deliveryFee || 0)}</span>
            </div>

            <div className="flex justify-between items-end pt-1 mb-2">
              <span className="font-black text-[9px] uppercase tracking-widest">TOTAL:</span>
              <span className="text-xl font-black">{formatCurrency(printingHistoryOrder.total)}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 no-print mt-6">
              <button
                onClick={async () => {
                  if (!businessSettings || !printingHistoryOrder) return;
                  try {
                    addToast({ title: 'Impressão', message: 'Gerando cupom de histórico...', type: 'INFO' });
                    handlePrint();
                    setPrintingHistoryOrder(null);
                  } catch (error: any) {
                    addToast({ title: 'Erro na Impressão', message: error.message || 'Falha ao comunicar com a impressora.', type: 'DANGER' });
                    setPrintingHistoryOrder(null);
                  }
                }}
                className="bg-blue-600 text-white py-3 rounded-xl font-receipt font-black uppercase text-[10px] shadow-lg hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center"
              >
                IMPRIMIR
              </button>
              <button
                onClick={() => setPrintingHistoryOrder(null)}
                className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 py-3 rounded-xl font-receipt font-black uppercase text-[10px] hover:bg-slate-300 dark:hover:bg-slate-700 active:scale-95 transition-all flex items-center justify-center"
              >
                FECHAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Logistics;
