-- ABY — indeks trigram untuk pencarian kamus «في المعجم».
--
-- searchDictionary memakai pencocokan substring (ilike '%q%'). Leading-wildcard
-- tidak bisa memakai b-tree biasa (dictionary_lemma_norm_idx) → seq scan, yang
-- memburuk saat kamus tumbuh menjadi puluhan ribu entri. Indeks GIN trigram
-- mempercepat `ILIKE '%...%'` pada ketiga kolom yang dicari.

create extension if not exists pg_trgm;

create index if not exists dictionary_lemma_ar_trgm_idx
  on dictionary_entries using gin (lemma_ar gin_trgm_ops);

create index if not exists dictionary_lemma_norm_trgm_idx
  on dictionary_entries using gin (lemma_norm gin_trgm_ops);

create index if not exists dictionary_meaning_ar_trgm_idx
  on dictionary_entries using gin (meaning_ar gin_trgm_ops);
