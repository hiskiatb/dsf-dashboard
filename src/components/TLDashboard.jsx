import { motion } from "framer-motion";
import Pill from "./Pill";
import Ring from "./Ring";
import { formatIDR, hitungInsentif, REVENUE_TARGET } from "../utils";

export default function TLDashboard({ tlId, tlName, dsfs, dataBasedOn }) {
  const totalFwa = dsfs.reduce((a, b) => a + (b.fwaUnits || 0), 0);
  const totalRebuy = dsfs.reduce((a, b) => a + (b.rebuyRevenue || 0), 0);

  const totalRevenue = totalFwa * 350_000 + totalRebuy;

  const eligibleCount = dsfs.filter(
    (d) => hitungInsentif(d).incentive > 0
  ).length;

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
          <div className="card-desc">
            Summary performance for DSFs under this TL.
          </div>

          {/* ✅ DATA BASED ON */}
          {dataBasedOn && (
            <div className="data-based">
              Data Based On: <strong>{dataBasedOn}</strong>
            </div>
          )}
        </div>

        <div className="header-badges">
          <Pill variant="info">TL</Pill>
          <Pill variant="success">{eligibleCount} Eligible</Pill>
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
          subtitle="All DSFs under TL"
          valueText={`${totalFwa} units`}
          percent={dsfs.length ? totalFwa / (dsfs.length * 20) : 0}
          tone={totalFwa > 0 ? "warning" : "default"}
        />

        <Ring
          title="Total Revenue"
          subtitle={`Target: ${formatIDR(REVENUE_TARGET)}`}
          valueText={formatIDR(totalRevenue)}
          percent={totalRevenue / REVENUE_TARGET}
          tone={totalRevenue >= REVENUE_TARGET ? "success" : "warning"}
        />

        <div className="dash-right">
          <div className="mini-card">
            <div className="mini-label">Total Rebuy Revenue</div>
            <div className="mini-value">
              {formatIDR(totalRebuy)}
            </div>
          </div>

          <div className="mini-card strong">
            <div className="mini-label">Eligible DSFs</div>
            <div className="mini-value">
              {eligibleCount}
            </div>
          </div>
        </div>
      </div>

      <div className="divider" />

      <div className="table-wrap">
        <div className="table-title">DSF List Under This TL</div>

        <table className="table">
          <thead>
            <tr>
              <th>DSF ID</th>
              <th>DSF Name</th>
              <th>FWA Units</th>
              <th>Rebuy Revenue</th>
              <th>Total Revenue</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {dsfs.map((d) => {
              const c = hitungInsentif(d);
              const eligible = c.incentive > 0;

              return (
                <tr key={d.idDsf}>
                  <td className="mono">{d.idDsf}</td>
                  <td>{d.namaDsf}</td>
                  <td>{d.fwaUnits}</td>
                  <td>{formatIDR(d.rebuyRevenue)}</td>
                  <td>{formatIDR(c.totalRevenue)}</td>
                  <td>
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
    </motion.div>
  );
}
