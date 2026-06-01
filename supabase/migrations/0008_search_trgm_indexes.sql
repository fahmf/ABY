-- Index trigram (pg_trgm) untuk mempercepat pencarian ILIKE '%...%'.
-- Tanpa ini, ILIKE dengan wildcard di depan memaksa sequential scan.

create extension if not exists pg_trgm;

create index if not exists lessons_title_trgm
  on lessons using gin (title_ar gin_trgm_ops);
create index if not exists lessons_body_trgm
  on lessons using gin (body_ar gin_trgm_ops);

create index if not exists dict_lemma_trgm
  on dictionary_entries using gin (lemma_ar gin_trgm_ops);
create index if not exists dict_meaning_trgm
  on dictionary_entries using gin (meaning_ar gin_trgm_ops);
create index if not exists dict_lemma_norm_trgm
  on dictionary_entries using gin (lemma_norm gin_trgm_ops);
