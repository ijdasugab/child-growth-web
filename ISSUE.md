# Issue Backlog

Dokumen ini berisi backlog awal untuk pengembangan Child Growth Web. Gunakan ini sebagai referensi saat membuat issue GitHub.

## P0 - Required Before Public Use

### 1. Add Authentication for Admin Dashboard

Dashboard saat ini bisa diakses langsung melalui `/dashboard`. Untuk production, perlu login dan proteksi route.

Acceptance criteria:

- User harus login sebelum membuka `/dashboard`.
- Token/session tersimpan aman.
- Logout tersedia.
- API request menyertakan credential yang dibutuhkan backend.

### 2. Split App Component Into Pages and Components

`src/App.tsx` saat ini memuat landing, dashboard, API helper, form, dan formatter. Ini perlu dipecah agar maintainable.

Acceptance criteria:

- Landing page dipindahkan ke `src/pages/LandingPage.tsx`.
- Dashboard dipindahkan ke `src/pages/DashboardPage.tsx`.
- Form anak dipindahkan ke `src/components/ChildForm.tsx`.
- API helper dipindahkan ke `src/api.ts`.
- Type dipindahkan ke `src/types.ts`.

### 3. Add Reminder Creation Form

Dashboard baru bisa menampilkan dan toggle reminder. Form tambah reminder belum tersedia.

Acceptance criteria:

- Admin bisa membuat reminder untuk anak aktif.
- Field minimal: title, reminder type, reminder date, notes.
- Setelah submit, list reminder ter-refresh.

## P1 - Important Improvements

### 4. Add Master Data Views

Menu Master Data masih placeholder.

Acceptance criteria:

- Tampilkan immunizations dari `/api/master-data/immunizations`.
- Tampilkan milestones dari `/api/master-data/milestones`.
- Tampilkan growth status rules dari `/api/master-data/growth-status-rules`.

### 5. Add Chart for Growth Measurements

Riwayat pengukuran masih berbentuk tabel. Untuk monitoring, chart lebih mudah dibaca.

Acceptance criteria:

- Chart berat badan dari waktu ke waktu.
- Chart tinggi badan dari waktu ke waktu.
- Empty state jika data belum cukup.

### 6. Add Automated Tests

Belum ada test suite.

Acceptance criteria:

- Test formatter `formatDecimal`.
- Test render landing page.
- Test render dashboard empty state.
- Test API error state.

## P2 - Nice To Have

### 7. Add Deployment Workflow

Belum ada CI/CD.

Acceptance criteria:

- GitHub Actions menjalankan lint dan build.
- Dokumentasi deployment Vercel/Netlify tersedia.

### 8. Add Mobile App Link Section

Landing page perlu area download app setelah mobile app tersedia.

Acceptance criteria:

- Section download app tersedia.
- CTA bisa dikonfigurasi.
- Link App Store/Play Store bisa disembunyikan jika belum tersedia.

## Suggested First GitHub Issues

Gunakan title berikut saat membuat issue di GitHub:

1. `Add authentication for admin dashboard`
2. `Split App.tsx into pages, components, and API modules`
3. `Add reminder creation form`
4. `Add master data views`
5. `Add growth measurement charts`
6. `Add automated tests for critical UI flows`
