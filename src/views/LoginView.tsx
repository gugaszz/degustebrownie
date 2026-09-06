import React, { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, ShieldCheck, Smartphone, UserPlus, LogIn } from 'lucide-react';
import { useStore } from '../services/store';

interface LoginViewProps {
  onLoginSuccess: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const { state, switchUser, setAccountPassword } = useStore();

  // Only the owner account can ever be set up through this screen, and only once —
  // before it has a password. Every other account (sellers included) is created by
  // the owner inside the app (Vendedores > Novo Vendedor); nobody can self-register.
  const owner = state.profiles.find(p => p.role === 'owner');
  const ownerNeedsSetup = !!owner && !owner.password;

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    setTimeout(() => {
      if (ownerNeedsSetup && owner) {
        // First-ever access: Gustavo defines his own name, e-mail and password.
        if (!name.trim()) {
          setErrorMsg('Por favor, informe seu nome.');
          setIsLoading(false);
          return;
        }
        if (!newPassword.trim() || newPassword.trim().length < 4) {
          setErrorMsg('Defina uma senha com pelo menos 4 caracteres.');
          setIsLoading(false);
          return;
        }

        owner.name = name.trim();
        owner.email = email.trim().toLowerCase();
        setAccountPassword(owner.id, newPassword.trim());
        switchUser(owner.id);
        setIsLoading(false);
        onLoginSuccess();
        return;
      }

      // Regular login: match an existing account by e-mail and password.
      const cleanEmail = email.trim().toLowerCase();
      const matchedUser = state.profiles.find(
        p => p.email && p.email.trim().toLowerCase() === cleanEmail
      );

      if (!matchedUser) {
        setErrorMsg('E-mail não encontrado. As contas são criadas apenas pelo proprietário.');
        setIsLoading(false);
        return;
      }

      if (matchedUser.status === 'inactive') {
        setErrorMsg('Esta conta está inativa. Fale com o proprietário.');
        setIsLoading(false);
        return;
      }

      if (!matchedUser.password || matchedUser.password !== password) {
        setErrorMsg('Senha incorreta.');
        setIsLoading(false);
        return;
      }

      switchUser(matchedUser.id);
      setIsLoading(false);
      onLoginSuccess();
    }, 300);
  };

  return (
    <div className="min-h-screen bg-[#FBF9F8] flex flex-col justify-center items-center px-4 py-8 select-none">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-1">
          <h1 className="font-display text-3xl font-semibold text-[#1E1612] tracking-tight">Brownie Control</h1>
          <p className="text-xs text-[#786D66] mt-1 font-medium">
            Gestão de Vendas, Estoques FEFO, Comissões e Pagamentos Pix
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8E3DF] shadow-xs space-y-5">
          <div className="border-b border-[#F0ECE9] pb-3">
            <h2 className="text-sm font-bold text-[#1E1612]">
              {ownerNeedsSetup ? 'Configurar Acesso do Proprietário' : 'Entrar no Sistema'}
            </h2>
            <p className="text-xs text-[#786D66] mt-0.5">
              {ownerNeedsSetup
                ? 'Primeiro acesso: defina seu nome, e-mail e senha de proprietário. Os demais acessos são cadastrados por você dentro do sistema.'
                : 'Informe o e-mail e a senha cadastrados pelo proprietário.'}
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-[#A82A2A] font-medium leading-relaxed">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {ownerNeedsSetup && (
              <div>
                <label className="block text-xs font-bold text-[#1E1612] mb-1.5">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ex: Gustavo Antunes"
                  className="w-full text-xs px-3.5 py-3 rounded-xl border border-[#E2DDD9] bg-[#FAF8F5] text-[#1E1612] focus:bg-white focus:border-[#261B16] focus:ring-1 focus:ring-[#261B16] outline-hidden transition"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#1E1612] mb-1.5">
                E-mail
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#8C8079] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seuemail@exemplo.com"
                  className="w-full text-xs pl-10 pr-3.5 py-3 rounded-xl border border-[#E2DDD9] bg-[#FAF8F5] text-[#1E1612] focus:bg-white focus:border-[#261B16] focus:ring-1 focus:ring-[#261B16] outline-hidden transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1E1612] mb-1.5">
                {ownerNeedsSetup ? 'Crie sua Senha' : 'Senha'}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#8C8079] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={ownerNeedsSetup ? 4 : undefined}
                  value={ownerNeedsSetup ? newPassword : password}
                  onChange={e => (ownerNeedsSetup ? setNewPassword(e.target.value) : setPassword(e.target.value))}
                  placeholder="Digite sua senha"
                  className="w-full text-xs pl-10 pr-10 py-3 rounded-xl border border-[#E2DDD9] bg-[#FAF8F5] text-[#1E1612] focus:bg-white focus:border-[#261B16] focus:ring-1 focus:ring-[#261B16] outline-hidden transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8C8079] hover:text-[#1E1612] transition p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-[#261B16] hover:bg-[#150F0D] text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
            >
              {ownerNeedsSetup ? (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{isLoading ? 'Configurando...' : 'Concluir Configuração e Entrar'}</span>
                </>
              ) : (
                <>
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{isLoading ? 'Acessando...' : 'Entrar no Sistema'}</span>
                </>
              )}
            </button>
          </form>

          {!ownerNeedsSetup && (
            <p className="text-[11px] text-[#8C8079] text-center leading-relaxed">
              Não existe cadastro por conta própria. Cada acesso é criado pelo proprietário.
            </p>
          )}
        </div>

        {/* Security / System Badges */}
        <div className="flex items-center justify-center gap-4 text-[11px] text-[#786D66]">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#237A4B]" />
            Ambiente Seguro
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Smartphone className="w-3.5 h-3.5 text-[#261B16]" />
            Mobile-First PWA
          </span>
        </div>
      </div>
    </div>
  );
};
