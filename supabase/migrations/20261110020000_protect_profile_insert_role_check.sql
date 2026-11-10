-- =====================================================================
-- Segunda barreira também no INSERT de profiles (mesma checagem de papel
-- da 20261110010000 para o UPDATE).
--
-- Liberado só para:
--   * o gatilho de cadastro handle_new_user (auth.users -> profiles),
--     e apenas criando atendente inativo;
--   * acesso direto ao banco sem JWT (SQL Editor);
--   * a chave secreta (service_role).
-- Qualquer outro insert vindo da API (anon ou authenticated) dá erro,
-- mesmo que um dia o RLS de profiles ganhe uma regra de INSERT por engano.
--
-- Como o gatilho sabe que quem está inserindo é o handle_new_user:
-- GET DIAGNOSTICS ... PG_CONTEXT devolve a pilha de chamadas real do
-- Postgres, que quem chama pela API não consegue falsificar.
--
-- Hoje o RLS já bloqueia: não existe regra de INSERT em profiles. Isto é
-- defesa em profundidade, não correção de uma falha explorável.
--
-- Rode no SQL Editor do Supabase, depois da 20261110010000.
-- =====================================================================

begin;

create or replace function public.protect_profile_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_role text := coalesce(auth.role(), '');
  v_ctx  text;
begin
  -- Acesso direto ao banco (sem JWT) ou chave secreta: liberado.
  if v_role in ('', 'service_role') then
    return new;
  end if;

  -- Pela API: só o gatilho de cadastro, e sempre como atendente inativo.
  get diagnostics v_ctx = pg_context;
  if pg_trigger_depth() > 1
     and v_ctx ~ 'function (public\.)?handle_new_user\(\)'
     and new.role = 'atendente' and not new.active then
    return new;
  end if;

  raise exception 'Sem permissão para criar perfis';
end $$;

drop trigger if exists profiles_protect_insert on public.profiles;
create trigger profiles_protect_insert before insert on public.profiles
  for each row execute function public.protect_profile_insert();

commit;

-- Conferência (só leitura): deve mostrar protecao_insert_ativa = true.
select exists (
  select 1
  from pg_trigger t
  join pg_proc p on p.oid = t.tgfoid
  where t.tgrelid = 'public.profiles'::regclass
    and t.tgname = 'profiles_protect_insert'
    and t.tgenabled <> 'D'
    and p.prosrc like '%handle_new_user%'
) as protecao_insert_ativa;
