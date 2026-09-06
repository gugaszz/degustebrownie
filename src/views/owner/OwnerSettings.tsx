import React, { useState } from 'react';
import {
  Save,
  QrCode,
  Check,
  Smartphone,
  CheckCircle2,
  SlidersHorizontal,
  Download
} from 'lucide-react';
import { useStore } from '../../services/store';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface OwnerSettingsProps {
  onOpenInstallModal?: () => void;
}

export const OwnerSettings: React.FC<OwnerSettingsProps> = ({ onOpenInstallModal }) => {
  const { state, updateSettings } = useStore();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  const [pixKey, setPixKey] = useState(state.settings.pix_key || '');
  const [pixKeyType, setPixKeyType] = useState(state.settings.pix_key_type || 'email');
  const [receiverName, setReceiverName] = useState(state.settings.pix_merchant_name || '');
  const [receiverCity, setReceiverCity] = useState(state.settings.pix_merchant_city || '');
  const [purchaseCost, setPurchaseCost] = useState(state.settings.default_purchase_cost || 4.0);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      pix_key: pixKey,
      pix_key_type: pixKeyType as any,
      pix_merchant_name: receiverName,
      pix_merchant_city: receiverCity,
      default_purchase_cost: Number(purchaseCost)
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-[#1E1612] tracking-tight">
          Configurações do Sistema
        </h1>
        <p className="text-xs text-[#786D66] mt-0.5">
          Instalação de app no celular, pagamentos Pix oficiais e banco de dados Supabase
        </p>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-[#237A4B] flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>Configurações salvas com sucesso! As novas cobranças Pix usarão estes dados.</span>
        </div>
      )}

      {/* PWA Mobile App Card */}
      <div className="bg-white rounded-3xl p-6 border border-[#E8E3DF] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F0ECE9]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#261B16] text-white flex items-center justify-center shadow-xs">
              <Smartphone className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#1E1612]">Aplicativo Mobile (PWA)</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-[#237A4B] border border-emerald-200">
                  {isInstalled ? 'App Instalado' : 'Pronto para Instalação'}
                </span>
              </div>
              <p className="text-xs text-[#786D66]">
                Instale o Brownie Control diretamente no celular do vendedor e do proprietário
              </p>
            </div>
          </div>

          <button
            id="btn-pwa-install-settings"
            onClick={onOpenInstallModal || install}
            className="px-5 py-2.5 rounded-xl bg-[#261B16] hover:bg-[#150F0D] text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Baixe como App</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E8E3DF] space-y-1">
            <span className="font-bold text-[#1E1612] block">Sem Lojas de Apps</span>
            <p className="text-[11px] text-[#786D66]">
              Instalação instantânea pelo navegador Safari (iPhone) ou Chrome (Android) sem precisar de download na App Store ou Google Play.
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E8E3DF] space-y-1">
            <span className="font-bold text-[#1E1612] block">Tela Cheia & Rápido</span>
            <p className="text-[11px] text-[#786D66]">
              Abre direto da tela de início sem barra de navegação do navegador, ideal para vendas na rua.
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E8E3DF] space-y-1">
            <span className="font-bold text-[#1E1612] block">Acesso para Vendedores</span>
            <p className="text-[11px] text-[#786D66]">
              Cada vendedor pode ter o app no seu próprio celular e gerar Pix dinâmico no local da venda.
            </p>
          </div>
        </div>
      </div>

      {/* Pix Configuration Form */}
      <form onSubmit={handleSave} className="bg-white rounded-3xl p-6 border border-[#E8E3DF] shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-[#F0ECE9]">
          <div className="w-9 h-9 rounded-2xl bg-[#261B16] text-white flex items-center justify-center">
            <QrCode className="w-4 h-4 text-amber-300" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#1E1612]">Configuração do Pix Oficial (Banco Central)</h3>
            <p className="text-[11px] text-[#786D66]">
              A chave Pix salva aqui é exibida e copiável na tela de pagamento de cada venda, ao lado do QR Code fixo do seu banco.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#1E1612] mb-1">Tipo de Chave Pix:</label>
            <select
              value={pixKeyType}
              onChange={e => setPixKeyType(e.target.value as any)}
              className="w-full text-xs bg-[#FAF8F5] border border-[#E8E3DF] rounded-xl px-3 py-2.5 text-[#1E1612] outline-hidden focus:border-[#261B16]"
            >
              <option value="email">E-mail</option>
              <option value="phone">Telefone / WhatsApp</option>
              <option value="cpf">CPF</option>
              <option value="cnpj">CNPJ</option>
              <option value="random">Chave Aleatória (EVP)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1E1612] mb-1">Chave Pix:</label>
            <input
              type="text"
              required
              value={pixKey}
              onChange={e => setPixKey(e.target.value)}
              className="w-full text-xs bg-[#FAF8F5] border border-[#E8E3DF] rounded-xl px-3 py-2.5 text-[#1E1612] outline-hidden focus:border-[#261B16]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1E1612] mb-1">Nome do Titular da Conta (Recebedor):</label>
            <input
              type="text"
              required
              value={receiverName}
              onChange={e => setReceiverName(e.target.value)}
              className="w-full text-xs bg-[#FAF8F5] border border-[#E8E3DF] rounded-xl px-3 py-2.5 text-[#1E1612] outline-hidden focus:border-[#261B16]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1E1612] mb-1">Cidade do Titular:</label>
            <input
              type="text"
              required
              value={receiverCity}
              onChange={e => setReceiverCity(e.target.value)}
              className="w-full text-xs bg-[#FAF8F5] border border-[#E8E3DF] rounded-xl px-3 py-2.5 text-[#1E1612] outline-hidden focus:border-[#261B16]"
            />
          </div>
        </div>

        <div className="pt-2 border-t border-[#F0ECE9] flex justify-between items-center">
          <div className="w-52">
            <label className="block text-xs font-bold text-[#1E1612] mb-1">Custo Padrão do Brownie (R$):</label>
            <input
              type="number"
              step="0.10"
              value={purchaseCost}
              onChange={e => setPurchaseCost(parseFloat(e.target.value) || 4.0)}
              className="w-full text-xs bg-[#FAF8F5] border border-[#E8E3DF] rounded-xl px-3 py-2 text-[#1E1612] outline-hidden focus:border-[#261B16]"
            />
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 bg-[#261B16] text-white text-xs font-bold rounded-xl hover:bg-[#150F0D] transition flex items-center gap-1.5 shadow-xs cursor-pointer self-end"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Salvar Configurações</span>
          </button>
        </div>
      </form>
    </div>
  );
};
