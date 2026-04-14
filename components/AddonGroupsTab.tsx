import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { AddonGroup, AddonOption } from '../types';
import { useToast } from '../hooks/useToast';
import { Plus, Edit2, Trash2, Copy, AlertCircle, X, Check } from 'lucide-react';
import { formatCurrency } from '../services/formatUtils';

export default function AddonGroupsTab() {
  const [groups, setGroups] = useState<AddonGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AddonGroup | null>(null);
  const { addToast } = useToast();

  const loadGroups = async () => {
    setLoading(true);
    try {
      const data = await db.getAddonGroups();
      setGroups(data || []);
    } catch (err) {
      addToast({ title: 'Erro', message: 'Erro ao carregar grupos de opções.', type: 'DANGER' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const openNewModal = () => {
    setEditingGroup({
      id: `new-${Date.now()}`,
      name: '',
      selectionType: 'MULTIPLE',
      isRequired: false,
      active: true,
      options: []
    });
    setIsModalOpen(true);
  };

  const openEditModal = (group: AddonGroup) => {
    const cloned = JSON.parse(JSON.stringify(group));
    // Convert numbers to strings for input handling
    if (cloned.options) {
      cloned.options = cloned.options.map((opt: any) => ({
        ...opt,
        price: opt.price ? opt.price.toString() : '0',
        stock: opt.stock ? opt.stock.toString() : '0'
      }));
    }
    setEditingGroup(cloned);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Excluir o grupo "${name}"? Essa ação afetará os produtos vinculados.`)) return;
    try {
      await db.deleteAddonGroup(id);
      addToast({ title: 'Sucesso', message: 'Grupo excluído com sucesso.', type: 'SUCCESS' });
      loadGroups();
    } catch (e: any) {
      addToast({ title: 'Erro', message: e.message || 'Erro ao excluir.', type: 'DANGER' });
    }
  };

  const handleCopy = async (id: string) => {
    try {
      await db.copyAddonGroup(id);
      addToast({ title: 'Sucesso', message: 'Grupo copiado com sucesso.', type: 'SUCCESS' });
      loadGroups();
    } catch (e: any) {
      addToast({ title: 'Erro', message: e.message || 'Erro ao copiar grupo.', type: 'DANGER' });
    }
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup) return;

    if (!editingGroup.name) {
      addToast({ title: 'Aviso', message: 'Nome do grupo é obrigatório', type: 'WARNING' });
      return;
    }
    if (!editingGroup.options || editingGroup.options.length === 0) {
      addToast({ title: 'Aviso', message: 'Adicione pelo menos uma opção.', type: 'WARNING' });
      return;
    }

    try {
      const groupToSave = {
        ...editingGroup,
        options: editingGroup.options?.map((opt: any) => ({
          ...opt,
          price: parseFloat(opt.price.toString().replace(',', '.')) || 0,
          stock: parseFloat(opt.stock.toString().replace(',', '.')) || 0
        }))
      };
      await db.saveAddonGroup(groupToSave as any);
      addToast({ title: 'Sucesso', message: 'Grupo salvo com sucesso.', type: 'SUCCESS' });
      setIsModalOpen(false);
      loadGroups();
    } catch (e: any) {
      addToast({ title: 'Erro', message: e.message || 'Erro ao salvar grupo.', type: 'DANGER' });
    }
  };

  const addOption = () => {
    if (!editingGroup) return;
    setEditingGroup({
      ...editingGroup,
      options: [
        ...(editingGroup.options || []),
        { id: `opt-${Date.now()}`, name: '', price: '0', trackStock: false, stock: '0', active: true } as unknown as AddonOption
      ]
    });
  };

  const updateOption = (index: number, field: keyof AddonOption, value: any) => {
    if (!editingGroup || !editingGroup.options) return;
    const newOptions = [...editingGroup.options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setEditingGroup({ ...editingGroup, options: newOptions });
  };

  const removeOption = (index: number) => {
    if (!editingGroup || !editingGroup.options) return;
    const newOptions = [...editingGroup.options];
    newOptions.splice(index, 1);
    setEditingGroup({ ...editingGroup, options: newOptions });
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Carregando grupos...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Grupos de Adicionais</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Gerencie opções e adicionais extras (ex: Ponto da carne, Tamanho, Molhos)</p>
        </div>
        <button
          onClick={openNewModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <Plus size={20} />
          <span>Novo Grupo</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map((group) => (
          <div key={group.id} className={`bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm border relative overflow-hidden transition-all duration-200 ${group.active ? 'border-slate-200 dark:border-slate-800' : 'border-slate-200 dark:border-slate-800 opacity-60'}`}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{group.name}</h3>
                <div className="flex gap-2 items-center mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${group.isRequired ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                    {group.isRequired ? 'Obrigatório' : 'Opcional'}
                  </span>
                  {!group.active && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                      Inativo
                    </span>
                  )}
                </div>
              </div>
              <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                <button
                  onClick={() => openEditModal(group)}
                  className="p-1.5 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 rounded-md hover:bg-white dark:hover:bg-slate-700 transition-colors"
                  title="Editar Grupo"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleCopy(group.id)}
                  className="p-1.5 text-slate-500 hover:text-green-600 dark:text-slate-400 dark:hover:text-green-400 rounded-md hover:bg-white dark:hover:bg-slate-700 transition-colors"
                  title="Copiar Grupo"
                >
                  <Copy size={16} />
                </button>
                <button
                  onClick={() => handleDelete(group.id, group.name)}
                  className="p-1.5 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 rounded-md hover:bg-white dark:hover:bg-slate-700 transition-colors"
                  title="Excluir Grupo"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Opções ({group.options?.length || 0})</div>
              {group.options?.slice(0, 4).map((opt) => (
                <div key={opt.id} className="flex justify-between items-center text-sm border-b border-slate-100 dark:border-slate-800/50 pb-2 last:border-0 last:pb-0">
                  <span className={`text-slate-700 dark:text-slate-300 ${!opt.active ? 'line-through text-slate-400 dark:text-slate-500' : ''}`}>
                    {opt.name}
                  </span>
                  <div className="flex items-center gap-3">
                    {opt.trackStock && (
                      <span className={`text-xs ${opt.stock && opt.stock > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {opt.stock.toFixed(2)} un
                      </span>
                    )}
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {opt.price > 0 ? `+${formatCurrency(opt.price)}` : 'Grátis'}
                    </span>
                  </div>
                </div>
              ))}
              {group.options && group.options.length > 4 && (
                <div className="text-xs text-center text-slate-500 dark:text-slate-400 pt-2 font-medium">
                  + {group.options.length - 4} outras opções...
                </div>
              )}
            </div>
          </div>
        ))}

        {groups.length === 0 && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-4">
              <Plus size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">Crie seu primeiro Grupo</h3>
            <p className="text-slate-500 dark:text-slate-400 text-center max-w-md">
              Os grupos de opcionais permitem que seus clientes escolham detalhes como ponto da carne, tamanhos de pizza, sabores e extras.
            </p>
            <button
              onClick={openNewModal}
              className="mt-6 bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 px-6 py-2 rounded-xl font-bold hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
            >
              Adicionar Grupo
            </button>
          </div>
        )}
      </div>

      {isModalOpen && editingGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-3xl border border-slate-200 dark:border-slate-800 my-8">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 rounded-t-2xl z-10 w-full mb-0">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                {editingGroup.id.startsWith('new-') ? 'Novo Grupo de Adicionais' : 'Editar Grupo'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-6">
              <div className="space-y-6">
                
                {/* DADOS DO GRUPO */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 border border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs">1</span>
                    Configurações do Grupo
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-full">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome do Grupo do Adicional</label>
                      <input 
                        type="text" 
                        required
                        value={editingGroup.name}
                        onChange={(e) => setEditingGroup({...editingGroup, name: e.target.value})}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        placeholder="Ex: Extras do Hambúrguer, Sabores, Tamanho..."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
                      <select 
                        value={editingGroup.active ? 'true' : 'false'}
                        onChange={(e) => setEditingGroup({...editingGroup, active: e.target.value === 'true'})}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="true">Ativo</option>
                        <option value="false">Inativo</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Obrigatoriedade</label>
                      <select 
                        value={editingGroup.isRequired ? 'true' : 'false'}
                        onChange={(e) => setEditingGroup({...editingGroup, isRequired: e.target.value === 'true'})}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="false">Opcional</option>
                        <option value="true">Obrigatório (o cliente não pode avançar sem escolher)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* OPÇÕES */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 border border-slate-100 dark:border-slate-800 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs">2</span>
                      Opções e Valores
                    </h3>
                    
                    <button
                      type="button"
                      onClick={addOption}
                      className="text-blue-600 dark:text-blue-400 font-medium text-sm hover:underline flex items-center gap-1"
                    >
                      <Plus size={16} /> Adicionar Opção
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        <tr>
                          <th className="px-4 py-3 font-medium w-12 text-center">Status</th>
                          <th className="px-4 py-3 font-medium">Nome / Descrição</th>
                          <th className="px-4 py-3 font-medium w-32">Preço (R$)</th>
                          <th className="px-4 py-3 font-medium w-28 text-center" title="Rastrear estoque desta opção">Estoque</th>
                          <th className="px-4 py-3 w-12 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {(!editingGroup.options || editingGroup.options.length === 0) && (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                              Nenhuma opção adicionada. Cique em "Adicionar Opção".
                            </td>
                          </tr>
                        )}
                        {editingGroup.options?.map((opt, index) => (
                          <tr key={index} className={!opt.active ? 'opacity-60 bg-slate-50 dark:bg-slate-800/20' : ''}>
                            <td className="px-4 py-2 text-center">
                              <input 
                                type="checkbox"
                                checked={opt.active !== false}
                                onChange={(e) => updateOption(index, 'active', e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                                title={opt.active !== false ? 'Desativar Opção' : 'Ativar Opção'}
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input 
                                type="text"
                                required
                                value={opt.name}
                                onChange={(e) => updateOption(index, 'name', e.target.value)}
                                className="w-full bg-transparent border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-slate-900 dark:text-slate-100"
                                placeholder="Ex: Bacon, Ketchup..."
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input 
                                type="text"
                                inputMode="decimal"
                                value={opt.price}
                                onChange={(e) => {
                                  const val = e.target.value.replace(',', '.');
                                  if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
                                    updateOption(index, 'price', e.target.value);
                                  }
                                }}
                                className="w-full bg-transparent border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-slate-900 dark:text-slate-100"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex flex-col gap-1 items-center">
                                <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer">
                                  <input 
                                    type="checkbox"
                                    checked={opt.trackStock || false}
                                    onChange={(e) => updateOption(index, 'trackStock', e.target.checked)}
                                    className="w-3 h-3"
                                  />
                                  <span>Controlar</span>
                                </label>
                                {opt.trackStock && (
                                  <input 
                                    type="text"
                                    inputMode="decimal"
                                    value={opt.stock}
                                    onChange={(e) => {
                                      const val = e.target.value.replace(',', '.');
                                      if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
                                        updateOption(index, 'stock', e.target.value);
                                      }
                                    }}
                                    className="w-16 text-center bg-transparent border border-slate-300 dark:border-slate-700 rounded px-1 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                                  />
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => removeOption(index)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 p-1.5 rounded transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-200 dark:border-slate-800 sticky bottom-0 bg-white dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-300 font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors flex items-center gap-2 shadow-sm"
                >
                  <Check size={18} />
                  Salvar Grupo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
