import { KeyRound } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth/AuthContext';
import { BrandGradient } from '../components/brand-gradient';

export function Login() {
  const { user, signIn, signOut } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [mode, setMode] = useState<'entrar' | 'cadastrar'>('entrar');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  if (user?.active) return <Navigate to={(loc.state as { from?: string })?.from ?? '/app'} replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (mode === 'entrar') {
        await signIn(email, password);
        nav((loc.state as { from?: string })?.from ?? '/app', { replace: true });
      } else {
        const r = await api.signUp(name, email, password);
        await signOut();
        setMode('entrar');
        setMsg({
          ok: true,
          text: r.needsEmailConfirm
            ? 'Cadastro feito! Confirme o e-mail e depois aguarde o administrador liberar seu acesso.'
            : r.needsApproval
              ? 'Cadastro feito! Peça ao administrador para liberar seu acesso em "Usuários".'
              : 'Cadastro feito! Você já pode entrar.',
        });
      }
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <BrandGradient />
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3 text-white">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-ink">
            <KeyRound size={30} />
          </span>
          <div>
            <p className="text-2xl font-extrabold">Sistema do Chaveiro</p>
            <p className="text-text-faint">Balcão e ordens de serviço</p>
          </div>
        </div>
        <form onSubmit={submit} className="card space-y-4">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-field p-1">
            {(['entrar', 'cadastrar'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-lg py-2 font-semibold ${mode === m ? 'bg-primary text-ink shadow-glow' : 'text-text-soft hover:text-text-strong'}`}
              >
                {m === 'entrar' ? 'Entrar' : 'Criar acesso'}
              </button>
            ))}
          </div>
          {mode === 'cadastrar' && (
            <div>
              <label className="label" htmlFor="name">Seu nome</label>
              <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          )}
          <div>
            <label className="label" htmlFor="email">E-mail</label>
            <input id="email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="password">Senha</label>
            <input id="password" className="input" type="password" minLength={6} autoComplete={mode === 'entrar' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {msg && <p className={`rounded-xl p-3 font-semibold ${msg.ok ? 'bg-state-ready/10 text-green-400' : 'bg-state-late/10 text-red-400'}`}>{msg.text}</p>}
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? 'Aguarde…' : mode === 'entrar' ? 'Entrar' : 'Criar acesso'}
          </button>
          {api.mode === 'demo' && mode === 'entrar' && (
            <div className="rounded-xl bg-primary/10 p-3 text-sm">
              <p className="mb-2 font-bold">Modo demo — entrar como:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  ['Dono (admin)', 'dono@demo.com'],
                  ['Ana (atendente)', 'ana@demo.com'],
                ].map(([label, mail]) => (
                  <button
                    key={mail}
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => {
                      setEmail(mail);
                      setPassword('demo123');
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-text-soft">Senha: demo123</p>
            </div>
          )}
          {mode === 'cadastrar' && <p className="text-sm text-text-soft">Todo cadastro novo entra como pendente. O administrador libera o acesso em “Usuários”.</p>}
        </form>
        <p className="mt-4 text-center text-sm text-text-faint">
          <Link to="/" className="underline">Ver a vitrine da loja</Link>
        </p>
      </div>
    </div>
  );
}

export function Pending() {
  const { user, signOut, refresh } = useAuth();
  const nav = useNavigate();
  if (!user) return <Navigate to="/app/login" replace />;
  if (user.active) return <Navigate to="/app" replace />;
  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar p-4">
      <div className="card max-w-md text-center">
        <p className="text-xl font-extrabold">Aguardando liberação</p>
        <p className="mt-2 text-text-soft">Olá, {user.name}! Seu acesso foi criado, mas o administrador precisa liberar em “Usuários”.</p>
        <div className="mt-5 flex justify-center gap-2">
          <button className="btn-secondary" onClick={() => void refresh()}>Verificar de novo</button>
          <button className="btn-primary" onClick={async () => { await signOut(); nav('/app/login'); }}>Sair</button>
        </div>
      </div>
    </div>
  );
}
