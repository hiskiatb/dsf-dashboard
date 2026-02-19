import { motion } from "framer-motion";
import Pill from "./Pill";
import Ring from "./Ring";
import {
  buildTips,
  formatIDR,
  hitungInsentif,
  REVENUE_TARGET,
} from "../utils";

export default function DSFCard({ dsf }) {
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

  const ringRevTone = c.totalRevenue >= REVENUE_TARGET ? "success" : "warning";

  return (
    <motion.div
      className="card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="card-header">
        <div>
          <div className="card-title">DSF Daily Report</div>
          <div className="card-desc">
            Search DSF by ID or Name. You can also search by TL ID.
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
          <div className="stat-label">DSF ID</div>
          <div className="stat-value">{dsf.idDsf}</div>
        </div>

        <div className="stat">
          <div className="stat-label">DSF Name</div>
          <div className="stat-value">{dsf.namaDsf}</div>
        </div>
      </div>

      {/* DETAIL TOGGLE */}
      <details className="details">
        <summary className="details-summary">Show full details</summary>

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
          subtitle="Minimum 15 / 20"
          valueText={`${dsf.fwaUnits} units`}
          percent={c.fwaProgress}
          tone={ringFwaTone}
        />

        <Ring
          title="Total Revenue"
          subtitle={`Target: ${formatIDR(REVENUE_TARGET)}`}
          valueText={formatIDR(c.totalRevenue)}
          percent={c.revenueProgress}
          tone={ringRevTone}
        />

        <div className="dash-right">
          <div className="mini-card">
            <div className="mini-label">Rebuy Revenue</div>
            <div className="mini-value">{formatIDR(dsf.rebuyRevenue)}</div>
          </div>

          <div className="mini-card strong">
            <div className="mini-label">Incentive Earned</div>
            <div className="mini-value">{formatIDR(c.incentive)}</div>
          </div>
        </div>
      </div>

      {/* STATUS + TIPS */}
      <div className={`note ${eligible ? "note-ok" : "note-warn"}`}>
        <div className="note-title">Next Steps</div>

        <div className="checklist">
          {tips.map((t, idx) => (
            <div key={idx} className="check-item">
              <div className={`check-dot ${t.done ? "done" : ""}`} />
              <div className="check-text">{t.text}</div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
