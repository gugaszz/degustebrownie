import React from 'react';
import {
  TrendingUp,
  Boxes,
  Wallet,
  ArrowUpRight,
  Award
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { useStore } from '../../services/store';
import { formatCurrency, formatDateTime } from '../../utils/pix';
import { SmartReplenishmentCard } from '../../components/SmartReplenishmentCard';

interface OwnerDashboardProps {
  onNavigateTab: (tabId: string) => void;
  onOpenTransfer: (sellerId?: string) => void;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  onNavigateTab,
  onOpenTransfer
}) => {
  const { state, isDateInFilter } = useStore();

  const filteredSales = state.sales.filter(
    s => s.status === 'confirmed' && isDateInFilter(s.created_at)
  );

  // Core KPIs
  const grossRevenue = filteredSales.reduce((sum, s) => sum + s.total_amount, 0);
  const salesCount = filteredSales.length;
  const unitsSold = filteredSales.reduce((sum, s) => sum + s.total_quantity, 0);
  const averageTicket = salesCount > 0 ? grossRevenue / salesCount : 0;
  const cogs = filteredSales.reduce((sum, s) => sum + s.total_cost, 0);
  const grossProfit = grossRevenue - cogs;

  // Revenue trend across the selected period, one point per day
  const { startDate, endDate } = state.dateFilter;
  const revenueTrend: { date: string; label: string; revenue: number }[] = [];
  if (startDate && endDate) {
    const cursor = new Date(startDate + 'T00:00:00');
    const last = new Date(endDate + 'T00:00:00');
    let guard = 0;
    while (cursor <= last && guard < 370) {
      const key = cursor.toISOString().split('T')[0];
      revenueTrend.push({
        date: key,
        label: new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(cursor),
        revenue: 0
      });
      cursor.setDate(cursor.getDate() + 1);
      guard++;
    }
  }
  const trendByDate = new Map(revenueTrend.map(t => [t.date, t]));
  filteredSales.forEach(s => {
    const key = s.created_at.split('T')[0];
    const point = trendByDate.get(key);
    if (point) point.revenue += s.total_amount;
  });

  // Revenue by seller
  const sellerRevenueData = state.profiles
    .filter(p => p.role === 'seller')
    .map(seller => {
      const sellerSales = filteredSales.filter(s => s.seller_id === seller.id);
      return {
        name: seller.name.split(' ')[0],
        revenue: sellerSales.reduce((sum, s) => sum + s.total_amount, 0)
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  const topSeller = sellerRevenueData[0];
  const recentSales = state.sales.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-[28px] font-semibold text-ink-900 tracking-tight">
            Visão Geral
          </h1>
          <p className="text-xs text-ink-500 mt-0.5">
            Faturamento, vendas e resultado do período selecionado
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="btn-quick-transfer"
            onClick={() => onOpenTransfer()}
            className="px-4 py-2 rounded-xl bg-white border border-ink-100 text-ink-900 hover:bg-ink-50 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Boxes className="w-3.5 h-3.5 text-ink-800" />
            <span>Separar para Vendedor</span>
          </button>
        </div>
      </div>

      {/* Hero: Faturamento + curva de evolução */}
      <div className="card-hero-dark rounded-[28px] p-6 sm:p-8 text-white overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">
              Faturamento do período
            </span>
            <div className="font-display text-4xl sm:text-5xl font-semibold tracking-tight mt-1 tabular-nums">
              {formatCurrency(grossRevenue)}
            </div>
            <div className="flex items-center gap-3 mt-3 text-xs text-white/70 font-medium">
              <span>{salesCount} vendas</span>
              <span className="w-1 h-1 rounded-full bg-white/30" />
              <span>{unitsSold} brownies</span>
              <span className="w-1 h-1 rounded-full bg-white/30" />
              <span>Ticket médio {formatCurrency(averageTicket)}</span>
            </div>
          </div>
          <div className="text-left lg:text-right">
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">
              Lucro bruto
            </span>
            <div className="font-display text-2xl sm:text-3xl font-semibold text-white tabular-nums">
              {formatCurrency(grossProfit)}
            </div>
          </div>
        </div>

        <div className="h-40 sm:h-48 w-full mt-6 -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <Tooltip
                formatter={(val: any) => [formatCurrency(Number(val)), 'Faturamento']}
                contentStyle={{ borderRadius: '12px', border: 'none', fontSize: '12px' }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#FFFFFF"
                strokeWidth={2.5}
                fill="url(#revenueFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Smart Replenishment (only renders when there is something actionable) */}
      <SmartReplenishmentCard onOpenTransfer={onOpenTransfer} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Vendas por Vendedor */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-5 border border-ink-100 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-ink-900">Vendas por Vendedor</h3>
              <p className="text-xs text-ink-500">
                {topSeller && topSeller.revenue > 0
                  ? `${topSeller.name} lidera com ${formatCurrency(topSeller.revenue)}`
                  : 'Nenhuma venda no período'}
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('sellers')}
              className="text-xs font-bold text-ink-800 hover:underline flex items-center gap-1 shrink-0"
            >
              Ver todos <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sellerRevenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7E5E2" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#6B6B6B', fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#6B6B6B', fontSize: 11 }} />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val)), 'Faturamento']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #E7E5E2' }}
                />
                <Bar dataKey="revenue" fill="#141414" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ticket médio + lucro em destaque, sem repetir o hero */}
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-white border border-ink-100 shadow-xs">
            <div className="flex items-center justify-between text-xs text-ink-500 mb-2 font-medium">
              <span>Ticket Médio</span>
              <div className="w-7 h-7 rounded-xl bg-ink-50 text-ink-800 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="font-display text-2xl font-semibold text-ink-900 tabular-nums">
              {formatCurrency(averageTicket)}
            </div>
            <p className="text-[11px] text-ink-500 mt-1">por venda confirmada</p>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-ink-100 shadow-xs">
            <div className="flex items-center justify-between text-xs text-ink-500 mb-2 font-medium">
              <span>Brownies Vendidos</span>
              <div className="w-7 h-7 rounded-xl bg-ink-50 text-ink-800 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="font-display text-2xl font-semibold text-ink-900 tabular-nums">
              {unitsSold}
            </div>
            <p className="text-[11px] text-ink-500 mt-1">unidades no período</p>
          </div>

          {topSeller && topSeller.revenue > 0 && (
            <div className="p-5 rounded-3xl bg-ink-900 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-4 h-4 text-white" />
                <span className="text-xs font-bold">Destaque do Período</span>
              </div>
              <div className="font-display text-lg font-semibold">{topSeller.name}</div>
              <p className="text-xs text-white/60 mt-1">{formatCurrency(topSeller.revenue)} em vendas</p>
            </div>
          )}
        </div>
      </div>

      {/* Últimas Vendas Confirmadas */}
      <div className="bg-white rounded-3xl p-5 border border-ink-100 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-ink-900">Últimas Vendas Confirmadas</h3>
            <p className="text-xs text-ink-500">Fluxo mais recente de recebimentos via Pix</p>
          </div>
          <button
            onClick={() => onNavigateTab('sales')}
            className="text-xs font-bold text-ink-800 hover:underline flex items-center gap-1"
          >
            Ver todas <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-ink-100 text-ink-500 uppercase text-[10px] font-bold">
                <th className="pb-2">Vendedor</th>
                <th className="pb-2">Qtd & Sabores</th>
                <th className="pb-2">Total</th>
                <th className="pb-2">Comissão</th>
                <th className="pb-2 text-right">Data/Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100/60">
              {recentSales.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-ink-500">
                    Nenhuma venda registrada ainda. Clique em <strong>Nova Venda</strong> para registrar pagamentos via Pix.
                  </td>
                </tr>
              ) : (
                recentSales.map(sale => (
                  <tr key={sale.id} className="hover:bg-ink-50 transition">
                    <td className="py-2.5 font-bold text-ink-900">
                      {sale.seller_name}
                      <span className="block text-[10px] text-ink-500 font-normal">{sale.pix_txid}</span>
                    </td>
                    <td className="py-2.5">
                      <span className="font-semibold text-ink-900">{sale.total_quantity} brownies</span>
                      <span className="block text-[11px] text-ink-500 truncate max-w-[160px]">
                        {sale.items.map(i => `${i.quantity}x ${i.flavor_name}`).join(', ')}
                      </span>
                    </td>
                    <td className="py-2.5 font-black text-ink-900 tabular-nums">
                      {formatCurrency(sale.total_amount)}
                    </td>
                    <td className="py-2.5 font-bold text-[#1B8A4F] tabular-nums">
                      +{formatCurrency(sale.seller_commission)}
                    </td>
                    <td className="py-2.5 text-right text-ink-500 text-[11px]">
                      {formatDateTime(sale.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
