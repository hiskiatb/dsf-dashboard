import { motion } from "framer-motion";
import Pill from "./Pill";
import Ring from "./Ring";
import { formatIDR, hitungInsentif } from "../utils";
import { useRef } from "react";
import CopyImageButton from "./CopyImageButton";
import { useKpi } from "../KpiContext";

// Nominal insentif level TL/Spv (sesuai slide KPI). Threshold-nya
// mengikuti tier dari config KPI bulan tsb, jadi tidak hardcode skema.
const TL_INCENTIVE_TOP = 1_000_000;
const TL_INCENTIVE_LOW = 400_000;

export default function TLDashboard({
  tlId,
  tlName,
  dsfs,
  dataDates,
  dataBasedOn,
  onSelectDSF,
}) {
  const tableRef = useRef(null);
  const kpi = useKpi();

  const fwaUnitValue = kpi.fwa_unit_value || 0;
  const targetPerDsf = kpi.target_fwa || 20;
  const revenueTargetPerDsf = kpi.revenue_target || 0;

  const tiersDesc = [...(kpi.tiers || [])].sort(
    (a, b) => (b.incentive || 0) - (a.incentive || 0)
  );
  const topTier = tiersDesc[0] || { fwa_pct: 1, rev_pct: 1 };
  const lowTier = tiersDesc[tiersDesc.length - 1] || { fwa_pct: 0.75, rev_pct: 1 };

  const totalFwa = dsfs.reduce((a, b) => a + (b.fwaUnits || 0), 0);
  const totalRebuy = dsfs.reduce((a, b) => a + (b.rebuyRevenue || 0), 0);
  const totalHajj = kpi.include_hajj
    ? dsfs.reduce((a, b) => a + (b.revHajj || 0), 0)
    : 0;
  const totalRevenue = totalFwa * fwaUnitValue + totalRebuy + totalHajj;

  const totalTargetFwa = dsfs.reduce(
    (sum, d) => sum + (d.targetFwa || targetPerDsf),
    0
  );
  const fwaPercent = totalTargetFwa ? totalFwa / totalTargetFwa : 0;
  const totalTargetRevenue = revenueTargetPerDsf * dsfs.length;
  const revenuePercent = totalTargetRevenue ? totalRevenue / totalTargetRevenue : 0;

  // Tone revenue mengikuti tier tertinggi dari config (bukan hardcode bulan).
  const revenueRingTone = (() => {
    if (revenuePercent >= (topTier.rev_pct ?? 1)) return "success";
    if (revenuePercent >= 1) return "warning";
    return "danger";
  })();

  // Insentif TL: threshold FWA & revenue diambil dari tier config.
  let tlIncentive = 0;
  if (
    totalFwa >= totalTargetFwa * (topTier.fwa_pct ?? 1) &&
    revenuePercent >= (topTier.rev_pct ?? 1)
  ) {
    tlIncentive = TL_INCENTIVE_TOP;
  } else if (
    totalFwa >= totalTargetFwa * (lowTier.fwa_pct ?? 0.75) &&
    revenuePercent >= (lowTier.rev_pct ?? 1)
  ) {
    tlIncentive = TL_INCENTIVE_LOW;
  }

  const rankedDsfs = [...dsfs]
    .map((d) => ({ ...d, calc: hitungInsentif(d, kpi) }))
    .sort((a, b) => b.calc.totalRevenue - a.calc.totalRevenue);

  return (
    <motion.div
      className="card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="card-header">
        <div>
          <div className="card-title">Team Leader Dashboard</div>
          <div className="card-desc">Rekap kinerja DSF dalam koordinasi Anda.</div>
          {dataBasedOn && (
            <div className="data-based text-xs text-ink-500 mt-1">
              Data Based On: <strong className="text-ink-800">{dataBasedOn}</strong>
            </div>
          )}
        </div>

        <div className="header-badges">
          <Pill variant="info">TL</Pill>
          <Pill>{dsfs.length} DSFs</Pill>
        </div>
      </div>

      <div className="grid-2 mt-4">
        <div className="stat">
          <div className="stat-label">TL ID</div>
          <div className="stat-value">{tlId}</div>
        </div>
        <div className="stat">
          <div className="stat-label">TL Name</div>
          <div className="stat-value">{tlName || "-"}</div>
        </div>
      </div>

      <div className="dash-grid mt-5">
        <Ring
          title="Total FWA Units"
          subtitle={`Target TL: ${totalTargetFwa} units`}
          valueText={`${totalFwa} units`}
          percent={fwaPercent}
          tone={totalFwa >= totalTargetFwa ? "success" : "warning"}
        />

        <Ring
          title="Total Revenue"
          subtitle={`Target TL: ${formatIDR(totalTargetRevenue)}`}
          valueText={formatIDR(totalRevenue)}
          percent={revenuePercent}
          tone={revenueRingTone}
        />

        <div className="dash-right">
          <div className="mini-card">
            <div className="mini-label">Total Rebuy FWA</div>
            <div className="mini-value">{formatIDR(totalRebuy)}</div>
          </div>

          {kpi.include_hajj && (
            <div className="mini-card">
              <div className="mini-label">Total Rebuy Haji</div>
              <div className="mini-value">{formatIDR(totalHajj)}</div>
            </div>
          )}

          <div className="mini-card strong">
            <div className="mini-label">Incentive Earned</div>
            <div className="mini-value">{formatIDR(tlIncentive)}</div>
          </div>
        </div>
      </div>

      <div className="divider" />

      {/* TABLE HEADER */}
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="table-title">DSF List Under This TL</div>
        <CopyImageButton
          targetRef={tableRef}
          dataDates={dataDates}
          reportType="TL"
          reportName={tlName}
        />
      </div>

      <div className="table-wrap-modern">
        <div ref={tableRef}>
          <div className="table-scroll">
            <table className="modern-table">
              <thead>
                <tr>
                  <th className="text-center">Rank</th>
                  <th className="text-left">DSF ID</th>
                  <th className="text-left">DSF Name</th>
                  <th className="text-left">Branch</th>
                  <th className="text-right">FWA Units</th>
                  <th className="text-right">Target</th>
                  <th className="text-right">Rebuy FWA</th>
                  <th className="text-right">Rebuy Haji</th>
                  <th className="text-right">Total Revenue</th>
                  <th className="text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {rankedDsfs.map((d, index) => {
                  const eligible = d.calc.incentive > 0;
                  const dsfTarget = d.targetFwa || targetPerDsf;

                  return (
                    <tr
                      key={d.idDsf}
                      onClick={() => onSelectDSF && onSelectDSF(d)}
                      className="hover-row cursor-pointer transition"
                    >
                      <td className="text-center font-bold text-ink-900">
                        {index + 1}
                      </td>
                      <td className="mono">{d.idDsf}</td>
                      <td>{d.namaDsf}</td>
                      <td>{d.branch || "-"}</td>
                      <td className="text-right font-semibold">{d.fwaUnits}</td>
                      <td className="text-right">{dsfTarget}</td>
                      <td className="text-right">{formatIDR(d.rebuyRevenue)}</td>
                      <td className="text-right">{formatIDR(d.revHajj || 0)}</td>
                      <td className="text-right font-bold text-ink-900">
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
      </div>
    </motion.div>
  );
}