import React, { useMemo, useState } from "react";

const TARGET_DSF = 7500000;
const FWA_PRICE = 350000;
const TARGET_FWA_PER_DSF = 20;

function normalizeRegion(region) {
  if (!region) return "Unknown";
  const val = region.toLowerCase();
  if (val.includes("northern")) return "NSA";
  if (val.includes("southern")) return "SSA";
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
  onSelectTL 
}) {
  const initialFilters = {
    BRAND: [],
    REGION: [],
    BRANCH: [],
    MC: [],
    TL: [],
    DSF: [],
  };

  const [rankType, setRankType] = useState("DSF");
  const [sortBy, setSortBy] = useState("achievement"); // NEW
  const [filters, setFilters] = useState(initialFilters);
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [openFilter, setOpenFilter] = useState(null);

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
        case "DSF":
          key = row.idDsf;
          name = row.namaDsf;
          branch = row.branch;
          break;
        case "TL":
          key = row.idTl;
          name = row.namaTl;
          break;
        case "MC":
          key = row.mc;
          name = row.mc;
          break;
        case "BRANCH":
          key = row.branch;
          name = row.branch;
          break;
        case "REGION":
          key = normalizeRegion(row.region);
          name = normalizeRegion(row.region);
          break;
        default:
          break;
      }

      if (!grouped[key]) {
        grouped[key] = {
          id: key,
          name: name,
          branch: branch || "-",
          totalFWA: 0,
          rebuyRevenue: 0,
          dsfSet: new Set(),
        };
      }

      grouped[key].totalFWA += Number(row.fwaUnits) || 0;
      grouped[key].rebuyRevenue += Number(row.rebuyRevenue) || 0;
      grouped[key].dsfSet.add(row.idDsf);
    });

    let result = Object.values(grouped).map((item) => {
      const dsfCount = item.dsfSet.size;
      const totalRevenue = item.totalFWA * FWA_PRICE + item.rebuyRevenue;

      const targetRevenue =
        rankType === "DSF"
          ? TARGET_DSF
          : TARGET_DSF * dsfCount;

      const targetFWA =
        rankType === "DSF"
          ? TARGET_FWA_PER_DSF
          : TARGET_FWA_PER_DSF * dsfCount;

      const achievement = (totalRevenue / targetRevenue) * 100;

      return {
        ...item,
        totalRevenue,
        targetRevenue,
        targetFWA,
        achievement,
      };
    });

    // UPDATED SORTING (logic lama tidak diubah, hanya mekanisme urut)
    result.sort((a, b) => {
      switch (sortBy) {
        case "fwa":
          return b.totalFWA - a.totalFWA;
        case "rebuy":
          return b.rebuyRevenue - a.rebuyRevenue;
        case "revenue":
          return b.totalRevenue - a.totalRevenue;
        case "achievement":
        default:
          return b.achievement - a.achievement;
      }
    });

    return result.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
  }, [filteredData, rankType, sortBy]);

  function formatCurrency(num) {
    return num.toLocaleString("id-ID");
  }

  function achievementColor(val) {
    if (val >= 100) return "text-emerald-600";
    if (val >= 80) return "text-amber-500";
    return "text-rose-600";
  }

  /* ================= CLICK HANDLER ================= */

function handleRowClick(item) {
  if (rankType === "DSF" && onSelectDSF) {
    const dsfDetail = dsfData.find(d => d.idDsf === item.id);
    if (dsfDetail) onSelectDSF(dsfDetail);
  }

if (rankType === "TL" && onSelectTL) {
  const tlDsfs = dsfData.filter(d => d.idTl === item.id);

  if (tlDsfs.length > 0) {
    onSelectTL({
      tlId: item.id,      // ✅ ID TL
      tlName: item.name,  // ✅ Nama TL
      dsfs: tlDsfs,
    });
  }
}
}
  /* ================= UI ================= */

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">

      <h2 className="text-2xl font-bold mb-6">
        {`Performance Leaderboard ${toTitleCase(rankType.toUpperCase())}`}
      </h2>

      {/* LEVEL SELECTOR */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {["DSF", "TL", "MC", "BRANCH", "REGION"].map((type) => (
          <button
            key={type}
            onClick={() => setRankType(type)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border ${
              rankType === type
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* FILTER */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="text-base font-semibold text-gray-700">
            Filter:
          </div>
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
                  ▼
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

                    <div className="border-t p-2 flex justify-between">
                      <button
                        onClick={() =>
                          setDraftFilters((prev) => ({
                            ...prev,
                            [level]: [],
                          }))
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

      {/* SORT SELECTOR */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div className="text-sm font-semibold text-gray-700">
          Sort By:
        </div>

        <div className="flex gap-2 flex-wrap">
          {[
            { key: "achievement", label: "Achievement" },
            { key: "revenue", label: "Revenue" },
            { key: "fwa", label: "FWA" },
            { key: "rebuy", label: "Rebuy" },
          ].map((option) => (
            <button
              key={option.key}
              onClick={() => setSortBy(option.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                sortBy === option.key
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full text-sm whitespace-nowrap text-left">
          <thead className="bg-gray-100">
            {rankType === "DSF" ? (
              <tr>
                <th className="p-3">Rank</th>
                <th className="p-3">ID DSF</th>
                <th className="p-3">Nama DSF</th>
                <th className="p-3">Branch</th>
                <th className="p-3">FWA</th>
                <th className="p-3">Rebuy</th>
                <th className="p-3">Total Revenue</th>
                <th className="p-3">Target</th>
                <th className="p-3">Achievement</th>
              </tr>
            ) : (
              <tr>
                <th className="p-3">Rank</th>
                <th className="p-3">{toTitleCase(rankType)}</th>
                <th className="p-3">Target FWA</th>
                <th className="p-3">FWA</th>
                <th className="p-3">Rebuy</th>
                <th className="p-3">Target Revenue</th>
                <th className="p-3">Total Revenue</th>
                <th className="p-3">Achievement</th>
              </tr>
            )}
          </thead>

          <tbody>
            {rankedData.map((item) => (
<tr
  key={item.rank}
  onClick={() => handleRowClick(item)}
  className="border-t hover:bg-gray-50 cursor-pointer"
>
                  {rankType === "DSF" ? (
                  <>
                    <td className="p-3">{item.rank}</td>
                    <td className="p-3">{item.id}</td>
                    <td className="p-3">{item.name}</td>
                    <td className="p-3">{item.branch}</td>
                    <td className="p-3">{item.totalFWA}</td>
                    <td className="p-3">Rp {formatCurrency(item.rebuyRevenue)}</td>
                    <td className="p-3 font-semibold">Rp {formatCurrency(item.totalRevenue)}</td>
                    <td className="p-3">Rp {formatCurrency(TARGET_DSF)}</td>
                    <td className={`p-3 font-bold ${achievementColor(item.achievement)}`}>
                      {item.achievement.toFixed(1)}%
                    </td>
                  </>
                ) : (
                  <>
                    <td className="p-3">{item.rank}</td>
                    <td className="p-3">{item.name}</td>
                    <td className="p-3">{item.targetFWA}</td>
                    <td className="p-3">{item.totalFWA}</td>
                    <td className="p-3">Rp {formatCurrency(item.rebuyRevenue)}</td>
                    <td className="p-3">Rp {formatCurrency(item.targetRevenue)}</td>
                    <td className="p-3 font-semibold">Rp {formatCurrency(item.totalRevenue)}</td>
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