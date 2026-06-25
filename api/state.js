const KEY = "traitors-game-state";
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

  if (req.method === "OPTIONS") return res.status(200).end();

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    return res.status(500).json({ error: "KV not configured", url: !!url, token: !!token });
  }

  if (req.method === "GET") {
    const value = await upstash(url, token, "GET", KEY);
    return res.json({ value });
  }

  if (req.method === "POST") {
    const { value, secret } = req.body;
    if (secret !== ADMIN_SECRET) return res.status(403).json({ error: "Forbidden" });
    await upstash(url, token, "SET", KEY, value);
    return res.json({ ok: true });
  }

  res.status(405).end();
}
