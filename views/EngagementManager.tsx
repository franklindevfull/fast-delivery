import React, { useState, useEffect } from 'react';
import { Coupon, Campaign, User, BusinessSettings } from '../types';
import { db } from '../services/db';
import { useToast } from '../hooks/useToast';
import CustomAlert from '../components/CustomAlert';
import { Plus, Ticket, Megaphone, Trash2, Send, Check, X, Calendar, Info, Percent, DollarSign, Edit, Upload } from 'lucide-react';

interface EngagementManagerProps {
  currentUser: User;
  settings: BusinessSettings | Partial<BusinessSettings>;
  setSettings: (s: any) => void;
}

const EngagementManager: React.FC<EngagementManagerProps> = ({ currentUser, settings, setSettings }) => {
  const [activeTab, setActiveTab] = useState<'coupons' | 'campaigns' | 'profile'>('coupons');
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Partial<Coupon> | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<Partial<Campaign> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addToast } = useToast();
  const logoFileInputRef = React.useRef<HTMLInputElement>(null);
  const bannerFileInputRef = React.useRef<HTMLInputElement>(null);
  const bannerFileInputRef2 = React.useRef<HTMLInputElement>(null);
  const bannerFileInputRef3 = React.useRef<HTMLInputElement>(null);
  const campaignImageFileInputRef = React.useRef<HTMLInputElement>(null);

  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'INFO' | 'DANGER' | 'SUCCESS';
    onConfirm: () => void;
    onCancel?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'INFO',
    onConfirm: () => { },
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      if (activeTab === 'coupons') {
        const data = await db.getCoupons();
        setCoupons(data);
      } else if (activeTab === 'profile') {
        const data = await db.getSettings();
        setSettings(data);
      } else {
        const data = await db.getCampaigns();
        setCampaigns(data);
      }
    } catch (error) {
      addToast({ title: 'Erro', message: 'Falha ao carregar dados.', type: 'DANGER' });
    }
  };

  const showAlert = (title: string, message: string, type: 'INFO' | 'DANGER' | 'SUCCESS' = 'INFO', onConfirm = () => setAlertConfig(prev => ({ ...prev, isOpen: false })), onCancel?: () => void) => {
    setAlertConfig({ isOpen: true, title, message, type, onConfirm, onCancel });
  };

  const handleDeleteCoupon = async (id: string) => {
    showAlert('Confirmar Exclusão', 'Deseja excluir este cupom?', 'DANGER', async () => {
      setAlertConfig(prev => ({ ...prev, isOpen: false }));
      try {
        await db.deleteCoupon(id);
        addToast({ title: 'Sucesso', message: 'Cupom removido.', type: 'SUCCESS' });
        loadData();
      } catch (error: any) {
        addToast({ title: 'Erro', message: error.message, type: 'DANGER' });
      }
    }, () => setAlertConfig(prev => ({ ...prev, isOpen: false })));
  };

  const handleDeleteCampaign = async (id: string) => {
    showAlert('Confirmar Exclusão', 'Deseja excluir esta campanha?', 'DANGER', async () => {
      setAlertConfig(prev => ({ ...prev, isOpen: false }));
      try {
        await db.deleteCampaign(id);
        addToast({ title: 'Sucesso', message: 'Campanha removida.', type: 'SUCCESS' });
        loadData();
      } catch (error: any) {
        addToast({ title: 'Erro', message: error.message, type: 'DANGER' });
      }
    }, () => setAlertConfig(prev => ({ ...prev, isOpen: false })));
  };

  const handleSendCampaign = async (id: string) => {
    showAlert('Enviar Campanha', 'Deseja disparar esta campanha agora para todos os clientes?', 'INFO', async () => {
      setAlertConfig(prev => ({ ...prev, isOpen: false }));
      try {
        await db.sendCampaign(id);
        addToast({ title: 'Sucesso', message: 'Campanha enviada com sucesso.', type: 'SUCCESS' });
        loadData();
      } catch (error: any) {
        addToast({ title: 'Erro', message: error.message, type: 'DANGER' });
      }
    }, () => setAlertConfig(prev => ({ ...prev, isOpen: false })));
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await db.saveCoupon(editingCoupon as Coupon);
      addToast({ title: 'Sucesso', message: 'Cupom salvo com sucesso.', type: 'SUCCESS' });
      setIsModalOpen(false);
      loadData();
    } catch (error: any) {
      addToast({ title: 'Erro', message: error.message, type: 'DANGER' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await db.saveCampaign(editingCampaign as Campaign);
      addToast({ title: 'Sucesso', message: 'Campanha salva com sucesso.', type: 'SUCCESS' });
      setIsModalOpen(false);
      loadData();
    } catch (error: any) {
      addToast({ title: 'Erro', message: error.message, type: 'DANGER' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await db.saveSettings(settings);
      addToast({ title: 'Sucesso', message: 'Configurações do perfil salvas.', type: 'SUCCESS' });
      // Parent state is already updated via setSettings during UI interaction
    } catch (error: any) {
      addToast({ title: 'Erro', message: error.message, type: 'DANGER' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSettings((prev: any) => ({ ...prev, campaignLogoUrl: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSettings((prev: any) => ({ ...prev, appBannerUrl: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleBannerUpload2 = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSettings((prev: any) => ({ ...prev, appBannerUrl2: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleBannerUpload3 = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSettings((prev: any) => ({ ...prev, appBannerUrl3: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleCampaignImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setEditingCampaign((prev: any) => ({ ...prev, imageUrl: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };


  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col h-full overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-slate-100 dark:border-slate-800 p-2 gap-2">
        <button
          onClick={() => setActiveTab('coupons')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'coupons' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/20' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
        >
          <Ticket className="w-4 h-4" />
          Promoções & Cupons
        </button>
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'campaigns' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/20' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
        >
          <Megaphone className="w-4 h-4" />
          Campanhas
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all ${activeTab === 'profile' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/20' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
        >
          <Info className="w-4 h-4" />
          Perfil da Loja (App)
        </button>
      </div>

      {/* Header Actions */}
      <div className="p-4 flex justify-between items-center gap-4">
        <div className="text-slate-500 dark:text-slate-400 text-xs font-medium">
          {activeTab === 'coupons' ? `${coupons.length} cupons encontrados` : activeTab === 'campaigns' ? `${campaigns.length} campanhas encontradas` : ''}
        </div>
        {activeTab !== 'profile' && (
          <button
            onClick={() => {
              if (activeTab === 'coupons') {
                setEditingCoupon({ code: '', type: 'FIXED', value: 0, active: true, startDate: new Date().toISOString() });
                setEditingCampaign(null);
              } else {
                setEditingCampaign({ title: '', message: '', type: 'PUSH', status: 'DRAFT' });
                setEditingCoupon(null);
              }
              setIsModalOpen(true);
            }}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            {activeTab === 'coupons' ? 'Novo Cupom' : 'Nova Campanha'}
          </button>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'coupons' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {coupons.map(coupon => (
              <div key={coupon.id} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col gap-3 group">
                <div className="flex justify-between items-start">
                  <div className="bg-white dark:bg-slate-800 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-lg font-black text-blue-600 dark:text-blue-400">
                    {coupon.code}
                  </div>
                  <div className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${coupon.active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                    {coupon.active ? 'Ativo' : 'Inativo'}
                  </div>
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                  {coupon.description || 'Sem descrição'}
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-bold uppercase text-slate-400">
                  <div className="flex items-center gap-1">
                    <Check className="w-3 h-3 text-blue-500" />
                    Uso: {coupon.usedCount} / {coupon.usageLimit || '∞'}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-blue-500" />
                    Até: {coupon.endDate ? new Date(coupon.endDate).toLocaleDateString() : '∞'}
                  </div>
                </div>
                <div className="mt-auto pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                  <button
                    onClick={() => { setEditingCoupon(coupon); setIsModalOpen(true); }}
                    className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-lg transition-all"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCoupon(coupon.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-slate-700 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === 'profile' ? (
          <div className="w-full space-y-8 px-2 md:px-6 pb-8">
            <form onSubmit={handleSaveSettings} className="space-y-8 divide-y divide-slate-100 dark:divide-slate-800">
              
              {/* Informações de Contato */}
              <div className="flex flex-col xl:flex-row gap-6 xl:gap-12 pt-4">
                <div className="xl:w-1/3 space-y-1">
                  <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">Informações de Contato</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Insira os telefones e redes sociais para que os clientes da sua loja consigam encontrá-lo com facilidade.</p>
                </div>
                
                <div className="xl:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Telefone Principal</label>
                    <input
                      type="text"
                      className="w-full p-4 pl-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 transition-all font-bold text-slate-700 dark:text-slate-200"
                      placeholder="(00) 00000-0000"
                      value={settings.phone || ''}
                      onChange={e => setSettings({ ...settings, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Website</label>
                    <input
                      type="text"
                      className="w-full p-4 pl-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 transition-all font-bold text-slate-700 dark:text-slate-200"
                      placeholder="www.sualoja.com.br"
                      value={settings.website || ''}
                      onChange={e => setSettings({ ...settings, website: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Facebook (Username)</label>
                    <input
                      type="text"
                      className="w-full p-4 pl-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 transition-all font-bold text-slate-700 dark:text-slate-200"
                      placeholder="sualoja"
                      value={settings.facebook || ''}
                      onChange={e => setSettings({ ...settings, facebook: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Instagram (Username)</label>
                    <input
                      type="text"
                      className="w-full p-4 pl-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 transition-all font-bold text-slate-700 dark:text-slate-200"
                      placeholder="sualoja"
                      value={settings.instagram || ''}
                      onChange={e => setSettings({ ...settings, instagram: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Logotipo */}
              <div className="flex flex-col xl:flex-row gap-6 xl:gap-12 pt-8">
                <div className="xl:w-1/3 space-y-1">
                  <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">Identidade Visual</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Essa imagem aparecerá no topo do menu lateral do seu app de delivery.</p>
                </div>
                
                <div className="xl:w-2/3 space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Logotipo da Campanha / Menu</label>
                    <div className="flex flex-col md:flex-row gap-3">
                      <div className="flex-1 flex bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 items-center overflow-hidden focus-within:bg-white dark:focus-within:bg-slate-900 transition-all">
                        <input
                          type="text"
                          className="flex-1 p-4 bg-transparent border-none font-bold text-slate-800 dark:text-slate-200 text-sm focus:ring-0"
                          placeholder="https://link-da-imagem.com/logo.png"
                          value={settings.campaignLogoUrl || ''}
                          onChange={e => setSettings({ ...settings, campaignLogoUrl: e.target.value })}
                        />
                        <button
                          type="button"
                          onClick={() => logoFileInputRef.current?.click()}
                          className="px-6 h-full bg-blue-600 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-blue-700 transition-all"
                        >
                          <Upload className="w-4 h-4" />
                          UPLOAD
                        </button>
                      </div>

                      {settings.campaignLogoUrl && (
                        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-2xl border border-slate-100 dark:border-slate-800 shrink-0">
                          <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-sm shrink-0 border border-slate-100 dark:border-slate-800">
                            <img src={settings.campaignLogoUrl} alt="Preview" className="w-full h-full object-contain" />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              showAlert('Confirmar Exclusão', 'Deseja remover a imagem do logotipo?', 'DANGER', () => {
                                setSettings({ ...settings, campaignLogoUrl: '' });
                                setAlertConfig(prev => ({ ...prev, isOpen: false }));
                              }, () => setAlertConfig(prev => ({ ...prev, isOpen: false })));
                            }}
                            className="p-3 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all h-full"
                            title="Remover Imagem"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Banners Carrossel */}
              <div className="flex flex-col xl:flex-row gap-6 xl:gap-12 pt-8">
                <div className="xl:w-1/3 space-y-1">
                  <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">Banners da Tela Inicial</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Essas imagens aparecerão em formato de carrossel assim que o cliente abrir seu aplicativo.</p>
                </div>
                
                <div className="xl:w-2/3 space-y-6">
                  {/* Banner 1 */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Banner de Propaganda 1</label>
                    <div className="flex flex-col md:flex-row gap-3">
                      <div className="flex-1 flex bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 items-center overflow-hidden focus-within:bg-white dark:focus-within:bg-slate-900 transition-all">
                        <input
                          type="text"
                          className="flex-1 p-4 bg-transparent border-none font-bold text-slate-800 dark:text-slate-200 text-sm focus:ring-0"
                          placeholder="Link ou Base64"
                          value={settings.appBannerUrl || ''}
                          onChange={e => setSettings({ ...settings, appBannerUrl: e.target.value })}
                        />
                        <button
                          type="button"
                          onClick={() => bannerFileInputRef.current?.click()}
                          className="px-6 h-full bg-blue-600 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-blue-700 transition-all"
                        >
                          <Upload className="w-4 h-4" />
                          UPLOAD
                        </button>
                      </div>

                      {settings.appBannerUrl && (
                        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-2xl border border-slate-100 dark:border-slate-800 shrink-0">
                          <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-sm shrink-0 border border-slate-100 dark:border-slate-800">
                            <img src={settings.appBannerUrl} alt="Preview" className="w-full h-full object-cover" />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              showAlert('Confirmar Exclusão', 'Deseja remover a imagem de propaganda 1?', 'DANGER', () => {
                                setSettings({ ...settings, appBannerUrl: '' });
                                setAlertConfig(prev => ({ ...prev, isOpen: false }));
                              }, () => setAlertConfig(prev => ({ ...prev, isOpen: false })));
                            }}
                            className="p-3 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all h-full"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Banner 2 */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Banner de Propaganda 2</label>
                    <div className="flex flex-col md:flex-row gap-3">
                      <div className="flex-1 flex bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 items-center overflow-hidden focus-within:bg-white dark:focus-within:bg-slate-900 transition-all">
                        <input
                          type="text"
                          className="flex-1 p-4 bg-transparent border-none font-bold text-slate-800 dark:text-slate-200 text-sm focus:ring-0"
                          placeholder="Link ou Base64"
                          value={settings.appBannerUrl2 || ''}
                          onChange={e => setSettings({ ...settings, appBannerUrl2: e.target.value })}
                        />
                        <button
                          type="button"
                          onClick={() => bannerFileInputRef2.current?.click()}
                          className="px-6 h-full bg-blue-600 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-blue-700 transition-all"
                        >
                          <Upload className="w-4 h-4" />
                          UPLOAD
                        </button>
                      </div>

                      {settings.appBannerUrl2 && (
                        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-2xl border border-slate-100 dark:border-slate-800 shrink-0">
                          <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-sm shrink-0 border border-slate-100 dark:border-slate-800">
                            <img src={settings.appBannerUrl2} alt="Preview" className="w-full h-full object-cover" />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              showAlert('Confirmar Exclusão', 'Deseja remover a imagem de propaganda 2?', 'DANGER', () => {
                                setSettings({ ...settings, appBannerUrl2: '' });
                                setAlertConfig(prev => ({ ...prev, isOpen: false }));
                              }, () => setAlertConfig(prev => ({ ...prev, isOpen: false })));
                            }}
                            className="p-3 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all h-full"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Banner 3 */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Banner de Propaganda 3</label>
                    <div className="flex flex-col md:flex-row gap-3">
                      <div className="flex-1 flex bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 items-center overflow-hidden focus-within:bg-white dark:focus-within:bg-slate-900 transition-all">
                        <input
                          type="text"
                          className="flex-1 p-4 bg-transparent border-none font-bold text-slate-800 dark:text-slate-200 text-sm focus:ring-0"
                          placeholder="Link ou Base64"
                          value={settings.appBannerUrl3 || ''}
                          onChange={e => setSettings({ ...settings, appBannerUrl3: e.target.value })}
                        />
                        <button
                          type="button"
                          onClick={() => bannerFileInputRef3.current?.click()}
                          className="px-6 h-full bg-blue-600 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-blue-700 transition-all"
                        >
                          <Upload className="w-4 h-4" />
                          UPLOAD
                        </button>
                      </div>

                      {settings.appBannerUrl3 && (
                        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-2xl border border-slate-100 dark:border-slate-800 shrink-0">
                          <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-sm shrink-0 border border-slate-100 dark:border-slate-800">
                            <img src={settings.appBannerUrl3} alt="Preview" className="w-full h-full object-cover" />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              showAlert('Confirmar Exclusão', 'Deseja remover a imagem de propaganda 3?', 'DANGER', () => {
                                setSettings({ ...settings, appBannerUrl3: '' });
                                setAlertConfig(prev => ({ ...prev, isOpen: false }));
                              }, () => setAlertConfig(prev => ({ ...prev, isOpen: false })));
                            }}
                            className="p-3 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all h-full"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Botão de Salvar */}
              <div className="pt-8 mb-8 pb-8 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-12 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-emerald-200 dark:shadow-emerald-900/20 transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  {isSubmitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-5 h-5" />}
                  Salvar Perfil da Loja
                </button>
              </div>

              {/* File Inputs Recondidos */}
              <input type="file" ref={logoFileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
              <input type="file" ref={bannerFileInputRef} className="hidden" accept="image/*" onChange={handleBannerUpload} />
              <input type="file" ref={bannerFileInputRef2} className="hidden" accept="image/*" onChange={handleBannerUpload2} />
              <input type="file" ref={bannerFileInputRef3} className="hidden" accept="image/*" onChange={handleBannerUpload3} />
            </form>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map(campaign => (
              <div key={campaign.id} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-start md:items-center">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-xl text-blue-600">
                  <Megaphone className="w-6 h-6" />
                </div>
                <div className="flex-1 gap-1 flex flex-col">
                  <div className="font-bold text-slate-800 dark:text-slate-200">{campaign.title}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{campaign.message}</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${campaign.status === 'SENT' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                    {campaign.status === 'SENT' ? 'ENVIADO' : campaign.status === 'DRAFT' ? 'RASCUNHO' : campaign.status}
                  </div>
                  <div className="flex gap-2">
                    {campaign.status !== 'SENT' && (
                      <button
                        onClick={() => handleSendCampaign(campaign.id)}
                        className="p-2 bg-blue-600 text-white rounded-lg shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all font-bold text-xs flex items-center gap-2"
                      >
                        <Send className="w-3 h-3" />
                        Disparar
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteCampaign(campaign.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-slate-700 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-800 dark:text-white">
                {activeTab === 'coupons' ? (editingCoupon?.id ? 'Editar Cupom' : 'Novo Cupom') : (editingCampaign?.id ? 'Editar Campanha' : 'Nova Campanha')}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={activeTab === 'coupons' ? handleSaveCoupon : handleSaveCampaign} className="p-6 space-y-4">
              {activeTab === 'coupons' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400">Código</label>
                      <input
                        type="text"
                        required
                        placeholder="EX: PIZZA10"
                        className="w-full p-3 bg-slate-100 dark:bg-slate-800 rounded-xl border-none font-bold uppercase text-slate-800 dark:text-white"
                        value={editingCoupon?.code}
                        onChange={e => setEditingCoupon({ ...editingCoupon, code: e.target.value.toUpperCase() })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400">Tipo</label>
                      <select
                        className="w-full p-3 bg-slate-100 dark:bg-slate-800 rounded-xl border-none font-bold text-slate-800 dark:text-white"
                        value={editingCoupon?.type}
                        onChange={e => setEditingCoupon({ ...editingCoupon, type: e.target.value as any })}
                      >
                        <option value="FIXED">Valor Fixo</option>
                        <option value="PERCENTAGE">Porcentagem</option>
                        <option value="FREE_SHIPPING">Frete Grátis</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400">Valor</label>
                      <div className="relative">
                        <input
                          type="number"
                          placeholder="0"
                          className="w-full p-3 bg-slate-100 dark:bg-slate-800 rounded-xl border-none font-bold pl-8 text-slate-800 dark:text-white"
                          value={editingCoupon?.value === 0 ? '' : editingCoupon?.value}
                          onChange={e => setEditingCoupon({ ...editingCoupon, value: e.target.value ? Number(e.target.value) : 0 })}
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                          {editingCoupon?.type === 'PERCENTAGE' ? <Percent className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400">Pedido Mínimo</label>
                      <input
                        type="number"
                        placeholder="0"
                        className="w-full p-3 bg-slate-100 dark:bg-slate-800 rounded-xl border-none font-bold text-slate-800 dark:text-white"
                        value={editingCoupon?.minOrderValue === 0 ? '' : editingCoupon?.minOrderValue}
                        onChange={e => setEditingCoupon({ ...editingCoupon, minOrderValue: e.target.value ? Number(e.target.value) : 0 })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400">Descrição</label>
                      <input
                        className="w-full p-3 bg-slate-100 dark:bg-slate-800 rounded-xl border-none text-sm font-bold text-slate-800 dark:text-white"
                        placeholder="Ex: Desconto de Boas Vindas"
                        value={editingCoupon?.description || ''}
                        onChange={e => setEditingCoupon({ ...editingCoupon, description: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400">Validade</label>
                      <input
                        type="date"
                        className="w-full p-3 bg-slate-100 dark:bg-slate-800 rounded-xl border-none text-sm font-bold text-slate-800 dark:text-white"
                        value={editingCoupon?.endDate ? new Date(editingCoupon.endDate).toISOString().split('T')[0] : ''}
                        onChange={e => setEditingCoupon({ ...editingCoupon, endDate: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Título da Campanha</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Novidade no Cardápio!"
                      className="w-full p-3 bg-slate-100 dark:bg-slate-800 rounded-xl border-none font-bold text-slate-800 dark:text-white"
                      value={editingCampaign?.title}
                      onChange={e => setEditingCampaign({ ...editingCampaign, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Mensagem</label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Escreva a mensagem que os clientes receberão..."
                      className="w-full p-3 bg-slate-100 dark:bg-slate-800 rounded-xl border-none text-sm font-bold text-slate-800 dark:text-white"
                      value={editingCampaign?.message}
                      onChange={e => setEditingCampaign({ ...editingCampaign, message: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400">Canal</label>
                      <select
                        className="w-full p-3 bg-slate-100 dark:bg-slate-800 rounded-xl border-none font-bold text-slate-800 dark:text-white"
                        value={editingCampaign?.type}
                        onChange={e => setEditingCampaign({ ...editingCampaign, type: e.target.value as any })}
                      >
                        <option value="PUSH">Somente Push Notification</option>
                        <option value="IN_APP">Somente In-App</option>
                        <option value="BOTH">Push + In-App</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400">Segmento</label>
                      <select
                        className="w-full p-3 bg-slate-100 dark:bg-slate-800 rounded-xl border-none font-bold text-slate-800 dark:text-white"
                        value={editingCampaign?.segment}
                        onChange={e => setEditingCampaign({ ...editingCampaign, segment: e.target.value })}
                      >
                        <option value="ALL">Todos os Clientes</option>
                        <option value="ACTIVE">Clientes Ativos</option>
                        <option value="INACTIVE">Clientes Inativos</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Imagem Principal (Opcional)</label>
                    <div className="flex gap-3 items-center">
                      <input
                        type="text"
                        className="flex-1 p-3 bg-slate-100 dark:bg-slate-800 rounded-xl border-none font-bold text-slate-800 dark:text-slate-200 text-xs"
                        placeholder="https://link-da-imagem.com/img.png"
                        value={editingCampaign?.imageUrl || ''}
                        onChange={e => setEditingCampaign({ ...editingCampaign, imageUrl: e.target.value })}
                      />
                      
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => campaignImageFileInputRef.current?.click()}
                          className="p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200 dark:shadow-blue-900/40 transition-all active:scale-95 flex items-center justify-center"
                          title="Upload de Imagem"
                        >
                          <Upload className="w-4 h-4" />
                        </button>

                        {editingCampaign?.imageUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              showAlert('Confirmar Exclusão', 'Deseja remover a imagem desta campanha?', 'DANGER', () => {
                                setEditingCampaign({ ...editingCampaign, imageUrl: '' });
                                setAlertConfig(prev => ({ ...prev, isOpen: false }));
                              }, () => setAlertConfig(prev => ({ ...prev, isOpen: false })));
                            }}
                            className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-xl border border-rose-100 dark:border-rose-800 transition-all active:scale-95 flex items-center justify-center"
                            title="Remover Imagem"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      
                      {editingCampaign?.imageUrl && (
                        <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 p-1 shadow-sm overflow-hidden border border-slate-100 dark:border-slate-800 shrink-0">
                          <img src={editingCampaign?.imageUrl} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                        </div>
                      )}
                    </div>
                  </div>
                  <input type="file" ref={campaignImageFileInputRef} className="hidden" accept="image/*" onChange={handleCampaignImageUpload} />
                </>
              )}


              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-200 dark:shadow-blue-900/20 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Salvar Dados
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      <CustomAlert
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel}
      />
    </div>
  );
};

export default EngagementManager;
