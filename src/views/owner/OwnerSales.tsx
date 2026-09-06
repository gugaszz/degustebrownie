import React, { useState } from 'react';
import {
  Search,
  Filter,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowUpDown,
  FileDown
} from 'lucide-react';
import { useStore } from '../../services/store';
import { formatCurrency, formatDateTime } from '../../utils/pix';
import { Sale } from '../../types';

export const OwnerSales: React.FC = () => {
  const { state, cancelSale, isDateInFilter } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeller, setSelectedSeller] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [saleToCancel, setSaleToCancel] = useState<Sale | null>(null);
  const [cancelReason, setCancelReason] = useState('Desistência do cliente antes da entrega');

  // Filter sales
  const sales = state.sales.filter(sale => {
    if (!isDateInFilter(sale.created_at)) return false;
    if (selectedSeller !== 'all' && sale.seller_id !== selectedSeller) return false;
    if (selectedStatus !== 'all' && sale.status !== selectedStatus) return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchSeller = sale.seller_name.toLowerCase().includes(term);
      const matchTxid = sale.pix_txid.toLowerCase().includes(term);
      const matchFlavors = sale.items.some(i => i.flavor_name.toLowerCase().includes(term));
      if (!matchSeller && !matchTxid && !matchFlavors) return false;
    }
    return true;
  });

  const totalFilteredAmount = sales
    .filter(s => s.status === 'confirmed')
    .reduce((sum, s) => sum + s.total_amount, 0);

  const totalFilteredUnits = sales
    .filter(s => s.status === 'confirmed')
    .reduce((sum, s) => sum + s.total_quantity, 0);

  const handleConfirmCancel = () => {
    if (!saleToCancel) return;
    cancelSale(saleToCancel.id, cancelReason);
    setSaleToCancel(null);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#111111] tracking-tight">
            Histórico de Vendas
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-0.5">
            Registro detalhado de faturamento, comissões, custos e estornos
          </p>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-[#E7E5E2] shadow-xs">
          <span className="text-xs text-[#6B6B6B] font-medium">Vendas no Filtro</span>
          <div className="text-xl font-bold text-[#111111] tabular-nums mt-0.5">
            {sales.length} transações
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-[#E7E5E2] shadow-xs">
          <span className="text-xs text-[#6B6B6B] font-medium">Brownies Vendidos</span>
          <div className="text-xl font-bold text-[#141414] tabular-nums mt-0.5">
            {totalFilteredUnits} unidades
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-[#E7E5E2] shadow-xs">
          <span className="text-xs text-[#6B6B6B] font-medium">Total Faturado</span>
          <div className="text-xl font-black text-[#1B8A4F] tabular-nums mt-0.5">
            {formatCurrency(totalFilteredAmount)}
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="p-4 rounded-3xl bg-white border border-[#E7E5E2] shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#6B6B6B] absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar por vendedor, Pix TXID ou sabor..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 bg-[#F6F5F3] border border-[#E7E5E2] rounded-xl text-[#111111] focus:outline-none focus:border-[#141414]"
            />
          </div>

          {/* Seller dropdown */}
          <div>
            <select
              value={selectedSeller}
              onChange={e => setSelectedSeller(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-[#F6F5F3] border border-[#E7E5E2] rounded-xl text-[#111111]"
            >
              <option value="all">Todos os Vendedores</option>
              {state.profiles.filter(p => p.role === 'seller').map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Status dropdown */}
          <div>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-[#F6F5F3] border border-[#E7E5E2] rounded-xl text-[#111111]"
            >
              <option value="all">Todos os Status</option>
              <option value="confirmed">Confirmadas</option>
              <option value="cancelled">Canceladas / Estornadas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-3xl border border-[#E7E5E2] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#F6F5F3] border-b border-[#E7E5E2] text-[#6B6B6B] uppercase text-[10px] font-bold">
                <th className="py-3 px-4">TXID / Data</th>
                <th className="py-3 px-3">Vendedor</th>
                <th className="py-3 px-3">Quantidade</th>
                <th className="py-3 px-3">Sabores</th>
                <th className="py-3 px-3">Total Venda</th>
                <th className="py-3 px-3">Custo (CMV)</th>
                <th className="py-3 px-3">Comissão</th>
                <th className="py-3 px-3">Lucro</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E5E2]/70">
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-[#6B6B6B]">
                    Nenhuma venda encontrada para o período ou filtros selecionados.
                  </td>
                </tr>
              ) : (
                sales.map(sale => {
                  const isCancelled = sale.status === 'cancelled';

                  return (
                    <tr key={sale.id} className={`hover:bg-[#F6F5F3] transition ${isCancelled ? 'opacity-50 bg-gray-50/60' : ''}`}>
                      <td className="py-3 px-4 font-mono font-semibold text-[#111111]">
                        {sale.pix_txid}
                        <span className="block text-[10px] text-[#6B6B6B] font-sans">
                          {formatDateTime(sale.created_at)}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-[#111111]">
                        {sale.seller_name}
                      </td>
                      <td className="py-3 px-3 font-semibold text-[#141414] tabular-nums">
                        {sale.total_quantity} un.
                      </td>
                      <td className="py-3 px-3 text-[#6B6B6B] max-w-[180px] truncate" title={sale.items.map(i => `${i.quantity}x ${i.flavor_name}`).join(', ')}>
                        {sale.items.map(i => `${i.quantity}x ${i.flavor_name}`).join(', ')}
                      </td>
                      <td className="py-3 px-3 font-black text-[#111111] tabular-nums">
                        {formatCurrency(sale.total_amount)}
                      </td>
                      <td className="py-3 px-3 text-[#6B6B6B] tabular-nums">
                        {formatCurrency(sale.total_cost)}
                      </td>
                      <td className="py-3 px-3 font-bold text-[#A9761F] tabular-nums">
                        {formatCurrency(sale.seller_commission)}
                      </td>
                      <td className="py-3 px-3 font-bold text-[#1B8A4F] tabular-nums">
                        {formatCurrency(sale.owner_gross_result)}
                      </td>
                      <td className="py-3 px-3">
                        {isCancelled ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-[#B3403D]">
                            Cancelada
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-[#1B8A4F] flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" /> Pix Confirmado
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {!isCancelled && (
                          <button
                            onClick={() => setSaleToCancel(sale)}
                            className="text-[11px] font-semibold text-[#6B6B6B] hover:text-[#B3403D] transition"
                            title="Estornar venda e repor estoque"
                          >
                            Estornar
                          </button>
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

      {/* Sale Cancellation Dialog */}
      {saleToCancel && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#E7E5E2] space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-[#B3403D] flex items-center justify-center mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h4 className="text-base font-bold text-[#111111]">Estornar esta venda?</h4>
              <p className="text-xs text-[#6B6B6B] mt-1 leading-relaxed">
                A venda <strong>{saleToCancel.pix_txid}</strong> ({formatCurrency(saleToCancel.total_amount)}) será cancelada. O estoque de <strong>{saleToCancel.total_quantity} brownies</strong> será devolvido automaticamente ao vendedor <strong>{saleToCancel.seller_name}</strong> e a comissão será revertida.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#111111] mb-1">Motivo do Estorno:</label>
              <input
                type="text"
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                className="w-full text-xs bg-[#F6F5F3] border border-[#E7E5E2] rounded-xl px-3 py-2 text-[#111111]"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setSaleToCancel(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#E7E5E2] text-xs font-semibold text-[#6B6B6B]"
              >
                Voltar
              </button>
              <button
                onClick={handleConfirmCancel}
                className="flex-1 py-2.5 rounded-xl bg-[#B3403D] text-white text-xs font-bold hover:bg-[#8A2E2E]"
              >
                Confirmar Estorno
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
