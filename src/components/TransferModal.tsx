import React, { useState } from 'react';
import {
  X,
  ArrowRight,
  Boxes,
  Plus,
  Minus,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  TrendingUp
} from 'lucide-react';
import { useStore } from '../services/store';
import { useSubmitGuard } from '../hooks/useSubmitGuard';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedSellerId?: string;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  preselectedSellerId
}) => {
  const {
    state,
    transferToSeller,
    getCentralLocation,
    getSellerLocation,
    getFlavorStock
  } = useStore();

  const { isSubmitting, guard } = useSubmitGuard();
  const centralLocation = getCentralLocation();
  const sellers = state.profiles.filter(p => p.role === 'seller' && p.status === 'active');

  const [selectedSellerId, setSelectedSellerId] = useState<string>(
    preselectedSellerId || (sellers[0]?.id || '')
  );
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const targetSeller = sellers.find(s => s.id === selectedSellerId);
  const sellerLocation = targetSeller ? getSellerLocation(targetSeller.id) : undefined;
  const activeFlavors = state.flavors.filter(f => f.active);

  const totalTransferUnits = (Object.values(quantities) as number[]).reduce<number>((sum, q) => sum + (Number(q) || 0), 0);

  const handleQtyChange = (flavorId: string, delta: number) => {
    const current = quantities[flavorId] || 0;
    const next = current + delta;
    if (next < 0) return;

    const centralAvail = getFlavorStock(centralLocation.id, flavorId);
    if (next > centralAvail) {
      setErrorMsg(`Estoque central insuficiente para este sabor (máx: ${centralAvail} un).`);
      return;
    }

    setErrorMsg(null);
    setQuantities(prev => ({
      ...prev,
      [flavorId]: next
    }));
  };

  // Smart replenishment algorithm
  const applySmartSuggestion = () => {
    if (!targetSeller || !sellerLocation) return;

    // Filter confirmed sales for this seller in the last 7 days
    const sellerSales = state.sales.filter(
      s => s.seller_id === targetSeller.id && s.status === 'confirmed'
    );
    const totalSold = sellerSales.reduce((s, sale) => s + sale.total_quantity, 0);
    // Estimated daily average (or at least 10 units if fresh)
    const avgDaily = Math.max(5, Math.round(totalSold / 3) || 12);
    const targetDays = 1; // 1 day coverage
    const targetStock = avgDaily * targetDays;
    
    // Current stock of seller
    const currentSellerStock = activeFlavors.reduce(
      (sum, f) => sum + getFlavorStock(sellerLocation.id, f.id),
      0
    );
    const needed = Math.max(0, targetStock - currentSellerStock);

    if (needed === 0) {
      setErrorMsg(`O vendedor já possui estoque suficiente (${currentSellerStock} un) para a cobertura de 1 dia.`);
      return;
    }

    // Distribute evenly among active flavors respecting central availability
    const perFlavor = Math.ceil(needed / activeFlavors.length);
    const suggested: Record<string, number> = {};

    activeFlavors.forEach(flavor => {
      const centralAvail = getFlavorStock(centralLocation.id, flavor.id);
      suggested[flavor.id] = Math.min(perFlavor, centralAvail);
    });

    setQuantities(suggested);
    setErrorMsg(null);
  };

  const handleTransfer = () => {
    guard(() => {
      if (!selectedSellerId) {
        setErrorMsg('Selecione um vendedor.');
        return;
      }

      if (totalTransferUnits <= 0) {
        setErrorMsg('Informe ao menos uma unidade para transferir.');
        return;
      }

      const items: { flavorId: string; quantity: number }[] = Object.entries(quantities)
        .filter(([_, qty]) => Number(qty) > 0)
        .map(([flavorId, quantity]) => ({ flavorId, quantity: Number(quantity) }));

      const res = transferToSeller({
        sellerId: selectedSellerId,
        items,
        notes
      });

      if (res.success) {
        setSuccessMsg(`Transferência de ${totalTransferUnits} brownies concluída com sucesso!`);
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setErrorMsg(res.error || 'Erro ao realizar a transferência.');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-[#E7E5E2] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E7E5E2] flex items-center justify-between bg-[#F6F5F3]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#141414] text-white flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#111111]">Separar Brownies para Vendedor</h3>
              <p className="text-[11px] text-[#6B6B6B]">Transferência de estoque central para vendedor</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#6B6B6B] hover:bg-[#EDEBE8] hover:text-[#111111] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-[#1B8A4F] text-xs flex items-start gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1. Seller Selection */}
          <div>
            <label className="block text-xs font-bold text-[#111111] mb-1.5">
              Selecione o Vendedor de Destino:
            </label>
            <select
              id="select-seller-transfer"
              value={selectedSellerId}
              onChange={e => {
                setSelectedSellerId(e.target.value);
                setQuantities({});
              }}
              className="w-full text-xs font-semibold bg-[#F6F5F3] border border-[#E7E5E2] rounded-xl px-3 py-2.5 text-[#111111] focus:outline-none focus:border-[#141414]"
            >
              {sellers.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.phone || s.email})
                </option>
              ))}
            </select>
          </div>

          {/* Smart Replenishment Trigger */}
          <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#A9761F]" />
              <div>
                <span className="text-xs font-bold text-[#111111] block">Sugestão de Reposição Inteligente</span>
                <span className="text-[11px] text-[#6B6B6B]">Calcula quantidade ideal para 1 dia de vendas</span>
              </div>
            </div>
            <button
              onClick={applySmartSuggestion}
              type="button"
              className="px-3 py-1.5 rounded-xl bg-[#A9761F] text-white text-xs font-bold hover:bg-[#8A6417] transition shadow-xs"
            >
              Preencher
            </button>
          </div>

          {/* Flavors list with comparative stock */}
          <div className="space-y-2.5">
            <span className="block text-xs font-bold text-[#111111]">
              Quantidade por Sabor:
            </span>

            {activeFlavors.map(flavor => {
              const centralAvail = getFlavorStock(centralLocation.id, flavor.id);
              const sellerCurrent = sellerLocation ? getFlavorStock(sellerLocation.id, flavor.id) : 0;
              const currentQty = quantities[flavor.id] || 0;

              return (
                <div
                  key={flavor.id}
                  className="p-3.5 rounded-2xl border border-[#E7E5E2] bg-white flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-xs text-[#111111] block">
                      Brownie de {flavor.name}
                    </span>
                    <div className="flex items-center gap-3 text-[11px] text-[#6B6B6B] mt-0.5">
                      <span>Central: <strong className="text-[#141414]">{centralAvail} un.</strong></span>
                      <span>•</span>
                      <span>Vendedor tem: <strong>{sellerCurrent} un.</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleQtyChange(flavor.id, -1)}
                      disabled={currentQty <= 0}
                      className="w-8 h-8 rounded-lg border border-[#E7E5E2] bg-white text-[#111111] hover:bg-[#EDEBE8] disabled:opacity-30 flex items-center justify-center transition"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center font-bold text-sm text-[#141414] tabular-nums">
                      {currentQty}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleQtyChange(flavor.id, 1)}
                      disabled={currentQty >= centralAvail}
                      className="w-8 h-8 rounded-lg bg-[#141414] text-white hover:bg-[#0A0A0A] disabled:opacity-30 flex items-center justify-center transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-semibold text-[#6B6B6B] mb-1">
              Observações (opcional):
            </label>
            <input
              type="text"
              placeholder="Ex: Entrega matinal para ponto no shopping"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full text-xs bg-[#F6F5F3] border border-[#E7E5E2] rounded-xl px-3 py-2 text-[#111111] focus:outline-none focus:border-[#141414]"
            />
          </div>

          {/* Footer Summary & Action */}
          <div className="pt-2 border-t border-[#E7E5E2] flex items-center justify-between">
            <div>
              <span className="text-xs text-[#6B6B6B] block">Total a transferir:</span>
              <span className="text-lg font-black text-[#141414]">{totalTransferUnits} brownies</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-[#E7E5E2] text-xs font-semibold text-[#6B6B6B] hover:bg-[#F6F5F3]"
              >
                Cancelar
              </button>
              <button
                type="button"
                id="btn-confirm-transfer"
                onClick={handleTransfer}
                disabled={totalTransferUnits <= 0 || isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-[#141414] text-white text-xs font-bold hover:bg-[#0A0A0A] transition disabled:opacity-40 shadow-sm flex items-center gap-1.5"
              >
                <span>Confirmar Saída</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
