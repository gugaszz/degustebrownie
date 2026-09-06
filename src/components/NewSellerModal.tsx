import React, { useState } from 'react';
import { X, UserPlus, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useStore } from '../services/store';

interface NewSellerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewSellerModal: React.FC<NewSellerModalProps> = ({ isOpen, onClose }) => {
  const { createSeller } = useStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [commissionValue, setCommissionValue] = useState<number>(50);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('O nome do vendedor é obrigatório.');
      return;
    }
    if (!email.trim()) {
      setErrorMsg('O e-mail de acesso é obrigatório: é com ele que o vendedor vai fazer login.');
      return;
    }
    if (!password.trim() || password.trim().length < 4) {
      setErrorMsg('Defina uma senha de acesso com pelo menos 4 caracteres.');
      return;
    }

    const res = createSeller({
      name,
      email,
      phone,
      password,
      commissionValue
    });

    if (res.success) {
      setSuccessMsg(`Vendedor ${name} cadastrado com sucesso! Compartilhe o e-mail e a senha com ele para o login.`);
      setName('');
      setEmail('');
      setPhone('');
      setPassword('');
      setTimeout(onClose, 1800);
    } else {
      setErrorMsg(res.error || 'Erro ao cadastrar vendedor.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-[#E7E5E2] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E7E5E2] flex items-center justify-between bg-[#F6F5F3]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#141414] text-white flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#111111]">Novo Vendedor</h3>
              <p className="text-[11px] text-[#6B6B6B]">Cadastro e liberação de estoque individual</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-[#6B6B6B] hover:bg-[#EDEBE8]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-green-50 text-[#1B8A4F] text-xs flex items-start gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#111111] mb-1">Nome Completo:</label>
            <input
              type="text"
              required
              placeholder="Ex: Lucas Ferreira"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full text-xs bg-[#F6F5F3] border border-[#E7E5E2] rounded-xl px-3 py-2 text-[#111111] focus:outline-none focus:border-[#141414]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1">WhatsApp / Telefone:</label>
              <input
                type="text"
                placeholder="(85) 99999-0000"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full text-xs bg-[#F6F5F3] border border-[#E7E5E2] rounded-xl px-3 py-2 text-[#111111]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1">E-mail de Acesso:</label>
              <input
                type="email"
                required
                placeholder="vendedor@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full text-xs bg-[#F6F5F3] border border-[#E7E5E2] rounded-xl px-3 py-2 text-[#111111]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#111111] mb-1">Senha de Acesso:</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={4}
                placeholder="Mínimo 4 caracteres"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full text-xs bg-[#F6F5F3] border border-[#E7E5E2] rounded-xl px-3 py-2 pr-9 text-[#111111]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9A9A9A] hover:text-[#111111]"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[11px] text-[#6B6B6B] mt-1">
              Só você (proprietário) cria contas. Depois de cadastrado, o vendedor entra com este e-mail e senha.
            </p>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-[#111111]">Comissão Padrão:</label>
              <span className="text-xs font-black text-[#141414]">{commissionValue}% do lucro bruto</span>
            </div>
            <input
              type="range"
              min={10}
              max={90}
              step={5}
              value={commissionValue}
              onChange={e => setCommissionValue(Number(e.target.value))}
              className="w-full accent-[#141414]"
            />
            <p className="text-[11px] text-[#6B6B6B] mt-1">
              Por padrão, o vendedor recebe 50% do lucro gerado pelas suas vendas.
            </p>
          </div>

          <div className="pt-2 border-t border-[#E7E5E2] flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-3.5 py-2 text-xs font-semibold text-[#6B6B6B]">
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#141414] text-white text-xs font-bold rounded-xl hover:bg-[#0A0A0A]"
            >
              Criar Vendedor
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
