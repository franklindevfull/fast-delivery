import React, { useState } from 'react';
import { X, ShoppingBag } from 'lucide-react';

interface NotificationDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    notificationTitle: string;
    notificationMessage: string;
    imageUrl?: string;
    termsText?: string;
    couponCode?: string;
    onBuyNow: () => void;
}

const NotificationDetailsModal: React.FC<NotificationDetailsModalProps> = ({ 
    isOpen, 
    onClose, 
    notificationTitle, 
    notificationMessage, 
    imageUrl,
    termsText,
    couponCode,
    onBuyNow 
}) => {
    const [showTerms, setShowTerms] = useState(false);

    if (!isOpen) return null;

    if (showTerms) {
        return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center animate-in fade-in duration-300">
                <div className="absolute inset-0 bg-white dark:bg-slate-900" onClick={() => setShowTerms(false)}></div>
                <div className="bg-white dark:bg-slate-900 w-full h-full p-6 flex flex-col relative animate-in slide-in-from-right duration-500">
                    <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100 dark:border-slate-800 pt-4">
                        <button onClick={() => setShowTerms(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400">
                            <X className="w-6 h-6" />
                        </button>
                        <h2 className="text-lg font-black text-slate-800 dark:text-white flex-1 text-center pr-8">Termos e Condições</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <p className="text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed whitespace-pre-wrap">
                            {termsText || 'Nenhum termo aplicável.'}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[150] flex justify-center items-stretch animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
            
            <div className="bg-white dark:bg-slate-900 w-full h-full shadow-2xl relative animate-in slide-in-from-bottom duration-500 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto flex flex-col relative">
                    {/* Botão de fechar que rola junto com o conteúdo */}
                    <button 
                        onClick={onClose} 
                        className="absolute right-4 top-4 z-50 w-10 h-10 flex items-center justify-center bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full transition-all text-white active:scale-95 shadow-sm border border-white/10"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {imageUrl && (
                        <div className="w-full relative shrink-0">
                            <div className="w-full aspect-[4/3] bg-slate-100 dark:bg-slate-800">
                                <img src={imageUrl} alt={notificationTitle} className="w-full h-full object-cover" />
                            </div>
                        </div>
                    )}
                    
                    <div className="p-8 flex flex-col flex-1">
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight leading-tight mb-4 text-center">
                            {notificationTitle}
                        </h2>
                        
                        <div className="text-[15px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium mb-8 text-center flex-1">
                            {notificationMessage}
                        </div>

                        {couponCode && (
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl border-2 border-dashed border-emerald-300 dark:border-emerald-500/30 mb-8 mx-auto w-full max-w-xs text-center">
                                <span className="block text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-widest mb-1">CÓDIGO DO CUPOM</span>
                                <span className="font-mono text-xl font-black text-slate-800 dark:text-white tracking-wider">{couponCode}</span>
                            </div>
                        )}
                        
                        <div className="flex flex-col gap-3 mt-auto shrink-0">
                            <button 
                                onClick={onBuyNow}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-200 dark:shadow-blue-900/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <ShoppingBag className="w-5 h-5" />
                                Comprar Agora
                            </button>
                            
                            {termsText && (
                                <button 
                                    onClick={() => setShowTerms(true)}
                                    className="w-full bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center"
                                >
                                    Termos e Condições
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotificationDetailsModal;
