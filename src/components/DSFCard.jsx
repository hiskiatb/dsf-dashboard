import React from "react";
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
  fwaData = [],
  adjData = []
}){

  const c = hitungInsentif(dsf);
  const tips = buildTips(dsf);

  const eligible = c.incentive > 0;

  const incentiveLabel =
    c.incentive === 500000
      ? "INCENTIVE 500K"
      : c.incentive === 200000
      ? "INCENTIVE 200K"
      : "NOT ELIGIBLE";

  const incentiveTone = eligible ? "success" : "danger";

  const ringFwaTone =
    dsf.fwaUnits >= 20
      ? "success"
      : dsf.fwaUnits >= 15
      ? "warning"
      : "danger";

  const ringRevTone =
    c.totalRevenue >= REVENUE_TARGET
      ? "success"
      : "warning";

  // ================================
  // DATE FORMATTER
  // ================================
  function formatMonthYear(dateStr) {
    if (!dateStr) return "-";

    const date = new Date(dateStr);
    if (isNaN(date)) return "-";

    return date.toLocaleString("id-ID", {
      month: "short",
      year: "numeric",
    });
  }

function formatGA(date) {
  if (!date) return "-";

  if (/^\d{8}$/.test(date)) {
    const y = date.slice(0,4);
    const m = date.slice(4,6);
    const d = date.slice(6,8);

    return new Date(`${y}-${m}-${d}`).toLocaleDateString("id-ID",{
      day:"2-digit",
      month:"short",
      year:"numeric"
    });
  }

  const parsed = new Date(date);
  if (isNaN(parsed)) return "-";

  return parsed.toLocaleDateString("id-ID",{
    day:"2-digit",
    month:"short",
    year:"numeric"
  });
}

function formatFullDate(dateStr) {
  if (!dateStr) return "-";

  if (/^\d{8}$/.test(dateStr)) {
    const y = dateStr.slice(0,4);
    const m = dateStr.slice(4,6);
    const d = dateStr.slice(6,8);

    return new Date(`${y}-${m}-${d}`).toLocaleDateString("id-ID",{
      day:"2-digit",
      month:"short",
      year:"numeric"
    });
  }

  const parsed = new Date(dateStr);
  if (isNaN(parsed)) return "-";

  return parsed.toLocaleDateString("id-ID",{
    day:"2-digit",
    month:"short",
    year:"numeric"
  });
}

const dataFwaDate =
  dsf.brand === "IM3"
    ? dataDates?.DATA_FWA_IM3
    : dataDates?.DATA_FWA_3ID;

const rebuyDate =
  dsf.brand === "IM3"
    ? dataDates?.DATA_REBUY_IM3
    : dataDates?.DATA_REBUY_3ID;

const periodeLabel = formatMonthYear(dataFwaDate);
const fwaUpdateLabel = formatFullDate(dataFwaDate);
const rebuyUpdateLabel = formatFullDate(rebuyDate);

  // ================================
  // FILTER DATA MSISDN
  // ================================

  // ================================
// NORMALIZE ID (HAPUS 0 DI DEPAN)
// ================================
function normalizeId(val) {
  return String(val ?? "")
    .trim()
    .replace(/^0+/, ""); 
}

const dsfId = String(dsf?.idDsf || "").trim();
const [searchMsisdn, setSearchMsisdn] = React.useState("");

const rawList = (fwaData || []).filter((row) =>
  normalizeId(row?.ID_DSF) === normalizeId(dsf?.idDsf)
);

const rawCounted = rawList.filter(
  (x) => String(x.REMARKS).trim().toUpperCase() === "REGISTERED"
);

const rawInvalid = rawList.filter(
  (x) => x.REMARKS !== "REGISTERED"
);

const filteredRawCounted = rawCounted.filter((x) =>
  (x.MSISDN || "").includes(searchMsisdn)
);

const filteredRawInvalid = rawInvalid.filter((x) =>
  (x.MSISDN || "").includes(searchMsisdn)
);

  // ================================
// FILTER ADJUSTMENT DATA
// ================================

const adjList = (adjData || []).filter((row) =>
  normalizeId(row?.ID_DSF) === normalizeId(dsf?.idDsf)
);

const adjValid = adjList.filter(
  (x) => Number(x.VALID_FLAG) > 0
);

const adjInvalid = adjList.filter(
  (x) => Number(x.VALID_FLAG) === 0
);

// APPLY SEARCH
const filteredAdjValid = adjValid.filter((x) =>
  (x.MSISDN || "").includes(searchMsisdn)
);

const filteredAdjInvalid = adjInvalid.filter((x) =>
  (x.MSISDN || "").includes(searchMsisdn)
);


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

      {/* DETAIL */}
      <details className="details">

        <summary className="details-summary">
          Detail Profil
        </summary>

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

      {/* DASHBOARD */}
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
          subtitle={`Target: ${formatIDR(REVENUE_TARGET)}`}
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
              Update terakhir: {rebuyUpdateLabel}
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

      {/* ================================
         TABEL MSISDN
      ================================= */}

      <div className="mt-8">

        <h3 className="text-lg font-semibold mb-3">
          List MSISDN FWA
        </h3>

        <div className="mb-4">
<input
type="text"
placeholder="Search MSISDN..."
value={searchMsisdn}
onChange={(e)=>setSearchMsisdn(e.target.value)}
className="w-full border rounded-lg px-3 py-2 text-sm"
/>
</div>


         <h3 className="text-md font-semibold text-blue-700 mb-2">
Raw Data (Counted)
</h3>

        <div className="overflow-x-auto rounded-xl border">

<table className="min-w-full text-sm whitespace-nowrap text-left">

<thead className="bg-gray-100">
<tr>
<th className="p-3">No</th>
<th className="p-3">MSISDN</th>
<th className="p-3">GA Date</th>
<th className="p-3">Device</th>
<th className="p-3">Remarks</th>
</tr>
</thead>

<tbody>

{filteredRawCounted.length === 0 ? (

<tr>
<td colSpan="5" className="p-4 text-center text-gray-500">
No registered MSISDN
</td>
</tr>

) : (

filteredRawCounted.map((row,i)=>(
<tr key={i} className="border-t bg-blue-50">

<td className="p-3">{i+1}</td>
<td className="p-3">{row.MSISDN}</td>
<td className="p-3">{formatGA(row.GA_DATE)}</td>

<td className="p-3">{row?.DEVICE?.trim?.() || row?.DEVICE || "-"}</td>
<td className="p-3 text-blue-700 font-medium">
{row.REMARKS}
</td>

</tr>
))

)}

</tbody>
</table>
        </div>

        <div className="mt-6">

<h3 className="text-md font-semibold text-rose-700 mb-2">
Raw Data (Invalid)
</h3>

<div className="overflow-x-auto rounded-xl border">

<table className="min-w-full text-sm whitespace-nowrap text-left">

<thead className="bg-gray-100">
<tr>
<th className="p-3">No</th>
<th className="p-3">MSISDN</th>
<th className="p-3">GA Date</th>
<th className="p-3">Device</th>
<th className="p-3">Remarks</th>
</tr>
</thead>

<tbody>

{filteredRawInvalid.length === 0 ? (

<tr>
<td colSpan="5" className="p-4 text-center text-gray-500">
No invalid data
</td>
</tr>

) : (

filteredRawInvalid.map((row,i)=>(
<tr key={i} className="border-t bg-rose-50">

<td className="p-3">{i+1}</td>
<td className="p-3">{row.MSISDN}</td>
<td className="p-3">{formatGA(row.GA_DATE)}</td>
<td className="p-3">{row?.DEVICE?.trim?.() || row?.DEVICE || "-"}</td>
<td className="p-3 text-rose-700 font-medium">
{row.REMARKS}
</td>

</tr>
))

)}

</tbody>
</table>

</div>

</div>

{filteredAdjValid.length > 0 && (
  <div className="mt-6">

<h3 className="text-md font-semibold text-emerald-700 mb-2">
Adjustment (Counted)
</h3>

<div className="overflow-x-auto rounded-xl border">

<table className="min-w-full text-sm whitespace-nowrap text-left">

<thead className="bg-gray-100">
<tr>
<th className="p-3">No</th>
<th className="p-3">MSISDN</th>
<th className="p-3">GA Date</th>
<th className="p-3">Device</th>
<th className="p-3">Remarks</th>
</tr>
</thead>

<tbody>

{filteredAdjValid.map((row,i)=>(
<tr key={i} className="border-t bg-emerald-50">

<td className="p-3">{i+1}</td>
<td className="p-3">{row.MSISDN}</td>
<td className="p-3">{formatGA(row.GA_DATE)}</td>
<td className="p-3">{row?.DEVICE?.trim?.() || row?.DEVICE || "-"}</td>
<td className="p-3 text-emerald-700 font-medium">
{row.REMARKS}
</td>

</tr>
))}

</tbody>
</table>

</div>

</div>
)}

{filteredAdjInvalid.length > 0 && (
<div className="mt-6">

<h3 className="text-md font-semibold text-rose-700 mb-2">
Adjustment (Invalid)
</h3>

<div className="overflow-x-auto rounded-xl border">

<table className="min-w-full text-sm whitespace-nowrap text-left">

<thead className="bg-gray-100">
<tr>
<th className="p-3">No</th>
<th className="p-3">MSISDN</th>
<th className="p-3">GA Date</th>
<th className="p-3">Device</th>
<th className="p-3">Remarks</th>
</tr>
</thead>

<tbody>

{filteredAdjInvalid.map((row,i)=>(
<tr key={i} className="border-t bg-rose-100">

<td className="p-3">{i+1}</td>
<td className="p-3">{row.MSISDN}</td>
<td className="p-3">{formatGA(row.GA_DATE)}</td>
<td className="p-3">{row?.DEVICE?.trim?.() || row?.DEVICE || "-"}</td>
<td className="p-3 text-rose-700 font-medium">
{row.REMARKS}
</td>

</tr>
))}

</tbody>
</table>

</div>

</div>
)}
      </div>

    </motion.div>
  );
}