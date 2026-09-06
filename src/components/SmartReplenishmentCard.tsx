import React from 'react';
import { Sparkles, ArrowRight, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { useStore } from '../services/store';

interface SmartReplenishmentCardProps {
  onOpenTransfer: (sellerId: string) => void;
}

export const SmartReplenishmentCard: React.FC<SmartReplenishmentCardProps> = ({ onOpenTransfer }) => {
  const { state, getFlavorStock } = useStore();
  const sellers = state.profiles.filter(p => p.role === 'seller' && p.status === 'active');
  const activeFlavors = state.flavors.filter(f => f.active);

  // Analyze each seller
  const suggestions = sellers.map(seller => {
    const loc = state.locations.find(l => l.seller_id === seller.id);
    const currentStock = loc
      ? activeFlavors.reduce((sum, f) => sum + getFlavorStock(loc.id, f.id), 0)
      : 0;

    // Confirmed sales
    const sellerSales = state.sales.filter(s => s.seller_id === seller.id && s.status === 'confirmed');
    const unitsSold = sellerSales.reduce((sum, s) => sum + s.total_quantity, 0);

    // Estimated daily sales rate (at least 6-10 units)
    const avgDailySales = Math.max(5, Math.round(unitsSold / 3) || 12);
    const targetCoverageDays = 1; // 1 day target coverage
    const targetStock = avgDailySales * targetCoverageDays;
    const suggestedUnits = Math.max(0, targetStock - currentStock);
    const stockCoverageHours = avgDailySales > 0 ? (currentStock / avgDailySales) * 24 : 0;

    return {
      seller,
      currentStock,
      avgDailySales,
      suggestedUnits,
      stockCoverageHours: Math.round(stockCoverageHours)
    };
  });

  return (
    <div className="bg-white rounded-3xl p-5 border border-[#EAE5E2] shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-[#B7791F] flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#201A17]">Sugestão de Reposição Inteligente</h3>
            <p className="text-xs text-[#746A65]">Algoritmo preditivo baseado no giro e velocidade de vendas</p>
          </div>
        </div>
        <span className="text-[11px] font-bold text-[#B7791F] bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
          Meta: 1 dia de cobertura
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {suggestions.map(({ seller, currentStock, avgDailySales, suggestedUnits, stockCoverageHours }) => {
          const isUrgent = currentStock < 10;

          return (
            <div
              key={seller.id}
              className={`p-4 rounded-2xl border transition ${
                isUrgent ? 'border-amber-300 bg-amber-50/40' : 'border-[#EAE5E2] bg-[#F8F6F4]'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="font-bold text-xs text-[#201A17] block">{seller.name}</span>
                  <span className="text-[11px] text-[#746A65]">Giro: ~{avgDailySales} brownies/dia</span>
                </div>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  isUrgent ? 'bg-amber-200 text-[#B7791F]' : 'bg-green-100 text-[#237A4B]'
                }`}>
                  {stockCoverageHours}h de estoque
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 my-3 text-xs">
                <div className="bg-white p-2 rounded-xl border border-[#EAE5E2]">
                  <span className="text-[10px] text-[#746A65] block">Com o vendedor:</span>
                  <strong className="text-[#201A17] text-sm tabular-nums">{currentStock} un.</strong>
                </div>
                <div className="bg-white p-2 rounded-xl border border-[#EAE5E2]">
                  <span className="text-[10px] text-[#746A65] block">Sugerido enviar:</span>
                  <strong className="text-[#3B241C] text-sm tabular-nums">+{suggestedUnits} un.</strong>
                </div>
              </div>

              <button
                onClick={() => onOpenTransfer(seller.id)}
                className="w-full py-2 px-3 rounded-xl bg-[#3B241C] text-white text-xs font-bold hover:bg-[#2E1A14] transition flex items-center justify-center gap-1.5 shadow-xs"
              >
                <span>Abastecer Vendedor</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
