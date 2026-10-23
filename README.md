# Kawan Dana

Aplikasi manajemen keuangan berbasis React, Supabase, dan Vite. Mendukung login dan registrasi, ringkasan pemasukan/pengeluaran/pemakaian, saldo otomatis, filter periode, pencarian, serta penambahan dan penghapusan transaksi.

## Jalankan lokal

```bash
npm install
cp .env.example .env.local
npm run dev
```

Isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` pada `.env.local` dengan kredensial proyek Supabase.

## Siapkan database Supabase

1. Buat proyek baru di Supabase.
2. Jalankan isi `supabase/schema.sql` pada SQL Editor.
3. Aktifkan Email Auth pada Authentication > Providers.
4. Tambahkan URL aplikasi pada Authentication > URL Configuration > Redirect URLs.
5. Schema membuat tabel `transactions` dengan RLS agar setiap akun hanya dapat mengakses transaksi miliknya.

## Deploy ke Vercel

1. Push repository ke GitHub.
2. Import repository tersebut ke Vercel.
3. Tambahkan environment variables `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`.
4. Jalankan deploy. Konfigurasi Vite dan folder output `dist` sudah tersedia di `vercel.json`.

## Perintah

```bash
npm run dev
npm run build
npm run lint
npm run preview
```
