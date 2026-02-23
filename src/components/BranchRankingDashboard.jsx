import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

const REGION_CSV_PATH = "/REGION_202602.csv";
const TARGET_PER_DSF = 20;

export default function BranchRankingDashboard() {
  const [data, setData] = useState([]);
  const [scope, setScope] = useState("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(REGION_CSV_PATH);
        const text = await res.text();

        const lines = text.split("\n").filter((l) => l.trim() !== "");

        const rows = lines.slice(1).map((line) => {
          const [REGION, BRANCH, QTY_DSF, FWA_SALES] =
            line.split(";");

          const qty = Number(QTY_DSF);
          const sales = Number(FWA_SALES);
          const target = qty * TARGET_PER_DSF;
          const achievement =
            target > 0 ? (sales / target) * 100 : 0;

          return {
            region: REGION,
            branch: BRANCH,
            qtyDsf: qty,
            sales,
            target,
            achievement,
          };
        });

        setData(rows);
      } catch (err) {
        console.error("Failed to load REGION CSV", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const filteredData = useMemo(() => {
    if (scope === "ALL") return data;
    return data.filter((d) => d.region === scope);
  }, [data, scope]);

  // ✅ Ranking selalu berdasarkan Achievement %
  const rankedData = useMemo(() => {
    const sorted = [...filteredData].sort(
      (a, b) => b.achievement - a.achievement
    );

    return sorted.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
  }, [filteredData]);

  function medal(rank) {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  }

  function getProgressColor(percent) {
    if (percent >= 100) return "bg-green-500";
    if (percent >= 75) return "bg-yellow-500";
    return "bg-red-500";
  }

  if (loading) {
    return (
      <div className="card py-8 text-center">
        Loading branch ranking...
      </div>
    );
  }

  return (
    <motion.div
      className="text-left"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* HEADER */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold">
          Branch Performance Ranking
        </h2>

        <p className="text-sm text-gray-500 mt-1">
          Ranking berdasarkan Achievement per Branch
        
        </p>
      </div>

      {/* FILTER REGION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="filter-group">
          {["ALL", "NSA", "CSA", "SSA"].map((r) => (
            <button
              key={r}
              onClick={() => setScope(r)}
              className={`filter-btn ${
                scope === r ? "active" : ""
              }`}
            >
              {r === "ALL" ? "All Sumatera" : r}
            </button>
          ))}
        </div>

        <div>

        </div>
      </div>

      {/* TABLE */}
      <div className="table-wrapper">
        <table className="modern-table">
          <thead>
            <tr>
              <th className="text-center">Rank</th>
              <th className="text-left">Branch</th>
              <th className="text-center">Region</th>
              <th className="text-center">DSF</th>
              <th className="text-right">Sales</th>
              <th className="text-right">Target</th>
              <th className="text-right">Achievement</th>
            </tr>
          </thead>

          <tbody>
            {rankedData.map((item) => (
              <tr
                key={item.branch}
                className={item.rank <= 3 ? "top-row" : ""}
              >
                <td className="text-center">
                  {item.rank <= 3 ? (
                    <span className="text-2xl">
                      {medal(item.rank)}
                    </span>
                  ) : (
                    `#${item.rank}`
                  )}
                </td>

                <td className="text-left font-medium">
                  {item.branch}
                </td>

                <td className="text-center">
                  {item.region}
                </td>

                <td className="text-center">
                  {item.qtyDsf}
                </td>

                <td className="text-right font-semibold">
                  {item.sales}
                </td>

                <td className="text-right">
                  {item.target}
                </td>

                <td className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="progress-bg">
                      <div
                        className={`progress-fill ${getProgressColor(
                          item.achievement
                        )}`}
                        style={{
                          width: `${Math.min(
                            item.achievement,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="percent-text">
                      {item.achievement.toFixed(1)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}