import React, { useState, useEffect } from 'react';
import { X, CalendarClock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useStore } from '../services/store';

interface NewReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewReservationModal: React.FC<NewReservationModalProps> = ({ isOpen, onClose }) => {
  const { state, currentUser, createReservation } = useStore();
  const isOwner = currentUser.role === 'owner';
  const sellers = state.profiles.filter(p => p.role === 'seller' && p.status === 'active');
  const activeFlavors = state.flavors.filter(f => f.active);

  const [sellerId, setSellerId] = useState<string>(currentUser.id);
  const [customerName, setCustomerName] = useState('');
  const [saleDate, setSaleDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Reset form every time the modal opens, and keep the seller selector valid for owners.
  useEffect(() => {
    if (!isOpen) return;
    setCustomerName('');
    setSaleDate(new Date().toISOString().split('T')[0]);
    setQuantities({});
    setNotes('');
    setErrorMsg(null);
    setSuccessMsg(null);
    setSellerId(isOwner ? (sellers[0]?.id || '') : currentUser.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const totalUnits = (Object.values(quantities) as number[]).reduce<number>((s, q) => s + (Number(q) || 0), 0);

  const handleQtyChange = (flavorId: string, val: number) => {
    setQuantities(prev => ({ ...prev, [flavorId]: Math.max(0, val) }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isOwner && !sellerId) {
      setErrorMsg('Selecione para qual vendedor é a reserva.');
      return;
    }
    if (!customerName.trim()) {
      setErrorMsg('Informe o nome do cliente.');
      return;
    }
    if (totalUnits <= 0) {
      setErrorMsg('Informe a quantidade de brownies por sabor.');
      return;
    }

    const items = Object.entries(quantities)
      .filter(([_, q]) => Number(q) > 0)
      .map(([flavorId, quantity]) => ({ flavorId, quantity: Number(quantity) }));

    const res = createReservation({
      sellerId: isOwner ? sellerId : currentUser.id,
      customerName,
      saleDate,
      items,
      notes
    });

    if (res.success) {
      setSuccessMsg(`Reserva de ${totalUnits} brownies registrada para ${customerName}!`);
      setTimeout(onClose, 1400);
    } else {
      setErrorMsg(res.error || 'Erro ao registrar a reserva.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-[#E7E5E2] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E7E5E2] flex items-center justify-between bg-[#F6F5F3]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#141414] text-white flex items-center justify-center">
              <CalendarClock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#111111]">Nova Reserva</h3>
              <p className="text-[11px] text-[#6B6B6B]">Encomenda de um cliente para entregar depois</p>
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

          {isOwner && (
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1">Vendedor:</label>
              <select
                value={sellerId}
                onChange={e => setSellerId(e.target.value)}
                disabled={sellers.length === 0}
                className="w-full text-xs bg-[#F6F5F3] border border-[#E7E5E2] rounded-xl px-3 py-2 text-[#111111] disabled:opacity-50"
              >
                <option value="" disabled>Selecione...</option>
                {sellers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#111111] mb-1">Nome do Cliente:</label>
            <input
              type="text"
              required
              placeholder="Ex: Maria Silva"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              className="w-full text-xs bg-[#F6F5F3] border border-[#E7E5E2] rounded-xl px-3 py-2 text-[#111111]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#111111] mb-2">Quantidade por Sabor:</label>
            <div className="space-y-2">
              {activeFlavors.map(f => {
                const qty = quantities[f.id] || 0;
                return (
                  <div key={f.id} className="p-3 rounded-xl border border-[#E7E5E2] flex items-center justify-between">
                    <span className="text-xs font-bold text-[#111111]">{f.name}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleQtyChange(f.id, qty - 1)}
                        className="w-7 h-7 rounded-lg border border-[#E7E5E2] text-xs font-bold hover:bg-[#EDEBE8]"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={qty}
                        onChange={e => handleQtyChange(f.id, parseInt(e.target.value) || 0)}
                        className="w-14 text-center text-xs font-bold bg-[#F6F5F3] border border-[#E7E5E2] rounded-lg py-1"
                      />
                      <button
                        type="button"
                        onClick={() => handleQtyChange(f.id, qty + 1)}
                        className="w-7 h-7 rounded-lg bg-[#141414] text-white text-xs font-bold hover:bg-[#0A0A0A]"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1">Data da Venda/Entrega:</label>
              <input
                type="date"
                required
                value={saleDate}
                onChange={e => setSaleDate(e.target.value)}
                className="w-full text-xs bg-[#F6F5F3] border border-[#E7E5E2] rounded-xl px-3 py-2 text-[#111111]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1">Observações:</label>
              <input
                type="text"
                placeholder="Ex: Entregar de manhã"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full text-xs bg-[#F6F5F3] border border-[#E7E5E2] rounded-xl px-3 py-2 text-[#111111]"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-[#E7E5E2] flex items-center justify-between">
            <span className="text-xs text-[#6B6B6B]">{totalUnits} brownies reservados</span>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="px-3.5 py-2 text-xs font-semibold text-[#6B6B6B]">
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#141414] text-white text-xs font-bold rounded-xl hover:bg-[#0A0A0A]"
              >
                Registrar Reserva
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
