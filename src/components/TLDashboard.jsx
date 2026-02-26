import { motion } from "framer-motion";
import Pill from "./Pill";
import Ring from "./Ring";
import { formatIDR, hitungInsentif } from "../utils";

const TARGET_PER_DSF = 20;
const REVENUE_TARGET_PER_DSF = 7_500_000;

export default function TLDashboard({ tlId, tlName, dsfs, dataBasedOn }) {
  const totalFwa = dsfs.reduce((a, b) => a + (b.fwaUnits || 0), 0);
  const totalRebuy = dsfs.reduce((a, b) => a + (b.rebuyRevenue || 0), 0);
  const totalRevenue = totalFwa * 350_000 + totalRebuy;

  // Target TL FWA
  const totalTargetFwa = dsfs.reduce(
    (sum, d) => sum + (d.targetFwa || TARGET_PER_DSF),
    0
  );

  const fwaPercent = totalTargetFwa
    ? totalFwa / totalTargetFwa
    : 0;

  // Target TL Revenue
  const totalTargetRevenue =
    REVENUE_TARGET_PER_DSF * dsfs.length;

  const revenuePercent = totalTargetRevenue
    ? totalRevenue / totalTargetRevenue
    : 0;

  // =========================
  // TL INCENTIVE LOGIC
  // =========================

  const minimumFwaOption1 = dsfs.length * 15;

  let tlIncentive = 0;

  if (
    totalFwa >= totalTargetFwa &&
    revenuePercent >= 1
  ) {
    tlIncentive = 1_000_000;
  } else if (
    totalFwa >= minimumFwaOption1 &&
    revenuePercent >= 1
  ) {
    tlIncentive = 400_000;
  }

  // =========================
  // SORT DSF BY TOTAL REVENUE (DESC)
  // =========================

  const rankedDsfs = [...dsfs]
    .map((d) => ({
      ...d,
      calc: hitungInsentif(d),
    }))
    .sort((a, b) => b.calc.totalRevenue - a.calc.totalRevenue);

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
            Team Leader Dashboard
          </div>
          <div className="card-desc">
            Rekap kinerja DSF dalam koordinasi Anda.
          </div>

          {dataBasedOn && (
            <div className="data-based">
              Data Based On: <strong>{dataBasedOn}</strong>
            </div>
          )}
        </div>

        <div className="header-badges">
          <Pill variant="info">TL</Pill>
          <Pill>{dsfs.length} DSFs</Pill>
        </div>
      </div>

      {/* TL INFO */}
      <div className="grid-2 mt-4">
        <div className="stat">
          <div className="stat-label">TL ID</div>
          <div className="stat-value">{tlId}</div>
        </div>
        <div className="stat">
          <div className="stat-label">TL Name</div>
          <div className="stat-value">
            {tlName || "-"}
          </div>
        </div>
      </div>

      {/* SUMMARY RINGS */}
      <div className="dash-grid mt-5">
        <Ring
          title="Total FWA Units"
          subtitle={`Target TL: ${totalTargetFwa} units`}
          valueText={`${totalFwa} units`}
          percent={fwaPercent}
          tone={
            totalFwa >= totalTargetFwa
              ? "success"
              : "warning"
          }
        />

        <Ring
          title="Total Revenue"
          subtitle={`Target TL: ${formatIDR(totalTargetRevenue)}`}
          valueText={formatIDR(totalRevenue)}
          percent={revenuePercent}
          tone={
            totalRevenue >= totalTargetRevenue
              ? "success"
              : "warning"
          }
        />

        <div className="dash-right">
          <div className="mini-card">
            <div className="mini-label">
              Total Rebuy Revenue
            </div>
            <div className="mini-value">
              {formatIDR(totalRebuy)}
            </div>
          </div>

          {/* ✅ DIGANTI: Eligible DSFs → Incentive Earned */}
          <div className="mini-card strong">
            <div className="mini-label">
              Incentive Earned
            </div>
            <div className="mini-value">
              {formatIDR(tlIncentive)}
            </div>
          </div>
        </div>
      </div>

      <div className="divider" />

      {/* DSF TABLE */}
      <div className="table-wrap-modern">
        <div className="table-title mb-3">
          DSF List Under This TL
        </div>

        <div className="table-scroll">
          <table className="modern-table">
            <thead>
  <tr>
    <th className="text-center">Rank</th>
    <th className="text-left">DSF ID</th>
    <th className="text-left">DSF Name</th>
    <th className="text-left">Branch</th> {/* ✅ Tambahan */}
    <th className="text-right">FWA Units</th>
    <th className="text-right">Target</th>
    <th className="text-right">Rebuy Revenue</th>
    <th className="text-right">Total Revenue</th>
    <th className="text-center">Status</th>
  </tr>
</thead>

            <tbody>
  {rankedDsfs.map((d, index) => {
    const eligible = d.calc.incentive > 0;
    const dsfTarget = d.targetFwa || TARGET_PER_DSF;

    return (
      <tr key={d.idDsf} className="hover-row">
        <td className="text-center font-bold">
          {index + 1}
        </td>

        <td className="mono">{d.idDsf}</td>

        <td>{d.namaDsf}</td>

          <td>{d.branch || "-"}</td>

        <td className="text-right font-medium">
          {d.fwaUnits}
        </td>

        <td className="text-right">
          {dsfTarget}
        </td>

        <td className="text-right">
          {formatIDR(d.rebuyRevenue)}
        </td>

        <td className="text-right font-semibold">
          {formatIDR(d.calc.totalRevenue)}
        </td>

        <td className="text-center whitespace-nowrap">
          <Pill variant={eligible ? "success" : "danger"}>
            {eligible ? "Eligible" : "Not Eligible"}
          </Pill>
        </td>
      </tr>
    );
  })}
</tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}