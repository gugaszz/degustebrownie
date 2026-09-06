import React from 'react';
import { Sparkles, ArrowRight, PackagePlus, CheckCircle2 } from 'lucide-react';
import { useStore } from '../services/store';

interface SmartReplenishmentCardProps {
  onOpenTransfer: (sellerId: string) => void;
}

const formatDays = (value: number | null): string => {
  if (value === null) return '—';
  if (!isFinite(value)) return '—';
  return `${value.toFixed(1)} dia${value === 1 ? '' : 's'}`;
};

const STATUS_STYLE: Record<'ok' | 'warning' | 'critical', { border: string; bg: string; badgeBg: string; badgeText: string; label: string }> = {
  ok: { border: 'border-[#E7E5E2]', bg: 'bg-[#F6F5F3]', badgeBg: 'bg-green-100', badgeText: 'text-[#1B8A4F]', label: 'OK' },
  warning: { border: 'border-amber-300', bg: 'bg-amber-50/50', badgeBg: 'bg-amber-100', badgeText: 'text-[#A9761F]', label: 'Próximo' },
  critical: { border: 'border-red-300', bg: 'bg-red-50/50', badgeBg: 'bg-red-100', badgeText: 'text-[#8A2E2E]', label: 'Repor' }
};

export const SmartReplenishmentCard: React.FC<SmartReplenishmentCardProps> = ({ onOpenTransfer }) => {
  const { getReplenishmentAnalysis } = useStore();
  const { sellers, central } = getReplenishmentAnalysis();

  const sellersNeedingAttention = sellers.filter(s => s.status !== 'ok');
  // Nothing to show at all: no sellers have sales history yet
  if (sellers.length === 0) return null;

  return (
    <div className="bg-white rounded-3xl p-5 border border-[#E7E5E2] shadow-xs space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-[#A9761F] flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#111111]">Reposições Sugeridas</h3>
            <p className="text-xs text-[#6B6B6B]">
              Venda média dos últimos 7 dias, descontando reservas pendentes
            </p>
          </div>
        </div>
        {central.supplierOrderSuggestion > 0 && (
          <span className="text-[11px] font-bold text-[#8A2E2E] bg-red-50 px-2.5 py-1 rounded-full border border-red-200 flex items-center gap-1.5">
            <PackagePlus className="w-3.5 h-3.5" />
            Pedir ao fornecedor: {central.supplierOrderSuggestion} un.
          </span>
        )}
      </div>

      {sellersNeedingAttention.length === 0 ? (
        <div className="p-4 rounded-2xl bg-green-50/60 border border-green-200 flex items-center gap-2.5 text-xs text-[#1B8A4F] font-semibold">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Todos os vendedores estão com estoque disponível acima do mínimo.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {sellers.map(s => {
            const style = STATUS_STYLE[s.status];
            return (
              <div key={s.seller.id} className={`p-4 rounded-2xl border transition ${style.border} ${style.bg}`}>
                <div className="flex justify-between items-start mb-2 gap-2">
                  <div>
                    <span className="font-bold text-xs text-[#111111] block">{s.seller.name}</span>
                    <span className="text-[11px] text-[#6B6B6B]">
                      Média: {s.dailyAverage > 0 ? `${s.dailyAverage.toFixed(1)}/dia` : 'sem histórico'}
                    </span>
                  </div>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${style.badgeBg} ${style.badgeText}`}>
                    {style.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 my-3 text-xs">
                  <div className="bg-white p-2 rounded-xl border border-[#E7E5E2]">
                    <span className="text-[10px] text-[#6B6B6B] block">Estoque físico:</span>
                    <strong className="text-[#111111] text-sm tabular-nums">{s.physicalStock} un.</strong>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-[#E7E5E2]">
                    <span className="text-[10px] text-[#6B6B6B] block">Disponível p/ venda:</span>
                    <strong className={`text-sm tabular-nums ${s.availableStock < 0 ? 'text-[#8A2E2E]' : 'text-[#111111]'}`}>
                      {s.availableStock} un.
                    </strong>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-[#E7E5E2]">
                    <span className="text-[10px] text-[#6B6B6B] block">Cobertura atual:</span>
                    <strong className="text-[#111111] text-sm tabular-nums">{formatDays(s.currentCoverageDays)}</strong>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-[#E7E5E2]">
                    <span className="text-[10px] text-[#6B6B6B] block">Estoque ideal:</span>
                    <strong className="text-[#111111] text-sm tabular-nums">{s.targetStock} un.</strong>
                  </div>
                </div>

                {s.reservedUnits > 0 && (
                  <p className="text-[10px] text-[#A9761F] mb-2">
                    {s.reservedUnits} un. já reservadas por clientes, descontadas do disponível.
                  </p>
                )}

                {s.status !== 'ok' && s.suggestedUnits > 0 && (
                  <p className="text-[11px] text-[#111111] font-semibold mb-2">
                    Repor {s.suggestedUnits} un. → cobertura prevista {formatDays(s.coverageAfterReplenishment)}
                  </p>
                )}

                <button
                  onClick={() => onOpenTransfer(s.seller.id)}
                  className="w-full py-2 px-3 rounded-xl bg-[#141414] text-white text-xs font-bold hover:bg-[#0A0A0A] transition flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <span>
                    {s.status === 'ok' ? 'Abastecer Vendedor' : `Enviar ${s.suggestedUnits || ''} un.`.trim()}
                  </span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
