-- Kolom lemma yang dinormalkan untuk pencarian kamus dari bentuk kata (surface).
alter table dictionary_entries
  add column if not exists lemma_norm text;

create index if not exists dictionary_lemma_norm_idx
  on dictionary_entries (lemma_norm);
