import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DSFCard from "./components/DSFCard";
import TLDashboard from "./components/TLDashboard";
import Pill from "./components/Pill";
import { mapRowToDSF, parseCSV } from "./utils";
import { X } from "lucide-react";
import RankingDashboard from "./components/RankingDashboard";
import Breadcrumb from "./components/Breadcrumb";
// import MSISDNCompareCard from "./components/MSISDNCompareCard";

export default function App() {
const [fwaData, setFwaData] = useState([]);
const [adjData, setAdjData] = useState([]);
  const [dsfData, setDsfData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [query, setQuery] = useState("");
  const [selectedDSF, setSelectedDSF] = useState(null);
  const [selectedTL, setSelectedTL] = useState(null);
  const [error, setError] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [pbiData, setPbiData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("202603"); // default March
 // const [selectedPBI, setSelectedPBI] = useState(null);


  // ================================
  // DATA BASED ON PER TYPE
  // ================================
  const [dataDates, setDataDates] = useState({
    DATA_FWA_IM3: "",
    DATA_FWA_3ID: "",
    DATA_REBUY_IM3: "",
    DATA_REBUY_3ID: "",
  });

  const MONTH_FILES = {
  "202603": {
    dsf: "/DSF_202603.csv",
    fwa: "/FWA_202603.csv",
    adj: "/ADJ_FWA_202603.csv",
    pbi: "/PBI_202603.csv",
    label: "March 2026",
  },
  "202602": {
    dsf: "/DSF_202602.csv",
    fwa: "/FWA_202602.csv",
    adj: "/ADJ_FWA_202602.csv",
    pbi: "/PBI_202602.csv",
    label: "February 2026",
  },
};

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setLoadError("");

        const files = MONTH_FILES[selectedMonth];

        const res = await fetch(files.dsf, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const text = await res.text();


const lines = text.split("\n").filter((l) => l.trim() !== "");

const header = lines[0].split(";").map((h) => h.trim());
const firstData = lines[1].split(";").map((v) => v.trim());

const idxFwaIM3 = header.findIndex((h) => h === "DATA_FWA_IM3");
const idxFwa3ID = header.findIndex((h) => h === "DATA_FWA_3ID");

const idxRebuyIM3 = header.findIndex((h) => h === "DATA_REBUY_IM3");
const idxRebuy3ID = header.findIndex((h) => h === "DATA_REBUY_3ID");

console.log("HEADER:", header);
console.log("INDEX DATA_FWA_IM3:", idxFwaIM3);
console.log("INDEX DATA_FWA_3ID:", idxFwa3ID);
console.log("INDEX REBUY_IM3:", idxRebuyIM3);
console.log("INDEX REBUY_3ID:", idxRebuy3ID);

// ambil value dari baris data pertama
const rawDates = {
  DATA_FWA_IM3: firstData[idxFwaIM3]?.trim(),
  DATA_FWA_3ID: firstData[idxFwa3ID]?.trim(),
  DATA_REBUY_IM3: firstData[idxRebuyIM3]?.trim(),
  DATA_REBUY_3ID: firstData[idxRebuy3ID]?.trim(),
};

// LOAD FWA DATA
const resFWA = await fetch(files.fwa, { cache: "no-store" });
const textFWA = await resFWA.text();
const parsedFWA = parseCSV(textFWA);

setFwaData(parsedFWA);

// LOAD ADJUSTMENT DATA
const resADJ = await fetch(files.adj, { cache: "no-store" });
const textADJ = await resADJ.text();
const parsedADJ = parseCSV(textADJ);

setAdjData(parsedADJ);

// LOAD PBI
const resPBI = await fetch(files.pbi, { cache: "no-store" });
const textPBI = await resPBI.text();
const parsedPBI = parseCSV(textPBI);
setPbiData(parsedPBI);

console.log("PBI SAMPLE:", parsedPBI[0]);
console.log("TYPE MSISDN:", typeof parsedPBI[0]?.MSISDN);

function formatDate(raw) {
  if (!raw) return "";
  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(
      4,
      6
    )}-${raw.slice(6, 8)}`;
  }
  return raw;
}
const formattedDates = {
  DATA_FWA_IM3: formatDate(rawDates.DATA_FWA_IM3),
  DATA_FWA_3ID: formatDate(rawDates.DATA_FWA_3ID),
  DATA_REBUY_IM3: formatDate(rawDates.DATA_REBUY_IM3),
  DATA_REBUY_3ID: formatDate(rawDates.DATA_REBUY_3ID),
};

setDataDates(formattedDates);

        const rows = parseCSV(text);
        const mapped = rows.map(mapRowToDSF).filter((x) => x.idDsf);

        if (!alive) return;
        setDsfData(mapped);
      } catch (e) {
        if (!alive) return;
        setLoadError(
          `Failed to load CSV: ${CSV_PATH}. (${e?.message || "error"})`
        );
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
}, [selectedMonth]);

// ================================
// SYNC SELECTED DSF WHEN DATA CHANGES
// ================================
useEffect(() => {

  if (!selectedDSF) return;

  const updated = dsfData.find(
    (x) => x.idDsf === selectedDSF.idDsf
  );

  if (updated) {
    setSelectedDSF(updated);
  }

}, [dsfData]);

const suggestions = useMemo(() => {

  const q = query.trim().toLowerCase();
  if (!q) return [];

  // const pbiMatches = pbiData
  //   .filter((row) =>
  //     (row.MSISDN || "").toLowerCase().includes(q)
  //   )
  //   .map((row) => ({
  //     type: "PBI",
  //     data: row,
  //   }));

  // const rawMatches = fwaData
  // .filter((row) =>
  //   (row.MSISDN || "").toLowerCase().includes(q)
  // )
  // .map((row) => ({
  //   type: "RAW",
  //   data: row,
  // }));

    const dsfMatches = dsfData
  .filter(
    (x) =>
      (x.idDsf || "").toLowerCase().includes(q) ||
      (x.namaDsf || "").toLowerCase().includes(q)
  )
  .map((x) => ({
    type: "DSF",
    data: x,
  }));

  // ✅ HANYA SATU tlMap
  const tlMap = new Map();

  dsfData.forEach((x) => {
    if (
      (x.idTl || "").toLowerCase().includes(q) ||
      (x.namaTl || "").toLowerCase().includes(q)
    ) {
      if (!tlMap.has(x.idTl)) {
        const dsfsUnder = dsfData.filter((d) => d.idTl === x.idTl);

        const uniqueBranches = [
          ...new Set(dsfsUnder.map((d) => d.branch).filter(Boolean)),
        ];

        const hasIM3 = dsfsUnder.some((d) =>
          (d.brand || "").toLowerCase().includes("im3")
        );
        const has3ID = dsfsUnder.some((d) =>
          (d.brand || "").toLowerCase().includes("3id")
        );

        let tlBrandLabel = "";
        if (hasIM3 && has3ID) tlBrandLabel = "TL IM3 & 3ID";
        else if (hasIM3) tlBrandLabel = "TL IM3";
        else if (has3ID) tlBrandLabel = "TL 3ID";

        tlMap.set(x.idTl, {
          type: "TL",
          data: {
            idTl: x.idTl,
            namaTl: x.namaTl,
            region: x.region,
            branches: uniqueBranches,
            tlBrandLabel,
          },
        });
      }
    }
  });

return [
  // ...pbiMatches,
  // ...rawMatches,
  ...tlMap.values(),
  ...dsfMatches,
].slice(0, 8);

}, [query, dsfData, pbiData, fwaData]);

function onSearch() {
  setShowSuggestions(false);
  const q = query.trim().toLowerCase();

  if (!q) {
    setSelectedDSF(null);
    setSelectedTL(null);
    setError("Please input DSF ID / DSF Name / TL ID / TL Name.");
    return;
  }

  // ✅ 1. Exact DSF ID
  const foundDSF = dsfData.find(
    (x) => x.idDsf.toLowerCase() === q
  );
  if (foundDSF) {
    setSelectedDSF(foundDSF);
    setSelectedTL(null);
    setError("");
    return;
  }

  // ✅ 2. Exact DSF Name
  const foundDSFByName = dsfData.find(
    (x) => x.namaDsf.toLowerCase() === q
  );
  if (foundDSFByName) {
    setSelectedDSF(foundDSFByName);
    setSelectedTL(null);
    setError("");
    return;
  }

  // ✅ 3. TL by ID
  const dsfsUnderTLById = dsfData.filter(
    (x) => (x.idTl || "").toLowerCase() === q
  );

  if (dsfsUnderTLById.length > 0) {
    setSelectedDSF(null);
    setSelectedTL({
      tlId: dsfsUnderTLById[0].idTl,
      tlName: dsfsUnderTLById[0].namaTl,
      dsfs: dsfsUnderTLById,
    });
    setError("");
    return;
  }

  // ✅ 4. TL by NAME (NEW)
  const dsfsUnderTLByName = dsfData.filter(
    (x) => (x.namaTl || "").toLowerCase() === q
  );

  if (dsfsUnderTLByName.length > 0) {
    setSelectedDSF(null);
    setSelectedTL({
      tlId: dsfsUnderTLByName[0].idTl,
      tlName: dsfsUnderTLByName[0].namaTl,
      dsfs: dsfsUnderTLByName,
    });
    setError("");
    return;
  }

  setSelectedDSF(null);
  setSelectedTL(null);
  setError("DSF atau TL tidak ditemukan. Silakan periksa input Anda.");
}

function onPick(item) {

  // ================= TL =================
  if (item.type === "TL") {
    const dsfsUnderTL = dsfData.filter(
      (x) => x.idTl === item.data.idTl
    );

    setSelectedTL({
      tlId: item.data.idTl,
      tlName: item.data.namaTl,
      dsfs: dsfsUnderTL,
    });

    setSelectedDSF(null);
//    setSelectedPBI(null);
    setQuery(item.data.namaTl);
  }

  // ================= MSISDN (PBI / RAW) =================
  else if (
    item.type === "PBI" ||
item.type === "RAW"
  ) {
    // setSelectedPBI({
    //   msisdn: item.data.MSISDN,
    // });

    setSelectedDSF(null);
    setSelectedTL(null);
    setQuery(item.data.MSISDN);
  }

  // ================= DSF =================
  else {
    setSelectedDSF(item.data);
    setSelectedTL(null);
  //  setSelectedPBI(null);
    setQuery(item.data.idDsf);
  }

  setShowSuggestions(false);
  setError("");
}


  return (
    <div className="page">
      <div className="bg-blur a" />
      <div className="bg-blur b" />

      <div className="container">
        

<div className="mb-5 pb-4 border-b border-gray-200">

<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

{/* LEFT SIDE */}
<div>

<h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
  DSF Achievement Tracker
</h1>

<div className="mt-2 flex items-center text-sm text-gray-600">

<div className="flex items-center gap-1">
  <span className="text-gray-500 font-medium">
    Data IM3:
  </span>
  <span className="font-semibold text-gray-900">
    {dataDates.DATA_FWA_IM3 || "N/A"}
  </span>
</div>

<div className="mx-3 h-4 w-px bg-gray-300" />

<div className="flex items-center gap-1">
  <span className="text-gray-500 font-medium">
    Data 3ID:
  </span>
  <span className="font-semibold text-gray-900">
    {dataDates.DATA_FWA_3ID || "N/A"}
  </span>
</div>

</div>

</div>

{/* RIGHT SIDE (MONTH SWITCHER) */}
<div className="flex flex-col items-start sm:items-end gap-2">

<div className="text-xs text-gray-500 font-medium">
  Achievement Month
</div>

<div className="flex gap-2">

{Object.entries(MONTH_FILES).map(([key, m]) => {

const active = selectedMonth === key;

return (
<motion.button
  key={key}
  onClick={() => setSelectedMonth(key)}
  className={`px-4 py-2 rounded-lg text-sm font-medium transition
  ${active
    ? "bg-blue-600 text-white shadow"
    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
  }`}
  whileTap={{ scale: 0.95 }}
>
{m.label}
</motion.button>
);

})}

</div>

</div>

</div>

</div>


        {loadError ? <div className="card error">{loadError}</div> : null}

        <motion.div
          className="card search-card"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="search-top">
            <div className="search-title">Cek Pencapaian DSF / TL</div>
          </div>

          <div className="search-row">
            <div className="search-input-wrap">
              <input
                className="search-input"
                value={query}
                onChange={(e) => {
                setQuery(e.target.value);
                setShowSuggestions(true);
              }}


                placeholder="Masukkan ID DSF / Nama DSF / ID TL"
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSearch();
                }}
              />

              <AnimatePresence>
                {query.length > 0 && (
                  <motion.button
                    type="button"
                    className="clear-btn"
                    onClick={() => {
                      setQuery("");
                      setSelectedDSF(null);
                      setSelectedTL(null);
                      setError("");
                    }}
                    aria-label="Clear"
                    title="Clear"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.15 }}
                  >
                    <X size={16} strokeWidth={2} />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            <button className="btn" onClick={onSearch}>
              Cari ID
            </button>
          </div>

          <AnimatePresence>
{showSuggestions && suggestions.length > 0 && (
              <motion.div
                className="suggestions"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.2 }}
              >
                <div className="suggestions-title">Suggestions</div>
                {suggestions.map((item, index) => {

if (
  item.type === "PBI" ||
item.type === "RAW"
) {
  return (
    <button
      key={`${item.type}-${item.data.MSISDN}-${index}`}
      className="suggestion-item"
      onClick={() => onPick(item)}
    >
      <div className="suggestion-top">
        <span className="suggestion-name">
          {item.data.MSISDN}
        </span>
        <Pill>{item.type}</Pill>
      </div>

      <div className="suggestion-sub">
        GA: {item.data.GA_DATE || item.data.GA_DT || "-"}
      </div>
    </button>
  );
}

  if (item.type === "TL") {
    return (
      <button
        key={`TL-${item.data.idTl}-${index}`}
        className="suggestion-item"
        onClick={() => onPick(item)}
      >
        <div className="suggestion-top">
          <span className="suggestion-name">
            {item.data.namaTl}
          </span>
          <Pill>
            {item.data.tlBrandLabel}
          </Pill>
        </div>

        <div className="suggestion-sub">
          {item.data.idTl} • {item.data.region} •{" "}
          {item.data.branches.join(", ")}
        </div>
      </button>
    );
  }

  // ✅ FIX DISINI
  const dsf = item.data;

  const brandLabel =
    (dsf.brand || "").toLowerCase().includes("im3")
      ? "DSF IM3"
      : "DSF 3ID";

  return (
    <button
      key={`DSF-${dsf.idDsf}-${index}`}
      className="suggestion-item"
      onClick={() => onPick(item)}
    >
      <div className="suggestion-top">
        <span className="suggestion-name">
          {dsf.namaDsf}
        </span>
        <Pill>{brandLabel}</Pill>
      </div>

      <div className="suggestion-sub">
        {dsf.idDsf} • {dsf.branch || "-"} • {dsf.region}
      </div>
    </button>
  );
})}

              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {error && (
              <motion.div
                className="error"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.2 }}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

{/* ================= Breadcrumb ================= */}
{(selectedTL || selectedDSF) && (
  <Breadcrumb
    selectedTL={selectedTL}
    selectedDSF={selectedDSF}
    onBackRanking={() => {
      setSelectedDSF(null);
      setSelectedTL(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }}
    onBackTL={() => {
      setSelectedDSF(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }}
  />
)}

<AnimatePresence mode="wait">
  {/* {selectedPBI ? (
  <MSISDNCompareCard
    msisdn={selectedPBI.msisdn}
    pbiData={pbiData}
    fwaData={fwaData}
  />
  ) : */}

  {selectedDSF ? (
<DSFCard
  dsf={selectedDSF}
  dataDates={dataDates}
  fwaData={fwaData}
  adjData={adjData}
/>
  ) : selectedTL ? (
    <TLDashboard
      key={selectedTL.tlId}
      tlId={selectedTL.tlId}
      tlName={selectedTL.tlName}
      dsfs={selectedTL.dsfs}
      dataDates={dataDates}
      onSelectDSF={(dsf) => {
        window.scrollTo({ top: 0, behavior: "smooth" });
        setSelectedDSF(dsf);
      }}
    />
  ) : (
    <motion.div
      key="empty"
      className="mt-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.25 }}
    >
      <RankingDashboard
        dsfData={dsfData}
        onSelectDSF={(dsf) => {
          window.scrollTo({ top: 0, behavior: "smooth" });
          setSelectedDSF(dsf);
          setSelectedTL(null);
        }}
        onSelectTL={(tl) => {
          window.scrollTo({ top: 0, behavior: "smooth" });
          setSelectedTL(tl);
          setSelectedDSF(null);
        }}
      />
    </motion.div>
  )}
</AnimatePresence>

{/* FOOTER SECTION */}
{/* mt-8 membuat jarak atas lebih rapat (2rem), mb-8 memberikan ruang di bawah halaman */}
<footer className="mt-8 mb-8 w-full flex flex-col items-center gap-4 text-gray-500">
  

  {/* Ownership */}
  <div className="text-center">
    <p className="text-[9px] uppercase tracking-wider text-gray-400">
      Managed & Operated by
    </p>
    <p className="text-xs sm:text-sm font-bold text-gray-700 mt-0.5 uppercase">
      SPM SUMATERA
    </p>
  </div>

</footer>
        </div>
      </div>
  );
}
