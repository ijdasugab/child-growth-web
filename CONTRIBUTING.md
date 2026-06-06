# Contributing

Panduan kontribusi untuk Child Growth Web.

## Development Flow

1. Buat branch baru dari `main`.
2. Jalankan project lokal.
3. Lakukan perubahan kecil dan terarah.
4. Jalankan validasi.
5. Buat pull request.

## Branch Naming

Gunakan nama branch yang menjelaskan tujuan perubahan:

```text
feature/add-reminder-form
fix/api-error-state
docs/update-maintenance-guide
codex/add-contributing-doc
```

## Local Validation

Sebelum push, jalankan:

```bash
npm run lint
npm run build
```

Pull request sebaiknya tidak dibuat jika salah satu command gagal.

## Pull Request Checklist

PR harus menyertakan:

- Ringkasan perubahan
- Cara validasi
- Screenshot untuk perubahan UI
- Catatan limitation atau follow-up

## Code Guidelines

- Gunakan TypeScript untuk type safety.
- Hindari hardcode URL API. Gunakan `VITE_API_BASE_URL`.
- Jaga styling tema melalui CSS variables.
- Pecah file besar menjadi komponen kecil saat fitur bertambah.
- Jangan commit `.env`, `node_modules`, atau `dist`.

## Issue Workflow

Gunakan `ISSUE.md` sebagai backlog awal. Jika issue sudah dibuat di GitHub, update statusnya melalui komentar atau close issue setelah PR selesai di-merge.
