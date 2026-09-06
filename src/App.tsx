import React, { useState, useEffect } from 'react';
import { ShoppingBag } from 'lucide-react';
import { StoreProvider, useStore } from './services/store';
import { Header } from './components/Header';
import { AppSidebar } from './components/AppSidebar';
import { MobileNavigation } from './components/MobileNavigation';
import { LoginView } from './views/LoginView';
import { PWAInstallModal } from './components/PWAInstallModal';

// Modals
import { NewSaleModal } from './components/NewSaleModal';
import { TransferModal } from './components/TransferModal';
import { ReturnStockModal } from './components/ReturnStockModal';
import { LossModal } from './components/LossModal';
import { NewSellerModal } from './components/NewSellerModal';
import { NewPurchaseModal } from './components/NewPurchaseModal';
import { NewReservationModal } from './components/NewReservationModal';
import { PayoutModal } from './components/PayoutModal';
import { AlertsModal } from './components/AlertsModal';

// Owner Views
import { OwnerDashboard } from './views/owner/OwnerDashboard';
import { OwnerSales } from './views/owner/OwnerSales';
import { OwnerInventory } from './views/owner/OwnerInventory';
import { OwnerSellers } from './views/owner/OwnerSellers';
import { OwnerPerformance } from './views/owner/OwnerPerformance';
import { OwnerPurchases } from './views/owner/OwnerPurchases';
import { OwnerSuppliers } from './views/owner/OwnerSuppliers';
import { OwnerFinancial } from './views/owner/OwnerFinancial';
import { OwnerCommissions } from './views/owner/OwnerCommissions';
import { OwnerProducts } from './views/owner/OwnerProducts';
import { OwnerReports } from './views/owner/OwnerReports';
import { OwnerSettings } from './views/owner/OwnerSettings';
import { OwnerReservations } from './views/owner/OwnerReservations';

// Seller Views
import { SellerHome } from './views/seller/SellerHome';
import { SellerSales } from './views/seller/SellerSales';
import { SellerInventory } from './views/seller/SellerInventory';
import { SellerCommissions } from './views/seller/SellerCommissions';
import { SellerReservations } from './views/seller/SellerReservations';

function MainLayout() {
  const { currentUser } = useStore();
  const isOwner = currentUser.role === 'owner';

  // Login authentication state: start logged in or allow login screen
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('brownie_authenticated') === 'true';
  });

  // Current Navigation Tab
  const [currentTab, setCurrentTab] = useState<string>(isOwner ? 'dashboard' : 'seller_home');

  // Modals state
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferSellerId, setTransferSellerId] = useState<string | undefined>(undefined);
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [isLossOpen, setIsLossOpen] = useState(false);
  const [isNewSellerOpen, setIsNewSellerOpen] = useState(false);
  const [isNewPurchaseOpen, setIsNewPurchaseOpen] = useState(false);
  const [isNewReservationOpen, setIsNewReservationOpen] = useState(false);
  const [isPayoutOpen, setIsPayoutOpen] = useState(false);
  const [payoutSellerId, setPayoutSellerId] = useState<string | undefined>(undefined);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isPWAInstallOpen, setIsPWAInstallOpen] = useState(false);

  // Sync tab when switching role
  useEffect(() => {
    if (isOwner) {
      if (currentTab.startsWith('seller_')) {
        setCurrentTab('dashboard');
      }
    } else {
      if (!currentTab.startsWith('seller_')) {
        setCurrentTab('seller_home');
      }
    }
  }, [currentUser.role]);

  const handleOpenTransfer = (sellerId?: string) => {
    setTransferSellerId(sellerId);
    setIsTransferOpen(true);
  };

  const handleOpenPayout = (sellerId?: string) => {
    setPayoutSellerId(sellerId);
    setIsPayoutOpen(true);
  };

  const handleLoginSuccess = () => {
    localStorage.setItem('brownie_authenticated', 'true');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('brownie_authenticated');
    setIsAuthenticated(false);
  };

  // If not authenticated, show initial Login Screen
  if (!isAuthenticated) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1E1612] flex flex-col lg:flex-row font-sans selection:bg-[#261B16] selection:text-white">
      {/* Mobile Top Header, Bottom Bar & Drawer Menu */}
      <MobileNavigation
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenAlerts={() => setIsAlertsOpen(true)}
        onLogout={handleLogout}
        onOpenInstallModal={() => setIsPWAInstallOpen(true)}
      />

      {/* Mac-Style Desktop Sidebar on Left */}
      <AppSidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenAlerts={() => setIsAlertsOpen(true)}
        onLogout={handleLogout}
        onOpenInstallModal={() => setIsPWAInstallOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-8">
        {/* Desktop Topbar */}
        <Header
          onOpenAlerts={() => setIsAlertsOpen(true)}
          onOpenInstallModal={() => setIsPWAInstallOpen(true)}
          onLogout={handleLogout}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {/* Owner Views */}
          {isOwner && (
            <>
              {currentTab === 'dashboard' && (
                <OwnerDashboard
                  onNavigateTab={setCurrentTab}
                  onOpenTransfer={handleOpenTransfer}
                />
              )}
              {currentTab === 'sales' && <OwnerSales />}
              {currentTab === 'inventory' && (
                <OwnerInventory
                  onOpenTransfer={handleOpenTransfer}
                  onOpenReturn={() => setIsReturnOpen(true)}
                  onOpenLoss={() => setIsLossOpen(true)}
                />
              )}
              {currentTab === 'sellers' && (
                <OwnerSellers
                  onOpenNewSeller={() => setIsNewSellerOpen(true)}
                  onOpenTransfer={handleOpenTransfer}
                  onNavigatePerformance={() => setCurrentTab('performance')}
                />
              )}
              {currentTab === 'performance' && <OwnerPerformance />}
              {currentTab === 'purchases' && (
                <OwnerPurchases onOpenNewPurchase={() => setIsNewPurchaseOpen(true)} />
              )}
              {currentTab === 'suppliers' && <OwnerSuppliers />}
              {currentTab === 'reservations' && (
                <OwnerReservations onOpenNewReservation={() => setIsNewReservationOpen(true)} />
              )}
              {currentTab === 'financial' && <OwnerFinancial />}
              {currentTab === 'commissions' && (
                <OwnerCommissions onOpenPayout={handleOpenPayout} />
              )}
              {currentTab === 'products' && <OwnerProducts />}
              {currentTab === 'reports' && <OwnerReports />}
              {currentTab === 'settings' && (
                <OwnerSettings onOpenInstallModal={() => setIsPWAInstallOpen(true)} />
              )}
            </>
          )}

          {/* Seller Views */}
          {!isOwner && (
            <>
              {currentTab === 'seller_home' && (
                <SellerHome onNavigateTab={setCurrentTab} />
              )}
              {currentTab === 'seller_sales' && <SellerSales />}
              {currentTab === 'seller_inventory' && (
                <SellerInventory onOpenReturn={() => setIsReturnOpen(true)} />
              )}
              {currentTab === 'seller_commissions' && <SellerCommissions />}
              {currentTab === 'seller_reservations' && (
                <SellerReservations onOpenNewReservation={() => setIsNewReservationOpen(true)} />
              )}
            </>
          )}
        </main>
      </div>

      {/* Floating Action Button: Nova Venda, always reachable bottom-right */}
      <button
        id="btn-fab-new-sale"
        onClick={() => setIsNewSaleOpen(true)}
        className="fixed right-5 bottom-24 lg:bottom-6 z-40 w-14 h-14 rounded-full bg-[#3B241C] text-white shadow-xl hover:bg-[#2E1A14] active:scale-95 transition flex items-center justify-center"
        title="Registrar Nova Venda"
        aria-label="Registrar Nova Venda"
      >
        <ShoppingBag className="w-6 h-6" />
      </button>

      {/* Global Modals */}
      <NewSaleModal
        isOpen={isNewSaleOpen}
        onClose={() => setIsNewSaleOpen(false)}
      />

      <TransferModal
        isOpen={isTransferOpen}
        onClose={() => {
          setIsTransferOpen(false);
          setTransferSellerId(undefined);
        }}
        preSelectedSellerId={transferSellerId}
      />

      <ReturnStockModal
        isOpen={isReturnOpen}
        onClose={() => setIsReturnOpen(false)}
      />

      <LossModal
        isOpen={isLossOpen}
        onClose={() => setIsLossOpen(false)}
      />

      <NewSellerModal
        isOpen={isNewSellerOpen}
        onClose={() => setIsNewSellerOpen(false)}
      />

      <NewPurchaseModal
        isOpen={isNewPurchaseOpen}
        onClose={() => setIsNewPurchaseOpen(false)}
      />

      <NewReservationModal
        isOpen={isNewReservationOpen}
        onClose={() => setIsNewReservationOpen(false)}
      />

      <PayoutModal
        isOpen={isPayoutOpen}
        onClose={() => {
          setIsPayoutOpen(false);
          setPayoutSellerId(undefined);
        }}
        sellerId={payoutSellerId}
      />

      <AlertsModal
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        onNavigateTab={tab => {
          setIsAlertsOpen(false);
          setCurrentTab(tab);
        }}
      />

      {/* PWA Install Modal */}
      <PWAInstallModal
        isOpen={isPWAInstallOpen}
        onClose={() => setIsPWAInstallOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <MainLayout />
    </StoreProvider>
  );
}
