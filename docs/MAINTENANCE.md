# Maintenance Guide

Panduan ini ditujukan untuk maintainer yang akan melanjutkan Child Growth Web.

## Local Checklist

Sebelum mulai development:

```bash
npm install
cp .env.example .env
npm run dev
```

Pastikan backend berjalan:

```text
http://localhost:3000
```

## Validation Checklist

Jalankan sebelum commit atau pull request:

```bash
npm run lint
npm run build
```

Jika salah satu gagal, jangan push perubahan sebelum diperbaiki.

## Common Tasks

### Mengubah URL Backend

Ubah file `.env`:

```env
VITE_API_BASE_URL=http://localhost:3000
```

Untuk production, set environment variable di platform deployment.

### Menambah Halaman Baru

Untuk MVP saat ini routing masih manual di `src/App.tsx`.

Jika halaman bertambah lebih dari 3 sampai 4 route, gunakan router library seperti React Router atau TanStack Router.

### Menambah Endpoint API

Langkah yang disarankan:

1. Tambahkan type data di `src/App.tsx` atau pindahkan ke `src/types/`.
2. Tambahkan function request baru.
3. Handle loading/error state.
4. Validasi dengan backend lokal.

### Mengubah Tema

Tema ada di `src/App.css`.

Class utama dashboard:

```css
.theme-male
.theme-female
```

Jangan hardcode warna di banyak komponen. Pakai CSS variables agar perubahan tema tetap konsisten.

## Known Technical Debt

- `src/App.tsx` masih besar dan perlu dipecah.
- Belum ada test.
- Belum ada API client terpisah.
- Belum ada auth.
- Belum ada state management khusus.

## Suggested Refactor Order

Urutan refactor yang aman:

1. Pindahkan type ke `src/types.ts`.
2. Pindahkan `apiRequest` dan endpoint functions ke `src/api.ts`.
3. Pindahkan landing page ke `src/pages/LandingPage.tsx`.
4. Pindahkan dashboard ke `src/pages/DashboardPage.tsx`.
5. Pindahkan form ke `src/components/ChildForm.tsx`.
6. Tambahkan router library jika route bertambah.

## Git Workflow

Gunakan branch feature:

```bash
git checkout -b codex/web-docs-dashboard
```

Commit message contoh:

```text
docs: add maintenance documentation
feat: add landing page and admin dashboard
```

Pull request harus menyertakan:

- Ringkasan perubahan
- Cara test
- Screenshot jika ada perubahan UI
- Catatan risiko atau limitation

## GitHub Achievement Notes

GitHub achievement tidak bisa dijamin karena aturannya dikontrol oleh GitHub. Aktivitas yang biasanya relevan:

- Membuat pull request.
- Merge pull request.
- Membuat issue.
- Menutup issue setelah selesai.
- Berkontribusi konsisten di repository publik.

Untuk badge seperti Pull Shark, biasanya PR harus berhasil di-merge. Membuat PR saja belum tentu cukup.
