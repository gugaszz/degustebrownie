import React, { useState } from 'react';
import { Search, CheckCircle2, RotateCcw } from 'lucide-react';
import { useStore } from '../../services/store';
import { formatCurrency, formatDateTime } from '../../utils/pix';

export const SellerSales: React.FC = () => {
  const { state, currentUser } = useStore();
  const [searchTerm, setSearchTerm] = useState('');

  const mySales = state.sales.filter(s => s.seller_id === currentUser.id);

  const filteredSales = mySales.filter(s => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      s.pix_txid.toLowerCase().includes(term) ||
      s.items.some(i => i.flavor_name.toLowerCase().includes(term))
    );
  });

  const totalAmount = mySales
    .filter(s => s.status === 'confirmed')
    .reduce((sum, s) => sum + s.total_amount, 0);

  const totalCommission = mySales
    .filter(s => s.status === 'confirmed')
    .reduce((sum, s) => sum + s.seller_commission, 0);

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#201A17] tracking-tight">
            Minhas Vendas
          </h1>
          <p className="text-xs text-[#746A65] mt-0.5">
            Registro completo de todas as suas vendas confirmadas e comissões acumuladas
          </p>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-3xl bg-white border border-[#EAE5E2] shadow-xs">
          <span className="text-xs text-[#746A65] font-medium block">Total Comercializado</span>
          <div className="text-2xl font-black text-[#201A17] tabular-nums mt-1">
            {formatCurrency(totalAmount)}
          </div>
          <span className="text-[11px] text-[#746A65] mt-0.5 block">{mySales.length} transações</span>
        </div>
        <div className="p-4 rounded-3xl bg-white border border-[#EAE5E2] shadow-xs">
          <span className="text-xs text-[#746A65] font-medium block">Total de Comissões Ganhas</span>
          <div className="text-2xl font-black text-[#237A4B] tabular-nums mt-1">
            {formatCurrency(totalCommission)}
          </div>
          <span className="text-[11px] text-[#237A4B] mt-0.5 block font-semibold">50% do lucro bruto</span>
        </div>
      </div>

      {/* Filter / Search */}
      <div className="p-3 bg-white rounded-2xl border border-[#EAE5E2] shadow-xs">
        <input
          type="text"
          placeholder="Filtrar por código Pix TXID ou sabor..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full text-xs px-3 py-2 bg-[#F8F6F4] border border-[#EAE5E2] rounded-xl text-[#201A17] focus:outline-none"
        />
      </div>

      {/* Sales List */}
      <div className="bg-white rounded-3xl border border-[#EAE5E2] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#F8F6F4] border-b border-[#EAE5E2] text-[#746A65] uppercase text-[10px] font-bold">
                <th className="py-3 px-4">TXID / Horário</th>
                <th className="py-3 px-3">Sabores</th>
                <th className="py-3 px-3">Qtd</th>
                <th className="py-3 px-3">Valor Total</th>
                <th className="py-3 px-3">Sua Comissão</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE5E2]/70">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#746A65]">
                    Nenhuma venda encontrada.
                  </td>
                </tr>
              ) : (
                filteredSales.map(sale => {
                  const isCancelled = sale.status === 'cancelled';
                  return (
                    <tr key={sale.id} className="hover:bg-[#F8F6F4]">
                      <td className="py-3 px-4 font-mono font-bold text-[#201A17]">
                        {sale.pix_txid}
                        <span className="block text-[10px] text-[#746A65] font-sans">
                          {formatDateTime(sale.created_at)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[#201A17]">
                        {sale.items.map(i => `${i.quantity}x ${i.flavor_name}`).join(', ')}
                      </td>
                      <td className="py-3 px-3 font-semibold text-[#3B241C] tabular-nums">
                        {sale.total_quantity} un.
                      </td>
                      <td className="py-3 px-3 font-black text-[#201A17] tabular-nums">
                        {formatCurrency(sale.total_amount)}
                      </td>
                      <td className="py-3 px-3 font-bold text-[#237A4B] tabular-nums">
                        +{formatCurrency(sale.seller_commission)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isCancelled ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-[#B33A3A]">
                            Cancelada
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-[#237A4B] inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Pix Confirmado
                          </span>
                        )}
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
