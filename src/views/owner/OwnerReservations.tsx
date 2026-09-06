import React, { useState } from 'react';
import { CalendarClock, CheckCircle2, PackageCheck, XCircle, Trash2, Users2 } from 'lucide-react';
import { useStore } from '../../services/store';

interface OwnerReservationsProps {
  onOpenNewReservation: () => void;
}

export const OwnerReservations: React.FC<OwnerReservationsProps> = ({ onOpenNewReservation }) => {
  const { state, markReservationDelivered, cancelReservation, deleteReservation, getPendingReservationSummary } = useStore();
  const [sellerFilter, setSellerFilter] = useState<string>('all');
  const [reservationToCancel, setReservationToCancel] = useState<string | null>(null);

  const sellers = state.profiles.filter(p => p.role === 'seller');
  const summary = getPendingReservationSummary();

  const reservations = state.reservations
    .filter(r => sellerFilter === 'all' || r.seller_id === sellerFilter)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const formatDate = (d: string) => {
    try {
      return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');
    } catch {
      return d;
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#111111] tracking-tight">Reservas</h1>
          <p className="text-xs text-[#6B6B6B] mt-0.5">
            Encomendas registradas pelos vendedores. Use o resumo abaixo para saber quanto separar para cada um.
          </p>
        </div>
        <button
          onClick={onOpenNewReservation}
          className="px-4 py-2 bg-[#141414] text-white rounded-xl text-xs font-bold hover:bg-[#0A0A0A] transition flex items-center gap-1.5 shadow-sm"
        >
          <CalendarClock className="w-3.5 h-3.5" />
          <span>Nova Reserva</span>
        </button>
      </div>

      {/* Pending summary per seller — what the owner needs to hand out */}
      <div className="bg-white rounded-3xl border border-[#E7E5E2] shadow-xs p-5">
        <div className="flex items-center gap-2 mb-3">
          <Users2 className="w-4 h-4 text-[#141414]" />
          <h2 className="text-sm font-bold text-[#111111]">Quanto entregar para cada vendedor</h2>
        </div>
        {summary.length === 0 ? (
          <p className="text-xs text-[#6B6B6B]">Nenhuma reserva pendente no momento.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {summary.map(s => (
              <div key={s.sellerId} className="p-4 rounded-2xl bg-[#F6F5F3] border border-[#E7E5E2]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#111111]">{s.sellerName}</span>
                  <span className="text-[10px] font-bold text-[#6B6B6B]">{s.count} reserva{s.count !== 1 ? 's' : ''}</span>
                </div>
                <div className="text-xl font-black text-[#A9761F] tabular-nums mt-1">{s.totalQuantity} un.</div>
                <div className="mt-2 space-y-0.5">
                  {Object.entries(s.byFlavor).map(([flavorName, qty]) => (
                    <div key={flavorName} className="flex items-center justify-between text-[11px] text-[#6B6B6B]">
                      <span>{flavorName}</span>
                      <span className="font-semibold text-[#111111]">{qty} un.</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filter */}
      <div className="p-3 bg-white rounded-2xl border border-[#E7E5E2] shadow-xs flex items-center gap-2">
        <label className="text-xs font-bold text-[#111111] shrink-0">Filtrar por vendedor:</label>
        <select
          value={sellerFilter}
          onChange={e => setSellerFilter(e.target.value)}
          className="text-xs bg-[#F6F5F3] border border-[#E7E5E2] rounded-xl px-3 py-2 text-[#111111]"
        >
          <option value="all">Todos</option>
          {sellers.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Full reservation list */}
      <div className="bg-white rounded-3xl border border-[#E7E5E2] shadow-xs overflow-hidden">
        {reservations.length === 0 ? (
          <div className="py-10 text-center text-xs text-[#6B6B6B]">Nenhuma reserva encontrada.</div>
        ) : (
          <div className="divide-y divide-[#E7E5E2]/70">
            {reservations.map(r => (
              <div key={r.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-[#111111]">{r.customer_name}</span>
                    <span className="text-[10px] font-bold text-[#9A9A9A]">via {r.seller_name}</span>
                    {r.status === 'pending' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-[#A9761F]">Pendente</span>
                    )}
                    {r.status === 'delivered' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-[#1B8A4F] inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Entregue
                      </span>
                    )}
                    {r.status === 'cancelled' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-[#B3403D]">Cancelada</span>
                    )}
                  </div>
                  <div className="text-xs text-[#6B6B6B] mt-1">
                    {r.items.map(i => `${i.quantity}x ${i.flavor_name}`).join(', ')} · {r.total_quantity} un.
                  </div>
                  <div className="text-[11px] text-[#9A9A9A] mt-0.5">
                    Venda/entrega: {formatDate(r.sale_date)}
                  </div>
                  {r.notes && <div className="text-[11px] text-[#9A9A9A] mt-0.5 italic">"{r.notes}"</div>}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {r.status === 'pending' && (
                    <>
                      <button
                        onClick={() => markReservationDelivered(r.id)}
                        className="px-3 py-1.5 rounded-xl bg-[#141414] text-white text-[11px] font-bold hover:bg-[#0A0A0A] transition flex items-center gap-1.5"
                      >
                        <PackageCheck className="w-3.5 h-3.5" />
                        <span>Marcar Entregue</span>
                      </button>
                      <button
                        onClick={() => setReservationToCancel(r.id)}
                        className="p-2 rounded-xl text-red-600 hover:bg-red-50 transition"
                        title="Cancelar reserva"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {r.status !== 'pending' && (
                    <button
                      onClick={() => deleteReservation(r.id)}
                      className="p-2 rounded-xl text-[#9A9A9A] hover:bg-[#F6F5F3] transition"
                      title="Remover do histórico"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {reservationToCancel && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-[#E7E5E2] space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <XCircle className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-sm text-[#111111]">Cancelar Reserva?</h3>
              <p className="text-xs text-[#6B6B6B] mt-1">Ela sairá do resumo de pendências.</p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setReservationToCancel(null)}
                className="flex-1 py-2 rounded-xl border border-[#E7E5E2] text-xs font-semibold text-[#6B6B6B] hover:bg-[#F6F5F3]"
              >
                Voltar
              </button>
              <button
                onClick={() => {
                  cancelReservation(reservationToCancel);
                  setReservationToCancel(null);
                }}
                className="flex-1 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700"
              >
                Sim, Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
