import { api } from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { useAction } from '../../components/Toast';
import { Loading, PageTitle } from '../../components/ui';
import { useAsync } from '../../lib/useAsync';
import type { Role } from '../../types';

export function Users() {
  const { user } = useAuth();
  const run = useAction();
  const { data, loading, reload } = useAsync(() => api.listProfiles());
  if (loading && !data) return <Loading />;

  const pending = (data ?? []).filter((p) => !p.active);

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle>Usuários e permissões</PageTitle>
      <div className="card mb-4 bg-slate-50 text-sm text-slate-700">
        <p><b>Como adicionar um funcionário:</b> peça para ele abrir o sistema e clicar em “Criar acesso”. O cadastro aparece aqui como pendente, e você libera.</p>
        <p className="mt-1"><b>Administrador</b>: acesso total (relatórios, preços, mensagens, vitrine, usuários). <b>Atendente</b>: ordens, clientes e pagamentos.</p>
      </div>
      {pending.length > 0 && <p className="mb-3 rounded-xl bg-amber-50 p-3 font-semibold text-amber-900">{pending.length} cadastro(s) aguardando liberação.</p>}
      <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {(data ?? []).map((p) => (
          <div key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-bold">{p.name} {p.id === user?.id && <span className="text-sm font-normal text-slate-500">(você)</span>}</p>
              <p className="text-sm text-slate-500">{p.email}</p>
            </div>
            <select
              className="input w-40 py-2"
              value={p.role}
              disabled={p.id === user?.id}
              aria-label={`Papel de ${p.name}`}
              onChange={async (e) => {
                await run(() => api.updateProfile(p.id, { role: e.target.value as Role }), 'Papel atualizado');
                void reload();
              }}
            >
              <option value="atendente">Atendente</option>
              <option value="admin">Administrador</option>
            </select>
            <button
              disabled={p.id === user?.id}
              className={p.active ? 'btn-secondary btn-sm' : 'btn-primary btn-sm'}
              onClick={async () => {
                await run(() => api.updateProfile(p.id, { active: !p.active }), p.active ? 'Acesso bloqueado' : 'Acesso liberado');
                void reload();
              }}
            >
              {p.active ? 'Bloquear' : 'Liberar acesso'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
