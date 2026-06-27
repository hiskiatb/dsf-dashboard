// ============================================================
// AKSES DATA SUPABASE (REST / PostgREST), tanpa SDK.
// ------------------------------------------------------------
// - Baca DSF agregat (dsf_monthly) -> anon boleh.
// - Baca daftar MSISDN: admin (token) baca base 'fwa_records' (penuh),
//   non-admin baca view 'v_fwa_records' (ter-mask server).
// - Upload bulan: hapus data lama lalu insert batch (perlu token admin).
// ============================================================

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./kpiConfig";
import { getAccessToken } from "./supabaseAuth";

const REST = `${SUPABASE_URL}/rest/v1`;

function headers(extra = {}) {
  const token = getAccessToken();
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

const numOr0 = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// dsf_monthly (DB) -> bentuk DSF yang dipakai app (sama spt mapRowToDSF)
function mapDbToDSF(r) {
  return {
    brand: r.brand || "-",
    idDsf: String(r.id_dsf || "").trim(),
    namaDsf: r.nama_dsf || "-",
    mc: r.mc || "-",
    branch: r.branch || "-",
    region: r.region || "-",
    idTl: String(r.id_tl || "").trim(),
    namaTl: r.nama_tl || "-",
    fwaUnits: numOr0(r.total_fwa),
    rebuyRevenue: numOr0(r.rev_rebuy),
    actualHajj: numOr0(r.actual_hajj),
    revHajj: numOr0(r.rev_hajj),
    revFwa: numOr0(r.rev_fwa),
    totalRevenueCsv: numOr0(r.total_revenue),
    targetFwa: numOr0(r.target_fwa),
    dataFwaIM3: r.data_fwa_im3 || "",
    dataFwa3ID: r.data_fwa_3id || "",
    dataRebuyIM3: r.data_rebuy_im3 || "",
    dataRebuy3ID: r.data_rebuy_3id || "",
  };
}

// Ambil semua DSF satu bulan. Mengembalikan { rows, dates } atau null bila kosong.
export async function fetchDsfMonth(month) {
  try {
    const res = await fetch(
      `${REST}/dsf_monthly?month=eq.${encodeURIComponent(month)}&limit=5000`,
      { headers: headers(), cache: "no-store" }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const rows = data.map(mapDbToDSF).filter((x) => x.idDsf);
    const f = data[0] || {};
    const dates = {
      DATA_FWA_IM3: f.data_fwa_im3 || "",
      DATA_FWA_3ID: f.data_fwa_3id || "",
      DATA_REBUY_IM3: f.data_rebuy_im3 || "",
      DATA_REBUY_3ID: f.data_rebuy_3id || "",
    };
    return { rows, dates };
  } catch (e) {
    console.warn("fetchDsfMonth gagal:", e?.message);
    return null;
  }
}

// Ambil daftar MSISDN untuk 1 DSF (kind 'fwa' | 'adj').
// Admin -> base (penuh); non-admin -> view ter-mask.
// Mengembalikan baris berkunci UPPERCASE spt CSV (MSISDN, GA_DATE, ...).
export async function fetchFwaForDsf(month, idDsf, kind) {
  const table = getAccessToken() ? "fwa_records" : "v_fwa_records";
  try {
    const url =
      `${REST}/${table}?month=eq.${encodeURIComponent(month)}` +
      `&id_dsf=eq.${encodeURIComponent(idDsf)}` +
      `&kind=eq.${encodeURIComponent(kind)}&limit=5000`;
    const res = await fetch(url, { headers: headers(), cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.map((r) => ({
      MSISDN: r.msisdn,
      GA_DATE: r.ga_date,
      ID_DSF: r.id_dsf,
      DEVICE: r.device,
      VALID_FLAG: r.valid_flag,
      REMARKS: r.remarks,
    }));
  } catch (e) {
    console.warn("fetchFwaForDsf gagal:", e?.message);
    return null; // null = biar pemanggil fallback ke CSV
  }
}

// Cek apakah sebuah bulan sudah ada datanya di Supabase.
export async function monthHasData(month) {
  try {
    const res = await fetch(
      `${REST}/dsf_monthly?month=eq.${encodeURIComponent(month)}&select=month&limit=1`,
      { headers: headers(), cache: "no-store" }
    );
    if (!res.ok) return false;
    const data = await res.json();
    return Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}

// ---------- MANPOWER (headcount per region) ----------

// Ambil manpower 1 bulan -> { byCode: {NSA:70,...}, rows: [...] }
export async function fetchManpower(month) {
  try {
    const q = month ? `&month=eq.${encodeURIComponent(month)}` : "";
    const res = await fetch(`${REST}/manpower?order=region_code${q}`, {
      headers: headers(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = await res.json();
    const byCode = {};
    rows.forEach((r) => {
      byCode[r.region_code] = Number(r.manpower) || 0;
    });
    return { byCode, rows };
  } catch (e) {
    console.warn("fetchManpower gagal:", e?.message);
    return { byCode: {}, rows: [] };
  }
}

// Simpan 1 region untuk 1 bulan (perlu admin login).
export async function saveManpower(month, region_code, region_name, manpower) {
  if (!getAccessToken()) throw new Error("Harus login admin untuk ubah manpower.");
  const res = await fetch(`${REST}/manpower?on_conflict=month,region_code`, {
    method: "POST",
    headers: headers({ Prefer: "resolution=merge-duplicates,return=representation" }),
    body: JSON.stringify({
      month,
      region_code,
      region_name: region_name || region_code,
      manpower: Number(manpower) || 0,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gagal simpan manpower (HTTP ${res.status}): ${t.slice(0, 160)}`);
  }
  return true;
}

// ---------- UPLOAD (perlu token admin) ----------

async function deleteByMonth(table, month) {
  const res = await fetch(
    `${REST}/${table}?month=eq.${encodeURIComponent(month)}`,
    { method: "DELETE", headers: headers({ Prefer: "return=minimal" }) }
  );
  if (!res.ok && res.status !== 404) {
    throw new Error(`Gagal hapus ${table} (HTTP ${res.status})`);
  }
}

async function insertBatched(table, rows, onProgress, conflictCols) {
  const BATCH = 500;
  let done = 0;
  const url = conflictCols
    ? `${REST}/${table}?on_conflict=${conflictCols}`
    : `${REST}/${table}`;
  const prefer = conflictCols
    ? "return=minimal,resolution=merge-duplicates"
    : "return=minimal";
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const res = await fetch(url, {
      method: "POST",
      headers: headers({ Prefer: prefer }),
      body: JSON.stringify(chunk),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Insert ${table} gagal (HTTP ${res.status}): ${t.slice(0, 200)}`);
    }
    done += chunk.length;
    onProgress?.(done, rows.length);
  }
}

// Simpan data 1 bulan: hapus lama, insert baru. dsfRows = hasil mapRowToDSF.
export async function uploadMonth({ month, dsfRows, fwaRows, adjRows, onProgress }) {
  if (!getAccessToken()) throw new Error("Harus login admin untuk upload.");

  // Gabungkan baris ber-id_dsf sama (mis. slot "VACANT" muncul berkali-kali):
  // jumlahkan angka, simpan teks dari baris pertama. Mencegah duplikat PK
  // sekaligus mempertahankan total (sama spt agregasi di leaderboard).
  const aggMap = new Map();
  for (const d of dsfRows) {
    const k = d.idDsf;
    if (!aggMap.has(k)) {
      aggMap.set(k, { ...d });
    } else {
      const e = aggMap.get(k);
      e.targetFwa = (e.targetFwa || 0) + (d.targetFwa || 0);
      e.fwaUnits = (e.fwaUnits || 0) + (d.fwaUnits || 0);
      e.revFwa = (e.revFwa || 0) + (d.revFwa || 0);
      e.rebuyRevenue = (e.rebuyRevenue || 0) + (d.rebuyRevenue || 0);
      e.actualHajj = (e.actualHajj || 0) + (d.actualHajj || 0);
      e.revHajj = (e.revHajj || 0) + (d.revHajj || 0);
      e.totalRevenueCsv = (e.totalRevenueCsv || 0) + (d.totalRevenueCsv || 0);
    }
  }
  const dsfAgg = [...aggMap.values()];

  // 1) DSF agregat
  const dsfPayload = dsfAgg.map((d) => ({
    month,
    id_dsf: d.idDsf,
    brand: d.brand,
    nama_dsf: d.namaDsf,
    mc: d.mc,
    branch: d.branch,
    region: d.region,
    id_tl: d.idTl,
    nama_tl: d.namaTl,
    target_fwa: d.targetFwa || 0,
    total_fwa: d.fwaUnits || 0,
    rev_fwa: d.revFwa || 0,
    rev_rebuy: d.rebuyRevenue || 0,
    actual_hajj: d.actualHajj || 0,
    rev_hajj: d.revHajj || 0,
    total_revenue: d.totalRevenueCsv || 0,
    data_fwa_im3: d.dataFwaIM3 || "",
    data_fwa_3id: d.dataFwa3ID || "",
    data_rebuy_im3: d.dataRebuyIM3 || "",
    data_rebuy_3id: d.dataRebuy3ID || "",
  }));

  const toFwaRow = (r, kind) => ({
    month,
    kind,
    msisdn: String(r.MSISDN ?? "").trim(),
    ga_date: String(r.GA_DATE ?? "").trim(),
    id_dsf: String(r.ID_DSF ?? "").trim(),
    device: String(r.DEVICE ?? "").trim(),
    valid_flag: String(r.VALID_FLAG ?? "").trim(),
    remarks: String(r.REMARKS ?? "").trim(),
  });

  const fwaPayload = (fwaRows || []).map((r) => toFwaRow(r, "fwa"));
  const adjPayload = (adjRows || []).map((r) => toFwaRow(r, "adj"));

  onProgress?.({ phase: "hapus", done: 0, total: 0 });
  await deleteByMonth("dsf_monthly", month);
  await deleteByMonth("fwa_records", month);

  onProgress?.({ phase: "dsf", done: 0, total: dsfPayload.length });
  await insertBatched(
    "dsf_monthly",
    dsfPayload,
    (d, t) => onProgress?.({ phase: "dsf", done: d, total: t }),
    "month,id_dsf"
  );

  const allFwa = [...fwaPayload, ...adjPayload];
  onProgress?.({ phase: "msisdn", done: 0, total: allFwa.length });
  await insertBatched("fwa_records", allFwa, (d, t) =>
    onProgress?.({ phase: "msisdn", done: d, total: t })
  );

  return {
    dsf: dsfPayload.length,
    fwa: fwaPayload.length,
    adj: adjPayload.length,
  };
}
