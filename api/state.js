import { kv } from "@vercel/kv";

const KEY = "traitors-game-state";
const ADMIN_SECRET = process.env.ADMIN_SECRET || "traitors2024";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    const value = await kv.get(KEY);
    return res.json({ value });
  }

  if (req.method === "POST") {
    const { value, secret } = req.body;
    if (secret !== ADMIN_SECRET) return res.status(403).json({ error: "Forbidden" });
    await kv.set(KEY, value);
    return res.json({ ok: true });
  }

  res.status(405).end();
}
