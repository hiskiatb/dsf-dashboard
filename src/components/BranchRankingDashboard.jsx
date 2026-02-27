import React, { useMemo, useState } from "react";

const TARGET_DSF = 7500000;
const FWA_PRICE = 350000;

function normalizeRegion(region) {
  if (!region) return "Unknown";
  const val = region.toLowerCase();
  if (val.includes("northern")) return "Nsa";
  if (val.includes("southern")) return "Ssa";
  if (val.includes("central")) return "Csa";
  return region.charAt(0).toUpperCase() + region.slice(1);
}

function toTitleCase(str) {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function RankingDashboard({ dsfData = [] }) {
  const initialFilters = {
    BRAND: [],
    REGION: [],
    BRANCH: [],
    MC: [],
    TL: [],
    DSF: [],
  };

  const [rankType] = useState("DSF");
  const [filters, setFilters] = useState(initialFilters);
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [openFilter, setOpenFilter] = useState(null);

  /* ================= FILTERED DATA ================= */

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

  /* ================= OPTIONS ================= */

  function getOptions(level) {
    const set = new Set();

    dsfData.forEach((row) => {
      switch (level) {
        case "BRAND":
          set.add("IM3");
          set.add("3ID");
          break;
        case "REGION":
          set.add(normalizeRegion(row.region));
          break;
        case "BRANCH":
          set.add(row.branch);
          break;
        case "MC":
          set.add(row.mc);
          break;
        case "TL":
          set.add(row.namaTl);
          break;
        case "DSF":
          set.add(row.namaDsf);
          break;
        default:
          break;
      }
    });

    return [...set];
  }

  /* ================= GROUPING ================= */

  const rankedData = useMemo(() => {
    const grouped = {};

    filteredData.forEach((row) => {
      const key = row.idDsf;

      if (!grouped[key]) {
        grouped[key] = {
          name: row.namaDsf,
          totalFWA: 0,
          rebuyRevenue: 0,
        };
      }

      grouped[key].totalFWA += Number(row.fwaUnits) || 0;
      grouped[key].rebuyRevenue += Number(row.rebuyRevenue) || 0;
    });

    let result = Object.values(grouped).map((item) => {
      const totalRevenue = item.totalFWA * FWA_PRICE + item.rebuyRevenue;
      const achievement = (totalRevenue / TARGET_DSF) * 100;

      return {
        ...item,
        totalRevenue,
        achievement,
      };
    });

    result.sort((a, b) => b.totalRevenue - a.totalRevenue);

    return result.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
  }, [filteredData]);

  /* ================= HELPERS ================= */

  function achievementColor(val) {
    if (val >= 100) return "text-emerald-600";
    if (val >= 80) return "text-amber-500";
    return "text-rose-600";
  }

  function formatCurrency(num) {
    return num.toLocaleString("id-ID");
  }

  function clearAllFilters() {
    setFilters(initialFilters);
    setDraftFilters(initialFilters);
  }

  function buildSubheading() {
    const activeFilters = Object.entries(filters)
      .filter(([_, v]) => v.length > 0)
      .map(([k, v]) => `${toTitleCase(k)}: ${v.join(", ")}`);

    if (activeFilters.length === 0) {
      return "Dsf Level • All Scope";
    }

    return `Dsf Level • ${activeFilters.join(" • ")}`;
  }

  /* ================= UI ================= */

  return (
    <div className="bg-white rounded-2xl shadow-xl p-4 md:p-6">

      {/* HEADING */}
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold">
          Performance Leaderboard
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {buildSubheading()}
        </p>
      </div>

      {/* FILTER SECTION */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div></div>
          <button
            onClick={clearAllFilters}
            className="text-sm text-red-600 font-medium hover:underline"
          >
            Clear All Filters
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {["BRAND","REGION","BRANCH","MC","TL","DSF"].map((level) => {
            const options = getOptions(level);

            return (
              <div key={level} className="relative">
                <button
                  onClick={() =>
                    setOpenFilter(openFilter === level ? null : level)
                  }
                  className="w-full border rounded-lg px-4 py-2 flex justify-between items-center text-sm"
                >
                  <span>
                    {toTitleCase(level)}
                    {filters[level].length > 0 && (
                      <span className="ml-2 text-blue-600 text-xs">
                        ({filters[level].length})
                      </span>
                    )}
                  </span>
                  <span>▼</span>
                </button>

                {openFilter === level && (
                  <div className="absolute z-20 bg-white border mt-2 rounded-xl shadow-lg w-full">
                    
                    <div className="max-h-52 overflow-y-auto p-3">
                      <label className="flex items-center gap-2 text-sm py-1 font-medium">
                        <input
                          type="checkbox"
                          checked={draftFilters[level].length === options.length}
                          onChange={() =>
                            setDraftFilters((prev) => ({
                              ...prev,
                              [level]:
                                prev[level].length === options.length
                                  ? []
                                  : options,
                            }))
                          }
                        />
                        Select All
                      </label>

                      {options.map((val) => (
                        <label key={val} className="flex items-center gap-2 text-sm py-1">
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
                          />
                          {val}
                        </label>
                      ))}
                    </div>

                    <div className="sticky bottom-0 bg-white border-t p-2 flex justify-between">
                      <button
                        onClick={() =>
                          setDraftFilters((prev) => ({ ...prev, [level]: [] }))
                        }
                        className="text-xs text-gray-500"
                      >
                        Clear
                      </button>

                      <button
                        onClick={() => {
                          setFilters(draftFilters);
                          setOpenFilter(null);
                        }}
                        className="text-xs bg-blue-600 text-white px-3 py-1 rounded-md"
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

      {/* TABLE */}
      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full text-xs md:text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 whitespace-nowrap">Rank</th>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 whitespace-nowrap">Fwa</th>
              <th className="p-3 whitespace-nowrap">Rebuy</th>
              <th className="p-3 whitespace-nowrap">Total Revenue</th>
              <th className="p-3 whitespace-nowrap">Target</th>
              <th className="p-3 whitespace-nowrap">Achievement</th>
            </tr>
          </thead>

          <tbody>
            {rankedData.map((item) => (
              <tr key={item.rank} className="border-t hover:bg-gray-50">
                <td className="p-3 whitespace-nowrap">{item.rank}</td>
                <td className="p-3 text-left break-words">{item.name}</td>
                <td className="p-3 whitespace-nowrap">{item.totalFWA}</td>
                <td className="p-3 whitespace-nowrap">
                  Rp {formatCurrency(item.rebuyRevenue)}
                </td>
                <td className="p-3 whitespace-nowrap font-semibold">
                  Rp {formatCurrency(item.totalRevenue)}
                </td>
                <td className="p-3 whitespace-nowrap">
                  Rp {formatCurrency(TARGET_DSF)}
                </td>
                <td className={`p-3 whitespace-nowrap font-bold ${achievementColor(item.achievement)}`}>
                  {item.achievement.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}