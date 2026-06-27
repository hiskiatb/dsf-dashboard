import React, { useMemo, useState, useEffect } from "react";
import { useRef } from "react";
import CopyImageButton from "./CopyImageButton";
import { hitungInsentif } from "../utils";
import { useKpi } from "../KpiContext";
import { fetchManpower } from "../supabaseData";

// Normalisasi brand: IM3 / 3ID / HYBRID (HYBRID mulai periode Juni 2026).
function normalizeBrand(b) {
  const v = String(b || "").toLowerCase();
  if (v.includes("hybrid")) return "HYBRID";
  if (v.includes("im3")) return "IM3";
  if (v.includes("3id")) return "3ID";
  return String(b || "").toUpperCase();
}

function normalizeRegion(region) {
  if (!region) return "Unknown";
  const val = region.toLowerCase();
  if (val.includes("north")) return "NSA";
  if (val.includes("south")) return "SSA";
  if (val.includes("central")) return "CSA";
  return region.charAt(0).toUpperCase() + region.slice(1);
}

function toTitleCase(str) {
  const upperCaseWords = ["MC", "TL", "DSF"];
  if (upperCaseWords.includes(str.toUpperCase())) return str.toUpperCase();
  return str
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// Rp penuh, mis. "Rp 7.500.000"
function rp(n) {
  return "Rp " + Math.round(n || 0).toLocaleString("id-ID");
}

// Rp ringkas untuk kartu ringkasan, mis. "Rp 1,2 M" / "Rp 7,5 jt"
function rpShort(n) {
  const v = Math.abs(n || 0);
  if (v >= 1_000_000_000) return "Rp " + (n / 1_000_000_000).toFixed(1).replace(".", ",") + " M";
  if (v >= 1_000_000) return "Rp " + (n / 1_000_000).toFixed(1).replace(".", ",") + " jt";
  if (v >= 1_000) return "Rp " + (n / 1_000).toFixed(0) + " rb";
  return "Rp " + Math.round(n || 0).toLocaleString("id-ID");
}

const LEVELS = ["DSF", "TL", "MC", "BRANCH", "REGION"];
const FILTER_LEVELS = ["BRAND", "REGION", "BRANCH", "MC", "TL", "DSF"];

// Opsi "Subtotal per" yang masuk akal untuk tiap level ranking.
const GROUP_OPTIONS = {
  DSF: ["none", "REGION", "BRANCH", "MC", "TL"],
  TL: ["none", "REGION", "BRANCH"],
  MC: ["none", "REGION", "BRANCH"],
  BRANCH: ["none", "REGION"],
  REGION: ["none"],
};
const GROUP_DEFAULT = {
  DSF: "BRANCH",
  TL: "BRANCH",
  MC: "REGION",
  BRANCH: "REGION",
  REGION: "none",
};
const GROUP_FIELD = {
  REGION: "region",
  BRANCH: "branch",
  MC: "mc",
  TL: "tlName",
};

// Tema aksen Leaderboard mengikuti brand terpilih:
//   default / HYBRID / tanpa filter -> teal (success)
//   IM3  -> kuning (warning)
//   3ID  -> magenta (brand)
const THEMES = {
  teal: {
    eyebrow: "text-success-700", headerGrad: "from-success-50/70 to-white",
    groupGrad: "from-success-600 to-success-500",
    sub: "bg-success-50 text-success-900 border-success-300", subSticky: "bg-success-50",
    subText: "text-success-900", badge: "bg-success-600 text-white",
    filterActive: "border-success-300 bg-success-50 text-success-700", count: "text-success-700",
    check: "accent-success-600", btn: "bg-success-600 hover:bg-success-700",
    sortActive: "bg-success-600 text-white border-success-600",
    rowHover: "hover:bg-success-50/50", bar: "bg-success-500",
  },
  yellow: {
    eyebrow: "text-warning-700", headerGrad: "from-warning-50/70 to-white",
    groupGrad: "from-warning-700 to-warning-600",
    sub: "bg-warning-50 text-warning-800 border-warning-300", subSticky: "bg-warning-50",
    subText: "text-warning-800", badge: "bg-warning-600 text-white",
    filterActive: "border-warning-300 bg-warning-50 text-warning-800", count: "text-warning-700",
    check: "accent-warning-500", btn: "bg-warning-600 hover:bg-warning-700",
    sortActive: "bg-warning-600 text-white border-warning-600",
    rowHover: "hover:bg-warning-50/60", bar: "bg-warning-500",
  },
  magenta: {
    eyebrow: "text-brand-600", headerGrad: "from-brand-50/60 to-white",
    groupGrad: "from-brand-600 to-brand-500",
    sub: "bg-brand-50 text-brand-900 border-brand-300", subSticky: "bg-brand-50",
    subText: "text-brand-900", badge: "bg-brand-600 text-white",
    filterActive: "border-brand-300 bg-brand-50 text-brand-700", count: "text-brand-600",
    check: "accent-brand-600", btn: "bg-brand-600 hover:bg-brand-700",
    sortActive: "bg-brand-600 text-white border-brand-600",
    rowHover: "hover:bg-brand-50/40", bar: "bg-brand-500",
  },
};

// Pill brand berwarna: IM3 kuning, 3ID magenta, HYBRID teal.
function brandPill(b) {
  const map = {
    IM3: "bg-warning-100 text-warning-800 border-warning-300",
    "3ID": "bg-brand-50 text-brand-700 border-brand-200",
    HYBRID: "bg-success-50 text-success-700 border-success-300",
  };
  const cls = map[b] || "bg-ink-100 text-ink-600 border-ink-200";
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${cls}`}>
      {b || "-"}
    </span>
  );
}

export default function RankingDashboard({ dsfData = [], onSelectDSF, onSelectTL, dataDates, month }) {
  const kpi = useKpi();

  const initialFilters = { BRAND: [], REGION: [], BRANCH: [], MC: [], TL: [], DSF: [] };

  const [rankType, setRankType] = useState("DSF");
  const [sortBy, setSortBy] = useState("achievement");
  const [groupBy, setGroupBy] = useState(GROUP_DEFAULT.DSF);
  const [filters, setFilters] = useState(initialFilters);
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [openFilter, setOpenFilter] = useState(null);
  const [manpower, setManpower] = useState({});
  const tableRef = useRef(null);

  // Tema aksen aktif berdasarkan filter brand tunggal (IM3=kuning, 3ID=magenta,
  // HYBRID / tanpa filter / campuran = teal).
  const TH = (() => {
    const sel = filters.BRAND;
    if (sel.length === 1) {
      if (sel[0] === "IM3") return THEMES.yellow;
      if (sel[0] === "3ID") return THEMES.magenta;
    }
    return THEMES.teal;
  })();

  useEffect(() => {
    fetchManpower(month).then((m) => setManpower(m.byCode || {}));
  }, [month]);

  // Subtotal valid untuk level aktif; kalau tidak, jatuh ke default level itu.
  const effGroupBy = (GROUP_OPTIONS[rankType] || ["none"]).includes(groupBy)
    ? groupBy
    : GROUP_DEFAULT[rankType] || "none";

  /* ================= FILTER ================= */
  const filteredData = useMemo(() => {
    return dsfData.filter((row) => {
      const region = normalizeRegion(row.region);
      if (filters.REGION.length && !filters.REGION.includes(region)) return false;
      if (filters.BRANCH.length && !filters.BRANCH.includes(row.branch)) return false;
      if (filters.MC.length && !filters.MC.includes(row.mc)) return false;
      if (filters.TL.length && !filters.TL.includes(row.namaTl)) return false;
      if (filters.DSF.length && !filters.DSF.includes(row.namaDsf)) return false;
      if (filters.BRAND.length && !filters.BRAND.includes(normalizeBrand(row.brand))) return false;
      return true;
    });
  }, [dsfData, filters]);

  function getOptions(level) {
    const set = new Set();
    dsfData.forEach((row) => {
      switch (level) {
        case "BRAND": set.add(normalizeBrand(row.brand)); break;
        case "REGION": set.add(normalizeRegion(row.region)); break;
        case "BRANCH": set.add(row.branch); break;
        case "MC": set.add(row.mc); break;
        case "TL": set.add(row.namaTl); break;
        case "DSF": set.add(row.namaDsf); break;
        default: break;
      }
    });
    return [...set].filter(Boolean);
  }

  const activeFilterCount = FILTER_LEVELS.reduce((a, l) => a + filters[l].length, 0);
  function clearAllFilters() {
    setFilters(initialFilters);
    setDraftFilters(initialFilters);
  }

  /* ================= GROUPING + RANK ================= */
  const rankedData = useMemo(() => {
    const fwaPrice = kpi.fwa_unit_value || 0;
    const targetFwaPerDsf = kpi.target_fwa || 20;
    const baseRevenueTarget = kpi.revenue_target || 0;
    const grouped = {};

    filteredData.forEach((row) => {
      let key, name, branch;
      switch (rankType) {
        case "DSF": key = row.idDsf; name = row.namaDsf; branch = row.branch; break;
        case "TL": key = row.idTl; name = row.namaTl; break;
        case "MC": key = row.mc; name = row.mc; break;
        case "BRANCH": key = row.branch; name = row.branch; break;
        case "REGION": key = normalizeRegion(row.region); name = normalizeRegion(row.region); break;
        default: break;
      }

      if (!grouped[key]) {
        grouped[key] = {
          id: key, name, branch: branch || row.branch || "-",
          brand: normalizeBrand(row.brand),
          region: normalizeRegion(row.region), mc: row.mc || "-", tlName: row.namaTl || "-",
          totalFWA: 0, targetFWA: 0, revFwa: 0, rebuyRevenue: 0, hajjRevenue: 0,
          totalIncentive: 0, dsfSet: new Set(), dsfIncentiveMap: new Map(),
        };
      }

      grouped[key].targetFWA += Number(row.targetFwa || row.TARGET_FWA || targetFwaPerDsf);
      grouped[key].totalFWA += Number(row.fwaUnits) || 0;
      grouped[key].revFwa += Number(row.revFwa) || 0;
      grouped[key].rebuyRevenue += Number(row.rebuyRevenue) || 0;
      grouped[key].hajjRevenue =
        (grouped[key].hajjRevenue || 0) + (kpi.include_hajj ? Number(row.revHajj) || 0 : 0);

      const dsfId = row.idDsf;
      if (!grouped[key].dsfIncentiveMap.has(dsfId)) {
        const c = hitungInsentif(row, kpi);
        grouped[key].dsfIncentiveMap.set(dsfId, c.incentive);
        grouped[key].totalIncentive += c.incentive;
      }
      grouped[key].dsfSet.add(row.idDsf);
    });

    let result = Object.values(grouped).map((item) => {
      const dsfCount = item.dsfSet.size;
      const fwaRevenue = item.revFwa > 0 ? item.revFwa : item.totalFWA * fwaPrice;
      const totalRevenue = fwaRevenue + item.rebuyRevenue + (item.hajjRevenue || 0);
      const targetRevenue = rankType === "DSF" ? baseRevenueTarget : baseRevenueTarget * dsfCount;
      const targetFWA = item.targetFWA;
      const achievement = targetRevenue ? (totalRevenue / targetRevenue) * 100 : 0;
      const fwaPercent = targetFWA ? (item.totalFWA / targetFWA) * 100 : 0;
      const mp = rankType === "REGION" ? Number(manpower[item.id]) || 0 : 0;
      return { ...item, dsfCount, totalRevenue, targetRevenue, targetFWA, achievement, fwaPercent, manpower: mp };
    });

    const cmp = (a, b) => {
      switch (sortBy) {
        case "fwa": return b.totalFWA - a.totalFWA;
        case "rebuy": return b.rebuyRevenue - a.rebuyRevenue;
        case "hajj": return (b.hajjRevenue || 0) - (a.hajjRevenue || 0);
        case "revenue": return b.totalRevenue - a.totalRevenue;
        case "incentive": return b.totalIncentive - a.totalIncentive;
        case "achievement":
        default: return b.achievement - a.achievement;
      }
    };
    result.sort(cmp);
    return result.map((item, index) => ({ ...item, rank: index + 1 }));
  }, [filteredData, rankType, sortBy, kpi, manpower]);

  /* ===== Ringkasan (mengikuti filter aktif) ===== */
  const summary = useMemo(() => {
    const s = {
      count: rankedData.length, dsfCount: 0,
      totalFWA: 0, targetFWA: 0, rebuyRevenue: 0, hajjRevenue: 0,
      totalRevenue: 0, targetRevenue: 0, totalIncentive: 0, manpower: 0,
    };
    rankedData.forEach((i) => {
      s.dsfCount += i.dsfCount;
      s.totalFWA += i.totalFWA; s.targetFWA += i.targetFWA;
      s.rebuyRevenue += i.rebuyRevenue; s.hajjRevenue += i.hajjRevenue || 0;
      s.totalRevenue += i.totalRevenue; s.targetRevenue += i.targetRevenue;
      s.totalIncentive += i.totalIncentive;
      s.manpower += i.manpower || 0;
    });
    s.achievement = s.targetRevenue ? (s.totalRevenue / s.targetRevenue) * 100 : 0;
    s.fwaPercent = s.targetFWA ? (s.totalFWA / s.targetFWA) * 100 : 0;
    return s;
  }, [rankedData]);

  // Jumlah DSF (individu) yang berhak insentif — mengikuti filter aktif.
  const eligibleDsfCount = useMemo(() => {
    const seen = new Set();
    let n = 0;
    for (const row of filteredData) {
      if (seen.has(row.idDsf)) continue;
      seen.add(row.idDsf);
      if (hitungInsentif(row, kpi).incentive > 0) n++;
    }
    return n;
  }, [filteredData, kpi]);

  /* ===== Subtotal per grup ===== */
  const groups = useMemo(() => {
    if (effGroupBy === "none") return null;
    const field = GROUP_FIELD[effGroupBy];
    const map = new Map();
    rankedData.forEach((item) => {
      const k = item[field] || "—";
      if (!map.has(k)) {
        map.set(k, {
          key: k, items: [],
          totalFWA: 0, targetFWA: 0, rebuyRevenue: 0, hajjRevenue: 0,
          totalRevenue: 0, targetRevenue: 0, totalIncentive: 0,
        });
      }
      const g = map.get(k);
      g.items.push(item);
      g.totalFWA += item.totalFWA; g.targetFWA += item.targetFWA;
      g.rebuyRevenue += item.rebuyRevenue; g.hajjRevenue += item.hajjRevenue || 0;
      g.totalRevenue += item.totalRevenue; g.targetRevenue += item.targetRevenue;
      g.totalIncentive += item.totalIncentive;
    });
    const arr = [...map.values()].map((g) => ({
      ...g,
      achievement: g.targetRevenue ? (g.totalRevenue / g.targetRevenue) * 100 : 0,
      fwaPercent: g.targetFWA ? (g.totalFWA / g.targetFWA) * 100 : 0,
    }));
    arr.sort((a, b) => b.totalRevenue - a.totalRevenue);
    return arr;
  }, [rankedData, effGroupBy]);

  /* ================= COLORS ================= */
  const topRevPct = (() => {
    const t = [...(kpi.tiers || [])].sort((a, b) => (b.incentive || 0) - (a.incentive || 0))[0];
    return (t?.rev_pct ?? 1) * 100;
  })();
  function achievementColor(val) {
    if (val >= topRevPct) return "text-success-700";
    if (val >= 100) return "text-warning-700";
    return "text-danger-700";
  }
  function fwaPercentColor(val) {
    if (val >= 100) return "text-success-700";
    if (val >= 80) return "text-warning-700";
    return "text-danger-700";
  }
  function incentiveCellClass(v) {
    if (v === 0) return "text-danger-700";
    if (v >= 500000) return "text-success-700";
    return "text-warning-700";
  }

  function handleRowClick(item) {
    if (rankType === "DSF" && onSelectDSF) {
      const dsfDetail = dsfData.find((d) => d.idDsf === item.id);
      if (dsfDetail) onSelectDSF(dsfDetail);
    }
    if (rankType === "TL" && onSelectTL) {
      const tlDsfs = dsfData.filter((d) => d.idTl === item.id);
      if (tlDsfs.length > 0) onSelectTL({ tlId: item.id, tlName: item.name, dsfs: tlDsfs });
    }
  }

  /* ================= COLUMN CONFIG =================
     hide-class menentukan prioritas mobile. Header/body/subtotal/total
     semua memetakan array yang sama -> selalu selaras. */
  let COLS = rankType === "DSF"
    ? [
        { key: "rank", label: "#", align: "left", hide: "", cell: (i) => <span className="font-bold text-ink-900">{i.rank}</span>, total: () => "" },
        { key: "id", label: "ID DSF", align: "left", hide: "hidden lg:table-cell", cell: (i) => <span className="font-mono text-[11px] text-ink-500">{i.id}</span>, total: () => "" },
        { key: "name", label: "Nama DSF", align: "left", hide: "", isName: true, cell: (i) => <span className="font-semibold text-ink-800">{i.name}</span> },
        { key: "brand", label: "Brand", align: "left", hide: "hidden sm:table-cell", cell: (i) => brandPill(i.brand), total: () => "" },
        { key: "branch", label: "Branch", align: "left", hide: "hidden md:table-cell", cell: (i) => <span className="text-ink-600">{i.branch}</span>, total: () => "" },
        { key: "targetFWA", label: "Tgt FWA", align: "right", hide: "hidden lg:table-cell", cell: (i) => i.targetFWA, total: (t) => t.targetFWA },
        { key: "totalFWA", label: "FWA", align: "right", hide: "", cell: (i) => <span className="font-semibold">{i.totalFWA}</span>, total: (t) => <span className="font-bold">{t.totalFWA}</span> },
        { key: "fwaPercent", label: "% FWA", align: "right", hide: "hidden md:table-cell", cell: (i) => <span className={`font-bold ${fwaPercentColor(i.fwaPercent)}`}>{i.fwaPercent.toFixed(0)}%</span>, total: (t) => <span className={`font-bold ${fwaPercentColor(t.fwaPercent)}`}>{t.fwaPercent.toFixed(0)}%</span> },
        { key: "rebuy", label: "Rebuy FWA", align: "right", hide: "hidden lg:table-cell", cell: (i) => rp(i.rebuyRevenue), total: (t) => rp(t.rebuyRevenue) },
        { key: "hajj", label: "Rebuy Haji", align: "right", hide: "hidden xl:table-cell", cell: (i) => rp(i.hajjRevenue || 0), total: (t) => rp(t.hajjRevenue || 0) },
        { key: "targetRev", label: "Target", align: "right", hide: "hidden lg:table-cell", cell: (i) => rp(i.targetRevenue), total: (t) => rp(t.targetRevenue) },
        { key: "revenue", label: "Revenue", align: "right", hide: "", cell: (i) => <span className="font-bold text-ink-900">{rp(i.totalRevenue)}</span>, total: (t) => <span className="font-bold">{rp(t.totalRevenue)}</span> },
        { key: "achievement", label: "% Rev", align: "right", hide: "hidden sm:table-cell", cell: (i) => <span className={`font-bold ${achievementColor(i.achievement)}`}>{i.achievement.toFixed(0)}%</span>, total: (t) => <span className={`font-bold ${achievementColor(t.achievement)}`}>{t.achievement.toFixed(0)}%</span> },
        { key: "incentive", label: "Insentif", align: "right", hide: "", cell: (i) => <span className={`font-bold ${incentiveCellClass(i.totalIncentive)}`}>{rp(i.totalIncentive)}</span>, total: (t) => <span className={`font-bold ${incentiveCellClass(t.totalIncentive)}`}>{rp(t.totalIncentive)}</span> },
      ]
    : [
        { key: "rank", label: "#", align: "left", hide: "", cell: (i) => <span className="font-bold text-ink-900">{i.rank}</span>, total: () => "" },
        { key: "name", label: toTitleCase(rankType), align: "left", hide: "", isName: true, cell: (i) => <span className="font-semibold text-ink-800">{i.name}</span> },
        { key: "targetFWA", label: "Tgt FWA", align: "right", hide: "hidden lg:table-cell", cell: (i) => i.targetFWA, total: (t) => t.targetFWA },
        { key: "totalFWA", label: "FWA", align: "right", hide: "", cell: (i) => <span className="font-semibold">{i.totalFWA}</span>, total: (t) => <span className="font-bold">{t.totalFWA}</span> },
        { key: "fwaPercent", label: "% FWA", align: "right", hide: "hidden md:table-cell", cell: (i) => <span className={`font-bold ${fwaPercentColor(i.fwaPercent)}`}>{i.fwaPercent.toFixed(0)}%</span>, total: (t) => <span className={`font-bold ${fwaPercentColor(t.fwaPercent)}`}>{t.fwaPercent.toFixed(0)}%</span> },
        { key: "rebuy", label: "Rebuy FWA", align: "right", hide: "hidden lg:table-cell", cell: (i) => rp(i.rebuyRevenue), total: (t) => rp(t.rebuyRevenue) },
        { key: "hajj", label: "Rebuy Haji", align: "right", hide: "hidden xl:table-cell", cell: (i) => rp(i.hajjRevenue || 0), total: (t) => rp(t.hajjRevenue || 0) },
        { key: "targetRev", label: "Target", align: "right", hide: "hidden lg:table-cell", cell: (i) => rp(i.targetRevenue), total: (t) => rp(t.targetRevenue) },
        { key: "revenue", label: "Revenue", align: "right", hide: "", cell: (i) => <span className="font-bold text-ink-900">{rp(i.totalRevenue)}</span>, total: (t) => <span className="font-bold text-ink-900">{rp(t.totalRevenue)}</span> },
        { key: "achievement", label: "% Rev", align: "right", hide: "hidden sm:table-cell", cell: (i) => <span className={`font-bold ${achievementColor(i.achievement)}`}>{i.achievement.toFixed(0)}%</span>, total: (t) => <span className={`font-bold ${achievementColor(t.achievement)}`}>{t.achievement.toFixed(0)}%</span> },
      ];

  // Rebuy Haji hanya tampil bila bulan ini mengaktifkan Hajj (kpi.include_hajj),
  // diatur admin per bulan — tidak hardcode. Mis. hanya April & Mei 2026.
  if (!kpi.include_hajj) COLS = COLS.filter((c) => c.key !== "hajj");

  // Kolom khusus level REGION: Manpower (headcount) + produktivitas.
  if (rankType === "REGION") {
    COLS.push(
      { key: "manpower", label: "Manpower", align: "right", hide: "", cell: (i) => i.manpower || "-", total: (t) => <span className="font-bold">{t.manpower}</span> },
      { key: "prodFwa", label: "FWA/MP", align: "right", hide: "hidden sm:table-cell", cell: (i) => (i.manpower ? (i.totalFWA / i.manpower).toFixed(1) : "-"), total: (t) => (t.manpower ? (t.totalFWA / t.manpower).toFixed(1) : "-") },
      { key: "prodRev", label: "Rev/MP", align: "right", hide: "hidden lg:table-cell", cell: (i) => (i.manpower ? rp(Math.round(i.totalRevenue / i.manpower)) : "-"), total: (t) => (t.manpower ? rp(Math.round(t.totalRevenue / t.manpower)) : "-") },
    );
  }

  const alignCls = (a) => (a === "right" ? "text-right" : "text-left");
  const clickable = rankType === "DSF" || rankType === "TL";

  function renderItemRow(item) {
    return (
      <tr
        key={item.rank}
        onClick={() => handleRowClick(item)}
        className={`border-t border-ink-100 transition ${clickable ? `cursor-pointer ${TH.rowHover}` : ""}`}
      >
        {COLS.map((c) => (
          <td
            key={c.key}
            className={`px-3 py-2.5 ${alignCls(c.align)} ${c.hide} ${
              c.key === "name" ? "sticky left-0 z-10 bg-white" : ""
            }`}
          >
            {c.cell(item)}
          </td>
        ))}
      </tr>
    );
  }

  function renderTotalsRow(data, label, grand) {
    const rowCls = grand
      ? "bg-ink-900 text-white"
      : `${TH.sub} border-y-2`;
    const stickyBg = grand ? "bg-ink-900" : TH.subSticky;
    return (
      <tr className={rowCls}>
        {COLS.map((c) => (
          <td
            key={c.key}
            className={`px-3 py-3 ${alignCls(c.align)} ${c.hide} font-extrabold ${
              c.key === "name" ? `sticky left-0 z-10 ${stickyBg}` : ""
            }`}
          >
            {c.isName ? (
              <span className="inline-flex items-center gap-2 whitespace-nowrap">
                <span
                  className={`text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                    grand ? "bg-white text-ink-900" : TH.badge
                  }`}
                >
                  {grand ? "Total" : "Subtotal"}
                </span>
                <span className={grand ? "text-white" : TH.subText}>{label}</span>
              </span>
            ) : c.total ? (
              <span className={grand ? "text-white [&_*]:text-white" : TH.subText}>{c.total(data)}</span>
            ) : (
              ""
            )}
          </td>
        ))}
      </tr>
    );
  }

  /* ===== Title ===== */
  const sortLabelMap = {
    achievement: "Achievement", revenue: "Revenue", fwa: "FWA",
    rebuy: "Rebuy FWA", hajj: "Rebuy Haji", incentive: "Insentif",
  };

  return (
    <div className="bg-white rounded-2xl shadow-card border border-ink-200 overflow-hidden">
      {/* ===== HEADER STRIP ===== */}
      <div className={`px-4 sm:px-6 pt-5 pb-4 border-b border-ink-100 bg-gradient-to-br ${TH.headerGrad}`}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className={`text-[11px] font-bold uppercase tracking-[0.14em] ${TH.eyebrow}`}>
              Leaderboard
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-ink-900 leading-tight mt-0.5">
              Ranking {toTitleCase(rankType)}
              <span className="text-ink-400 font-bold"> · {sortLabelMap[sortBy]}</span>
            </h2>
          </div>
          <CopyImageButton
            targetRef={tableRef}
            dataDates={dataDates}
            filters={filters}
            rankType={rankType}
            sortBy={sortBy}
          />
        </div>

        {/* LEVEL SELECTOR */}
        <div className="flex gap-1.5 mt-4 overflow-x-auto -mx-1 px-1 pb-1 scrollbar-hide">
          {LEVELS.map((type) => (
            <button
              key={type}
              onClick={() => setRankType(type)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold border transition
                ${rankType === type
                  ? "bg-ink-900 text-white border-ink-900 shadow-sm"
                  : "bg-white/70 text-ink-600 border-ink-200 hover:border-ink-300 hover:text-ink-900"}`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* ===== SUMMARY BAR (mengikuti filter aktif) ===== */}
      <div className="px-4 sm:px-6 py-4 border-b border-ink-100">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          <SummaryCard
            label={`${summary.count} ${toTitleCase(rankType)}`}
            sub={rankType === "DSF" ? "total terfilter" : `${summary.dsfCount} DSF di dalamnya`}
            value={`${summary.dsfCount || summary.count}`}
            valueLabel={rankType === "DSF" ? "DSF aktif" : "DSF tercakup"}
            accent="ink"
          />
          <SummaryCard
            label="Total FWA"
            value={summary.totalFWA.toLocaleString("id-ID")}
            valueLabel={`dari ${summary.targetFWA.toLocaleString("id-ID")} target`}
            badge={`${summary.fwaPercent.toFixed(0)}%`}
            badgeClass={fwaPercentColor(summary.fwaPercent)}
            accent="teal"
          />
          <SummaryCard
            label="Total Revenue"
            value={rpShort(summary.totalRevenue)}
            valueLabel={`target ${rpShort(summary.targetRevenue)}`}
            badge={`${summary.achievement.toFixed(0)}%`}
            badgeClass={achievementColor(summary.achievement)}
            barClass={TH.bar}
          />
          <SummaryCard
            label="Total Insentif"
            value={rpShort(summary.totalIncentive)}
            valueLabel={`${eligibleDsfCount.toLocaleString("id-ID")} DSF eligible`}
            accent="amber"
          />
        </div>
      </div>

      {/* ===== CONTROLS ===== */}
      <div className="px-4 sm:px-6 py-4 space-y-4">
        {/* Filter */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-bold uppercase tracking-wider text-ink-500">
              Filter {activeFilterCount > 0 && <span className={TH.count}>· {activeFilterCount} aktif</span>}
            </div>
            {activeFilterCount > 0 && (
              <button onClick={clearAllFilters} className="text-xs text-danger-600 font-semibold hover:underline">
                Reset
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {FILTER_LEVELS.map((level) => {
              const options = getOptions(level);
              const active = filters[level].length;
              return (
                <div key={level} className="relative">
                  <button
                    onClick={() => {
                      setDraftFilters(filters);
                      setOpenFilter(openFilter === level ? null : level);
                    }}
                    className={`w-full rounded-lg px-3 py-2 flex justify-between items-center text-xs sm:text-sm font-semibold transition border
                      ${active ? TH.filterActive : "border-ink-200 bg-white text-ink-700 hover:border-ink-300"}`}
                  >
                    <span className="truncate">
                      {toTitleCase(level)}
                      {active > 0 && <span className="ml-1 text-[10px] font-bold">({active})</span>}
                    </span>
                    <span className="ml-1 text-ink-400 text-[9px]">▼</span>
                  </button>

                  {openFilter === level && (
                    <div className="absolute z-30 bg-white border border-ink-200 mt-2 rounded-xl shadow-pop w-full min-w-[210px]">
                      <div className="max-h-56 overflow-y-auto p-3">
                        <label className="flex items-center gap-2 text-sm py-1 font-semibold text-ink-800">
                          <input
                            type="checkbox"
                            checked={options.length > 0 && draftFilters[level].length === options.length}
                            onChange={() =>
                              setDraftFilters((prev) => ({
                                ...prev,
                                [level]: prev[level].length === options.length ? [] : options,
                              }))
                            }
                            className={TH.check}
                          />
                          Pilih semua
                        </label>
                        {options.map((val) => (
                          <label key={val} className="flex items-center gap-2 text-sm py-1 text-ink-700">
                            <input
                              type="checkbox"
                              checked={draftFilters[level].includes(val)}
                              onChange={() =>
                                setDraftFilters((prev) => {
                                  const updated = prev[level].includes(val)
                                    ? prev[level].filter((v) => v !== val)
                                    : [...prev[level], val];
                                  return { ...prev, [level]: updated };
                                })
                              }
                              className={TH.check}
                            />
                            {val}
                          </label>
                        ))}
                      </div>
                      <div className="border-t border-ink-100 p-2 flex justify-between">
                        <button
                          onClick={() => setDraftFilters((prev) => ({ ...prev, [level]: [] }))}
                          className="text-xs text-ink-500 hover:text-ink-800 px-2 py-1"
                        >
                          Kosongkan
                        </button>
                        <button
                          onClick={() => { setFilters(draftFilters); setOpenFilter(null); }}
                          className={`text-xs ${TH.btn} text-white px-3 py-1.5 rounded-lg font-semibold`}
                        >
                          Terapkan
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sort + Subtotal */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
          <div className="flex-1">
            <div className="text-xs font-bold uppercase tracking-wider text-ink-500 mb-2">Urutkan</div>
            <div className="flex gap-1.5 flex-wrap">
              {[
                { key: "achievement", label: "Achievement" },
                { key: "revenue", label: "Revenue" },
                { key: "fwa", label: "FWA" },
                { key: "incentive", label: "Insentif" },
                { key: "rebuy", label: "Rebuy" },
              ].map((o) => (
                <button
                  key={o.key}
                  onClick={() => setSortBy(o.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition
                    ${sortBy === o.key ? TH.sortActive : "bg-white text-ink-600 border-ink-200 hover:bg-ink-50"}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div className="sm:w-44">
            <div className="text-xs font-bold uppercase tracking-wider text-ink-500 mb-2">Subtotal per</div>
            <select
              value={effGroupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-ink-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {(GROUP_OPTIONS[rankType] || ["none"]).map((g) => (
                <option key={g} value={g}>{g === "none" ? "Tanpa subtotal" : toTitleCase(g)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ===== TABLE ===== */}
      <div ref={tableRef} className="overflow-auto max-h-[72vh] border-t border-ink-200">
        <table className="min-w-full text-xs sm:text-sm whitespace-nowrap">
          <thead className="bg-ink-50 sticky top-0 z-20 shadow-[0_1px_0_rgba(0,0,0,0.06)]">
            <tr>
              {COLS.map((c) => (
                <th
                  key={c.key}
                  className={`px-3 py-2.5 font-bold text-ink-500 uppercase tracking-wider text-[10px] ${alignCls(c.align)} ${c.hide} ${
                    c.key === "name" ? "sticky left-0 z-30 bg-ink-50" : ""
                  }`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rankedData.length === 0 && (
              <tr>
                <td colSpan={COLS.length} className="px-4 py-10 text-center text-ink-400">
                  Tidak ada data sesuai filter.
                </td>
              </tr>
            )}

            {groups
              ? groups.map((g, gi) => (
                  <React.Fragment key={g.key}>
                    {gi > 0 && (
                      <tr aria-hidden="true">
                        <td colSpan={COLS.length} className="h-2.5 bg-white p-0" />
                      </tr>
                    )}
                    <tr>
                      <td
                        colSpan={COLS.length}
                        className={`px-3 py-2 sticky left-0 bg-gradient-to-r ${TH.groupGrad}`}
                      >
                        <span className="inline-flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/70">
                            {toTitleCase(effGroupBy)}
                          </span>
                          <span className="text-sm font-extrabold text-white">{g.key}</span>
                          <span className="text-[11px] text-white/80 font-semibold bg-white/15 px-2 py-0.5 rounded-full">
                            {g.items.length} {toTitleCase(rankType)}
                          </span>
                        </span>
                      </td>
                    </tr>
                    {g.items.map((item) => renderItemRow(item))}
                    {renderTotalsRow(g, g.key, false)}
                  </React.Fragment>
                ))
              : rankedData.map((item) => renderItemRow(item))}
          </tbody>

          {rankedData.length > 0 && (
            <tfoot>{renderTotalsRow(summary, "Keseluruhan", true)}</tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, valueLabel, badge, badgeClass = "", accent = "ink", barClass }) {
  const accentBar = barClass || {
    ink: "bg-ink-300",
    brand: "bg-brand-500",
    teal: "bg-success-500",
    amber: "bg-warning-500",
  }[accent];
  return (
    <div className="relative rounded-xl border border-ink-200 bg-white p-3 sm:p-3.5 overflow-hidden">
      <span className={`absolute left-0 top-0 h-full w-1 ${accentBar}`} />
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-ink-500 truncate">
          {label}
        </div>
        {badge && (
          <span className={`text-[11px] font-extrabold ${badgeClass}`}>{badge}</span>
        )}
      </div>
      <div className="mt-1 text-lg sm:text-xl font-extrabold text-ink-900 leading-tight truncate">
        {value}
      </div>
      {valueLabel && (
        <div className="text-[10px] sm:text-[11px] text-ink-400 font-medium truncate">{valueLabel}</div>
      )}
    </div>
  );
}
