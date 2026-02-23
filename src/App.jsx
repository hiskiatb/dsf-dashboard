import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DSFCard from "./components/DSFCard";
import TLDashboard from "./components/TLDashboard";
import Pill from "./components/Pill";
import { CSV_PATH, mapRowToDSF, parseCSV } from "./utils";
import { X } from "lucide-react";
import BranchRankingDashboard from "./components/BranchRankingDashboard";

export default function App() {
  const [dsfData, setDsfData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [query, setQuery] = useState("");
  const [selectedDSF, setSelectedDSF] = useState(null);
  const [selectedTL, setSelectedTL] = useState(null);
  const [error, setError] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);


  // ================================
  // DATA BASED ON PER TYPE
  // ================================
  const [dataDates, setDataDates] = useState({
    DATA_FWA_IM3: "",
    DATA_FWA_3ID: "",
    DATA_REBUY_IM3: "",
    DATA_REBUY_3ID: "",
  });

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setLoadError("");

        const res = await fetch(CSV_PATH, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const text = await res.text();


const lines = text.split("\n").filter((l) => l.trim() !== "");

// Baris ke-0 = header
// Baris ke-1 = data pertama
const firstDataLine = lines[1] || "";
const parts = firstDataLine.split(";");

// Ambil 4 kolom terakhir
const lastFour = parts.slice(-4).map((v) => v.trim());

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
  DATA_FWA_IM3: formatDate(lastFour[0]),
  DATA_FWA_3ID: formatDate(lastFour[1]),
  DATA_REBUY_IM3: formatDate(lastFour[2]),
  DATA_REBUY_3ID: formatDate(lastFour[3]),
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
  }, []);

const suggestions = useMemo(() => {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const dsfMatches = dsfData
    .filter(
      (x) =>
        x.idDsf.toLowerCase().includes(q) ||
        x.namaDsf.toLowerCase().includes(q)
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

  return [...tlMap.values(), ...dsfMatches].slice(0, 6);

}, [query, dsfData]);


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
    setQuery(item.data.namaTl);
  } else {
    setSelectedDSF(item.data);
    setSelectedTL(null);
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
        <div className="mb-4 pb-3 border-b border-gray-200">

  {/* TITLE */}
 <h1 className="text-xl sm:text-4xl font-bold text-gray-900 leading-tight">
  DSF Achievement Tracker
</h1>

  {/* DATA INFO */}
<div className="mt-2 flex items-center text-xs sm:text-sm text-gray-600">

  <div className="flex items-center gap-1 whitespace-nowrap">
    <span className="text-gray-500 font-medium">
      Data IM3:
    </span>
    <span className="font-semibold text-gray-900">
      {dataDates.DATA_FWA_IM3 || "N/A"}
    </span>
  </div>

  <div className="mx-3 h-4 w-px bg-gray-500" />

  <div className="flex items-center gap-1 whitespace-nowrap">
    <span className="text-gray-500 font-medium">
      Data 3ID:
    </span>
    <span className="font-semibold text-gray-900">
      {dataDates.DATA_FWA_3ID || "N/A"}
    </span>
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

        <AnimatePresence mode="wait">
          {selectedTL ? (
            <TLDashboard
              key={selectedTL.tlId}
              tlId={selectedTL.tlId}
              tlName={selectedTL.tlName}
              dsfs={selectedTL.dsfs}
              dataDates={dataDates}
            />
          ) : selectedDSF ? (
            <DSFCard
              key={selectedDSF.idDsf}
              dsf={selectedDSF}
              dataDates={dataDates}
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
  <BranchRankingDashboard />
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
