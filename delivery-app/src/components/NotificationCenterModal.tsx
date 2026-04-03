import React, { useEffect, useState } from 'react';
import { Bell, Ticket, MessageSquare, X, Copy, Check, Megaphone, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import NotificationDetailsModal from './NotificationDetailsModal';

interface NotificationCenterModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientId: string;
    onAllRead?: () => void;
}

const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({ isOpen, onClose, clientId, onAllRead }) => {
    const [loading, setLoading] = useState(true);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'gerais' | 'cupons'>('gerais');
    const [selectedItem, setSelectedItem] = useState<any | null>(null);

    const [data, setData] = useState<{
        notifications: any[],
        coupons: any[],
        campaigns: any[]
    }>({ notifications: [], coupons: [], campaigns: [] });
    const [hiddenCampaigns, setHiddenCampaigns] = useState<string[]>([]);

    useEffect(() => {
        const hidden = JSON.parse(localStorage.getItem('delivery_app_hidden_campaigns') || '[]');
        setHiddenCampaigns(hidden);
    }, []);

    useEffect(() => {
        if (isOpen && clientId) {
            fetchData();
            if (onAllRead) onAllRead(); // Mark everything as read when the drawer is opened
        }
    }, [isOpen, clientId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await api.getNotifications(clientId);
            setData(res);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const handleDelete = async (notificationId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await api.deleteNotification(clientId, notificationId);
            setData(prev => ({
                ...prev,
                notifications: prev.notifications.filter(n => n.id !== notificationId)
            }));
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    const handleHideCampaign = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const updated = [...hiddenCampaigns, id];
        setHiddenCampaigns(updated);
        localStorage.setItem('delivery_app_hidden_campaigns', JSON.stringify(updated));
    };

    const handleBuyNow = () => {
        setSelectedItem(null);
        onClose();
        // Redirect to home if possible (assume hash routing)
        window.location.hash = '#/';
    };

    if (!isOpen) return null;

    const visibleCampaigns = data.campaigns.filter(c => !hiddenCampaigns.includes(c.id));

    return (
        <>
            <div className="fixed inset-0 z-[100] flex justify-end animate-in fade-in duration-300">
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
                
                <div className="bg-white dark:bg-slate-900 w-full max-w-sm h-full shadow-2xl relative animate-in slide-in-from-right duration-500 overflow-hidden flex flex-col">
                    <div className="p-6 pt-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 shrink-0">
                      <div className="flex items-center gap-3">
                          <div className="bg-indigo-50 dark:bg-indigo-900/40 p-2.5 rounded-2xl text-indigo-600 dark:text-indigo-400">
                              <Bell className="w-5 h-5" />
                          </div>
                          <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight uppercase">Notificações</h2>
                      </div>
                      <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 active:scale-95">
                          <X className="w-6 h-6" />
                      </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-slate-100 dark:border-slate-800 shrink-0">
                        <button 
                            onClick={() => setActiveTab('gerais')}
                            className={`flex-1 py-4 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${activeTab === 'gerais' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 bg-slate-50 dark:bg-slate-800/50' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                        >
                            <MessageSquare className="w-4 h-4" />
                            Gerais
                        </button>
                        <button 
                            onClick={() => setActiveTab('cupons')}
                            className={`flex-1 py-4 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${activeTab === 'cupons' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 bg-slate-50 dark:bg-slate-800/50' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                        >
                            <Ticket className="w-4 h-4" />
                            Cupons
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-slate-50 dark:bg-slate-950">
                        {loading ? (
                            <div className="h-full flex flex-col items-center justify-center">
                                <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                            </div>
                        ) : (
                            <>
                                {activeTab === 'gerais' && (
                                    <div className="space-y-6">
                                        {/* Campaigns Section */}
                                        {visibleCampaigns.length > 0 && (
                                            <div>
                                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 ml-1">Mensagens</h3>
                                                <div className="space-y-3">
                                                    {visibleCampaigns.map(camp => (
                                                        <div 
                                                            key={camp.id} 
                                                            onClick={() => setSelectedItem(camp)}
                                                            className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden group cursor-pointer hover:border-indigo-200 transition-colors"
                                                        >
                                                            <div className="p-5 flex items-start gap-4">
                                                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 shrink-0 shadow-inner flex items-center justify-center overflow-hidden">
                                                                    {camp.imageUrl ? (
                                                                        <img src={camp.imageUrl} alt={camp.title} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <Megaphone className="w-5 h-5" />
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0 flex flex-col justify-center py-1">
                                                                    <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-tighter text-sm mb-1">{camp.title}</h4>
                                                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium line-clamp-2">{camp.message}</p>
                                                                </div>
                                                                <button 
                                                                    onClick={(e) => handleHideCampaign(camp.id, e)}
                                                                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-300 hover:text-red-500 transition-colors rounded-xl active:scale-95 shrink-0"
                                                                    title="Remover"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Direct Notifications Section */}
                                        {data.notifications.length > 0 && (
                                            <div>
                                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 ml-1">Alertas do Pedido</h3>
                                                <div className="space-y-3">
                                                    {data.notifications.map(notif => (
                                                        <div 
                                                            key={notif.id} 
                                                            onClick={() => setSelectedItem(notif)}
                                                            className="bg-white dark:bg-slate-900 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-start gap-3 cursor-pointer hover:border-indigo-200 transition-colors"
                                                        >
                                                            <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-[14px] flex items-center justify-center text-slate-400 dark:text-slate-500 shrink-0 overflow-hidden">
                                                                {notif.imageUrl ? (
                                                                    <img src={notif.imageUrl} alt={notif.title} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <MessageSquare className="w-5 h-5" />
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0 flex flex-col justify-center pt-0.5">
                                                                <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-tighter text-xs mb-0.5">{notif.title}</h4>
                                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium line-clamp-2">{notif.message}</p>
                                                            </div>
                                                            <button 
                                                                onClick={(e) => handleDelete(notif.id, e)}
                                                                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-300 hover:text-red-500 transition-colors rounded-xl active:scale-95 shrink-0"
                                                                title="Remover"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>

                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {visibleCampaigns.length === 0 && data.notifications.length === 0 && (
                                            <div className="h-full flex flex-col items-center justify-center text-center p-8 mt-12">
                                                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-600 mb-6 drop-shadow-sm">
                                                    <Bell className="w-8 h-8" />
                                                </div>
                                                <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 tracking-tight uppercase mb-2">Tudo Limpo!</h3>
                                                <p className="text-sm font-bold text-slate-400 dark:text-slate-500 leading-relaxed max-w-[200px]">Nenhuma mensagem no momento.</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'cupons' && (
                                    <div className="space-y-6">
                                        {/* Coupons Section */}
                                        {data.coupons.length > 0 ? (
                                            <div>
                                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 ml-1">Meus Cupons</h3>
                                                <div className="space-y-3">
                                                    {data.coupons.map(coupon => (
                                                        <div key={coupon.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border-2 border-dashed border-emerald-300 dark:border-emerald-500/30 flex flex-col gap-4 relative overflow-hidden group transition-all">
                                                            <div className="absolute -right-4 -top-4 w-16 h-16 bg-emerald-500/5 rounded-full"></div>
                                                            <div className="flex items-start gap-4">
                                                                <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 shadow-inner">
                                                                    <Ticket className="w-6 h-6" />
                                                                </div>
                                                                <div className="flex-1">
                                                                    <span className="font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] text-xs block leading-tight">{coupon.code}</span>
                                                                    <p className="text-sm text-slate-800 dark:text-white font-black uppercase tracking-tighter leading-tight mt-1 line-clamp-2">{coupon.description}</p>
                                                                </div>
                                                            </div>
                                                            
                                                            <button 
                                                                onClick={() => copyCode(coupon.code)}
                                                                className={`w-full py-3.5 px-3 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all
                                                                ${copiedCode === coupon.code 
                                                                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                                                                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-emerald-300 hover:text-emerald-600 dark:hover:text-emerald-400'
                                                                }`}
                                                            >
                                                                {copiedCode === coupon.code ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                                                {copiedCode === coupon.code ? 'COPIADO!' : 'COPIAR CUPOM'}
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-center p-8 mt-12">
                                                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-600 mb-6 drop-shadow-sm">
                                                    <Ticket className="w-8 h-8" />
                                                </div>
                                                <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 tracking-tight uppercase mb-2">Sem Cupons</h3>
                                                <p className="text-sm font-bold text-slate-400 dark:text-slate-500 leading-relaxed max-w-[200px]">Você não possui cupons disponíveis no momento.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {selectedItem && (
                <NotificationDetailsModal
                    isOpen={!!selectedItem}
                    onClose={() => setSelectedItem(null)}
                    notificationTitle={selectedItem.title}
                    notificationMessage={selectedItem.message}
                    imageUrl={selectedItem.imageUrl}
                    termsText={selectedItem.termsText}
                    couponCode={selectedItem.couponCode}
                    onBuyNow={handleBuyNow}
                />
            )}
        </>
    );
};

export default NotificationCenterModal;
