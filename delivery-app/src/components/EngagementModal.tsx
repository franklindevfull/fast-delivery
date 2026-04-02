import React from 'react';
import { Megaphone, X } from 'lucide-react';

interface EngagementModalProps {
    campaign: {
        id: string;
        title: string;
        message: string;
        imageUrl?: string;
    };
    onClose: () => void;
}

const EngagementModal: React.FC<EngagementModalProps> = ({ campaign, onClose }) => {
    return (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-in fade-in duration-500">
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] max-w-sm w-full overflow-hidden flex flex-col border border-white/20 dark:border-slate-800/50 animate-in zoom-in-95 duration-500 relative">
                
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-6 right-6 z-10 p-2 bg-slate-100/50 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-all active:scale-95 text-slate-500 dark:text-slate-400"
                >
                    <X className="w-4 h-4" />
                </button>

                {campaign.imageUrl ? (
                    <div className="relative w-full h-52 bg-slate-100 dark:bg-slate-800">
                        <img 
                            src={campaign.imageUrl} 
                            alt={campaign.title} 
                            className="w-full h-full object-cover" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-white/90 dark:from-slate-900/90 via-transparent to-transparent"></div>
                    </div>
                ) : (
                    <div className="pt-12 pb-4 flex justify-center">
                        <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-500/10 rounded-3xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 rotate-3 shadow-inner">
                            <Megaphone className="w-10 h-10" />
                        </div>
                    </div>
                )}

                <div className={`px-8 pb-10 pt-4 text-center ${campaign.imageUrl ? '-mt-12 relative z-10' : ''}`}>
                    <div className="flex justify-center mb-4">
                        <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-full">
                            Novidade para você
                        </span>
                    </div>
                    
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight leading-tight mb-3">
                        {campaign.title}
                    </h2>
                    
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed whitespace-pre-wrap px-2">
                        {campaign.message}
                    </p>
                    
                    <button
                        onClick={onClose}
                        className="mt-8 w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] transition-all shadow-xl shadow-indigo-500/20 active:scale-[0.98] group flex items-center justify-center gap-2"
                    >
                        Entendi
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                    </button>
                    
                    <p className="mt-6 text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest opacity-50">
                        Fast Delivery
                    </p>
                </div>
            </div>
        </div>
    );
};

export default EngagementModal;
