import React, { useState } from 'react';
import {
  Menu,
  X,
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
  CalendarClock
} from 'lucide-react';
import { useStore } from '../services/store';

interface MobileNavigationProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenAlerts: () => void;
  onLogout: () => void;
  onOpenInstallModal: () => void;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  currentTab,
  onSelectTab,
  onOpenAlerts,
  onLogout,
  onOpenInstallModal
}) => {
  const { state, currentUser } = useStore();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const isOwner = currentUser.role === 'owner';

  // Alerts
  const pendingCommissionsCount = state.commissions.filter(c => c.status === 'pending').length;
  const centralStock = state.balances
    .filter(b => b.location_id === 'loc-central')
    .reduce((s, b) => s + b.quantity, 0);
  const hasAlerts = centralStock < 50 || pendingCommissionsCount > 0;

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
    { id: 'seller_home', label: 'Terminal', icon: Sparkles },
    { id: 'seller_sales', label: 'Vendas', icon: ShoppingBag },
    { id: 'seller_inventory', label: 'Estoque', icon: PackageCheck },
    { id: 'seller_reservations', label: 'Reservas', icon: CalendarClock },
    { id: 'seller_commissions', label: 'Comissões', icon: Wallet }
  ];

  const allTabs = isOwner ? ownerTabs : sellerTabs;

  // Bottom Quick Tabs
  const bottomTabs = isOwner
    ? [
        { id: 'dashboard', label: 'Início', icon: Compass },
        { id: 'sales', label: 'Vendas', icon: ShoppingBag },
        { id: 'inventory', label: 'Estoque', icon: Boxes },
        { id: 'financial', label: 'DRE', icon: ReceiptText }
      ]
    : [
        { id: 'seller_home', label: 'Vender', icon: Sparkles },
        { id: 'seller_sales', label: 'Vendas', icon: ShoppingBag },
        { id: 'seller_inventory', label: 'Estoque', icon: PackageCheck },
        { id: 'seller_commissions', label: 'Ganhos', icon: Wallet }
      ];

  const handleSelect = (tabId: string) => {
    onSelectTab(tabId);
    setIsDrawerOpen(false);
  };

  return (
    <div className="lg:hidden">
      {/* Mobile Top Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#E8E3DF] px-4 py-3 flex items-center justify-between">
        <div>
          <span className="font-display text-base font-semibold text-[#1E1612] tracking-tight block">
            Brownie Control
          </span>
          <span className="text-[10px] text-[#8C8079] block">
            {currentUser.name.split(' ')[0]} ({isOwner ? 'Dono' : 'Vendedor'})
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* PWA Download Button in Header */}
          <button
            onClick={onOpenInstallModal}
            className="p-2 rounded-xl text-[#261B16] bg-[#FAF8F5] border border-[#E8E3DF] text-[11px] font-bold flex items-center gap-1 hover:bg-[#F2EDE9] transition"
            title="Instalar App no celular"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">App</span>
          </button>

          {isOwner && (
            <button
              onClick={onOpenAlerts}
              className="relative p-2 rounded-xl text-[#8C8079] hover:text-[#1E1612] hover:bg-[#FAF8F5] transition"
            >
              <Bell className="w-4 h-4" />
              {hasAlerts && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white" />
              )}
            </button>
          )}

          <button
            onClick={() => setIsDrawerOpen(true)}
            className="p-2 rounded-xl text-[#5C524C] hover:text-[#1E1612] hover:bg-[#FAF8F5] transition"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Sliding Drawer for all menu items */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* Drawer Menu */}
          <div className="relative ml-auto w-full max-w-xs bg-white h-full shadow-2xl flex flex-col justify-between z-10 animate-in slide-in-from-right duration-200">
            <div>
              <div className="p-4 border-b border-[#F0ECE9] flex items-center justify-between">
                <span className="font-display text-sm font-semibold text-[#1E1612]">Navegação</span>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-[#8C8079] hover:bg-[#FAF8F5]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 space-y-1 max-h-[calc(100vh-160px)] overflow-y-auto">
                {allTabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = currentTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleSelect(tab.id)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                        isActive
                          ? 'bg-[#261B16] text-white'
                          : 'text-[#5C524C] hover:bg-[#FAF8F5]'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#8C8079]'}`} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-[#F0ECE9] bg-[#FAF8F5] space-y-2">
              <button
                onClick={() => {
                  setIsDrawerOpen(false);
                  onOpenInstallModal();
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-white border border-[#E8E3DF] text-xs font-bold text-[#1E1612] flex items-center justify-center gap-2 shadow-2xs"
              >
                <Smartphone className="w-4 h-4 text-[#261B16]" />
                <span>Instalar como App no Celular</span>
              </button>

              <button
                onClick={() => {
                  setIsDrawerOpen(false);
                  onLogout();
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-red-50 text-xs font-bold text-[#A82A2A] hover:bg-red-100 transition flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair da Conta</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E8E3DF] px-2 py-1 flex items-center justify-around shadow-lg">
        {bottomTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center py-1.5 px-3 rounded-xl transition ${
                isActive ? 'text-[#261B16] font-bold' : 'text-[#8C8079]'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-[#261B16]' : 'text-[#8C8079]'}`} />
              <span className="text-[10px] mt-0.5">{tab.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="flex flex-col items-center py-1.5 px-3 rounded-xl text-[#8C8079]"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Mais</span>
        </button>
      </nav>
    </div>
  );
};
