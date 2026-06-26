// ============================================================
// KPI CONFIG (Supabase-backed, admin-editable per month)
// ------------------------------------------------------------
// KPI tidak lagi hardcode. Tiap bulan punya konfigurasi sendiri
// yang tersimpan di tabel `kpi_settings` di Supabase dan bisa
// diubah admin lewat panel KPI (lihat AdminKpiPanel.jsx).
//
// Akses ke Supabase memakai REST API (PostgREST) langsung lewat
// fetch, jadi tidak perlu dependency tambahan.
// ============================================================

export const SUPABASE_URL = "https://tjoeroukiwapqdgcoibg.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqb2Vyb3VraXdhcHFkZ2NvaWJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMDEzODQsImV4cCI6MjA5Nzg3NzM4NH0.U88fEUsaSLtK6W1hCPs0j9FguiUGiaes-EnQ9ySgXM4";

// Password panel admin (gate sederhana di sisi frontend).
// Ganti nilai ini untuk mengubah password admin.
export const ADMIN_PASSWORD = "spmsumatera2026";

const REST = `${SUPABASE_URL}/rest/v1/kpi_settings`;

const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
};

// Default dipakai kalau bulan belum ada di Supabase / koneksi gagal.
// Ini = "skema March" (20 FWA -> 500K, 15 FWA -> 200K, target 7.5jt).
export const DEFAULT_KPI = {
  month: "",
  label: "",
  target_fwa: 20,
  fwa_unit_value: 350_000,
  fwa_5g_unit_value: 1_750_000,
  revenue_target: 7_500_000,
  include_hajj: false,
  tiers: [
    { fwa_pct: 1.0, rev_pct: 1.0, incentive: 500_000 },
    { fwa_pct: 0.75, rev_pct: 1.0, incentive: 200_000 },
  ],
};

function normalize(row, month) {
  if (!row) return { ...DEFAULT_KPI, month };
  return {
    month: row.month ?? month,
    label: row.label ?? "",
    target_fwa: Number(row.target_fwa ?? DEFAULT_KPI.target_fwa),
    fwa_unit_value: Number(row.fwa_unit_value ?? DEFAULT_KPI.fwa_unit_value),
    fwa_5g_unit_value: Number(
      row.fwa_5g_unit_value ?? DEFAULT_KPI.fwa_5g_unit_value
    ),
    revenue_target: Number(row.revenue_target ?? DEFAULT_KPI.revenue_target),
    include_hajj: Boolean(row.include_hajj ?? DEFAULT_KPI.include_hajj),
    tiers:
      Array.isArray(row.tiers) && row.tiers.length
        ? row.tiers
        : DEFAULT_KPI.tiers,
  };
}

// Ambil config 1 bulan. Selalu mengembalikan objek valid (fallback default).
export async function fetchKpiConfig(month) {
  try {
    const res = await fetch(
      `${REST}?month=eq.${encodeURIComponent(month)}&limit=1`,
      { headers, cache: "no-store" }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = await res.json();
    return normalize(rows[0], month);
  } catch (e) {
    console.warn("fetchKpiConfig fallback ke default:", e?.message);
    return { ...DEFAULT_KPI, month };
  }
}

// Ambil semua config (untuk panel admin).
export async function fetchAllKpiConfigs() {
  try {
    const res = await fetch(`${REST}?order=month.desc`, {
      headers,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = await res.json();
    return rows.map((r) => normalize(r, r.month));
  } catch (e) {
    console.warn("fetchAllKpiConfigs gagal:", e?.message);
    return [];
  }
}

// Simpan (upsert) config 1 bulan. Dipakai panel admin.
export async function saveKpiConfig(config) {
  const payload = {
    month: config.month,
    label: config.label || "",
    target_fwa: Number(config.target_fwa) || 0,
    fwa_unit_value: Number(config.fwa_unit_value) || 0,
    fwa_5g_unit_value: Number(config.fwa_5g_unit_value) || 0,
    revenue_target: Number(config.revenue_target) || 0,
    include_hajj: Boolean(config.include_hajj),
    tiers: config.tiers,
    updated_by: "admin-panel",
  };

  const res = await fetch(`${REST}?on_conflict=month`, {
    method: "POST",
    headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Gagal menyimpan (HTTP ${res.status}): ${txt}`);
  }
  const rows = await res.json();
  return normalize(rows[0], config.month);
}
