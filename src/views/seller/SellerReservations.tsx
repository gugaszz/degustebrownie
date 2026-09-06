import React, { useState } from 'react';
import { CalendarClock, CheckCircle2, PackageCheck, XCircle, Trash2 } from 'lucide-react';
import { useStore } from '../../services/store';

interface SellerReservationsProps {
  onOpenNewReservation: () => void;
}

export const SellerReservations: React.FC<SellerReservationsProps> = ({ onOpenNewReservation }) => {
  const { state, currentUser, markReservationDelivered, cancelReservation, deleteReservation } = useStore();
  const [reservationToCancel, setReservationToCancel] = useState<string | null>(null);

  const myReservations = state.reservations
    .filter(r => r.seller_id === currentUser.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const pending = myReservations.filter(r => r.status === 'pending');
  const pendingTotal = pending.reduce((s, r) => s + r.total_quantity, 0);

  const formatDate = (d: string) => {
    try {
      return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');
    } catch {
      return d;
    }
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#111111] tracking-tight">Reservas</h1>
          <p className="text-xs text-[#6B6B6B] mt-0.5">
            Encomendas de clientes: registre o pedido agora e marque como entregue depois.
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

      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-3xl bg-white border border-[#E7E5E2] shadow-xs">
          <span className="text-xs text-[#6B6B6B] font-medium block">Reservas Pendentes</span>
          <div className="text-2xl font-black text-[#111111] tabular-nums mt-1">{pending.length}</div>
        </div>
        <div className="p-4 rounded-3xl bg-white border border-[#E7E5E2] shadow-xs">
          <span className="text-xs text-[#6B6B6B] font-medium block">Brownies a Entregar</span>
          <div className="text-2xl font-black text-[#A9761F] tabular-nums mt-1">{pendingTotal}</div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-[#E7E5E2] shadow-xs overflow-hidden">
        {myReservations.length === 0 ? (
          <div className="py-10 text-center text-xs text-[#6B6B6B]">
            Nenhuma reserva registrada ainda.
          </div>
        ) : (
          <div className="divide-y divide-[#E7E5E2]/70">
            {myReservations.map(r => (
              <div key={r.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-[#111111]">{r.customer_name}</span>
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
              <p className="text-xs text-[#6B6B6B] mt-1">
                Ela sairá da lista de pendências a entregar.
              </p>
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
