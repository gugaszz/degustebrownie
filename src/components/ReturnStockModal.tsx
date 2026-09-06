import React, { useState } from 'react';
import { X, ArrowDownLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useStore } from '../services/store';

interface ReturnStockModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReturnStockModal: React.FC<ReturnStockModalProps> = ({ isOpen, onClose }) => {
  const { state, returnToCentral, getSellerLocation, getFlavorStock } = useStore();
  const sellers = state.profiles.filter(p => p.role === 'seller' && p.status === 'active');

  const [selectedSellerId, setSelectedSellerId] = useState<string>(sellers[0]?.id || '');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const sellerLocation = selectedSellerId ? getSellerLocation(selectedSellerId) : undefined;
  const activeFlavors = state.flavors.filter(f => f.active);
  const totalReturnUnits = (Object.values(quantities) as number[]).reduce<number>((sum, q) => sum + (Number(q) || 0), 0);

  const handleQtyChange = (flavorId: string, val: number) => {
    const avail = sellerLocation ? getFlavorStock(sellerLocation.id, flavorId) : 0;
    const qty = Math.max(0, Math.min(val, avail));
    setQuantities(prev => ({ ...prev, [flavorId]: qty }));
  };

  const handleReturn = () => {
    if (totalReturnUnits <= 0) {
      setErrorMsg('Informe ao menos uma unidade para devolver.');
      return;
    }

    const items: { flavorId: string; quantity: number }[] = Object.entries(quantities)
      .filter(([_, qty]) => Number(qty) > 0)
      .map(([flavorId, quantity]) => ({ flavorId, quantity: Number(quantity) }));

    const res = returnToCentral({
      sellerId: selectedSellerId,
      items,
      notes
    });

    if (res.success) {
      setSuccessMsg(`Devolução de ${totalReturnUnits} brownies registrada com sucesso!`);
      setTimeout(onClose, 1400);
    } else {
      setErrorMsg(res.error || 'Erro ao processar devolução.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-[#EAE5E2] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#EAE5E2] flex items-center justify-between bg-[#F8F6F4]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#3B241C] text-white flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#201A17]">Devolver Brownies ao Central</h3>
              <p className="text-[11px] text-[#746A65]">Retorno de estoque do vendedor para o proprietário</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-[#746A65] hover:bg-[#EEE7E3]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-green-50 text-[#237A4B] text-xs flex items-start gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#201A17] mb-1">Vendedor:</label>
            <select
              value={selectedSellerId}
              onChange={e => {
                setSelectedSellerId(e.target.value);
                setQuantities({});
              }}
              className="w-full text-xs bg-[#F8F6F4] border border-[#EAE5E2] rounded-xl px-3 py-2.5 text-[#201A17]"
            >
              {sellers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2.5">
            <span className="block text-xs font-bold text-[#201A17]">Unidades a devolver por sabor:</span>
            {activeFlavors.map(flavor => {
              const stock = sellerLocation ? getFlavorStock(sellerLocation.id, flavor.id) : 0;
              const current = quantities[flavor.id] || 0;
              return (
                <div key={flavor.id} className="p-3 rounded-xl border border-[#EAE5E2] flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-[#201A17] block">{flavor.name}</span>
                    <span className="text-[11px] text-[#746A65]">Com o vendedor: {stock} un.</span>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={stock}
                    value={current}
                    onChange={e => handleQtyChange(flavor.id, parseInt(e.target.value) || 0)}
                    className="w-16 text-center text-xs font-bold bg-[#F8F6F4] border border-[#EAE5E2] rounded-lg py-1.5"
                  />
                </div>
              );
            })}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#746A65] mb-1">Motivo / Observações:</label>
            <input
              type="text"
              placeholder="Ex: Fim do turno, sobra do dia"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full text-xs bg-[#F8F6F4] border border-[#EAE5E2] rounded-xl px-3 py-2 text-[#201A17]"
            />
          </div>

          <div className="pt-2 border-t border-[#EAE5E2] flex items-center justify-between">
            <span className="text-xs text-[#746A65]">Total: <strong className="text-[#3B241C] text-sm">{totalReturnUnits} un.</strong></span>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-3.5 py-2 text-xs font-semibold text-[#746A65]">Cancelar</button>
              <button
                onClick={handleReturn}
                disabled={totalReturnUnits <= 0}
                className="px-4 py-2 bg-[#3B241C] text-white text-xs font-bold rounded-xl disabled:opacity-40"
              >
                Confirmar Devolução
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
