import React, { useState } from 'react';
import { X, BadgeDollarSign, CheckCircle2, AlertCircle } from 'lucide-react';
import { useStore } from '../services/store';
import { formatCurrency, formatDateTime } from '../utils/pix';

interface PayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  sellerId?: string;
}

export const PayoutModal: React.FC<PayoutModalProps> = ({ isOpen, onClose, sellerId }) => {
  const { state, payCommission } = useStore();
  const sellers = state.profiles.filter(p => p.role === 'seller');

  const [selectedSellerId, setSelectedSellerId] = useState<string>(sellerId || sellers[0]?.id || '');
  const [paymentMethod, setPaymentMethod] = useState<'Pix' | 'Dinheiro' | 'Transferência'>('Pix');
  const [notes, setNotes] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentSeller = sellers.find(s => s.id === selectedSellerId);
  const pendingEntries = state.commissions.filter(
    c => c.seller_id === selectedSellerId && c.status === 'pending'
  );

  const totalPending = pendingEntries.reduce((sum, e) => sum + e.amount, 0);

  const handlePayout = () => {
    if (pendingEntries.length === 0) {
      setErrorMsg('Não há comissões pendentes para este vendedor.');
      return;
    }

    const entryIds = pendingEntries.map(e => e.id);
    const res = payCommission({
      sellerId: selectedSellerId,
      entryIds,
      paymentMethod,
      notes
    });

    if (res.success) {
      setSuccessMsg(`Pagamento de ${formatCurrency(totalPending)} registrado com sucesso!`);
      setTimeout(onClose, 1400);
    } else {
      setErrorMsg(res.error || 'Erro ao processar repasse.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-[#EAE5E2] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#EAE5E2] flex items-center justify-between bg-[#F8F6F4]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#237A4B] text-white flex items-center justify-center">
              <BadgeDollarSign className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#201A17]">Pagamento de Comissão</h3>
              <p className="text-[11px] text-[#746A65]">Fechamento de repasse aos vendedores</p>
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
              onChange={e => setSelectedSellerId(e.target.value)}
              className="w-full text-xs bg-[#F8F6F4] border border-[#EAE5E2] rounded-xl px-3 py-2 text-[#201A17]"
            >
              {sellers.map(s => {
                const sPending = state.commissions
                  .filter(c => c.seller_id === s.id && c.status === 'pending')
                  .reduce((sum, c) => sum + c.amount, 0);
                return (
                  <option key={s.id} value={s.id}>
                    {s.name} - Pendente: {formatCurrency(sPending)}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="p-4 rounded-2xl bg-[#F8F6F4] border border-[#EAE5E2] flex items-center justify-between">
            <div>
              <span className="text-xs text-[#746A65] block">Vendas acumuladas:</span>
              <span className="font-bold text-sm text-[#201A17]">{pendingEntries.length} vendas aguardando</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-[#746A65] block">Total a Pagar:</span>
              <span className="text-xl font-black text-[#237A4B] tabular-nums">
                {formatCurrency(totalPending)}
              </span>
            </div>
          </div>

          <div className="max-h-36 overflow-y-auto space-y-1.5 border border-[#EAE5E2] rounded-xl p-2 bg-white">
            <span className="text-[10px] uppercase font-bold text-[#746A65] px-1 block">Lançamentos Incluídos:</span>
            {pendingEntries.length === 0 ? (
              <p className="text-xs text-[#746A65] text-center py-2">Nenhum valor pendente.</p>
            ) : (
              pendingEntries.map(e => (
                <div key={e.id} className="flex justify-between items-center text-xs p-1.5 hover:bg-[#F8F6F4] rounded-lg">
                  <div>
                    <span className="font-semibold text-[#201A17] block">{e.description}</span>
                    <span className="text-[10px] text-[#746A65]">{formatDateTime(e.created_at)}</span>
                  </div>
                  <span className="font-bold text-[#237A4B] tabular-nums">+{formatCurrency(e.amount)}</span>
                </div>
              ))
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#201A17] mb-1">Forma de Pagamento:</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as any)}
                className="w-full text-xs bg-[#F8F6F4] border border-[#EAE5E2] rounded-xl px-3 py-2 text-[#201A17]"
              >
                <option value="Pix">Pix</option>
                <option value="Dinheiro">Dinheiro em Espécie</option>
                <option value="Transferência">Transferência Bancária</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#201A17] mb-1">Observações do Recibo:</label>
              <input
                type="text"
                placeholder="Ex: Semana 36/2026"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full text-xs bg-[#F8F6F4] border border-[#EAE5E2] rounded-xl px-3 py-2 text-[#201A17]"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-[#EAE5E2] flex justify-end gap-2">
            <button onClick={onClose} className="px-3.5 py-2 text-xs font-semibold text-[#746A65]">
              Cancelar
            </button>
            <button
              onClick={handlePayout}
              disabled={totalPending <= 0}
              className="px-5 py-2 bg-[#237A4B] text-white text-xs font-bold rounded-xl hover:bg-[#1b633d] disabled:opacity-40"
            >
              Confirmar Pagamento
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
