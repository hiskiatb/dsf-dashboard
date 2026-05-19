import React, { useMemo, useState } from "react";
import { useRef } from "react";
import CopyImageButton from "./CopyImageButton";
import { hitungInsentif } from "../utils";

const FWA_PRICE = 350000;
const TARGET_FWA_PER_DSF = 20;
const BASE_REVENUE_TARGET = 7500000;

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
  if (upperCaseWords.includes(str.toUpperCase())) {
    return str.toUpperCase();
  }
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function RankingDashboard({
  dsfData = [],
  onSelectDSF,
  onSelectTL,
  dataDates,
  month, // Menerima prop month dari App.js
}) {
  const initialFilters = {
    BRAND: [], REGION: [], BRANCH: [], MC: [], TL: [], DSF: [],
  };

  const [rankType, setRankType] = useState("DSF");
  const [sortBy, setSortBy] = useState("achievement");
  const [filters, setFilters] = useState(initialFilters);
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [openFilter, setOpenFilter] = useState(null);
  const tableRef = useRef(null);

  /* ================= FILTER ================= */
  const filteredData = useMemo(() => {
    return dsfData.filter((row) => {
      const region = normalizeRegion(row.region);
      if (filters.REGION.length && !filters.REGION.includes(region)) return false;
      if (filters.BRANCH.length && !filters.BRANCH.includes(row.branch)) return false;
      if (filters.MC.length && !filters.MC.includes(row.mc)) return false;
      if (filters.TL.length && !filters.TL.includes(row.namaTl)) return false;
      if (filters.DSF.length && !filters.DSF.includes(row.namaDsf)) return false;
      if (filters.BRAND.length && !filters.BRAND.includes(row.brand)) return false;
      return true;
    });
  }, [dsfData, filters]);

  function getOptions(level) {
    const set = new Set();
    dsfData.forEach((row) => {
      switch (level) {
        case "BRAND": set.add("IM3"); set.add("3ID"); break;
        case "REGION": set.add(normalizeRegion(row.region)); break;
        case "BRANCH": set.add(row.branch); break;
        case "MC": set.add(row.mc); break;
        case "TL": set.add(row.namaTl); break;
        case "DSF": set.add(row.namaDsf); break;
        default: break;
      }
    });
    return [...set];
  }

  function clearAllFilters() {
    setFilters(initialFilters);
    setDraftFilters(initialFilters);
  }

  /* ================= GROUPING ================= */
  const rankedData = useMemo(() => {
    const grouped = {};

    filteredData.forEach((row) => {
      let key, name, branch;
      switch (rankType) {
        case "DSF":    key = row.idDsf;  name = row.namaDsf; branch = row.branch; break;
        case "TL":     key = row.idTl;   name = row.namaTl; break;
        case "MC":     key = row.mc;     name = row.mc; break;
        case "BRANCH": key = row.branch; name = row.branch; break;
        case "REGION": key = normalizeRegion(row.region); name = normalizeRegion(row.region); break;
        default: break;
      }

      if (!grouped[key]) {
        grouped[key] = {
          id: key, name, branch: branch || "-",
          totalFWA: 0, targetFWA: 0, rebuyRevenue: 0, hajjRevenue: 0,
          totalIncentive: 0, dsfSet: new Set(), dsfIncentiveMap: new Map(),
        };
      }

      grouped[key].targetFWA += Number(row.targetFwa || row.TARGET_FWA || TARGET_FWA_PER_DSF);
      grouped[key].totalFWA += Number(row.fwaUnits) || 0;
      grouped[key].rebuyRevenue += Number(row.rebuyRevenue) || 0;
      grouped[key].hajjRevenue = (grouped[key].hajjRevenue || 0) + (Number(row.revHajj) || 0);

      const dsfId = row.idDsf;

      if (!grouped[key].dsfIncentiveMap.has(dsfId)) {
        // PERHITUNGAN SENTRALISASI DARI UTILS.JS
        const c = hitungInsentif(row, month);
        
        grouped[key].dsfIncentiveMap.set(dsfId, c.incentive);
        grouped[key].totalIncentive += c.incentive;
      }
      grouped[key].dsfSet.add(row.idDsf);
    });

    let result = Object.values(grouped).map((item) => {
      const dsfCount = item.dsfSet.size;
      
      const totalRevenue = item.totalFWA * FWA_PRICE + item.rebuyRevenue + (item.hajjRevenue || 0);
      const targetRevenue = rankType === "DSF" ? BASE_REVENUE_TARGET : BASE_REVENUE_TARGET * dsfCount;
      const targetFWA = item.targetFWA;
      
      const achievement = (totalRevenue / targetRevenue) * 100;
      const fwaPercent = targetFWA ? (item.totalFWA / targetFWA) * 100 : 0;

      return { ...item, totalRevenue, targetRevenue, targetFWA, achievement, fwaPercent };
    });

    result.sort((a, b) => {
      switch (sortBy) {
        case "fwa":         return b.totalFWA - a.totalFWA;
        case "rebuy":       return b.rebuyRevenue - a.rebuyRevenue;
        case "hajj":        return (b.hajjRevenue || 0) - (a.hajjRevenue || 0);
        case "revenue":     return b.totalRevenue - a.totalRevenue;
        case "achievement":
        default:            return b.achievement - a.achievement;
      }
    });

    return result.map((item, index) => ({ ...item, rank: index + 1 }));
  }, [filteredData, rankType, sortBy, month]);

  function formatCurrency(num) {
    return num.toLocaleString("id-ID");
  }

  // === BRAND TOKEN COLORS ===
  function achievementColor(val) {
    const isSpecialMonth = month === "202604" || month === "202605";

    if (isSpecialMonth) {
      if (val >= 120) return "text-success-700";
      if (val >= 100) return "text-warning-700";
      return "text-danger-700";
    }

    if (val >= 100) return "text-success-700";
    if (val >= 80) return "text-warning-700";
    return "text-danger-700";
  }

  function fwaPercentColor(val) {
    if (val >= 100) return "text-success-700";
    if (val >= 80)  return "text-warning-700";
    return "text-danger-700";
  }

  function handleRowClick(item) {
    if (rankType === "DSF" && onSelectDSF) {
      const dsfDetail = dsfData.find((d) => d.idDsf === item.id);
      if (dsfDetail) onSelectDSF(dsfDetail);
    }
    if (rankType === "TL" && onSelectTL) {
      const tlDsfs = dsfData.filter((d) => d.idTl === item.id);
      if (tlDsfs.length > 0) {
        onSelectTL({ tlId: item.id, tlName: item.name, dsfs: tlDsfs });
      }
    }
  }

  // ===== DYNAMIC TITLE =====
  const brandFilter = filters.BRAND;
  let brandLabel = "";
  if (brandFilter.length === 1) {
    if (brandFilter[0].toLowerCase() === "im3") brandLabel = "IM3";
    else if (brandFilter[0].toLowerCase() === "3id") brandLabel = "3ID";
  }
  const sortLabelMap = {
    achievement: "Achievement",
    revenue: "Revenue",
    fwa: "FWA",
    rebuy: "Rebuy FWA",
    hajj: "Rebuy Haji",
  };
  let title = `Leaderboard ${toTitleCase(rankType)} - ${sortLabelMap[sortBy]}`;
  if (brandLabel) title += ` ${brandLabel}`;

  return (
    <div className="bg-white rounded-2xl shadow-card border border-ink-200 p-4 sm:p-6">

      <h2 className="text-xl sm:text-2xl font-extrabold text-ink-900 mb-4 sm:mb-6 leading-tight">
        {title}
      </h2>

      {/* LEVEL SELECTOR */}
      <div className="flex gap-2 mb-5 overflow-x-auto -mx-1 px-1 pb-1 scrollbar-hide">
        {["DSF", "TL", "MC", "BRANCH", "REGION"].map((type) => (
          <button
            key={type}
            onClick={() => setRankType(type)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition
              ${rankType === type
                ? "bg-ink-900 text-white border-ink-900"
                : "bg-white text-ink-600 border-ink-200 hover:border-ink-300 hover:text-ink-900"
              }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* FILTER */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-bold text-ink-800">Filter:</div>
          <button
            onClick={clearAllFilters}
            className="text-xs sm:text-sm text-danger-600 font-semibold hover:underline"
          >
            Clear All Filters
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
          {["BRAND", "REGION", "BRANCH", "MC", "TL", "DSF"].map((level) => {
            const options = getOptions(level);

            return (
              <div key={level} className="relative">
                <button
                  onClick={() => setOpenFilter(openFilter === level ? null : level)}
                  className="w-full border border-ink-200 bg-white rounded-xl px-3 py-2 sm:px-4 sm:py-2.5
                             flex justify-between items-center text-xs sm:text-sm font-semibold text-ink-700
                             hover:border-ink-300 transition"
                >
                  <span className="truncate">
                    {toTitleCase(level)}
                    {filters[level].length > 0 && (
                      <span className="ml-1 text-brand-600 text-[10px] sm:text-xs font-bold">
                        ({filters[level].length})
                      </span>
                    )}
                  </span>
                  <span className="ml-1 text-ink-400 text-[10px]">▼</span>
                </button>

                {openFilter === level && (
                  <div className="absolute z-20 bg-white border border-ink-200 mt-2 rounded-xl shadow-pop w-full min-w-[200px]">
                    <div className="max-h-52 overflow-y-auto p-3">
                      <label className="flex items-center gap-2 text-sm py-1 font-semibold text-ink-800">
                        <input
                          type="checkbox"
                          checked={draftFilters[level].length === options.length}
                          onChange={() =>
                            setDraftFilters((prev) => ({
                              ...prev,
                              [level]: prev[level].length === options.length ? [] : options,
                            }))
                          }
                          className="accent-brand-600"
                        />
                        Select All
                      </label>

                      {options.map((val) => (
                        <label key={val} className="flex items-center gap-2 text-sm py-1 text-ink-700">
                          <input
                            type="checkbox"
                            checked={draftFilters[level].includes(val)}
                            onChange={() => {
                              setDraftFilters((prev) => {
                                const updated = prev[level].includes(val)
                                  ? prev[level].filter((v) => v !== val)
                                  : [...prev[level], val];
                                return { ...prev, [level]: updated };
                              });
                            }}
                            className="accent-brand-600"
                          />
                          {val}
                        </label>
                      ))}
                    </div>

                    <div className="border-t border-ink-100 p-2 flex justify-between">
                      <button
                        onClick={() => setDraftFilters((prev) => ({ ...prev, [level]: [] }))}
                        className="text-xs text-ink-500 hover:text-ink-800"
                      >
                        Clear
                      </button>
                      <button
                        onClick={() => {
                          setFilters(draftFilters);
                          setOpenFilter(null);
                        }}
                        className="text-xs bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-lg font-semibold transition"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SORT SELECTOR */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div className="text-sm font-bold text-ink-800">Sort By:</div>
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "achievement", label: "Achievement" },
            { key: "revenue", label: "Revenue" },
            { key: "fwa", label: "FWA" },
            { key: "rebuy", label: "Rebuy FWA" },
            { key: "hajj", label: "Rebuy Haji" },
          ].map((option) => (
            <button
              key={option.key}
              onClick={() => setSortBy(option.key)}
              className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold border transition
                ${sortBy === option.key
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white text-ink-600 border-ink-200 hover:bg-ink-50 hover:border-ink-300"
                }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* TABLE HEADER */}
      <div className="flex items-center justify-between mt-4 pt-4 pb-3 border-t border-ink-200 gap-2 flex-wrap">
        <div className="text-base sm:text-lg font-bold text-ink-800">
          Leaderboard Table
        </div>
        <CopyImageButton
          targetRef={tableRef}
          dataDates={dataDates}
          filters={filters}
          rankType={rankType}
          sortBy={sortBy}
        />
      </div>

      {/* TABLE */}
      <div ref={tableRef} className="overflow-x-auto rounded-xl border border-ink-200">
        <table className="min-w-full text-xs sm:text-sm whitespace-nowrap text-left">
          <thead className="bg-ink-50">
            {rankType === "DSF" ? (
              <tr>
                <th className="p-3 font-bold text-ink-500 uppercase tracking-wider text-[10px]">Rank</th>
                <th className="p-3 font-bold text-ink-500 uppercase tracking-wider text-[10px]">ID DSF</th>
                <th className="p-3 font-bold text-ink-500 uppercase tracking-wider text-[10px]">Nama DSF</th>
                <th className="p-3 font-bold text-ink-500 uppercase tracking-wider text-[10px]">Branch</th>
                <th className="p-3 font-bold text-ink-500 uppercase tracking-wider text-[10px]">Target FWA</th>
                <th className="p-3 font-bold text-ink-500 uppercase tracking-wider text-[10px]">FWA</th>
                <th className="p-3 font-bold text-ink-500 uppercase tracking-wider text-[10px]">% FWA</th>
                <th className="p-3 font-bold text-ink-500 uppercase tracking-wider text-[10px]">Rebuy FWA</th>
                <th className="p-3 font-bold text-ink-500 uppercase tracking-wider text-[10px]">Rebuy Haji</th>
                <th className="p-3 font-bold text-ink-500 uppercase tracking-wider text-[10px]">Total Revenue</th>
                <th className="p-3 font-bold text-ink-500 uppercase tracking-wider text-[10px]">Target</th>
                <th className="p-3 font-bold text-ink-500 uppercase tracking-wider text-[10px]">% Revenue</th>
                <th className="p-3 font-bold text-ink-500 uppercase tracking-wider text-[10px]">Incentive</th>
              </tr>
            ) : (
              <tr>
                <th className="p-3 font-bold text-ink-500 uppercase tracking-wider text-[10px]">Rank</th>
                <th className="p-3 font-bold text-ink-500 uppercase tracking-wider text-[10px]">{toTitleCase(rankType)}</th>
                <th className="p-3 font-bold text-ink-500 uppercase tracking-wider text-[10px]">Target FWA</th>
                <th className="p-3 font-bold text-ink-500 uppercase tracking-wider text-[10px]">FWA</th>
                <th className="p-3 font-bold text-ink-500 uppercase tracking-wider text-[10px]">% FWA</th>
                <th className="p-3 font-bold text-ink-500 uppercase tracking-wider text-[10px]">Rebuy FWA</th>
                <th className="p-3 font-bold text-ink-500 uppercase tracking-wider text-[10px]">Rebuy Haji</th>
                <th className="p-3 font-bold text-ink-500 uppercase tracking-wider text-[10px]">Target Revenue</th>
                <th className="p-3 font-bold text-ink-500 uppercase tracking-wider text-[10px]">Total Revenue</th>
                <th className="p-3 font-bold text-ink-500 uppercase tracking-wider text-[10px]">% Revenue</th>
              </tr>
            )}
          </thead>

          <tbody>
            {rankedData.map((item) => (
              <tr
                key={item.rank}
                onClick={() => handleRowClick(item)}
                className="border-t border-ink-100 hover:bg-ink-50 cursor-pointer transition"
              >
                {rankType === "DSF" ? (
                  <>
                    <td className="p-3 font-bold text-ink-900">{item.rank}</td>
                    <td className="p-3 font-mono text-xs">{item.id}</td>
                    <td className="p-3 text-ink-800">{item.name}</td>
                    <td className="p-3">{item.branch}</td>
                    <td className="p-3">{item.targetFWA}</td>
                    <td className="p-3 font-semibold">{item.totalFWA}</td>
                    <td className={`p-3 font-bold ${fwaPercentColor(item.fwaPercent)}`}>
                      {item.fwaPercent.toFixed(1)}%
                    </td>
                    <td className="p-3">Rp {formatCurrency(item.rebuyRevenue)}</td>
                    <td className="p-3">Rp {formatCurrency(item.hajjRevenue || 0)}</td>
                    <td className="p-3 font-bold text-ink-900">
                      Rp {formatCurrency(item.totalRevenue)}
                    </td>
                    <td className="p-3">Rp {formatCurrency(item.targetRevenue)}</td>
                    <td className={`p-3 font-bold ${achievementColor(item.achievement)}`}>
                      {item.achievement.toFixed(1)}%
                    </td>
                    <td
                      className={`p-3 font-bold ${
                        item.totalIncentive === 0
                          ? "text-danger-700 bg-danger-50"
                          : item.totalIncentive >= 500000
                          ? "text-success-700 bg-success-50"
                          : "text-warning-700 bg-warning-50"
                      }`}
                    >
                      Rp {formatCurrency(item.totalIncentive)}
                    </td>
                  </>
                ) : (
                  <>
                    <td className="p-3 font-bold text-ink-900">{item.rank}</td>
                    <td className="p-3 text-ink-800">{item.name}</td>
                    <td className="p-3">{item.targetFWA}</td>
                    <td className="p-3 font-semibold">{item.totalFWA}</td>
                    <td className={`p-3 font-bold ${fwaPercentColor(item.fwaPercent)}`}>
                      {item.fwaPercent.toFixed(1)}%
                    </td>
                    <td className="p-3">Rp {formatCurrency(item.rebuyRevenue)}</td>
                    <td className="p-3">Rp {formatCurrency(item.hajjRevenue || 0)}</td>
                    <td className="p-3">Rp {formatCurrency(item.targetRevenue)}</td>
                    <td className="p-3 font-bold text-ink-900">
                      Rp {formatCurrency(item.totalRevenue)}
                    </td>
                    <td className={`p-3 font-bold ${achievementColor(item.achievement)}`}>
                      {item.achievement.toFixed(1)}%
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}