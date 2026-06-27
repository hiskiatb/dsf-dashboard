import { DEFAULT_KPI } from "./kpiConfig";

export const CSV_PATH = "/DSF_202602.csv";

// Legacy fallback constants (dipakai hanya jika config tidak tersedia).
// Nilai KPI sebenarnya sekarang datang dari Supabase (kpi_settings) dan
// bisa diubah admin per bulan lewat panel KPI.
export const FWA_UNIT_VALUE = DEFAULT_KPI.fwa_unit_value;
export const REVENUE_TARGET = DEFAULT_KPI.revenue_target;

export function parseCSV(text) {
  const rows = [];
  let cur = "";
  let inQuotes = false;
  const row = [];

  function pushCell() {
    row.push(cur);
    cur = "";
  }

  function pushRow() {
    if (row.length === 1 && String(row[0] || "").trim() === "") {
      row.length = 0;
      return;
    }
    rows.push([...row]);
    row.length = 0;
  }

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && ch === ";") {
      pushCell();
      continue;
    }

    if (!inQuotes && ch === "\n") {
      pushCell();
      pushRow();
      continue;
    }

    if (!inQuotes && ch === "\r") continue;

    cur += ch;
  }

  pushCell();
  pushRow();

  if (rows.length === 0) return [];

  const headers = rows[0].map((h) => String(h || "").trim());
  const dataRows = rows.slice(1);

  return dataRows
    .filter((r) => r.some((x) => String(x || "").trim() !== ""))
    .map((r) => {
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = String(r[idx] ?? "").trim();
      });
      return obj;
    });
}

// Sembunyikan 5 digit di tengah MSISDN, mis. 081234567890 -> 081*****7890.
// Menampilkan 3 digit awal & sisanya di belakang; 5 digit tengah jadi *****.
export function maskMsisdn(value) {
  const s = String(value ?? "").trim();
  if (s.length <= 6) return s; // terlalu pendek untuk di-mask
  const start = Math.floor((s.length - 5) / 2);
  return s.slice(0, start) + "*****" + s.slice(start + 5);
}

export function toNumberSafe(v) {
  if (v === null || v === undefined) return 0;
  const s = String(v)
    .replaceAll("Rp", "")
    .replaceAll("IDR", "")
    .replaceAll(".", "")
    .replaceAll(",", "")
    .trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export function formatIDR(n) {
  try {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `Rp ${Math.round(n).toLocaleString("id-ID")}`;
  }
}

export function clamp(n, min = 0, max = 1) {
  return Math.max(min, Math.min(max, n));
}


// Nilai placeholder/sampah yang TIDAK boleh dipakai sebagai id.
const ID_JUNK = new Set(["", "#N/A", "#REF!", "0", "-", "VACANT", "NULL", "NA"]);
function pickId(...vals) {
  for (const v of vals) {
    const s = String(v ?? "").trim();
    if (!ID_JUNK.has(s.toUpperCase())) return s;
  }
  return "";
}

export function mapRowToDSF(row, index) {
  const brand = row.BRAND || "-";
  // Sejak Juni 2026: kolom ID_DSF dipecah jadi ID_DSF_IM3 & ID_DSF_3ID, dan
  // muncul brand HYBRID. Kolom id bisa berisi sampah (#N/A / 0 / VACANT).
  // Ambil id asli pertama: brand-spesifik dulu (cocok utk join FWA), lalu
  // ID_STAFFINC sebagai cadangan unik per orang.
  const realId = pickId(row.ID_DSF, row.ID_DSF_IM3, row.ID_DSF_3ID, row.ID_STAFFINC);
  const rawNama = String(row.NAMA_DSF ?? "").trim();
  const isVacant = rawNama.toUpperCase() === "VACANT";
  // Slot kosong (VACANT / tanpa id asli) TETAP DIHITUNG: diberi id sintetis
  // unik per baris agar tidak bentrok antar-slot dan tetap masuk ke total.
  const idDsf = realId && !isVacant ? realId : `VACANT-${index ?? 0}`;
  const namaDsf = realId && !isVacant ? rawNama || "-" : rawNama || "VACANT";
  const mc = row.MC || "-";
  const branch = row.BRANCH || "-";
  const region = row.REGION || "-";
  const idTl = row.ID_TL || "";
  const namaTl = row.NAMA_TL || "-";
  const targetFwa = toNumberSafe(row.TARGET_FWA || 0);
  const fwaUnits = toNumberSafe(row.TOTAL_FWA || 0);
  const rebuyRevenue = toNumberSafe(row.REV_REBUY || 0);
  const actualHajj = toNumberSafe(row.ACTUAL_HAJJ || 0);
  const revHajj = toNumberSafe(row.REV_HAJJ || 0);
  // Revenue FWA langsung dari CSV (sudah memperhitungkan FWA 5G @Rp1,75jt).
  // Dipakai sebagai sumber kebenaran; fallback ke fwaUnits*nilai bila kosong.
  const revFwa = toNumberSafe(row.REV_FWA || 0);
  const totalRevenueCsv = toNumberSafe(row.TOTAL_REVENUE || 0);
  const dataFwaIM3 = row.DATA_FWA_IM3 || "";
  const dataFwa3ID = row.DATA_FWA_3ID || "";
  const dataRebuyIM3 = row.DATA_REBUY_IM3 || "";
  const dataRebuy3ID = row.DATA_REBUY_3ID || "";


  return {
    brand,
    idDsf: String(idDsf).trim(),
    namaDsf,
    mc,
    branch,
    region,
    idTl: String(idTl).trim(),
    namaTl,
    fwaUnits,
    rebuyRevenue,
    actualHajj,
    revHajj,
    revFwa,
    totalRevenueCsv,
    targetFwa,
    dataFwaIM3,
    dataFwa3ID,
    dataRebuyIM3,
    dataRebuy3ID,
  };
}

export function extractDataBasedOn(text) {
  const firstLine = text.split("\n")[0] || "";
  const parts = firstLine.split(";");
  return parts[1]?.trim() || "";
}

// ============================================================
// PERHITUNGAN INSENTIF (config-driven)
// ------------------------------------------------------------
// Parameter ke-2 sekarang adalah objek `kpi` (config bulan tsb),
// bukan lagi string month. KPI tidak hardcode: target FWA, nilai
// FWA, target revenue, toggle Hajj, dan tier insentif semuanya
// diambil dari config Supabase (lihat kpiConfig.js / KpiContext).
//
// Model tier: array { fwa_pct, rev_pct, incentive } dievaluasi
// dari atas ke bawah, tier pertama yang terpenuhi menang.
//   fwa_pct = fraksi target_fwa yang wajib dicapai
//   rev_pct = fraksi revenue_target yang wajib dicapai
// ============================================================

function resolveKpi(kpi) {
  return kpi && typeof kpi === "object" ? kpi : DEFAULT_KPI;
}

function tiersSortedDesc(cfg) {
  return [...(cfg.tiers || [])].sort(
    (a, b) => (b.incentive || 0) - (a.incentive || 0)
  );
}

export function hitungInsentif(dsf, kpi) {
  const cfg = resolveKpi(kpi);
  const targetFwa = dsf.targetFwa ?? cfg.target_fwa ?? 0;
  const revenueTarget = cfg.revenue_target || 0;
  const fwaUnitValue = cfg.fwa_unit_value || 0;

  // Utamakan REV_FWA dari CSV (akurat utk FWA 5G); fallback hitung flat.
  const fwaRevenue =
    dsf.revFwa && dsf.revFwa > 0 ? dsf.revFwa : dsf.fwaUnits * fwaUnitValue;
  const hajj = cfg.include_hajj ? dsf.revHajj || 0 : 0;
  const totalRevenue = fwaRevenue + dsf.rebuyRevenue + hajj;

  let incentive = 0;
  for (const tier of tiersSortedDesc(cfg)) {
    const fwaNeeded = targetFwa * (tier.fwa_pct ?? 1);
    const revNeeded = revenueTarget * (tier.rev_pct ?? 1);
    if (dsf.fwaUnits >= fwaNeeded && totalRevenue >= revNeeded) {
      incentive = tier.incentive || 0;
      break;
    }
  }

  const remainingRevenue = Math.max(0, revenueTarget - totalRevenue);
  const revenueProgress = revenueTarget > 0 ? totalRevenue / revenueTarget : 0;

  return {
    fwaRevenue,
    totalRevenue,
    incentive,
    remainingRevenue,
    fwaProgress: targetFwa > 0 ? dsf.fwaUnits / targetFwa : 0,
    revenueProgress,
  };
}

export function isEligible(dsf, kpi) {
  return hitungInsentif(dsf, kpi).incentive > 0;
}

export function buildTips(dsf, kpi) {
  const cfg = resolveKpi(kpi);
  const targetFwa = dsf.targetFwa ?? cfg.target_fwa ?? 0;
  const revenueTarget = cfg.revenue_target || 0;
  const fwaUnitValue = cfg.fwa_unit_value || 0;

  const fwaNow = dsf.fwaUnits;
  const rebuyNow = dsf.rebuyRevenue;
  const hajjNow = cfg.include_hajj ? dsf.revHajj || 0 : 0;
  const fwaRevNow =
    dsf.revFwa && dsf.revFwa > 0 ? dsf.revFwa : fwaNow * fwaUnitValue;
  const totalRevenueNow = fwaRevNow + rebuyNow + hajjNow;
  const percent = revenueTarget > 0 ? totalRevenueNow / revenueTarget : 0;

  const tips = [];
  tips.push({
    done: false,
    text: `Revenue saat ini ${formatIDR(totalRevenueNow)} (${Math.round(
      percent * 100
    )}%). FWA Units: ${fwaNow}/${targetFwa}.`,
  });

  const calc = hitungInsentif(dsf, cfg);
  const tiers = tiersSortedDesc(cfg);

  if (calc.incentive > 0) {
    tips.push({
      done: true,
      text: `🎉 Saat ini berhak atas insentif ${formatIDR(calc.incentive)}.`,
    });
  }

  // Saran untuk naik ke tier yang lebih tinggi yang belum tercapai.
  for (const tier of tiers) {
    if ((tier.incentive || 0) <= calc.incentive) continue;
    const fwaNeeded = Math.ceil(targetFwa * (tier.fwa_pct ?? 1));
    const revNeeded = revenueTarget * (tier.rev_pct ?? 1);
    const needFwa = Math.max(0, fwaNeeded - fwaNow);
    const needRev = Math.max(0, revNeeded - totalRevenueNow);

    const parts = [];
    if (needFwa > 0) parts.push(`tambah ${needFwa} unit FWA (jadi ${fwaNeeded})`);
    if (needRev > 0) parts.push(`tambah revenue ${formatIDR(needRev)}`);
    if (parts.length === 0) continue;

    tips.push({
      done: false,
      text: `Untuk insentif ${formatIDR(tier.incentive)}: ${parts.join(
        " dan "
      )}.`,
    });
  }

  // Kalau belum dapat insentif sama sekali, tegaskan syarat FWA minimum.
  if (calc.incentive === 0 && tiers.length) {
    const lowest = tiers[tiers.length - 1];
    const fwaNeeded = Math.ceil(targetFwa * (lowest.fwa_pct ?? 1));
    if (fwaNow < fwaNeeded) {
      tips.push({
        done: false,
        text: `⚠️ FWA wajib minimal ${fwaNeeded} unit (kurang ${
          fwaNeeded - fwaNow
        }) agar insentif cair.`,
      });
    }
  }

  return tips;
}