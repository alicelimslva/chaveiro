-- =====================================================================
-- Sistema do Chaveiro — schema inicial
-- Rode no SQL Editor do Supabase (ou `supabase db push`).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Tipos ----------
create type public.user_role      as enum ('admin', 'atendente');
create type public.service_line   as enum ('copia', 'controle', 'automotiva', 'abertura', 'carimbo');
create type public.order_status   as enum ('recebido', 'em_andamento', 'aguardando_peca', 'pronto', 'entregue', 'cancelado');
create type public.payment_method as enum ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito');
create type public.payment_kind   as enum ('sinal', 'pagamento');

-- ---------- Perfis (1:1 com auth.users) ----------
create table public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  name       text not null default '',
  email      text,
  role       public.user_role not null default 'atendente',
  active     boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and active);
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and active and role = 'admin');
$$;

-- O primeiro usuário cadastrado vira administrador ativo. Os demais entram
-- como atendente inativo e o dono libera em "Usuários".
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_first boolean;
begin
  select not exists (select 1 from profiles) into v_first;
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

create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- Impede que um usuário comum altere o próprio papel/ativação.
create or replace function public.protect_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() and (new.role is distinct from old.role or new.active is distinct from old.active) then
    raise exception 'Apenas o administrador pode alterar papel ou acesso';
  end if;
  if new.id = auth.uid() and (new.role <> 'admin' or not new.active) and old.role = 'admin' then
    raise exception 'Você não pode remover o próprio acesso de administrador';
  end if;
  return new;
end $$;
create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile();

-- ---------- Clientes e veículos ----------
create table public.customers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(trim(name)) > 0),
  phone      text not null default '',
  email      text,
  notes      text,
  created_by uuid references public.profiles default auth.uid(),
  created_at timestamptz not null default now()
);
create index customers_name_idx  on public.customers (lower(name));
create index customers_phone_idx on public.customers (phone);

create table public.vehicles (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers on delete cascade,
  brand       text not null default '',
  model       text not null default '',
  year        int,
  plate       text not null default '',
  key_type    text not null default '',
  transponder text not null default '',
  notes       text,
  created_at  timestamptz not null default now()
);
create index vehicles_customer_idx on public.vehicles (customer_id);
create index vehicles_plate_idx    on public.vehicles (plate);

-- ---------- Ordens de serviço ----------
create or replace function public.gen_order_code() returns text
language plpgsql volatile as $$
declare
  chars  text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
begin
  for i in 1..8 loop
    result := result || substr(chars, 1 + floor(random() * length(chars))::int, 1);
  end loop;
  return result;
end $$;

create table public.orders (
  id           uuid primary key default gen_random_uuid(),
  number       bigint generated always as identity (start with 1001) unique,
  code         text not null unique default public.gen_order_code(),
  customer_id  uuid not null references public.customers on delete restrict,
  vehicle_id   uuid references public.vehicles on delete set null,
  line         public.service_line not null,
  description  text not null default '',
  price        numeric(10,2) not null default 0 check (price >= 0),
  due_at       timestamptz not null,
  assignee_id  uuid not null references public.profiles,
  status       public.order_status not null default 'recebido',
  created_by   uuid references public.profiles default auth.uid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  ready_at     timestamptz,
  delivered_at timestamptz
);
create index orders_status_due_idx on public.orders (status, due_at);
create index orders_customer_idx   on public.orders (customer_id);
create index orders_created_idx    on public.orders (created_at);

create table public.order_events (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders on delete cascade,
  from_status public.order_status,
  to_status   public.order_status not null,
  user_id     uuid references public.profiles default auth.uid(),
  note        text,
  created_at  timestamptz not null default now()
);
create index order_events_order_idx on public.order_events (order_id, created_at);

create table public.payments (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders on delete cascade,
  amount     numeric(10,2) not null check (amount > 0),
  method     public.payment_method not null,
  kind       public.payment_kind not null default 'pagamento',
  created_by uuid references public.profiles default auth.uid(),
  created_at timestamptz not null default now()
);
create index payments_order_idx   on public.payments (order_id);
create index payments_created_idx on public.payments (created_at);

-- Carimbos de tempo automáticos
create or replace function public.orders_before_write() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  if new.status = 'pronto' and new.ready_at is null then new.ready_at := now(); end if;
  if new.status = 'entregue' then
    new.delivered_at := coalesce(new.delivered_at, now());
    new.ready_at := coalesce(new.ready_at, now());
  end if;
  return new;
end $$;
create trigger orders_before_write before insert or update on public.orders
  for each row execute function public.orders_before_write();

-- Valida a transição de status (mesmas regras de src/lib/domain.ts)
create or replace function public.orders_validate_status() returns trigger
language plpgsql as $$
begin
  if new.status is distinct from old.status and not (
    (old.status = 'recebido'        and new.status in ('em_andamento','aguardando_peca','pronto','cancelado')) or
    (old.status = 'em_andamento'    and new.status in ('aguardando_peca','pronto','cancelado')) or
    (old.status = 'aguardando_peca' and new.status in ('em_andamento','pronto','cancelado')) or
    (old.status = 'pronto'          and new.status in ('entregue','em_andamento','cancelado')) or
    (old.status = 'cancelado'       and new.status = 'recebido')
  ) then
    raise exception 'Mudança de status não permitida: % -> %', old.status, new.status;
  end if;
  return new;
end $$;
create trigger orders_validate_status before update of status on public.orders
  for each row execute function public.orders_validate_status();

-- Histórico: toda mudança de status gera um evento (quem, quando, de/para).
create or replace function public.orders_log_status() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_note text := nullif(current_setting('app.status_note', true), '');
begin
  if tg_op = 'INSERT' then
    insert into order_events (order_id, from_status, to_status, user_id, note)
    values (new.id, null, new.status, auth.uid(), 'Ordem aberta');
  elsif new.status is distinct from old.status then
    insert into order_events (order_id, from_status, to_status, user_id, note)
    values (new.id, old.status, new.status, auth.uid(), v_note);
  end if;
  return new;
end $$;
create trigger orders_log_status after insert or update of status on public.orders
  for each row execute function public.orders_log_status();

create or replace function public.change_order_status(p_order_id uuid, p_status public.order_status, p_note text default null)
returns void language plpgsql security invoker set search_path = public as $$
begin
  if not is_staff() then raise exception 'Sem permissão'; end if;
  perform set_config('app.status_note', coalesce(p_note, ''), true);
  update orders set status = p_status where id = p_order_id;
  if not found then raise exception 'Ordem não encontrada'; end if;
  perform set_config('app.status_note', '', true);
end $$;

create or replace function public.add_order_note(p_order_id uuid, p_note text)
returns void language plpgsql security invoker set search_path = public as $$
declare v_status order_status;
begin
  if not is_staff() then raise exception 'Sem permissão'; end if;
  select status into v_status from orders where id = p_order_id;
  if v_status is null then raise exception 'Ordem não encontrada'; end if;
  insert into order_events (order_id, from_status, to_status, user_id, note)
  values (p_order_id, v_status, v_status, auth.uid(), p_note);
end $$;

-- Acompanhamento público: só expõe o necessário, buscando pelo código único.
create or replace function public.get_public_order(p_code text) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'code', o.code, 'number', o.number, 'line', o.line, 'description', o.description,
    'status', o.status, 'due_at', o.due_at, 'created_at', o.created_at,
    'ready_at', o.ready_at, 'delivered_at', o.delivered_at, 'price', o.price,
    'paid', coalesce((select sum(p.amount) from payments p where p.order_id = o.id), 0),
    'customer_first_name', split_part(c.name, ' ', 1),
    'events', coalesce((
      select json_agg(json_build_object('to_status', e.to_status, 'created_at', e.created_at) order by e.created_at)
      from order_events e where e.order_id = o.id and e.from_status is distinct from e.to_status
    ), '[]'::json)
  )
  from orders o join customers c on c.id = o.customer_id
  where o.code = upper(trim(p_code))
  limit 1;
$$;
revoke all on function public.get_public_order(text) from public;
grant execute on function public.get_public_order(text) to anon, authenticated;

-- ---------- Configuração, mensagens e vitrine ----------
create table public.message_templates (
  key        text primary key,
  title      text not null,
  body       text not null,
  updated_at timestamptz not null default now()
);

create table public.store_settings (
  id                  int primary key default 1 check (id = 1),
  name                text not null default '',
  tagline             text not null default '',
  city                text not null default '',
  address             text not null default '',
  mall_location       text not null default '',
  hours               text not null default '',
  whatsapp            text not null default '',
  instagram           text not null default '',
  google_maps_url     text not null default '',
  google_business_url text not null default '',
  about               text not null default ''
);

create table public.showcase_services (
  id          uuid primary key default gen_random_uuid(),
  line        public.service_line not null,
  title       text not null,
  description text not null default '',
  price_from  numeric(10,2),
  whatsapp    text not null default '',
  sort        int not null default 0,
  active      boolean not null default true
);

create table public.showcase_photos (
  id         uuid primary key default gen_random_uuid(),
  path       text not null,
  caption    text not null default '',
  sort       int not null default 0,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- RLS — permissão por perfil em TODAS as tabelas
-- =====================================================================
alter table public.profiles          enable row level security;
alter table public.customers         enable row level security;
alter table public.vehicles          enable row level security;
alter table public.orders            enable row level security;
alter table public.order_events      enable row level security;
alter table public.payments          enable row level security;
alter table public.message_templates enable row level security;
alter table public.store_settings    enable row level security;
alter table public.showcase_services enable row level security;
alter table public.showcase_photos   enable row level security;

-- Perfis: cada um vê o próprio; equipe ativa vê todos; só admin altera.
create policy profiles_select on public.profiles for select to authenticated using (id = auth.uid() or is_staff());
create policy profiles_update on public.profiles for update to authenticated using (is_admin()) with check (is_admin());

-- Dados do balcão: equipe ativa lê e grava; apagar é só do admin.
create policy customers_select on public.customers for select to authenticated using (is_staff());
create policy customers_insert on public.customers for insert to authenticated with check (is_staff());
create policy customers_update on public.customers for update to authenticated using (is_staff()) with check (is_staff());
create policy customers_delete on public.customers for delete to authenticated using (is_admin());

create policy vehicles_select on public.vehicles for select to authenticated using (is_staff());
create policy vehicles_insert on public.vehicles for insert to authenticated with check (is_staff());
create policy vehicles_update on public.vehicles for update to authenticated using (is_staff()) with check (is_staff());
create policy vehicles_delete on public.vehicles for delete to authenticated using (is_admin());

create policy orders_select on public.orders for select to authenticated using (is_staff());
create policy orders_insert on public.orders for insert to authenticated with check (is_staff());
create policy orders_update on public.orders for update to authenticated using (is_staff()) with check (is_staff());
create policy orders_delete on public.orders for delete to authenticated using (is_admin());

-- Histórico é somente-inserção (via trigger/RPC); ninguém edita nem apaga.
create policy events_select on public.order_events for select to authenticated using (is_staff());
create policy events_insert on public.order_events for insert to authenticated with check (is_staff() and user_id = auth.uid());

create policy payments_select on public.payments for select to authenticated using (is_staff());
create policy payments_insert on public.payments for insert to authenticated with check (is_staff() and created_by = auth.uid());
create policy payments_delete on public.payments for delete to authenticated using (is_admin());

-- Modelos de mensagem: equipe lê, admin edita.
create policy templates_select on public.message_templates for select to authenticated using (is_staff());
create policy templates_write  on public.message_templates for all    to authenticated using (is_admin()) with check (is_admin());

-- Vitrine: leitura pública; edição só do admin.
create policy store_select on public.store_settings for select to anon, authenticated using (true);
create policy store_write  on public.store_settings for all    to authenticated using (is_admin()) with check (is_admin());

create policy services_select on public.showcase_services for select to anon, authenticated using (active or is_admin());
create policy services_write  on public.showcase_services for all    to authenticated using (is_admin()) with check (is_admin());

create policy photos_select on public.showcase_photos for select to anon, authenticated using (true);
create policy photos_write  on public.showcase_photos for all    to authenticated using (is_admin()) with check (is_admin());

-- ---------- Storage: fotos da vitrine ----------
insert into storage.buckets (id, name, public) values ('vitrine', 'vitrine', true) on conflict (id) do nothing;

create policy "vitrine leitura publica" on storage.objects for select using (bucket_id = 'vitrine');
create policy "vitrine admin envia"    on storage.objects for insert to authenticated with check (bucket_id = 'vitrine' and public.is_admin());
create policy "vitrine admin altera"   on storage.objects for update to authenticated using (bucket_id = 'vitrine' and public.is_admin());
create policy "vitrine admin apaga"    on storage.objects for delete to authenticated using (bucket_id = 'vitrine' and public.is_admin());

-- ---------- Dados iniciais ----------
insert into public.store_settings (id, name, tagline, city, address, mall_location, hours, whatsapp, about) values (
  1, 'Chaveiro do Shopping', 'Chaves, controles e carimbos na hora — dentro do shopping', 'São Paulo - SP',
  'Av. Exemplo, 1000 — Shopping Central', 'Piso térreo, corredor B, ao lado da praça de alimentação',
  'Seg a sáb 10h–22h · Dom e feriados 14h–20h', '11999990000',
  'Mais de 10 anos fazendo cópias de chaves, controles de portão, chaves automotivas com transponder, aberturas e carimbos personalizados.'
);

insert into public.message_templates (key, title, body) values
  ('recebido', 'Ordem recebida', E'Olá, {cliente}! Recebemos seu serviço de {servico} (ordem nº {numero}). Prazo: {prazo}. Acompanhe por aqui: {link}\n{loja} — {local}'),
  ('em_andamento', 'Em andamento', 'Olá, {cliente}! Seu serviço nº {numero} ({servico}) já está em andamento. Previsão: {prazo}. Acompanhe: {link}'),
  ('aguardando_peca', 'Aguardando peça', 'Olá, {cliente}! Seu serviço nº {numero} está aguardando a chegada de uma peça. Avisaremos assim que chegar. Acompanhe: {link}'),
  ('pronto', 'Pronto para retirar', 'Olá, {cliente}! Seu serviço nº {numero} ({servico}) está PRONTO. Saldo a pagar: {saldo}. Retire em {loja} — {local}. {link}'),
  ('entregue', 'Entregue / agradecimento', 'Obrigado pela preferência, {cliente}! Se puder, avalie a {loja} no Google — isso ajuda muito a gente. 🙏'),
  ('cancelado', 'Cancelado', 'Olá, {cliente}. A ordem nº {numero} foi cancelada. Qualquer dúvida, é só responder esta mensagem.'),
  ('lembrete', 'Lembrete de retirada', 'Olá, {cliente}! Seu serviço nº {numero} continua pronto aguardando retirada em {loja} — {local}. Saldo: {saldo}.');

insert into public.showcase_services (line, title, description, price_from, sort) values
  ('copia', 'Cópia de chaves', 'Residenciais, tetra, gorges e cadeados. Na hora.', 12, 1),
  ('controle', 'Controles de portão e alarme', 'Cópia e programação de controles de portão, garagem e alarme.', 45, 2),
  ('automotiva', 'Chave automotiva', 'Chave canivete, codificada e com transponder para diversas marcas.', 150, 3),
  ('abertura', 'Abertura de portas e carros', 'Atendimento rápido para portas residenciais e veículos.', 90, 4),
  ('carimbo', 'Carimbos', 'Carimbos automáticos e personalizados para empresas e profissionais.', 40, 5);
