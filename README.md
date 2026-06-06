# Child Growth Web

Child Growth Web adalah landing page dan dashboard/admin untuk aplikasi pemantauan tumbuh kembang anak. Repo ini terpisah dari backend API agar web, mobile, dan backend bisa dikelola secara independen.

## Status

MVP web:

- Landing page publik di `/`
- Dashboard/admin di `/dashboard`
- Integrasi API backend untuk data anak, pengukuran, dan reminder
- Tema dashboard berdasarkan gender anak aktif

## Stack

- React
- TypeScript
- Vite
- CSS native

## Prasyarat

- Node.js versi modern
- npm
- Backend Child Growth API berjalan di `http://localhost:3000`

Backend repo yang dipakai oleh web ini:

```text
/Users/bagusamudra/Documents/Child App
```

## Setup Lokal

Install dependencies:

```bash
npm install
```

Salin environment:

```bash
cp .env.example .env
```

Jalankan development server:

```bash
npm run dev
```

Web berjalan di:

```text
http://localhost:5173
```

Halaman utama:

- Landing page: `http://localhost:5173/`
- Dashboard admin: `http://localhost:5173/dashboard`

## Environment

```env
VITE_API_BASE_URL=http://localhost:3000
```

Gunakan URL backend berbeda untuk staging/production.

## Script

```bash
npm run dev
```

Menjalankan Vite development server.

```bash
npm run build
```

Menjalankan TypeScript build dan Vite production build.

```bash
npm run lint
```

Menjalankan ESLint.

```bash
npm run preview
```

Menjalankan preview hasil build.

## Fitur

Landing page:

- Hero product preview
- Ringkasan fitur
- Alur produk
- CTA ke dashboard admin

Dashboard/admin:

- Daftar data anak
- Tambah profil anak
- Detail monitoring anak aktif
- Tambah pengukuran
- Riwayat pengukuran
- Reminder dan toggle selesai
- Tema biru untuk anak laki-laki
- Tema pink untuk anak perempuan

## Struktur Repo

```text
.
├── public/
├── src/
│   ├── App.css
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── docs/
│   ├── ARCHITECTURE.md
│   └── MAINTENANCE.md
├── ISSUE.md
├── README.md
└── package.json
```

## Integrasi API

Frontend membaca base URL dari:

```ts
import.meta.env.VITE_API_BASE_URL
```

Endpoint yang dipakai:

- `GET /api/children`
- `POST /api/children`
- `GET /api/children/:id`
- `POST /api/children/:childId/measurements`
- `PATCH /api/children/:childId/reminders/:id/done`

## Workflow Development

1. Jalankan backend API.
2. Jalankan web dengan `npm run dev`.
3. Lakukan perubahan.
4. Jalankan `npm run lint`.
5. Jalankan `npm run build`.
6. Commit perubahan ke branch feature.
7. Buat pull request.

## Deployment

Repo ini bisa dideploy ke Vercel, Netlify, atau static hosting lain yang mendukung Vite.

Build command:

```bash
npm run build
```

Output directory:

```text
dist
```

Environment production wajib diisi:

```env
VITE_API_BASE_URL=https://backend-production-url.example.com
```

## Dokumentasi Tambahan

- [Architecture](docs/ARCHITECTURE.md)
- [Maintenance](docs/MAINTENANCE.md)
- [Issue Backlog](ISSUE.md)
