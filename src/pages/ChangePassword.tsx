import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import { PageTitle } from '../components/ui';
import { MIN_PASSWORD } from '../lib/rules';

export function ChangePassword() {
  const { user } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (next !== confirm) {
      setError('A confirmação não é igual à senha nova.');
      return;
    }
    setBusy(true);
    try {
      await api.changePassword(current, next);
      toast('Senha alterada. Use a nova senha no próximo login.');
      nav('/app');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <PageTitle>Alterar senha</PageTitle>
      <form onSubmit={submit} className="card space-y-4">
        <p className="text-sm text-text-soft">
          Conta: <b className="text-text-strong">{user?.email}</b>
        </p>
        <div>
          <label className="label" htmlFor="pw-current">Senha atual</label>
          <input id="pw-current" className="input" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="pw-next">Senha nova</label>
          <input id="pw-next" className="input" type="password" autoComplete="new-password" minLength={MIN_PASSWORD} value={next} onChange={(e) => setNext(e.target.value)} required />
          <p className="mt-1 text-sm text-text-faint">Pelo menos {MIN_PASSWORD} caracteres.</p>
        </div>
        <div>
          <label className="label" htmlFor="pw-confirm">Repita a senha nova</label>
          <input id="pw-confirm" className="input" type="password" autoComplete="new-password" minLength={MIN_PASSWORD} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>
        {error && <p role="alert" className="rounded-xl bg-state-late/10 p-3 font-semibold text-red-400">{error}</p>}
        <div className="flex gap-2">
          <button type="button" className="btn-secondary flex-1" onClick={() => nav(-1)}>Cancelar</button>
          <button className="btn-primary flex-1" disabled={busy}>{busy ? 'Salvando…' : 'Salvar senha'}</button>
        </div>
      </form>
    </div>
  );
}
