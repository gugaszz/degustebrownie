import React, { useState } from 'react';
import {
  Trophy,
  Award,
  TrendingUp,
  ArrowUpDown,
  ShoppingBag,
  Users,
  ChevronDown
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { useStore } from '../../services/store';
import { formatCurrency } from '../../utils/pix';

type SortKey = 'revenue' | 'units' | 'ticket' | 'commission' | 'sellThrough';

export const OwnerPerformance: React.FC = () => {
  const { state, isDateInFilter, getFlavorStock } = useStore();
  const [sortBy, setSortBy] = useState<SortKey>('revenue');

  const sellers = state.profiles.filter(p => p.role === 'seller');
  const activeFlavors = state.flavors.filter(f => f.active);

  // Compute metrics for each seller
  const sellerMetrics = sellers.map(seller => {
    const loc = state.locations.find(l => l.seller_id === seller.id);
    const currentStock = loc
      ? activeFlavors.reduce((sum, f) => sum + getFlavorStock(loc.id, f.id), 0)
      : 0;

    const sales = state.sales.filter(
      s => s.seller_id === seller.id && s.status === 'confirmed' && isDateInFilter(s.created_at)
    );

    const revenue = sales.reduce((sum, s) => sum + s.total_amount, 0);
    const salesCount = sales.length;
    const unitsSold = sales.reduce((sum, s) => sum + s.total_quantity, 0);
    const averageTicket = salesCount > 0 ? revenue / salesCount : 0;
    const commission = sales.reduce((sum, s) => sum + s.seller_commission, 0);

    // Sell-through rate
    const totalAllocated = unitsSold + currentStock;
    const sellThrough = totalAllocated > 0 ? (unitsSold / totalAllocated) * 100 : 0;

    return {
      seller,
      revenue,
      salesCount,
      unitsSold,
      averageTicket,
      commission,
      currentStock,
      sellThrough: Math.round(sellThrough)
    };
  });

  // Sort
  const sortedMetrics = [...sellerMetrics].sort((a, b) => {
    if (sortBy === 'revenue') return b.revenue - a.revenue;
    if (sortBy === 'units') return b.unitsSold - a.unitsSold;
    if (sortBy === 'ticket') return b.averageTicket - a.averageTicket;
    if (sortBy === 'commission') return b.commission - a.commission;
    if (sortBy === 'sellThrough') return b.sellThrough - a.sellThrough;
    return 0;
  });

  const chartData = sortedMetrics.map(m => ({
    name: m.seller.name.split(' ')[0],
    revenue: m.revenue,
    units: m.unitsSold
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-[#111111] tracking-tight">
          Desempenho & Ranking de Vendedores
        </h1>
        <p className="text-xs text-[#6B6B6B] mt-0.5">
          Avaliação de volume, faturamento, giro e taxa de conversão (sell-through rate)
        </p>
      </div>

      {/* Podium Strip (Top 3) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sortedMetrics.slice(0, 3).map((item, index) => {
          const medals = ['🥇 1º Lugar', '🥈 2º Lugar', '🥉 3º Lugar'];
          const borders = ['border-[#141414] shadow-md', 'border-[#E7E5E2]', 'border-[#E7E5E2]'];

          return (
            <div
              key={item.seller.id}
              className={`bg-white rounded-3xl p-5 border ${borders[index]} flex flex-col justify-between space-y-3`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-bold text-[#A9761F] uppercase tracking-wider block">
                    {medals[index]}
                  </span>
                  <h3 className="font-extrabold text-base text-[#111111] mt-0.5">{item.seller.name}</h3>
                </div>
                <div className="w-9 h-9 rounded-xl bg-[#F6F5F3] text-[#141414] flex items-center justify-center font-bold text-sm">
                  #{index + 1}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-[#F6F5F3]">
                  <span className="text-[10px] text-[#6B6B6B] block">Faturamento:</span>
                  <strong className="text-sm font-black text-[#111111] tabular-nums">
                    {formatCurrency(item.revenue)}
                  </strong>
                </div>
                <div className="p-2.5 rounded-xl bg-[#F6F5F3]">
                  <span className="text-[10px] text-[#6B6B6B] block">Vendidos:</span>
                  <strong className="text-sm font-bold text-[#141414] tabular-nums">
                    {item.unitsSold} brownies
                  </strong>
                </div>
              </div>

              <div className="flex justify-between text-xs pt-1 border-t border-[#E7E5E2] font-semibold text-[#6B6B6B]">
                <span>Giro (Sell-Through):</span>
                <span className="text-[#1B8A4F] font-bold">{item.sellThrough}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison Chart */}
      <div className="bg-white rounded-3xl p-5 border border-[#E7E5E2] shadow-xs">
        <h3 className="text-sm font-bold text-[#111111] mb-1">Comparativo de Faturamento</h3>
        <p className="text-xs text-[#6B6B6B] mb-4">Volume monetário gerado por cada vendedor no período</p>
        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7E5E2" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#6B6B6B', fontSize: 12 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: '#6B6B6B', fontSize: 11 }} />
              <Tooltip
                formatter={(v: any) => [formatCurrency(Number(v)), 'Faturamento']}
                contentStyle={{ borderRadius: '12px', border: '1px solid #E7E5E2' }}
              />
              <Bar dataKey="revenue" fill="#141414" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ranking Table */}
      <div className="bg-white rounded-3xl border border-[#E7E5E2] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#E7E5E2] flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#111111]">Tabela Geral de Classificação</h3>
            <p className="text-xs text-[#6B6B6B]">Métricas consolidadas de eficiência</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#6B6B6B] font-medium">Ordenar por:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 bg-[#F6F5F3] border border-[#E7E5E2] rounded-xl text-[#111111] font-semibold"
            >
              <option value="revenue">Maior Faturamento</option>
              <option value="units">Mais Unidades Vendidas</option>
              <option value="ticket">Maior Ticket Médio</option>
              <option value="commission">Maior Comissão</option>
              <option value="sellThrough">Maior Giro (Sell-Through)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#F6F5F3] border-b border-[#E7E5E2] text-[#6B6B6B] uppercase text-[10px] font-bold">
                <th className="py-3 px-4">Posição</th>
                <th className="py-3 px-3">Vendedor</th>
                <th className="py-3 px-3">Faturamento</th>
                <th className="py-3 px-3">Brownies Vendidos</th>
                <th className="py-3 px-3">Vendas</th>
                <th className="py-3 px-3">Ticket Médio</th>
                <th className="py-3 px-3">Comissão Gerada</th>
                <th className="py-3 px-4 text-right">Taxa de Giro (Sell-Through)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E5E2]/70">
              {sortedMetrics.map((m, idx) => (
                <tr key={m.seller.id} className="hover:bg-[#F6F5F3]">
                  <td className="py-3 px-4 font-bold text-[#141414]">
                    #{idx + 1}
                  </td>
                  <td className="py-3 px-3 font-bold text-[#111111]">
                    {m.seller.name}
                  </td>
                  <td className="py-3 px-3 font-black text-[#111111] tabular-nums">
                    {formatCurrency(m.revenue)}
                  </td>
                  <td className="py-3 px-3 font-bold text-[#141414] tabular-nums">
                    {m.unitsSold} brownies
                  </td>
                  <td className="py-3 px-3 text-[#6B6B6B] tabular-nums">
                    {m.salesCount} vendas
                  </td>
                  <td className="py-3 px-3 text-[#6B6B6B] tabular-nums">
                    {formatCurrency(m.averageTicket)}
                  </td>
                  <td className="py-3 px-3 font-bold text-[#A9761F] tabular-nums">
                    {formatCurrency(m.commission)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-[#1B8A4F] tabular-nums">
                      {m.sellThrough}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
