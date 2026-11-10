-- Correção: primeiro administrador e trava de perfil
-- Rode no SQL Editor do Supabase.

-- 1) Vira admin quem se cadastrar enquanto não houver nenhum administrador ativo.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_first boolean;
begin
  select not exists (select 1 from profiles where role = 'admin' and active) into v_first;
  insert into profiles (id, name, email, role, active)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1)),
    new.email,
    case when v_first then 'admin'::user_role else 'atendente'::user_role end,
    v_first
  );
  return new;
end $$;

-- 2) Permite ajustes feitos direto no banco (SQL Editor), mantendo a trava para usuários do app.
create or replace function public.protect_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;
  if not is_admin() and (new.role is distinct from old.role or new.active is distinct from old.active) then
    raise exception 'Apenas o administrador pode alterar papel ou acesso';
  end if;
  if new.id = auth.uid() and (new.role <> 'admin' or not new.active) and old.role = 'admin' then
    raise exception 'Você não pode remover o próprio acesso de administrador';
  end if;
  return new;
end $$;

-- 3) Cria o perfil de quem já tinha login mas ficou sem perfil (cadastrou antes do trigger existir).
--    Entram como atendente pendente; o administrador libera em "Usuários".
insert into public.profiles (id, name, email, role, active)
select u.id,
       coalesce(nullif(u.raw_user_meta_data ->> 'name', ''), split_part(u.email, '@', 1)),
       u.email, 'atendente', false
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

-- 4) Se ainda não existe administrador, promove a conta mais antiga.
--    (Registro: a versão aplicada no banco escolhia uma conta específica pelo nome.
--    Aqui a regra usa só a data de cadastro, sem guardar dados pessoais no repositório.)
update public.profiles
set role = 'admin', active = true
where id = (select id from public.profiles order by created_at limit 1)
  and not exists (select 1 from public.profiles where role = 'admin' and active);

-- Resultado: confira quantos administradores ativos existem (sem listar dados pessoais).
select count(*) as administradores_ativos from public.profiles where role = 'admin' and active;
