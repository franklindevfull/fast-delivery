import React, { useEffect, useState } from 'react';
import { Bell, Ticket, MessageSquare, X, Copy, Check, Megaphone } from 'lucide-react';
import { api } from '../services/api';

interface NotificationCenterModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientId: string;
    onAllRead?: () => void;
}

const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({ isOpen, onClose, clientId, onAllRead }) => {
    const [loading, setLoading] = useState(true);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const [data, setData] = useState<{
        notifications: any[],
        coupons: any[],
        campaigns: any[]
    }>({ notifications: [], coupons: [], campaigns: [] });

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

    if (!isOpen) return null;

    return (
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

                <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-slate-50 dark:bg-slate-950">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center">
                            <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <>
                            {/* Campaigns Section */}
                            {data.campaigns.length > 0 && (
                                <div>
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 ml-1">Para Você</h3>
                                    <div className="space-y-3">
                                        {data.campaigns.map(camp => (
                                            <div key={camp.id} className="bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden group">
                                                {camp.imageUrl && (
                                                    <div className="w-full h-32 bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                                                        <img src={camp.imageUrl} alt={camp.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                                    </div>
                                                )}
                                                <div className="p-4">
                                                    <div className="flex items-start gap-3">
                                                        <div className="mt-0.5 rounded-full p-1.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 shrink-0">
                                                            <Megaphone className="w-4 h-4" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-bold text-slate-800 dark:text-white text-sm mb-1">{camp.title}</h4>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{camp.message}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Coupons Section */}
                            {data.coupons.length > 0 && (
                                <div>
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 ml-1">Meus Cupons</h3>
                                    <div className="space-y-3">
                                        {data.coupons.map(coupon => (
                                            <div key={coupon.id} className="bg-white dark:bg-slate-900 p-4 rounded-3xl shadow-sm border border-dashed border-emerald-300 dark:border-emerald-500/30 flex flex-col gap-3 relative overflow-hidden">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                                                        <Ticket className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <span className="font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest text-sm block leading-tight">{coupon.code}</span>
                                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5 font-bold line-clamp-2">{coupon.description}</p>
                                                    </div>
                                                </div>
                                                
                                                <button 
                                                    onClick={() => copyCode(coupon.code)}
                                                    className={`w-full py-2.5 px-3 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all
                                                      ${copiedCode === coupon.code 
                                                        ? 'bg-emerald-50 border-emerald-500 text-emerald-600 dark:bg-emerald-900/30 dark:border-emerald-500/50 dark:text-emerald-400' 
                                                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                                                      }`}
                                                >
                                                    {copiedCode === coupon.code ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                                    {copiedCode === coupon.code ? 'COPIADO!' : 'COPIAR CUPOM'}
                                                </button>
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
                                            <div key={notif.id} className="bg-white dark:bg-slate-900 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-start gap-3">
                                                <div className="w-8 h-8 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-500 shrink-0 mt-0.5">
                                                    <MessageSquare className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-slate-800 dark:text-white text-xs mb-0.5">{notif.title}</h4>
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{notif.message}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {data.campaigns.length === 0 && data.coupons.length === 0 && data.notifications.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-center p-8 mt-12">
                                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-600 mb-6 drop-shadow-sm">
                                        <Bell className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 tracking-tight uppercase mb-2">Tudo Limpo!</h3>
                                    <p className="text-sm font-bold text-slate-400 dark:text-slate-500 leading-relaxed max-w-[200px]">Nenhuma notificação ou cupom disponível no momento.</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationCenterModal;
