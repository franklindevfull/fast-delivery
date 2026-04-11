
import React, { useState, useEffect, useRef } from 'react';
import { InventoryItem, Product, RecipeItem, OrderItem, UnitType } from '../types';
import { db } from '../services/db';
import { PLACEHOLDER_FOOD_IMAGE, formatImageUrl, Icons } from '../constants';
import CustomAlert from '../components/CustomAlert';
import { useToast } from '../hooks/useToast';
import { formatCurrency } from '../services/formatUtils';

const Inventory: React.FC = () => {
  const { addToast } = useToast();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [viewMode, setViewMode] = useState<'ESTOQUE' | 'CARDAPIO'>('ESTOQUE');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isInvModalOpen, setIsInvModalOpen] = useState(false);
  const [isProdModalOpen, setIsProdModalOpen] = useState(false);
  const [isStockSelectModalOpen, setIsStockSelectModalOpen] = useState(false);
  const [selectedStockIds, setSelectedStockIds] = useState<string[]>([]);

  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [invFormData, setInvFormData] = useState({
    name: '', unit: 'G' as UnitType, quantity: 0, minStock: 0, cost: 0
  });

  const [prodFormData, setProdFormData] = useState({
    name: '', price: 0, category: '', imageUrl: '', stock: 0,
    ncm: '', cfop: '', cest: '', preparation: '', isCombo: false, isPizza: false, pizzaSize: ''
  });

  const [tempRecipe, setTempRecipe] = useState<RecipeItem[]>([]);
  const [tempComboItems, setTempComboItems] = useState<{ productId: string, quantity: number }[]>([]);

  const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void, onCancel?: () => void, type: 'INFO' | 'DANGER' | 'SUCCESS' }>({
    isOpen: false, title: '', message: '', onConfirm: () => { }, type: 'INFO'
  });

  const showAlert = (title: string, message: string, type: 'INFO' | 'DANGER' | 'SUCCESS' = 'INFO', onConfirm?: () => void, onCancel?: () => void) => {
    setAlertConfig({
      isOpen: true, title, message,
      onConfirm: onConfirm || (() => setAlertConfig(prev => ({ ...prev, isOpen: false }))),
      onCancel: onCancel,
      type
    });
  };

  useEffect(() => {
    refreshData();
  }, [viewMode]);

  const refreshData = async () => {
    const [inv, prods] = await Promise.all([db.getInventory(), db.getProducts()]);
    setInventory(inv);
    setProducts(prods);
  };

  const openInvModal = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item);
      setInvFormData({ ...item });
    } else {
      setEditingItem(null);
      setInvFormData({ name: '', unit: 'G', quantity: 0, minStock: 0, cost: 0 });
    }
    setIsInvModalOpen(true);
  };

  const saveInvItem = async (e: React.FormEvent) => {
    e.preventDefault();
    await db.saveInventoryItem({ id: editingItem?.id || `ins-${Date.now()}`, ...invFormData });
    await refreshData();
    setIsInvModalOpen(false);
  };

  const deleteInvItem = async (id: string) => {
    if (products.some(p => p.recipe?.some(r => r.inventoryItemId === id))) {
      return showAlert("Ação Bloqueada", "Este insumo faz parte de uma receita ativa e não pode ser excluído.", "DANGER");
    }

    showAlert(
      "Confirmar Exclusão",
      "Tem certeza que deseja excluir este insumo permanentemente do estoque?",
      "DANGER",
      async () => {
        await db.deleteInventoryItem(id);
        await refreshData();
        setAlertConfig(prev => ({ ...prev, isOpen: false }));
      },
      () => setAlertConfig(prev => ({ ...prev, isOpen: false }))
    );
  };

  const openProdModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setProdFormData({
        name: product.name,
        price: product.price,
        category: product.category,
        imageUrl: product.imageUrl || '',
        stock: product.stock,
        ncm: product.ncm || '',
        cfop: product.cfop || '',
        cest: product.cest || '',
        preparation: product.preparation || '',
        isCombo: (product.comboItems?.length ?? 0) > 0,
        isPizza: product.isPizza || false,
        pizzaSize: product.pizzaSize || ''
      });
      setTempRecipe(product.recipe || []);
      setTempComboItems(product.comboItems?.map(ci => ({ productId: ci.productId, quantity: ci.quantity })) || []);
    } else {
      setEditingProduct(null);
      setProdFormData({ name: '', price: 0, category: 'Geral', imageUrl: '', stock: 0, ncm: '', cfop: '', cest: '', preparation: '', isCombo: false, isPizza: false, pizzaSize: '' });
      setTempRecipe([]);
      setTempComboItems([]);
    }
    setIsProdModalOpen(true);
  };

  const copyProd = (product: Product) => {
    setEditingProduct(null);
    setProdFormData({
      name: `${product.name} Cópia`,
      price: product.price,
      category: product.category,
      imageUrl: product.imageUrl || '',
      stock: product.stock,
      ncm: product.ncm || '',
      cfop: product.cfop || '',
      cest: product.cest || '',
      preparation: product.preparation || '',
      isCombo: (product.comboItems?.length ?? 0) > 0,
      isPizza: product.isPizza || false,
      pizzaSize: product.pizzaSize || ''
    });
    setTempRecipe(product.recipe ? [...product.recipe] : []);
    setTempComboItems(product.comboItems ? [...product.comboItems] : []);
    setIsProdModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setProdFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await db.saveProduct({ 
        id: editingProduct?.id || `prod-${Date.now()}`, 
        ...prodFormData,
        recipe: tempRecipe,
        comboItems: prodFormData.isCombo ? tempComboItems : []
      });
      await refreshData();
      setIsProdModalOpen(false);
    } catch (error) {
      addToast({ title: 'Erro', message: "Erro ao salvar produto. Verifique os dados.", type: 'DANGER' });
    }
  };



  const deleteProd = async (id: string) => {
    showAlert(
      "Confirmar Exclusão",
      "Deseja excluir este produto permanentemente do cardápio?",
      "DANGER",
      async () => {
        try {
          const response = await db.deleteProduct(id);
          await refreshData();
          setAlertConfig(prev => ({ ...prev, isOpen: false }));
          showAlert("Sucesso", response.message || "Produto removido com sucesso.", "SUCCESS");
        } catch (error: any) {
          setAlertConfig(prev => ({ ...prev, isOpen: false }));
          showAlert("Não foi possível excluir", error.message || "Este produto possui histórico e não pode ser apagado.", "INFO");
        }
      },
      () => setAlertConfig(prev => ({ ...prev, isOpen: false }))
    );
  };

  return (
    <div className="flex flex-col h-full gap-6">
      <CustomAlert {...alertConfig} onConfirm={alertConfig.onConfirm} onCancel={alertConfig.onCancel} />
      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <button onClick={() => setViewMode('ESTOQUE')} className={`pb-4 px-2 font-bold transition-all ${viewMode === 'ESTOQUE' ? 'border-b-4 border-blue-600 text-blue-600' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'}`}>Estoque de Insumos</button>
        <button onClick={() => setViewMode('CARDAPIO')} className={`pb-4 px-2 font-bold transition-all ${viewMode === 'CARDAPIO' ? 'border-b-4 border-blue-600 text-blue-600' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'}`}>Cardápio / Ficha Técnica</button>
      </div>

      {viewMode === 'ESTOQUE' ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex-1 flex flex-col overflow-hidden">
          <div className="p-6 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
            <div>
              <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tight text-lg">Insumos e Matéria-Prima</h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Controle de volumes para produção.</p>
            </div>
            <button
              onClick={() => openInvModal()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 shrink-0"
            >
              <Icons.Plus size={18} strokeWidth={3} />
              Novo Insumo
            </button>
          </div>
          <div className="overflow-y-auto flex-1">
            <table className="w-full text-left">
              <thead><tr className="border-b dark:border-slate-800 text-slate-400 dark:text-slate-500 text-[10px] uppercase font-bold tracking-widest"><th className="px-6 py-4">Insumo</th><th className="px-6 py-4">Quantidade</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Ações</th></tr></thead>
              <tbody className="divide-y dark:divide-slate-800">{inventory.length > 0 ? inventory.map(item => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-700 dark:text-slate-200 uppercase text-xs">{item.name}</p>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">ID: {item.id}</p>
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-slate-600 dark:text-slate-400 text-xs">{item.quantity.toFixed(2)} {item.unit}</td>
                  <td className="px-6 py-4">
                    {item.quantity <= item.minStock ? (
                      <span className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-1 rounded-md text-[9px] font-black uppercase">Crítico</span>
                    ) : (
                      <span className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-md text-[9px] font-black uppercase">Normal</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openInvModal(item)} className="p-2 text-slate-400 hover:text-blue-600" title="Editar"><Icons.Edit /></button>
                      <button onClick={() => deleteInvItem(item.id)} className="p-2 text-slate-300 hover:text-red-500" title="Excluir"><Icons.Delete /></button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500 text-xs italic">Nenhum insumo cadastrado.</td></tr>
              )}</tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 overflow-y-auto pb-10">
          {products.map(product => (
            <div key={product.id} className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 p-4 flex flex-col group hover:shadow-xl hover:border-blue-100 dark:hover:border-blue-900 transition-all">
              <div className="relative mb-3 bg-slate-50 dark:bg-slate-800 rounded-2xl overflow-hidden aspect-square flex items-center justify-center border border-slate-50 dark:border-slate-800 group-hover:scale-[1.02] transition-transform">
                <img src={formatImageUrl(product.imageUrl)} onError={e => e.currentTarget.src = PLACEHOLDER_FOOD_IMAGE} className="w-full h-full object-contain" />
              </div>
              <h4 className="font-black text-slate-800 dark:text-white text-xs uppercase mb-1 h-8 line-clamp-2 leading-tight">{product.name}</h4>
              <p className="text-sm font-black text-blue-600 dark:text-blue-500 mb-4">{formatCurrency(product.price)}</p>
              <div className="flex gap-2 mt-auto min-w-0">
                <button onClick={() => openProdModal(product)} className="flex-1 min-w-0 py-3 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl text-[9px] font-black uppercase transition-all flex items-center justify-center gap-1.5" title="Editar">
                  <Icons.Edit className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">Editar</span>
                </button>
                <button onClick={() => copyProd(product)} className="w-11 h-11 shrink-0 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-2xl transition-all flex items-center justify-center" title="Copiar">
                  <Icons.Copy className="w-4 h-4" />
                </button>
                <button onClick={() => deleteProd(product.id)} className="w-11 h-11 shrink-0 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-2xl transition-all flex items-center justify-center" title="Excluir">
                  <Icons.Delete className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          <button onClick={() => openProdModal()} className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col items-center justify-center min-h-[250px] transition-all text-slate-400 dark:text-slate-500 font-black uppercase gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-blue-200 dark:hover:border-blue-900 hover:text-blue-400 text-[10px] tracking-widest">
            <span className="text-2xl">+</span>
            Adicionar Produto
          </button>
        </div>
      )}

      {/* MODAL INSUMO */}
      {isInvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-sm flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in duration-200 border border-transparent dark:border-slate-800">
            <div className="p-8 border-b border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-between items-center shrink-0">
              <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">{editingItem ? 'Editar Insumo' : 'Novo Insumo'}</h3>
              <div className="flex items-center gap-4">
                <button
                  type="submit"
                  form="inv-item-form"
                  className="w-12 h-12 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-200 dark:shadow-emerald-900/40 transition-all active:scale-95"
                >
                  <Icons.Check className="h-6 w-6" />
                </button>
                <button onClick={() => setIsInvModalOpen(false)} className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                  <Icons.X className="h-6 w-6" />
                </button>
              </div>
            </div>
            <form id="inv-item-form" onSubmit={saveInvItem} className="p-8 space-y-5 overflow-y-auto custom-scrollbar">
              <div className="space-y-1">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Nome do Insumo</label>
                  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">Máx. 12 carac.</span>
                </div>
                <input 
                  type="text" 
                  required 
                  maxLength={12}
                  value={invFormData.name} 
                  onChange={e => setInvFormData({ ...invFormData, name: e.target.value })} 
                  className="w-full p-4 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold text-sm text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600" 
                  placeholder="Ex: Pão Brioche" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Unidade</label>
                  <select value={invFormData.unit} onChange={e => setInvFormData({ ...invFormData, unit: e.target.value as UnitType })} className="w-full p-4 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold text-sm text-slate-800 dark:text-white">
                    <option value="G">Grama (g)</option>
                    <option value="ML">Mililitro (ml)</option>
                    <option value="UN">Unidade (un)</option>
                    <option value="KG">Quilo (kg)</option>
                    <option value="L">Litro (l)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Estoque Atual</label>
                  <input type="number" required step="0.01" value={invFormData.quantity} onChange={e => setInvFormData({ ...invFormData, quantity: parseFloat(e.target.value) })} className="w-full p-4 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold text-sm text-slate-800 dark:text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Estoque Mínimo</label>
                  <input type="number" required step="0.01" value={invFormData.minStock} onChange={e => setInvFormData({ ...invFormData, minStock: parseFloat(e.target.value) })} className="w-full p-4 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold text-sm text-slate-800 dark:text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Custo Médio</label>
                  <input type="number" required step="0.01" value={invFormData.cost} onChange={e => setInvFormData({ ...invFormData, cost: parseFloat(e.target.value) })} className="w-full p-4 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold text-sm text-slate-800 dark:text-white" />
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PRODUTO */}
      {isProdModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in duration-200 border border-transparent dark:border-slate-800">
            <div className="p-8 border-b border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-between items-center shrink-0">
              <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">{editingProduct ? 'Editar' : 'Novo'} Produto</h3>
              <div className="flex items-center gap-4">
                <button
                  type="submit"
                  form="product-form"
                  className="w-12 h-12 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-200 dark:shadow-emerald-900/40 transition-all active:scale-95"
                >
                  <Icons.Check className="h-6 w-6" />
                </button>
                <button onClick={() => setIsProdModalOpen(false)} className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                  <Icons.X className="h-6 w-6" />
                </button>
              </div>
            </div>
            <form id="product-form" onSubmit={saveProduct} className="p-10 space-y-5 overflow-y-auto custom-scrollbar">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Nome do Produto</label>
                <input type="text" placeholder="Ex: Burger Bacon" required value={prodFormData.name} onChange={e => setProdFormData({ ...prodFormData, name: e.target.value })} className="w-full p-4 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold text-sm text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Preço de Venda</label>
                  <input type="number" step="0.01" placeholder="R$ 0,00" required value={prodFormData.price} onChange={e => setProdFormData({ ...prodFormData, price: parseFloat(e.target.value) })} className="w-full p-4 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold text-sm text-slate-800 dark:text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Categoria</label>
                  <input type="text" placeholder="Ex: Burgers" value={prodFormData.category} onChange={e => setProdFormData({ ...prodFormData, category: e.target.value })} className="w-full p-4 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold text-sm text-slate-800 dark:text-white" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Imagem do Produto</label>
                <div className="flex gap-2">
                  <input type="text" value={prodFormData.imageUrl} onChange={e => setProdFormData({ ...prodFormData, imageUrl: e.target.value })} className="flex-1 p-4 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl text-[10px] font-bold text-slate-800 dark:text-white" placeholder="URL da imagem..." />
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="p-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black shadow-lg shadow-blue-100 dark:shadow-blue-900/20">UP</button>
                  <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                </div>
              </div>

              <div className="space-y-4">                {!prodFormData.isCombo && (
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 space-y-3">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                      Insumos do Estoque (Composição)
                    </p>
                    {tempRecipe.length > 0 ? (
                      <div className="space-y-3 overflow-y-auto max-h-[140px] pr-2 pb-2 custom-scrollbar">
                        <div className="flex gap-2 px-1 mb-1">
                          <div className="flex-1 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Insumo</div>
                          <div className="w-20 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Qtd</div>
                          <div className="w-20 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Perda %</div>
                          <div className="w-10"></div>
                        </div>
                        {tempRecipe.map((item, index) => (
                          <div key={index} className="flex gap-2 items-center">
                            <div className="flex-1">
                              <div className="w-full p-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 truncate cursor-not-allowed select-none flex items-center h-[40px]">
                                {inventory.find(inv => inv.id === item.inventoryItemId)?.name || 'Insumo Selecionado'}
                              </div>
                            </div>
                            <div className="w-20">
                              <input type="number" step="0.01" placeholder="0" value={item.quantity === 0 ? '' : item.quantity} onChange={e => { const updated = [...tempRecipe]; updated[index].quantity = e.target.value === '' ? 0 : parseFloat(e.target.value); setTempRecipe(updated); }} className="w-full p-3 bg-white dark:bg-slate-900 border-none rounded-xl text-xs font-bold text-slate-800 dark:text-white text-center focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                            </div>
                            <div className="w-20">
                              <input
                                type="number"
                                step="1"
                                placeholder="0"
                                value={item.wasteFactor === 1 ? '' : Math.round((item.wasteFactor - 1) * 100)}
                                onKeyDown={e => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault(); }}
                                onChange={e => {
                                  let val = e.target.value;
                                  const percentage = val === '' ? 0 : parseFloat(val);
                                  const updated = [...tempRecipe];
                                  updated[index].wasteFactor = 1 + (percentage / 100);
                                  setTempRecipe(updated);
                                }}
                                className="w-full p-3 bg-white dark:bg-slate-900 border-none rounded-xl text-xs font-bold text-slate-800 dark:text-white placeholder:text-slate-800 dark:placeholder:text-white text-center focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </div>
                            <button type="button" onClick={() => setTempRecipe(tempRecipe.filter((_, i) => i !== index))} className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all shrink-0"><Icons.Delete className="h-4 w-4" /></button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-slate-400 dark:text-slate-500 text-[10px] italic py-3">Sem insumos vinculados para baixa de estoque.</p>
                    )}
                    <div className="pt-2">
                      <button type="button" onClick={() => { setSelectedStockIds(tempRecipe.map(r => r.inventoryItemId).filter(id => id !== '')); setIsStockSelectModalOpen(true); }} className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase text-slate-400 hover:text-blue-500 hover:border-blue-200 transition-colors">
                        + Adicionar Insumo
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-50 dark:border-slate-800 space-y-4">
                <p className="text-[9px] font-black text-blue-600 dark:text-blue-500 uppercase tracking-[0.2em] mb-2">Informações Fiscais</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">NCM</label>
                    <input type="text" placeholder="00000000" value={prodFormData.ncm} onChange={e => setProdFormData({ ...prodFormData, ncm: e.target.value })} className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border-none rounded-xl font-bold text-xs text-slate-800 dark:text-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">CFOP</label>
                    <input type="text" placeholder="5102" value={prodFormData.cfop} onChange={e => setProdFormData({ ...prodFormData, cfop: e.target.value })} className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border-none rounded-xl font-bold text-xs text-slate-800 dark:text-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">CEST</label>
                    <input type="text" placeholder="0000000" value={prodFormData.cest} onChange={e => setProdFormData({ ...prodFormData, cest: e.target.value })} className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border-none rounded-xl font-bold text-xs text-slate-800 dark:text-white" />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-50 dark:border-slate-800 space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isPizza"
                    checked={prodFormData.isPizza}
                    onChange={(e) => setProdFormData({ ...prodFormData, isPizza: e.target.checked })}
                    className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="isPizza" className="text-sm font-black text-slate-800 dark:text-white cursor-pointer">
                    Este produto é Sabor de Pizza / Pizza?
                  </label>
                </div>
                {prodFormData.isPizza && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Tamanho Específico (Opcional)</label>
                    <select value={prodFormData.pizzaSize} onChange={e => setProdFormData({ ...prodFormData, pizzaSize: e.target.value })} className="w-full p-4 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold text-sm text-slate-800 dark:text-white">
                      <option value="">Aplicável a todos tamanhos (Padrão)</option>
                      <option value="P">Pequena (4 Fatias / 2 Sabores)</option>
                      <option value="M">Média (6 Fatias / 3 Sabores)</option>
                      <option value="G">Grande (8 Fatias / 4 Sabores)</option>
                    </select>
                  </div>
                )}
                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="isCombo"
                    checked={prodFormData.isCombo}
                    onChange={(e) => setProdFormData({ ...prodFormData, isCombo: e.target.checked })}
                    className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="isCombo" className="text-sm font-black text-slate-800 dark:text-white cursor-pointer">
                    Este produto é um Combo?
                  </label>
                </div>

                {prodFormData.isCombo && (
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 space-y-3">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                      Produtos do Combo
                    </p>
                    <div className="space-y-3 overflow-y-auto max-h-[140px] pr-2 pb-2 custom-scrollbar">
                      {tempComboItems.map((item, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <select
                            value={item.productId}
                            onChange={(e) => {
                              const newComboItems = [...tempComboItems];
                              newComboItems[idx].productId = e.target.value;
                              setTempComboItems(newComboItems);
                            }}
                            className="flex-1 p-3 bg-white dark:bg-slate-900 border-none rounded-xl font-bold text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Selecione um Produto...</option>
                            {products.filter(p => p.id !== editingProduct?.id).map((p) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            placeholder="Qtd"
                            value={item.quantity === 0 ? '' : item.quantity}
                            min={1}
                            onChange={(e) => {
                              const newComboItems = [...tempComboItems];
                              newComboItems[idx].quantity = e.target.value === '' ? 0 : parseInt(e.target.value);
                              setTempComboItems(newComboItems);
                            }}
                            className="w-16 p-3 bg-white dark:bg-slate-900 border-none rounded-xl font-bold text-xs text-center text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            type="button"
                            onClick={() => setTempComboItems(tempComboItems.filter((_, i) => i !== idx))}
                            className="w-10 flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl"
                          >
                            <Icons.Delete size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setTempComboItems([...tempComboItems, { productId: '', quantity: 1 }])}
                        className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase text-slate-400 hover:text-blue-500 hover:border-blue-200 transition-colors"
                      >
                        + Adicionar Produto
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SELEÇÃO DE INSUMOS */}
      {isStockSelectModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-sm flex flex-col max-h-[80vh] overflow-hidden animate-in zoom-in duration-200 border border-transparent dark:border-slate-800">
            <div className="p-8 border-b border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter">Selecionar Insumos</h3>
              <button type="button" onClick={() => setIsStockSelectModalOpen(false)} className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <Icons.X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-2">
              {inventory.length > 0 ? inventory.map(inv => (
                <div key={inv.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 cursor-pointer hover:border-blue-200 dark:hover:border-blue-900/50 transition-colors" onClick={() => {
                  setSelectedStockIds(prev => prev.includes(inv.id) ? prev.filter(id => id !== inv.id) : [...prev, inv.id]);
                }}>
                  <input type="checkbox" checked={selectedStockIds.includes(inv.id)} readOnly className="w-5 h-5 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                  <div className="flex-1">
                    <p className="font-bold text-sm text-slate-800 dark:text-slate-200 uppercase">{inv.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">Unidade: {inv.unit}</p>
                  </div>
                </div>
              )) : (
                <p className="text-center text-slate-400 dark:text-slate-500 text-[10px] italic py-3">Sem insumos cadastrados no estoque.</p>
              )}
            </div>
            <div className="p-6 border-t border-slate-50 dark:border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const newRecipe = tempRecipe.filter(r => selectedStockIds.includes(r.inventoryItemId));
                  selectedStockIds.forEach(id => {
                    if (!newRecipe.find(r => r.inventoryItemId === id)) {
                      newRecipe.push({ inventoryItemId: id, quantity: 0, wasteFactor: 1 });
                    }
                  });
                  setTempRecipe(newRecipe);
                  setIsStockSelectModalOpen(false);
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black uppercase text-sm shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
              >
                Confirmar Seleção ({selectedStockIds.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
