import { motion } from "framer-motion";
import Pill from "./Pill";
import Ring from "./Ring";
import {
  buildTips,
  formatIDR,
  hitungInsentif,
  REVENUE_TARGET,
} from "../utils";



export default function DSFCard({ 
  dsf, 
  dataDates,
  fwa3IDData = [],
  fwaIM3Data = []
}) {
  const c = hitungInsentif(dsf);
  const tips = buildTips(dsf);

  const eligible = c.incentive > 0;

  const incentiveLabel =
    c.incentive === 500_000
      ? "INCENTIVE 500K"
      : c.incentive === 200_000
      ? "INCENTIVE 200K"
      : "NOT ELIGIBLE";

  const incentiveTone = eligible ? "success" : "danger";

  const ringFwaTone =
    dsf.fwaUnits >= 20 ? "success" : dsf.fwaUnits >= 15 ? "warning" : "danger";

  const ringRevTone =
    c.totalRevenue >= REVENUE_TARGET ? "success" : "warning";

  // ================================
  // DATA BASED ON PER BRAND
  // ================================
  const isIM3 = (dsf.brand || "").toUpperCase() === "IM3";

  const dataFwaDate = isIM3
    ? dataDates?.DATA_FWA_IM3
    : dataDates?.DATA_FWA_3ID;

  const dataRebuyDate = isIM3
    ? dataDates?.DATA_REBUY_IM3
    : dataDates?.DATA_REBUY_3ID;

    function formatMonthYear(dateStr) {
  if (!dateStr) return "-";

  const date = new Date(dateStr);
  if (isNaN(date)) return "-";

  return date.toLocaleString("id-ID", {
    month: "short",
    year: "numeric",
  });
}

const periodeLabel = formatMonthYear(dataFwaDate);

function formatFullDate(dateStr) {
  if (!dateStr) return "-";

  const date = new Date(dateStr);
  if (isNaN(date)) return "-";

  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const fwaUpdateLabel = formatFullDate(dataFwaDate);
const rebuyUpdateLabel = formatFullDate(dataRebuyDate);

// ================================
// FILTER MSISDN BERDASARKAN DSF
// ================================
const dsfId = dsf.idDsf;

const msisdn3ID = fwa3IDData.filter(
  (row) => row.ID_DSF === dsfId
);

const msisdnIM3 = fwaIM3Data.filter(
  (row) => row.ID_DSF === dsfId
);

  return (
    <motion.div
      className="card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
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

      {/* DETAIL TOGGLE */}
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

      {/* RESPONSIVE DASHBOARD */}
      <div className="dash-grid mt-5">
        <Ring
          title="FWA Units"
          subtitle={`Update terakhir: ${fwaUpdateLabel}`}
          valueText={`${dsf.fwaUnits} / 20`}
          percent={c.fwaProgress}
          tone={ringFwaTone}
        />

        <Ring
          title="Total Revenue"
          subtitle={`Target: ${formatIDR(
            REVENUE_TARGET
          )}`}
          valueText={formatIDR(c.totalRevenue)}
          percent={c.revenueProgress}
          tone={ringRevTone}
        />

<div className="dash-right">
  <div className="mini-card">
    <div className="mini-label">Rebuy Revenue</div>

    <div className="mini-value">
      {formatIDR(dsf.rebuyRevenue)}
    </div>

    <div className="mini-subtext">
      <div className="mini-subtext">
  Update terakhir: {rebuyUpdateLabel}
</div>

    </div>
  </div>

  <div className="mini-card strong">
    <div className="mini-label">Incentive Earned</div>
    <div className="mini-value">
      {formatIDR(c.incentive)}
    </div>
  </div>
</div>

      </div>

         {/* STATUS + TIPS */}
      <div className={`note ${eligible ? "note-ok" : "note-warn"}`}>
        <div className="note-header">
          <div className="note-title">Tips & Progress</div>
          <div className="note-sub">
            {eligible ? "Target tercapai 🎉" : "Masih bisa dikejar 💪"}
          </div>
        </div>

        <div className="tips-list">
          {tips.map((t, idx) => (
            <div key={idx} className="tip-item">
              <div className={`tip-icon ${t.done ? "done" : ""}`}>
                {t.done ? "✓" : ""}
              </div>
              <div className="tip-content">
                <div className={`tip-text ${t.done ? "done" : ""}`}>
                  {t.text}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ================================
         TABEL MSISDN
      ================================= */}

      {msisdn3ID.length > 0 && (
  <div className="mt-8">
    <h3 className="text-lg font-semibold mb-3">List MSISDN FWA:</h3>

    <div className="overflow-x-auto rounded-xl border">
      <table className="min-w-full text-sm whitespace-nowrap text-left">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-3">No.</th>
            <th className="p-3">MSISDN</th>
            <th className="p-3">Status</th>
            <th className="p-3">Remarks</th>
          </tr>
        </thead>

        <tbody>
          {msisdn3ID.map((row, i) => {
            const notCounted =
              (row.REMARKS || "").toUpperCase() !== "REGISTERED";

            return (
              <tr
                key={i}
                className={`border-t hover:bg-gray-50 ${
                  notCounted ? "bg-rose-50" : ""
                }`}
              >
                <td className="p-3">{i + 1}</td>
                <td className="p-3">{row.MSISDN}</td>
                <td className="p-3">{row.STATUS}</td>
                <td
                  className={`p-3 font-medium ${
                    notCounted ? "text-rose-600" : "text-emerald-600"
                  }`}
                >
                  {row.REMARKS}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
)}

 {msisdnIM3.length > 0 && (
  <div className="mt-8">
    <h3 className="text-lg font-semibold mb-3">List MSISDN FWA:</h3>

    <div className="overflow-x-auto rounded-xl border">
      <table className="min-w-full text-sm whitespace-nowrap text-left">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-3">No.</th>
            <th className="p-3">MSISDN</th>
            <th className="p-3">GA Date</th>
          </tr>
        </thead>

        <tbody>
          {msisdnIM3.map((row, i) => {
            const invalid =
              !row.GA_DATE ||
              row.GA_DATE === "NULL" ||
              row.GA_DATE === null;

            return (
              <tr
                key={i}
                className={`border-t hover:bg-gray-50 ${
                  invalid ? "bg-rose-50" : ""
                }`}
              >
                <td className="p-3">{i + 1}</td>
                <td className="p-3">{row.MSISDN}</td>
                <td
                  className={`p-3 font-medium ${
                    invalid ? "text-rose-600" : "text-emerald-600"
                  }`}
                >
                  {invalid ? "-" : row.GA_DATE}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
)}
    </motion.div>
  );
}