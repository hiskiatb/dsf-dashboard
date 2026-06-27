import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DSFCard from "./components/DSFCard";
import TLDashboard from "./components/TLDashboard";
import Pill from "./components/Pill";
import { mapRowToDSF, parseCSV } from "./utils";
import { X } from "lucide-react";
import RankingDashboard from "./components/RankingDashboard";
import Breadcrumb from "./components/Breadcrumb";
import { Toaster } from "react-hot-toast";
import { KpiProvider } from "./KpiContext";
import AdminKpiPanel from "./components/AdminKpiPanel";
import { fetchDsfMonth } from "./supabaseData";
import { isAdmin as checkAdmin } from "./supabaseAuth";

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

  const [admin, setAdmin] = useState(checkAdmin());
  const [dataVersion, setDataVersion] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState("202606"); // default June 2026


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

    "202606": {
       dsf: "/DSF_202606.csv",
       fwa: "/FWA_202606.csv",
       adj: "/ADJ_FWA_202606.csv",
       label: "June 2026",
     },

    "202605": {
       dsf: "/DSF_202605.csv",
       fwa: "/FWA_202605.csv",
       adj: "/ADJ_FWA_202605.csv",
       label: "May 2026",
     },
  
"202604": {
  dsf: "/DSF_202604.csv",
  fwa: "/FWA_202604.csv",
  adj: "/ADJ_FWA_202604.csv",
  pbi: "/PBI_202604.csv",
  label: "April 2026",
},
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

      // ================= COBA SUPABASE DULU =================
      const sb = await fetchDsfMonth(selectedMonth);
      if (sb) {
        if (!alive) return;
        setDsfData(sb.rows);
        setDataDates(sb.dates);

        // FWA/ADJ dari CSV hanya sebagai fallback (DSFCard utamakan Supabase).
        if (files) {
          try {
            const rf = await fetch(files.fwa, { cache: "no-store" });
            setFwaData(rf.ok ? parseCSV(await rf.text()) : []);
            const ra = await fetch(files.adj, { cache: "no-store" });
            setAdjData(ra.ok ? parseCSV(await ra.text()) : []);
          } catch {
            setFwaData([]); setAdjData([]);
          }
        } else {
          setFwaData([]); setAdjData([]);
        }

        if (selectedDSF) {
          const u = sb.rows.find((d) => d.idDsf === selectedDSF.idDsf);
          setSelectedDSF(u || null);
        }
        if (selectedTL) {
          const us = sb.rows.filter((d) => d.idTl === selectedTL.tlId);
          setSelectedTL(us.length ? { tlId: selectedTL.tlId, tlName: us[0].namaTl, dsfs: us } : null);
        }
        return;
      }

      // ================= FALLBACK CSV =================
      if (!files) {
        throw new Error(
          `Data bulan ${selectedMonth} belum tersedia (belum di-upload ke Supabase & tidak ada file CSV).`
        );
      }

      // ================= LOAD DSF =================
      const res = await fetch(files.dsf, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();

      // ================= PARSE CSV =================
      // parseCSV menangani sel ber-tanda kutip / multi-baris (format Juni 2026),
      // jadi tanggal data diambil dari baris hasil parse, bukan split manual.
      const rows = parseCSV(text);

      function formatDate(raw) {
        const s = String(raw ?? "").trim();
        if (!s) return "";
        if (/^\d{8}$/.test(s)) {
          return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
        }
        return s;
      }

      const firstRow = rows[0] || {};
      const formattedDates = {
        DATA_FWA_IM3: formatDate(firstRow.DATA_FWA_IM3),
        DATA_FWA_3ID: formatDate(firstRow.DATA_FWA_3ID),
        DATA_REBUY_IM3: formatDate(firstRow.DATA_REBUY_IM3),
        DATA_REBUY_3ID: formatDate(firstRow.DATA_REBUY_3ID),
      };
      setDataDates(formattedDates);

      const mapped = rows.map((r, i) => mapRowToDSF(r, i)).filter((x) => x.idDsf);

      // ===== VALIDASI FORMAT BULAN =====
      if (rows.length === 0) {
        throw new Error("File DSF kosong atau format tidak dikenal.");
      }
      const hasIdCol = ["ID_DSF", "ID_DSF_IM3", "ID_DSF_3ID"].some(
        (k) => k in firstRow
      );
      if (!hasIdCol || !("TARGET_FWA" in firstRow)) {
        throw new Error(
          `Format kolom bulan ${files.label || selectedMonth} tidak sesuai (kolom ID_DSF / TARGET_FWA tidak ditemukan).`
        );
      }
      if (mapped.length === 0) {
        throw new Error(
          `Tidak ada DSF terbaca dari ${files.label || selectedMonth}. Kemungkinan format kolom berubah.`
        );
      }

      if (!alive) return;

      setDsfData(mapped);

      // ================= LOAD FWA =================
      const resFWA = await fetch(files.fwa, { cache: "no-store" });
      const textFWA = resFWA.ok ? await resFWA.text() : "";
      setFwaData(parseCSV(textFWA));

      // ================= LOAD ADJ =================
      const resADJ = await fetch(files.adj, { cache: "no-store" });
      const textADJ = resADJ.ok ? await resADJ.text() : "";
      setAdjData(parseCSV(textADJ));

      // ================= REFRESH SELECTED DSF / TL =================
      if (selectedDSF) {
        const updatedDSF = mapped.find(d => d.idDsf === selectedDSF.idDsf);
        setSelectedDSF(updatedDSF || null);
      }

      if (selectedTL) {
        const dsfsUnderTL = mapped.filter(d => d.idTl === selectedTL.tlId);
        setSelectedTL(
          dsfsUnderTL.length > 0
            ? {
                tlId: selectedTL.tlId,
                tlName: dsfsUnderTL[0].namaTl,
                dsfs: dsfsUnderTL,
              }
            : null
        );
      }

    } catch (e) {
      if (!alive) return;
      setDsfData([]);
      setLoadError(e?.message || "Gagal memuat data bulan ini.");
    } finally {
      if (!alive) return;
      setLoading(false);
    }
  }

  load();
  return () => {
    alive = false;
  };
}, [selectedMonth, dataVersion]);

// ================================
// SYNC SELECTED TL WHEN DATA CHANGES
// ================================
useEffect(() => {

  if (!selectedTL) return;

  const dsfsUnderTL = dsfData.filter(
    (x) => x.idTl === selectedTL.tlId
  );

  if (dsfsUnderTL.length > 0) {
    setSelectedTL({
      tlId: selectedTL.tlId,
      tlName: dsfsUnderTL[0].namaTl,
      dsfs: dsfsUnderTL,
    });
  }

}, [dsfData]);

const suggestions = useMemo(() => {

  const q = query.trim().toLowerCase();
  if (!q) return [];

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
        const hasHybrid = dsfsUnder.some((d) =>
          (d.brand || "").toLowerCase().includes("hybrid")
        );

        const brandParts = [];
        if (hasIM3) brandParts.push("IM3");
        if (has3ID) brandParts.push("3ID");
        if (hasHybrid) brandParts.push("HYBRID");
        const tlBrandLabel = brandParts.length ? "TL " + brandParts.join(" & ") : "";

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
  ...tlMap.values(),
  ...dsfMatches,
].slice(0, 8);

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
    setQuery(item.data.namaTl);
  }

  // ================= DSF =================
  else {
    setSelectedDSF(item.data);
    setSelectedTL(null);
    setQuery(item.data.idDsf);
  }

  setShowSuggestions(false);
  setError("");
}


  return (
      <KpiProvider month={selectedMonth}>
    <Toaster position="top-right" />
    <div className="page">
      <div className="bg-blur a" />
      <div className="bg-blur b" />

      <div className="container">
        

<header className="mb-5 sm:mb-6">
  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

    {/* LEFT: identity */}
    <div className="min-w-0">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-success-700">
        <span className="inline-block h-2 w-2 rounded-full bg-success-500" />
        SPM Sumatera · Indosat
      </div>
      <h1 className="mt-1.5 text-[26px] leading-[1.1] sm:text-4xl font-extrabold tracking-tight text-ink-900">
        DSF Achievement Tracker
      </h1>

      {/* Data freshness chips */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-medium text-ink-600">
          <span className="h-1.5 w-1.5 rounded-full bg-warning-500" />
          IM3 <span className="font-bold text-ink-900">{dataDates.DATA_FWA_IM3 || "N/A"}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-medium text-ink-600">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
          3ID <span className="font-bold text-ink-900">{dataDates.DATA_FWA_3ID || "N/A"}</span>
        </span>
      </div>
    </div>

    {/* RIGHT: month switcher */}
    <div className="w-full sm:w-auto">
      <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-500 mb-1.5 sm:text-right">
        Bulan Pencapaian
      </label>
      <div className="relative w-full sm:w-56">
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="w-full appearance-none bg-white border border-ink-200 rounded-xl px-4 py-2.5 pr-10 text-sm font-semibold text-ink-800 shadow-soft focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
        >
          {Object.entries(MONTH_FILES).map(([key, m]) => (
            <option key={key} value={key}>{m.label}</option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-ink-400 text-[10px]">▼</div>
      </div>
    </div>

  </div>

  <div className="mt-4 h-px w-full bg-gradient-to-r from-brand-200 via-ink-200 to-transparent" />
</header>


        {loadError ? (
          <div className="card error flex items-center gap-3">
            <span className="text-lg">⚠️</span>
            <div>
              <div className="font-bold">Gagal memuat data</div>
              <div className="text-sm">{loadError}</div>
            </div>
          </div>
        ) : null}

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

  const _b = (dsf.brand || "").toLowerCase();
  const brandLabel = _b.includes("hybrid")
    ? "DSF HYBRID"
    : _b.includes("im3")
    ? "DSF IM3"
    : _b.includes("3id")
    ? "DSF 3ID"
    : "DSF";

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

{/* ================= Loading skeleton ================= */}
{loading && (
  <div className="card mt-6">
    <div className="flex items-center gap-3 text-ink-600">
      <span className="inline-block h-5 w-5 rounded-full border-2 border-ink-200 border-t-brand-600 animate-spin" />
      <span className="text-sm font-semibold">Memuat data pencapaian…</span>
    </div>
    <div className="mt-5 space-y-3 animate-pulse">
      <div className="h-20 rounded-xl bg-ink-100" />
      <div className="h-8 w-1/3 rounded-lg bg-ink-100" />
      <div className="h-64 rounded-xl bg-ink-100" />
    </div>
  </div>
)}

{/* ================= Breadcrumb ================= */}
{!loading && !loadError && (selectedTL || selectedDSF) && (
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

{!loading && !loadError && (
<AnimatePresence mode="wait">
{selectedDSF ? (
<DSFCard
  key={`${selectedDSF.idDsf}-${selectedMonth}-${admin}`}
  dsf={selectedDSF}
  dataDates={dataDates}
  fwaData={fwaData}
  adjData={adjData}
  month={selectedMonth}
  isAdmin={admin}
/>
  ) : selectedTL ? (
    <TLDashboard
      key={`${selectedTL.tlId}-${selectedMonth}`}
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
        dataDates={dataDates}
        month={selectedMonth}
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
)}

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
    <AdminKpiPanel
      currentMonth={selectedMonth}
      monthFiles={MONTH_FILES}
      onAuthChange={setAdmin}
      onDataChanged={() => setDataVersion((v) => v + 1)}
    />
    </KpiProvider>
  );
}
