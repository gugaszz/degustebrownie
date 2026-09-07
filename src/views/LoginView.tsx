import React, { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, ShieldCheck, Smartphone, LogIn } from 'lucide-react';
import { useStore } from '../services/store';

export const LoginView: React.FC = () => {
  const { login } = useStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    const res = await login(email, password);

    setIsLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || 'Não foi possível entrar. Confira o e-mail e a senha.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F1EE] flex flex-col justify-center items-center px-4 py-8 select-none">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-1">
          <h1 className="font-display text-3xl font-semibold text-[#111111] tracking-tight">Brownie Control</h1>
          <p className="text-xs text-[#6B6B6B] mt-1 font-medium">
            Gestão de Vendas, Estoques FEFO, Comissões e Pagamentos Pix
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E7E5E2] shadow-xs space-y-5">
          <div className="border-b border-[#EFEDEA] pb-3">
            <h2 className="text-sm font-bold text-[#111111]">Entrar no Sistema</h2>
            <p className="text-xs text-[#6B6B6B] mt-0.5">
              Informe o e-mail e a senha cadastrados pelo proprietário.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-[#8A2E2E] font-medium leading-relaxed">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1.5">
                E-mail
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#9A9A9A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seuemail@exemplo.com"
                  className="w-full text-xs pl-10 pr-3.5 py-3 rounded-xl border border-[#E4E2DF] bg-[#F3F1EE] text-[#111111] focus:bg-white focus:border-[#141414] focus:ring-1 focus:ring-[#141414] outline-hidden transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1.5">
                Senha
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#9A9A9A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  className="w-full text-xs pl-10 pr-10 py-3 rounded-xl border border-[#E4E2DF] bg-[#F3F1EE] text-[#111111] focus:bg-white focus:border-[#141414] focus:ring-1 focus:ring-[#141414] outline-hidden transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9A9A9A] hover:text-[#111111] transition p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-[#141414] hover:bg-[#000000] text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Acessando...' : 'Entrar no Sistema'}</span>
            </button>
          </form>

          <p className="text-[11px] text-[#9A9A9A] text-center leading-relaxed">
            Não existe cadastro por conta própria. Cada acesso é criado pelo proprietário.
          </p>
        </div>

        {/* Security / System Badges */}
        <div className="flex items-center justify-center gap-4 text-[11px] text-[#6B6B6B]">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#1B8A4F]" />
            Ambiente Seguro
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Smartphone className="w-3.5 h-3.5 text-[#141414]" />
            Mobile-First PWA
          </span>
        </div>
      </div>
    </div>
  );
};
