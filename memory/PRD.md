# Mulya Salon POS - PRD

## Original Problem Statement
Aplikasi web POS modern untuk Salon & Barbershop "Mulya Salon" dengan tema hitam-putih-emas, sidebar navigation, multi-role (Owner/Admin/Kasir/Stylist), dark/light mode, mobile-friendly.

## User Personas
- **Owner**: Akses penuh, dashboard analytics + komisi
- **Admin**: Mengelola operasional (CRUD semua entitas)
- **Kasir**: Transaksi POS dan booking
- **Stylist**: Jadwal dan performa

## Implementation Status

### ✅ Phase 1 - MVP (Completed: 2026-02-06)
- Authentication (JWT) dengan seeded users (Owner/Admin/Kasir)
- Dashboard dengan 4 KPI cards + revenue chart + recent bookings/transactions
- Kasir (POS) - transaksi dengan layanan + produk
- CRUD: Pelanggan, Stylist, Layanan, Produk, Booking
- Inventori monitoring (stok rendah, habis, nilai)
- Laporan transaksi dengan filter periode
- Pengaturan bisnis
- Dark/Light mode toggle
- Role-based menu access
- Search & filter di semua tabel
- Mobile responsive (sidebar collapse)

### ✅ Phase 2 - Kasir Improvements (Completed: 2026-02-06)
- Stylist selection wajib di kasir
- Auto-calculate komisi stylist (commission_rate × total layanan)
- Hapus pajak dari kasir
- Field Uang Dibayar & Kembalian (Tunai only)
- Auto-generate invoice number (INV-XXXX)
- Struk lengkap dengan invoice, customer, stylist, payment details
- Dashboard Owner widgets: Pendapatan Hari Ini, Total Komisi Hari Ini, Top Stylist Bulan Ini
- Laporan Komisi Stylist tab

## Tech Stack
- **Frontend**: React 19, Tailwind, Shadcn/UI, Recharts, Sonner, Lucide Icons
- **Backend**: FastAPI, MongoDB (Motor), JWT auth, bcrypt
- **Fonts**: Outfit (heading), Manrope (body)

## P0/P1 Remaining Features
- P1: Export PDF/Excel untuk laporan (saat ini placeholder)
- P1: Kalender view untuk booking
- P1: Kategori layanan/produk (saat ini text input bebas)
- P2: Multi-cabang (SaaS expansion)
- P2: Notifikasi WhatsApp/SMS booking confirmation
- P2: Inventori stok in/out tracking dengan log
- P2: Performa stylist detail (rating, services breakdown)

## Test Credentials
See /app/memory/test_credentials.md
