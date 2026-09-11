import React, { useState } from 'react';
import {
  PackagePlus,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  Building2,
  Plus,
  Trash2
} from 'lucide-react';
import { useStore } from '../../services/store';
import { formatCurrency, formatDate, toLocalDateStr } from '../../utils/pix';

interface OwnerPurchasesProps {
  onOpenNewPurchase: () => void;
}

export const OwnerPurchases: React.FC<OwnerPurchasesProps> = ({ onOpenNewPurchase }) => {
  const { state, receivePurchaseOrder, deletePurchaseOrder } = useStore();
  const [receivingOrderId, setReceivingOrderId] = useState<string | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [expirationDate, setExpirationDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14); // 14 days default shelf life
    return toLocalDateStr(d);
  });
  const [batchRef, setBatchRef] = useState(`LT-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}`);

  const handleConfirmReceive = (orderId: string) => {
    receivePurchaseOrder(orderId, expirationDate, batchRef);
    setReceivingOrderId(null);
  };

  const handleConfirmDelete = (orderId: string) => {
    deletePurchaseOrder(orderId);
    setOrderToDelete(null);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#111111] tracking-tight">
            Pedidos de Compra (Fornecedor)
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-0.5">
            Acompanhe pedidos de reposição e registre a entrada de lotes no estoque central
          </p>
        </div>
        <button
          onClick={onOpenNewPurchase}
          className="px-4 py-2 rounded-xl bg-[#141414] text-white text-xs font-bold hover:bg-[#0A0A0A] transition flex items-center gap-1.5 shadow-sm"
        >
          <PackagePlus className="w-3.5 h-3.5" />
          <span>Novo Pedido de Compra</span>
        </button>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {state.purchaseOrders.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-[#E7E5E2] text-xs text-[#6B6B6B]">
            Nenhum pedido de compra emitido ainda. Clique em "Novo Pedido de Compra" para abastecer o estoque.
          </div>
        ) : (
          state.purchaseOrders.map(order => {
            const isReceived = order.status === 'received';

            return (
              <div
                key={order.id}
                className="p-5 rounded-3xl bg-white border border-[#E7E5E2] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-[#111111]">{order.order_number}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isReceived ? 'bg-green-100 text-[#1B8A4F]' : 'bg-amber-100 text-[#A9761F]'
                      }`}
                    >
                      {isReceived ? 'Recebido no Estoque Central' : 'Aguardando Entrega'}
                    </span>
                  </div>

                  <div className="text-xs text-[#111111] font-semibold flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#141414]" />
                    <span>{order.supplier_name}</span>
                  </div>

                  <div className="text-xs text-[#6B6B6B] flex flex-wrap gap-x-4 gap-y-1">
                    <span>Emitido em: {formatDate(order.created_at)}</span>
                    {order.expected_delivery_date && (
                      <span>Previsão: {formatDate(order.expected_delivery_date)}</span>
                    )}
                    {order.received_at && (
                      <span className="text-[#1B8A4F] font-semibold">
                        Entregue em: {formatDate(order.received_at)}
                      </span>
                    )}
                  </div>

                  {/* Items summary */}
                  <div className="pt-1 text-xs text-[#141414] font-medium flex gap-2 flex-wrap">
                    {order.items.map((item, idx) => (
                      <span key={idx} className="bg-[#F6F5F3] px-2 py-0.5 rounded-lg border border-[#E7E5E2]">
                        {item.quantity_ordered}x {item.flavor_name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between md:flex-col md:items-end gap-2 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] text-[#6B6B6B] block">Total do Pedido:</span>
                    <span className="text-lg font-black text-[#111111] tabular-nums">
                      {formatCurrency(order.total_amount)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isReceived ? (
                      <button
                        onClick={() => setReceivingOrderId(order.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#1B8A4F] text-white text-xs font-bold hover:bg-[#145C36] transition flex items-center gap-1.5 shadow-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Registrar Recebimento</span>
                      </button>
                    ) : (
                      <span className="text-xs text-[#1B8A4F] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        Entrada concluída
                      </span>
                    )}

                    <button
                      onClick={() => setOrderToDelete(order.id)}
                      className="p-2 rounded-xl text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition"
                      title="Excluir este pedido"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-[#E7E5E2] space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-sm text-[#111111]">Excluir Pedido de Compra?</h3>
              <p className="text-xs text-[#6B6B6B] mt-1">
                Tem certeza de que deseja remover este pedido? Se o lote já tiver sido recebido, ele também será retirado do estoque central.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setOrderToDelete(null)}
                className="flex-1 py-2 rounded-xl border border-[#E7E5E2] text-xs font-semibold text-[#6B6B6B] hover:bg-[#F6F5F3]"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleConfirmDelete(orderToDelete)}
                className="flex-1 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receiving Modal Dialog */}
      {receivingOrderId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-[#E7E5E2] space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-green-100 text-[#1B8A4F] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-5 h-5" />
            </div>

            <div className="text-center">
              <h3 className="font-bold text-sm text-[#111111]">Confirmar Recebimento de Lote</h3>
              <p className="text-xs text-[#6B6B6B] mt-0.5">
                Os brownies deste pedido serão adicionados imediatamente ao estoque central e controlados por FEFO.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-[#111111] mb-1">
                  Código de Referência do Lote:
                </label>
                <input
                  type="text"
                  value={batchRef}
                  onChange={e => setBatchRef(e.target.value)}
                  className="w-full text-xs bg-[#F6F5F3] border border-[#E7E5E2] rounded-xl px-3 py-2 text-[#111111] font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#111111] mb-1">
                  Data de Validade (FEFO):
                </label>
                <input
                  type="date"
                  value={expirationDate}
                  onChange={e => setExpirationDate(e.target.value)}
                  className="w-full text-xs bg-[#F6F5F3] border border-[#E7E5E2] rounded-xl px-3 py-2 text-[#111111]"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setReceivingOrderId(null)}
                className="flex-1 py-2 rounded-xl border border-[#E7E5E2] text-xs font-semibold text-[#6B6B6B]"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleConfirmReceive(receivingOrderId)}
                className="flex-1 py-2 rounded-xl bg-[#1B8A4F] text-white text-xs font-bold hover:bg-[#145C36]"
              >
                Efetivar Entrada
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
