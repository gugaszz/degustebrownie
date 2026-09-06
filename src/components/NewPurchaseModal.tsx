import React, { useState, useEffect } from 'react';
import { X, PackagePlus, Plus, Minus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useStore } from '../services/store';
import { formatCurrency } from '../utils/pix';

interface NewPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewPurchaseModal: React.FC<NewPurchaseModalProps> = ({ isOpen, onClose }) => {
  const { state, createPurchaseOrder } = useStore();
  const suppliers = state.suppliers.filter(s => s.active);
  const activeFlavors = state.flavors.filter(f => f.active);

  const [supplierId, setSupplierId] = useState<string>(suppliers[0]?.id || '');
  const [quantities, setQuantities] = useState<Record<string, number>>({
    'flv-nutella': 70,
    'flv-ninho': 70,
    'flv-brigadeiro': 60
  });
  const [unitCost, setUnitCost] = useState<number>(state.settings.default_purchase_cost || 4.0);
  const [expectedDate, setExpectedDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Keep the selected supplier in sync with the real supplier list: this modal is mounted
  // once and reused, so the initial `useState(suppliers[0]?.id)` above can go stale if no
  // supplier existed yet at that time (or the selected one was later removed). Without this,
  // the dropdown can visually show a supplier while the underlying value is still empty,
  // making "Selecione um fornecedor" fire even after the user picks one.
  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!supplierId || !suppliers.some(s => s.id === supplierId)) {
      setSupplierId(suppliers[0]?.id || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, suppliers.length]);

  if (!isOpen) return null;

  const totalUnits = (Object.values(quantities) as number[]).reduce<number>((s, q) => s + (Number(q) || 0), 0);
  const totalAmount = totalUnits * unitCost;

  const handleQtyChange = (flavorId: string, val: number) => {
    setQuantities(prev => ({
      ...prev,
      [flavorId]: Math.max(0, val)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      setErrorMsg('Selecione um fornecedor.');
      return;
    }
    if (totalUnits <= 0) {
      setErrorMsg('Informe ao menos uma unidade no pedido.');
      return;
    }

    const items: { flavorId: string; quantity: number; unitCost: number }[] = Object.entries(quantities)
      .filter(([_, q]) => Number(q) > 0)
      .map(([flavorId, quantity]) => ({
        flavorId,
        quantity: Number(quantity),
        unitCost: Number(unitCost)
      }));

    const res = createPurchaseOrder({
      supplierId,
      items,
      expectedDeliveryDate: expectedDate,
      notes
    });

    if (res.success) {
      setSuccessMsg(`Pedido de compra de ${totalUnits} brownies criado!`);
      setTimeout(onClose, 1400);
    } else {
      setErrorMsg(res.error || 'Erro ao criar pedido.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-[#E7E5E2] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E7E5E2] flex items-center justify-between bg-[#F6F5F3]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#141414] text-white flex items-center justify-center">
              <PackagePlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#111111]">Novo Pedido de Compra</h3>
              <p className="text-[11px] text-[#6B6B6B]">Reposição de estoque com fornecedor</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-[#6B6B6B] hover:bg-[#EDEBE8]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-green-50 text-[#1B8A4F] text-xs flex items-start gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {suppliers.length === 0 && (
            <div className="p-3 rounded-xl bg-amber-50 text-amber-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Nenhum fornecedor cadastrado ainda. Cadastre um fornecedor em "Fornecedores" antes de criar o pedido.</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1">Fornecedor:</label>
              <select
                value={supplierId}
                onChange={e => setSupplierId(e.target.value)}
                disabled={suppliers.length === 0}
                className="w-full text-xs bg-[#F6F5F3] border border-[#E7E5E2] rounded-xl px-3 py-2 text-[#111111] disabled:opacity-50"
              >
                <option value="" disabled>Selecione...</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1">Custo Unitário (R$):</label>
              <input
                type="number"
                step="0.10"
                min="0.1"
                value={unitCost}
                onChange={e => setUnitCost(parseFloat(e.target.value) || 4.0)}
                className="w-full text-xs bg-[#F6F5F3] border border-[#E7E5E2] rounded-xl px-3 py-2 text-[#111111]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#111111] mb-2">Quantidades por Sabor:</label>
            <div className="space-y-2">
              {activeFlavors.map(f => {
                const qty = quantities[f.id] || 0;
                return (
                  <div key={f.id} className="p-3 rounded-xl border border-[#E7E5E2] flex items-center justify-between">
                    <span className="text-xs font-bold text-[#111111]">{f.name}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleQtyChange(f.id, qty - 10)}
                        className="w-7 h-7 rounded-lg border border-[#E7E5E2] text-xs font-bold hover:bg-[#EDEBE8]"
                      >
                        -10
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={qty}
                        onChange={e => handleQtyChange(f.id, parseInt(e.target.value) || 0)}
                        className="w-16 text-center text-xs font-bold bg-[#F6F5F3] border border-[#E7E5E2] rounded-lg py-1"
                      />
                      <button
                        type="button"
                        onClick={() => handleQtyChange(f.id, qty + 10)}
                        className="w-7 h-7 rounded-lg bg-[#141414] text-white text-xs font-bold hover:bg-[#0A0A0A]"
                      >
                        +10
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1">Data Prevista de Entrega:</label>
              <input
                type="date"
                value={expectedDate}
                onChange={e => setExpectedDate(e.target.value)}
                className="w-full text-xs bg-[#F6F5F3] border border-[#E7E5E2] rounded-xl px-3 py-2 text-[#111111]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1">Observações:</label>
              <input
                type="text"
                placeholder="Ex: Entregar pela manhã"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full text-xs bg-[#F6F5F3] border border-[#E7E5E2] rounded-xl px-3 py-2 text-[#111111]"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-[#E7E5E2] flex items-center justify-between">
            <div>
              <span className="text-xs text-[#6B6B6B] block">{totalUnits} brownies total</span>
              <span className="text-lg font-black text-[#141414]">{formatCurrency(totalAmount)}</span>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="px-3.5 py-2 text-xs font-semibold text-[#6B6B6B]">
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#141414] text-white text-xs font-bold rounded-xl hover:bg-[#0A0A0A]"
              >
                Criar Pedido
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
