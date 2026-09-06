import React from 'react';
import {
  X,
  Bell,
  AlertTriangle,
  Clock,
  Boxes,
  BadgeDollarSign,
  ArrowRight
} from 'lucide-react';
import { useStore } from '../services/store';
import { formatCurrency, formatDate } from '../utils/pix';

interface AlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const AlertsModal: React.FC<AlertsModalProps> = ({ isOpen, onClose, onNavigateTab }) => {
  const { state, getFlavorStock } = useStore();

  if (!isOpen) return null;

  const centralStock = state.balances
    .filter(b => b.location_id === 'loc-central')
    .reduce((s, b) => s + b.quantity, 0);

  // Expiring batches in next 5 days
  const today = new Date();
  const expiringBatches = state.batches
    .map(b => {
      const exp = new Date(b.expiration_date);
      const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return { ...b, diffDays };
    })
    .filter(b => b.diffDays <= 7 && b.quantity_remaining > 0);

  // Sellers with low stock (< 10 units total)
  const sellersWithLowStock = state.profiles
    .filter(p => p.role === 'seller' && p.status === 'active')
    .map(seller => {
      const loc = state.locations.find(l => l.seller_id === seller.id);
      const totalStock = loc
        ? state.flavors.reduce((sum, f) => sum + getFlavorStock(loc.id, f.id), 0)
        : 0;
      return { seller, totalStock };
    })
    .filter(s => s.totalStock < 10);

  // Pending commissions
  const pendingCommissions = state.commissions.filter(c => c.status === 'pending');
  const totalPendingAmt = pendingCommissions.reduce((s, c) => s + c.amount, 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-[#E7E5E2] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E7E5E2] flex items-center justify-between bg-[#F6F5F3]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#141414] text-white flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#111111]">Central de Alertas Operacionais</h3>
              <p className="text-[11px] text-[#6B6B6B]">Monitoramento de estoque, validade FEFO e finanças</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-[#6B6B6B] hover:bg-[#EDEBE8]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3.5 max-h-[75vh] overflow-y-auto">
          {/* Central Stock Alert */}
          {centralStock < 100 && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
              <Boxes className="w-5 h-5 text-[#A9761F] shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold text-xs text-[#111111] block">Estoque Central Baixo</span>
                <p className="text-[11px] text-[#6B6B6B] mt-0.5 leading-relaxed">
                  Restam apenas <strong>{centralStock} brownies</strong> no estoque central. Considere emitir um novo pedido com fornecedor.
                </p>
              </div>
            </div>
          )}

          {/* Expiring batches */}
          {expiringBatches.length > 0 ? (
            <div className="p-3.5 rounded-2xl bg-red-50/70 border border-red-200 flex items-start gap-3">
              <Clock className="w-5 h-5 text-[#B3403D] shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold text-xs text-[#111111] block">Lotes Próximos do Vencimento (FEFO)</span>
                <p className="text-[11px] text-[#6B6B6B] mb-2">
                  Priorize a saída dos lotes mais antigos para evitar perdas:
                </p>
                <div className="space-y-1.5">
                  {expiringBatches.map(b => (
                    <div key={b.id} className="text-xs bg-white/80 p-2 rounded-xl border border-red-100 flex justify-between">
                      <div>
                        <strong className="text-[#111111]">{b.flavor_name} ({b.batch_reference})</strong>
                        <span className="text-[10px] text-[#6B6B6B] block">Vence em: {formatDate(b.expiration_date)}</span>
                      </div>
                      <span className="font-bold text-[#B3403D] self-center">
                        {b.diffDays <= 0 ? 'VENCE HOJE' : `${b.diffDays} dias restantes`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-[#F6F5F3] text-xs text-[#6B6B6B] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#1B8A4F]" />
              <span>Nenhum lote crítico com vencimento nos próximos 7 dias.</span>
            </div>
          )}

          {/* Seller low stock alerts */}
          {sellersWithLowStock.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#A9761F] shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold text-xs text-[#111111] block">Vendedores Precisando de Reposição</span>
                <p className="text-[11px] text-[#6B6B6B] mb-2">
                  Estoque com vendedor abaixo de 10 unidades:
                </p>
                <div className="space-y-1.5">
                  {sellersWithLowStock.map(({ seller, totalStock }) => (
                    <div key={seller.id} className="text-xs bg-white/80 p-2 rounded-xl border border-amber-100 flex justify-between items-center">
                      <span className="font-semibold text-[#111111]">{seller.name}</span>
                      <span className="font-bold text-[#A9761F]">{totalStock} brownies</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Pending Commissions */}
          {pendingCommissions.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-start gap-3">
              <BadgeDollarSign className="w-5 h-5 text-[#1B8A4F] shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold text-xs text-[#111111] block">Comissões Acumuladas Pendentes</span>
                <p className="text-[11px] text-[#6B6B6B] mb-1">
                  Existem <strong>{pendingCommissions.length} comissões</strong> aguardando repasse aos vendedores.
                </p>
                <div className="text-xs font-bold text-[#1B8A4F]">
                  Total a pagar: {formatCurrency(totalPendingAmt)}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3.5 border-t border-[#E7E5E2] bg-[#F6F5F3] flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-[#141414] text-white text-xs font-bold rounded-xl">
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
