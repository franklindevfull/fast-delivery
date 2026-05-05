import React, { useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import type { Product } from '../types';
import { formatCurrency } from '../utils';

interface ProductAddonModalProps {
    product: Product;
    onClose: () => void;
    onConfirm: (product: Product, quantity: number, observations: string, price: number, selectedOptions: any[]) => void;
}

export const ProductAddonModal: React.FC<ProductAddonModalProps> = ({ product, onClose, onConfirm }) => {
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
                { ...option, groupId: group.id, groupName: group.name, productId: option.productId, addonOptionId: option.id }
            ]);
        } else {
            const exists = selectedOptions.find(o => o.id === option.id);
            if (exists) {
                setSelectedOptions(prev => prev.filter(o => o.id !== option.id));
            } else {
                setSelectedOptions(prev => [...prev, { ...option, groupId: group.id, groupName: group.name, productId: option.productId, addonOptionId: option.id }]);
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
                    <button onClick={onClose} className="p-2 bg-white text-slate-400 rounded-full hover:bg-rose-50 hover:text-rose-500 shadow-sm transition-colors active:scale-95">
                        <X size={16} />
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
                                                    {isSelected && <CheckCircle2 size={12} strokeWidth={3} />}
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
                            onConfirm(product, quantity, observations, product.price, selectedOptions);
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
};
