import React, { useState, useEffect } from 'react';

export interface BaseCampaign {
    id: string;
    title: string;
    message: string;
    imageUrl?: string;
    type?: string;
}

export interface CouponItem {
    id: string;
    code: string;
    description: string;
    discountValue?: number;
    discountType?: string;
}

interface NotificationCenterProps {
    campaigns: BaseCampaign[];
    coupons: CouponItem[];
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ campaigns, coupons }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    // Calculate unread count using localStorage
    useEffect(() => {
        const readCampaigns = JSON.parse(localStorage.getItem('menu_digital_read_campaigns') || '[]');
        const readCoupons = JSON.parse(localStorage.getItem('menu_digital_read_coupons') || '[]');
        
        let count = 0;
        campaigns.forEach(c => { if (!readCampaigns.includes(c.id)) count++; });
        coupons.forEach(c => { if (!readCoupons.includes(c.id)) count++; });
        
        setUnreadCount(count);
    }, [campaigns, coupons, isOpen]);

    const markAllAsRead = () => {
        const readCampaigns = JSON.parse(localStorage.getItem('menu_digital_read_campaigns') || '[]');
        const readCoupons = JSON.parse(localStorage.getItem('menu_digital_read_coupons') || '[]');
        
        campaigns.forEach(c => { if (!readCampaigns.includes(c.id)) readCampaigns.push(c.id); });
        coupons.forEach(c => { if (!readCoupons.includes(c.id)) readCoupons.push(c.id); });
        
        localStorage.setItem('menu_digital_read_campaigns', JSON.stringify(readCampaigns));
        localStorage.setItem('menu_digital_read_coupons', JSON.stringify(readCoupons));
        setUnreadCount(0);
    };

    const handleOpen = () => {
        setIsOpen(true);
        markAllAsRead();
    };

    const copyToClipboard = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    return (
        <>
            {/* Bell Icon Button */}
            <button
                onClick={handleOpen}
                className="relative w-10 h-10 bg-white shadow-sm border border-slate-100 rounded-xl flex items-center justify-center text-slate-500 hover:text-blue-600 transition-all active:scale-95"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white animate-bounce-in">
                        {unreadCount}
                    </span>
                )}
            </button>

            {/* Sidebar Overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex justify-end animate-in fade-in duration-300">
                    <div 
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
                        onClick={() => setIsOpen(false)}
                    />
                    
                    {/* Drawer Content */}
                    <div className="relative w-full max-w-sm bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                </div>
                                <h2 className="text-xl font-black text-slate-800 tracking-tighter uppercase">Novidades</h2>
                            </div>
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="w-10 h-10 hover:bg-slate-50 rounded-full flex items-center justify-center text-slate-400 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar bg-slate-50/50">
                            {/* Campaigns Section */}
                            {campaigns.length > 0 && (
                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Especiais para você</h3>
                                    <div className="space-y-4">
                                        {campaigns.map(camp => (
                                                <div className="p-5 space-y-2 relative overflow-hidden group">
                                                    <div className="absolute top-4 right-4 bg-blue-500/10 text-blue-600 dark:text-blue-400 p-1.5 rounded-full z-10">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                                        </svg>
                                                    </div>
                                                    <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-tighter text-sm leading-tight group-hover:text-blue-600 transition-colors">{camp.title}</h4>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{camp.message}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Coupons Section */}
                            {coupons.length > 0 && (
                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Cupons Disponíveis</h3>
                                    <div className="space-y-4">
                                        {coupons.map(coupon => (
                                            <div 
                                                key={coupon.id} 
                                                className="bg-white dark:bg-slate-900 px-5 py-6 rounded-[2rem] border-2 border-dashed border-emerald-300 dark:border-emerald-500/30 flex flex-col gap-4 relative overflow-hidden group active:scale-95 transition-all shadow-sm"
                                            >
                                                <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-500/5 rounded-full transition-transform group-hover:scale-110"></div>
                                                <div className="flex items-start gap-4">
                                                    <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                                                        </svg>
                                                    </div>
                                                    <div className="flex-1 space-y-0.5">
                                                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em]">{coupon.code}</span>
                                                        <p className="text-sm text-slate-800 dark:text-white font-black uppercase tracking-tighter leading-tight mt-1">{coupon.description}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => copyToClipboard(coupon.code)}
                                                    className={`w-full py-3.5 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all
                                                        ${copiedCode === coupon.code 
                                                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                                                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-slate-900'}`}
                                                >
                                                    {copiedCode === coupon.code ? (
                                                        <>
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                            Copiado!
                                                        </>
                                                    ) : (
                                                        'Copiar Cupom'
                                                    )}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {campaigns.length === 0 && coupons.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-center p-8 mt-20">
                                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-6">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                        </svg>
                                    </div>
                                    <h4 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Nenhuma novidade</h4>
                                    <p className="text-sm text-slate-400 font-medium">Fique atento para promoções e campanhas especiais.</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-white border-t border-slate-100">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] active:scale-95 transition-all shadow-xl shadow-slate-200"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default NotificationCenter;
