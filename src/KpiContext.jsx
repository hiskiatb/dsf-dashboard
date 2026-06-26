import React, { createContext, useContext, useEffect, useState } from "react";
import { DEFAULT_KPI, fetchKpiConfig } from "./kpiConfig";

const KpiContext = createContext(DEFAULT_KPI);

// Provider: load konfigurasi KPI untuk bulan aktif dari Supabase.
// Selama loading / kalau gagal, pakai DEFAULT_KPI supaya UI tetap jalan.
export function KpiProvider({ month, children }) {
  const [kpi, setKpi] = useState({ ...DEFAULT_KPI, month });

  useEffect(() => {
    let alive = true;
    fetchKpiConfig(month).then((cfg) => {
      if (alive) setKpi(cfg);
    });
    return () => {
      alive = false;
    };
  }, [month]);

  return <KpiContext.Provider value={kpi}>{children}</KpiContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useKpi() {
  return useContext(KpiContext);
}
