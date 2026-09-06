import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Minus,
  QrCode,
  Copy,
  Check,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  ShieldAlert,
  Sparkles,
  ShoppingBag,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { useStore } from '../services/store';
import { formatCurrency } from '../utils/pix';
import { Sale } from '../types';

interface NewSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaleComplete?: (sale: Sale) => void;
}

type Step = 1 | 2 | 3 | 4 | 5;

export const NewSaleModal: React.FC<NewSaleModalProps> = ({ isOpen, onClose, onSaleComplete }) => {
  const { state, confirmSale, getSellerLocation, getFlavorStock } = useStore();
  const [selectedSellerId, setSelectedSellerId] = useState<string>(state.currentUser.id);

  const currentSeller = state.profiles.find(p => p.id === selectedSellerId) || state.currentUser;
  const centralLocation = state.locations.find(l => l.type === 'central') || state.locations[0];
  const sellerLocation = currentSeller.role === 'owner' ? centralLocation : (getSellerLocation(currentSeller.id) || centralLocation);

  // Flow State
  const [step, setStep] = useState<Step>(1);
  const [totalQuantity, setTotalQuantity] = useState<number>(1);
  const [applyDiscount, setApplyDiscount] = useState<boolean>(true);
  const [flavorSelections, setFlavorSelections] = useState<Record<string, number>>({});
  const [copiedPix, setCopiedPix] = useState<boolean>(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);

  // Active flavors with seller stock
  const activeFlavors = state.flavors.filter(f => f.active);

  // Reset modal when opened
  useEffect(() => {
    if (isOpen) {
      setSelectedSellerId(state.currentUser.id);
      setStep(1);
      setTotalQuantity(1);
      setApplyDiscount(true);
      setFlavorSelections({});
      setCopiedPix(false);
      setShowConfirmDialog(false);
      setIsProcessing(false);
      setErrorMessage(null);
      setCompletedSale(null);
    }
  }, [isOpen, state.currentUser.id]);

  if (!isOpen) return null;

  // Calculate pricing based on quantity
  // 1 unit = 10.00; 2+ units = 9.00 each — unless the seller turns the discount off
  const fullUnitPrice = 10.0;
  const unitPrice = applyDiscount && totalQuantity >= 2 ? 9.0 : fullUnitPrice;
  const totalAmount = totalQuantity * unitPrice;
  const discountEligible = totalQuantity >= 2;

  // Total selected across flavors in Step 2
  const selectedFlavorsCount = (Object.values(flavorSelections) as number[]).reduce<number>((sum, qty) => sum + (Number(qty) || 0), 0);
  const remainingToSelect = totalQuantity - selectedFlavorsCount;

  // Total stock seller currently holds
  const totalSellerStock = activeFlavors.reduce((sum, f) => {
    return sum + (sellerLocation ? getFlavorStock(sellerLocation.id, f.id) : 0);
  }, 0);

  // Quick quantity options
  const quickQuantities = [1, 2, 3, 4, 5];

  // Adjust total quantity in Step 1
  const handleQuantityChange = (qty: number) => {
    const validQty = Math.max(1, Math.min(qty, totalSellerStock || 99));
    setTotalQuantity(validQty);
    setFlavorSelections({});
    setErrorMessage(null);
  };

  // Adjust flavor quantity in Step 2
  const handleFlavorCount = (flavorId: string, delta: number) => {
    const currentQty = flavorSelections[flavorId] || 0;
    const newQty = currentQty + delta;
    if (newQty < 0) return;

    // Check flavor stock
    const availableStock = sellerLocation ? getFlavorStock(sellerLocation.id, flavorId) : 0;
    if (newQty > availableStock) {
      setErrorMessage(`Você só possui ${availableStock} brownie(s) deste sabor no estoque.`);
      return;
    }

    // Check if exceeding total sale quantity
    if (delta > 0 && selectedFlavorsCount >= totalQuantity) {
      setErrorMessage(`Você já distribuiu todos os ${totalQuantity} brownies.`);
      return;
    }

    setErrorMessage(null);
    setFlavorSelections(prev => {
      const updated = { ...prev, [flavorId]: newQty };
      if (newQty === 0) {
        delete updated[flavorId];
      }
      return updated;
    });
  };

  // Move from Step 1 to Step 2
  const goToStep2 = () => {
    if (totalSellerStock < totalQuantity) {
      setErrorMessage(`Estoque insuficiente. Você possui apenas ${totalSellerStock} brownies disponíveis.`);
      return;
    }
    setErrorMessage(null);

    // Auto-allocate if user has only one flavor with enough stock
    const singleAvailable = activeFlavors.filter(f => sellerLocation && getFlavorStock(sellerLocation.id, f.id) >= totalQuantity);
    if (singleAvailable.length === 1 && totalQuantity === 1) {
      setFlavorSelections({ [singleAvailable[0].id]: 1 });
    }
    setStep(2);
  };

  // Move from Step 2 to Step 3
  const goToStep3 = () => {
    if (selectedFlavorsCount !== totalQuantity) {
      setErrorMessage(`A soma dos sabores (${selectedFlavorsCount}) deve ser exatamente igual à quantidade escolhida (${totalQuantity}).`);
      return;
    }
    setErrorMessage(null);
    setStep(3);
  };

  // Move to Step 4: always shows the owner's own fixed bank QR Code image
  // (uploaded once in Settings/the app) instead of generating one — the
  // client scans it with their bank app and types the amount shown on screen.
  const handleGeneratePix = () => {
    setStep(4);
  };

  // Copy the configured Pix key to clipboard (not a generated payload)
  const handleCopyPix = () => {
    const pixKey = state.settings.pix_key;
    if (pixKey) {
      navigator.clipboard.writeText(pixKey);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 3000);
    }
  };

  // Confirm Sale in Step 5
  const handleConfirmSale = () => {
    setIsProcessing(true);
    setShowConfirmDialog(false);

    // Build items payload
    const items: { flavorId: string; quantity: number }[] = Object.entries(flavorSelections).map(([flavorId, quantity]) => ({
      flavorId,
      quantity: Number(quantity)
    }));

    const result = confirmSale({
      sellerId: currentSeller.id,
      items,
      applyDiscount
    });

    setIsProcessing(false);

    if (result.success && result.sale) {
      setCompletedSale(result.sale);
      if (onSaleComplete) {
        onSaleComplete(result.sale);
      }
    } else {
      setErrorMessage(result.error || 'Erro ao confirmar a venda.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-[#EAE5E2] overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#EAE5E2] flex items-center justify-between bg-[#F8F6F4]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#3B241C] text-white flex items-center justify-center font-bold text-xs">
              BC
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#201A17]">
                {completedSale ? 'Venda Concluída!' : 'Nova Venda de Brownies'}
              </h2>
              <p className="text-[11px] text-[#746A65]">
                Vendedor: <span className="font-semibold text-[#3B241C]">{currentSeller.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#746A65] hover:bg-[#EEE7E3] hover:text-[#201A17] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Progress Bar (Hidden when finished) */}
        {!completedSale && (
          <div className="bg-white px-5 pt-3 pb-1 border-b border-[#EAE5E2]">
            <div className="flex items-center justify-between text-[11px] font-semibold text-[#746A65] mb-1.5">
              <span>Etapa {step} de 5</span>
              <span>
                {step === 1 && 'Quantidade'}
                {step === 2 && 'Sabores'}
                {step === 3 && 'Resumo'}
                {step === 4 && 'Pagamento Pix'}
                {step === 5 && 'Confirmação'}
              </span>
            </div>
            <div className="h-1.5 w-full bg-[#EEE7E3] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#3B241C] transition-all duration-300 rounded-full"
                style={{ width: `${(step / 5) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* =======================================================
              STEP 1: QUANTIDADE
             ======================================================= */}
          {step === 1 && !completedSale && (
            <div className="space-y-5">
              {/* Owner origin selector */}
              {state.currentUser.role === 'owner' && (
                <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#E8E3DF] space-y-1.5">
                  <label className="block text-[11px] font-bold text-[#786D66] uppercase tracking-wider">
                    Origem da Venda:
                  </label>
                  <select
                    value={selectedSellerId}
                    onChange={e => {
                      setSelectedSellerId(e.target.value);
                      setFlavorSelections({});
                      setErrorMessage(null);
                    }}
                    className="w-full text-xs font-bold bg-white border border-[#E8E3DF] rounded-xl px-3 py-2 text-[#1E1612] outline-hidden"
                  >
                    <option value={state.currentUser.id}>
                      {state.currentUser.name} (Venda Direta / Estoque Central)
                    </option>
                    {state.profiles
                      .filter(p => p.role === 'seller')
                      .map(s => {
                        const loc = getSellerLocation(s.id);
                        const sTotal = activeFlavors.reduce((sum, f) => sum + (loc ? getFlavorStock(loc.id, f.id) : 0), 0);
                        return (
                          <option key={s.id} value={s.id}>
                            {s.name} (Estoque: {sTotal} brownies)
                          </option>
                        );
                      })}
                  </select>
                </div>
              )}

              <div className="text-center">
                <h3 className="text-lg font-bold text-[#1E1612]">Quantos brownies?</h3>
                <p className="text-xs text-[#786D66] mt-0.5">
                  Estoque disponível na origem: <strong className="text-[#1E1612]">{totalSellerStock} unidades</strong>
                </p>
              </div>

              {/* Big Quantity Controller */}
              <div className="flex items-center justify-center gap-5 py-4">
                <button
                  id="btn-qty-minus"
                  onClick={() => handleQuantityChange(totalQuantity - 1)}
                  disabled={totalQuantity <= 1}
                  className="w-14 h-14 rounded-2xl border border-[#EAE5E2] bg-[#F8F6F4] text-[#3B241C] hover:bg-[#EEE7E3] disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center transition shadow-xs"
                >
                  <Minus className="w-6 h-6" />
                </button>

                <div className="w-24 text-center">
                  <span className="text-5xl font-extrabold text-[#3B241C] tabular-nums tracking-tight">
                    {totalQuantity}
                  </span>
                  <span className="block text-xs font-semibold text-[#746A65] mt-1">
                    {totalQuantity === 1 ? 'brownie' : 'brownies'}
                  </span>
                </div>

                <button
                  id="btn-qty-plus"
                  onClick={() => handleQuantityChange(totalQuantity + 1)}
                  disabled={totalQuantity >= totalSellerStock}
                  className="w-14 h-14 rounded-2xl bg-[#3B241C] text-white hover:bg-[#2E1A14] disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center transition shadow-md"
                >
                  <Plus className="w-6 h-6" />
                </button>
              </div>

              {/* Quick Options */}
              <div>
                <span className="block text-[11px] font-semibold text-[#746A65] uppercase tracking-wider text-center mb-2">
                  Atalhos Rápidos
                </span>
                <div className="grid grid-cols-5 gap-2">
                  {quickQuantities.map(q => (
                    <button
                      key={q}
                      onClick={() => handleQuantityChange(q)}
                      disabled={q > totalSellerStock}
                      className={`py-2 rounded-xl text-sm font-bold border transition ${
                        totalQuantity === q
                          ? 'bg-[#3B241C] text-white border-[#3B241C] shadow-xs'
                          : 'bg-white text-[#201A17] border-[#EAE5E2] hover:bg-[#F8F6F4]'
                      } disabled:opacity-30 disabled:pointer-events-none`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pricing Preview Badge */}
              <div className="p-4 rounded-2xl bg-[#F8F6F4] border border-[#EAE5E2] flex items-center justify-between">
                <div>
                  <span className="text-xs text-[#746A65]">Regra de preço aplicada:</span>
                  <div className="font-bold text-sm text-[#201A17]">
                    {unitPrice === fullUnitPrice
                      ? `${totalQuantity} un. = R$ 10,00 cada`
                      : `${totalQuantity} unidades = R$ 9,00 cada`}
                  </div>
                  {applyDiscount && totalQuantity >= 2 && (
                    <span className="text-[11px] font-semibold text-[#237A4B] flex items-center gap-1 mt-0.5">
                      <Sparkles className="w-3 h-3" /> Economia de {formatCurrency(totalQuantity * 1.0)} para o cliente
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-xs text-[#746A65]">Total a pagar:</span>
                  <div className="text-2xl font-black text-[#3B241C] tabular-nums">
                    {formatCurrency(totalAmount)}
                  </div>
                </div>
              </div>

              {/* Discount Toggle */}
              <button
                type="button"
                onClick={() => setApplyDiscount(v => !v)}
                disabled={!discountEligible}
                className={`w-full p-3.5 rounded-2xl border flex items-center justify-between transition text-left ${
                  !discountEligible
                    ? 'border-[#EAE5E2] bg-gray-50 opacity-50 cursor-not-allowed'
                    : applyDiscount
                    ? 'border-[#237A4B] bg-green-50'
                    : 'border-[#EAE5E2] bg-white hover:bg-[#F8F6F4]'
                }`}
              >
                <div>
                  <span className="text-xs font-bold text-[#201A17] block">
                    Aplicar desconto de quantidade (2+ = R$ 9,00 cada)
                  </span>
                  <span className="text-[11px] text-[#746A65]">
                    {discountEligible
                      ? 'Desative para cobrar o preço cheio de R$ 10,00 mesmo com 2 ou mais unidades.'
                      : 'Disponível a partir de 2 unidades.'}
                  </span>
                </div>
                <div
                  className={`w-10 h-6 rounded-full flex items-center px-0.5 shrink-0 transition ${
                    applyDiscount && discountEligible ? 'bg-[#237A4B] justify-end' : 'bg-[#D9D2CD] justify-start'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-white shadow-xs" />
                </div>
              </button>

              {/* Next Button */}
              <button
                id="btn-step1-next"
                onClick={goToStep2}
                disabled={totalSellerStock < 1}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#3B241C] text-white font-bold text-sm hover:bg-[#2E1A14] transition flex items-center justify-center gap-2 shadow-md disabled:opacity-40"
              >
                <span>Continuar e Escolher Sabores</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* =======================================================
              STEP 2: SABORES
             ======================================================= */}
          {step === 2 && !completedSale && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-[#201A17]">Escolha os sabores</h3>
                <p className="text-xs text-[#746A65]">
                  Distribua exatamente os <strong className="text-[#3B241C]">{totalQuantity} brownies</strong> entre os sabores disponíveis em seu estoque:
                </p>
              </div>

              {/* Status Counter Badge */}
              <div className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between ${
                remainingToSelect === 0
                  ? 'bg-green-50 text-[#237A4B] border border-green-200'
                  : 'bg-amber-50 text-[#B7791F] border border-amber-200'
              }`}>
                <span>Total distribuído: <strong>{selectedFlavorsCount} de {totalQuantity}</strong></span>
                <span>
                  {remainingToSelect === 0 ? '✓ Quantidade exata atingida' : `Faltam ${remainingToSelect} unidade(s)`}
                </span>
              </div>

              {/* Flavors List */}
              <div className="space-y-2.5">
                {activeFlavors.map(flavor => {
                  const stock = sellerLocation ? getFlavorStock(sellerLocation.id, flavor.id) : 0;
                  const selected = flavorSelections[flavor.id] || 0;
                  const isOutOfStock = stock <= 0;

                  return (
                    <div
                      key={flavor.id}
                      className={`p-3.5 rounded-2xl border transition flex items-center justify-between ${
                        selected > 0
                          ? 'border-[#3B241C] bg-[#F8F6F4]'
                          : isOutOfStock
                          ? 'border-[#EAE5E2] opacity-40 bg-gray-50'
                          : 'border-[#EAE5E2] bg-white hover:border-[#746A65]'
                      }`}
                    >
                      <div>
                        <span className="font-bold text-sm text-[#201A17] block">
                          Brownie de {flavor.name}
                        </span>
                        <span className="text-xs text-[#746A65]">
                          Estoque disponível: <strong className={stock < 3 ? 'text-[#B33A3A]' : 'text-[#201A17]'}>{stock} un.</strong>
                        </span>
                      </div>

                      {/* Flavor Quantity Selector */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleFlavorCount(flavor.id, -1)}
                          disabled={selected <= 0}
                          className="w-9 h-9 rounded-xl border border-[#EAE5E2] bg-white text-[#201A17] hover:bg-[#EEE7E3] disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center font-bold text-base text-[#3B241C] tabular-nums">
                          {selected}
                        </span>
                        <button
                          onClick={() => handleFlavorCount(flavor.id, 1)}
                          disabled={isOutOfStock || selected >= stock || selectedFlavorsCount >= totalQuantity}
                          className="w-9 h-9 rounded-xl bg-[#3B241C] text-white hover:bg-[#2E1A14] disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="py-3 px-4 rounded-2xl border border-[#EAE5E2] text-xs font-semibold text-[#746A65] hover:bg-[#F8F6F4] transition flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Voltar
                </button>
                <button
                  id="btn-step2-next"
                  onClick={goToStep3}
                  disabled={selectedFlavorsCount !== totalQuantity}
                  className="flex-1 py-3 px-4 rounded-2xl bg-[#3B241C] text-white text-xs font-bold hover:bg-[#2E1A14] transition disabled:opacity-40 flex items-center justify-center gap-2 shadow-md"
                >
                  <span>Avançar para Resumo</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* =======================================================
              STEP 3: RESUMO DA VENDA
             ======================================================= */}
          {step === 3 && !completedSale && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-[#201A17]">Resumo da venda</h3>
                <p className="text-xs text-[#746A65]">
                  Confira as informações antes de apresentar o Pix para o cliente:
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#F8F6F4] border border-[#EAE5E2] space-y-3">
                <div className="flex justify-between items-center text-xs pb-2 border-b border-[#EAE5E2]">
                  <span className="text-[#746A65]">Total de Brownies:</span>
                  <span className="font-bold text-[#201A17]">{totalQuantity} unidades</span>
                </div>

                <div className="space-y-1.5 pb-2 border-b border-[#EAE5E2]">
                  <span className="text-[11px] font-semibold text-[#746A65] uppercase tracking-wider block">
                    Sabores Selecionados:
                  </span>
                  {Object.entries(flavorSelections).map(([flavorId, qty]) => {
                    const flv = state.flavors.find(f => f.id === flavorId);
                    return (
                      <div key={flavorId} className="flex justify-between text-xs">
                        <span className="text-[#201A17] font-medium">{flv?.name}</span>
                        <span className="font-bold text-[#3B241C] tabular-nums">{qty}x {formatCurrency(unitPrice)}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between items-center text-xs pb-1">
                  <span className="text-[#746A65]">Preço unitário aplicado:</span>
                  <span className="font-semibold text-[#201A17]">
                    {formatCurrency(unitPrice)} cada
                    {discountEligible && !applyDiscount && (
                      <span className="text-[10px] text-[#B7791F] font-bold ml-1">(sem desconto)</span>
                    )}
                  </span>
                </div>

                <div className="flex justify-between items-baseline pt-2 border-t border-[#EAE5E2]">
                  <span className="font-bold text-sm text-[#201A17]">Valor Total:</span>
                  <span className="text-2xl font-black text-[#3B241C] tabular-nums">
                    {formatCurrency(totalAmount)}
                  </span>
                </div>
              </div>

              {/* Notice */}
              <div className="p-3 rounded-xl bg-[#EEE7E3] text-[#3B241C] text-xs flex items-start gap-2">
                <ShoppingBag className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  O código Pix não vem com o valor preenchido: peça ao cliente para digitar <strong>{formatCurrency(totalAmount)}</strong> no app do banco dele antes de pagar. A venda só é finalizada após você confirmar o recebimento do comprovante.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setStep(2)}
                  className="py-3 px-4 rounded-2xl border border-[#EAE5E2] text-xs font-semibold text-[#746A65] hover:bg-[#F8F6F4] transition flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Voltar
                </button>
                <button
                  id="btn-step3-pix"
                  onClick={handleGeneratePix}
                  disabled={isProcessing}
                  className="flex-1 py-3 px-4 rounded-2xl bg-[#3B241C] text-white text-xs font-bold hover:bg-[#2E1A14] transition flex items-center justify-center gap-2 shadow-md"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Gerar QR Code Pix</span>
                </button>
              </div>
            </div>
          )}

          {/* =======================================================
              STEP 4: PAGAMENTO VIA PIX (QR CODE & COPIA E COLA)
             ======================================================= */}
          {step === 4 && !completedSale && (
            <div className="space-y-4 text-center">
              <div>
                <h3 className="text-base font-bold text-[#201A17]">Pagamento via Pix</h3>
                <p className="text-xs text-[#746A65]">
                  Peça para o cliente escanear com o <strong>aplicativo do banco dele</strong> (não pela câmera comum) e digitar o valor abaixo:
                </p>
              </div>

              {/* Fixed Bank QR Code Card — same image on every sale */}
              <div className="p-4 bg-white border border-[#EAE5E2] rounded-3xl shadow-sm inline-block mx-auto">
                <img
                  src="/assets/pix_static_qr.jpg"
                  alt="QR Code Pix"
                  className="w-48 h-48 sm:w-56 sm:h-56 mx-auto rounded-xl object-contain"
                />
                <div className="mt-2 text-center">
                  <span className="text-xs text-[#746A65] block">Cliente deve digitar este valor no banco:</span>
                  <span className="text-2xl font-black text-[#3B241C] tabular-nums">
                    {formatCurrency(totalAmount)}
                  </span>
                </div>
              </div>

              {/* Pix Key */}
              <div className="space-y-1.5 text-left">
                <span className="text-[11px] font-semibold text-[#746A65] uppercase tracking-wider block">
                  Chave Pix:
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={state.settings.pix_key}
                    className="flex-1 text-xs bg-[#F8F6F4] border border-[#EAE5E2] rounded-xl px-3 py-2 text-[#746A65] font-mono select-all truncate"
                  />
                  <button
                    onClick={handleCopyPix}
                    className="px-3 py-2 bg-[#EEE7E3] text-[#3B241C] font-semibold text-xs rounded-xl hover:bg-[#3B241C] hover:text-white transition flex items-center gap-1.5 shrink-0"
                  >
                    {copiedPix ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPix ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              {/* Payment instructions */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left text-xs text-[#B7791F] flex items-start gap-2">
                <Clock className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Atenção:</strong> A geração do QR Code não finaliza a venda. Peça para o cliente mostrar o comprovante antes de confirmar.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setStep(3)}
                  className="py-3 px-4 rounded-2xl border border-[#EAE5E2] text-xs font-semibold text-[#746A65] hover:bg-[#F8F6F4] transition"
                >
                  Voltar
                </button>
                <button
                  id="btn-step4-confirm"
                  onClick={() => setShowConfirmDialog(true)}
                  className="flex-1 py-3 px-4 rounded-2xl bg-[#237A4B] text-white text-xs font-bold hover:bg-[#1b633d] transition flex items-center justify-center gap-2 shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Cliente pagou? Confirmar recebimento</span>
                </button>
              </div>
            </div>
          )}

          {/* =======================================================
              SUCCESS SCREEN
             ======================================================= */}
          {completedSale && (
            <div className="py-4 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 text-[#237A4B] flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-[#201A17]">Venda Confirmada!</h3>
                <p className="text-xs text-[#746A65] mt-1">
                  Estoque atualizado e comissão calculada com sucesso.
                </p>
              </div>

              {/* Sales Metrics Card */}
              <div className="p-4 rounded-2xl bg-[#F8F6F4] border border-[#EAE5E2] space-y-3 text-left">
                <div className="flex justify-between items-center text-xs pb-2 border-b border-[#EAE5E2]">
                  <span className="text-[#746A65]">Código da Transação:</span>
                  <span className="font-mono font-bold text-[#3B241C]">{completedSale.pix_txid}</span>
                </div>
                <div className="flex justify-between items-center text-xs pb-2 border-b border-[#EAE5E2]">
                  <span className="text-[#746A65]">Quantidade:</span>
                  <span className="font-bold text-[#201A17]">{completedSale.total_quantity} brownies</span>
                </div>
                <div className="flex justify-between items-center text-xs pb-2 border-b border-[#EAE5E2]">
                  <span className="text-[#746A65]">Valor Recebido via Pix:</span>
                  <span className="font-black text-base text-[#201A17] tabular-nums">
                    {formatCurrency(completedSale.total_amount)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs pt-1">
                  <span className="text-[#746A65] font-semibold">Sua Comissão Gerada:</span>
                  <span className="font-black text-base text-[#237A4B] tabular-nums bg-green-50 px-2 py-0.5 rounded-lg border border-green-200">
                    +{formatCurrency(completedSale.seller_commission)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  id="btn-new-sale-again"
                  onClick={() => {
                    setCompletedSale(null);
                    setStep(1);
                    setTotalQuantity(1);
                    setFlavorSelections({});
                  }}
                  className="flex-1 py-3 px-4 rounded-2xl bg-[#3B241C] text-white text-xs font-bold hover:bg-[#2E1A14] transition flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>Realizar Outra Venda</span>
                </button>
                <button
                  onClick={onClose}
                  className="py-3 px-4 rounded-2xl border border-[#EAE5E2] text-xs font-semibold text-[#746A65] hover:bg-[#F8F6F4] transition"
                >
                  Concluir
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog before Finalizing */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#EAE5E2] text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-[#B7791F] flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div>
              <h4 className="text-base font-bold text-[#201A17]">Pagamento recebido?</h4>
              <p className="text-xs text-[#746A65] mt-1 leading-relaxed">
                Confirme apenas depois de verificar o comprovante do Pix com o cliente. O estoque será deduzido imediatamente.
              </p>
            </div>

            <div className="p-3 bg-[#F8F6F4] rounded-xl text-xs flex justify-between font-semibold">
              <span className="text-[#746A65]">Valor confirmado:</span>
              <span className="text-[#3B241C] font-bold">{formatCurrency(totalAmount)}</span>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowConfirmDialog(false)}
                disabled={isProcessing}
                className="flex-1 py-2.5 px-3 rounded-xl border border-[#EAE5E2] text-xs font-semibold text-[#746A65] hover:bg-[#F8F6F4]"
              >
                Voltar
              </button>
              <button
                id="btn-confirm-sale-final"
                onClick={handleConfirmSale}
                disabled={isProcessing}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[#237A4B] text-white text-xs font-bold hover:bg-[#1b633d] shadow-sm flex items-center justify-center gap-1.5"
              >
                {isProcessing ? 'Gravando...' : 'Sim, confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
