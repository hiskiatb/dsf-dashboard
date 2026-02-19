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
  const fwaUnits = toNumberSafe(row.TOTAL_FWA || 0);
  const rebuyRevenue = toNumberSafe(row.REV_REBUY || 0);
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
  const fwaRevenue = dsf.fwaUnits * FWA_UNIT_VALUE;
  const totalRevenue = fwaRevenue + dsf.rebuyRevenue;

  let incentive = 0;
  if (dsf.fwaUnits >= 20 && totalRevenue >= REVENUE_TARGET) {
    incentive = 500_000;
  } else if (dsf.fwaUnits >= 15 && totalRevenue >= REVENUE_TARGET) {
    incentive = 200_000;
  }

  const remainingRevenue = Math.max(0, REVENUE_TARGET - totalRevenue);

  // IMPORTANT:
  // progress ring boleh > 100% untuk perhitungan, tapi ringnya tetap penuh.
  const fwaProgress = dsf.fwaUnits / 20;
  const revenueProgress = totalRevenue / REVENUE_TARGET;

  return {
    fwaRevenue,
    totalRevenue,
    incentive,
    remainingRevenue,
    fwaProgress,
    revenueProgress,
  };
}

export function isEligible(dsf) {
  return hitungInsentif(dsf).incentive > 0;
}

// --------------------------
// Tips Engine (Checklist)
// --------------------------
export function buildTips(dsf) {
  const c = hitungInsentif(dsf);

  const tips = [];

  const totalRevenueNow = c.totalRevenue;
  const rebuyNow = dsf.rebuyRevenue;
  const fwaNow = dsf.fwaUnits;

  // ==========================================
  // TARGET 500K (>=20 FWA + total revenue >= 7.5jt)
  // ==========================================
  const needFwa20 = Math.max(0, 20 - fwaNow);

  // Jika sudah 20+ FWA → tinggal cek revenue
  if (needFwa20 === 0) {
    if (totalRevenueNow >= REVENUE_TARGET) {
      tips.push({
        done: true,
        text: "Target insentif 500 ribu sudah tercapai (20+ FWA & revenue ≥ 7,5 juta).",
      });
    } else {
      tips.push({
        done: false,
        text: `Untuk dapat insentif 500 ribu, kamu masih perlu tambahan revenue ${formatIDR(
          c.remainingRevenue
        )} (bisa dikejar lewat rebuy).`,
      });
    }

    // Kalau sudah masuk blok 500K, kita stop.
    // Tidak perlu tampilkan info 200K lagi.
    return tips;
  }

  // ------------------------------------------
  // Kalau belum 20 FWA → buat beberapa opsi
  // ------------------------------------------

  // Simulasi total revenue kalau dia mencapai 20 FWA (rebuy tetap dihitung yang sekarang)
  const totalRevenueIf20 = 20 * FWA_UNIT_VALUE + rebuyNow;

  const remainingIf20 = Math.max(0, REVENUE_TARGET - totalRevenueIf20);

  // Simulasi total revenue kalau dia mencapai 22 FWA (tanpa rebuy pun sudah cukup)
  const totalRevenueIf22 = 22 * FWA_UNIT_VALUE;
  const needFwa22 = Math.max(0, 22 - fwaNow);

  // Case 1: Kalau sampai 20 FWA, revenue sudah cukup (berkat rebuy existing)
  if (remainingIf20 === 0) {
    tips.push({
      done: false,
      text: `Untuk dapat insentif 500 ribu, cukup tambah ${needFwa20} FWA lagi sampai 20 FWA. Rebuy kamu saat ini sudah cukup, jadi fokus kejar FWA dulu ya.`,
    });
  } else {
    // Case 2: Sampai 20 FWA masih kurang revenue
    tips.push({
      done: false,
      text: `Untuk dapat insentif 500 ribu, tambah ${needFwa20} FWA lagi sampai 20 FWA. Setelah itu kamu masih perlu tambahan rebuy sekitar ${formatIDR(
        remainingIf20
      )} agar total revenue mencapai 7,5 juta.`,
    });

    // opsi alternatif: kejar 22 FWA supaya tanpa rebuy pun aman
    if (needFwa22 > 0) {
      tips.push({
        done: false,
        text: `Alternatif tanpa rebuy: kejar sampai 22 FWA (tambah ${needFwa22} FWA lagi). Karena 22 FWA sudah setara ≥ 7,5 juta dari kontribusi FWA saja.`,
      });
    }
  }

// ==========================================
// TARGET 200K (>=15 FWA + total revenue >= 7.5jt)
// ==========================================
const needFwa15 = Math.max(0, 15 - fwaNow);

// Simulasi total revenue kalau dia mencapai 15 FWA (rebuy tetap dihitung dari yang sekarang)
const totalRevenueIf15 = Math.max(totalRevenueNow, 15 * FWA_UNIT_VALUE + rebuyNow);
const remainingIf15 = Math.max(0, REVENUE_TARGET - totalRevenueIf15);

if (needFwa15 > 0) {
  if (remainingIf15 <= 0) {
    // Rebuy existing sudah cukup, cuma perlu FWA
    tips.push({
      done: false,
      text: `Untuk dapat insentif 200 ribu, cukup tambah ${needFwa15} FWA lagi sampai 15 FWA. Rebuy kamu saat ini sudah cukup, jadi fokus kejar FWA dulu ya.`,
    });
  } else {
    // Masih butuh tambahan revenue dari rebuy
    tips.push({
      done: false,
      text: `Untuk dapat insentif 200 ribu, tambah ${needFwa15} FWA lagi sampai 15 FWA. Setelah itu kamu masih perlu tambahan rebuy sekitar ${formatIDR(
        remainingIf15
      )} agar total revenue mencapai 7,5 juta.`,
    });
  }
} else {
  if (totalRevenueNow >= REVENUE_TARGET) {
    tips.push({
      done: true,
      text: "Target insentif 200 ribu sudah tercapai (15+ FWA & revenue ≥ 7,5 juta).",
    });
  } else {
    tips.push({
      done: false,
      text: `Untuk dapat insentif 200 ribu, kejar rebuy sekitar ${formatIDR(
        REVENUE_TARGET - rebuyNow
      )} lagi agar total revenue mencapai 7,5 juta. Rebuy saat ini: ${formatIDR(rebuyNow)}`,
    });
  }
}


  return tips;
}
