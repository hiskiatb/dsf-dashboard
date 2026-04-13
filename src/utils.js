export const CSV_PATH = "/DSF_202602.csv";

export const FWA_UNIT_VALUE = 350_000;
export const REVENUE_TARGET = 7_500_000;

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


export function mapRowToDSF(row) {
  const brand = row.BRAND || "-";
  const idDsf = row.ID_DSF || "";
  const namaDsf = row.NAMA_DSF || "-";
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


export function hitungInsentif(dsf) {

    const targetFwa = dsf.targetFwa ?? 0; // ✅ PINDAH KE ATAS

  const fwaRevenue = dsf.fwaUnits * FWA_UNIT_VALUE;
const totalRevenue = fwaRevenue + dsf.rebuyRevenue + (dsf.revHajj || 0);

  let incentive = 0;

if (dsf.fwaUnits >= targetFwa && totalRevenue >= REVENUE_TARGET) {
  incentive = 500_000;
} else if (dsf.fwaUnits >= targetFwa * 0.75 && totalRevenue >= REVENUE_TARGET) {
  incentive = 200_000;
}

  const remainingRevenue = Math.max(0, REVENUE_TARGET - totalRevenue);

  // IMPORTANT:
  // progress ring boleh > 100% untuk perhitungan, tapi ringnya tetap penuh.
  
  
  const revenueProgress = totalRevenue / REVENUE_TARGET;

  return {
    fwaRevenue,
    totalRevenue,
    incentive,
    remainingRevenue,
fwaProgress: targetFwa > 0 ? dsf.fwaUnits / targetFwa : 0,
    revenueProgress,
  };
}

export function isEligible(dsf) {
  return hitungInsentif(dsf).incentive > 0;
}

export function buildTips(dsf, month) {
 
  const isNewScheme = month === "202604" || month === "202605";

if (isNewScheme) {
  const tips = [];

  const fwaNow = dsf.fwaUnits;
  const rebuyNow = Math.min(dsf.rebuyRevenue, 500_000);
  const hajjNow = dsf.revHajj || 0;

  const totalRevenueNow =
    fwaNow * FWA_UNIT_VALUE + rebuyNow + hajjNow;

  const percent = totalRevenueNow / REVENUE_TARGET;

  tips.push({
    done: false,
    text: `Revenue saat ini ${formatIDR(totalRevenueNow)} (${Math.round(percent * 100)}%).`,
  });

  // ✅ 120%
  if (percent >= 1.2) {
    tips.push({
      done: true,
      text: "🎉 Target 120% tercapai (insentif 500 ribu).",
    });
    return tips;
  }

  // ✅ 100%
  if (percent >= 1) {
    tips.push({
      done: true,
      text: "🎉 Target 100% tercapai (insentif 200 ribu).",
    });
  } else {
    const need = REVENUE_TARGET - totalRevenueNow;

    tips.push({
      done: false,
      text: `Butuh tambahan ${formatIDR(need)} untuk mencapai 100%.`,
    });
  }

  // ✅ menuju 120%
  const need120 = REVENUE_TARGET * 1.2 - totalRevenueNow;

  if (need120 > 0) {
    tips.push({
      done: false,
      text: `Untuk 500 ribu, tambah sekitar ${formatIDR(need120)} lagi.`,
    });
  }

  return tips;
}

  const tips = [];

  const fwaNow = dsf.fwaUnits;
  const rebuyNow = dsf.rebuyRevenue;

  const fwaRevenueNow = fwaNow * FWA_UNIT_VALUE;
const hajjNow = dsf.revHajj || 0;

const totalRevenueNow = fwaRevenueNow + rebuyNow + hajjNow;
  // ================================
  // TARGET DEFINITIONS
  // ================================
const TARGET_500_FWA = dsf.targetFwa ?? 0;
const TARGET_200_FWA = Math.floor((dsf.targetFwa ?? 0) * 0.75);

  // ================================
  // CURRENT STATUS
  // ================================

  tips.push({
    done: false,
    text: `Revenue saat ini ${formatIDR(totalRevenueNow)} dari ${fwaNow} FWA dan rebuy ${formatIDR(rebuyNow)}.`,
  });

  // ================================
  // CHECK 500K INCENTIVE
  // ================================

  if (fwaNow >= TARGET_500_FWA && totalRevenueNow >= REVENUE_TARGET) {

    tips.push({
      done: true,
      text: "🎉 Target insentif 500 ribu sudah tercapai.",
    });

    return tips;
  }

  // ================================
  // SIMULASI KE 20 FWA
  // ================================

  const needFwa20 = Math.max(0, TARGET_500_FWA - fwaNow);

  const revenueIf20 =
    TARGET_500_FWA * FWA_UNIT_VALUE + rebuyNow;

  const remainingIf20 =
    Math.max(0, REVENUE_TARGET - revenueIf20);

  if (needFwa20 > 0) {

    if (remainingIf20 === 0) {

      tips.push({
        done: false,
        text: `Untuk insentif 500 ribu cukup tambah ${needFwa20} FWA lagi sampai 20 FWA.`,
      });

    } else {

      tips.push({
        done: false,
        text: `Tambah ${needFwa20} FWA lagi sampai 20 FWA, lalu masih perlu rebuy sekitar ${formatIDR(remainingIf20)}.`,
      });

    }

  }

  // ================================
  // ALTERNATIVE TANPA REBUY
  // ================================

  const fwaPureTarget =
    Math.ceil(REVENUE_TARGET / FWA_UNIT_VALUE);

  const needFwaPure =
    Math.max(0, fwaPureTarget - fwaNow);

  if (needFwaPure > 0) {

    tips.push({
      done: false,
      text: `Alternatif tanpa rebuy: capai ${fwaPureTarget} FWA (tambah ${needFwaPure} FWA lagi).`,
    });

  }

  // ================================
  // TARGET 200K
  // ================================

  const needFwa15 =
    Math.max(0, TARGET_200_FWA - fwaNow);

  const revenueIf15 =
    TARGET_200_FWA * FWA_UNIT_VALUE + rebuyNow;

  const remainingIf15 =
    Math.max(0, REVENUE_TARGET - revenueIf15);

  if (fwaNow >= TARGET_200_FWA && totalRevenueNow >= REVENUE_TARGET) {

    tips.push({
      done: true,
      text: "Target insentif 200 ribu sudah tercapai.",
    });

  } else {

    if (needFwa15 > 0) {

      if (remainingIf15 === 0) {

        tips.push({
          done: false,
          text: `Untuk insentif 200 ribu cukup tambah ${needFwa15} FWA lagi sampai 15 FWA.`,
        });

      } else {

        tips.push({
          done: false,
          text: `Tambah ${needFwa15} FWA lagi sampai 15 FWA lalu perlu rebuy sekitar ${formatIDR(remainingIf15)}.`,
        });

      }

    } else {

      const remainingRevenue =
        Math.max(0, REVENUE_TARGET - totalRevenueNow);

      if (remainingRevenue > 0) {

        tips.push({
          done: false,
          text: `Kamu hanya perlu tambahan rebuy sekitar ${formatIDR(remainingRevenue)} untuk dapat insentif 200 ribu.`,
        });

      }

    }

  }

  return tips;
}
