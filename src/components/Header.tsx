import React, { useState } from 'react';
import {
  Calendar,
  Bell,
  ChevronDown,
  RotateCcw,
  CheckCircle2,
  Smartphone,
  Database,
  LogOut,
  Sparkles
} from 'lucide-react';
import { useStore } from '../services/store';
import { DateFilterOption } from '../types';

interface HeaderProps {
  onOpenAlerts: () => void;
  onOpenInstallModal: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenAlerts, onOpenInstallModal, onLogout }) => {
  const { state, switchUser, setDateFilter, currentUser } = useStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showDateMenu, setShowDateMenu] = useState(false);

  const isOwner = currentUser.role === 'owner';

  // Compute active alerts
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

  const dateOptions: { id: DateFilterOption; label: string }[] = [
    { id: 'today', label: 'Hoje' },
    { id: 'this_week', label: 'Esta semana' },
    { id: 'this_month', label: 'Este mês' },
    { id: 'last_month', label: 'Último mês' }
  ];

  const currentDateLabel = dateOptions.find(o => o.id === state.dateFilter.option)?.label || 'Hoje';

  return (
    <header className="hidden lg:flex sticky top-0 z-20 bg-white/95 backdrop-blur-xs border-b border-[#E7E5E2] px-6 py-3 items-center justify-between gap-4">
      {/* Left indicator: Active Mode */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-[#111111]">{state.settings.name}</span>
        <span className="text-xs text-[#6B6B6B]">
          · {isOwner ? 'Painel de Controle' : 'Terminal do Vendedor'}
        </span>
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-2.5">
        {/* PWA Install Button */}
        <button
          onClick={onOpenInstallModal}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-[#E7E5E2] bg-[#F3F1EE] hover:bg-[#F1EFEC] transition text-[#111111] cursor-pointer"
          title="Instalar Brownie Control como app no celular"
        >
          <Smartphone className="w-3.5 h-3.5 text-[#141414]" />
          <span>Baixar como App</span>
        </button>

        {/* Global Date Filter */}
        {isOwner && (
          <div className="relative">
            <button
              id="btn-date-filter"
              onClick={() => setShowDateMenu(!showDateMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-[#E7E5E2] bg-[#F3F1EE] hover:bg-[#F1EFEC] transition text-[#111111] cursor-pointer"
              title="Filtrar período das métricas"
            >
              <Calendar className="w-3.5 h-3.5 text-[#9A9A9A]" />
              <span>{currentDateLabel}</span>
              <ChevronDown className="w-3 h-3 text-[#9A9A9A]" />
            </button>

            {showDateMenu && (
              <div className="absolute right-0 mt-1 w-44 bg-white border border-[#E7E5E2] rounded-2xl shadow-xl py-1 z-40">
                <div className="px-3 py-1.5 text-[10px] font-bold text-[#9A9A9A] uppercase tracking-wider border-b border-[#EFEDEA]">
                  Período
                </div>
                {dateOptions.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setDateFilter(opt.id);
                      setShowDateMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs transition flex items-center justify-between ${
                      state.dateFilter.option === opt.id
                        ? 'bg-[#F3F1EE] text-[#141414] font-bold'
                        : 'text-[#8A8A8A] hover:bg-[#F3F1EE]'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {state.dateFilter.option === opt.id && <CheckCircle2 className="w-3.5 h-3.5 text-[#141414]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Alerts Bell Button */}
        {isOwner && (
          <button
            id="btn-alerts-modal"
            onClick={onOpenAlerts}
            className="relative p-2 text-[#6B6B6B] hover:text-[#111111] hover:bg-[#F3F1EE] rounded-xl transition cursor-pointer"
            title="Alertas operacionais"
          >
            <Bell className="w-4 h-4" />
            {totalAlerts > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                {totalAlerts}
              </span>
            )}
          </button>
        )}

        {/* Quick User Switcher dropdown */}
        <div className="relative">
          <button
            id="btn-user-switcher"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#E7E5E2] bg-white hover:border-[#141414] transition text-left cursor-pointer"
          >
            <div className="w-6 h-6 rounded-lg bg-[#141414] text-white flex items-center justify-center text-[10px] font-black">
              {currentUser.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="text-xs font-bold text-[#111111]">
              {currentUser.name.split(' ')[0]}
            </div>
            <ChevronDown className="w-3 h-3 text-[#9A9A9A]" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-1 w-64 bg-white border border-[#E7E5E2] rounded-2xl shadow-xl py-2 z-40 animate-in fade-in duration-100">
              <div className="px-3 py-1 text-[10px] font-bold text-[#9A9A9A] uppercase tracking-wider">
                Conta Conectada
              </div>
              <div className="text-[11px] text-[#6B6B6B] px-3 pb-2 border-b border-[#EFEDEA]">
                {currentUser.name} ({currentUser.role === 'owner' ? 'Proprietário' : 'Vendedor'})
              </div>

              {state.profiles.length > 1 && (
                <div className="max-h-60 overflow-y-auto py-1 border-b border-[#EFEDEA]">
                  <div className="px-3 py-1 text-[10px] font-bold text-[#9A9A9A] uppercase tracking-wider">
                    Alternar Conta
                  </div>
                  {state.profiles.map(user => {
                    const isSelected = user.id === currentUser.id;
                    return (
                      <button
                        key={user.id}
                        onClick={() => {
                          switchUser(user.id);
                          setShowUserMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition ${
                          isSelected ? 'bg-[#F3F1EE] text-[#141414] font-bold' : 'hover:bg-[#F3F1EE] text-[#8A8A8A]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold ${
                            user.role === 'owner' ? 'bg-[#141414] text-white' : 'bg-[#1B8A4F] text-white'
                          }`}>
                            {user.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-xs text-[#111111]">{user.name}</div>
                            <div className="text-[10px] text-[#6B6B6B]">
                              {user.role === 'owner' ? 'Proprietário' : 'Vendedor'}
                            </div>
                          </div>
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-[#141414]" />}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="pt-2 px-3">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onLogout();
                  }}
                  className="w-full text-left text-xs text-[#8A2E2E] hover:bg-red-50 flex items-center gap-1.5 py-1.5 px-2 rounded-xl transition cursor-pointer font-bold"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sair do Sistema
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
