import React from 'react';
import {
  DollarSign,
  Boxes,
  TrendingUp,
  BadgeDollarSign,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  CalendarClock
} from 'lucide-react';
import { useStore } from '../../services/store';
import { formatCurrency, formatDateTime } from '../../utils/pix';

interface SellerHomeProps {
  onNavigateTab: (tabId: string) => void;
}

export const SellerHome: React.FC<SellerHomeProps> = ({ onNavigateTab }) => {
  const { state, currentUser, getFlavorStock } = useStore();
  const sellerId = currentUser.id;

  const sellerLocation = state.locations.find(l => l.seller_id === sellerId);
  const activeFlavors = state.flavors.filter(f => f.active);

  // Today's date filter
  const todayStr = new Date().toISOString().slice(0, 10);
  const todaySales = state.sales.filter(
    s => s.seller_id === sellerId && s.status === 'confirmed' && s.created_at.startsWith(todayStr)
  );

  const todayRevenue = todaySales.reduce((sum, s) => sum + s.total_amount, 0);
  const todayUnits = todaySales.reduce((sum, s) => sum + s.total_quantity, 0);
  const todayCommission = todaySales.reduce((sum, s) => sum + s.seller_commission, 0);

  // Total pending commission for this seller
  const pendingCommissions = state.commissions.filter(
    c => c.seller_id === sellerId && c.status === 'pending'
  );
  const totalPending = pendingCommissions.reduce((sum, c) => sum + c.amount, 0);

  // Total stock with seller
  const totalStock = sellerLocation
    ? activeFlavors.reduce((sum, f) => sum + getFlavorStock(sellerLocation.id, f.id), 0)
    : 0;

  // Recent 5 sales
  const myRecentSales = state.sales
    .filter(s => s.seller_id === sellerId)
    .slice(0, 5);

  // Pending reservations for this seller
  const myPendingReservations = state.reservations.filter(
    r => r.seller_id === sellerId && r.status === 'pending'
  );
  const pendingReservationUnits = myPendingReservations.reduce((sum, r) => sum + r.total_quantity, 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Greeting Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E7E5E2] shadow-xs space-y-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#1B8A4F] text-[11px] font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Terminal Ativo do Vendedor</span>
          </div>
          <h1 className="font-display text-xl sm:text-2xl font-semibold text-[#111111] tracking-tight">
            Olá, {currentUser.name}!
          </h1>
          <p className="text-xs text-[#6B6B6B] max-w-lg">
            Registre vendas em segundos gerando o QR Code Pix com sua comissão de 50% garantida por venda. Use o botão flutuante no canto da tela para começar.
          </p>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Vendas Hoje */}
        <div className="p-4 rounded-3xl bg-white border border-[#E7E5E2] shadow-xs">
          <span className="text-xs text-[#6B6B6B] font-medium block">Vendido Hoje</span>
          <div className="font-display text-2xl font-semibold text-[#111111] tabular-nums mt-1">
            {formatCurrency(todayRevenue)}
          </div>
          <span className="text-[11px] text-[#6B6B6B] mt-0.5 block">{todayUnits} brownies</span>
        </div>

        {/* Minha Comissão Hoje */}
        <div className="p-4 rounded-3xl bg-white border border-[#E7E5E2] shadow-xs">
          <span className="text-xs text-[#6B6B6B] font-medium block">Minha Comissão Hoje</span>
          <div className="font-display text-2xl font-semibold text-[#1B8A4F] tabular-nums mt-1">
            {formatCurrency(todayCommission)}
          </div>
          <span className="text-[11px] text-[#1B8A4F] mt-0.5 block font-semibold">Ganhos de hoje</span>
        </div>

        {/* Meu Estoque */}
        <div className="p-4 rounded-3xl bg-white border border-[#E7E5E2] shadow-xs">
          <span className="text-xs text-[#6B6B6B] font-medium block">Estoque Comigo</span>
          <div className="font-display text-2xl font-semibold text-[#141414] tabular-nums mt-1">
            {totalStock} brownies
          </div>
          <span className="text-[11px] text-[#6B6B6B] mt-0.5 block">Prontos para venda</span>
        </div>

        {/* Saldo a Receber */}
        <div className="p-4 rounded-3xl bg-white border border-[#E7E5E2] shadow-xs">
          <span className="text-xs text-[#6B6B6B] font-medium block">Saldo a Receber</span>
          <div className="font-display text-2xl font-semibold text-[#A9761F] tabular-nums mt-1">
            {formatCurrency(totalPending)}
          </div>
          <span className="text-[11px] text-[#6B6B6B] mt-0.5 block">Comissão acumulada</span>
        </div>
      </div>

      {/* Pending Reservations Banner */}
      {myPendingReservations.length > 0 && (
        <button
          onClick={() => onNavigateTab('seller_reservations')}
          className="w-full text-left p-4 rounded-3xl bg-amber-50 border border-amber-200/80 flex items-center justify-between gap-3 hover:bg-amber-100/60 transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-100 text-[#A9761F] flex items-center justify-center shrink-0">
              <CalendarClock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-[#111111] block">
                {myPendingReservations.length} reserva{myPendingReservations.length !== 1 ? 's' : ''} pendente{myPendingReservations.length !== 1 ? 's' : ''}
              </span>
              <span className="text-[11px] text-[#9A9A9A]">{pendingReservationUnits} brownies para entregar aos clientes</span>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-[#A9761F] shrink-0" />
        </button>
      )}

      {/* Stock By Flavor Cards */}
      <div className="bg-white rounded-3xl p-5 border border-[#E7E5E2] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#111111]">Meu Estoque Atual por Sabor</h3>
            <p className="text-xs text-[#6B6B6B]">Quantidades sob sua posse no momento</p>
          </div>
          {totalStock < 10 && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-[#A9761F] flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              Solicite reposição ao proprietário
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {activeFlavors.map(flavor => {
            const stock = sellerLocation ? getFlavorStock(sellerLocation.id, flavor.id) : 0;
            const isZero = stock <= 0;

            return (
              <div
                key={flavor.id}
                className={`p-4 rounded-2xl border transition ${
                  isZero ? 'bg-red-50/50 border-red-200' : 'bg-[#F6F5F3] border-[#E7E5E2]'
                }`}
              >
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-xs text-[#111111]">{flavor.name}</h4>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      isZero ? 'bg-red-100 text-[#B3403D]' : 'bg-green-100 text-[#1B8A4F]'
                    }`}
                  >
                    {isZero ? 'Esgotado' : 'Disponível'}
                  </span>
                </div>
                <div className="text-2xl font-black text-[#141414] tabular-nums mt-2">
                  {stock} <span className="text-xs font-normal text-[#6B6B6B]">unidades</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Sales by this Seller */}
      <div className="bg-white rounded-3xl p-5 border border-[#E7E5E2] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#111111]">Minhas Vendas Recentes</h3>
            <p className="text-xs text-[#6B6B6B]">Últimas confirmações de Pix</p>
          </div>
          <button
            onClick={() => onNavigateTab('sales')}
            className="text-xs font-bold text-[#141414] hover:underline flex items-center gap-1"
          >
            Ver histórico completo <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {myRecentSales.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#6B6B6B]">
            Nenhuma venda realizada ainda. Clique em "Iniciar Nova Venda Pix" acima para começar!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E7E5E2] text-[#6B6B6B] uppercase text-[10px] font-bold">
                  <th className="pb-2">TXID Pix</th>
                  <th className="pb-2">Sabores Vendidos</th>
                  <th className="pb-2">Total Recebido</th>
                  <th className="pb-2">Sua Comissão</th>
                  <th className="pb-2 text-right">Data/Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E5E2]/70">
                {myRecentSales.map(sale => (
                  <tr key={sale.id} className="hover:bg-[#F6F5F3]">
                    <td className="py-2.5 font-mono font-bold text-[#111111]">
                      {sale.pix_txid}
                    </td>
                    <td className="py-2.5 text-[#111111]">
                      {sale.items.map(i => `${i.quantity}x ${i.flavor_name}`).join(', ')}
                    </td>
                    <td className="py-2.5 font-black text-[#111111] tabular-nums">
                      {formatCurrency(sale.total_amount)}
                    </td>
                    <td className="py-2.5 font-bold text-[#1B8A4F] tabular-nums">
                      +{formatCurrency(sale.seller_commission)}
                    </td>
                    <td className="py-2.5 text-right text-[#6B6B6B] text-[11px]">
                      {formatDateTime(sale.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
