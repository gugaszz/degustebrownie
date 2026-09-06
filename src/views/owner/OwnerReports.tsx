import React from 'react';
import { Download, FileText, Table, CheckCircle2 } from 'lucide-react';
import { useStore } from '../../services/store';
import { formatCurrency, formatDateTime } from '../../utils/pix';

export const OwnerReports: React.FC = () => {
  const { state } = useStore();

  const downloadCSV = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 1. Export Sales
  const exportSales = () => {
    const headers = ['TXID Pix', 'Data/Hora', 'Vendedor', 'Qtd Total', 'Valor Total (R$)', 'Custo (R$)', 'Comissão (R$)', 'Lucro (R$)', 'Status'];
    const rows = state.sales.map(s => [
      s.pix_txid,
      formatDateTime(s.created_at),
      `"${s.seller_name}"`,
      s.total_quantity,
      s.total_amount.toFixed(2),
      s.total_cost.toFixed(2),
      s.seller_commission.toFixed(2),
      s.owner_gross_result.toFixed(2),
      s.status
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCSV(`vendas_brownie_control_${new Date().toISOString().slice(0, 10)}.csv`, csvContent);
  };

  // 2. Export Inventory
  const exportInventory = () => {
    const headers = ['Local', 'Tipo', 'Sabor', 'Quantidade'];
    const rows = state.balances.map(b => [
      `"${b.location_name}"`,
      b.location_type,
      `"${b.flavor_name}"`,
      b.quantity
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCSV(`estoque_brownie_control_${new Date().toISOString().slice(0, 10)}.csv`, csvContent);
  };

  // 3. Export Commissions
  const exportCommissions = () => {
    const headers = ['Data', 'Vendedor', 'Descrição', 'Valor (R$)', 'Status'];
    const rows = state.commissions.map(c => [
      formatDateTime(c.created_at),
      `"${c.seller_name}"`,
      `"${c.description}"`,
      c.amount.toFixed(2),
      c.status
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCSV(`comissoes_brownie_control_${new Date().toISOString().slice(0, 10)}.csv`, csvContent);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-[#111111] tracking-tight">
          Relatórios & Exportação
        </h1>
        <p className="text-xs text-[#6B6B6B] mt-0.5">
          Baixe os dados estruturados do seu negócio em formato CSV compatível com Excel e Google Sheets
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Sales Report */}
        <div className="p-5 rounded-3xl bg-white border border-[#E7E5E2] shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-[#F6F5F3] text-[#141414] flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-[#111111]">Relatório de Vendas</h3>
            <p className="text-xs text-[#6B6B6B] leading-relaxed">
              Exporta todas as transações, valores faturados, custos unitários, comissões de vendedores e lucros do proprietário.
            </p>
          </div>
          <button
            onClick={exportSales}
            className="w-full py-2.5 px-4 rounded-xl bg-[#141414] text-white text-xs font-bold hover:bg-[#0A0A0A] transition flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Baixar CSV de Vendas</span>
          </button>
        </div>

        {/* Inventory Report */}
        <div className="p-5 rounded-3xl bg-white border border-[#E7E5E2] shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-[#F6F5F3] text-[#141414] flex items-center justify-center">
              <Table className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-[#111111]">Relatório de Estoque</h3>
            <p className="text-xs text-[#6B6B6B] leading-relaxed">
              Exporta os saldos atuais por sabor em cada local de armazenamento (estoque central e vendedores).
            </p>
          </div>
          <button
            onClick={exportInventory}
            className="w-full py-2.5 px-4 rounded-xl bg-[#141414] text-white text-xs font-bold hover:bg-[#0A0A0A] transition flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Baixar CSV de Estoque</span>
          </button>
        </div>

        {/* Commissions Report */}
        <div className="p-5 rounded-3xl bg-white border border-[#E7E5E2] shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-[#F6F5F3] text-[#1B8A4F] flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-[#111111]">Relatório de Comissões</h3>
            <p className="text-xs text-[#6B6B6B] leading-relaxed">
              Histórico detalhado de comissões calculadas, valores pendentes de repasse e pagamentos confirmados.
            </p>
          </div>
          <button
            onClick={exportCommissions}
            className="w-full py-2.5 px-4 rounded-xl bg-[#1B8A4F] text-white text-xs font-bold hover:bg-[#145C36] transition flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Baixar CSV de Comissões</span>
          </button>
        </div>
      </div>
    </div>
  );
};
