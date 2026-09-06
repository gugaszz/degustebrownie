import React, { useState } from 'react';
import { Sparkles, Plus, Check, Tag, DollarSign, Trash2 } from 'lucide-react';
import { useStore } from '../../services/store';
import { formatCurrency } from '../../utils/pix';

export const OwnerProducts: React.FC = () => {
  const { state, createFlavor, deleteFlavor } = useStore();
  const [newFlavorName, setNewFlavorName] = useState('');
  const [newFlavorDesc, setNewFlavorDesc] = useState('');
  const [isAddingFlavor, setIsAddingFlavor] = useState(false);
  const [flavorToDelete, setFlavorToDelete] = useState<string | null>(null);

  const handleAddFlavor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFlavorName.trim()) return;
    createFlavor(newFlavorName);
    setNewFlavorName('');
    setNewFlavorDesc('');
    setIsAddingFlavor(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#111111] tracking-tight">
            Produtos, Sabores & Precificação
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-0.5">
            Gerencie o catálogo de brownies e a tabela progressiva de preços
          </p>
        </div>
        <button
          onClick={() => setIsAddingFlavor(true)}
          className="px-4 py-2 rounded-xl bg-[#141414] text-white text-xs font-bold hover:bg-[#0A0A0A] transition flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Novo Sabor</span>
        </button>
      </div>

      {/* Pricing Rule Card */}
      <div className="p-5 rounded-3xl bg-white border border-[#E7E5E2] shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-[#141414]" />
          <h3 className="font-bold text-sm text-[#111111]">Tabela de Preços e Promoções em Vigor</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-[#F6F5F3] border border-[#E7E5E2]">
            <span className="text-[10px] text-[#6B6B6B] block font-medium">1 Unidade Avulsa</span>
            <strong className="text-lg font-black text-[#111111] tabular-nums mt-0.5 block">
              {formatCurrency(10.0)}
            </strong>
            <span className="text-[11px] text-[#6B6B6B]">Lucro bruto: R$ 6,00 (Vendedor R$ 3 / Dono R$ 3)</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200">
            <span className="text-[10px] text-[#A9761F] block font-bold">A partir de 2 Unidades</span>
            <strong className="text-lg font-black text-[#141414] tabular-nums mt-0.5 block">
              {formatCurrency(9.0)} <span className="text-xs font-normal text-[#6B6B6B]">/unidade</span>
            </strong>
            <span className="text-[11px] text-[#6B6B6B]">Lucro bruto: R$ 5,00/un (Vendedor R$ 2,50 / Dono R$ 2,50)</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#F6F5F3] border border-[#E7E5E2]">
            <span className="text-[10px] text-[#6B6B6B] block font-medium">Custo Médio de Aquisição</span>
            <strong className="text-lg font-black text-[#1B8A4F] tabular-nums mt-0.5 block">
              {formatCurrency(state.settings.default_purchase_cost || 4.0)}
            </strong>
            <span className="text-[11px] text-[#6B6B6B]">Pago diretamente à confeitaria fornecedora</span>
          </div>
        </div>
      </div>

      {/* Flavors Grid */}
      <div className="space-y-3">
        <h3 className="font-bold text-sm text-[#111111]">Sabores Cadastrados no Cardápio</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {state.flavors.map(flavor => (
            <div key={flavor.id} className="p-5 rounded-3xl bg-white border border-[#E7E5E2] shadow-xs space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-sm text-[#111111]">{flavor.name}</h4>
                  <p className="text-xs text-[#6B6B6B] mt-0.5">{flavor.description || 'Brownie gourmet recheado'}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-[#1B8A4F]">
                    Ativo
                  </span>
                  <button
                    onClick={() => setFlavorToDelete(flavor.id)}
                    className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition"
                    title="Remover sabor do catálogo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-[#E7E5E2] flex items-center justify-between text-xs text-[#6B6B6B]">
                <span>Preço unitário:</span>
                <span className="font-bold text-[#111111]">R$ 10,00</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Delete Flavor Modal */}
      {flavorToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-[#E7E5E2] space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-sm text-[#111111]">Excluir Sabor?</h3>
              <p className="text-xs text-[#6B6B6B] mt-1">
                Deseja remover este sabor do cardápio? Os saldos correspondentes deste sabor também serão limpos.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setFlavorToDelete(null)}
                className="flex-1 py-2 rounded-xl border border-[#E7E5E2] text-xs font-semibold text-[#6B6B6B] hover:bg-[#F6F5F3]"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  deleteFlavor(flavorToDelete);
                  setFlavorToDelete(null);
                }}
                className="flex-1 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Flavor Modal */}
      {isAddingFlavor && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-[#E7E5E2] space-y-4">
            <h3 className="font-bold text-sm text-[#111111]">Adicionar Novo Sabor</h3>
            <form onSubmit={handleAddFlavor} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">Nome do Sabor:</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Doce de Leite com Nozes"
                  value={newFlavorName}
                  onChange={e => setNewFlavorName(e.target.value)}
                  className="w-full text-xs bg-[#F6F5F3] border border-[#E7E5E2] rounded-xl px-3 py-2 text-[#111111]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">Descrição:</label>
                <input
                  type="text"
                  placeholder="Ex: Recheio cremoso e crocante"
                  value={newFlavorDesc}
                  onChange={e => setNewFlavorDesc(e.target.value)}
                  className="w-full text-xs bg-[#F6F5F3] border border-[#E7E5E2] rounded-xl px-3 py-2 text-[#111111]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingFlavor(false)}
                  className="px-3 py-2 text-xs font-semibold text-[#6B6B6B]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#141414] text-white text-xs font-bold rounded-xl"
                >
                  Salvar Sabor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
