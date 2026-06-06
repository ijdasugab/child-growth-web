# Architecture

## Overview

Child Growth Web adalah aplikasi React yang berfungsi sebagai landing page publik dan dashboard/admin web. Aplikasi ini mengonsumsi backend Child Growth API melalui HTTP.

```text
Browser
  |
  | React + Vite
  v
Child Growth Web
  |
  | HTTP JSON API
  v
Child Growth API
  |
  | Prisma
  v
PostgreSQL
```

## Routes

Routing saat ini dibuat manual di `src/App.tsx` dengan membaca `window.location.pathname`.

- `/` menampilkan landing page
- `/dashboard` menampilkan dashboard/admin

Alasan belum memakai router library:

- Route masih sedikit
- MVP lebih cepat dijaga tanpa dependency tambahan
- Mudah diganti ke React Router atau TanStack Router jika route bertambah

## Data Flow

1. App membaca `VITE_API_BASE_URL`.
2. App memanggil endpoint backend melalui helper `apiRequest`.
3. Data anak disimpan di state `children`.
4. Anak aktif disimpan di `selectedChildId`.
5. Detail anak aktif disimpan di `selectedChild`.
6. Dashboard merender data monitoring berdasarkan `selectedChild`.

## API Contract

Frontend mengharapkan backend mengirim JSON dengan field utama berikut.

Child:

```ts
type Child = {
  id: string
  fullName: string
  gender: 'MALE' | 'FEMALE'
  birthDate: string
  birthWeightKg: string | number | null
  birthLengthCm: string | number | null
}
```

Measurement:

```ts
type Measurement = {
  id: string
  measuredAt: string
  weightKg: string | number | null
  heightCm: string | number | null
  headCircumferenceCm: string | number | null
  notes: string | null
}
```

Reminder:

```ts
type Reminder = {
  id: string
  title: string
  reminderType: string | null
  reminderDate: string
  isDone: boolean | null
  notes: string | null
}
```

## Styling

Styling masih memakai CSS native:

- `src/index.css` untuk global base style
- `src/App.css` untuk layout landing dan dashboard

Dashboard memakai CSS variables:

- `--accent`
- `--accent-strong`
- `--accent-soft`
- `--accent-tint`
- `--accent-border`

Tema gender:

- `.theme-male`
- `.theme-female`

## Current Limitations

- Belum ada auth/login admin.
- Belum ada role permission.
- Belum ada dedicated router library.
- Belum ada test suite.
- Form reminder baru belum tersedia di UI.
- Master data masih placeholder menu.

## Recommended Next Architecture Steps

1. Tambahkan auth sebelum dashboard dipakai publik.
2. Pisahkan komponen besar di `App.tsx` menjadi folder `components/` dan `pages/`.
3. Tambahkan router library setelah route bertambah.
4. Tambahkan API client module agar request tidak bercampur dengan UI.
5. Tambahkan test minimal untuk formatter, API client, dan critical render.
