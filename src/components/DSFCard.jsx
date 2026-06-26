import CopyImageButton from "./CopyImageButton";
import React, { useRef, useMemo } from "react";

import { motion } from "framer-motion";
import Pill from "./Pill";
import Ring from "./Ring";
import {
  buildTips,
  formatIDR,
  hitungInsentif,
  maskMsisdn,
} from "../utils";
import { useKpi } from "../KpiContext";

// Format nominal insentif ringkas, mis. 500000 -> "500K", 1000000 -> "1JT".
function shortIncentive(n) {
  if (!n) return "";
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return `${Number.isInteger(v) ? v : v.toFixed(1)}JT`;
  }
  return `${Math.round(n / 1000)}K`;
}

// HELPER: Auto-parse CSV yang jauh lebih tangguh
function parseCSVData(data) {
  if (!data || data.length === 0) return [];
  if (Array.isArray(data) && typeof data[0] === "object" && data[0] !== null) {
    return data;
  }

  let lines = [];
  if (Array.isArray(data) && typeof data[0] === "string") {
    lines = data;
  } else if (typeof data === "string") {
    lines = data.trim().split(/\r?\n/);
  } else {
    return [];
  }

  if (lines.length < 2) return [];

  const headers = lines[0]
    .split(";")
    .map((h) => h.trim().toUpperCase())
    .filter(Boolean);

  const parsedData = [];

  for (let i = 1; i < lines.length; i++) {
    const currentLine = lines[i].split(";");
    if (currentLine.length < headers.length && currentLine[0] === "") continue;

    const rowObj = {};
    headers.forEach((header, index) => {
      rowObj[header] = currentLine[index] ? currentLine[index].trim() : "";
    });
    parsedData.push(rowObj);
  }
  return parsedData;
}

export default function DSFCard({
  dsf,
  dataDates,
  fwaData = [],
  adjData = [],
  month,
}) {
  const kpi = useKpi();
  const c = hitungInsentif(dsf, kpi);

  const ENABLE_TIPS = false;
  const tips = ENABLE_TIPS ? buildTips(dsf, kpi) : [];

  const targetFwa = dsf.targetFwa || kpi.target_fwa || 20;
  const revenueTarget = kpi.revenue_target || 0;

  const eligible = c.incentive > 0;

  const incentiveLabel = eligible
    ? `INCENTIVE ${shortIncentive(c.incentive)}`
    : "NOT ELIGIBLE";

  const incentiveTone = eligible ? "success" : "danger";

  // Ambang FWA untuk tier terendah (mis. 0.75 -> 15 dari 20).
  const tiersDesc = [...(kpi.tiers || [])].sort(
    (a, b) => (b.incentive || 0) - (a.incentive || 0)
  );
  const lowestFwaPct = tiersDesc.length
    ? tiersDesc[tiersDesc.length - 1].fwa_pct ?? 1
    : 0.75;
  const topRevPct = tiersDesc.length ? tiersDesc[0].rev_pct ?? 1 : 1;

  const ringFwaTone =
    dsf.fwaUnits >= targetFwa
      ? "success"
      : dsf.fwaUnits >= targetFwa * lowestFwaPct
      ? "warning"
      : "danger";

  // Tone revenue mengikuti tier tertinggi dari config (bukan lagi hardcode bulan).
  const ringRevTone = (() => {
    if (revenueTarget <= 0) return "warning";
    if (c.totalRevenue >= revenueTarget * topRevPct) return "success";
    if (c.totalRevenue >= revenueTarget) return "warning";
    return "danger";
  })();

  // ================================
  // DATE FORMATTERS
  // ================================
  function formatMonthYear(dateStr) {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    if (isNaN(date)) return "-";
    return date.toLocaleString("id-ID", { month: "short", year: "numeric" });
  }

  function formatGA(date) {
    if (!date) return "-";
    if (/^\d{8}$/.test(date)) {
      const y = date.slice(0, 4);
      const m = date.slice(4, 6);
      const d = date.slice(6, 8);
      return new Date(`${y}-${m}-${d}`).toLocaleDateString("id-ID", {
        day: "2-digit", month: "short", year: "numeric",
      });
    }
    const parsed = new Date(date);
    if (isNaN(parsed)) return "-";
    return parsed.toLocaleDateString("id-ID", {
      day: "2-digit", month: "short", year: "numeric",
    });
  }

  function formatFullDate(dateStr) {
    if (!dateStr) return "-";
    if (/^\d{8}$/.test(dateStr)) {
      const y = dateStr.slice(0, 4);
      const m = dateStr.slice(4, 6);
      const d = dateStr.slice(6, 8);
      return new Date(`${y}-${m}-${d}`).toLocaleDateString("id-ID", {
        day: "2-digit", month: "short", year: "numeric",
      });
    }
    const parsed = new Date(dateStr);
    if (isNaN(parsed)) return "-";
    return parsed.toLocaleDateString("id-ID", {
      day: "2-digit", month: "short", year: "numeric",
    });
  }

  const dataFwaDate =
    dsf.brand === "IM3" ? dataDates?.DATA_FWA_IM3 : dataDates?.DATA_FWA_3ID;
  const rebuyDate =
    dsf.brand === "IM3" ? dataDates?.DATA_REBUY_IM3 : dataDates?.DATA_REBUY_3ID;

  const periodeLabel = formatMonthYear(dataFwaDate);
  const fwaUpdateLabel = formatFullDate(dataFwaDate);
  const rebuyUpdateLabel = formatFullDate(rebuyDate);

  // ================================
  // FILTERS & DATA PARSING
  // ================================
  function normalizeId(val) {
    return String(val ?? "").trim().toUpperCase().replace(/^0+/, "");
  }

  const safeMonth = String(month || "").replace(/-/g, "");

  const [searchMsisdn, setSearchMsisdn] = React.useState("");

  const parsedFwaData = useMemo(() => parseCSVData(fwaData), [fwaData]);
  const parsedAdjData = useMemo(() => parseCSVData(adjData), [adjData]);

  // RAW DATA
  const rawList = parsedFwaData.filter((row) => {
    const isIdMatch = normalizeId(row?.ID_DSF) === normalizeId(dsf?.idDsf);
    const isMonthMatch = safeMonth ? String(row?.GA_DATE || "").includes(safeMonth) : true;
    return isIdMatch && isMonthMatch;
  });

  const rawCounted = rawList.filter(
    (x) => String(x?.REMARKS || "").trim().toUpperCase() === "REGISTERED"
  );
  const rawInvalid = rawList.filter(
    (x) => String(x?.REMARKS || "").trim().toUpperCase() !== "REGISTERED"
  );

  const filteredRawCounted = rawCounted.filter((x) =>
    String(x?.MSISDN || "").includes(searchMsisdn)
  );
  const filteredRawInvalid = rawInvalid.filter((x) =>
    String(x?.MSISDN || "").includes(searchMsisdn)
  );

  // ADJUSTMENT DATA
  const adjList = parsedAdjData.filter((row) => {
    const isIdMatch = normalizeId(row?.ID_DSF) === normalizeId(dsf?.idDsf);
    const isMonthMatch = safeMonth ? String(row?.GA_DATE || "").includes(safeMonth) : true;
    return isIdMatch && isMonthMatch;
  });

  const adjValid = adjList.filter((x) => Number(x?.VALID_FLAG) > 0);
  const adjInvalid = adjList.filter((x) => Number(x?.VALID_FLAG) === 0);

  const filteredAdjValid = adjValid.filter((x) =>
    String(x?.MSISDN || "").includes(searchMsisdn)
  );
  const filteredAdjInvalid = adjInvalid.filter((x) =>
    String(x?.MSISDN || "").includes(searchMsisdn)
  );

  const rawCountedRef = useRef(null);
  const rawInvalidRef = useRef(null);
  const adjValidRef = useRef(null);
  const adjInvalidRef = useRef(null);

  const totalRawUnits = rawCounted.reduce((sum, row) => sum + (Number(row?.VALID_FLAG) || 0), 0);
  const totalAdjUnits = adjValid.reduce((sum, row) => sum + (Number(row?.VALID_FLAG) || 0), 0);
  const actualCountedTable = totalRawUnits + totalAdjUnits;

  return (
    <motion.div
      className="card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* HEADER */}
      <div className="card-header">
        <div>
          <div className="card-title">
            Penjualan Periode {periodeLabel}
          </div>
          <div className="card-desc">
            Lihat sejauh mana kamu melangkah bulan ini.
          </div>
        </div>

        <div className="header-badges">
          <Pill variant="info">{dsf.brand}</Pill>
          <Pill variant={incentiveTone}>{incentiveLabel}</Pill>
        </div>
      </div>

      {/* MINIMAL VIEW */}
      <div className="grid-2 mt-4">
        <div className="stat">
          <div className="stat-label">ID DSF</div>
          <div className="stat-value">{dsf.idDsf}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Nama DSF</div>
          <div className="stat-value">{dsf.namaDsf}</div>
        </div>
      </div>

      {/* DETAIL */}
      <details className="details">
        <summary className="details-summary">Detail Profil</summary>
        <div className="grid-2 mt-4">
          <div className="stat">
            <div className="stat-label">Micro Cluster</div>
            <div className="stat-value">{dsf.mc}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Region</div>
            <div className="stat-value">{dsf.region}</div>
          </div>
          <div className="stat">
            <div className="stat-label">TL ID</div>
            <div className="stat-value">{dsf.idTl || "-"}</div>
          </div>
          <div className="stat">
            <div className="stat-label">TL Name</div>
            <div className="stat-value">{dsf.namaTl || "-"}</div>
          </div>
        </div>
      </details>

      {/* DASHBOARD */}
      <div className="dash-grid mt-5">
        <Ring
          title="FWA Units"
          subtitle={`Update terakhir: ${fwaUpdateLabel}`}
          valueText={`${dsf.fwaUnits} / ${targetFwa}`}
          percent={dsf.fwaUnits / targetFwa}
          tone={ringFwaTone}
        />

        <Ring
          title="Total Revenue"
          subtitle={`Target: ${formatIDR(revenueTarget)}`}
          valueText={formatIDR(c.totalRevenue)}
          percent={c.revenueProgress}
          tone={ringRevTone}
        />

        <div className="dash-right">
          <div className="mini-card">
            <div className="mini-label">Rebuy Haji</div>
            <div className="mini-value">{formatIDR(dsf.revHajj || 0)}</div>
            <div className="mini-subtext">
              Update terakhir: {rebuyUpdateLabel}
            </div>
          </div>

          <div className="mini-card">
            <div className="mini-label">Rebuy FWA</div>
            <div className="mini-value">{formatIDR(dsf.rebuyRevenue)}</div>
            <div className="mini-subtext">
              Update terakhir: {rebuyUpdateLabel}
            </div>
          </div>

          <div className="mini-card strong">
            <div className="mini-label">Incentive Earned</div>
            <div className="mini-value">{formatIDR(c.incentive)}</div>
          </div>
        </div>
      </div>

      {/* TIPS */}
      {tips.length > 0 && (
        <div className="mt-6">
          <h3 className="text-base sm:text-lg font-bold text-ink-900 mb-3">
            Tips Pencapaian Insentif
          </h3>
          <div className="space-y-2">
            {tips.map((tip, i) => (
              <div
                key={i}
                className={`p-3 rounded-xl border text-sm
                  ${tip.done
                    ? "bg-success-50 border-success-200 text-success-700"
                    : "bg-warning-50 border-warning-200 text-warning-700"
                  }`}
              >
                {tip.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MSISDN TABLES */}
      <div className="mt-8">
        <div className="flex justify-between items-end mb-3">
           <h3 className="text-base sm:text-lg font-bold text-ink-900">
             List MSISDN FWA
             <span className="text-xs font-normal text-ink-500 ml-2">
               (Real Table Count: {actualCountedTable} Units)
             </span>
           </h3>
           {dsf.fwaUnits !== actualCountedTable && (
             <span className="text-[10px] text-warning-600 font-semibold bg-warning-50 px-2 py-1 rounded">
               Data Pusat & Mentah Berbeda!
             </span>
           )}
        </div>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Search MSISDN..."
            value={searchMsisdn}
            onChange={(e) => setSearchMsisdn(e.target.value)}
            className="w-full border border-ink-200 rounded-xl px-3 py-2.5 text-sm
                       focus:outline-none focus:ring-4 focus:ring-brand-50 focus:border-brand-600
                       transition"
          />
        </div>

        {/* RAW DATA — COUNTED */}
        <div className="flex items-start justify-between mb-2 gap-2 flex-wrap">
          <h3 className="text-sm sm:text-base font-bold text-brand-700">
            Raw Data (Counted)
          </h3>
          <CopyImageButton
            targetRef={rawCountedRef}
            dataDates={dataDates}
            reportName="Raw Data Counted"
          />
        </div>

        <div ref={rawCountedRef} className="overflow-x-auto rounded-xl border border-ink-200">
          <table className="min-w-full text-xs sm:text-sm whitespace-nowrap text-left">
            <thead className="bg-ink-50">
              <tr>
                <th className="p-3 font-semibold text-ink-500 uppercase tracking-wider text-[10px]">No</th>
                <th className="p-3 font-semibold text-ink-500 uppercase tracking-wider text-[10px]">MSISDN</th>
                <th className="p-3 font-semibold text-ink-500 uppercase tracking-wider text-[10px]">GA Date</th>
                <th className="p-3 font-semibold text-ink-500 uppercase tracking-wider text-[10px]">Device</th>
                <th className="p-3 font-semibold text-ink-500 uppercase tracking-wider text-[10px]">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {filteredRawCounted.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-4 text-center text-ink-500">
                    No registered MSISDN
                  </td>
                </tr>
              ) : (
                filteredRawCounted.map((row, i) => (
                  <tr key={i} className="border-t border-ink-100 bg-brand-50">
                    <td className="p-3">{i + 1}</td>
                    <td className="p-3 font-mono text-xs">{maskMsisdn(row.MSISDN)}</td>
                    <td className="p-3">{formatGA(row.GA_DATE)}</td>
                    <td className="p-3">
                      {row?.DEVICE?.trim?.() || row?.DEVICE || "-"}
                      {Number(row?.VALID_FLAG) > 1 && (
                        <span className="ml-2 text-[10px] bg-brand-200 text-brand-800 px-1.5 py-0.5 rounded font-bold">
                          +{row.VALID_FLAG} Units
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-brand-700 font-semibold">{row.REMARKS}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* RAW DATA — INVALID */}
        <div className="mt-6">
          <h3 className="text-sm sm:text-base font-bold text-danger-700 mb-2">
            Raw Data (Invalid)
          </h3>
          <div className="overflow-x-auto rounded-xl border border-ink-200">
            <table className="min-w-full text-xs sm:text-sm whitespace-nowrap text-left">
              <thead className="bg-ink-50">
                <tr>
                  <th className="p-3 font-semibold text-ink-500 uppercase tracking-wider text-[10px]">No</th>
                  <th className="p-3 font-semibold text-ink-500 uppercase tracking-wider text-[10px]">MSISDN</th>
                  <th className="p-3 font-semibold text-ink-500 uppercase tracking-wider text-[10px]">GA Date</th>
                  <th className="p-3 font-semibold text-ink-500 uppercase tracking-wider text-[10px]">Device</th>
                  <th className="p-3 font-semibold text-ink-500 uppercase tracking-wider text-[10px]">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {filteredRawInvalid.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-4 text-center text-ink-500">
                      No invalid data
                    </td>
                  </tr>
                ) : (
                  filteredRawInvalid.map((row, i) => (
                    <tr key={i} className="border-t border-ink-100 bg-danger-50">
                      <td className="p-3">{i + 1}</td>
                      <td className="p-3 font-mono text-xs">{maskMsisdn(row.MSISDN)}</td>
                      <td className="p-3">{formatGA(row.GA_DATE)}</td>
                      <td className="p-3">{row?.DEVICE?.trim?.() || row?.DEVICE || "-"}</td>
                      <td className="p-3 text-danger-700 font-semibold">{row.REMARKS}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ADJUSTMENT — COUNTED */}
        {filteredAdjValid.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm sm:text-base font-bold text-success-700 mb-2">
              Adjustment (Counted)
            </h3>
            <div className="overflow-x-auto rounded-xl border border-ink-200">
              <table className="min-w-full text-xs sm:text-sm whitespace-nowrap text-left">
                <thead className="bg-ink-50">
                  <tr>
                    <th className="p-3 font-semibold text-ink-500 uppercase tracking-wider text-[10px]">No</th>
                    <th className="p-3 font-semibold text-ink-500 uppercase tracking-wider text-[10px]">MSISDN</th>
                    <th className="p-3 font-semibold text-ink-500 uppercase tracking-wider text-[10px]">GA Date</th>
                    <th className="p-3 font-semibold text-ink-500 uppercase tracking-wider text-[10px]">Device</th>
                    <th className="p-3 font-semibold text-ink-500 uppercase tracking-wider text-[10px]">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAdjValid.map((row, i) => (
                    <tr key={i} className="border-t border-ink-100 bg-success-50">
                      <td className="p-3">{i + 1}</td>
                      <td className="p-3 font-mono text-xs">{maskMsisdn(row.MSISDN)}</td>
                      <td className="p-3">{formatGA(row.GA_DATE)}</td>
                      <td className="p-3">
                        {row?.DEVICE?.trim?.() || row?.DEVICE || "-"}
                        {Number(row?.VALID_FLAG) > 1 && (
                          <span className="ml-2 text-[10px] bg-success-200 text-success-800 px-1.5 py-0.5 rounded font-bold">
                            +{row.VALID_FLAG} Units
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-success-700 font-semibold">{row.REMARKS}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ADJUSTMENT — INVALID */}
        {filteredAdjInvalid.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm sm:text-base font-bold text-danger-700 mb-2">
              Adjustment (Invalid)
            </h3>
            <div className="overflow-x-auto rounded-xl border border-ink-200">
              <table className="min-w-full text-xs sm:text-sm whitespace-nowrap text-left">
                <thead className="bg-ink-50">
                  <tr>
                    <th className="p-3 font-semibold text-ink-500 uppercase tracking-wider text-[10px]">No</th>
                    <th className="p-3 font-semibold text-ink-500 uppercase tracking-wider text-[10px]">MSISDN</th>
                    <th className="p-3 font-semibold text-ink-500 uppercase tracking-wider text-[10px]">GA Date</th>
                    <th className="p-3 font-semibold text-ink-500 uppercase tracking-wider text-[10px]">Device</th>
                    <th className="p-3 font-semibold text-ink-500 uppercase tracking-wider text-[10px]">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAdjInvalid.map((row, i) => (
                    <tr key={i} className="border-t border-ink-100 bg-danger-100">
                      <td className="p-3">{i + 1}</td>
                      <td className="p-3 font-mono text-xs">{maskMsisdn(row.MSISDN)}</td>
                      <td className="p-3">{formatGA(row.GA_DATE)}</td>
                      <td className="p-3">{row?.DEVICE?.trim?.() || row?.DEVICE || "-"}</td>
                      <td className="p-3 text-danger-700 font-semibold">{row.REMARKS}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}