import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  ArrowRightLeft,
  DollarSign,
  TrendingUp,
  Boxes,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Trash2,
  KeyRound
} from 'lucide-react';
import { useStore } from '../../services/store';
import { formatCurrency } from '../../utils/pix';

interface OwnerSellersProps {
  onOpenNewSeller: () => void;
  onOpenTransfer: (sellerId?: string) => void;
  onNavigatePerformance: () => void;
}

export const OwnerSellers: React.FC<OwnerSellersProps> = ({
  onOpenNewSeller,
  onOpenTransfer,
  onNavigatePerformance
}) => {
  const { state, toggleSellerStatus, deleteSeller, getFlavorStock, isDateInFilter, setAccountPassword } = useStore();
  const [sellerToDelete, setSellerToDelete] = useState<string | null>(null);
  const [sellerToResetPassword, setSellerToResetPassword] = useState<string | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const sellers = state.profiles.filter(p => p.role === 'seller');
  const activeFlavors = state.flavors.filter(f => f.active);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#111111] tracking-tight">
            Gestão de Vendedores
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-0.5">
            Cadastre vendedores, acompanhe estoques e configure taxas de comissão
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onNavigatePerformance}
            className="px-3.5 py-2 rounded-xl bg-white border border-[#E7E5E2] text-xs font-bold text-[#111111] hover:bg-[#F6F5F3] transition"
          >
            Ver Ranking de Desempenho
          </button>
          <button
            id="btn-new-seller"
            onClick={onOpenNewSeller}
            className="px-4 py-2 rounded-xl bg-[#141414] text-white text-xs font-bold hover:bg-[#0A0A0A] transition flex items-center gap-1.5 shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Novo Vendedor</span>
          </button>
        </div>
      </div>

      {/* Sellers Cards Grid */}
      {sellers.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 border border-[#E7E5E2] text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#F6F5F3] text-[#6B6B6B] flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-[#111111]">Nenhum vendedor cadastrado</h3>
          <p className="text-xs text-[#6B6B6B] max-w-sm mx-auto">
            Cadastre seus revendedores e vendedores de rua para separar lotes de brownies e acompanhar as comissões.
          </p>
          <button
            onClick={onOpenNewSeller}
            className="px-4 py-2 rounded-xl bg-[#141414] text-white text-xs font-bold hover:bg-[#0A0A0A] transition inline-flex items-center gap-1.5 shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Cadastrar Primeiro Vendedor</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sellers.map(seller => {
          const loc = state.locations.find(l => l.seller_id === seller.id);
          const currentStock = loc
            ? activeFlavors.reduce((sum, f) => sum + getFlavorStock(loc.id, f.id), 0)
            : 0;

          // Sales in filtered period
          const sellerSales = state.sales.filter(
            s => s.seller_id === seller.id && s.status === 'confirmed' && isDateInFilter(s.created_at)
          );
          const revenuePeriod = sellerSales.reduce((sum, s) => sum + s.total_amount, 0);
          const unitsSoldPeriod = sellerSales.reduce((sum, s) => sum + s.total_quantity, 0);
          const commissionPeriod = sellerSales.reduce((sum, s) => sum + s.seller_commission, 0);

          // Pending commission balance
          const pendingCommission = state.commissions
            .filter(c => c.seller_id === seller.id && c.status === 'pending')
            .reduce((sum, c) => sum + c.amount, 0);

          const isActive = seller.status === 'active';

          return (
            <div
              key={seller.id}
              className={`bg-white rounded-3xl p-5 border transition shadow-xs flex flex-col justify-between space-y-4 ${
                isActive ? 'border-[#E7E5E2]' : 'border-gray-200 opacity-60 bg-gray-50'
              }`}
            >
              <div>
                {/* Top row */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#141414] text-white font-bold flex items-center justify-center text-sm shadow-xs">
                      {seller.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#111111]">{seller.name}</h3>
                      <span className="text-[11px] text-[#6B6B6B] block">
                        Comissão: {seller.commission_value || 50}% do lucro
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleSellerStatus(seller.id)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition ${
                      isActive ? 'bg-green-100 text-[#1B8A4F]' : 'bg-gray-200 text-[#6B6B6B]'
                    }`}
                  >
                    {isActive ? 'Ativo' : 'Inativo'}
                  </button>
                </div>

                {/* Contact info */}
                <div className="mt-3 space-y-1 text-xs text-[#6B6B6B]">
                  {seller.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-[#141414]" />
                      <span>{seller.phone}</span>
                    </div>
                  )}
                  {seller.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-[#141414]" />
                      <span className="truncate">{seller.email}</span>
                    </div>
                  )}
                </div>

                {/* Metrics Breakdown */}
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-2xl bg-[#F6F5F3] border border-[#E7E5E2]">
                    <span className="text-[10px] text-[#6B6B6B] block">Estoque com ele:</span>
                    <strong className="text-sm font-bold text-[#141414] tabular-nums">
                      {currentStock} brownies
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-[#F6F5F3] border border-[#E7E5E2]">
                    <span className="text-[10px] text-[#6B6B6B] block">Vendas no filtro:</span>
                    <strong className="text-sm font-bold text-[#111111] tabular-nums">
                      {formatCurrency(revenuePeriod)} ({unitsSoldPeriod} un.)
                    </strong>
                  </div>
                </div>

                {/* Commission Summary */}
                <div className="mt-2 p-2.5 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex justify-between items-center text-xs">
                  <span className="text-[11px] text-[#6B6B6B]">Comissão a repassar:</span>
                  <strong className="text-xs font-black text-[#A9761F] tabular-nums">
                    {formatCurrency(pendingCommission)}
                  </strong>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 border-t border-[#E7E5E2] flex items-center gap-2">
                <button
                  onClick={() => onOpenTransfer(seller.id)}
                  disabled={!isActive}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#141414] text-white text-xs font-bold hover:bg-[#0A0A0A] transition disabled:opacity-40 flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Boxes className="w-3.5 h-3.5" />
                  <span>Separar Estoque</span>
                </button>
                <button
                  onClick={() => {
                    setSellerToResetPassword(seller.id);
                    setNewPasswordValue('');
                    setPasswordError(null);
                  }}
                  className="p-2 rounded-xl text-[#141414] hover:bg-[#F6F5F3] border border-transparent hover:border-[#E7E5E2] transition"
                  title="Definir/alterar senha de acesso"
                >
                  <KeyRound className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSellerToDelete(seller.id)}
                  className="p-2 rounded-xl text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition"
                  title="Excluir vendedor do sistema"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
        </div>
      )}

      {/* Reset Seller Password Dialog */}
      {sellerToResetPassword && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-[#E7E5E2] space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-[#F6F5F3] text-[#141414] flex items-center justify-center mx-auto">
              <KeyRound className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-sm text-[#111111]">Definir Senha de Acesso</h3>
              <p className="text-xs text-[#6B6B6B] mt-1">
                {sellers.find(s => s.id === sellerToResetPassword)?.name}: informe a nova senha que este vendedor vai usar para fazer login.
              </p>
            </div>
            {passwordError && (
              <div className="p-2.5 rounded-xl bg-red-50 text-red-700 text-[11px]">{passwordError}</div>
            )}
            <input
              type="text"
              autoFocus
              minLength={4}
              placeholder="Nova senha (mín. 4 caracteres)"
              value={newPasswordValue}
              onChange={e => setNewPasswordValue(e.target.value)}
              className="w-full text-xs bg-[#F6F5F3] border border-[#E7E5E2] rounded-xl px-3 py-2.5 text-[#111111] text-center"
            />
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setSellerToResetPassword(null)}
                className="flex-1 py-2 rounded-xl border border-[#E7E5E2] text-xs font-semibold text-[#6B6B6B] hover:bg-[#F6F5F3]"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const res = setAccountPassword(sellerToResetPassword, newPasswordValue);
                  if (res.success) {
                    setSellerToResetPassword(null);
                  } else {
                    setPasswordError(res.error || 'Não foi possível salvar a senha.');
                  }
                }}
                className="flex-1 py-2 rounded-xl bg-[#141414] text-white text-xs font-bold hover:bg-[#0A0A0A]"
              >
                Salvar Senha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Seller Confirmation Dialog */}
      {sellerToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-[#E7E5E2] space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-sm text-[#111111]">Excluir Vendedor?</h3>
              <p className="text-xs text-[#6B6B6B] mt-1">
                Tem certeza de que deseja remover este vendedor? Seu ponto de estoque associado também será desvinculado.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setSellerToDelete(null)}
                className="flex-1 py-2 rounded-xl border border-[#E7E5E2] text-xs font-semibold text-[#6B6B6B] hover:bg-[#F6F5F3]"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  deleteSeller(sellerToDelete);
                  setSellerToDelete(null);
                }}
                className="flex-1 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
