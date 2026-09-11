import React, { useState } from 'react';
import {
  Boxes,
  ArrowRightLeft,
  ArrowDownLeft,
  AlertTriangle,
  Clock,
  History,
  TrendingDown,
  Layers,
  Plus,
  Trash2,
  PackagePlus
} from 'lucide-react';
import { useStore } from '../../services/store';
import { formatCurrency, formatDateTime, formatDate, toLocalDateStr } from '../../utils/pix';

interface OwnerInventoryProps {
  onOpenTransfer: (sellerId?: string) => void;
  onOpenReturn: () => void;
  onOpenLoss: () => void;
}

type TabType = 'overview' | 'central' | 'sellers' | 'movements' | 'losses';

export const OwnerInventory: React.FC<OwnerInventoryProps> = ({
  onOpenTransfer,
  onOpenReturn,
  onOpenLoss
}) => {
  const { state, getFlavorStock, createBatchManual, deleteBatch } = useStore();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [batchToDelete, setBatchToDelete] = useState<string | null>(null);
  const [isAddingBatch, setIsAddingBatch] = useState(false);

  // Form for manual batch entry
  const [newBatchFlavorId, setNewBatchFlavorId] = useState(state.flavors[0]?.id || '');
  const [newBatchQuantity, setNewBatchQuantity] = useState(20);
  const [newBatchCost, setNewBatchCost] = useState(state.settings.default_purchase_cost || 4.0);
  const [newBatchExpiration, setNewBatchExpiration] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return toLocalDateStr(d);
  });
  const [newBatchRef, setNewBatchRef] = useState('');
  const [newBatchNotes, setNewBatchNotes] = useState('');

  const handleCreateBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatchFlavorId || newBatchQuantity <= 0) return;
    createBatchManual({
      flavorId: newBatchFlavorId,
      quantity: Number(newBatchQuantity),
      expirationDate: newBatchExpiration,
      unitCost: Number(newBatchCost),
      batchRef: newBatchRef,
      notes: newBatchNotes
    });
    setIsAddingBatch(false);
    setNewBatchRef('');
    setNewBatchNotes('');
  };

  const centralLocation = state.locations.find(l => l.type === 'central') || state.locations[0];
  const activeFlavors = state.flavors.filter(f => f.active);
  const sellers = state.profiles.filter(p => p.role === 'seller');

  // Compute unit totals
  const centralStockTotal = activeFlavors.reduce(
    (sum, f) => sum + getFlavorStock(centralLocation.id, f.id),
    0
  );

  const sellersStockTotal = sellers.reduce((sum, s) => {
    const loc = state.locations.find(l => l.seller_id === s.id);
    if (!loc) return sum;
    return sum + activeFlavors.reduce((fSum, f) => fSum + getFlavorStock(loc.id, f.id), 0);
  }, 0);

  const grandTotal = centralStockTotal + sellersStockTotal;
  const inventoryCostValue = grandTotal * (state.settings.default_purchase_cost || 4.0);

  // Losses movements
  const lossesMovements = state.movements.filter(
    m => m.movement_type === 'loss' || m.movement_type === 'expired'
  );

  return (
    <div className="space-y-5">
      {/* Top Header & Fast Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#111111] tracking-tight">
            Controle de Estoque
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-0.5">
            Rastreabilidade completa de brownies entre o estoque central e vendedores
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onOpenTransfer()}
            className="px-3.5 py-2 rounded-xl bg-[#141414] text-white hover:bg-[#0A0A0A] text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Separar para Vendedor</span>
          </button>
          <button
            onClick={onOpenReturn}
            className="px-3.5 py-2 rounded-xl bg-white border border-[#E7E5E2] text-[#111111] hover:bg-[#F6F5F3] text-xs font-bold transition flex items-center gap-1.5"
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Devolver ao Central</span>
          </button>
          <button
            onClick={onOpenLoss}
            className="px-3.5 py-2 rounded-xl bg-white border border-[#E7E5E2] text-[#B3403D] hover:bg-red-50 text-xs font-bold transition flex items-center gap-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Registrar Perda</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-3xl bg-white border border-[#E7E5E2] shadow-xs">
          <span className="text-xs text-[#6B6B6B] font-medium block">Total Geral no Negócio</span>
          <div className="text-2xl font-black text-[#141414] tabular-nums mt-1">
            {grandTotal} brownies
          </div>
          <span className="text-[11px] text-[#6B6B6B] mt-0.5 block">Central + Vendedores</span>
        </div>
        <div className="p-4 rounded-3xl bg-white border border-[#E7E5E2] shadow-xs">
          <span className="text-xs text-[#6B6B6B] font-medium block">Estoque Central (Proprietário)</span>
          <div className="text-2xl font-black text-[#111111] tabular-nums mt-1">
            {centralStockTotal} brownies
          </div>
          <span className="text-[11px] text-[#6B6B6B] mt-0.5 block">Disponíveis para envio</span>
        </div>
        <div className="p-4 rounded-3xl bg-white border border-[#E7E5E2] shadow-xs">
          <span className="text-xs text-[#6B6B6B] font-medium block">Com os Vendedores</span>
          <div className="text-2xl font-black text-[#6B6B6B] tabular-nums mt-1">
            {sellersStockTotal} brownies
          </div>
          <span className="text-[11px] text-[#6B6B6B] mt-0.5 block">Em circulação para venda</span>
        </div>
        <div className="p-4 rounded-3xl bg-white border border-[#E7E5E2] shadow-xs">
          <span className="text-xs text-[#6B6B6B] font-medium block">Valor de Custo do Estoque</span>
          <div className="text-2xl font-black text-[#1B8A4F] tabular-nums mt-1">
            {formatCurrency(inventoryCostValue)}
          </div>
          <span className="text-[11px] text-[#6B6B6B] mt-0.5 block">Custo R$ 4,00 / unidade</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#E7E5E2] gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-[#141414] text-[#141414]'
              : 'border-transparent text-[#6B6B6B] hover:text-[#111111]'
          }`}
        >
          Visão Geral por Sabor
        </button>
        <button
          onClick={() => setActiveTab('central')}
          className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
            activeTab === 'central'
              ? 'border-[#141414] text-[#141414]'
              : 'border-transparent text-[#6B6B6B] hover:text-[#111111]'
          }`}
        >
          Estoque Central & Lotes (FEFO)
        </button>
        <button
          onClick={() => setActiveTab('sellers')}
          className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
            activeTab === 'sellers'
              ? 'border-[#141414] text-[#141414]'
              : 'border-transparent text-[#6B6B6B] hover:text-[#111111]'
          }`}
        >
          Estoque por Vendedor
        </button>
        <button
          onClick={() => setActiveTab('movements')}
          className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
            activeTab === 'movements'
              ? 'border-[#141414] text-[#141414]'
              : 'border-transparent text-[#6B6B6B] hover:text-[#111111]'
          }`}
        >
          Livro Razão de Movimentações
        </button>
        <button
          onClick={() => setActiveTab('losses')}
          className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
            activeTab === 'losses'
              ? 'border-[#141414] text-[#141414]'
              : 'border-transparent text-[#6B6B6B] hover:text-[#111111]'
          }`}
        >
          Perdas e Avarias
        </button>
      </div>

      {/* TAB CONTENT */}

      {/* 1. Overview by Flavor */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {activeFlavors.map(flavor => {
            const centralQty = getFlavorStock(centralLocation.id, flavor.id);
            const sellersQty = sellers.reduce((sum, s) => {
              const loc = state.locations.find(l => l.seller_id === s.id);
              return sum + (loc ? getFlavorStock(loc.id, flavor.id) : 0);
            }, 0);
            const flavorTotal = centralQty + sellersQty;

            return (
              <div key={flavor.id} className="p-5 rounded-3xl bg-white border border-[#E7E5E2] shadow-xs space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-sm text-[#111111]">Brownie de {flavor.name}</h3>
                    <span className="text-xs text-[#6B6B6B]">Gourmet Recheado</span>
                  </div>
                  <span className="text-lg font-black text-[#141414] tabular-nums">
                    {flavorTotal} un.
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-[#E7E5E2]">
                    <span className="text-[#6B6B6B]">No Estoque Central:</span>
                    <strong className="text-[#141414]">{centralQty} unidades</strong>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#E7E5E2]">
                    <span className="text-[#6B6B6B]">Com Vendedores:</span>
                    <strong className="text-[#111111]">{sellersQty} unidades</strong>
                  </div>
                  <div className="flex justify-between pt-1 font-semibold">
                    <span className="text-[#6B6B6B]">Valor em Custo:</span>
                    <span className="text-[#1B8A4F]">{formatCurrency(flavorTotal * 4.0)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. Central Inventory & FEFO Batches */}
      {activeTab === 'central' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-[#E7E5E2] shadow-xs p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E7E5E2] gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#111111]">
                  Lotes Ativos no Estoque Central (FEFO: Primeiro que Vence, Primeiro que Sai)
                </h3>
                <p className="text-xs text-[#6B6B6B] mt-0.5">
                  Controle rigoroso de validade para garantir o frescor e gerenciar perdas
                </p>
              </div>
              <button
                onClick={() => setIsAddingBatch(true)}
                className="px-3.5 py-2 rounded-xl bg-[#141414] text-white text-xs font-bold hover:bg-[#0A0A0A] transition flex items-center gap-1.5 self-start sm:self-auto shadow-xs"
              >
                <PackagePlus className="w-3.5 h-3.5" />
                <span>Entrada de Lote Avulso</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#F6F5F3] border-b border-[#E7E5E2] text-[#6B6B6B] uppercase text-[10px] font-bold">
                    <th className="py-2.5 px-3">Lote / Referência</th>
                    <th className="py-2.5 px-3">Sabor</th>
                    <th className="py-2.5 px-3">Recebido em</th>
                    <th className="py-2.5 px-3">Validade</th>
                    <th className="py-2.5 px-3">Qtd Recebida</th>
                    <th className="py-2.5 px-3">Qtd Restante</th>
                    <th className="py-2.5 px-3">Custo Unitário</th>
                    <th className="py-2.5 px-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E5E2]/70">
                  {state.batches.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-xs text-[#6B6B6B]">
                        Nenhum lote ativo no estoque central. Clique em "Entrada de Lote Avulso" ou dê entrada em um pedido de compra para alimentar o estoque central.
                      </td>
                    </tr>
                  ) : (
                    state.batches.map(batch => {
                    const exp = new Date(batch.expiration_date);
                    const today = new Date();
                    const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    const isExpiringSoon = diffDays <= 5;

                    return (
                      <tr key={batch.id} className="hover:bg-[#F6F5F3]">
                        <td className="py-2.5 px-3 font-mono font-bold text-[#111111]">
                          {batch.batch_reference}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-[#111111]">
                          {batch.flavor_name}
                        </td>
                        <td className="py-2.5 px-3 text-[#6B6B6B]">
                          {formatDate(batch.received_at)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isExpiringSoon ? 'bg-red-100 text-[#B3403D]' : 'bg-green-100 text-[#1B8A4F]'
                          }`}>
                            {formatDate(batch.expiration_date)} ({diffDays}d)
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[#6B6B6B] tabular-nums">
                          {batch.quantity_received} un.
                        </td>
                        <td className="py-2.5 px-3 font-bold text-[#141414] tabular-nums">
                          {batch.quantity_remaining} un.
                        </td>
                        <td className="py-2.5 px-3 text-[#6B6B6B] tabular-nums">
                          {formatCurrency(batch.unit_cost)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => setBatchToDelete(batch.id)}
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition"
                            title="Descartar ou excluir este lote"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. By Seller */}
      {activeTab === 'sellers' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sellers.map(seller => {
            const loc = state.locations.find(l => l.seller_id === seller.id);
            const totalSellerUnits = loc
              ? activeFlavors.reduce((sum, f) => sum + getFlavorStock(loc.id, f.id), 0)
              : 0;

            return (
              <div key={seller.id} className="bg-white rounded-3xl p-5 border border-[#E7E5E2] shadow-xs space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-sm text-[#111111]">{seller.name}</h3>
                    <span className="text-xs text-[#6B6B6B]">{seller.phone || seller.email}</span>
                  </div>
                  <span className="text-xl font-black text-[#141414] tabular-nums">
                    {totalSellerUnits} un.
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  {activeFlavors.map(f => {
                    const q = loc ? getFlavorStock(loc.id, f.id) : 0;
                    return (
                      <div key={f.id} className="flex justify-between py-1 border-b border-[#E7E5E2]/70">
                        <span className="text-[#6B6B6B]">{f.name}:</span>
                        <strong className="text-[#111111] tabular-nums">{q} brownies</strong>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    onClick={() => onOpenTransfer(seller.id)}
                    className="flex-1 py-2 rounded-xl bg-[#141414] text-white text-xs font-bold hover:bg-[#0A0A0A] transition"
                  >
                    Separar Estoque
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Immutable Movements Ledger */}
      {activeTab === 'movements' && (
        <div className="bg-white rounded-3xl border border-[#E7E5E2] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#E7E5E2] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#111111]">Livro Razão Imutável de Estoque</h3>
              <p className="text-xs text-[#6B6B6B]">Histórico auditável de todas as entradas, saídas e estornos</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F6F5F3] border-b border-[#E7E5E2] text-[#6B6B6B] uppercase text-[10px] font-bold">
                  <th className="py-2.5 px-4">Data/Hora</th>
                  <th className="py-2.5 px-3">Local</th>
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3">Sabor</th>
                  <th className="py-2.5 px-3">Delta</th>
                  <th className="py-2.5 px-3">Responsável</th>
                  <th className="py-2.5 px-4">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E5E2]/70">
                {state.movements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-[#6B6B6B]">
                      Nenhuma movimentação de estoque registrada até o momento.
                    </td>
                  </tr>
                ) : (
                  state.movements.map(mov => {
                  const isPositive = mov.quantity_delta > 0;
                  return (
                    <tr key={mov.id} className="hover:bg-[#F6F5F3]">
                      <td className="py-2.5 px-4 text-[#6B6B6B]">
                        {formatDateTime(mov.created_at)}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-[#111111]">
                        {mov.location_name}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EDEBE8] text-[#141414]">
                          {mov.movement_type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-[#111111]">
                        {mov.flavor_name}
                      </td>
                      <td className={`py-2.5 px-3 font-black tabular-nums ${isPositive ? 'text-[#1B8A4F]' : 'text-[#B3403D]'}`}>
                        {isPositive ? `+${mov.quantity_delta}` : mov.quantity_delta} un.
                      </td>
                      <td className="py-2.5 px-3 text-[#6B6B6B]">
                        {mov.created_by}
                      </td>
                      <td className="py-2.5 px-4 text-[#6B6B6B] text-[11px] truncate max-w-xs">
                        {mov.notes || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Losses */}
      {activeTab === 'losses' && (
        <div className="bg-white rounded-3xl border border-[#E7E5E2] shadow-xs p-5">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#111111]">Histórico de Perdas e Avarias</h3>
              <p className="text-xs text-[#6B6B6B]">Registro formal com motivo obrigatório</p>
            </div>
            <button
              onClick={onOpenLoss}
              className="px-3.5 py-1.5 rounded-xl bg-[#B3403D] text-white text-xs font-bold hover:bg-[#8A2E2E]"
            >
              Nova Baixa
            </button>
          </div>

          {lossesMovements.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#6B6B6B]">
              Nenhuma perda registrada até o momento. Excelente controle operacional!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#F6F5F3] border-b border-[#E7E5E2] text-[#6B6B6B] uppercase text-[10px] font-bold">
                    <th className="py-2 px-3">Data</th>
                    <th className="py-2 px-3">Local</th>
                    <th className="py-2 px-3">Sabor</th>
                    <th className="py-2 px-3">Qtd Perdida</th>
                    <th className="py-2 px-3">Impacto Financeiro</th>
                    <th className="py-2 px-3">Motivo / Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E5E2]/70">
                  {lossesMovements.map(l => (
                    <tr key={l.id} className="hover:bg-red-50/40">
                      <td className="py-2.5 px-3 text-[#6B6B6B]">{formatDateTime(l.created_at)}</td>
                      <td className="py-2.5 px-3 font-semibold text-[#111111]">{l.location_name}</td>
                      <td className="py-2.5 px-3 font-bold text-[#111111]">{l.flavor_name}</td>
                      <td className="py-2.5 px-3 font-bold text-[#B3403D]">{Math.abs(l.quantity_delta)} brownies</td>
                      <td className="py-2.5 px-3 font-semibold text-[#B3403D]">{formatCurrency(Math.abs(l.quantity_delta) * 4.0)}</td>
                      <td className="py-2.5 px-3 text-[#6B6B6B]">{l.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Manual Batch Entry Modal */}
      {isAddingBatch && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-[#E7E5E2] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E7E5E2]">
              <h3 className="font-bold text-sm text-[#111111] flex items-center gap-1.5">
                <PackagePlus className="w-4 h-4 text-[#141414]" />
                <span>Entrada de Lote Avulso no Estoque Central</span>
              </h3>
              <button
                onClick={() => setIsAddingBatch(false)}
                className="text-xs text-[#6B6B6B] hover:text-[#111111]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">Sabor:</label>
                <select
                  required
                  value={newBatchFlavorId}
                  onChange={e => setNewBatchFlavorId(e.target.value)}
                  className="w-full text-xs bg-[#F6F5F3] border border-[#E7E5E2] rounded-xl px-3 py-2 text-[#111111]"
                >
                  {state.flavors.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">Quantidade:</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newBatchQuantity}
                    onChange={e => setNewBatchQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full text-xs bg-[#F6F5F3] border border-[#E7E5E2] rounded-xl px-3 py-2 text-[#111111]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">Custo Unitário (R$):</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={newBatchCost}
                    onChange={e => setNewBatchCost(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs bg-[#F6F5F3] border border-[#E7E5E2] rounded-xl px-3 py-2 text-[#111111]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">Validade (FEFO):</label>
                  <input
                    type="date"
                    required
                    value={newBatchExpiration}
                    onChange={e => setNewBatchExpiration(e.target.value)}
                    className="w-full text-xs bg-[#F6F5F3] border border-[#E7E5E2] rounded-xl px-3 py-2 text-[#111111]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">Código/Ref Lote:</label>
                  <input
                    type="text"
                    placeholder="Auto se vazio"
                    value={newBatchRef}
                    onChange={e => setNewBatchRef(e.target.value)}
                    className="w-full text-xs bg-[#F6F5F3] border border-[#E7E5E2] rounded-xl px-3 py-2 text-[#111111]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">Observações:</label>
                <input
                  type="text"
                  placeholder="Ex: Produção interna ou reposição manual"
                  value={newBatchNotes}
                  onChange={e => setNewBatchNotes(e.target.value)}
                  className="w-full text-xs bg-[#F6F5F3] border border-[#E7E5E2] rounded-xl px-3 py-2 text-[#111111]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingBatch(false)}
                  className="px-3 py-2 text-xs font-semibold text-[#6B6B6B]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#141414] text-white text-xs font-bold rounded-xl hover:bg-[#0A0A0A]"
                >
                  Confirmar Entrada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete / Discard Batch Confirmation Modal */}
      {batchToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-[#E7E5E2] space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-sm text-[#111111]">Descartar / Excluir Lote?</h3>
              <p className="text-xs text-[#6B6B6B] mt-1">
                As unidades restantes deste lote serão removidas do estoque central com registro no livro razão de movimentações.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setBatchToDelete(null)}
                className="flex-1 py-2 rounded-xl border border-[#E7E5E2] text-xs font-semibold text-[#6B6B6B] hover:bg-[#F6F5F3]"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  deleteBatch(batchToDelete);
                  setBatchToDelete(null);
                }}
                className="flex-1 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700"
              >
                Sim, Remover Lote
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
