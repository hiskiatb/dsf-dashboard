import React from "react";
import { motion } from "framer-motion";
import Pill from "./Pill";
import Ring from "./Ring";

// ================================
// MAINTENANCE FLAG
// ================================
const MAINTENANCE_MODE = true;

// ================================
// SAFE NUMBER PARSER (FIX TOTAL)
// ================================
const toNumber = (val) => {
  if (val === null || val === undefined) return 0;

  let str = String(val).trim();
  if (str === "" || str === "-" || str === " - ") return 0;

  // HANDLE PERCENT
  if (str.includes("%")) {
    const num = parseFloat(str.replace("%", "").replace(",", "."));
    return isNaN(num) ? 0 : num;
  }

  // CLEAN
  str = str.replace(/[^\d.,-]/g, "");

  // FORMAT INDONESIA
  if (str.includes(".") && !str.includes(",")) {
    str = str.replace(/\./g, "");
  }

  if (str.includes(",")) {
    str = str.replace(",", ".");
  }

  const num = Number(str);
  return isNaN(num) ? 0 : num;
};

// ================================
// FORMATTER
// ================================
const formatIDR = (num) => {
  if (!num || isNaN(num)) return "Rp 0";
  return "Rp " + Number(num).toLocaleString("id-ID");
};

const formatDate = (date) => {
  if (!date) return "-";

  if (/^\d{8}$/.test(date)) {
    const y = date.slice(0, 4);
    const m = date.slice(4, 6);
    const d = date.slice(6, 8);
    return new Date(`${y}-${m}-${d}`).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  const parsed = new Date(date);
  if (isNaN(parsed)) return "-";

  return parsed.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// ================================
// CALCULATION ENGINE
// ================================
function calculateGSE(gse) {
  const sellIn4G = toNumber(gse.sellIn4G);
  const sellIn5G = toNumber(gse.sellIn5G);
  const ga4G = toNumber(gse.ga4G);
  const ga5G = toNumber(gse.ga5G);
  const ono = toNumber(gse.actualOno);

  const targetOno = toNumber(gse.targetOno) || 30;
  const targetGa = toNumber(gse.targetGa) || 60;

  const totalSellIn = sellIn4G + sellIn5G;
  const totalGA = ga4G + ga5G;

  const onoPercent =
    targetOno > 0 ? Math.min((ono / targetOno) * 100, 100) : 0;

  const gaPercent =
    targetGa > 0 ? Math.min((totalGA / targetGa) * 100, 100) : 0;

  // INCENTIVE
  const inc4G = sellIn4G >= 3 ? sellIn4G * 5000 : sellIn4G * 3000;
  const inc5G = sellIn5G * 25000;
  const incGA4G = ga4G * 5000;
  const incGA5G = ga5G * 40000;

  return {
    ono,
    totalGA,
    totalSellIn,
    sellIn4G,
    sellIn5G,
    ga4G,
    ga5G,
    onoPercent,
    gaPercent,
    incSellIn: inc4G + inc5G,
    incGA: incGA4G + incGA5G,
    totalIncentive: inc4G + inc5G + incGA4G + incGA5G,
    targetOno,
    targetGa,
  };
}

// ================================
// COMPONENT
// ================================
export default function GSECard({ gse }) {

  // ================================
  // MAINTENANCE VIEW
  // ================================
  if (MAINTENANCE_MODE) {
    return (
      <div className="bg-white rounded-2xl shadow p-6 text-center space-y-2">
        <div className="text-lg font-semibold text-gray-700">
          🚧 Under Maintenance
        </div>
        <div className="text-sm text-gray-500">
          Fitur GSE Dashboard sedang dalam pengembangan dan akan segera tersedia.
        </div>
      </div>
    );
  }

  const c = calculateGSE(gse);

  const onoTone =
    c.onoPercent >= 80 ? "success" : c.onoPercent >= 50 ? "warning" : "danger";

  const gaTone =
    c.gaPercent >= 80 ? "success" : c.gaPercent >= 50 ? "warning" : "danger";

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >

      {/* CARD 1: NAMA */}
      <div className="bg-white rounded-2xl shadow p-4 flex justify-between items-center">
        <div>
          <div className="text-lg font-semibold">{gse.namaGse || "-"}</div>
          <div className="text-sm text-gray-500">{gse.idGse || "-"}</div>
        </div>
        <Pill variant="info">{gse.brand || "-"}</Pill>
      </div>

      {/* CARD 2: REGION & BRANCH */}
      <div className="bg-white rounded-2xl shadow p-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-gray-400">Region</div>
          <div>{gse.region || "-"}</div>
        </div>
        <div>
          <div className="text-gray-400">Branch</div>
          <div>{gse.branch || "-"}</div>
        </div>
      </div>

      {/* CARD 3: MICRO CLUSTER */}
      <div className="bg-white rounded-2xl shadow p-4 text-sm">
        <div className="text-gray-400">Micro Cluster</div>
        <div>{gse.microCluster || "-"}</div>
      </div>

      {/* DASHBOARD */}
      <div className="bg-white rounded-2xl shadow p-4 space-y-4">

        {/* RING */}
        <div className="grid grid-cols-2 gap-4">
          <Ring
            title="ONO"
            subtitle={`Target ${c.targetOno}`}
            valueText={`${c.ono}`}
            percent={c.onoPercent || 0}
            tone={onoTone}
          />

          <Ring
            title="GA"
            subtitle={`Target ${c.targetGa}`}
            valueText={`${c.totalGA}`}
            percent={c.gaPercent || 0}
            tone={gaTone}
          />
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-gray-50">
            <div className="text-xs text-gray-500">Sell In</div>
            <div className="font-semibold">{c.totalSellIn}</div>
            <div className="text-xs">
              4G {c.sellIn4G} • 5G {c.sellIn5G}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-gray-50">
            <div className="text-xs text-gray-500">GA</div>
            <div className="font-semibold">{c.totalGA}</div>
            <div className="text-xs">
              4G {c.ga4G} • 5G {c.ga5G}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-gray-50">
            <div className="text-xs text-gray-500">Inc Sell In</div>
            <div className="font-semibold">
              {formatIDR(c.incSellIn)}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-gray-50">
            <div className="text-xs text-gray-500">Inc GA</div>
            <div className="font-semibold">
              {formatIDR(c.incGA)}
            </div>
          </div>
        </div>

        {/* TOTAL */}
        <div className="p-4 rounded-xl bg-green-50 border border-green-200">
          <div className="text-sm text-gray-600">
            Total Incentive
          </div>
          <div className="text-lg font-bold text-green-600">
            {formatIDR(c.totalIncentive)}
          </div>
        </div>

      </div>

      {/* FOOTER */}
      <div className="text-xs text-gray-400">
        Last Update: {formatDate(gse.lastGaDate)}
      </div>

    </motion.div>
  );
}