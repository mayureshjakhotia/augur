// InsForge persistence ($500 prize). Agent-native Postgres + auto REST.
// The "prophecies" table is AUGUR's ledger. In-memory fallback if no creds.

const mem = { prophecies: [] };
let idSeq = 1;

export function hasInsForge() {
  return Boolean(process.env.INSFORGE_BASE_URL && process.env.INSFORGE_API_KEY);
}

function headers() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.INSFORGE_API_KEY}`,
  };
}

function tableUrl(table) {
  const base = process.env.INSFORGE_BASE_URL.replace(/\/$/, "");
  return `${base}/api/database/records/${table}`;
}

export async function insList(table) {
  if (!hasInsForge()) return [...mem[table]].reverse();
  const res = await fetch(`${tableUrl(table)}?order=created_at.desc`, { headers: headers() });
  if (!res.ok) throw new Error(`InsForge list ${table} ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function insInsert(table, record) {
  if (!hasInsForge()) {
    const row = { id: String(idSeq++), created_at: new Date().toISOString(), ...record };
    mem[table].push(row);
    return row;
  }
  const res = await fetch(tableUrl(table), {
    method: "POST",
    headers: { ...headers(), Prefer: "return=representation" },
    body: JSON.stringify([record]), // InsForge insert body must be an array
  });
  if (!res.ok) throw new Error(`InsForge insert ${table} ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return Array.isArray(data) ? data[0] : data;
}

export async function insUpdate(table, id, patch) {
  if (!hasInsForge()) {
    const row = mem[table].find((r) => String(r.id) === String(id));
    if (row) Object.assign(row, patch);
    return row;
  }
  const res = await fetch(`${tableUrl(table)}?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { ...headers(), Prefer: "return=representation" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`InsForge update ${table} ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return Array.isArray(data) ? data[0] : data;
}

export function storageMode() {
  return hasInsForge() ? "insforge" : "memory";
}
