import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DSFCard from "./components/DSFCard";
import TLDashboard from "./components/TLDashboard";
import Pill from "./components/Pill";
import { CSV_PATH, mapRowToDSF, parseCSV } from "./utils";
import { X } from "lucide-react";

export default function App() {
  const [dsfData, setDsfData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [query, setQuery] = useState("");
  const [selectedDSF, setSelectedDSF] = useState(null);
  const [selectedTL, setSelectedTL] = useState(null);
  const [error, setError] = useState("");

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

        // ================================
        // ✅ Ambil header (baris pertama)
        // ================================
// ================================
// ✅ Ambil baris data pertama (bukan header)
// ================================
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


        // ================================
        // ✅ Parse data normal
        // ================================
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

    return dsfData
      .filter(
        (x) =>
          x.idDsf.toLowerCase().includes(q) ||
          x.namaDsf.toLowerCase().includes(q) ||
          (x.idTl || "").toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [query, dsfData]);

  function onSearch() {
    const q = query.trim().toLowerCase();

    if (!q) {
      setSelectedDSF(null);
      setSelectedTL(null);
      setError("Please input DSF ID / DSF Name / TL ID.");
      return;
    }

    const foundDSF = dsfData.find((x) => x.idDsf.toLowerCase() === q);
    if (foundDSF) {
      setSelectedDSF(foundDSF);
      setSelectedTL(null);
      setError("");
      return;
    }

    const foundDSFByName = dsfData.find(
      (x) => x.namaDsf.toLowerCase() === q
    );
    if (foundDSFByName) {
      setSelectedDSF(foundDSFByName);
      setSelectedTL(null);
      setError("");
      return;
    }

    const dsfsUnderTL = dsfData.filter(
      (x) => (x.idTl || "").toLowerCase() === q
    );

    if (dsfsUnderTL.length > 0) {
      setSelectedDSF(null);
      setSelectedTL({
        tlId: dsfsUnderTL[0].idTl,
        tlName: dsfsUnderTL[0].namaTl,
        dsfs: dsfsUnderTL,
      });
      setError("");
      return;
    }

    setSelectedDSF(null);
    setSelectedTL(null);
    setError("DSF atau TL tidak ditemukan. Silakan periksa input Anda.");
  }

  function onPick(item) {
    setQuery(item.idDsf);
    setSelectedDSF(item);
    setSelectedTL(null);
    setError("");
  }

  return (
    <div className="page">
      <div className="bg-blur a" />
      <div className="bg-blur b" />

      <div className="container">
        <div className="hero">
          <div>
            <div className="hero-title">DSF Achievement Dashboard</div>
            <div className="hero-subtitle">
              Search by <b>DSF ID</b>, <b>DSF Name</b>, or <b>TL ID</b>.
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
            <div className="search-title">Search</div>
          </div>

          <div className="search-row">
            <div className="search-input-wrap">
              <input
                className="search-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
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
            {suggestions.length > 0 && (
              <motion.div
                className="suggestions"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.2 }}
              >
                <div className="suggestions-title">Suggestions</div>
                {suggestions.map((s) => (
                  <button
                    key={s.idDsf}
                    className="suggestion-item"
                    onClick={() => onPick(s)}
                  >
                    <div className="suggestion-top">
                      <span className="suggestion-name">
                        {s.namaDsf}
                      </span>
                      <Pill className="suggestion-pill">
                        {s.idDsf}
                      </Pill>
                    </div>

                    <div className="suggestion-sub">
                      {s.branch || "-"} • {s.region} • {s.brand}
                    </div>
                  </button>
                ))}
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
              className="card empty"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.25 }}
            >
              <div className="empty-title">No data selected</div>
              <div className="empty-sub">
                Search DSF or TL ID to view dashboard.
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="footer">
          <div className="footer-line">
            FWA IM3: {dataDates.DATA_FWA_IM3 || "-"} | FWA 3ID: {dataDates.DATA_FWA_3ID || "-"} | REBUY IM3: {dataDates.DATA_REBUY_IM3 || "-"} | REBUY 3ID: {dataDates.DATA_REBUY_3ID || "-"}
          </div>
        </div>
      </div>
    </div>
  );
}
