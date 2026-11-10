-- =====================================================================
-- Segunda barreira no protect_profile: a liberação "sem usuário logado"
-- passa a valer só para acesso direto ao banco (SQL Editor) e para a
-- chave secreta (service_role). Chamadas pela API como anon são barradas
-- pelo próprio gatilho, mesmo que um dia o RLS de profiles seja afrouxado
-- por engano.
--
-- Hoje o anon já não consegue alterar perfis: o RLS de profiles só tem
-- regra de UPDATE para authenticated + is_admin(). Isto é defesa em
-- profundidade, não correção de uma falha explorável.
--
-- auth.role() é a função do Supabase que lê o papel do JWT da requisição:
--   'anon' / 'authenticated' / 'service_role' pela API; NULL sem JWT
--   (SQL Editor, conexão direta como postgres).
--
-- Rode no SQL Editor do Supabase.
-- =====================================================================

begin;

create or replace function public.protect_profile() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_role text := coalesce(auth.role(), '');
begin
  -- Acesso direto ao banco (sem JWT) ou chave secreta: liberado.
  if v_role in ('', 'service_role') then
    return new;
  end if;

  -- Pela API, só um usuário logado pode chegar aqui. Anon (ou qualquer
  -- outro papel) é barrado, independentemente das regras de RLS.
  if v_role <> 'authenticated' or auth.uid() is null then
    raise exception 'Sem permissão para alterar perfis';
  end if;

  if not is_admin() and (new.role is distinct from old.role or new.active is distinct from old.active) then
    raise exception 'Apenas o administrador pode alterar papel ou acesso';
  end if;
  if new.id = auth.uid() and (new.role <> 'admin' or not new.active) and old.role = 'admin' then
    raise exception 'Você não pode remover o próprio acesso de administrador';
  end if;
  return new;
end $$;

commit;

-- Conferência (só leitura): a função deve mencionar auth.role().
select position('auth.role()' in prosrc) > 0 as segunda_barreira_ativa
from pg_proc where proname = 'protect_profile' and pronamespace = 'public'::regnamespace;
