import React, { useEffect, useState } from 'react';
import { X, Smartphone, Share2, PlusSquare, CheckCircle2, Download, ExternalLink, Sparkles, QrCode } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import QRCode from 'qrcode';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      QRCode.toDataURL(window.location.href, {
        width: 180,
        margin: 1,
        color: {
          dark: '#261B16',
          light: '#FFFFFF'
        }
      }).then(setQrDataUrl).catch(console.error);
    }
  }, [isOpen]);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 border border-[#E8E3DF] shadow-xl space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#F0ECE9]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#261B16] text-white flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#1E1612]">Instalar Brownie Control</h3>
              <p className="text-[11px] text-[#786D66]">Use como aplicativo nativo no seu celular</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#8C8079] hover:bg-[#FAF8F5] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {installSuccess ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-green-100 text-[#237A4B] mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-[#1E1612]">Aplicativo Instalado com Sucesso!</h4>
            <p className="text-xs text-[#786D66]">Agora você pode acessá-lo direto da sua tela inicial.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Install Flow Button (Chrome / Android / Desktop) */}
            {isInstallable ? (
              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E8E3DF] space-y-3 text-center">
                <p className="text-xs text-[#5C524C]">
                  Seu navegador é totalmente compatível. Clique abaixo para adicionar à tela inicial em 1 segundo:
                </p>
                <button
                  onClick={handleInstallClick}
                  className="w-full py-3 px-4 rounded-xl bg-[#261B16] hover:bg-[#150F0D] text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar como App Agora</span>
                </button>
              </div>
            ) : isIOS ? (
              /* iOS Safari Instructions */
              <div className="space-y-3">
                <span className="text-[11px] font-bold text-[#8C8079] uppercase tracking-wider block">
                  Como instalar no iPhone / iPad (Safari)
                </span>
                <div className="space-y-2.5 text-xs text-[#1E1612]">
                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#FAF8F5] border border-[#E8E3DF]">
                    <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 font-bold text-xs">
                      1
                    </div>
                    <div>
                      <span>Toque no botão <strong>Compartilhar</strong> na barra inferior do Safari</span>
                      <div className="flex items-center gap-1 text-[11px] text-[#786D66] mt-0.5">
                        <Share2 className="w-3.5 h-3.5 text-blue-600" />
                        (ícone do quadrado com a seta para cima)
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#FAF8F5] border border-[#E8E3DF]">
                    <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 font-bold text-xs">
                      2
                    </div>
                    <div>
                      <span>Role a lista e toque em <strong>"Adicionar à Tela de Início"</strong></span>
                      <div className="flex items-center gap-1 text-[11px] text-[#786D66] mt-0.5">
                        <PlusSquare className="w-3.5 h-3.5 text-blue-600" />
                        (ícone de quadrado com o sinal de mais)
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#FAF8F5] border border-[#E8E3DF]">
                    <div className="w-7 h-7 rounded-xl bg-emerald-50 text-[#237A4B] flex items-center justify-center shrink-0 font-bold text-xs">
                      3
                    </div>
                    <div>
                      <span>Toque em <strong>"Adicionar"</strong> no canto superior direito</span>
                      <span className="block text-[11px] text-[#786D66] mt-0.5">
                        Pronto! O ícone oficial será criado na sua tela de aplicativos.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Generic Android / Desktop Guide + QR Code for mobile scan */
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E8E3DF] space-y-2">
                  <span className="text-xs font-bold text-[#1E1612] block">No Android / Chrome:</span>
                  <p className="text-xs text-[#5C524C] leading-relaxed">
                    Toque nos <strong>3 pontinhos (⋮)</strong> no canto superior direito do navegador e selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
                  </p>
                </div>

                {qrDataUrl && (
                  <div className="p-4 rounded-2xl border border-[#E8E3DF] bg-white text-center space-y-2">
                    <span className="text-[11px] font-bold text-[#8C8079] uppercase tracking-wider block">
                      Acessar no Celular (Escaneie o QR Code)
                    </span>
                    <img src={qrDataUrl} alt="QR Code PWA" className="w-32 h-32 mx-auto rounded-xl border border-[#E8E3DF]" />
                    <p className="text-[11px] text-[#786D66]">
                      Aponte a câmera do seu celular para abrir e instalar diretamente nele
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl border border-[#E8E3DF] text-xs font-semibold text-[#5C524C] hover:bg-[#FAF8F5] transition"
        >
          Fechar
        </button>
      </div>
    </div>
  );
};
