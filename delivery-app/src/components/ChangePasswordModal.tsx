import React, { useState } from 'react';
import { X, Lock, Eye, EyeOff } from 'lucide-react';
import { api } from '../services/api';

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: (reopenProfile?: boolean) => void;
    client: any;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose, client }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [formData, setFormData] = useState({
        currentPassword: '',
        password: '',
        confirmPassword: ''
    });

    if (!isOpen) return null;

    const handleSavePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!formData.currentPassword || !formData.password || !formData.confirmPassword) {
            setError('Preencha todos os campos para atualizar sua senha.');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('As novas senhas não coincidem.');
            return;
        }

        setIsLoading(true);
        try {
            const updateData = {
                currentPassword: formData.currentPassword,
                password: formData.password
            };

            const updatedClient = await api.updateClient(client.id, updateData);
            localStorage.setItem('delivery_app_client', JSON.stringify(updatedClient));
            setSuccess('Senha alterada com sucesso!');
            
            setTimeout(() => {
                onClose(true); // Re-open profile modal on success
            }, 1500);
        } catch (err: any) {
            setError(err.response?.data?.error || err.message || 'Erro ao trocar senha. Verifique sua senha atual.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => onClose(true)}></div>
            
            <div className="bg-[#0f172a] dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative animate-in zoom-in-95 duration-300 border border-slate-800">
                {/* Close Button */}
                <button
                    onClick={() => onClose(true)}
                    className="absolute top-6 right-6 w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-slate-500 hover:text-rose-500 transition-all shadow-sm border border-slate-700 active:scale-95"
                >
                    <X className="w-5 h-5" />
                </button>

                <form onSubmit={handleSavePassword} className="space-y-6">
                    <div className="px-2">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Alterar Senha (Opcional)</h3>
                    </div>

                    <div className="space-y-4">
                        <div className="relative group">
                            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-400 transition-colors">
                                <Lock className="w-5 h-5" />
                            </div>
                            <input
                                type={showCurrentPassword ? "text" : "password"}
                                placeholder="Senha Atual"
                                value={formData.currentPassword}
                                onChange={e => setFormData({ ...formData, currentPassword: e.target.value })}
                                className="w-full pl-14 pr-12 py-5 bg-slate-800/50 border border-slate-700 rounded-[1.5rem] font-bold text-sm text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all outline-none"
                            />
                            <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-400 transition-colors">
                                {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>

                        <div className="relative group">
                            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-400 transition-colors">
                                <Lock className="w-5 h-5" />
                            </div>
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Nova Senha"
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                className="w-full pl-14 pr-12 py-5 bg-slate-800/50 border border-slate-700 rounded-[1.5rem] font-bold text-sm text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all outline-none"
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-400 transition-colors">
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>

                        <div className="relative group">
                            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-400 transition-colors">
                                <Lock className="w-5 h-5" />
                            </div>
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Confirmar Nova Senha"
                                value={formData.confirmPassword}
                                onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                                className="w-full pl-14 pr-12 py-5 bg-slate-800/50 border border-slate-700 rounded-[1.5rem] font-bold text-sm text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all outline-none"
                            />
                            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-400 transition-colors">
                                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-rose-500/10 text-rose-400 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-rose-500/20 animate-in fade-in duration-300">
                            {error}
                        </div>
                    )}
                    
                    {success && (
                        <div className="bg-emerald-500/10 text-emerald-400 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-emerald-500/20 animate-in fade-in duration-300">
                            {success}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase text-[12px] tracking-widest shadow-xl shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {isLoading ? 'Atualizando...' : 'Alterar Senha'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChangePasswordModal;
