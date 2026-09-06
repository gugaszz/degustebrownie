import React from 'react';
import { Boxes, ArrowDownLeft, AlertCircle, Clock } from 'lucide-react';
import { useStore } from '../../services/store';
import { formatDateTime } from '../../utils/pix';

interface SellerInventoryProps {
  onOpenReturn: () => void;
}

export const SellerInventory: React.FC<SellerInventoryProps> = ({ onOpenReturn }) => {
  const { state, currentUser, getFlavorStock } = useStore();
  const sellerId = currentUser.id;

  const sellerLoc = state.locations.find(l => l.seller_id === sellerId);
  const activeFlavors = state.flavors.filter(f => f.active);

  const totalStock = sellerLoc
    ? activeFlavors.reduce((sum, f) => sum + getFlavorStock(sellerLoc.id, f.id), 0)
    : 0;

  // Movements involving this location
  const myMovements = state.movements.filter(
    m => m.location_id === sellerLoc?.id
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#111111] tracking-tight">
            Meu Estoque de Brownies
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-0.5">
            Estoque sob sua guarda direta e histórico de remessas e devoluções
          </p>
        </div>
        <button
          onClick={onOpenReturn}
          className="px-4 py-2 bg-white border border-[#E7E5E2] rounded-xl text-xs font-bold text-[#111111] hover:bg-[#F6F5F3] transition flex items-center gap-1.5 shadow-xs"
        >
          <ArrowDownLeft className="w-3.5 h-3.5" />
          <span>Devolver Brownies ao Central</span>
        </button>
      </div>

      {/* Flavors Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {activeFlavors.map(f => {
          const stock = sellerLoc ? getFlavorStock(sellerLoc.id, f.id) : 0;
          return (
            <div key={f.id} className="p-5 rounded-3xl bg-white border border-[#E7E5E2] shadow-xs space-y-2">
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-sm text-[#111111]">{f.name}</h3>
                <span className="text-xs font-semibold text-[#6B6B6B]">R$ 10 / R$ 9</span>
              </div>
              <div className="text-3xl font-black text-[#141414] tabular-nums pt-1">
                {stock} <span className="text-xs font-normal text-[#6B6B6B]">unidades</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Movements Table */}
      <div className="bg-white rounded-3xl border border-[#E7E5E2] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#E7E5E2]">
          <h3 className="text-sm font-bold text-[#111111]">Histórico das Minhas Movimentações</h3>
          <p className="text-xs text-[#6B6B6B]">Entradas (recebidas do dono) e saídas (vendas e devoluções)</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#F6F5F3] border-b border-[#E7E5E2] text-[#6B6B6B] uppercase text-[10px] font-bold">
                <th className="py-2.5 px-4">Data/Hora</th>
                <th className="py-2.5 px-3">Tipo</th>
                <th className="py-2.5 px-3">Sabor</th>
                <th className="py-2.5 px-3">Variação</th>
                <th className="py-2.5 px-4">Observações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E5E2]/70">
              {myMovements.map(m => {
                const isPositive = m.quantity_delta > 0;
                return (
                  <tr key={m.id} className="hover:bg-[#F6F5F3]">
                    <td className="py-2.5 px-4 text-[#6B6B6B]">{formatDateTime(m.created_at)}</td>
                    <td className="py-2.5 px-3 font-semibold text-[#111111]">{m.movement_type}</td>
                    <td className="py-2.5 px-3 font-bold text-[#111111]">{m.flavor_name}</td>
                    <td className={`py-2.5 px-3 font-black tabular-nums ${isPositive ? 'text-[#1B8A4F]' : 'text-[#B3403D]'}`}>
                      {isPositive ? `+${m.quantity_delta}` : m.quantity_delta} un.
                    </td>
                    <td className="py-2.5 px-4 text-[#6B6B6B]">{m.notes || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
