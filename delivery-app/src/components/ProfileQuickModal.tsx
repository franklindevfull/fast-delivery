import React from 'react';
import { X, MapPin, Lock, User, Camera, ArrowRight, Fingerprint } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { isMobile } from '../utils/device';

interface ProfileQuickModalProps {
    isOpen: boolean;
    onClose: () => void;
    client: any;
    onEditPhoto: () => void;
    onChangePassword: () => void;
    onToggleBiometric: (isActive: boolean) => void;
    isBiometricLoading?: boolean;
}

const ProfileQuickModal: React.FC<ProfileQuickModalProps> = ({ 
    isOpen, 
    onClose, 
    client, 
    onEditPhoto, 
    onChangePassword,
    onToggleBiometric,
    isBiometricLoading
}) => {
    const navigate = useNavigate();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>
            
            <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative animate-in zoom-in-95 duration-300 border border-white dark:border-slate-800">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-rose-500 transition-all shadow-sm border border-slate-100 dark:border-slate-700 active:scale-95"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Header / Avatar */}
                <div className="flex flex-col items-center mb-8">
                    <div className="relative group mb-4">
                        <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-900/20 rounded-[2rem] flex items-center justify-center border-4 border-white dark:border-slate-800 shadow-xl overflow-hidden">
                            {client?.avatarUrl ? (
                                <img src={client.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-10 h-10 text-indigo-400" />
                            )}
                        </div>
                        <button 
                            onClick={onEditPhoto}
                            className="absolute -bottom-2 -right-2 w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-all border-4 border-white dark:border-slate-800"
                        >
                            <Camera className="w-4 h-4" />
                        </button>
                    </div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">{client?.name || 'Cliente'}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{client?.phone || 'Sem telefone'}</p>
                </div>

                {/* Address Section */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 mb-6">
                    <div className="flex items-center gap-2 mb-3">
                        <MapPin className="w-4 h-4 text-indigo-500" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Endereço Cadastrado</span>
                    </div>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-tight">
                        {client?.street ? `${client.street}, ${client.addressNumber}${client.complement ? ` - ${client.complement}` : ''}` : 'Nenhum endereço cadastrado'}
                    </p>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1">
                        {client?.neighborhood ? `${client.neighborhood}, ${client.city}-${client.state}` : ''}
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                    <button
                        onClick={() => {
                            onClose();
                            navigate('/profile', { state: { fromQuickModal: true } });
                        }}
                        className="w-full p-4 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-between group hover:bg-indigo-600 hover:text-white transition-all active:scale-[0.98]"
                    >
                        <div className="flex items-center gap-3">
                            <MapPin className="w-5 h-5" />
                            <span className="text-xs font-black uppercase tracking-widest">Ver/Editar Endereço</span>
                        </div>
                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0" />
                    </button>
                    <button
                        onClick={onChangePassword}
                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl flex items-center justify-between group hover:bg-slate-800 dark:hover:bg-slate-700 hover:text-white transition-all active:scale-[0.98]"
                    >
                        <div className="flex items-center gap-3">
                            <Lock className="w-5 h-5" />
                            <span className="text-xs font-black uppercase tracking-widest">Trocar Senha</span>
                        </div>
                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0" />
                    </button>
                    {isMobile() && (
                        <div className="w-full p-4 rounded-2xl flex items-center justify-between transition-all bg-slate-50 dark:bg-slate-900/40">
                            <div className="flex items-center gap-3">
                                <Fingerprint className={`w-5 h-5 ${client?.webauthnId ? 'text-emerald-500' : 'text-slate-400'}`} />
                                <span className={`text-xs font-black uppercase tracking-widest ${client?.webauthnId ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                    Autenticação por Biometria
                                </span>
                            </div>
                            
                            {isBiometricLoading ? (
                                <div className="w-5 h-5 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin"></div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => onToggleBiometric(!!client?.webauthnId)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 ${
                                        client?.webauthnId ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                                    }`}
                                >
                                    <span className="sr-only">Ativar biometria</span>
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                            client?.webauthnId ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfileQuickModal;
