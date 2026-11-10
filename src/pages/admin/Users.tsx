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

  // Pendentes primeiro, para o dono enxergar quem está esperando liberação.
  const list = [...(data ?? [])].sort((a, b) => Number(a.active) - Number(b.active) || a.name.localeCompare(b.name));
  const pending = list.filter((p) => !p.active);

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle>Usuários e permissões</PageTitle>
      <div className="card mb-4 bg-field text-sm text-text-soft">
        <p><b>Como adicionar um funcionário:</b> peça para ele abrir o sistema e clicar em “Criar acesso”. O cadastro aparece aqui como pendente, e você libera.</p>
        <p className="mt-1"><b>Administrador</b>: acesso total (relatórios, preços, mensagens, vitrine, usuários). <b>Atendente</b>: ordens, clientes e pagamentos.</p>
      </div>
      {pending.length > 0 && <p className="mb-3 rounded-xl bg-primary/10 p-3 font-semibold text-amber-300">{pending.length} cadastro(s) aguardando liberação.</p>}
      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {list.map((p) => (
          <div key={p.id} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${p.active ? '' : 'bg-primary/10'}`}>
            <div className="min-w-0 flex-1">
              <p className="font-bold">
                {p.name} {p.id === user?.id && <span className="text-sm font-normal text-text-soft">(você)</span>}
                {!p.active && <span className="ml-2 rounded-full bg-primary/20 px-2 py-0.5 text-xs font-semibold text-amber-300">pendente</span>}
              </p>
              <p className="text-sm text-text-soft">{p.email}</p>
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
