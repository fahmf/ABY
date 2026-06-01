-- ABY — fungsi helper kamus untuk input manual lewat SQL Editor.
-- MIRROR persis normalisasi di src/lib/arabic.ts agar lemma_norm cocok dengan
-- pencarian aplikasi. Dipakai oleh alur ingest manual (roots/dictionary_entries).

-- Normalisasi Arab: buang harakat/tanda Qur'an + tatweel, samakan alif/hamza/ya/ta.
create or replace function normalize_ar(t text)
returns text
language sql
immutable
as $$
  select trim(
    translate(
      regexp_replace(
        coalesce(t, ''),
        U&'[\0610-\061A\0640\064B-\065F\0670\06D6-\06DC\06DF-\06E8\06EA-\06ED]',
        '', 'g'
      ),
      U&'\0622\0623\0625\0671\0649\0629\0624\0626',
      U&'\0627\0627\0627\0627\064A\0647\0621\0621'
    )
  );
$$;

-- Kunci akar (normalized tanpa spasi), seperti rootKey() di aplikasi.
create or replace function root_key_ar(t text)
returns text
language sql
immutable
as $$
  select regexp_replace(normalize_ar(t), '\s+', '', 'g');
$$;

-- Bangun array JSON string dari teks polos dipisah koma (, atau ،).
-- Aman terhadap newline/petik karena dibangun via jsonb, bukan cast string.
create or replace function to_str_array(t text)
returns jsonb
language sql
immutable
as $$
  select coalesce(
    (select jsonb_agg(trim(e))
     from unnest(regexp_split_to_array(coalesce(t,''), '\s*[,،]\s*')) e
     where trim(e) <> ''),
    '[]'::jsonb);
$$;

-- Bangun array contoh [{"text": "..."}] dari teks polos dipisah '|'.
create or replace function to_examples(t text)
returns jsonb
language sql
immutable
as $$
  select coalesce(
    (select jsonb_agg(jsonb_build_object('text', trim(e)))
     from unnest(string_to_array(coalesce(t,''), '|')) e
     where trim(e) <> ''),
    '[]'::jsonb);
$$;
