import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Settings, X, Plus, Trash2, Save, Lock, LogOut, Upload } from "lucide-react";
import toast from "react-hot-toast";
import {
  DEFAULT_KPI,
  fetchAllKpiConfigs,
  fetchKpiConfig,
  saveKpiConfig,
} from "../kpiConfig";
import { signIn, signOut, getSession, adminEmail } from "../supabaseAuth";
import { uploadMonth, fetchManpower, saveManpower } from "../supabaseData";
import { parseCSV, mapRowToDSF } from "../utils";

const emptyTier = () => ({ fwa_pct: 1, rev_pct: 1, incentive: 0 });

const DEFAULT_REGIONS = [
  { region_code: "NSA", region_name: "NORTH SUMATERA" },
  { region_code: "SSA", region_name: "SOUTH SUMATERA" },
  { region_code: "CSA", region_name: "CENTRAL SUMATERA" },
];

export default function AdminKpiPanel({ currentMonth, monthFiles = {}, onDataChanged, onAuthChange }) {
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(!!getSession());
  const [tab, setTab] = useState("kpi");

  // login
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [signing, setSigning] = useState(false);

  // kpi
  const [month, setMonth] = useState(currentMonth || "");
  const [form, setForm] = useState({ ...DEFAULT_KPI, month: currentMonth });
  const [allConfigs, setAllConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // upload
  const [upMonth, setUpMonth] = useState(currentMonth || "");
  const [upLabel, setUpLabel] = useState("");
  const [dsfFile, setDsfFile] = useState(null);
  const [fwaFile, setFwaFile] = useState(null);
  const [adjFile, setAdjFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");

  // manpower (per bulan)
  const [mpMonth, setMpMonth] = useState(currentMonth || "");
  const [mpRows, setMpRows] = useState([]);
  const [mpSaving, setMpSaving] = useState(false);

  const monthOptions = (() => {
    const set = new Set(Object.keys(monthFiles));
    allConfigs.forEach((c) => set.add(c.month));
    if (currentMonth) set.add(currentMonth);
    return [...set].sort().reverse();
  })();

  function labelFor(m) {
    return monthFiles[m]?.label || allConfigs.find((c) => c.month === m)?.label || m;
  }

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
      loadMp(mpMonth);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, authed]);

  // Selalu tampilkan 3 region; isi dari data bulan tsb (atau 0 bila belum ada).
  async function loadMp(m) {
    const { rows } = await fetchManpower(m);
    const merged = DEFAULT_REGIONS.map((d) => {
      const found = rows.find((r) => r.region_code === d.region_code);
      return { ...d, manpower: found ? found.manpower : 0 };
    });
    setMpRows(merged);
  }

  function setMpField(code, v) {
    setMpRows((rows) => rows.map((r) => (r.region_code === code ? { ...r, manpower: v } : r)));
  }

  async function onSaveManpower() {
    if (!mpMonth || !/^\d{6}$/.test(mpMonth)) {
      toast.error("Bulan harus format YYYYMM");
      return;
    }
    setMpSaving(true);
    try {
      for (const r of mpRows) {
        await saveManpower(mpMonth, r.region_code, r.region_name, r.manpower);
      }
      toast.success(`Manpower ${mpMonth} tersimpan`);
      onDataChanged?.();
    } catch (err) {
      toast.error(err.message || "Gagal simpan manpower");
    } finally {
      setMpSaving(false);
    }
  }

  async function doLogin(e) {
    e?.preventDefault();
    setSigning(true);
    try {
      await signIn(email.trim(), pwd);
      setAuthed(true);
      setPwd("");
      onAuthChange?.(true);
      toast.success("Login admin berhasil");
    } catch (err) {
      toast.error(err.message || "Login gagal");
    } finally {
      setSigning(false);
    }
  }

  async function doLogout() {
    await signOut();
    setAuthed(false);
    onAuthChange?.(false);
    toast("Logout admin");
  }

  function setField(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  function setTier(i, k, v) {
    setForm((f) => ({ ...f, tiers: f.tiers.map((t, idx) => (idx === i ? { ...t, [k]: v } : t)) }));
  }
  function addTier() {
    setForm((f) => ({ ...f, tiers: [...f.tiers, emptyTier()] }));
  }
  function removeTier(i) {
    setForm((f) => ({ ...f, tiers: f.tiers.filter((_, idx) => idx !== i) }));
  }

  async function onSaveKpi() {
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
      setAllConfigs(await fetchAllKpiConfigs());
    } catch (err) {
      toast.error(err.message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function onUpload() {
    if (!upMonth || !/^\d{6}$/.test(upMonth)) {
      toast.error("Bulan harus format YYYYMM, mis. 202607");
      return;
    }
    if (!dsfFile) {
      toast.error("File DSF wajib diunggah.");
      return;
    }
    setUploading(true);
    setProgress("Membaca file…");
    try {
      const dsfText = await dsfFile.text();
      const dsfRows = parseCSV(dsfText).map((r, i) => mapRowToDSF(r, i)).filter((x) => x.idDsf);
      if (dsfRows.length === 0) throw new Error("Tidak ada DSF terbaca dari file DSF.");

      const fwaRows = fwaFile ? parseCSV(await fwaFile.text()) : [];
      const adjRows = adjFile ? parseCSV(await adjFile.text()) : [];

      const res = await uploadMonth({
        month: upMonth,
        label: upLabel || labelFor(upMonth),
        dsfRows,
        fwaRows,
        adjRows,
        onProgress: (p) => {
          const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
          const name = { hapus: "Menghapus data lama", dsf: "Upload DSF", msisdn: "Upload MSISDN" }[p.phase] || p.phase;
          setProgress(`${name}… ${p.total ? `${p.done}/${p.total} (${pct}%)` : ""}`);
        },
      });

      toast.success(`Tersimpan: ${res.dsf} DSF, ${res.fwa} FWA, ${res.adj} ADJ`);
      setProgress("Selesai ✓");
      onDataChanged?.(upMonth);
    } catch (err) {
      toast.error(err.message || "Upload gagal");
      setProgress("");
    } finally {
      setUploading(false);
    }
  }

  const fab = (
    <button
      onClick={() => setOpen(true)}
      title="Admin"
      className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-ink-900 text-white px-4 py-3 shadow-lg hover:bg-ink-700 transition"
    >
      <Settings size={18} />
      <span className="text-sm font-medium hidden sm:inline">Admin</span>
    </button>
  );

  if (!open) return createPortal(fab, document.body);

  const overlay = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4 sticky top-0 bg-white rounded-t-2xl z-10">
          <div className="flex items-center gap-2">
            <Settings size={18} className="text-ink-700" />
            <h2 className="text-lg font-bold text-ink-900">Panel Admin</h2>
          </div>
          <div className="flex items-center gap-3">
            {authed && (
              <button onClick={doLogout} className="flex items-center gap-1 text-xs text-ink-500 hover:text-danger-600">
                <LogOut size={14} /> Logout
              </button>
            )}
            <button onClick={() => setOpen(false)} className="text-ink-400 hover:text-ink-700">
              <X size={20} />
            </button>
          </div>
        </div>

        {!authed ? (
          <form onSubmit={doLogin} className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-ink-600 text-sm">
              <Lock size={16} /> Login admin untuk mengubah KPI & upload data.
            </div>
            <input
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email admin"
              className="w-full rounded-xl border border-ink-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ink-800"
            />
            <input
              type="password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              placeholder="Password"
              className="w-full rounded-xl border border-ink-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ink-800"
            />
            <button
              type="submit"
              disabled={signing}
              className="w-full rounded-xl bg-ink-900 text-white py-2.5 text-sm font-medium hover:bg-ink-700 disabled:opacity-60"
            >
              {signing ? "Masuk…" : "Masuk"}
            </button>
          </form>
        ) : (
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setTab("kpi")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${tab === "kpi" ? "bg-ink-900 text-white" : "bg-ink-100 text-ink-600"}`}
                >
                  KPI
                </button>
                <button
                  onClick={() => setTab("upload")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${tab === "upload" ? "bg-ink-900 text-white" : "bg-ink-100 text-ink-600"}`}
                >
                  Upload Data
                </button>
                <button
                  onClick={() => setTab("manpower")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${tab === "manpower" ? "bg-ink-900 text-white" : "bg-ink-100 text-ink-600"}`}
                >
                  Manpower
                </button>
              </div>
              <span className="text-[11px] text-ink-400 truncate max-w-[40%]">{adminEmail()}</span>
            </div>

            {tab === "kpi" ? renderKpiTab() : tab === "upload" ? renderUploadTab() : renderManpowerTab()}
          </div>
        )}
      </div>
    </div>
  );

  function renderKpiTab() {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-ink-500 mb-1">Bulan (YYYYMM)</label>
            <select
              value={monthOptions.includes(month) ? month : ""}
              onChange={(e) => { setMonth(e.target.value); loadMonth(e.target.value); }}
              className="w-full rounded-xl border border-ink-300 px-3 py-2 text-sm"
            >
              <option value="">— pilih —</option>
              {monthOptions.map((m) => (
                <option key={m} value={m}>{labelFor(m)} ({m})</option>
              ))}
            </select>
            <input
              value={form.month || ""}
              onChange={(e) => setField("month", e.target.value.trim())}
              placeholder="atau ketik bulan baru, mis. 202607"
              className="mt-2 w-full rounded-xl border border-ink-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-500 mb-1">Label</label>
            <input
              value={form.label || ""}
              onChange={(e) => setField("label", e.target.value)}
              placeholder="mis. July 2026"
              className="w-full rounded-xl border border-ink-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {loading && <div className="text-sm text-ink-500">Memuat config…</div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <NumberField label="Target FWA per DSF (unit)" value={form.target_fwa} onChange={(v) => setField("target_fwa", v)} />
          <NumberField label="Target Revenue per DSF (Rp)" value={form.revenue_target} onChange={(v) => setField("revenue_target", v)} />
          <NumberField label="Nilai FWA 4G (Rp/unit)" value={form.fwa_unit_value} onChange={(v) => setField("fwa_unit_value", v)} />
          <NumberField label="Nilai FWA 5G (Rp/unit)" value={form.fwa_5g_unit_value} onChange={(v) => setField("fwa_5g_unit_value", v)} />
        </div>

        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input type="checkbox" checked={!!form.include_hajj} onChange={(e) => setField("include_hajj", e.target.checked)} className="h-4 w-4" />
          Hitung revenue Rebuy Haji bulan ini
        </label>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-ink-900">Skema Insentif (tier)</h3>
            <button onClick={addTier} className="flex items-center gap-1 text-xs font-medium text-ink-700 hover:text-ink-900">
              <Plus size={14} /> Tambah tier
            </button>
          </div>
          <div className="rounded-xl border border-ink-200 divide-y">
            <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-ink-50 text-[11px] font-semibold text-ink-500 uppercase">
              <div className="col-span-3">% FWA</div>
              <div className="col-span-3">% Revenue</div>
              <div className="col-span-5">Insentif (Rp)</div>
              <div className="col-span-1" />
            </div>
            {form.tiers.map((t, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 px-3 py-2 items-center">
                <input type="number" step="0.05" value={t.fwa_pct} onChange={(e) => setTier(i, "fwa_pct", e.target.value)} className="col-span-3 rounded-lg border border-ink-300 px-2 py-1.5 text-sm" />
                <input type="number" step="0.05" value={t.rev_pct} onChange={(e) => setTier(i, "rev_pct", e.target.value)} className="col-span-3 rounded-lg border border-ink-300 px-2 py-1.5 text-sm" />
                <input type="number" step="1000" value={t.incentive} onChange={(e) => setTier(i, "incentive", e.target.value)} className="col-span-5 rounded-lg border border-ink-300 px-2 py-1.5 text-sm" />
                <button onClick={() => removeTier(i)} className="col-span-1 text-ink-400 hover:text-danger-600 flex justify-center">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-ink-400 leading-relaxed">
            % FWA = bagian dari Target FWA yang wajib dicapai (1 = 100%). % Revenue = bagian dari Target Revenue. Tier dievaluasi dari insentif tertinggi.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={() => setOpen(false)} className="rounded-xl px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100">Tutup</button>
          <button onClick={onSaveKpi} disabled={saving} className="flex items-center gap-2 rounded-xl bg-ink-900 text-white px-4 py-2 text-sm font-medium hover:bg-ink-700 disabled:opacity-60">
            <Save size={16} /> {saving ? "Menyimpan…" : "Simpan KPI"}
          </button>
        </div>
      </div>
    );
  }

  function renderUploadTab() {
    return (
      <div className="space-y-4">
        <div className="text-sm text-ink-600">
          Unggah CSV bulanan ke Supabase. Data lama bulan yang sama akan diganti. MSISDN disimpan aman — hanya admin yang melihat nomor penuh.
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-ink-500 mb-1">Bulan (YYYYMM)</label>
            <input value={upMonth} onChange={(e) => setUpMonth(e.target.value.trim())} placeholder="mis. 202607" className="w-full rounded-xl border border-ink-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-500 mb-1">Label</label>
            <input value={upLabel} onChange={(e) => setUpLabel(e.target.value)} placeholder="mis. July 2026" className="w-full rounded-xl border border-ink-300 px-3 py-2 text-sm" />
          </div>
        </div>

        <FileField label="File DSF (wajib)" file={dsfFile} onChange={setDsfFile} />
        <FileField label="File FWA (daftar MSISDN)" file={fwaFile} onChange={setFwaFile} />
        <FileField label="File ADJ_FWA (penyesuaian)" file={adjFile} onChange={setAdjFile} />

        {progress && <div className="text-sm font-medium text-ink-700">{progress}</div>}

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={() => setOpen(false)} className="rounded-xl px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100">Tutup</button>
          <button onClick={onUpload} disabled={uploading} className="flex items-center gap-2 rounded-xl bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-60">
            <Upload size={16} /> {uploading ? "Mengunggah…" : "Upload ke Supabase"}
          </button>
        </div>
      </div>
    );
  }

  function renderManpowerTab() {
    return (
      <div className="space-y-4">
        <div className="text-sm text-ink-600">
          Jumlah manpower (headcount DSF) per region, <b>per bulan</b>. Dipakai untuk produktivitas di leaderboard level Region. Bisa juga diedit langsung di tabel <code className="text-xs bg-ink-100 px-1 rounded">manpower</code> Supabase.
        </div>
        <div className="sm:w-48">
          <label className="block text-xs font-semibold text-ink-500 mb-1">Bulan (YYYYMM)</label>
          <div className="flex gap-2">
            <select
              value={monthOptions.includes(mpMonth) ? mpMonth : ""}
              onChange={(e) => { setMpMonth(e.target.value); loadMp(e.target.value); }}
              className="flex-1 rounded-lg border border-ink-300 px-3 py-2 text-sm"
            >
              <option value="">— pilih —</option>
              {monthOptions.map((m) => (<option key={m} value={m}>{labelFor(m)} ({m})</option>))}
            </select>
          </div>
          <input
            value={mpMonth}
            onChange={(e) => { const v = e.target.value.trim(); setMpMonth(v); if (/^\d{6}$/.test(v)) loadMp(v); }}
            placeholder="atau ketik bulan, mis. 202607"
            className="mt-2 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
          />
        </div>
        <div className="rounded-xl border border-ink-200 divide-y">
          <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-ink-50 text-[11px] font-semibold text-ink-500 uppercase">
            <div className="col-span-3">Kode</div>
            <div className="col-span-6">Region</div>
            <div className="col-span-3">Manpower</div>
          </div>
          {mpRows.length === 0 && <div className="px-3 py-3 text-sm text-ink-400">Memuat…</div>}
          {mpRows.map((r) => (
            <div key={r.region_code} className="grid grid-cols-12 gap-2 px-3 py-2 items-center">
              <div className="col-span-3 font-bold text-ink-800">{r.region_code}</div>
              <div className="col-span-6 text-sm text-ink-600">{r.region_name}</div>
              <input
                type="number"
                value={r.manpower}
                onChange={(e) => setMpField(r.region_code, e.target.value)}
                className="col-span-3 rounded-lg border border-ink-300 px-2 py-1.5 text-sm"
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={() => setOpen(false)} className="rounded-xl px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100">Tutup</button>
          <button onClick={onSaveManpower} disabled={mpSaving} className="flex items-center gap-2 rounded-xl bg-ink-900 text-white px-4 py-2 text-sm font-medium hover:bg-ink-700 disabled:opacity-60">
            <Save size={16} /> {mpSaving ? "Menyimpan…" : "Simpan Manpower"}
          </button>
        </div>
      </div>
    );
  }

  return createPortal(overlay, document.body);
}

function NumberField({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-ink-500 mb-1">{label}</label>
      <input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-ink-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink-800"
      />
    </div>
  );
}

function FileField({ label, file, onChange }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-ink-500 mb-1">{label}</label>
      <input
        type="file"
        accept=".csv,text/csv"
        onChange={(e) => onChange(e.target.files?.[0] || null)}
        className="w-full text-sm text-ink-600 file:mr-3 file:rounded-lg file:border-0 file:bg-ink-900 file:px-3 file:py-1.5 file:text-white file:text-xs file:font-semibold hover:file:bg-ink-700"
      />
      {file && <div className="mt-1 text-[11px] text-ink-400">{file.name}</div>}
    </div>
  );
}
