import React from "react";
import { motion } from "framer-motion";
import Pill from "./Pill";
import Ring from "./Ring";

// ================================
// SAFE NUMBER
// ================================
const toNumber = (val) => {
  if (!val) return 0;
  let str = String(val).replace(/[^\d.,-]/g, "");

  if (str.includes(",") && !str.includes(".")) {
    str = str.replace(",", ".");
  } else {
    str = str.replace(/\./g, "");
  }

  const num = Number(str);
  return isNaN(num) ? 0 : num;
};

// ================================
// FORMAT
// ================================
const formatIDR = (num) => {
  return "Rp " + Number(num || 0).toLocaleString("id-ID");
};

// ================================
// CALCULATION ENGINE
// ================================
function calculateGSE(gse) {
  const actualOno = toNumber(gse.actualOno);
  const targetOno = toNumber(gse.targetOno);

  const actualGa = toNumber(gse.actualGa);
  const targetGa = toNumber(gse.targetGa);

  const sellIn4G = toNumber(gse.sellIn4G);
  const sellIn5G = toNumber(gse.sellIn5G);
  const ga4G = toNumber(gse.ga4G);
  const ga5G = toNumber(gse.ga5G);

  const onoPercent = targetOno > 0 ? actualOno / targetOno : 0;
  const gaPercent = targetGa > 0 ? actualGa / targetGa : 0;

  const incSellIn =
    (sellIn4G >= 3 ? sellIn4G * 5000 : sellIn4G * 3000) +
    sellIn5G * 25000;

  const incGA = ga4G * 5000 + ga5G * 40000;

  return {
    actualOno,
    targetOno,
    actualGa,
    targetGa,
    onoPercent,
    gaPercent,
    totalSellIn: sellIn4G + sellIn5G,
    totalGA: ga4G + ga5G,
    incSellIn,
    incGA,
    totalIncentive: incSellIn + incGA,
  };
}

// ================================
// COMPONENT
// ================================
export default function GSECard({ gse }) {

  // ================================
  // 🔥 TOGGLE MAINTENANCE DI SINI
  // ================================
  const isMaintenance = true;

  const c = calculateGSE(gse);

  const onoTone =
    c.onoPercent >= 0.8
      ? "success"
      : c.onoPercent >= 0.5
      ? "warning"
      : "danger";

  const gaTone =
    c.gaPercent >= 0.8
      ? "success"
      : c.gaPercent >= 0.5
      ? "warning"
      : "danger";

  // ================================
  // 🚧 MAINTENANCE VIEW
  // ================================
  if (isMaintenance) {
    return (
      <motion.div
        className="card maintenance"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >


        <div className="maintenance-body">
          <div className="maintenance-icon">🚧</div>

          <div className="maintenance-title">
            Maintenance Mode
          </div>

          <div className="maintenance-text">
            Fitur GSE Dashboard sedang disempurnakan dan akan segera tersedia.
          </div>
        </div>
      </motion.div>
    );
  }

  // ================================
  // ✅ NORMAL VIEW (NANTI AKTIFKAN)
  // ================================
  return (
    <motion.div
      className="card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >

      <div className="card-header">
        <div>
          <div className="card-title">
            Performance GSE
          </div>
          <div className="card-desc">
            Monitoring pencapaian ONO & GA
          </div>
        </div>

        <div className="header-badges">
          <Pill variant="info">
            {gse.brand || "-"}
          </Pill>
        </div>
      </div>

      <div className="grid-2 mt-4">

        <div className="stat">
          <div className="stat-label">ID GSE</div>
          <div className="stat-value">
            {gse.idGse}
          </div>
        </div>

        <div className="stat">
          <div className="stat-label">Nama GSE</div>
          <div className="stat-value">
            {gse.namaGse}
          </div>
        </div>

      </div>

      <details className="details">
        <summary className="details-summary">
          Detail Profil
        </summary>

        <div className="grid-2 mt-4">
          <div className="stat">
            <div className="stat-label">Region</div>
            <div className="stat-value">
              {gse.region}
            </div>
          </div>

          <div className="stat">
            <div className="stat-label">Branch</div>
            <div className="stat-value">
              {gse.branch}
            </div>
          </div>

          <div className="stat">
            <div className="stat-label">Micro Cluster</div>
            <div className="stat-value">
              {gse.microCluster}
            </div>
          </div>
        </div>
      </details>

      <div className="dash-grid mt-5">

        <Ring
          title="ONO"
          subtitle={`Target: ${c.targetOno}`}
          valueText={`${c.actualOno}`}
          percent={c.onoPercent}
          tone={onoTone}
        />

        <Ring
          title="GA"
          subtitle={`Target: ${c.targetGa}`}
          valueText={`${c.actualGa}`}
          percent={c.gaPercent}
          tone={gaTone}
        />

        <div className="dash-right">

          <div className="mini-card">
            <div className="mini-label">Total Sell In</div>
            <div className="mini-value">
              {c.totalSellIn}
            </div>
          </div>

          <div className="mini-card">
            <div className="mini-label">Total GA</div>
            <div className="mini-value">
              {c.totalGA}
            </div>
          </div>

          <div className="mini-card">
            <div className="mini-label">Incentive Sell In</div>
            <div className="mini-value">
              {formatIDR(c.incSellIn)}
            </div>
          </div>

          <div className="mini-card strong">
            <div className="mini-label">Total Incentive</div>
            <div className="mini-value">
              {formatIDR(c.totalIncentive)}
            </div>
          </div>

        </div>

      </div>

    </motion.div>
  );
}