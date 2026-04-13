import React, { useState } from 'react';
import { Icons } from '../constants';

interface PixInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    pixKey: string;
}

const PixInfoModal: React.FC<PixInfoModalProps> = ({ isOpen, onClose, pixKey }) => {
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const handleCopy = () => {
        navigator.clipboard.writeText(pixKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden border border-white/20 relative animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
                <div className="p-6 text-center bg-blue-600">
                    <div className="flex justify-center mb-2 mt-4">
                        <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
                            <Icons.QrCode className="w-10 h-10 text-white" />
                        </div>
                    </div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-2 leading-tight">Pagamento PIX</h3>
                    <p className="font-bold uppercase text-[9px] tracking-widest leading-relaxed text-blue-100 px-4">
                        Informações para recebimento do cliente
                    </p>
                </div>

                <div className="px-8 pb-4 pt-8">
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col items-center gap-4 relative group">
                        <div className="text-center w-full">
                            <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] mb-2 block">Chave do Estabelecimento</span>
                            <p className="font-black text-slate-800 text-sm break-all leading-tight select-all">
                                {pixKey || 'CHAVE NÃO CADASTRADA'}
                            </p>
                        </div>
                        
                        {pixKey && (
                            <button
                                onClick={handleCopy}
                                className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                            >
                                {copied ? (
                                    <>
                                        <Icons.Check size={16} strokeWidth={3} />
                                        <span className="text-[10px] font-black uppercase">Copiado!</span>
                                    </>
                                ) : (
                                    <>
                                        <Icons.Copy size={16} strokeWidth={3} />
                                        <span className="text-[10px] font-black uppercase">Copiar Chave</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                <div className="p-8 pt-4">
                    <button
                        onClick={onClose}
                        className="w-full py-4 text-[11px] font-black uppercase text-slate-400 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all active:scale-95"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PixInfoModal;
