# Supabase セットアップ手順(Phase 5)

このアプリは Supabase が未設定でもローカル完結(IndexedDBのみ)で動作します。
オンライン同期を有効にする場合のみ、以下の手順で設定してください。

## 1. プロジェクトを作成

https://supabase.com でプロジェクトを新規作成し、Project Settings > API から
以下をコピーします。

- Project URL
- anon public key

## 2. 匿名認証を有効化

Authentication > Sign In / Providers > Anonymous Sign-Ins を ON にします。

## 3. テーブルを作成

SQL Editor で以下を実行します(仕様書セクション5準拠、`synced` はローカル専用の
ため含めません)。

```sql
create table public.sites (
  id uuid primary key,
  user_id uuid references auth.users(id),
  label text,
  lat double precision not null,
  lng double precision not null,
  created_at timestamptz not null default now()
);

create table public.observations (
  id uuid primary key,
  site_id uuid not null references public.sites(id),
  phase text not null check (phase in ('BEFORE', 'AFTER')),
  user_id uuid references auth.users(id),
  lat double precision not null,
  lng double precision not null,
  gps_accuracy_m double precision,
  photo_url text,
  texture text check (texture in ('HARD', 'NORMAL', 'SOFT')),
  sunlight text check (sunlight in ('SUNNY', 'HALF_SHADE', 'SHADE')),
  infiltration_time_sec integer not null,
  flag_review boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.sites enable row level security;
alter table public.observations enable row level security;

create policy "users manage their own sites"
  on public.sites for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users manage their own observations"
  on public.observations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

## 4. Storage バケットを作成

Storage > New bucket で `observation-photos` という名前の **Public** バケットを
作成し、Policies で以下を追加します。

```sql
create policy "authenticated users upload photos"
  on storage.objects for insert
  with check (bucket_id = 'observation-photos' and auth.role() = 'authenticated');

create policy "anyone can view photos"
  on storage.objects for select
  using (bucket_id = 'observation-photos');
```

(Supabase の匿名認証ユーザーも `authenticated` ロールとして扱われるため、
上記ポリシーでそのままアップロードできます)

## 5. アプリ側の設定

[supabaseConfig.js](supabaseConfig.js) の `SUPABASE_URL` と `SUPABASE_ANON_KEY` を
自分のプロジェクトの値に書き換えてください。この2つが設定されるまで、アプリは
これまで通りローカル完結で動作し、同期は一切行われません。
