import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DSFCard from "./components/DSFCard";
import TLDashboard from "./components/TLDashboard";
import Pill from "./components/Pill";
import { CSV_PATH, mapRowToDSF, parseCSV } from "./utils";

export default function App() {
  const [dsfData, setDsfData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [query, setQuery] = useState("");
  const [selectedDSF, setSelectedDSF] = useState(null);
  const [selectedTL, setSelectedTL] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setLoadError("");

        const res = await fetch(CSV_PATH, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const text = await res.text();
        const rows = parseCSV(text);
        const mapped = rows.map(mapRowToDSF).filter((x) => x.idDsf);

        if (!alive) return;
        setDsfData(mapped);
      } catch (e) {
        if (!alive) return;
        setLoadError(
          `Failed to load CSV: ${CSV_PATH}. Make sure the file exists in /public. (${e?.message || "error"})`
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

  // suggestions (case-insensitive)
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

    // 1) try match DSF ID exact
    const foundDSF = dsfData.find((x) => x.idDsf.toLowerCase() === q);
    if (foundDSF) {
      setSelectedDSF(foundDSF);
      setSelectedTL(null);
      setError("");
      return;
    }

    // 2) try match DSF name exact
    const foundDSFByName = dsfData.find(
      (x) => x.namaDsf.toLowerCase() === q
    );
    if (foundDSFByName) {
      setSelectedDSF(foundDSFByName);
      setSelectedTL(null);
      setError("");
      return;
    }

    // 3) try match TL ID
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
    setError("No matching DSF or TL found. Please check your input.");
  }

  function onPick(item) {
    setQuery(item.idDsf);
    setSelectedDSF(item);
    setSelectedTL(null);
    setError("");
  }

  const demoIds = useMemo(
    () => dsfData.map((d) => d.idDsf).slice(0, 8),
    [dsfData]
  );

  return (
    <div className="page">
      <div className="bg-blur a" />
      <div className="bg-blur b" />

      <div className="container">
        <div className="hero">
          <div>
            <div className="hero-title">DSF Daily Report Portal</div>
            <div className="hero-subtitle">
              Search by <b>DSF ID</b>, <b>DSF Name</b>, or <b>TL ID</b>.
            </div>
          </div>

          <div className="hero-meta">
            <div className="meta-item">
              <div className="meta-label">Source</div>
              <div className="meta-value">{CSV_PATH}</div>
            </div>
            <div className="meta-item">
              <div className="meta-label">Status</div>
              <div className="meta-value">{loading ? "Loading..." : "Ready"}</div>
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
            <div>
              <div className="search-title">Search</div>
              <div className="search-hint">
                Input DSF ID / DSF Name / TL ID (case-insensitive)
              </div>
            </div>
            <Pill variant="info">CSV Data</Pill>
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
                {query.length > 0 ? (
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
                    ×
                  </motion.button>
                ) : null}
              </AnimatePresence>
            </div>

            <button className="btn" onClick={onSearch}>
              Search
            </button>
          </div>

          <AnimatePresence>
            {suggestions.length > 0 ? (
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
                      <div className="suggestion-name">{s.namaDsf}</div>
                      <Pill>{s.idDsf}</Pill>
                    </div>
                    <div className="suggestion-sub">
                      TL: {s.idTl || "-"} • {s.region} • {s.brand}
                    </div>
                  </button>
                ))}
              </motion.div>
            ) : null}
          </AnimatePresence>

          <AnimatePresence>
            {error ? (
              <motion.div
                className="error"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.2 }}
              >
                {error}
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="demo">Contoh ID DSF: {demoIds.join(", ")}</div>
        </motion.div>

        <AnimatePresence mode="wait">
          {selectedTL ? (
            <TLDashboard
              key={selectedTL.tlId}
              tlId={selectedTL.tlId}
              tlName={selectedTL.tlName}
              dsfs={selectedTL.dsfs}
            />
          ) : selectedDSF ? (
            <DSFCard key={selectedDSF.idDsf} dsf={selectedDSF} />
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
            -
          </div>
        </div>
      </div>
    </div>
  );
}
