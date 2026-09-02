import { kv } from "@vercel/kv";

const KEY = "hoop-bets";
const KEY_ODDS = "hoop-odds";
const ADMIN_SECRET = process.env.ADMIN_SECRET || "traitors2024";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (req.method === "GET") {
      const [bets, odds] = await Promise.all([
        kv.get(KEY),
        kv.get(KEY_ODDS),
      ]);
      return res.json({ bets: bets || [], odds: odds || {} });
    }

    if (req.method === "POST") {
      const { bet, odds } = req.body;
      if (!bet?.bettor || !bet?.player || !bet?.amount) {
        return res.status(400).json({ error: "Missing fields" });
      }
      const existing = (await kv.get(KEY)) || [];
      existing.push({ ...bet, id: Date.now(), ts: new Date().toISOString() });
      await Promise.all([
        kv.set(KEY, existing),
        odds ? kv.set(KEY_ODDS, odds) : Promise.resolve(),
      ]);
      return res.json({ ok: true });
    }

    if (req.method === "DELETE") {
      const { secret } = req.body;
      if (secret !== ADMIN_SECRET) return res.status(403).json({ error: "Forbidden" });
      await Promise.all([kv.del(KEY), kv.del(KEY_ODDS)]);
      return res.json({ ok: true });
    }

    res.status(405).end();
  } catch (e) {
    res.status(500).json({ error: e.message || "Internal server error" });
  }
}
