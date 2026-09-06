import React, { useState } from 'react';
import { X, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useStore } from '../services/store';

interface LossModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LossModal: React.FC<LossModalProps> = ({ isOpen, onClose }) => {
  const { state, registerLoss, getFlavorStock } = useStore();

  const [locationId, setLocationId] = useState<string>(state.locations[0]?.id || '');
  const [flavorId, setFlavorId] = useState<string>(state.flavors[0]?.id || '');
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<'Produto danificado' | 'Produto perdido' | 'Produto vencido' | 'Erro de estoque'>('Produto danificado');
  const [notes, setNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const activeLocations = state.locations.filter(l => l.active);
  const activeFlavors = state.flavors.filter(f => f.active);
  const currentStock = getFlavorStock(locationId, flavorId);

  const handleSubmit = () => {
    if (quantity <= 0) {
      setErrorMsg('A quantidade deve ser maior que zero.');
      return;
    }
    if (quantity > currentStock) {
      setErrorMsg(`Estoque insuficiente no local selecionado (${currentStock} un).`);
      return;
    }

    const res = registerLoss({
      locationId,
      flavorId,
      quantity,
      reason,
      notes
    });

    if (res.success) {
      setSuccessMsg('Perda registrada e estoque atualizado com sucesso.');
      setTimeout(onClose, 1400);
    } else {
      setErrorMsg(res.error || 'Erro ao registrar perda.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-[#E7E5E2] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E7E5E2] flex items-center justify-between bg-[#F6F5F3]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#B3403D] text-white flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#111111]">Registrar Perda de Estoque</h3>
              <p className="text-[11px] text-[#6B6B6B]">Avarias, vencimento ou perdas físicas</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-[#6B6B6B] hover:bg-[#EDEBE8]">
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
            <div className="p-3 rounded-xl bg-green-50 text-[#1B8A4F] text-xs flex items-start gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#111111] mb-1">Local do Estoque:</label>
            <select
              value={locationId}
              onChange={e => setLocationId(e.target.value)}
              className="w-full text-xs bg-[#F6F5F3] border border-[#E7E5E2] rounded-xl px-3 py-2 text-[#111111]"
            >
              {activeLocations.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1">Sabor:</label>
              <select
                value={flavorId}
                onChange={e => setFlavorId(e.target.value)}
                className="w-full text-xs bg-[#F6F5F3] border border-[#E7E5E2] rounded-xl px-3 py-2 text-[#111111]"
              >
                {activeFlavors.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1">Quantidade:</label>
              <input
                type="number"
                min={1}
                max={currentStock}
                value={quantity}
                onChange={e => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full text-xs bg-[#F6F5F3] border border-[#E7E5E2] rounded-xl px-3 py-2 text-[#111111]"
              />
            </div>
          </div>

          <div className="text-xs text-[#6B6B6B] bg-[#F6F5F3] p-2.5 rounded-xl">
            Estoque atual neste local: <strong className="text-[#141414]">{currentStock} un.</strong>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#111111] mb-1">Motivo Obrigatório:</label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value as any)}
              className="w-full text-xs bg-[#F6F5F3] border border-[#E7E5E2] rounded-xl px-3 py-2 text-[#111111]"
            >
              <option value="Produto danificado">Produto danificado</option>
              <option value="Produto vencido">Produto vencido</option>
              <option value="Produto perdido">Produto perdido</option>
              <option value="Erro de estoque">Erro de contagem de estoque</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#6B6B6B] mb-1">Detalhes adicionais:</label>
            <input
              type="text"
              placeholder="Ex: Embalagem violada no transporte"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full text-xs bg-[#F6F5F3] border border-[#E7E5E2] rounded-xl px-3 py-2 text-[#111111]"
            />
          </div>

          <div className="pt-2 border-t border-[#E7E5E2] flex justify-end gap-2">
            <button onClick={onClose} className="px-3.5 py-2 text-xs font-semibold text-[#6B6B6B]">Cancelar</button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-[#B3403D] text-white text-xs font-bold rounded-xl hover:bg-[#8A2E2E]"
            >
              Confirmar Baixa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
