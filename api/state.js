const KEY = "traitors-game-state";
const ADMIN_SECRET = process.env.ADMIN_SECRET || "traitors2024";

async function kvGet(url, token) {
  const res = await fetch(`${url}/get/${KEY}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return data.result ?? null;
}

async function kvSet(url, token, value) {
  const res = await fetch(`${url}/set/${encodeURIComponent(KEY)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify([value]),
  });
  return res.ok;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") return res.status(200).end();

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    return res.status(500).json({ error: "KV not configured" });
  }

  if (req.method === "GET") {
    const value = await kvGet(url, token);
    return res.json({ value });
  }

  if (req.method === "POST") {
    const { value, secret } = req.body;
    if (secret !== ADMIN_SECRET) return res.status(403).json({ error: "Forbidden" });
    await kvSet(url, token, value);
    return res.json({ ok: true });
  }

  res.status(405).end();
}
