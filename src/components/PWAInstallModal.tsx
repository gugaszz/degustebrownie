import React, { useState } from 'react';
import { X, Smartphone, Share2, PlusSquare, CheckCircle2, Download, AlertTriangle, Copy, Check } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isIOS, isInAppBrowser, install } = usePWAInstall();
  const [installSuccess, setInstallSuccess] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    const success = await install();
    if (success) {
      setInstallSuccess(true);
      setTimeout(() => {
        setInstallSuccess(false);
        onClose();
      }, 1500);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 border border-[#E7E5E2] shadow-xl space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#EFEDEA]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#141414] text-white flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#111111]">Instalar Brownie Control</h3>
              <p className="text-[11px] text-[#6B6B6B]">Use como aplicativo nativo no seu celular</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#9A9A9A] hover:bg-[#F3F1EE] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {installSuccess ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-green-100 text-[#1B8A4F] mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-[#111111]">Aplicativo Instalado com Sucesso!</h4>
            <p className="text-xs text-[#6B6B6B]">Agora você pode acessá-lo direto da sua tela inicial.</p>
          </div>
        ) : isInAppBrowser ? (
          /* Opened from inside WhatsApp/Instagram/etc: those in-app browsers can
             never install a PWA, no matter what. The only fix is opening the same
             link in the real browser. */
          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-[#A9761F] shrink-0 mt-0.5" />
              <p className="text-xs text-[#111111] leading-relaxed">
                Você abriu esse link de dentro de um aplicativo de mensagens (WhatsApp, Instagram ou parecido).
                Esses navegadores internos <strong>nunca conseguem instalar o app</strong>. Copie o link abaixo e
                cole no Chrome ou Safari de verdade.
              </p>
            </div>

            <button
              onClick={handleCopyLink}
              className="w-full py-3 px-4 rounded-xl bg-[#141414] hover:bg-[#000000] text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              {linkCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              <span>{linkCopied ? 'Link copiado!' : 'Copiar link para colar no navegador'}</span>
            </button>
          </div>
        ) : isIOS && !isInstallable ? (
          /* iOS Safari never fires an install prompt — Apple only allows the manual
             Share > Add to Home Screen flow, there's no button that can trigger it. */
          <div className="space-y-3">
            <div className="space-y-2.5 text-xs text-[#111111]">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#F3F1EE] border border-[#E7E5E2]">
                <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 font-bold text-xs">1</div>
                <div>
                  <span>Toque no botão <strong>Compartilhar</strong> na barra do Safari</span>
                  <div className="flex items-center gap-1 text-[11px] text-[#6B6B6B] mt-0.5">
                    <Share2 className="w-3.5 h-3.5 text-blue-600" />
                    (ícone do quadrado com a seta para cima)
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#F3F1EE] border border-[#E7E5E2]">
                <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 font-bold text-xs">2</div>
                <div>
                  <span>Toque em <strong>"Adicionar à Tela de Início"</strong></span>
                  <div className="flex items-center gap-1 text-[11px] text-[#6B6B6B] mt-0.5">
                    <PlusSquare className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Everyone else (Android Chrome and any other real browser): one button. */
          <div className="p-4 rounded-2xl bg-[#F3F1EE] border border-[#E7E5E2] space-y-3 text-center">
            <p className="text-xs text-[#8A8A8A]">
              Toque no botão abaixo para instalar o Brownie Control como aplicativo no seu celular.
            </p>
            <button
              onClick={handleInstallClick}
              disabled={!isInstallable}
              className="w-full py-3 px-4 rounded-xl bg-[#141414] hover:bg-[#000000] text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              <span>Baixar como App</span>
            </button>
            {!isInstallable && (
              <p className="text-[11px] text-[#9A9A9A]">
                Se o botão estiver apagado, toque nos <strong>⋮</strong> do navegador e escolha <strong>"Instalar aplicativo"</strong>.
              </p>
            )}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl border border-[#E7E5E2] text-xs font-semibold text-[#8A8A8A] hover:bg-[#F3F1EE] transition"
        >
          Fechar
        </button>
      </div>
    </div>
  );
};
