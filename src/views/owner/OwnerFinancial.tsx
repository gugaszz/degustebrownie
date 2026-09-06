import React, { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Receipt,
  Plus,
  ArrowUpRight,
  PieChart as PieIcon,
  Calendar,
  Wallet,
  Trash2
} from 'lucide-react';
import { useStore } from '../../services/store';
import { formatCurrency, formatDate } from '../../utils/pix';

export const OwnerFinancial: React.FC = () => {
  const { state, isDateInFilter, addExpense, deleteExpense } = useStore();

  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmt, setExpenseAmt] = useState<number>(0);
  const [expenseCat, setExpenseCat] = useState<'packaging' | 'transport' | 'operational' | 'other'>('packaging');

  // Filter sales
  const filteredSales = state.sales.filter(
    s => s.status === 'confirmed' && isDateInFilter(s.created_at)
  );

  // Financial Indicators
  const grossRevenue = filteredSales.reduce((sum, s) => sum + s.total_amount, 0);
  const cogs = filteredSales.reduce((sum, s) => sum + s.total_cost, 0);
  const grossProfit = grossRevenue - cogs;
  const sellerCommissions = filteredSales.reduce((sum, s) => sum + s.seller_commission, 0);

  // Filter expenses
  const filteredExpenses = state.expenses.filter(e => isDateInFilter(e.expense_date));
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Net Operating Result for owner
  const netOperatingProfit = grossProfit - sellerCommissions - totalExpenses;
  const netMargin = grossRevenue > 0 ? (netOperatingProfit / grossRevenue) * 100 : 0;

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (expenseAmt <= 0 || !expenseDesc.trim()) return;
    addExpense({
      description: expenseDesc,
      amount: expenseAmt,
      category: expenseCat
    });
    setExpenseDesc('');
    setExpenseAmt(0);
    setIsAddingExpense(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#111111] tracking-tight">
            Demonstrativo Financeiro (DRE)
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-0.5">
            DRE gerencial com faturamento, CMV, comissões, despesas e resultado líquido real
          </p>
        </div>
        <button
          onClick={() => setIsAddingExpense(true)}
          className="px-4 py-2 rounded-xl bg-[#141414] text-white text-xs font-bold hover:bg-[#0A0A0A] transition flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Lançar Despesa Operacional</span>
        </button>
      </div>

      {/* Main KPI Cards — the seller's commission is treated as a cost here, so
          there is no separate "gross profit" line, just Faturamento, Comissões
          (a cost) and the final Lucro. */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-3xl bg-white border border-[#E7E5E2] shadow-xs">
          <span className="text-xs text-[#6B6B6B] font-medium block">Faturamento Bruto</span>
          <div className="text-2xl font-black text-[#111111] tabular-nums mt-1">
            {formatCurrency(grossRevenue)}
          </div>
          <span className="text-[11px] text-[#6B6B6B] mt-0.5 block">{filteredSales.length} vendas confirmadas</span>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-[#E7E5E2] shadow-xs">
          <span className="text-xs text-[#6B6B6B] font-medium block">Comissões Vendedores (custo)</span>
          <div className="text-2xl font-black text-[#A9761F] tabular-nums mt-1">
            {formatCurrency(sellerCommissions)}
          </div>
          <span className="text-[11px] text-[#6B6B6B] mt-0.5 block">CMV: {formatCurrency(cogs)}</span>
        </div>

        <div className="p-4 rounded-3xl bg-[#141414] text-white border border-[#141414] shadow-md">
          <span className="text-xs text-white/80 font-medium block">Lucro</span>
          <div className="text-2xl font-black text-white tabular-nums mt-1">
            {formatCurrency(netOperatingProfit)}
          </div>
          <span className="text-[11px] text-white/70 mt-0.5 block font-semibold">
            Margem: {netMargin.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* DRE Breakdown Table */}
      <div className="bg-white rounded-3xl border border-[#E7E5E2] shadow-xs p-6 space-y-4">
        <h3 className="font-bold text-sm text-[#111111] pb-2 border-b border-[#E7E5E2]">
          Estrutura do DRE Gerencial no Período Selecionado
        </h3>

        <div className="space-y-2.5 text-xs font-medium">
          {/* (+) Faturamento */}
          <div className="flex justify-between items-center py-2 px-3 rounded-xl bg-[#F6F5F3]">
            <span className="font-bold text-[#111111]">(+) Receita Operacional Bruta (Vendas)</span>
            <strong className="text-[#111111] font-black text-sm tabular-nums">
              {formatCurrency(grossRevenue)}
            </strong>
          </div>

          {/* (-) CMV */}
          <div className="flex justify-between items-center py-2 px-3">
            <span className="text-[#6B6B6B]">(-) Custo das Mercadorias Vendidas (CMV a R$ 4,00/un)</span>
            <span className="text-[#B3403D] font-bold tabular-nums">
              - {formatCurrency(cogs)}
            </span>
          </div>

          {/* (-) Comissões, tratada como custo direto da venda */}
          <div className="flex justify-between items-center py-2 px-3">
            <span className="text-[#6B6B6B]">(-) Comissões Pagas/Devidas aos Vendedores (custo)</span>
            <span className="text-[#A9761F] font-bold tabular-nums">
              - {formatCurrency(sellerCommissions)}
            </span>
          </div>

          {/* (-) Despesas */}
          <div className="flex justify-between items-center py-2 px-3">
            <span className="text-[#6B6B6B]">(-) Outras Despesas Operacionais (Embalagens, Fita, Gelo)</span>
            <span className="text-[#B3403D] font-bold tabular-nums">
              - {formatCurrency(totalExpenses)}
            </span>
          </div>

          {/* (=) Lucro */}
          <div className="flex justify-between items-center py-3 px-4 rounded-2xl bg-[#141414] text-white">
            <span className="font-black text-sm">(=) Lucro</span>
            <strong className="text-white font-black text-base tabular-nums">
              {formatCurrency(netOperatingProfit)}
            </strong>
          </div>
        </div>
      </div>

      {/* Expenses Section */}
      <div className="bg-white rounded-3xl border border-[#E7E5E2] shadow-xs p-5 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-[#111111]">Despesas Operacionais Lançadas</h3>
            <p className="text-xs text-[#6B6B6B]">Custos de embalagens, sacolas, transporte e conservação</p>
          </div>
          <span className="text-xs font-bold text-[#111111] bg-[#F6F5F3] px-3 py-1 rounded-xl">
            Total: {formatCurrency(totalExpenses)}
          </span>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="p-4 text-center text-xs text-[#6B6B6B]">
            Nenhuma despesa operacional lançada no período.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F6F5F3] border-b border-[#E7E5E2] text-[#6B6B6B] uppercase text-[10px] font-bold">
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-3">Descrição</th>
                  <th className="py-2.5 px-3">Categoria</th>
                  <th className="py-2.5 px-3 text-right">Valor</th>
                  <th className="py-2.5 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E5E2]/70">
                {filteredExpenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-[#F6F5F3]">
                    <td className="py-2.5 px-3 text-[#6B6B6B]">{formatDate(exp.expense_date)}</td>
                    <td className="py-2.5 px-3 font-semibold text-[#111111]">{exp.description}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EDEBE8] text-[#141414]">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-[#B3403D] tabular-nums">
                      {formatCurrency(exp.amount)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => setExpenseToDelete(exp.id)}
                        className="p-1 rounded-lg text-red-600 hover:bg-red-50 transition"
                        title="Excluir despesa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Expense Modal */}
      {expenseToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-[#E7E5E2] space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-sm text-[#111111]">Excluir Despesa?</h3>
              <p className="text-xs text-[#6B6B6B] mt-1">
                Deseja remover este lançamento do controle financeiro?
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setExpenseToDelete(null)}
                className="flex-1 py-2 rounded-xl border border-[#E7E5E2] text-xs font-semibold text-[#6B6B6B] hover:bg-[#F6F5F3]"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  deleteExpense(expenseToDelete);
                  setExpenseToDelete(null);
                }}
                className="flex-1 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {isAddingExpense && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-[#E7E5E2] space-y-4">
            <h3 className="font-bold text-sm text-[#111111]">Lançar Despesa Operacional</h3>
            <form onSubmit={handleAddExpense} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">Descrição:</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Sacolas plásticas e fita kraft"
                  value={expenseDesc}
                  onChange={e => setExpenseDesc(e.target.value)}
                  className="w-full text-xs bg-[#F6F5F3] border border-[#E7E5E2] rounded-xl px-3 py-2 text-[#111111]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">Valor (R$):</label>
                <input
                  type="number"
                  step="0.50"
                  min="0.5"
                  required
                  value={expenseAmt || ''}
                  onChange={e => setExpenseAmt(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs bg-[#F6F5F3] border border-[#E7E5E2] rounded-xl px-3 py-2 text-[#111111]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">Categoria:</label>
                <select
                  value={expenseCat}
                  onChange={e => setExpenseCat(e.target.value as any)}
                  className="w-full text-xs bg-[#F6F5F3] border border-[#E7E5E2] rounded-xl px-3 py-2 text-[#111111]"
                >
                  <option value="packaging">Embalagens e Sacolas</option>
                  <option value="transport">Combustível / Entrega</option>
                  <option value="operational">Conservação (Gelo térmico)</option>
                  <option value="other">Outros custos</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingExpense(false)}
                  className="px-3 py-2 text-xs font-semibold text-[#6B6B6B]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#141414] text-white text-xs font-bold rounded-xl"
                >
                  Salvar Despesa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
