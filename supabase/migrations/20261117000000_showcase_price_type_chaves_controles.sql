-- Atualização de preços pedida pelo cliente (áudio de 12/11/2026):
--  * Tipo de preço na vitrine: fixo, "a partir de" ou "sob consulta" (sem valor; leva ao atendimento).
--  * Carimbos: a partir de R$ 50,00 (antes R$ 40,00).
--  * Nova categoria Chaves e Controles: cópia simples R$ 15,00 fixo, controle a partir de R$ 50,00,
--    e chaves tetra/gorge/codificada/multiponto sob consulta.
-- Idempotente: pode rodar mais de uma vez sem duplicar itens.

alter table public.showcase_services
  add column if not exists price_type text not null default 'a_partir_de';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'showcase_services_price_type_check') then
    alter table public.showcase_services
      add constraint showcase_services_price_type_check
      check (price_type in ('fixo', 'a_partir_de', 'sob_consulta'));
  end if;
end $$;

-- Carimbos: "a partir de" R$ 40 passa para R$ 50.
update public.showcase_services
   set price_from = 50, price_type = 'a_partir_de'
 where line = 'carimbo' and price_from = 40;

-- Os itens genéricos antigos dão lugar aos itens da nova categoria. Ficam ocultos, não apagados.
update public.showcase_services
   set active = false
 where (line = 'copia' and title = 'Cópia de chaves')
    or (line = 'controle' and title = 'Controles de portão e alarme');

-- Chaves e Controles no topo da vitrine; os demais descem 6 posições.
update public.showcase_services
   set sort = sort + 6
 where title not in ('Cópia de Chave Simples', 'Controle para Portão', 'Cópia de Chave Tetra',
                     'Cópia de Chave Gorge', 'Cópia de Chave Codificada', 'Cópia de Chave Multiponto')
   and not exists (select 1 from public.showcase_services where title = 'Cópia de Chave Simples');

insert into public.showcase_services (line, title, description, price_from, price_type, sort)
select v.line::public.service_line, v.title, v.description, v.price_from, v.price_type, v.sort
  from (values
    ('copia',    'Cópia de Chave Simples',    'Cópia de chave comum (tipo Yale)',       15::numeric, 'fixo',         1),
    ('controle', 'Controle para Portão',      'Controle remoto para portão eletrônico', 50::numeric, 'a_partir_de',  2),
    ('copia',    'Cópia de Chave Tetra',      'Necessita avaliação do atendimento',     null,        'sob_consulta', 3),
    ('copia',    'Cópia de Chave Gorge',      'Necessita avaliação do atendimento',     null,        'sob_consulta', 4),
    ('copia',    'Cópia de Chave Codificada', 'Necessita avaliação do atendimento',     null,        'sob_consulta', 5),
    ('copia',    'Cópia de Chave Multiponto', 'Necessita avaliação do atendimento',     null,        'sob_consulta', 6)
  ) as v(line, title, description, price_from, price_type, sort)
 where not exists (select 1 from public.showcase_services s where s.title = v.title);
