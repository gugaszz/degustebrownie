import React from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  Boxes,
  Users,
  Trophy,
  PackagePlus,
  Building2,
  Receipt,
  BadgeDollarSign,
  Tag,
  FileDown,
  Settings,
  Sparkles,
  Wallet
} from 'lucide-react';
import { useStore } from '../services/store';

interface NavigationProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentTab, onSelectTab }) => {
  const { currentUser } = useStore();
  const isOwner = currentUser.role === 'owner';

  const ownerTabs = [
    { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'sales', label: 'Vendas', icon: ShoppingBag },
    { id: 'inventory', label: 'Estoque', icon: Boxes },
    { id: 'sellers', label: 'Vendedores', icon: Users },
    { id: 'performance', label: 'Desempenho', icon: Trophy },
    { id: 'purchases', label: 'Compras', icon: PackagePlus },
    { id: 'suppliers', label: 'Fornecedores', icon: Building2 },
    { id: 'financial', label: 'Financeiro DRE', icon: Receipt },
    { id: 'commissions', label: 'Comissões', icon: BadgeDollarSign },
    { id: 'products', label: 'Produtos', icon: Tag },
    { id: 'reports', label: 'Relatórios', icon: FileDown },
    { id: 'settings', label: 'Configurações', icon: Settings }
  ];

  const sellerTabs = [
    { id: 'seller_home', label: 'Meu Terminal', icon: Sparkles },
    { id: 'seller_sales', label: 'Minhas Vendas', icon: ShoppingBag },
    { id: 'seller_inventory', label: 'Meu Estoque', icon: Boxes },
    { id: 'seller_commissions', label: 'Minhas Comissões', icon: Wallet }
  ];

  const tabs = isOwner ? ownerTabs : sellerTabs;

  return (
    <nav className="bg-white border-b border-[#EAE5E2] sticky top-[61px] z-20 overflow-x-auto scrollbar-none shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 flex gap-1 sm:gap-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`nav-tab-${tab.id}`}
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center gap-1.5 py-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
                isActive
                  ? 'border-[#3B241C] text-[#3B241C] bg-[#F8F6F4]/50'
                  : 'border-transparent text-[#746A65] hover:text-[#201A17] hover:bg-[#F8F6F4]/30'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#3B241C]' : 'text-[#746A65]'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
