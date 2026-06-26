import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Settings, X, Plus, Trash2, Save, Lock } from "lucide-react";
import toast from "react-hot-toast";
import {
  ADMIN_PASSWORD,
  DEFAULT_KPI,
  fetchAllKpiConfigs,
  fetchKpiConfig,
  saveKpiConfig,
} from "../kpiConfig";

const emptyTier = () => ({ fwa_pct: 1, rev_pct: 1, incentive: 0 });

export default function AdminKpiPanel({ currentMonth, monthFiles = {} }) {
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [pwd, setPwd] = useState("");

  const [month, setMonth] = useState(currentMonth || "");
  const [form, setForm] = useState({ ...DEFAULT_KPI, month: currentMonth });
  const [allConfigs, setAllConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Daftar bulan: gabungan dari file dashboard + yang sudah ada di Supabase.
  const monthOptions = (() => {
    const set = new Set(Object.keys(monthFiles));
    allConfigs.forEach((c) => set.add(c.month));
    if (currentMonth) set.add(currentMonth);
    return [...set].sort().reverse();
  })();

  function labelFor(m) {
    return (
      monthFiles[m]?.label ||
      allConfigs.find((c) => c.month === m)?.label ||
      m
    );
  }

  // Load config bulan terpilih ke form.
  async function loadMonth(m) {
    if (!m) return;
    setLoading(true);
    const cfg = await fetchKpiConfig(m);
    setForm({ ...cfg, month: m, label: cfg.label || labelFor(m) });
    setLoading(false);
  }

  useEffect(() => {
    if (open && authed) {
      fetchAllKpiConfigs().then(setAllConfigs);
      loadMonth(month);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, authed]);

  function tryLogin(e) {
    e?.preventDefault();
    if (pwd === ADMIN_PASSWORD) {
      setAuthed(true);
      setPwd("");
    } else {
      toast.error("Password salah");
    }
  }

  function setField(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function setTier(i, k, v) {
    setForm((f) => {
      const tiers = f.tiers.map((t, idx) =>
        idx === i ? { ...t, [k]: v } : t
      );
      return { ...f, tiers };
    });
  }

  function addTier() {
    setForm((f) => ({ ...f, tiers: [...f.tiers, emptyTier()] }));
  }

  function removeTier(i) {
    setForm((f) => ({ ...f, tiers: f.tiers.filter((_, idx) => idx !== i) }));
  }

  async function onSave() {
    if (!form.month || !/^\d{6}$/.test(form.month)) {
      toast.error("Bulan harus format YYYYMM, mis. 202606");
      return;
    }
    setSaving(true);
    try {
      const cleanTiers = form.tiers
        .map((t) => ({
          fwa_pct: Number(t.fwa_pct) || 0,
          rev_pct: Number(t.rev_pct) || 0,
          incentive: Number(t.incentive) || 0,
        }))
        .sort((a, b) => b.incentive - a.incentive);

      await saveKpiConfig({ ...form, tiers: cleanTiers });
      toast.success(`KPI ${labelFor(form.month)} tersimpan`);
      const cfgs = await fetchAllKpiConfigs();
      setAllConfigs(cfgs);
    } catch (err) {
      toast.error(err.message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  // Tombol mengambang
  const fab = (
    <button
      onClick={() => setOpen(true)}
      title="Admin KPI"
      className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-gray-900 text-white px-4 py-3 shadow-lg hover:bg-gray-700 transition"
    >
      <Settings size={18} />
      <span className="text-sm font-medium hidden sm:inline">Admin KPI</span>
    </button>
  );

  if (!open) return createPortal(fab, document.body);

  const overlay = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4 sticky top-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Settings size={18} className="text-gray-700" />
            <h2 className="text-lg font-bold text-gray-900">
              Pengaturan KPI {authed ? "(Admin)" : ""}
            </h2>
          </div>
          <button
            onClick={() => {
              setOpen(false);
            }}
            className="text-gray-400 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        {!authed ? (
          <form onSubmit={tryLogin} className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-gray-600 text-sm">
              <Lock size={16} /> Masukkan password admin untuk mengubah KPI.
            </div>
            <input
              type="password"
              autoFocus
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              placeholder="Password admin"
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800"
            />
            <button
              type="submit"
              className="w-full rounded-xl bg-gray-900 text-white py-2.5 text-sm font-medium hover:bg-gray-700"
            >
              Masuk
            </button>
          </form>
        ) : (
          <div className="p-5 space-y-5">
            {/* Pilih bulan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  Bulan (YYYYMM)
                </label>
                <div className="flex gap-2">
                  <select
                    value={monthOptions.includes(month) ? month : ""}
                    onChange={(e) => {
                      setMonth(e.target.value);
                      loadMonth(e.target.value);
                    }}
                    className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">— pilih —</option>
                    {monthOptions.map((m) => (
                      <option key={m} value={m}>
                        {labelFor(m)} ({m})
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  value={form.month || ""}
                  onChange={(e) => setField("month", e.target.value.trim())}
                  placeholder="atau ketik bulan baru, mis. 202606"
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  Label
                </label>
                <input
                  value={form.label || ""}
                  onChange={(e) => setField("label", e.target.value)}
                  placeholder="mis. June 2026"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            {loading && (
              <div className="text-sm text-gray-500">Memuat config…</div>
            )}

            {/* Angka KPI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <NumberField
                label="Target FWA per DSF (unit)"
                value={form.target_fwa}
                onChange={(v) => setField("target_fwa", v)}
              />
              <NumberField
                label="Target Revenue per DSF (Rp)"
                value={form.revenue_target}
                onChange={(v) => setField("revenue_target", v)}
              />
              <NumberField
                label="Nilai FWA 4G (Rp/unit)"
                value={form.fwa_unit_value}
                onChange={(v) => setField("fwa_unit_value", v)}
              />
              <NumberField
                label="Nilai FWA 5G (Rp/unit)"
                value={form.fwa_5g_unit_value}
                onChange={(v) => setField("fwa_5g_unit_value", v)}
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={!!form.include_hajj}
                onChange={(e) => setField("include_hajj", e.target.checked)}
                className="h-4 w-4"
              />
              Hitung revenue Rebuy Haji bulan ini
            </label>

            {/* Tier insentif */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-gray-900">
                  Skema Insentif (tier)
                </h3>
                <button
                  onClick={addTier}
                  className="flex items-center gap-1 text-xs font-medium text-gray-700 hover:text-gray-900"
                >
                  <Plus size={14} /> Tambah tier
                </button>
              </div>

              <div className="rounded-xl border border-gray-200 divide-y">
                <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-gray-50 text-[11px] font-semibold text-gray-500 uppercase">
                  <div className="col-span-3">% FWA</div>
                  <div className="col-span-3">% Revenue</div>
                  <div className="col-span-5">Insentif (Rp)</div>
                  <div className="col-span-1" />
                </div>
                {form.tiers.map((t, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-12 gap-2 px-3 py-2 items-center"
                  >
                    <input
                      type="number"
                      step="0.05"
                      value={t.fwa_pct}
                      onChange={(e) => setTier(i, "fwa_pct", e.target.value)}
                      className="col-span-3 rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                    />
                    <input
                      type="number"
                      step="0.05"
                      value={t.rev_pct}
                      onChange={(e) => setTier(i, "rev_pct", e.target.value)}
                      className="col-span-3 rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                    />
                    <input
                      type="number"
                      step="1000"
                      value={t.incentive}
                      onChange={(e) => setTier(i, "incentive", e.target.value)}
                      className="col-span-5 rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                    />
                    <button
                      onClick={() => removeTier(i)}
                      className="col-span-1 text-gray-400 hover:text-red-600 flex justify-center"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-gray-400 leading-relaxed">
                % FWA = bagian dari Target FWA yang wajib dicapai (1 = 100%, 0.75
                = 75%). % Revenue = bagian dari Target Revenue. Tier dievaluasi
                dari insentif tertinggi; yang pertama terpenuhi yang dipakai.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                Tutup
              </button>
              <button
                onClick={onSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-gray-900 text-white px-4 py-2 text-sm font-medium hover:bg-gray-700 disabled:opacity-60"
              >
                <Save size={16} /> {saving ? "Menyimpan…" : "Simpan"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}

function NumberField({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">
        {label}
      </label>
      <input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800"
      />
    </div>
  );
}
