import { motion } from "framer-motion";
import Pill from "./Pill";
import Ring from "./Ring";
import { formatIDR, hitungInsentif } from "../utils";
import { useRef } from "react";
import CopyImageButton from "./CopyImageButton";

const TARGET_PER_DSF = 20;
const REVENUE_TARGET_PER_DSF = 7_500_000;

export default function TLDashboard({
  tlId,
  tlName,
  dsfs,
  dataDates,
  selectedMonth,
  dataBasedOn,
  onSelectDSF,
}) {
  const tableRef = useRef(null);

  const totalFwa = dsfs.reduce((a, b) => a + (b.fwaUnits || 0), 0);
  const totalRebuy = dsfs.reduce((a, b) => a + (b.rebuyRevenue || 0), 0);
  const totalHajj = dsfs.reduce((a, b) => a + (b.revHajj || 0), 0);
  const totalRevenue = totalFwa * 350000 + totalRebuy + totalHajj;

  const totalTargetFwa = dsfs.reduce(
    (sum, d) => sum + (d.targetFwa || TARGET_PER_DSF),
    0
  );
  const fwaPercent = totalTargetFwa ? totalFwa / totalTargetFwa : 0;
  const totalTargetRevenue = REVENUE_TARGET_PER_DSF * dsfs.length;
  const revenuePercent = totalTargetRevenue ? totalRevenue / totalTargetRevenue : 0;

  // TL incentive
  const minimumFwaOption1 = dsfs.length * 15;
  let tlIncentive = 0;
  const isAprilOrMay =
    selectedMonth === "202604" || selectedMonth === "202605";

  if (isAprilOrMay) {
    // KHUSUS APRIL & MEI: 
    // Wajib capai total target FWA DAN target Revenue (100% atau 120%)
    if (totalFwa >= totalTargetFwa && revenuePercent >= 1.2) {
      tlIncentive = 1_000_000;
    } else if (totalFwa >= totalTargetFwa && revenuePercent >= 1) {
      tlIncentive = 400_000;
    }
  } else {
    // BULAN LAINNYA: (Sesuai dengan logika awal kamu)
    if (totalFwa >= totalTargetFwa && revenuePercent >= 1) {
      tlIncentive = 1_000_000;
    } else if (totalFwa >= minimumFwaOption1 && revenuePercent >= 1) {
      tlIncentive = 400_000;
    }
  }

  const rankedDsfs = [...dsfs]
    .map((d) => ({ ...d, calc: hitungInsentif(d, selectedMonth) }))
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
          tone={totalRevenue >= totalTargetRevenue ? "success" : "warning"}
        />

        <div className="dash-right">
          {!isAprilOrMay && (
            <div className="mini-card">
              <div className="mini-label">Total Rebuy FWA</div>
              <div className="mini-value">{formatIDR(totalRebuy)}</div>
            </div>
          )}

          {isAprilOrMay && (
            <>
              <div className="mini-card">
                <div className="mini-label">Total Rebuy FWA</div>
                <div className="mini-value">{formatIDR(totalRebuy)}</div>
              </div>
              <div className="mini-card">
                <div className="mini-label">Total Rebuy Haji</div>
                <div className="mini-value">{formatIDR(totalHajj)}</div>
              </div>
            </>
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
                  const dsfTarget = d.targetFwa || TARGET_PER_DSF;

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
