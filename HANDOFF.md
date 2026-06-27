# DSF Dashboard — Handoff / Lanjutan Pekerjaan

Dokumen ini merangkum kondisi proyek `dsf-dashboard` agar bisa dilanjutkan di sesi baru.
Tempel isi bagian "PROMPT LANJUTAN" ke chat baru untuk meneruskan.

---

## Konteks proyek
- React + Vite + Tailwind. Palette Indosat (magenta/teal/yellow/red/charcoal), font Plus Jakarta Sans.
- Data sumber: CSV di `/public` (`DSF_YYYYMM.csv`, `FWA_YYYYMM.csv`, `ADJ_FWA_YYYYMM.csv`). Bulan tersedia: 202602–202606.
- **Build tidak bisa jalan di sandbox** (arsitektur beda) — verifikasi pakai `npx eslint`; build/dev jalan di komputer user.
- **Sandbox tidak bisa menjangkau Supabase** (DNS diblok). Operasi Supabase via MCP atau dari browser user.

## Supabase
- Project: **dsf-dashboard**, id `tjoeroukiwapqdgcoibg`, URL `https://tjoeroukiwapqdgcoibg.supabase.co`.
- anon key tersimpan di `src/kpiConfig.js`.
- Tabel & objek:
  - `kpi_settings` — KPI per bulan (admin-editable). Sudah di-seed 202602–202606. Juni = skema March.
  - `dsf_monthly` — agregat DSF per bulan (tanpa PII). RLS: anon boleh SELECT/INSERT/UPDATE/DELETE (posisi "fully open").
  - `fwa_records` — daftar MSISDN (kind 'fwa'|'adj'). RLS: anon HANYA insert/delete (TIDAK boleh SELECT base). `authenticated` boleh SELECT penuh.
  - `v_fwa_records` — view ter-mask (MSISDN 5 digit tengah disembunyikan). anon & authenticated boleh SELECT.
  - `mask_msisdn(text)` — fungsi masking di server.
- **Terverifikasi:** anon ditolak baca base `fwa_records`; anon hanya dapat MSISDN ter-mask via view; authenticated (admin login) dapat MSISDN penuh.

## Model keamanan yang disepakati
- DSF/TL **tanpa login**; data bisnis (nama/ranking) boleh terbuka.
- **MSISDN wajib aman tanpa login** (hanya ter-mask), dan **admin yang login melihat MSISDN penuh**.
- Admin login = Supabase Auth (role authenticated). Belum ada akun admin dibuat.

---

## SUDAH SELESAI (sesi ini)
1. KPI tidak hardcode — config per bulan di `kpi_settings`; `utils.js` (hitungInsentif/buildTips) + komponen baca dari `KpiContext`. Panel admin KPI (`AdminKpiPanel.jsx`) — gate password statis `spmsumatera2026` di `kpiConfig.js` (ADMIN_PASSWORD).
2. Redesign Leaderboard (`RankingDashboard.jsx`): summary bar (ikut filter), subtotal per grup (Region/Branch/MC/TL), tabel kolom-prioritas mobile, sort termasuk Insentif.
3. Redesign header/hero di `App.jsx`.
4. Masking MSISDN di tampilan — `maskMsisdn()` di `utils.js` (idempotent: mem-mask string yang sudah ter-mask aman). Dipakai di tabel DSFCard.
5. Hapus fitur GSE & banding MSISDN (file `GSECard.jsx`, `MSISDNCompareCard.jsx` dihapus; referensi di App.jsx dibersihkan).
6. Bulan Juni (202606): didaftarkan di `MONTH_FILES` + jadi default. **Format CSV Juni beda** (kolom `ID_DSF` dipecah jadi `ID_DSF_IM3`/`ID_DSF_3ID`, header multi-baris ber-kutip, tanpa kolom HAJJ). `mapRowToDSF` sudah fallback ambil id brand-spesifik; ekstraksi tanggal pakai hasil `parseCSV` (bukan split manual).
7. TL Dashboard: kolom **Insentif per DSF**.
8. Revenue pakai angka CSV: `mapRowToDSF` simpan `revFwa` (REV_FWA) & `totalRevenueCsv` (TOTAL_REVENUE); `hitungInsentif`/`buildTips`/RankingDashboard/TLDashboard pakai `revFwa` (akurat FWA 5G), fallback hitung flat 350rb. Regresi Juni: insentif tidak berubah, totalRevenue cocok CSV.
9. Loading skeleton + error/empty state + cek `res.ok` di `App.jsx`.
10. Validasi format CSV bulan (pesan jelas bila kolom ID_DSF/TARGET_FWA hilang / tak ada DSF terbaca).
11. Fondasi Supabase aman: tabel `dsf_monthly`, `fwa_records`, view `v_fwa_records`, fungsi `mask_msisdn`, RLS — semua dibuat & diuji.
12. Modul baru dibuat: `src/supabaseAuth.js` (login gotrue REST), `src/supabaseData.js` (baca DSF & MSISDN, upload batch, hapus bulan).

## BELUM SELESAI (lanjutkan dari sini)
A. **Buat akun admin** di Supabase Auth (email/password). Bisa via Dashboard (Authentication → Add user) atau MCP. Saran email: hiskia.sinaga@ioh.co.id.
B. **Ubah `AdminKpiPanel.jsx`**: ganti gate password statis → login Supabase (`signIn` dari `supabaseAuth.js`). Tambah tab/section **"Upload Data Bulan"**: pilih bulan + 3 file CSV (DSF/FWA/ADJ), parse di browser (`parseCSV` + `mapRowToDSF` untuk DSF; FWA/ADJ pakai parseCSV apa adanya), panggil `uploadMonth()` dari `supabaseData.js`, tampilkan progress. Tampilkan status login + tombol logout.
C. **`App.jsx` baca DSF dari Supabase**: pada load, panggil `fetchDsfMonth(month)`; jika ada → pakai itu (rows + dates); jika null → fallback ke CSV (kode sekarang). Teruskan `isAdmin` (dari `supabaseAuth.isAdmin()`/state) ke DSFCard.
D. **`DSFCard.jsx` baca MSISDN dari Supabase**: saat `dsf` berubah, `fetchFwaForDsf(month, dsf.idDsf, 'fwa'|'adj')`. Admin → base (penuh); non-admin → view ter-mask. Jika hasil null → fallback ke props `fwaData/adjData` (CSV). Tampilan: full bila `isAdmin`, selain itu `maskMsisdn()` (idempotent, aman walau sudah ter-mask). Perlu prop `month` & `isAdmin`.
E. **Migrasi data**: dari browser user (yang bisa akses Supabase), upload tiap bulan (202602–202606) lewat fitur upload baru. FWA ~54rb baris/bulan → insert batch 500 (sudah ada di `uploadMonth`).
F. **Hapus CSV dari `/public`** setelah semua bulan termigrasi (agar MSISDN penuh tak bisa diunduh via URL). Sisakan hanya bila masih perlu fallback.

## Catatan teknis
- Lint pre-existing yang BUKAN error baru (abaikan): `motion`/`loading` "unused" (false-positive React Compiler), `no-unsafe-finally` di App.jsx, beberapa unused refs di DSFCard. RankingDashboard & file baru harus bersih.
- `mapRowToDSF` ada di `src/utils.js` — pakai ini juga saat parse upload agar bentuk konsisten.
- `fetchFwaForDsf` mengembalikan baris berkunci UPPERCASE (MSISDN, GA_DATE, ID_DSF, DEVICE, VALID_FLAG, REMARKS) supaya cocok dengan logika DSFCard yang ada.
- PostgREST default limit 1000; helper sudah pakai `limit=5000`. Per-DSF MSISDN biasanya kecil.

---

## PROMPT LANJUTAN (tempel ke chat baru)
> Lanjutkan proyek React/Vite `dsf-dashboard`. Baca `HANDOFF.md` di root untuk konteks. Supabase project id `tjoeroukiwapqdgcoibg`. Fondasi sudah jadi: tabel `dsf_monthly`, `fwa_records` (anon tak boleh SELECT base), view ter-mask `v_fwa_records`, fungsi `mask_msisdn`, dan modul `src/supabaseAuth.js` + `src/supabaseData.js`. 
> Tugas yang harus diselesaikan, berurutan: (A) buat akun admin Supabase Auth; (B) ubah `AdminKpiPanel.jsx` jadi login Supabase + tambah fitur upload data bulan (pakai `uploadMonth`); (C) `App.jsx` baca DSF via `fetchDsfMonth` dengan fallback CSV, teruskan `isAdmin` ke DSFCard; (D) `DSFCard.jsx` ambil MSISDN via `fetchFwaForDsf` (penuh bila admin, ter-mask bila tidak), fallback CSV; (E) migrasi data 202602–202606 lewat upload dari browser; (F) hapus CSV `/public` setelah migrasi. Verifikasi dengan `npx eslint` (sandbox tak bisa build/jangkau Supabase). Tujuan: tanpa login MSISDN selalu aman/ter-mask, admin login lihat MSISDN penuh.
