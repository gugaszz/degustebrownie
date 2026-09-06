import React, { useState } from 'react';
import {
  BadgeDollarSign,
  CheckCircle2,
  Clock,
  Send,
  Calendar,
  Wallet,
  Receipt,
  Download
} from 'lucide-react';
import { useStore } from '../../services/store';
import { formatCurrency, formatDateTime } from '../../utils/pix';

interface OwnerCommissionsProps {
  onOpenPayout: (sellerId?: string) => void;
}

export const OwnerCommissions: React.FC<OwnerCommissionsProps> = ({ onOpenPayout }) => {
  const { state } = useStore();
  const [selectedTab, setSelectedTab] = useState<'pending' | 'history'>('pending');
  const [sellerFilter, setSellerFilter] = useState('all');

  const sellers = state.profiles.filter(p => p.role === 'seller');

  // Pending totals per seller
  const pendingBySeller = sellers.map(seller => {
    const entries = state.commissions.filter(
      c => c.seller_id === seller.id && c.status === 'pending'
    );
    const total = entries.reduce((s, c) => s + c.amount, 0);
    return {
      seller,
      entriesCount: entries.length,
      totalPending: total
    };
  });

  const grandTotalPending = pendingBySeller.reduce((s, item) => s + item.totalPending, 0);

  // Filtered commission entries
  const filteredEntries = state.commissions.filter(c => {
    if (selectedTab === 'pending' && c.status !== 'pending') return false;
    if (selectedTab === 'history' && c.status !== 'paid') return false;
    if (sellerFilter !== 'all' && c.seller_id !== sellerFilter) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#111111] tracking-tight">
            Repasse de Comissões
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-0.5">
            Fechamento de comissões (50% do lucro bruto) e registro de pagamentos aos vendedores
          </p>
        </div>
        <button
          onClick={() => onOpenPayout()}
          className="px-4 py-2 rounded-xl bg-[#1B8A4F] text-white text-xs font-bold hover:bg-[#145C36] transition flex items-center gap-1.5 shadow-sm"
        >
          <BadgeDollarSign className="w-3.5 h-3.5" />
          <span>Registrar Repasse / Pagamento</span>
        </button>
      </div>

      {/* Pending Balances Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {pendingBySeller.map(({ seller, entriesCount, totalPending }) => (
          <div key={seller.id} className="p-5 rounded-3xl bg-white border border-[#E7E5E2] shadow-xs space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-sm text-[#111111]">{seller.name}</h3>
                <span className="text-xs text-[#6B6B6B]">{entriesCount} vendas acumuladas</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                totalPending > 0 ? 'bg-amber-100 text-[#A9761F]' : 'bg-green-100 text-[#1B8A4F]'
              }`}>
                {totalPending > 0 ? 'Pendente' : 'Quitado'}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-[#F6F5F3]">
              <span className="text-[10px] text-[#6B6B6B] block font-medium">Saldo a Repassar:</span>
              <div className="text-xl font-black text-[#1B8A4F] tabular-nums mt-0.5">
                {formatCurrency(totalPending)}
              </div>
            </div>

            <button
              onClick={() => onOpenPayout(seller.id)}
              disabled={totalPending <= 0}
              className="w-full py-2 rounded-xl bg-[#141414] text-white text-xs font-bold hover:bg-[#0A0A0A] transition disabled:opacity-30 shadow-xs"
            >
              Fechar e Pagar
            </button>
          </div>
        ))}
      </div>

      {/* Tabs and filters */}
      <div className="bg-white rounded-3xl border border-[#E7E5E2] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#E7E5E2] flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedTab('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                selectedTab === 'pending'
                  ? 'bg-[#141414] text-white'
                  : 'bg-[#F6F5F3] text-[#6B6B6B] hover:text-[#111111]'
              }`}
            >
              Comissões Pendentes
            </button>
            <button
              onClick={() => setSelectedTab('history')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                selectedTab === 'history'
                  ? 'bg-[#141414] text-white'
                  : 'bg-[#F6F5F3] text-[#6B6B6B] hover:text-[#111111]'
              }`}
            >
              Histórico de Pagamentos
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#6B6B6B]">Filtrar vendedor:</span>
            <select
              value={sellerFilter}
              onChange={e => setSellerFilter(e.target.value)}
              className="px-3 py-1.5 bg-[#F6F5F3] border border-[#E7E5E2] rounded-xl text-[#111111]"
            >
              <option value="all">Todos</option>
              {sellers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#F6F5F3] border-b border-[#E7E5E2] text-[#6B6B6B] uppercase text-[10px] font-bold">
                <th className="py-2.5 px-4">Data/Hora</th>
                <th className="py-2.5 px-3">Vendedor</th>
                <th className="py-2.5 px-3">Descrição da Venda</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-4 text-right">Valor Comissão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E5E2]/70">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-[#6B6B6B]">
                    Nenhum registro de comissão encontrado para esta visualização.
                  </td>
                </tr>
              ) : (
                filteredEntries.map(entry => {
                  const isPaid = entry.status === 'paid';
                  return (
                    <tr key={entry.id} className="hover:bg-[#F6F5F3]">
                      <td className="py-2.5 px-4 text-[#6B6B6B]">
                        {formatDateTime(entry.created_at)}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-[#111111]">
                        {entry.seller_name}
                      </td>
                      <td className="py-2.5 px-3 text-[#111111]">
                        {entry.description}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isPaid ? 'bg-green-100 text-[#1B8A4F]' : 'bg-amber-100 text-[#A9761F]'
                        }`}>
                          {isPaid ? 'Pago' : 'Pendente'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-black text-[#1B8A4F] tabular-nums">
                        +{formatCurrency(entry.amount)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
