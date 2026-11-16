// make.fun's public API: read-only GET, open to any origin (CORS).
// One cached fetch per URL: answers younger than 45 s are reused without a
// request, older ones revalidate with ETag (the API answers 304 inside the
// same minute), identical in-flight requests share one fetch, and stale data
// is the fallback when the network fails. Nothing here writes.

const API = 'https://make.fun/api';
const memory = new Map(); // path -> { etag, data, at }
const inflight = new Map(); // path -> Promise
const FRESH_MS = 45000;

function store(path, key, etag, data) {
  const rec = { etag, data, at: Date.now() };
  memory.set(path, rec);
  try {
    sessionStorage.setItem(key, JSON.stringify(rec));
  } catch {
    // storage unavailable (private mode): memory cache still works
  }
}

function loadStored(path, key) {
  const mem = memory.get(path);
  if (mem) return mem;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const rec = JSON.parse(raw);
    memory.set(path, rec);
    return rec;
  } catch {
    return null;
  }
}

async function fetchJSON(path) {
  const key = 'mf:' + path;
  const cached = loadStored(path, key);
  if (cached && Date.now() - cached.at < FRESH_MS) return cached.data;
  if (inflight.has(path)) return inflight.get(path);
  const job = (async () => {
    const headers = {};
    if (cached?.etag) headers['If-None-Match'] = cached.etag;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    let res;
    try {
      res = await fetch(API + path, { headers, signal: ctrl.signal });
    } catch (err) {
      clearTimeout(timer);
      if (cached) return cached.data; // offline: show the last good answer
      throw err;
    }
    clearTimeout(timer);
    if (res.status === 304 && cached) {
      store(path, key, cached.etag, cached.data); // revalidation: refresh the timestamp
      return cached.data;
    }
    if (!res.ok) {
      if (cached) return cached.data;
      throw new Error(`make.fun API ${res.status} for ${path}`);
    }
    const data = await res.json();
    store(path, key, res.headers.get('ETag'), data);
    return data;
  })();
  inflight.set(path, job);
  try {
    return await job;
  } finally {
    inflight.delete(path);
  }
}

/** The open bounties: { items: [...] } (activity=times leaves out the activity a board does not show). */
export const getBounties = () => fetchJSON('/competitions?status=open&activity=times');

/** One bounty, by its slug. */
export const getBounty = (slug) => fetchJSON(`/competitions/${encodeURIComponent(slug)}`);

/** A bounty's leaderboard: { columns, entries, ... }. */
export const getLeaderboard = (slug) => fetchJSON(`/competitions/${encodeURIComponent(slug)}/leaderboard`);

/** A public profile, by handle. */
export const getProfile = (handle) => fetchJSON(`/profiles/${encodeURIComponent(handle)}`);
