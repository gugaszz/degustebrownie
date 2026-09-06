import React from 'react';
import {
  Compass,
  ShoppingBag,
  Boxes,
  Users2,
  TrendingUp,
  Truck,
  Factory,
  ReceiptText,
  Coins,
  UtensilsCrossed,
  FileSpreadsheet,
  SlidersHorizontal,
  Sparkles,
  PackageCheck,
  Wallet,
  Smartphone,
  LogOut,
  Bell,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  CalendarClock
} from 'lucide-react';
import { useStore } from '../services/store';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface AppSidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenAlerts: () => void;
  onLogout: () => void;
  onOpenInstallModal: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  currentTab,
  onSelectTab,
  onOpenAlerts,
  onLogout,
  onOpenInstallModal
}) => {
  const { state, currentUser } = useStore();
  const { isInstalled } = usePWAInstall();
  const isOwner = currentUser.role === 'owner';

  // Compute active alerts count
  const centralStock = state.balances
    .filter(b => b.location_id === 'loc-central')
    .reduce((s, b) => s + b.quantity, 0);
  const lowCentralStock = centralStock < 50;

  const today = new Date();
  const expiringBatches = state.batches.filter(b => {
    const exp = new Date(b.expiration_date);
    const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 5 && diffDays >= 0 && b.quantity_remaining > 0;
  });
  const pendingCommissionsCount = state.commissions.filter(c => c.status === 'pending').length;
  const totalAlerts = (lowCentralStock ? 1 : 0) + expiringBatches.length + (pendingCommissionsCount > 0 ? 1 : 0);

  const ownerTabs = [
    { id: 'dashboard', label: 'Visão Geral', icon: Compass },
    { id: 'sales', label: 'Vendas & Pix', icon: ShoppingBag },
    { id: 'inventory', label: 'Estoque & FEFO', icon: Boxes },
    { id: 'sellers', label: 'Vendedores', icon: Users2 },
    { id: 'performance', label: 'Desempenho', icon: TrendingUp },
    { id: 'purchases', label: 'Compras & Lotes', icon: Truck },
    { id: 'suppliers', label: 'Fornecedores', icon: Factory },
    { id: 'reservations', label: 'Reservas', icon: CalendarClock },
    { id: 'financial', label: 'Financeiro DRE', icon: ReceiptText },
    { id: 'commissions', label: 'Comissões', icon: Coins },
    { id: 'products', label: 'Sabores & Tabela', icon: UtensilsCrossed },
    { id: 'reports', label: 'Relatórios CSV', icon: FileSpreadsheet },
    { id: 'settings', label: 'Configurações', icon: SlidersHorizontal }
  ];

  const sellerTabs = [
    { id: 'seller_home', label: 'Terminal de Vendas', icon: Sparkles },
    { id: 'seller_sales', label: 'Minhas Vendas', icon: ShoppingBag },
    { id: 'seller_inventory', label: 'Meu Estoque', icon: PackageCheck },
    { id: 'seller_reservations', label: 'Reservas', icon: CalendarClock },
    { id: 'seller_commissions', label: 'Minhas Comissões', icon: Wallet }
  ];

  const tabs = isOwner ? ownerTabs : sellerTabs;

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-[#E8E3DF] h-screen sticky top-0 shrink-0 select-none z-30">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#F0ECE9] flex items-center justify-between">
        <div>
          <span className="font-display text-lg font-semibold text-[#1E1612] tracking-tight block">
            Brownie Control
          </span>
          <span className="text-[11px] text-[#8C8079] font-medium block">
            {isOwner ? 'Painel do Proprietário' : 'Terminal do Vendedor'}
          </span>
        </div>

        {/* Alerts Bell Button */}
        {isOwner && (
          <button
            onClick={onOpenAlerts}
            className="relative p-2 rounded-xl text-[#8C8079] hover:text-[#1E1612] hover:bg-[#FAF8F5] transition cursor-pointer"
            title="Alertas operacionais"
          >
            <Bell className="w-4 h-4" />
            {totalAlerts > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white" />
            )}
          </button>
        )}
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin">
        <div className="px-3 pb-2 text-[10px] font-bold text-[#A39992] uppercase tracking-wider">
          Menu Principal
        </div>

        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`sidebar-tab-${tab.id}`}
              onClick={() => onSelectTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer group ${
                isActive
                  ? 'bg-[#261B16] text-white shadow-2xs'
                  : 'text-[#5C524C] hover:text-[#1E1612] hover:bg-[#FAF8F5]'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#8C8079] group-hover:text-[#1E1612]'}`} />
              <span className="truncate">{tab.label}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400" />
              )}
            </button>
          );
        })}
      </div>

      {/* Install PWA Prompt Card in Sidebar */}
      {!isInstalled && (
        <div className="p-3 mx-3 mb-2 rounded-2xl bg-[#FAF8F5] border border-[#E8E3DF]">
          <div className="flex items-center gap-2 mb-1">
            <Smartphone className="w-4 h-4 text-[#261B16]" />
            <span className="text-xs font-bold text-[#1E1612]">Instalar no Celular</span>
          </div>
          <p className="text-[11px] text-[#786D66] mb-2 leading-relaxed">
            Tenha acesso rápido direto da tela inicial com suporte offline
          </p>
          <button
            onClick={onOpenInstallModal}
            className="w-full py-2 px-3 rounded-xl bg-[#261B16] hover:bg-[#150F0D] text-white text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <span>Baixar como App</span>
          </button>
        </div>
      )}

      {/* User Account & Logout Footer */}
      <div className="p-3 border-t border-[#F0ECE9] bg-[#FAF8F5]/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#261B16] text-white flex items-center justify-center text-xs font-black shrink-0">
            {currentUser.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-[#1E1612] truncate">{currentUser.name}</div>
            <div className="text-[10px] text-[#8C8079] capitalize truncate">
              {currentUser.role === 'owner' ? 'Proprietário' : 'Vendedor'}
            </div>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="p-2 rounded-xl text-[#8C8079] hover:text-[#A82A2A] hover:bg-red-50 transition cursor-pointer shrink-0"
          title="Sair da Conta"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
