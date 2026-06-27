// ============================================================
// LOGIN ADMIN — Supabase Auth via REST (gotrue), tanpa SDK.
// ------------------------------------------------------------
// - signIn(email, password): tukar ke access_token (JWT role authenticated)
// - session disimpan di localStorage; dipakai untuk membaca MSISDN penuh
//   dan menyimpan KPI / upload data.
// - Tanpa login, app jalan sebagai anon (MSISDN ter-mask oleh server).
// ============================================================

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./kpiConfig";

const AUTH = `${SUPABASE_URL}/auth/v1`;
const STORE_KEY = "dsf_admin_session";

function baseHeaders() {
  return { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" };
}

export function getSession() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s?.access_token) return null;
    // expires_at dalam detik epoch
    if (s.expires_at && s.expires_at * 1000 < Date.now()) {
      localStorage.removeItem(STORE_KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export function getAccessToken() {
  return getSession()?.access_token || null;
}

export function isAdmin() {
  return !!getAccessToken();
}

export function adminEmail() {
  return getSession()?.user?.email || "";
}

export async function signIn(email, password) {
  const res = await fetch(`${AUTH}/token?grant_type=password`, {
    method: "POST",
    headers: baseHeaders(),
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error_description || data?.msg || "Email atau password salah");
  }
  localStorage.setItem(STORE_KEY, JSON.stringify(data));
  return data;
}

export async function signOut() {
  const token = getAccessToken();
  localStorage.removeItem(STORE_KEY);
  if (token) {
    try {
      await fetch(`${AUTH}/logout`, {
        method: "POST",
        headers: { ...baseHeaders(), Authorization: `Bearer ${token}` },
      });
    } catch {
      // abaikan
    }
  }
}
