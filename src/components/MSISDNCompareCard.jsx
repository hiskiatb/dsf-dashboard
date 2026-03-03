import { motion } from "framer-motion";

export default function MSISDNCompareCard({
  msisdn,
  pbiData = [],
  fwaIM3Data = [],
  fwa3IDData = [],
}) {
  const normalize = (val) => String(val || "").trim();
  const target = normalize(msisdn);

  const pbi = pbiData.find((r) =>
    normalize(r?.MSISDN).includes(target)
  );

  const im3 = fwaIM3Data.find((r) =>
    normalize(r?.MSISDN).includes(target)
  );

  const threeID = fwa3IDData.find((r) =>
    normalize(r?.MSISDN).includes(target)
  );

  const isRegistered =
    (threeID?.REMARKS || "").trim() === "REGISTERED";

  return (
    <motion.div
      className="mt-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* MAIN CARD */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-6 mb-6">

          <div>
            <div className="text-xs uppercase tracking-widest text-gray-400 mb-1">
              MSISDN Detail
            </div>
            <div className="text-2xl font-bold text-gray-900 tracking-tight">
              {target}
            </div>
          </div>

          {/* STATUS BADGE */}
          {threeID && (
            <div
              className={`px-4 py-2 rounded-full text-sm font-semibold
              ${
                isRegistered
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-600"
              }`}
            >
              {threeID.REMARKS || "NO STATUS"}
            </div>
          )}
        </div>

        {/* ================= PBI SECTION ================= */}
        {pbi && (
          <div className="mb-8">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
              PBI Information
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Info label="Device" value={pbi.DEVICE} />
              <Info label="Brand" value={pbi.BRAND} />
              <Info label="GA Date" value={pbi.GA_DATE} />
              <Info label="ORG ID" value={pbi.ORG_ID} />
            </div>
          </div>
        )}

        {/* ================= RAW DATA SECTION ================= */}
        {(im3 || threeID) && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
              Activation Data
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

              {im3 && (
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                  <div className="text-sm font-semibold text-gray-700 mb-3">
                    RAW IM3
                  </div>
                  <Info label="GA Date" value={im3.GA_DATE} />
                  <Info label="ID DSF" value={im3.ID_DSF} />
                </div>
              )}

              {threeID && (
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                  <div className="text-sm font-semibold text-gray-700 mb-3">
                    RAW 3ID
                  </div>
                  <Info label="GA Date" value={threeID.GA_DATE} />
                  <Info label="ID DSF" value={threeID.ID_DSF} />
                  <Info label="Remarks" value={threeID.REMARKS} />
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </motion.div>
  );
}

function Info({ label, value }) {
  return (
    <div className="flex justify-between items-center border-b border-gray-100 pb-2">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-sm font-semibold text-gray-900">
        {value || "-"}
      </div>
    </div>
  );
}