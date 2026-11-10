-- =====================================================================
-- Endurecimento de segurança (auditoria insecure-defaults, 2026-11-10)
--   1) Cadastro novo NUNCA vira administrador: sempre atendente inativo.
--   2) Código de acompanhamento gerado com gen_random_bytes() (CSPRNG)
--      em vez de random(). Só afeta pedidos NOVOS: os códigos já gravados
--      não mudam, então os links antigos continuam funcionando.
--
-- Rode no SQL Editor do Supabase. O script inteiro roda numa transação:
-- se a trava do passo 0 falhar, NADA é alterado.
-- =====================================================================

begin;

-- 0) Trava: só aplica se já existir pelo menos um administrador ativo.
--    Sem isso, depois desta migration ninguém mais conseguiria virar admin
--    pelo app e você ficaria trancado fora do sistema.
do $$
declare v_admins int;
begin
  select count(*) into v_admins from public.profiles where role = 'admin' and active;
  if v_admins = 0 then
    raise exception using
      message = 'Nenhum administrador ativo encontrado. Nada foi alterado.',
      hint    = 'Promova sua conta antes: update public.profiles set role = ''admin'', active = true where email = ''seu@email.com'';';
  end if;
  raise notice '% administrador(es) ativo(s) encontrado(s). Aplicando.', v_admins;
end $$;

-- 1) Todo cadastro novo entra como atendente inativo, sem exceção.
--    Ativar e promover: tela "Usuários" (admin) ou SQL Editor.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email, role, active)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1)),
    new.email,
    'atendente',
    false
  );
  return new;
end $$;

-- 2) Código de acompanhamento com gerador criptográfico.
--    Mesmo alfabeto (32 símbolos, sem I/O/0/1) e mesmo tamanho (8) de antes.
--    256 é múltiplo de 32, então "byte % 32" não tem viés.
--    search_path inclui "extensions" porque é onde o Supabase instala o pgcrypto.
create or replace function public.gen_order_code() returns text
language plpgsql volatile set search_path = public, extensions, pg_temp as $$
declare
  chars  constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes  bytea := gen_random_bytes(8);
  result text := '';
begin
  for i in 0..7 loop
    result := result || substr(chars, 1 + (get_byte(bytes, i) % 32), 1);
  end loop;
  return result;
end $$;

commit;

-- Conferência (só leitura): administradores ativos e amostra de código novo.
select name, email, role, active from public.profiles where role = 'admin' and active order by created_at;
select public.gen_order_code() as exemplo_de_codigo_novo;
