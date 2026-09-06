import React from 'react';
import { BadgeDollarSign, CheckCircle2, Clock, Wallet } from 'lucide-react';
import { useStore } from '../../services/store';
import { formatCurrency, formatDateTime } from '../../utils/pix';

export const SellerCommissions: React.FC = () => {
  const { state, currentUser } = useStore();
  const sellerId = currentUser.id;

  const myCommissions = state.commissions.filter(c => c.seller_id === sellerId);

  const pendingAmount = myCommissions
    .filter(c => c.status === 'pending')
    .reduce((s, c) => s + c.amount, 0);

  const paidAmount = myCommissions
    .filter(c => c.status === 'paid')
    .reduce((s, c) => s + c.amount, 0);

  const totalEarned = pendingAmount + paidAmount;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-[#111111] tracking-tight">
          Minhas Comissões & Ganhos
        </h1>
        <p className="text-xs text-[#6B6B6B] mt-0.5">
          Extrato detalhado dos seus 50% de comissão sobre o lucro bruto das vendas
        </p>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-3xl bg-white border border-[#E7E5E2] shadow-xs">
          <span className="text-xs text-[#6B6B6B] font-medium block">Total Acumulado Ganho</span>
          <div className="text-2xl font-black text-[#111111] tabular-nums mt-1">
            {formatCurrency(totalEarned)}
          </div>
          <span className="text-[11px] text-[#6B6B6B] mt-0.5 block">{myCommissions.length} comissões geradas</span>
        </div>

        <div className="p-4 rounded-3xl bg-amber-50/70 border border-amber-200 shadow-xs">
          <span className="text-xs text-[#A9761F] font-bold block">Saldo Pendente a Receber</span>
          <div className="text-2xl font-black text-[#141414] tabular-nums mt-1">
            {formatCurrency(pendingAmount)}
          </div>
          <span className="text-[11px] text-[#6B6B6B] mt-0.5 block">Pago no próximo fechamento</span>
        </div>

        <div className="p-4 rounded-3xl bg-green-50/70 border border-green-200 shadow-xs">
          <span className="text-xs text-[#1B8A4F] font-bold block">Já Pago / Repassado</span>
          <div className="text-2xl font-black text-[#1B8A4F] tabular-nums mt-1">
            {formatCurrency(paidAmount)}
          </div>
          <span className="text-[11px] text-[#6B6B6B] mt-0.5 block">Transferido via Pix pelo proprietário</span>
        </div>
      </div>

      {/* Statement Table */}
      <div className="bg-white rounded-3xl border border-[#E7E5E2] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#E7E5E2]">
          <h3 className="text-sm font-bold text-[#111111]">Extrato das Vendas e Comissões</h3>
          <p className="text-xs text-[#6B6B6B]">Cada venda computa automaticamente sua comissão</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#F6F5F3] border-b border-[#E7E5E2] text-[#6B6B6B] uppercase text-[10px] font-bold">
                <th className="py-2.5 px-4">Data/Hora</th>
                <th className="py-2.5 px-3">Referência</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-4 text-right">Valor da Comissão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E5E2]/70">
              {myCommissions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-[#6B6B6B]">
                    Nenhum registro de comissão gerado até agora.
                  </td>
                </tr>
              ) : (
                myCommissions.map(c => {
                  const isPaid = c.status === 'paid';
                  return (
                    <tr key={c.id} className="hover:bg-[#F6F5F3]">
                      <td className="py-2.5 px-4 text-[#6B6B6B]">{formatDateTime(c.created_at)}</td>
                      <td className="py-2.5 px-3 font-semibold text-[#111111]">{c.description}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isPaid ? 'bg-green-100 text-[#1B8A4F]' : 'bg-amber-100 text-[#A9761F]'
                        }`}>
                          {isPaid ? 'Quitado' : 'Pendente'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-black text-[#1B8A4F] tabular-nums">
                        +{formatCurrency(c.amount)}
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
