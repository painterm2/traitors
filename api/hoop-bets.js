const KEY = "hoop-bets";
const KEY_ODDS = "hoop-odds";
const ADMIN_SECRET = process.env.ADMIN_SECRET || "traitors2024";

// Use /pipeline endpoint: sends [["CMD","arg1","arg2"]] and returns [{result:...}]
async function pipeline(url, token, commands) {
  const base = url.replace(/\/$/, "");
  const res = await fetch(`${base}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upstash ${res.status}: ${text}`);
  }
  const data = await res.json();
  return data.map(d => {
    if (d.error) throw new Error(d.error);
    return d.result;
  });
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) return res.status(500).json({ error: "KV not configured" });

    if (req.method === "GET") {
      const [rawBets, rawOdds] = await pipeline(url, token, [
        ["GET", KEY],
        ["GET", KEY_ODDS],
      ]);
      const bets = rawBets ? (typeof rawBets === "string" ? JSON.parse(rawBets) : rawBets) : [];
      const odds = rawOdds ? (typeof rawOdds === "string" ? JSON.parse(rawOdds) : rawOdds) : {};
      return res.json({ bets, odds });
    }

    if (req.method === "POST") {
      const { bet, odds } = req.body;
      if (!bet?.bettor || !bet?.player || !bet?.amount) {
        return res.status(400).json({ error: "Missing fields" });
      }
      const [rawBets] = await pipeline(url, token, [["GET", KEY]]);
      const bets = rawBets ? (typeof rawBets === "string" ? JSON.parse(rawBets) : rawBets) : [];
      bets.push({ ...bet, id: Date.now(), ts: new Date().toISOString() });
      const cmds = [["SET", KEY, JSON.stringify(bets)]];
      if (odds) cmds.push(["SET", KEY_ODDS, JSON.stringify(odds)]);
      await pipeline(url, token, cmds);
      return res.json({ ok: true });
    }

    if (req.method === "DELETE") {
      const { secret } = req.body;
      if (secret !== ADMIN_SECRET) return res.status(403).json({ error: "Forbidden" });
      await pipeline(url, token, [["DEL", KEY], ["DEL", KEY_ODDS]]);
      return res.json({ ok: true });
    }

    res.status(405).end();
  } catch (e) {
    res.status(500).json({ error: e.message || "Internal server error" });
  }
}
