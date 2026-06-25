const KEY = "traitors-bets";
const ADMIN_SECRET = process.env.ADMIN_SECRET || "traitors2024";

async function upstash(url, token, ...args) {
  const res = await fetch(`${url}/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return res.status(500).json({ error: "KV not configured" });

  if (req.method === "GET") {
    const raw = await upstash(url, token, "GET", KEY);
    const bets = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : [];
    return res.json({ bets });
  }

  if (req.method === "POST") {
    const { bet } = req.body;
    if (!bet?.bettor || !bet?.player || !bet?.amount) {
      return res.status(400).json({ error: "Missing fields" });
    }
    const raw = await upstash(url, token, "GET", KEY);
    const bets = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : [];
    bets.push({ ...bet, id: Date.now(), timestamp: new Date().toISOString() });
    await upstash(url, token, "SET", KEY, JSON.stringify(bets));
    return res.json({ ok: true });
  }

  if (req.method === "DELETE") {
    const { secret } = req.body;
    if (secret !== ADMIN_SECRET) return res.status(403).json({ error: "Forbidden" });
    await upstash(url, token, "DEL", KEY);
    return res.json({ ok: true });
  }

  res.status(405).end();
}
