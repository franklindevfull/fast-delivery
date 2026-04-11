
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/db';
import { User, Waiter, DeliveryDriver, BusinessSettings, DeliveryZone } from '../types';
import { Icons } from '../constants';
import CustomAlert from '../components/CustomAlert';
import { useTheme } from '../components/ThemeProvider';
import { useToast } from '../hooks/useToast';
import AuditLogs from './AuditLogs';
import QRCodes from './QRCodes';

// Sub-componente para Gestão de Garçons
const WaiterManagement: React.FC = () => {
    const [waiters, setWaiters] = useState<Waiter[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showErrors, setShowErrors] = useState(false);
    const [editingWaiter, setEditingWaiter] = useState<Waiter | null>(null);
    const [formData, setFormData] = useState({ name: '', phone: '', email: '' });
    const [loading, setLoading] = useState(false);
    const { addToast } = useToast();

    const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean, title: string, message: string, type: 'SUCCESS' | 'ERROR' | 'DANGER', onConfirm?: () => void }>({
        isOpen: false, title: '', message: '', type: 'SUCCESS'
    });

    const refresh = async () => setWaiters(await db.getWaiters());
    useEffect(() => { refresh(); }, []);

    const toTitleCase = (str: string) => {
        return str.toLowerCase().replace(/(?:^|\s)\S/g, (a) => a.toUpperCase());
    };

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        // Validação manual
        if (!formData.name.trim() || !formData.phone.trim() || !formData.email.trim()) {
            setShowErrors(true);
            addToast({
                title: "CAMPOS OBRIGATÓRIOS",
                message: "Por favor, preencha todos os campos do formulário.",
                type: "DANGER"
            });
            return;
        }

        setLoading(true);
        try {
            await db.saveWaiter({
                id: editingWaiter?.id || `wa-${Date.now()}`,
                ...formData,
                name: toTitleCase(formData.name)
            });
            setIsModalOpen(false);
            refresh();
            setFormData({ name: '', phone: '', email: '' });
            addToast({
                title: "SUCESSO",
                message: editingWaiter ? "Garçom atualizado com sucesso!" : "Garçom cadastrado com sucesso!",
                type: "SUCCESS"
            });
        } catch (error) {
            addToast({
                title: "ERRO",
                message: "Erro ao salvar garçom",
                type: "DANGER"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (waiter: Waiter) => {
        const action = waiter.active ? 'inativar' : 'ativar';
        setAlertConfig({
            isOpen: true,
            title: `${action.toUpperCase()} GARÇOM`,
            message: `Tem certeza que deseja ${action} o acesso de ${waiter.name}?`,
            type: waiter.active ? 'DANGER' : 'INFO',
            onConfirm: async () => {
                await db.toggleWaiterStatus(waiter.id, !waiter.active);
                refresh();
                setAlertConfig(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleResetWaiter = async (waiter: Waiter) => {
        setAlertConfig({
            isOpen: true,
            title: 'RESET DE SEGURANÇA',
            message: `A senha de ${waiter.name} será resetada para '123' e um novo código de recuperação será gerado. Prosseguir?`,
            type: 'DANGER',
            onConfirm: async () => {
                await db.resetWaiter(waiter.id);
                refresh();
                setAlertConfig(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const applyPhoneMask = (value: string) => {
        const v = value.replace(/\D/g, '').slice(0, 11);
        if (v.length <= 2) return v;
        if (v.length <= 3) return `(${v.slice(0, 2)}) ${v.slice(2)}`;
        if (v.length <= 7) return `(${v.slice(0, 2)}) ${v.slice(2, 3)} ${v.slice(3)}`;
        return `(${v.slice(0, 2)}) ${v.slice(2, 3)} ${v.slice(3, 7)}-${v.slice(7)}`;
    };

    return (
        <div className="space-y-6">
            <CustomAlert
                isOpen={alertConfig.isOpen}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                onConfirm={alertConfig.onConfirm || (() => setAlertConfig(prev => ({ ...prev, isOpen: false })))}
                onCancel={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
            />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
                <div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Equipe de Garçons</h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest leading-relaxed">Colaboradores com acesso ao App Garçom</p>
                </div>
                <button
                    onClick={() => { setEditingWaiter(null); setFormData({ name: '', phone: '', email: '' }); setIsModalOpen(true); }}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 shrink-0"
                >
                    <Icons.Plus size={18} strokeWidth={3} />
                    Novo Garçom
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {waiters.filter(w => w.name && w.name.trim() !== '').map(w => (
                    <div key={w.id} className={`bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl sm:rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex flex-col group hover:shadow-xl transition-all relative overflow-hidden ${!w.active ? 'opacity-50 grayscale' : ''}`}>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl sm:rounded-2xl flex items-center justify-center font-black uppercase text-sm shadow-inner shrink-0 relative">
                                {w.name.substring(0, 2)}
                                {!w.active && <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></div>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="font-black text-slate-800 dark:text-white uppercase text-xs tracking-tight truncate">{w.name}</p>
                                    {!w.active && <span className="text-[7px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest shrink-0">Inativo</span>}
                                </div>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest truncate">{w.email || 'Sem e-mail'}</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800">
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">Whatsapp</span>
                                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 tracking-tight">{w.phone}</span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleResetWaiter(w)}
                                    title="Resetar Segurança"
                                    className="p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-800 text-amber-600 dark:text-white rounded-xl hover:bg-amber-600 dark:hover:bg-amber-500 hover:text-white transition-all outline-none"
                                >
                                    <Icons.Clock size={16} />
                                </button>
                                <button
                                    onClick={() => {
                                        setEditingWaiter(w);
                                        setFormData({ name: w.name, phone: w.phone, email: w.email || '' });
                                        setIsModalOpen(true);
                                    }}
                                    title="Editar Dados"
                                    className="p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white transition-all outline-none"
                                >
                                    <Icons.Edit size={16} />
                                </button>
                                <button
                                    onClick={() => handleToggleStatus(w)}
                                    title={w.active ? 'Inativar Garçom' : 'Ativar Garçom'}
                                    className={`p-2.5 sm:p-3 rounded-xl transition-all outline-none ${w.active ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white'}`}
                                >
                                    {w.active ? <Icons.Delete size={16} /> : <Icons.User size={16} />}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] sm:rounded-[3rem] shadow-2xl w-full max-w-xl border border-white/20 dark:border-slate-800 overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-6 sm:p-8 flex justify-between items-center border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <h4 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">
                                    {editingWaiter ? 'Editar Garçom' : 'Cadastrar Garçom'}
                                </h4>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Dados de acesso ao sistema</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleSave()}
                                    title="Confirmar Alterações"
                                    className="w-12 h-12 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30 transition-all active:scale-90"
                                >
                                    <Icons.Check size={24} strokeWidth={3} />
                                </button>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    title="Fechar"
                                    className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-all active:scale-90"
                                >
                                    <Icons.X size={24} strokeWidth={3} />
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSave} className="p-6 sm:p-10 space-y-6 sm:space-y-8">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Nome Completo</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: toTitleCase(e.target.value) })}
                                        className={`w-full p-4 sm:p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl sm:rounded-[1.5rem] outline-none font-bold text-sm shadow-inner focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/20 transition-all text-slate-800 dark:text-white border-2 ${showErrors && !formData.name.trim() ? 'border-red-500 bg-red-50/50 dark:bg-red-900/20' : 'border-transparent'}`}
                                        placeholder="Ex: Miguel Falabela"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Celular / Whats</label>
                                    <input
                                        type="text"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: applyPhoneMask(e.target.value) })}
                                        className={`w-full p-4 sm:p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl sm:rounded-[1.5rem] outline-none font-bold text-sm shadow-inner focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/20 transition-all text-slate-800 dark:text-white border-2 ${showErrors && !formData.phone.trim() ? 'border-red-500 bg-red-50/50 dark:bg-red-900/20' : 'border-transparent'}`}
                                        placeholder="(00) 0 0000-0000"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest ml-2 flex items-center gap-2">
                                    E-mail <span className="text-[8px] bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">(Login do Garçom)</span>
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value.toLowerCase() })}
                                    className={`w-full p-4 sm:p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl sm:rounded-[1.5rem] outline-none font-bold text-sm shadow-inner focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/20 transition-all text-slate-800 dark:text-white border-2 ${showErrors && !formData.email.trim() ? 'border-red-500 bg-red-50/50 dark:bg-red-900/20' : 'border-transparent'}`}
                                    placeholder="exemplo@gmail.com"
                                />
                                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium ml-2 mt-2 leading-relaxed">A senha padrão para novos usuários é: <span className="font-black text-blue-600 dark:text-blue-400">123</span></p>
                            </div>

                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// Sub-componente para Gestão de Entregadores
const EntregadoresManagement: React.FC = () => {
    const [drivers, setDrivers] = useState<DeliveryDriver[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showErrors, setShowErrors] = useState(false);
    const [editingDriver, setEditingDriver] = useState<DeliveryDriver | null>(null);
    const [formData, setFormData] = useState({
        name: '', phone: '', email: '', address: '', plate: '', model: '', brand: '', type: 'Moto' as any
    });
    const { addToast } = useToast();
    const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean, title: string, message: string, type: 'SUCCESS' | 'ERROR' | 'DANGER' | 'INFO', onConfirm?: () => void }>({
        isOpen: false, title: '', message: '', type: 'SUCCESS'
    });

    const applyPhoneMask = (value: string) => {
        const v = value.replace(/\D/g, '').slice(0, 11);
        if (v.length <= 2) return v;
        if (v.length <= 3) return `(${v.slice(0, 2)}) ${v.slice(2)}`;
        if (v.length <= 7) return `(${v.slice(0, 2)}) ${v.slice(2, 3)} ${v.slice(3)}`;
        return `(${v.slice(0, 2)}) ${v.slice(2, 3)} ${v.slice(3, 7)}-${v.slice(7)}`;
    };

    const applyPlateMask = (value: string) => {
        const v = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 7);
        if (v.length <= 3) return v;
        return `${v.slice(0, 3)}-${v.slice(3)}`;
    };

    const toTitleCase = (str: string) => {
        return str.toLowerCase().replace(/(?:^|\s)\S/g, (a) => a.toUpperCase());
    };

    const refresh = async () => setDrivers(await db.getDrivers());
    useEffect(() => { refresh(); }, []);

    const openModal = (driver?: DeliveryDriver) => {
        if (driver) {
            setEditingDriver(driver);
            setFormData({
                name: driver.name, phone: driver.phone, email: driver.email || '', address: driver.address || '',
                plate: driver.vehiclePlate === 'N/A' ? '' : driver.vehiclePlate,
                model: driver.vehicleModel, brand: driver.vehicleBrand, type: driver.vehicleType
            });
        } else {
            setEditingDriver(null);
            setFormData({ name: '', phone: '', email: '', address: '', plate: '', model: '', brand: '', type: 'Moto' });
        }
        setShowErrors(false);
        setIsModalOpen(true);
    };

    const saveDriver = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        // Validação manual
        const isBicycle = formData.type === 'Bicicleta';
        const hasMissingFields = !formData.name.trim() || 
                                !formData.phone.trim() || 
                                !formData.email.trim() || 
                                (!isBicycle && (!formData.plate.trim() || !formData.model.trim()));

        if (hasMissingFields) {
            setShowErrors(true);
            addToast({
                title: "CAMPOS OBRIGATÓRIOS",
                message: "Por favor, preencha todos os campos do formulário.",
                type: "DANGER"
            });
            return;
        }

        const payload = {
            id: editingDriver?.id || `DRV-${Date.now()}`,
            name: toTitleCase(formData.name),
            phone: formData.phone,
            email: formData.email,
            address: formData.address,
            vehicle: {
                plate: formData.type === 'Bicicleta' ? 'N/A' : (formData.plate || '---'),
                model: toTitleCase(formData.model),
                brand: toTitleCase(formData.brand),
                type: formData.type
            },
            status: editingDriver?.status || 'AVAILABLE',
            active: editingDriver?.active ?? true
        };
        await db.saveDriver(payload as any);
        refresh();
        setIsModalOpen(false);
    };

    const handleToggleStatus = async (driver: DeliveryDriver) => {
        const action = driver.active ? 'inativar' : 'ativar';
        setAlertConfig({
            isOpen: true,
            title: `${action.toUpperCase()} ENTREGADOR`,
            message: `Tem certeza que deseja ${action} o acesso de ${driver.name}?`,
            type: driver.active ? 'DANGER' : 'INFO',
            onConfirm: async () => {
                await db.toggleDriverStatus(driver.id, !driver.active);
                refresh();
                setAlertConfig(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleResetDriver = async (driver: DeliveryDriver) => {
        setAlertConfig({
            isOpen: true,
            title: 'RESET DE SEGURANÇA',
            message: `A senha de ${driver.name} será resetada para '123' e um novo código de recuperação será gerado. Prosseguir?`,
            type: 'DANGER',
            onConfirm: async () => {
                await db.resetDriver(driver.id);
                setAlertConfig(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    return (
        <div className="space-y-6">
            <CustomAlert
                isOpen={alertConfig.isOpen}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                onConfirm={alertConfig.onConfirm || (() => setAlertConfig(prev => ({ ...prev, isOpen: false })))}
                onCancel={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
            />
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
                <div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Entregadores</h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest leading-relaxed">Base de entregadores cadastrados no sistema</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 shrink-0"
                >
                    <Icons.Plus size={18} strokeWidth={3} />
                    Novo Entregador
                </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {drivers.map(driver => (
                    <div key={driver.id} className={`bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl sm:rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex flex-col group hover:shadow-xl transition-all relative overflow-hidden ${!driver.active ? 'opacity-50 grayscale' : ''}`}>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-900 dark:bg-slate-800 text-white dark:text-slate-200 rounded-xl sm:rounded-2xl flex items-center justify-center font-black uppercase text-sm shadow-inner shrink-0 relative">
                                {driver.name.substring(0, 2)}
                                {!driver.active && <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></div>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="font-black text-slate-800 dark:text-white uppercase text-xs tracking-tight truncate">{driver.name}</p>
                                    {!driver.active && <span className="text-[7px] bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest shrink-0">Inativo</span>}
                                </div>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest truncate">{driver.vehicleBrand} {driver.vehicleModel}</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800">
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">Placa / Whats</span>
                                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 tracking-tight lowercase">{driver.vehiclePlate === 'N/A' ? driver.phone : driver.vehiclePlate}</span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleResetDriver(driver)}
                                    title="Resetar Segurança"
                                    className="p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-800 text-amber-600 dark:text-white rounded-xl hover:bg-amber-600 dark:hover:bg-amber-500 hover:text-white transition-all outline-none"
                                >
                                    <Icons.Clock size={16} />
                                </button>
                                <button
                                    onClick={() => openModal(driver)}
                                    title="Editar Dados"
                                    className="p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white transition-all outline-none"
                                >
                                    <Icons.Edit size={16} />
                                </button>
                                <button
                                    onClick={() => handleToggleStatus(driver)}
                                    title={driver.active ? 'Inativar Entregador' : 'Ativar Entregador'}
                                    className={`p-2.5 sm:p-3 rounded-xl transition-all outline-none ${driver.active ? 'bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white' : 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white'}`}
                                >
                                    {driver.active ? <Icons.Delete size={16} /> : <Icons.User size={16} />}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] sm:rounded-[3rem] shadow-2xl w-full max-w-2xl border border-white/20 dark:border-slate-800 overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-6 sm:p-10 pb-4 flex justify-between items-start border-b border-slate-50 dark:border-slate-800">
                            <div className="flex-1">
                                <h4 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter mb-1">
                                    {editingDriver ? 'Editar Entregador' : 'Novo Entregador'}
                                </h4>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest leading-relaxed">Preencha os dados do entregador para acesso ao App</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => (document.getElementById('driver-form') as HTMLFormElement)?.requestSubmit()}
                                    className="w-12 h-12 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20 active:scale-90 transition-all"
                                    title="Confirmar Alterações"
                                >
                                    <Icons.Check size={24} strokeWidth={3} />
                                </button>
                                <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-2xl hover:text-red-500 transition-all flex items-center justify-center">
                                    <Icons.X size={20} />
                                </button>
                            </div>
                        </div>
                        <form id="driver-form" onSubmit={saveDriver} className="p-6 sm:p-10 space-y-6 sm:space-y-8">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Nome Completo</label>
                                    <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: toTitleCase(e.target.value) })} className={`w-full p-4 sm:p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl sm:rounded-[1.5rem] outline-none font-bold text-sm shadow-inner focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/20 transition-all text-slate-800 dark:text-white border-2 ${showErrors && !formData.name.trim() ? 'border-red-500 bg-red-50/50 dark:bg-red-900/20' : 'border-transparent'}`} placeholder="Ex: Roberto Carlos" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Celular / Whats</label>
                                    <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: applyPhoneMask(e.target.value) })} className={`w-full p-4 sm:p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl sm:rounded-[1.5rem] outline-none font-bold text-sm shadow-inner focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/20 transition-all text-slate-800 dark:text-white border-2 ${showErrors && !formData.phone.trim() ? 'border-red-500 bg-red-50/50 dark:bg-red-900/20' : 'border-transparent'}`} placeholder="(00) 9 0000-0000" />
                                </div>
                                <div className="space-y-2 col-span-1 sm:col-span-2">
                                    <label className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                        Email <span className="text-[8px] bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">(Obrigatório para login no App)</span>
                                    </label>
                                    <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className={`w-full p-4 sm:p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl sm:rounded-[1.5rem] outline-none font-bold text-sm shadow-inner focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/20 transition-all text-slate-800 dark:text-white border-2 ${showErrors && !formData.email.trim() ? 'border-red-500 bg-red-50/50 dark:bg-red-900/20' : 'border-transparent'}`} placeholder="moto@exemplo.com" />
                                    {!editingDriver && (
                                        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium ml-2 mt-2 leading-relaxed">A senha padrão para novos usuários é: <span className="font-black text-blue-600 dark:text-blue-400">123</span></p>
                                    )}
                                </div>
                            </div>
                            <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6">Informações do Veículo</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Tipo de Veículo</label>
                                        <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as any })} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none font-bold text-sm text-slate-800 dark:text-white shadow-sm border border-slate-100 dark:border-slate-800">
                                            <option value="Moto">Moto</option>
                                            <option value="Carro">Carro</option>
                                            <option value="Bicicleta">Bicicleta</option>
                                        </select>
                                    </div>
                                    <div className={`space-y-1 ${formData.type === 'Bicicleta' ? 'opacity-30 pointer-events-none' : ''}`}>
                                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Identificação / Placa</label>
                                        <input
                                            type="text"
                                            value={formData.type === 'Bicicleta' ? 'N/A' : formData.plate}
                                            onChange={e => setFormData({ ...formData, plate: applyPlateMask(e.target.value) })}
                                            className={`w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold text-sm font-mono uppercase text-slate-800 dark:text-white shadow-sm border-2 ${showErrors && formData.type !== 'Bicicleta' && !formData.plate.trim() ? 'border-red-500 bg-red-50/50 dark:bg-red-900/20' : 'border-transparent'}`}
                                            placeholder={formData.type === 'Bicicleta' ? 'N/A' : 'AAA-0000'}
                                            disabled={formData.type === 'Bicicleta'}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Modelo / Cor</label>
                                        <input type="text" value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })} className={`w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold text-sm text-slate-800 dark:text-white shadow-sm border-2 ${showErrors && formData.type !== 'Bicicleta' && !formData.model.trim() ? 'border-red-500 bg-red-50/50 dark:bg-red-900/20' : 'border-transparent'}`} placeholder="Ex: CB 500 / Azul" />
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// Sub-componente para Gestão de Zonas de Entrega
const DeliveryZoneManagement: React.FC = () => {
    const [zones, setZones] = useState<DeliveryZone[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showErrors, setShowErrors] = useState(false);
    const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
    const [formData, setFormData] = useState({ name: '', fee: 0, active: true });
    const { addToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string;
            if (!text) return;

            const lines = text.split(/\r?\n/);
            const zonesToImport: { name: string, fee: number }[] = [];

            // Detectar cabeçalho
            const firstLine = lines[0]?.toLowerCase() || '';
            const hasHeader = firstLine.includes('bairro') || firstLine.includes('taxa') || firstLine.includes('nome');
            const startIndex = hasHeader ? 1 : 0;

            for (let i = startIndex; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                // Suporta vírgula ou ponto e vírgula
                const parts = line.includes(';') ? line.split(';') : line.split(',');
                if (parts.length >= 2) {
                    const name = parts[0].trim();
                    // Limpa símbolos de moeda, espaços e troca vírgula por ponto
                    const rawValue = parts[1].trim();
                    const cleanValue = rawValue.replace(/[^0-9,.]/g, '').replace(',', '.');
                    const fee = parseFloat(cleanValue);

                    if (name && !isNaN(fee)) {
                        zonesToImport.push({ name, fee });
                    }
                }
            }

            if (zonesToImport.length > 0) {
                try {
                    addToast({ title: "IMPORTANDO", message: `Processando ${zonesToImport.length} bairros...`, type: "INFO" });
                    const result = await db.importDeliveryZones(zonesToImport);
                    addToast({ title: "SUCESSO", message: `${result.count} bairros importados/atualizados com sucesso!`, type: "SUCCESS" });
                    refresh();
                } catch (error: any) {
                    addToast({ title: "ERRO NA IMPORTAÇÃO", message: error.message || "Erro ao processar o arquivo.", type: "DANGER" });
                }
            } else {
                addToast({ title: "ARQUIVO INVÁLIDO", message: "Nenhum dado válido encontrado. O arquivo deve ter 'Bairro' e 'Taxa'.", type: "WARNING" });
            }

            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsText(file, 'UTF-8');
    };

    const refresh = async () => {
        try {
            const z = await db.getDeliveryZones();
            setZones(z);
        } catch (e) {
            console.error("Error fetching zones:", e);
        }
    };
    useEffect(() => { refresh(); }, []);

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!formData.name.trim()) {
            setShowErrors(true);
            addToast({ title: "CAMPOS OBRIGATÓRIOS", message: "O nome do bairro é obrigatório.", type: "DANGER" });
            return;
        }

        try {
            await db.saveDeliveryZone({
                id: editingZone?.id || `new-${Date.now()}`,
                ...formData,
                name: formData.name.toUpperCase()
            });
            setIsModalOpen(false);
            refresh();
            setFormData({ name: '', fee: 0, active: true });
            addToast({ title: "SUCESSO", message: "Configuração de frete salva!", type: "SUCCESS" });
        } catch (error) {
            addToast({ title: "ERRO", message: "Erro ao salvar zona", type: "DANGER" });
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir esta zona? Os clientes deste bairro passarão a precisar de revisão manual de frete.')) {
            try {
                await db.deleteDeliveryZone(id);
                refresh();
                addToast({ title: "SUCESSO", message: "Zona removida com sucesso.", type: "SUCCESS" });
            } catch (e) {
                addToast({ title: "ERRO", message: "Não foi possível remover a zona.", type: "DANGER" });
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
                <div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Zonas de Entrega</h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest leading-relaxed">Gerencie bairros e valores de frete dinâmicos</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleCSVUpload}
                        accept=".csv"
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full sm:w-auto bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 active:scale-95"
                    >
                        <Icons.Clock size={18} strokeWidth={3} />
                        Importar CSV
                    </button>
                    <button
                        onClick={() => { setEditingZone(null); setFormData({ name: '', fee: 0, active: true }); setIsModalOpen(true); }}
                        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 shrink-0"
                    >
                        <Icons.Plus size={18} strokeWidth={3} />
                        Nova Zona
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {zones.map(z => (
                    <div key={z.id} className={`bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col group hover:shadow-xl transition-all ${!z.active ? 'opacity-50 grayscale' : ''}`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl flex items-center justify-center"><Icons.MapPin size={20} /></div>
                                <div>
                                    <h4 className="font-black text-slate-800 dark:text-white uppercase text-xs tracking-tight">{z.name}</h4>
                                    <p className="text-sm font-black text-blue-600">R$ {z.fee.toFixed(2)}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => { setEditingZone(z); setFormData({ name: z.name, fee: z.fee, active: z.active }); setIsModalOpen(true); }} className="p-2.5 bg-slate-50 dark:bg-slate-800 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><Icons.Edit size={16} /></button>
                                <button onClick={() => handleDelete(z.id)} className="p-2.5 bg-slate-50 dark:bg-slate-800 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all"><Icons.Delete size={16} /></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-md border border-white/20 dark:border-slate-800 overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
                            <div>
                                <h4 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">{editingZone ? 'Editar Zona' : 'Nova Zona'}</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Defina o valor base para o bairro</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => handleSave()}
                                    className="w-10 h-10 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                                    title="Salvar"
                                >
                                    <Icons.Check size={20} strokeWidth={3} />
                                </button>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Icons.X size={20} /></button>
                            </div>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-6">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bairro / Região (Exato)</label>
                                <input 
                                    type="text" 
                                    value={formData.name} 
                                    onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })} 
                                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-black text-sm border-2 border-transparent focus:border-blue-500 transition-all uppercase text-slate-900 dark:text-white placeholder:text-slate-500/40" 
                                    placeholder="CENTRO" 
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Taxa de Entrega (R$)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm">R$</span>
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        value={formData.fee} 
                                        onChange={e => setFormData({ ...formData, fee: parseFloat(e.target.value) || 0 })} 
                                        className="w-full p-4 pl-12 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-black text-sm border-2 border-transparent focus:border-blue-500 transition-all text-slate-900 dark:text-white placeholder:text-slate-500/40" 
                                        placeholder="8.00" 
                                    />
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};


// Sub-componente para Gestão de Usuários
const UserManagementInternal: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showErrors, setShowErrors] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [formData, setFormData] = useState({ name: '', email: '', password: '', phone: '', permissions: [] as string[] });
    const { addToast } = useToast();
    const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean, title: string, message: string, type: 'SUCCESS' | 'ERROR' | 'DANGER' | 'INFO', onConfirm?: () => void }>({
        isOpen: false, title: '', message: '', type: 'SUCCESS'
    });

    const applyPhoneMask = (value: string) => {
        const v = value.replace(/\D/g, '').slice(0, 11);
        if (v.length <= 2) return v;
        if (v.length <= 3) return `(${v.slice(0, 2)}) ${v.slice(2)}`;
        if (v.length <= 7) return `(${v.slice(0, 2)}) ${v.slice(2, 3)} ${v.slice(3)}`;
        return `(${v.slice(0, 2)}) ${v.slice(2, 3)} ${v.slice(3, 7)}-${v.slice(7)}`;
    };

    const availableModules = [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'pos', label: 'PDV / Vendas' },
        { id: 'sales-monitor', label: 'Monitor de Vendas' },
        { id: 'tables', label: 'Gestão de Mesas' },
        { id: 'kitchen', label: 'Cozinha' },
        { id: 'crm', label: 'Clientes (CRM)' },
        { id: 'inventory', label: 'Estoque / Cardápio' },
        { id: 'delivery-orders', label: 'App Delivery (Pedidos)' },
        { id: 'logistics', label: 'Logística' },
        { id: 'waiter', label: 'App Garçom' },
        { id: 'driver', label: 'Entregador' },
        { id: 'receivables', label: 'Recebimentos (Crediário)' },
        { id: 'engagement', label: 'Engajamento & Promoções' },
        { id: 'reports', label: 'Relatórios' },
        { id: 'settings', label: 'Configurações' }
    ];

    const refresh = async () => setUsers(await db.getUsers());
    useEffect(() => { refresh(); }, []);

    const toTitleCase = (str: string) => {
        return str.toLowerCase().replace(/(?:^|\s)\S/g, (a) => a.toUpperCase());
    };

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        // Validação manual
        if (!formData.name.trim() || !formData.email.trim() || formData.permissions.length === 0) {
            setShowErrors(true);
            addToast({
                title: "CAMPOS OBRIGATÓRIOS",
                message: "Por favor, preencha todos os campos do formulário.",
                type: "DANGER"
            });
            return;
        }

        const userData: User = {
            id: editingUser?.id || `user-${Date.now()}`,
            ...formData,
            name: toTitleCase(formData.name),
            createdAt: editingUser?.createdAt || new Date().toISOString()
        };
        await db.saveUser(userData);
        setIsModalOpen(false);
        refresh();
        addToast({
            title: "SUCESSO",
            message: editingUser ? "Usuário atualizado com sucesso!" : "Usuário cadastrado com sucesso!",
            type: "SUCCESS"
        });
    };

    const handleToggleStatus = async (user: User) => {
        const action = user.active ? 'inativar' : 'ativar';
        setAlertConfig({
            isOpen: true,
            title: `${action.toUpperCase()} USUÁRIO`,
            message: `Tem certeza que deseja ${action} o acesso do usuário ${user.name}?`,
            type: user.active ? 'DANGER' : 'INFO',
            onConfirm: async () => {
                await db.toggleUserStatus(user.id, !user.active);
                refresh();
                setAlertConfig(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleResetUser = async (user: User) => {
        setAlertConfig({
            isOpen: true,
            title: 'RESET DE SEGURANÇA',
            message: `O código de recuperação de ${user.name} será reiniciado e será exigida uma nova senha no próximo login. Prosseguir?`,
            type: 'DANGER',
            onConfirm: async () => {
                await db.resetUser(user.id);
                refresh();
                setAlertConfig(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleDeleteUser = async (id: string) => {
        setAlertConfig({
            isOpen: true,
            title: 'EXCLUIR USUÁRIO',
            message: 'Tem certeza que deseja remover permanentemente este usuário? Isso pode causar erros se ele possuir registros vinculados (Auditoria, etc). Recomendamos INATIVAR.',
            type: 'DANGER',
            onConfirm: async () => {
                try {
                    await db.deleteUser(id);
                    refresh();
                    setAlertConfig(prev => ({ ...prev, isOpen: false }));
                } catch (e: any) {
                    setAlertConfig({
                        isOpen: true,
                        title: 'ERRO NA EXCLUSÃO',
                        message: 'Não foi possível excluir o usuário pois ele possui históricos vinculados. Use a opção INATIVAR.',
                        type: 'ERROR'
                    });
                }
            }
        });
    };

    return (
        <div className="space-y-6">
            <CustomAlert
                isOpen={alertConfig.isOpen}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                onConfirm={alertConfig.onConfirm || (() => setAlertConfig(prev => ({ ...prev, isOpen: false })))}
                onCancel={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
            />
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
                <div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Usuários do Sistema</h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest leading-relaxed">Gerencie níveis de acesso e permissões</p>
                </div>
                <button
                    onClick={() => { setEditingUser(null); setFormData({ name: '', email: '', password: '123', phone: '', permissions: ['dashboard'] }); setIsModalOpen(true); }}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 shrink-0"
                >
                    <Icons.Plus size={18} strokeWidth={3} />
                    Novo Usuário
                </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {users.map(u => (
                    <div key={u.id} className={`bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl sm:rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex flex-col group hover:shadow-xl transition-all relative overflow-hidden ${!u.active ? 'opacity-50 grayscale' : ''}`}>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl sm:rounded-2xl flex items-center justify-center font-black uppercase text-sm shadow-inner shrink-0 relative">
                                {u.name.substring(0, 2)}
                                {!u.active && <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 h-4 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></div>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="font-black text-slate-800 dark:text-white uppercase text-xs tracking-tight truncate">{u.name}</p>
                                    {!u.active && <span className="text-[7px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest shrink-0">Inativo</span>}
                                </div>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest truncate">{u.email}</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800">
                            <div className="flex flex-col min-w-0">
                                <span className="text-[8px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">Nível / Permissões</span>
                                <span className="text-[9px] font-bold text-blue-500 dark:text-blue-400 truncate tracking-tight">{u.permissions.join(' • ')}</span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleResetUser(u)}
                                    title="Resetar Senha"
                                    className="p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-800 text-amber-600 dark:text-white rounded-xl hover:bg-amber-600 dark:hover:bg-amber-500 hover:text-white transition-all outline-none"
                                >
                                    <Icons.Clock size={16} />
                                </button>
                                <button
                                    onClick={() => {
                                        setEditingUser(u);
                                        setFormData({ name: u.name, email: u.email, password: '', phone: u.phone || '', permissions: u.permissions });
                                        setIsModalOpen(true);
                                    }}
                                    title="Editar Dados"
                                    className="p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white transition-all outline-none"
                                >
                                    <Icons.Edit size={16} />
                                </button>
                                <button
                                    onClick={() => handleToggleStatus(u)}
                                    title={u.active ? 'Inativar Usuário' : 'Ativar Usuário'}
                                    className={`p-2.5 sm:p-3 rounded-xl transition-all outline-none ${u.active ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white'}`}
                                >
                                    {u.active ? <Icons.Delete size={16} /> : <Icons.User size={16} />}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] sm:rounded-[3rem] shadow-2xl w-full max-w-xl border border-white/20 dark:border-slate-800 overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-6 sm:p-8 flex justify-between items-center border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <h4 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">
                                    {editingUser ? 'Editar' : 'Novo'} Usuário
                                </h4>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Controle de acesso ao sistema</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleSave()}
                                    title="Confirmar Alterações"
                                    className="w-12 h-12 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30 transition-all active:scale-90"
                                >
                                    <Icons.Check size={24} strokeWidth={3} />
                                </button>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    title="Fechar"
                                    className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-all active:scale-90"
                                >
                                    <Icons.X size={24} strokeWidth={3} />
                                </button>
                            </div>
                        </div>
                        <form onSubmit={handleSave} className="p-6 sm:p-10 space-y-6 sm:space-y-8">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Nome Completo</label>
                                    <input type="text" placeholder="Nome" value={formData.name} onChange={e => setFormData({ ...formData, name: toTitleCase(e.target.value) })} className={`w-full p-4 sm:p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl sm:rounded-[1.5rem] outline-none font-bold text-sm text-slate-800 dark:text-white shadow-inner focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/20 transition-all border-2 ${showErrors && !formData.name.trim() ? 'border-red-500 bg-red-50/50 dark:bg-red-900/20' : 'border-transparent'}`} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">E-mail (Login)</label>
                                    <input type="email" placeholder="E-mail" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className={`w-full p-4 sm:p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl sm:rounded-[1.5rem] outline-none font-bold text-sm text-slate-800 dark:text-white shadow-inner focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/20 transition-all border-2 ${showErrors && !formData.email.trim() ? 'border-red-500 bg-red-50/50 dark:bg-red-900/20' : 'border-transparent'}`} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Celular / Whats</label>
                                    <input type="text" placeholder="(00) 0 0000-0000" value={formData.phone} onChange={e => setFormData({ ...formData, phone: applyPhoneMask(e.target.value) })} className={`w-full p-4 sm:p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl sm:rounded-[1.5rem] outline-none font-bold text-sm text-slate-800 dark:text-white shadow-inner focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/20 transition-all border-2 ${showErrors && !formData.phone.trim() ? 'border-red-500 bg-red-50/50 dark:bg-red-900/20' : 'border-transparent'}`} />
                                </div>
                            </div>

                            {!editingUser && (
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest ml-2 mb-4">A senha padrão para novos usuários é: <span className="text-blue-600 dark:text-blue-400">123</span></p>
                            )}
                            <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Módulos Permitidos:</p>
                                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar border-2 rounded-2xl p-2 transition-all ${showErrors && formData.permissions.length === 0 ? 'border-red-500 bg-red-50/50 dark:bg-red-900/10' : 'border-transparent'}`}>
                                    {availableModules.map(m => (
                                        <label key={m.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-transparent has-[:checked]:border-blue-100 dark:has-[:checked]:border-blue-900/40 has-[:checked]:bg-blue-50/50 dark:has-[:checked]:bg-blue-900/20">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded-lg border-none bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400"
                                                checked={formData.permissions.includes(m.id)}
                                                onChange={() => {
                                                    const next = formData.permissions.includes(m.id)
                                                        ? formData.permissions.filter(p => p !== m.id)
                                                        : [...formData.permissions, m.id];
                                                    setFormData({ ...formData, permissions: next });
                                                }}
                                            />
                                            <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-tight">{m.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};


// Sub-componente para Horário de Funcionamento
const OperatingHoursSettings: React.FC<{ settings: BusinessSettings, setSettings: (s: BusinessSettings) => void, onSave: (e: React.FormEvent) => void }> = ({ settings, setSettings, onSave }) => {
    let hours: any[] = [];
    try {
        hours = JSON.parse(settings.operatingHours);
    } catch { }

    const daysOfWeek = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    // Inicializar no estado ao montar ou se mudar para vazio
    useEffect(() => {
        let currentHours: any[] = [];
        try {
            currentHours = JSON.parse(settings.operatingHours);
        } catch { }

        if (!Array.isArray(currentHours) || currentHours.length === 0) {
            const defaults = daysOfWeek.map((day, ix) => ({ dayOfWeek: ix, isOpen: true, openTime: '18:00', closeTime: '23:59' }));
            setSettings({ ...settings, operatingHours: JSON.stringify(defaults) });
        }
    }, []);

    const updateHour = (ix: number, field: string, value: any) => {
        const newHours = [...hours];
        newHours[ix] = { ...newHours[ix], [field]: value };
        setSettings({ ...settings, operatingHours: JSON.stringify(newHours) });
    };

    return (
        <form onSubmit={onSave} className="bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-3xl sm:rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 max-w-4xl space-y-8 animate-in fade-in transition-colors">
            <div className="flex justify-between items-start mb-6 sm:mb-10">
                <div>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Horário de Funcionamento</h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest leading-relaxed">Defina quando sua loja recebe pedidos</p>
                </div>
            </div>

            <div className={`p-4 sm:p-6 rounded-3xl border-2 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${settings.isManuallyClosed ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50' : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50'}`}>
                <div className="flex-1">
                    <h4 className={`text-base sm:text-lg font-black uppercase tracking-tight ${settings.isManuallyClosed ? 'text-red-800 dark:text-red-400' : 'text-blue-800 dark:text-blue-400'}`}>
                        {settings.isManuallyClosed ? 'Loja Fechada Manualmente' : 'Controle Manual: Loja Aberta'}
                    </h4>
                    <p className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-widest ${settings.isManuallyClosed ? 'text-red-500 dark:text-red-500/80' : 'text-blue-500 dark:text-blue-500/80'}`}>
                        {settings.isManuallyClosed ? 'Nenhum pedido digital será aceito até que você reabra.' : 'Seguindo a programação normal de dias e horários.'}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setSettings({ ...settings, isManuallyClosed: !settings.isManuallyClosed })}
                    className={`w-full sm:w-auto px-6 sm:px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-xl ${settings.isManuallyClosed ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-200 dark:shadow-red-900/40' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200 dark:shadow-blue-900/40'}`}
                >
                    {settings.isManuallyClosed ? 'Reabrir Loja Agora' : 'Fechar Loja Temporariamente'}
                </button>
            </div>

            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Programação Semanal</h4>
                {hours.map((config, ix) => (
                    <div key={ix} className="flex flex-col sm:flex-row sm:items-center gap-4 bg-slate-50 dark:bg-slate-800 p-4 rounded-3xl sm:rounded-2xl border border-slate-100 dark:border-slate-700">
                        <div className="w-full sm:w-32 flex items-center justify-between sm:justify-start gap-3">
                            <div className="flex items-center gap-3">
                                <input type="checkbox" checked={config.isOpen} onChange={e => updateHour(ix, 'isOpen', e.target.checked)} className="w-5 h-5 rounded-md text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-700 border-none" />
                                <span className={`font-black uppercase text-sm ${config.isOpen ? 'text-slate-800 dark:text-white' : 'text-slate-400 dark:text-slate-600 line-through'}`}>{daysOfWeek[config.dayOfWeek]}</span>
                            </div>
                            {!config.isOpen && <span className="sm:hidden text-[9px] font-black bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-1 rounded-full uppercase tracking-widest">Fechado</span>}
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 flex-1">
                            {config.isOpen ? (
                                <div className="grid grid-cols-2 sm:flex sm:items-center gap-4 w-full">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                        <span className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Abre:</span>
                                        <input type="time" value={config.openTime} onChange={e => updateHour(ix, 'openTime', e.target.value)} className="w-full sm:w-auto p-3 bg-white dark:bg-slate-900 border-none rounded-xl font-bold text-sm shadow-sm text-slate-800 dark:text-white" />
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                        <span className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Fecha:</span>
                                        <input type="time" value={config.closeTime} onChange={e => updateHour(ix, 'closeTime', e.target.value)} className="w-full sm:w-auto p-3 bg-white dark:bg-slate-900 border-none rounded-xl font-bold text-sm shadow-sm text-slate-800 dark:text-white" />
                                    </div>
                                </div>
                            ) : (
                                <span className="hidden sm:inline text-xs font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">Fechado o dia todo</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <button type="submit" className="w-full md:w-auto bg-blue-600 text-white px-12 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all shadow-2xl shadow-blue-100">Salvar Horários</button>
        </form>
    );
};

interface SettingsProps {
    settings: BusinessSettings;
    setSettings: (s: BusinessSettings) => void;
    onReset: () => void;
    onGoToSalesMonitor: () => void;
}

const Settings: React.FC<SettingsProps> = ({ settings, setSettings, onReset }) => {
    const [activeSubTab, setActiveSubTab] = useState<'EMPRESA' | 'HORARIOS' | 'PAGAMENTOS' | 'FISCAL' | 'GARCONS' | 'FROTAS' | 'ZONAS' | 'USUARIOS' | 'QR_CODES' | 'AUDITORIA' | 'AVANCADO' | 'APARENCIA'>('EMPRESA');
    const { addToast } = useToast();
    const [storeStatus, setStoreStatus] = useState<{ status: string, is_manually_closed: boolean } | null>(null);
    const { theme, setTheme } = useTheme();

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const s = await db.getStoreOperationalStatus();
                setStoreStatus(s);
            } catch (e) {
                console.error("Error fetching store status in Settings:", e);
            }
        };
        fetchStatus();
        const interval = setInterval(fetchStatus, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        await db.saveSettings(settings);
        addToast({
            title: "SUCESSO",
            message: "As configurações do estabelecimento foram atualizadas com sucesso.",
            type: "SUCCESS"
        });
    };

    const handleBackup = () => {
        const apiUrl = (import.meta as any).env.VITE_API_URL || '';
        const baseUrl = apiUrl.replace('/api', '');
        window.open(`${baseUrl}/api/backup/generate`, '_blank');
    };

    const menuItems = [
        { id: 'EMPRESA', label: 'Empresa', icon: Icons.Dashboard },
        { id: 'HORARIOS', label: 'Horários', icon: Icons.Clock },
        { id: 'PAGAMENTOS', label: 'Pagamentos', icon: Icons.DollarSign },
        { id: 'FISCAL', label: 'Fiscal (NFC-e)', icon: Icons.View },
        { id: 'GARCONS', label: 'Garçons', icon: Icons.User },
        { id: 'FROTAS', label: 'Entregadores', icon: Icons.Logistics },
        { id: 'ZONAS', label: 'Zonas de Entrega', icon: Icons.MapPin },
        { id: 'USUARIOS', label: 'Usuários', icon: Icons.Lock },
        { id: 'QR_CODES', label: 'QR Codes', icon: Icons.QrCode },
        { id: 'AUDITORIA', label: 'Auditoria', icon: Icons.View },
        { id: 'AVANCADO', label: 'Avançado', icon: Icons.Settings },
        { id: 'APARENCIA', label: 'Aparência', icon: Icons.Sun },
    ];

    return (
        <div className="flex flex-col h-full gap-4 sm:gap-8 animate-in fade-in duration-500 overflow-hidden">

            <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800 shrink-0 overflow-x-auto pb-0.5 custom-scrollbar">
                {menuItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setActiveSubTab(item.id as any)}
                        className={`pb-4 px-4 font-black uppercase text-[10px] tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${activeSubTab === item.id ? 'border-b-4 border-blue-600 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <item.icon className="w-4 h-4" />
                        {item.label}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto pr-2 sm:pr-4 custom-scrollbar">
                {activeSubTab === 'EMPRESA' && (
                    <div className="bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-3xl sm:rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 max-w-4xl transition-colors duration-300">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-10 gap-6">
                            <div>
                                <h3 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Identidade do Negócio</h3>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest leading-relaxed">Aparecerá nos cupons e relatórios do sistema</p>
                            </div>
                            {storeStatus && (
                                <div className={`flex items-center gap-3 px-4 sm:px-6 py-3 rounded-2xl border transition-all ${storeStatus.status === 'online' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800'}`}>
                                    <div className={`w-2 h-2 rounded-full ${storeStatus.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${storeStatus.status === 'online' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                        Loja {storeStatus.status === 'online' ? 'Online' : 'Offline'}
                                    </span>
                                </div>
                            )}
                        </div>
                        <form onSubmit={handleSaveSettings} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Nome Fantasia</label>
                                    <input type="text" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 dark:focus:ring-blue-900/20 transition-all font-bold text-sm text-slate-800 dark:text-white" value={settings.name} onChange={e => setSettings({ ...settings, name: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">CNPJ / CPF</label>
                                    <input type="text" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 dark:focus:ring-blue-900/20 transition-all font-bold text-sm text-slate-800 dark:text-white" value={settings.cnpj} onChange={e => setSettings({ ...settings, cnpj: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Quantidade de Mesas</h4>
                                    <input type="number" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 dark:focus:ring-blue-900/20 transition-all font-bold text-sm text-slate-800 dark:text-white" value={settings.tableCount} onChange={e => setSettings({ ...settings, tableCount: parseInt(e.target.value) || 0 })} />
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Tempo de Rejeição Automática (Minutos)</h4>
                                    <input type="number" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 dark:focus:ring-blue-900/20 transition-all font-bold text-sm text-slate-800 dark:text-white" value={settings.orderTimeoutMinutes} onChange={e => setSettings({ ...settings, orderTimeoutMinutes: parseInt(e.target.value) || 0 })} />
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Troco Máximo (R$)</h4>
                                    <input type="number" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 dark:focus:ring-blue-900/20 transition-all font-bold text-sm text-slate-800 dark:text-white" value={settings.maxChange || 191} onChange={e => setSettings({ ...settings, maxChange: parseFloat(e.target.value) || 0 })} />
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest ml-1">Horário de Auto Fechamento (Cash)</h4>
                                    <input type="time" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 dark:focus:ring-blue-900/20 transition-all font-bold text-sm text-slate-800 dark:text-white" value={settings.autoCloseTime || '00:00'} onChange={e => setSettings({ ...settings, autoCloseTime: e.target.value })} />
                                </div>
                                <div className="space-y-2 col-span-1 md:col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">URL Base do Cardápio (QR Code)</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: https://meucardapio.com"
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 dark:focus:ring-blue-900/20 transition-all font-bold text-sm text-slate-800 dark:text-white"
                                        value={settings.qrCodeBaseUrl || ''}
                                        onChange={e => setSettings({ ...settings, qrCodeBaseUrl: e.target.value })}
                                    />
                                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest ml-1">Esta URL será usada como base para todos os QR Codes gerados nas mesas.</p>
                                </div>
                                <div className="space-y-2 col-span-1 md:col-span-2 p-4 sm:p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl sm:rounded-2xl border border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-6 sm:gap-4">
                                    <div className="flex-1">
                                        <h4 className="text-[12px] font-black text-slate-800 dark:text-white uppercase tracking-widest">Cobrar Taxa de Serviço Opcional</h4>
                                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase leading-relaxed">Aplica % de comissão na venda pelo PDV de Mesas e Menu Digital</p>
                                    </div>
                                    <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-700">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">%</span>
                                            <input
                                                type="number"
                                                className={`w-20 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-blue-50 dark:focus:ring-blue-900/20 transition-all font-black text-sm text-center text-slate-800 dark:text-white ${!settings.serviceFeeStatus && 'opacity-50 cursor-not-allowed'}`}
                                                value={settings.serviceFeePercentage !== undefined ? settings.serviceFeePercentage : 10}
                                                disabled={!settings.serviceFeeStatus}
                                                onChange={e => setSettings({ ...settings, serviceFeePercentage: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            className={`w-14 h-8 rounded-full transition-all relative shrink-0 ${settings.serviceFeeStatus !== false ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                                            onClick={() => setSettings({ ...settings, serviceFeeStatus: settings.serviceFeeStatus === false ? true : false })}
                                        >
                                            <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${settings.serviceFeeStatus !== false ? 'left-7' : 'left-1'}`}></div>
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2 col-span-1 md:col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Endereço Completo</label>
                                    <input type="text" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 dark:focus:ring-blue-900/20 transition-all font-bold text-sm text-slate-800 dark:text-white" value={settings.address} onChange={e => setSettings({ ...settings, address: e.target.value })} />
                                </div>
                            </div>

                            <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tighter">Configurações Padrão para Pizzas</h4>
                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest leading-relaxed">Defina regras de preço e impressão fiscal para pizzas</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Cálculo de Preço (Mais de um Sabor)</label>
                                        <select className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 dark:focus:ring-blue-900/20 transition-all font-bold text-sm text-slate-800 dark:text-white" value={settings.pizzaPriceRule || 'HIGHEST'} onChange={e => setSettings({ ...settings, pizzaPriceRule: e.target.value as any })}>
                                            <option value="HIGHEST">Cobrar pelo Sabor de Maior Valor</option>
                                            <option value="AVERAGE">Média Ponderada (Proporção Exata)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Regra de Emissão NFC-e</label>
                                        <select className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 dark:focus:ring-blue-900/20 transition-all font-bold text-sm text-slate-800 dark:text-white" value={settings.pizzaNfeRule || 'OBSERVATION'} onChange={e => setSettings({ ...settings, pizzaNfeRule: e.target.value as any })}>
                                            <option value="OBSERVATION">Item Único + Sabores na Observação</option>
                                            <option value="FRACTIONED">Itens Fracionados Multiplicados (Kits)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tighter">Módulos e Aplicativos Adicionais</h4>
                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Habilite ou desabilite os aplicativos para sua loja</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                                    <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl sm:rounded-2xl border border-slate-100 dark:border-slate-700 flex flex-col justify-between gap-4 transition-all hover:border-blue-100 dark:hover:border-blue-900/30">
                                        <div>
                                            <h4 className="text-[12px] font-black text-slate-800 uppercase tracking-widest">App Delivery</h4>
                                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Clientes fazem pedidos via app próprio (pedidos online).</p>
                                        </div>
                                        <div className="flex justify-end">
                                            <button
                                                type="button"
                                                className={`w-14 h-8 rounded-full transition-all relative ${settings.enableDeliveryApp !== false ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                                                onClick={() => setSettings({ ...settings, enableDeliveryApp: settings.enableDeliveryApp === false ? true : false })}
                                            >
                                                <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${settings.enableDeliveryApp !== false ? 'left-7' : 'left-1'}`}></div>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl sm:rounded-2xl border border-slate-100 dark:border-slate-700 flex flex-col justify-between gap-4 transition-all hover:border-blue-100 dark:hover:border-blue-900/30">
                                        <div>
                                            <h4 className="text-[12px] font-black text-slate-800 uppercase tracking-widest">Menu Digital</h4>
                                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Cardápio via QR Code para clientes nas mesas.</p>
                                        </div>
                                        <div className="flex justify-end">
                                            <button
                                                type="button"
                                                className={`w-14 h-8 rounded-full transition-all relative ${settings.enableDigitalMenu !== false ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                                                onClick={() => setSettings({ ...settings, enableDigitalMenu: settings.enableDigitalMenu === false ? true : false })}
                                            >
                                                <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${settings.enableDigitalMenu !== false ? 'left-7' : 'left-1'}`}></div>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl sm:rounded-2xl border border-slate-100 dark:border-slate-700 flex flex-col justify-between gap-4 transition-all hover:border-blue-100 dark:hover:border-blue-900/30">
                                        <div>
                                            <h4 className="text-[12px] font-black text-slate-800 uppercase tracking-widest">App Garçom</h4>
                                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Acesso ao sistema para garçons lançarem pedidos.</p>
                                        </div>
                                        <div className="flex justify-end">
                                            <button
                                                type="button"
                                                className={`w-14 h-8 rounded-full transition-all relative ${settings.enableWaiterApp !== false ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                                                onClick={() => setSettings({ ...settings, enableWaiterApp: settings.enableWaiterApp === false ? true : false })}
                                            >
                                                <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${settings.enableWaiterApp !== false ? 'left-7' : 'left-1'}`}></div>
                                            </button>
                                        </div>
                                    </div>


                                    <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl sm:rounded-2xl border border-slate-100 dark:border-slate-700 flex flex-col justify-between gap-4 transition-all hover:border-blue-100 dark:hover:border-blue-900/30">
                                        <div>
                                            <h4 className="text-[12px] font-black text-slate-800 uppercase tracking-widest">App Entregador</h4>
                                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Acesso ao aplicativo para motoboys e entregas.</p>
                                        </div>
                                        <div className="flex justify-end">
                                            <button
                                                type="button"
                                                className={`w-14 h-8 rounded-full transition-all relative shrink-0 ${settings.enableDriverApp !== false ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                                                onClick={() => setSettings({ ...settings, enableDriverApp: settings.enableDriverApp === false ? true : false })}
                                            >
                                                <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${settings.enableDriverApp !== false ? 'left-7' : 'left-1'}`}></div>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tighter">Regras & Segurança do App Garçom</h4>
                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest leading-relaxed">Configure o comportamento e privacidade do atendimento</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                    <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl sm:rounded-2xl border border-slate-100 dark:border-slate-700 flex flex-col justify-between gap-4">
                                        <div>
                                            <h4 className="text-[12px] font-black text-slate-800 dark:text-white uppercase tracking-widest">Travar Mesa por Garçom</h4>
                                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase leading-relaxed">Apenas o garçom que iniciou o atendimento pode alterar a mesa.</p>
                                        </div>
                                        <div className="flex justify-end">
                                            <button
                                                type="button"
                                                className={`w-14 h-8 rounded-full transition-all relative shrink-0 ${settings.waiterLockEnabled !== false ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                                                onClick={() => setSettings({ ...settings, waiterLockEnabled: settings.waiterLockEnabled === false ? true : false })}
                                            >
                                                <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${settings.waiterLockEnabled !== false ? 'left-7' : 'left-1'}`}></div>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl sm:rounded-2xl border border-slate-100 dark:border-slate-700 space-y-6">
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                            <div>
                                                <h4 className="text-[12px] font-black text-slate-800 dark:text-white uppercase tracking-widest">Ativar Tela de Privacidade</h4>
                                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase leading-relaxed">Bloqueia o App Garçom após período de inatividade.</p>
                                            </div>
                                            <button
                                                type="button"
                                                className={`w-14 h-8 rounded-full transition-all relative shrink-0 ${settings.waiterPrivacyEnabled ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                                                onClick={() => setSettings({ ...settings, waiterPrivacyEnabled: !settings.waiterPrivacyEnabled })}
                                            >
                                                <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${settings.waiterPrivacyEnabled ? 'left-7' : 'left-1'}`}></div>
                                            </button>
                                        </div>

                                        <div className={`transition-all duration-300 ${settings.waiterPrivacyEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tempo de Inatividade (Segundos)</label>
                                            <input
                                                type="number"
                                                className="w-full mt-2 p-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-50 transition-all font-bold text-sm"
                                                value={settings.waiterPrivacyTimer}
                                                onChange={e => setSettings({ ...settings, waiterPrivacyTimer: parseInt(e.target.value) || 60 })}
                                                disabled={!settings.waiterPrivacyEnabled}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                                    <div>
                                        <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tighter">Geolocalização & Bloqueio (Geofencing)</h4>
                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest leading-relaxed">Restrinja pedidos do Cardápio Digital para clientes não presentes no local</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (navigator.geolocation) {
                                                navigator.geolocation.getCurrentPosition(
                                                    (position) => {
                                                        setSettings({
                                                            ...settings,
                                                            restaurantLat: position.coords.latitude,
                                                            restaurantLng: position.coords.longitude
                                                        });
                                                    },
                                                    (error) => {
                                                        addToast({
                                                            title: "ERRO",
                                                            message: "Erro ao obter localização: " + error.message,
                                                            type: "DANGER"
                                                        });
                                                    }
                                                );
                                            } else {
                                                addToast({
                                                    title: "AVISO",
                                                    message: "Geolocalização não suportada pelo seu navegador.",
                                                    type: "INFO"
                                                });
                                            }
                                        }}
                                        className="w-full sm:w-auto bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                    >
                                        📍 Localização Atual
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Latitude</label>
                                        <input type="number" step="any" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 dark:focus:ring-blue-900/20 transition-all font-bold text-sm text-slate-800 dark:text-white" value={settings.restaurantLat || ''} onChange={e => setSettings({ ...settings, restaurantLat: parseFloat(e.target.value) || undefined })} placeholder="-23.5505" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Longitude</label>
                                        <input type="number" step="any" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 dark:focus:ring-blue-900/20 transition-all font-bold text-sm text-slate-800 dark:text-white" value={settings.restaurantLng || ''} onChange={e => setSettings({ ...settings, restaurantLng: parseFloat(e.target.value) || undefined })} placeholder="-46.6333" />
                                    </div>
                                    <div className="space-y-2 sm:col-span-2 md:col-span-1">
                                        <div className="flex justify-between items-center ml-1">
                                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Raio Permitido (Metros)</label>
                                            <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">(0 = Desativar)</span>
                                        </div>
                                        <input type="number" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 dark:focus:ring-blue-900/20 transition-all font-bold text-sm text-slate-800 dark:text-white" value={settings.geofenceRadius || 0} onChange={e => setSettings({ ...settings, geofenceRadius: parseInt(e.target.value) || 0 })} placeholder="Recomendado: 150" />
                                        <p className="text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest ml-1 opacity-60">Sugestão: 150m cobre a maioria das oscilações de GPS interno.</p>
                                    </div>
                                </div>
                            </div>

                            <button type="submit" className="w-full md:w-auto bg-blue-600 text-white px-12 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all shadow-2xl shadow-blue-100">Salvar Dados da Empresa</button>
                        </form>
                    </div>
                )}

                {activeSubTab === 'HORARIOS' && <OperatingHoursSettings settings={settings} setSettings={setSettings} onSave={handleSaveSettings} />}

                {activeSubTab === 'PAGAMENTOS' && (
                    <div className="bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-3xl sm:rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 max-w-4xl animate-in fade-in transition-colors">
                        <div className="mb-6 sm:mb-10">
                            <h3 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Formas de Pagamento</h3>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest leading-relaxed">Gerencie quais formas de pagamento estarão disponíveis no PDV e no Delivery</p>
                        </div>
                        <form onSubmit={handleSaveSettings} className="space-y-8">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {[
                                    { id: 'CASH', label: 'Dinheiro', icon: Icons.DollarSign },
                                    { id: 'DEBIT', label: 'Cartão de Débito', icon: Icons.CreditCard },
                                    { id: 'CREDIT', label: 'Cartão de Crédito', icon: Icons.CreditCard },
                                    { id: 'PIX', label: 'PIX', icon: Icons.Zap },
                                    { id: 'MEAL_VOUCHER', label: 'Vale Refeição', icon: Icons.Coffee },
                                    { id: 'FOOD_VOUCHER', label: 'Vale Alimentação', icon: Icons.ShoppingCart },
                                    { id: 'CREDIARIO', label: 'Crediário', icon: Icons.BadgeDollarSign },
                                ].map((method) => (
                                    <div key={method.id} className="p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white dark:bg-slate-900 rounded-xl text-blue-600 dark:text-blue-400">
                                                <method.icon size={18} />
                                            </div>
                                            <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">{method.label}</span>
                                        </div>
                                        <button
                                            type="button"
                                            className={`w-12 h-6 rounded-full transition-all relative ${settings.paymentMethods?.[method.id as keyof typeof settings.paymentMethods] !== false ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                                            onClick={() => {
                                                const currentMethods = settings.paymentMethods || {
                                                    CASH: true, DEBIT: true, CREDIT: true, MEAL_VOUCHER: true, FOOD_VOUCHER: true, PIX: true, CREDIARIO: true
                                                };
                                                setSettings({
                                                    ...settings,
                                                    paymentMethods: {
                                                        ...currentMethods,
                                                        [method.id]: !currentMethods[method.id as keyof typeof currentMethods]
                                                    }
                                                });
                                            }}
                                        >
                                            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${settings.paymentMethods?.[method.id as keyof typeof settings.paymentMethods] !== false ? 'left-6.5' : 'left-0.5'}`}></div>
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-8 border-t border-slate-100 dark:border-slate-800 space-y-4">
                                <div className="flex items-center gap-3">
                                    <Icons.Zap size={20} className="text-blue-600 dark:text-blue-400" />
                                    <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tighter">Configuração de Recebimento PIX</h4>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Sua Chave PIX (E-mail, CPF, CNPJ ou Aleatória)</label>
                                    <input 
                                        type="text" 
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 dark:focus:ring-blue-900/20 transition-all font-bold text-sm text-slate-800 dark:text-white" 
                                        value={settings.pixKey || ''} 
                                        onChange={e => setSettings({ ...settings, pixKey: e.target.value })} 
                                        placeholder="Digite sua chave PIX aqui..."
                                    />
                                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest ml-1">Esta chave será exibida para o cliente no App Delivery ao selecionar PIX.</p>
                                </div>
                            </div>

                            <button type="submit" className="w-full md:w-auto bg-blue-600 text-white px-12 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 active:scale-95 transition-all shadow-2xl shadow-blue-100 dark:shadow-none">Salvar Configurações de Pagamento</button>
                        </form>
                    </div>
                )}

                {activeSubTab === 'FISCAL' && (
                    <div className="bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-3xl sm:rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 max-w-4xl animate-in fade-in transition-colors">
                        <div className="mb-6 sm:mb-10">
                            <h3 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Configurações Fiscais</h3>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest leading-relaxed">Credenciais para emissão de NFC-e (Nota Fiscal de Consumidor Eletrônica)</p>
                        </div>
                        <form onSubmit={handleSaveSettings} className="space-y-8">
                            <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                                <div>
                                    <h4 className="text-[12px] font-black text-slate-800 dark:text-white uppercase tracking-widest">Habilitar Opção de NFC-e no PDV</h4>
                                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase">Quando desativado, o sistema emitirá apenas o cupom simples padrão.</p>
                                </div>
                                <button
                                    type="button"
                                    className={`w-14 h-8 rounded-full transition-all relative ${settings.enableNfcEmission ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                                    onClick={() => setSettings({ ...settings, enableNfcEmission: !settings.enableNfcEmission })}
                                >
                                    <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${settings.enableNfcEmission ? 'left-7' : 'left-1'}`}></div>
                                </button>
                            </div>

                            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-8 ${!settings.enableNfcEmission ? 'opacity-40 pointer-events-none' : ''}`}>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Inscrição Estadual (IE)</label>
                                    <input type="text" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 dark:focus:ring-blue-900/20 transition-all font-bold text-sm text-slate-800 dark:text-white" value={settings.ie || ''} onChange={e => setSettings({ ...settings, ie: e.target.value })} placeholder="Isento ou Número da IE" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Ambiente de Emissão</label>
                                    <select className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 dark:focus:ring-blue-900/20 transition-all font-bold text-sm text-slate-800 dark:text-white" value={settings.isNfeProduction ? 'true' : 'false'} onChange={e => setSettings({ ...settings, isNfeProduction: e.target.value === 'true' })}>
                                        <option value="false">Homologação (Testes)</option>
                                        <option value="true">Produção (Valor Fiscal)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">ID do Código de Segurança (CSC ID)</label>
                                    <input type="text" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 dark:focus:ring-blue-900/20 transition-all font-bold text-sm text-slate-800 dark:text-white" value={settings.cscId || ''} onChange={e => setSettings({ ...settings, cscId: e.target.value })} placeholder="000001" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Token CSC</label>
                                    <input type="text" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 dark:focus:ring-blue-900/20 transition-all font-bold text-sm text-slate-800 dark:text-white" value={settings.cscToken || ''} onChange={e => setSettings({ ...settings, cscToken: e.target.value })} placeholder="ABC-123-..." />
                                </div>
                            </div>
                            <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-3xl border border-blue-100 dark:border-blue-800 flex items-start gap-4">
                                <div className="mt-1 text-blue-600 dark:text-blue-400"><Icons.View className="w-5 h-5" /></div>
                                <div>
                                    <p className="text-[10px] font-black text-blue-800 dark:text-blue-300 uppercase tracking-widest mb-1">Aviso Importante</p>
                                    <p className="text-[11px] text-blue-700 dark:text-blue-400 font-bold leading-relaxed">Para emitir NFC-e, sua empresa deve estar credenciada na SEFAZ do seu estado e possuir um Certificado Digital (A1) instalado no servidor de mensageria.</p>
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={!settings.enableNfcEmission}
                                className={`w-full md:w-auto px-12 py-5 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-2xl ${!settings.enableNfcEmission ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-600 cursor-not-allowed shadow-none grayscale opacity-60' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100 dark:shadow-blue-900/20'}`}
                            >
                                Salvar Dados Fiscais
                            </button>
                        </form>
                    </div>
                )}

                {activeSubTab === 'GARCONS' && <WaiterManagement />}
                {activeSubTab === 'FROTAS' && <EntregadoresManagement />}
                {activeSubTab === 'ZONAS' && <DeliveryZoneManagement />}
                {activeSubTab === 'USUARIOS' && <UserManagementInternal />}
                {activeSubTab === 'QR_CODES' && <QRCodes />}
                {activeSubTab === 'AUDITORIA' && <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 transition-colors"><AuditLogs /></div>}

                {activeSubTab === 'APARENCIA' && (
                    <div className="bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-3xl sm:rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 max-w-4xl transition-colors duration-300">
                        <div className="mb-6 sm:mb-10">
                            <h3 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Aparência do Sistema</h3>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest leading-relaxed">Personalize como o sistema é exibido neste dispositivo</p>
                        </div>

                        <div className="space-y-6">
                            {/* Toggle Modo Escuro */}
                            <div className="p-5 sm:p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl sm:rounded-2xl border border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 sm:gap-4">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 ${theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'}`}>
                                        <Icons.Moon size={20} className="sm:w-6 sm:h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-[12px] font-black text-slate-800 dark:text-white uppercase tracking-widest">Modo Escuro</h4>
                                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase leading-relaxed">Ativa tons escuros para reduzir o cansaço visual.</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    disabled={theme === 'system'}
                                    className={`w-14 h-8 rounded-full transition-all relative shrink-0 ${theme === 'dark' ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'} ${theme === 'system' ? 'opacity-30 cursor-not-allowed' : ''}`}
                                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                >
                                    <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${theme === 'dark' ? 'left-7' : 'left-1'}`}></div>
                                </button>
                            </div>

                            {/* Toggle Sincronizar com Sistema */}
                            <div className="p-5 sm:p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl sm:rounded-2xl border border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 sm:gap-4">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 ${theme === 'system' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'}`}>
                                        <Icons.Dashboard size={20} className="sm:w-6 sm:h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-[12px] font-black text-slate-800 dark:text-white uppercase tracking-widest">Acompanhar Sistema</h4>
                                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase leading-relaxed">Segue automaticamente o tema definido no seu dispositivo.</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className={`w-14 h-8 rounded-full transition-all relative shrink-0 ${theme === 'system' ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                                    onClick={() => setTheme(theme === 'system' ? 'light' : 'system')}
                                >
                                    <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${theme === 'system' ? 'left-7' : 'left-1'}`}></div>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeSubTab === 'AVANCADO' && (
                    <div className="max-w-4xl space-y-8 animate-in fade-in transition-colors">
                        <div className="bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-3xl sm:rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800">
                            <h3 className="text-xl sm:text-2xl font-black mb-2 text-blue-600 dark:text-blue-400 uppercase tracking-tighter">Manutenção e Backup</h3>
                            <p className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mb-6 sm:mb-10">Gerencie a segurança dos seus dados</p>

                            <div className="p-5 sm:p-8 bg-blue-50 dark:bg-blue-900/20 rounded-3xl border border-blue-100 dark:border-blue-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                                <div className="flex-1">
                                    <p className="text-sm font-black text-blue-900 dark:text-blue-200 uppercase tracking-tight">Cópia de Segurança (Backup)</p>
                                    <p className="text-[9px] sm:text-[10px] text-blue-700/60 dark:text-blue-400/60 font-bold mt-1 uppercase leading-relaxed">Baixe um arquivo contendo todos os dados do sistema.</p>
                                </div>
                                <button
                                    onClick={handleBackup}
                                    className="w-full sm:w-auto bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 dark:shadow-none flex items-center justify-center gap-3"
                                >
                                    <Icons.Download className="w-4 h-4 shrink-0" />
                                    Baixar Backup (.sql)
                                </button>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-5 sm:p-10 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800">
                            <h3 className="text-xl sm:text-2xl font-black mb-2 text-red-600 dark:text-red-500 uppercase tracking-tighter">Zona de Risco Crítico</h3>
                            <p className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mb-6 sm:mb-10">Estas ações são irreversíveis e apagam dados permanentemente</p>

                            <div className="p-5 sm:p-8 bg-red-50 dark:bg-red-900/20 rounded-3xl border border-red-100 dark:border-red-900/40">
                                <p className="text-sm font-bold text-red-900 dark:text-red-300 mb-6 uppercase tracking-tight">Reinicialização Total do Sistema:</p>
                                <p className="text-xs text-red-700/60 dark:text-red-400/60 font-medium mb-8 leading-relaxed">A reinicialização apagará permanentemente todos os pedidos, clientes, estoque e configurações customizadas. O sistema retornará ao estado de instalação inicial.</p>
                                <button
                                    onClick={onReset}
                                    className="w-full sm:w-auto bg-red-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-red-200 dark:shadow-red-900/40 flex items-center justify-center gap-3"
                                >
                                    <Icons.Delete />
                                    Reiniciar Sistema (Reset de Fábrica)
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Settings;
