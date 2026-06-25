import { useState, useEffect, useRef } from "react";

const PLAYERS = ["Alex", "Santi", "Dean", "Annie", "Nat", "Jordan", "Skyler", "Sammie"];
const STORAGE_KEY = "traitors-game-state";
const BETTOR_KEY = "traitors-bettor-name";
const ACCENT = "#e8b84b";

const ADMIN_SECRET = "traitors2024";
const isAdmin = () => new URLSearchParams(window.location.search).get("admin") === ADMIN_SECRET;

const INITIAL_TICKER = [
  { id: 1, text: "🔪 MURDER — Lucy was found dead in the castle last night" },
  { id: 2, text: "🚪 BANISHED — Michael and Kim were voted out by the Faithfuls yesterday" },
  { id: 3, text: "📈 ODDS SHIFT — Alex's Traitor odds have risen sharply following last night's events" },
  { id: 4, text: "⚽ WORLD CUP 2026 — USA advances to Round of 16 after 2-1 win over Portugal at MetLife Stadium" },
  { id: 5, text: "⚽ WORLD CUP 2026 — Brazil tops Group C with a dominant 3-0 performance vs. Serbia" },
  { id: 6, text: "⚽ WORLD CUP 2026 — France and Argentina set for blockbuster Round of 16 clash Friday" },
  { id: 7, text: "⚽ WORLD CUP 2026 — England's Bellingham scores brace in 2-0 Group D win over Iran" },
  { id: 8, text: "🏀 NBA FINALS — Game 5 tonight: OKC Thunder lead series 3-1 over Boston Celtics" },
  { id: 9, text: "🏀 NBA — Shai Gilgeous-Alexander puts up 38 pts in must-watch Game 4 performance" },
  { id: 10, text: "🎾 WIMBLEDON — Qualifying begins next week as grass court season reaches its peak" },
  { id: 11, text: "🏎️ F1 — Canadian Grand Prix results: Verstappen wins, Norris P2, Russell P3" },
  { id: 12, text: "⚾ MLB — Yankees vs Dodgers rivalry renewed tonight at Yankee Stadium, first pitch 7pm ET" },
];

const defaultState = {
  odds: { Alex: 45, Santi: 30, Dean: 60, Annie: 25, Nat: 55, Jordan: 35, Skyler: 50, Sammie: 40 },
  eliminated: [],
  revealed: {},
  ticker: INITIAL_TICKER,
};

const probabilityToAmerican = (prob) => {
  if (prob <= 0 || prob >= 1) return "N/A";
  if (prob >= 0.5) return `-${Math.round((prob / (1 - prob)) * 100)}`;
  return `+${Math.round(((1 - prob) / prob) * 100)}`;
};
const pctToAmerican = (pct) => probabilityToAmerican(pct / 100);

const getTier = (pct) => {
  if (pct >= 60) return { label: "PRIME SUSPECT", color: "#c0392b" };
  if (pct >= 40) return { label: "SUSPICIOUS", color: "#e67e22" };
  if (pct >= 25) return { label: "UNCERTAIN", color: "#f1c40f" };
  return { label: "LIKELY FAITHFUL", color: "#27ae60" };
};

const calcPayout = (amount, american) => {
  const o = parseFloat(american);
  if (isNaN(o) || o === 0) return amount;
  return o > 0 ? amount * (1 + o / 100) : amount * (1 + 100 / Math.abs(o));
};

const printBetSlip = (myBets, bettorName, odds) => {
  const rows = myBets.map(b => {
    const payout = calcPayout(b.amount, b.odds).toFixed(2);
    return `
      <tr>
        <td>${b.player}</td>
        <td style="color:${parseFloat(b.odds) < 0 ? '#e05555' : '#5db85d'}">${b.odds}</td>
        <td>${b.amount}</td>
        <td>${payout}</td>
      </tr>`;
  }).join("");

  const total = myBets.reduce((s, b) => s + b.amount, 0);
  const totalPayout = myBets.reduce((s, b) => s + calcPayout(b.amount, b.odds), 0).toFixed(2);

  const win = window.open("", "_blank");
  win.document.write(`<!DOCTYPE html><html><head><title>Bet Slip — ${bettorName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0d0d0d; color: #f0ead6; font-family: Georgia, serif; display: flex; justify-content: center; padding: 40px 20px; }
    .slip { width: 360px; border: 1px solid #e8b84b; border-radius: 8px; overflow: hidden; }
    .slip-header { background: #1a0a0a; padding: 24px; text-align: center; border-bottom: 1px solid #3a1a1a; }
    .slip-label { font-size: 10px; letter-spacing: 5px; color: #e8b84b; font-family: Arial Narrow, Arial, sans-serif; margin-bottom: 6px; }
    .slip-title { font-size: 22px; font-weight: 700; letter-spacing: 2px; }
    .slip-bettor { font-size: 13px; color: #aaa; margin-top: 4px; font-style: italic; }
    .slip-date { font-size: 10px; color: #555; margin-top: 4px; font-family: Arial, sans-serif; }
    table { width: 100%; border-collapse: collapse; }
    th { font-size: 9px; letter-spacing: 2px; color: #555; font-family: Arial Narrow, Arial, sans-serif; text-align: left; padding: 10px 16px 6px; border-bottom: 1px solid #1f1f1f; }
    td { font-size: 13px; padding: 10px 16px; border-bottom: 1px solid #111; font-family: Arial, sans-serif; }
    tr:last-child td { border-bottom: none; }
    .totals { background: #111; padding: 14px 16px; display: flex; justify-content: space-between; font-size: 12px; font-family: Arial Narrow, Arial, sans-serif; letter-spacing: 1px; border-top: 1px solid #2a2a2a; }
    .totals .label { color: #888; }
    .totals .val { color: #e8b84b; font-weight: 700; }
    .slip-footer { background: #0a0a0a; padding: 14px; text-align: center; font-size: 9px; color: #444; font-family: Arial, sans-serif; letter-spacing: 2px; border-top: 1px solid #111; }
    @media print { body { background: white; } .slip { border-color: #aaa; } .slip-header { background: #f5f5f5; } body, .slip-bettor, .slip-date, td { color: #111; } th, .slip-label, .slip-footer, .totals .label { color: #555; } .totals { background: #eee; } .totals .val { color: #222; } }
  </style></head><body>
  <div class="slip">
    <div class="slip-header">
      <div class="slip-label">THE TRAITORS</div>
      <div class="slip-title">BET SLIP</div>
      <div class="slip-bettor">${bettorName}</div>
      <div class="slip-date">${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
    </div>
    <table>
      <thead><tr><th>PLAYER</th><th>ODDS</th><th>STAKE</th><th>TO WIN</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals">
      <span class="label">TOTAL STAKE</span><span class="val">${total}</span>
    </div>
    <div class="totals">
      <span class="label">TOTAL PAYOUT</span><span class="val">${totalPayout}</span>
    </div>
    <div class="slip-footer">FOR ENTERTAINMENT PURPOSES ONLY</div>
  </div>
  <script>window.onload = () => { window.print(); }</script>
  </body></html>`);
  win.document.close();
};

// ── Ticker ──────────────────────────────────────────────────────────────────

function Ticker({ items }) {
  const repeated = [...items, ...items, ...items];
  return (
    <div style={{ background: "#0a0a0a", borderBottom: "1px solid #2a1a00", overflow: "hidden", height: "34px", display: "flex", alignItems: "center", position: "relative" }}>
      <div style={{ flexShrink: 0, background: ACCENT, color: "#0d0d0d", fontSize: "9px", fontFamily: "Arial Narrow, Arial, sans-serif", fontWeight: "700", letterSpacing: "2px", padding: "0 10px", height: "100%", display: "flex", alignItems: "center", zIndex: 1 }}>BREAKING</div>
      <div style={{ overflow: "hidden", flex: 1, position: "relative" }}>
        <div style={{ display: "flex", whiteSpace: "nowrap", animation: "ticker-scroll 40s linear infinite" }}>
          {repeated.map((item, i) => (
            <span key={i} style={{ display: "inline-block", fontSize: "11px", fontFamily: "Arial, sans-serif", color: "#ccc", letterSpacing: "0.5px", paddingRight: "80px" }}>{item.text}</span>
          ))}
        </div>
      </div>
      <style>{`@keyframes ticker-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-33.333%); } }`}</style>
    </div>
  );
}

function OddsHighlightTicker({ odds, eliminated }) {
  const activePlayers = PLAYERS.filter(p => !eliminated.includes(p));
  const sorted = [...activePlayers].sort((a, b) => odds[b] - odds[a]);
  return (
    <div style={{ background: "#0d0d0d", borderBottom: "1px solid #1f1f1f", overflow: "hidden", height: "28px", display: "flex", alignItems: "center" }}>
      <div style={{ flexShrink: 0, padding: "0 10px", fontSize: "9px", fontFamily: "Arial Narrow, Arial, sans-serif", color: "#555", letterSpacing: "2px" }}>ODDS</div>
      <div style={{ overflow: "hidden", flex: 1 }}>
        <div key={sorted.map(n => `${n}${odds[n]}`).join()} style={{ display: "flex", whiteSpace: "nowrap", animation: "ticker-scroll 30s linear infinite" }}>
          {[...sorted, ...sorted].map((name, i) => {
            const american = pctToAmerican(odds[name]);
            return (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "6px", paddingRight: "36px" }}>
                <span style={{ fontSize: "11px", fontFamily: "Arial Narrow, Arial, sans-serif", color: "#aaa", fontWeight: "600" }}>{name}</span>
                <span style={{ fontSize: "11px", fontFamily: "Arial Narrow, Arial, sans-serif", fontWeight: "700", color: parseFloat(american) < 0 ? "#e05555" : "#5db85d" }}>{american}</span>
                <span style={{ fontSize: "10px", color: "#444" }}>·</span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Ticker editor ────────────────────────────────────────────────────────────

function TickerEditor({ items, onSave, onClose }) {
  const [list, setList] = useState(items.map(i => ({ ...i })));
  const [newText, setNewText] = useState("");
  const add = () => { if (!newText.trim()) return; setList(prev => [...prev, { id: Date.now(), text: newText.trim() }]); setNewText(""); };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "24px" }}>
      <div style={{ background: "#141414", border: "1px solid #333", borderRadius: "8px", padding: "28px", maxWidth: "480px", width: "100%" }}>
        <div style={{ fontSize: "11px", letterSpacing: "4px", color: ACCENT, fontFamily: "Arial Narrow, Arial, sans-serif", marginBottom: "16px" }}>EDIT TICKER NEWS</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px", maxHeight: "260px", overflowY: "auto" }}>
          {list.map(item => (
            <div key={item.id} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span style={{ flex: 1, fontSize: "12px", color: "#ccc", fontFamily: "Arial, sans-serif" }}>{item.text}</span>
              <button onClick={() => setList(prev => prev.filter(i => i.id !== item.id))} style={{ background: "transparent", border: "1px solid #c0392b", borderRadius: "4px", color: "#c0392b", fontSize: "11px", padding: "2px 8px", cursor: "pointer" }}>✕</button>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
          <input value={newText} onChange={e => setNewText(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} placeholder="Add news item..." style={{ flex: 1, background: "#1a1a1a", border: `1px solid ${ACCENT}`, borderRadius: "4px", color: "#f0ead6", fontSize: "13px", fontFamily: "Arial, sans-serif", padding: "6px 10px", outline: "none" }} />
          <button onClick={add} style={{ background: ACCENT, border: "none", borderRadius: "4px", color: "#0d0d0d", fontSize: "13px", fontWeight: "700", padding: "6px 14px", cursor: "pointer" }}>ADD</button>
        </div>
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ background: "transparent", border: "1px solid #333", borderRadius: "4px", color: "#555", fontSize: "12px", fontFamily: "Arial, sans-serif", padding: "6px 14px", cursor: "pointer" }}>CANCEL</button>
          <button onClick={() => { onSave(list); onClose(); }} style={{ background: ACCENT, border: "none", borderRadius: "4px", color: "#0d0d0d", fontSize: "12px", fontWeight: "700", fontFamily: "Arial Narrow, Arial, sans-serif", letterSpacing: "1px", padding: "6px 14px", cursor: "pointer" }}>SAVE</button>
        </div>
      </div>
    </div>
  );
}

// ── Betting ──────────────────────────────────────────────────────────────────

function BetForm({ activePlayers, odds, bettorName, onPlaceBet, onChangeName }) {
  const [player, setPlayer] = useState(activePlayers[0] || "");
  const [amount, setAmount] = useState("");
  const [name, setName] = useState(bettorName || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!name.trim()) { setError("Enter your name"); return; }
    if (!player) { setError("Pick a player"); return; }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError("Enter a valid stake"); return; }
    setSubmitting(true);
    setError("");
    const american = pctToAmerican(odds[player]);
    const bet = { bettor: name.trim(), player, amount: amt, odds: american, pct: odds[player] };
    try {
      const res = await fetch("/api/bets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bet }) });
      if (!res.ok) throw new Error();
      onChangeName(name.trim());
      setAmount("");
      setError("✓ Bet placed!");
      setTimeout(() => setError(""), 2000);
    } catch {
      setError("Failed to place bet. Try again.");
    }
    setSubmitting(false);
  };

  const inp = (extra = {}) => ({ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "4px", color: "#f0ead6", fontSize: "14px", fontFamily: "Arial, sans-serif", padding: "8px 12px", outline: "none", width: "100%", ...extra });

  return (
    <div style={{ background: "#111", border: "1px solid #222", borderRadius: "6px", padding: "20px" }}>
      <div style={{ fontSize: "11px", letterSpacing: "4px", color: ACCENT, fontFamily: "Arial Narrow, Arial, sans-serif", marginBottom: "16px" }}>PLACE A BET</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" style={inp()} />
        <select value={player} onChange={e => setPlayer(e.target.value)} style={inp({ appearance: "none" })}>
          {activePlayers.map(p => {
            const american = pctToAmerican(odds[p]);
            return <option key={p} value={p}>{p} — {american}</option>;
          })}
        </select>
        <div style={{ display: "flex", gap: "8px" }}>
          <input value={amount} onChange={e => setAmount(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} placeholder="Stake (coins)" type="number" min="1" style={inp({ flex: 1 })} />
          {amount && player && (
            <div style={{ display: "flex", alignItems: "center", fontSize: "12px", color: "#5db85d", fontFamily: "Arial Narrow, Arial, sans-serif", whiteSpace: "nowrap" }}>
              → {calcPayout(parseFloat(amount) || 0, pctToAmerican(odds[player])).toFixed(0)} to win
            </div>
          )}
        </div>
        {error && <div style={{ fontSize: "12px", color: error.startsWith("✓") ? "#5db85d" : "#e05555", fontFamily: "Arial, sans-serif" }}>{error}</div>}
        <button onClick={handleSubmit} disabled={submitting} style={{ background: submitting ? "#2a2a2a" : ACCENT, border: "none", borderRadius: "4px", color: "#0d0d0d", fontSize: "12px", fontFamily: "Arial Narrow, Arial, sans-serif", fontWeight: "700", letterSpacing: "2px", padding: "10px", cursor: submitting ? "default" : "pointer" }}>
          {submitting ? "PLACING..." : "PLACE BET"}
        </button>
      </div>
    </div>
  );
}

function BetsBoard({ bets, bettorName, odds, onClearBets, admin }) {
  const [showSlip, setShowSlip] = useState(false);
  const myBets = bets.filter(b => b.bettor?.toLowerCase() === bettorName?.toLowerCase());

  const groupByBettor = bets.reduce((acc, b) => {
    if (!acc[b.bettor]) acc[b.bettor] = [];
    acc[b.bettor].push(b);
    return acc;
  }, {});

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <div style={{ fontSize: "10px", letterSpacing: "4px", color: "#444", fontFamily: "Arial Narrow, Arial, sans-serif" }}>ALL BETS</div>
        <div style={{ display: "flex", gap: "8px" }}>
          {myBets.length > 0 && (
            <button onClick={() => printBetSlip(myBets, bettorName, odds)} style={{ background: "transparent", border: `1px solid ${ACCENT}55`, borderRadius: "4px", color: ACCENT, fontSize: "10px", fontFamily: "Arial, sans-serif", letterSpacing: "1px", padding: "4px 10px", cursor: "pointer" }}>
              MY BET SLIP ↗
            </button>
          )}
          {admin && bets.length > 0 && (
            <button onClick={onClearBets} style={{ background: "transparent", border: "1px solid #333", borderRadius: "4px", color: "#555", fontSize: "10px", fontFamily: "Arial, sans-serif", letterSpacing: "1px", padding: "4px 10px", cursor: "pointer" }}>
              CLEAR ALL
            </button>
          )}
        </div>
      </div>

      {bets.length === 0 ? (
        <div style={{ textAlign: "center", padding: "24px", color: "#333", fontSize: "13px", fontFamily: "Arial, sans-serif" }}>No bets placed yet</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {Object.entries(groupByBettor).map(([bettor, bettorBets]) => (
            <div key={bettor} style={{ background: "#111", border: `1px solid ${bettor.toLowerCase() === bettorName?.toLowerCase() ? ACCENT + "44" : "#1a1a1a"}`, borderRadius: "6px", overflow: "hidden" }}>
              <div style={{ padding: "8px 14px", borderBottom: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px", fontWeight: "600", color: bettor.toLowerCase() === bettorName?.toLowerCase() ? ACCENT : "#f0ead6" }}>{bettor}</span>
                <span style={{ fontSize: "10px", color: "#444", fontFamily: "Arial, sans-serif" }}>{bettorBets.length} bet{bettorBets.length !== 1 ? "s" : ""}</span>
              </div>
              {bettorBets.map(b => {
                const payout = calcPayout(b.amount, b.odds).toFixed(0);
                const isNeg = parseFloat(b.odds) < 0;
                return (
                  <div key={b.id} style={{ padding: "8px 14px", display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid #111" }}>
                    <span style={{ flex: 1, fontSize: "13px", fontFamily: "Arial, sans-serif" }}>{b.player}</span>
                    <span style={{ fontSize: "13px", fontFamily: "Arial Narrow, Arial, sans-serif", fontWeight: "700", color: isNeg ? "#e05555" : "#5db85d", minWidth: "48px", textAlign: "right" }}>{b.odds}</span>
                    <span style={{ fontSize: "12px", color: "#666", fontFamily: "Arial, sans-serif", minWidth: "60px", textAlign: "right" }}>{b.amount} → {payout}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TraitorsOdds() {
  const [gameState, setGameState] = useState(null);
  const [bets, setBets] = useState([]);
  const [bettorName, setBettorName] = useState(() => localStorage.getItem(BETTOR_KEY) || "");
  const [editing, setEditing] = useState(null);
  const [editVal, setEditVal] = useState("");
  const [showRevealModal, setShowRevealModal] = useState(null);
  const [showTickerEditor, setShowTickerEditor] = useState(false);
  const [syncStatus, setSyncStatus] = useState("loading");
  const justSaved = useRef(false);
  const admin = isAdmin();

  const loadFromStorage = async (isInitial = false) => {
    try {
      const res = await fetch("/api/state");
      if (!res.ok) throw new Error(res.status);
      const { value } = await res.json();
      if (value) {
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        if (!parsed.ticker) {
          parsed.ticker = INITIAL_TICKER;
        } else {
          const existingIds = new Set(parsed.ticker.map(t => t.id));
          const newItems = INITIAL_TICKER.filter(t => !existingIds.has(t.id));
          if (newItems.length) parsed.ticker = [...parsed.ticker, ...newItems];
        }
        if (!parsed.eliminated) parsed.eliminated = [];
        if (!parsed.revealed) parsed.revealed = {};
        if (!parsed.odds) parsed.odds = defaultState.odds;
        setGameState(parsed);
      } else {
        setGameState(defaultState);
      }
      if (isInitial) setSyncStatus("synced");
    } catch {
      setGameState(prev => prev ?? defaultState);
      if (isInitial) setSyncStatus("error");
    }
  };

  const loadBets = async () => {
    try {
      const res = await fetch("/api/bets");
      if (!res.ok) return;
      const { bets } = await res.json();
      setBets(bets || []);
    } catch {}
  };

  useEffect(() => { loadFromStorage(true); loadBets(); }, []);

  useEffect(() => {
    const id = setInterval(() => {
      if (justSaved.current) { justSaved.current = false; return; }
      loadFromStorage(false);
      loadBets();
    }, 8000);
    return () => clearInterval(id);
  }, []);

  const saveState = async (newState) => {
    setSyncStatus("saving");
    justSaved.current = true;
    try {
      const res = await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: JSON.stringify(newState), secret: ADMIN_SECRET }),
      });
      if (!res.ok) throw new Error(res.status);
      setSyncStatus("saved");
      setTimeout(() => setSyncStatus("synced"), 1500);
    } catch {
      setSyncStatus("error");
      justSaved.current = false;
    }
  };

  const applyUpdate = (updater) => {
    setGameState(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveState(next);
      return next;
    });
  };

  const handleClearBets = async () => {
    try {
      await fetch("/api/bets", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ secret: ADMIN_SECRET }) });
      setBets([]);
    } catch {}
  };

  const handleChangeName = (name) => {
    setBettorName(name);
    localStorage.setItem(BETTOR_KEY, name);
    setTimeout(loadBets, 500);
  };

  const commitEdit = (name) => {
    const val = parseFloat(editVal);
    if (!isNaN(val) && val >= 1 && val <= 99) {
      applyUpdate(prev => ({ ...prev, odds: { ...prev.odds, [name]: val } }));
    }
    setEditing(null);
  };

  const handleEliminate = (name, role) => {
    applyUpdate(prev => ({ ...prev, eliminated: [...prev.eliminated, name], revealed: { ...prev.revealed, [name]: role } }));
    setShowRevealModal(null);
  };

  if (!gameState) {
    return (
      <div style={{ minHeight: "100vh", background: "#0d0d0d", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#555", fontFamily: "Arial, sans-serif", letterSpacing: "3px", fontSize: "12px" }}>LOADING...</div>
      </div>
    );
  }

  const { odds, eliminated, revealed, ticker } = gameState;
  const activePlayers = PLAYERS.filter(p => !eliminated.includes(p));
  const sorted = [...activePlayers].sort((a, b) => odds[b] - odds[a]);
  const statusText = { loading: "LOADING", saving: "SAVING...", saved: "SAVED ✓", synced: "LIVE", error: "ERROR" }[syncStatus];
  const statusColor = { saving: ACCENT, saved: "#27ae60", synced: "#555", error: "#c0392b", loading: "#555" }[syncStatus];

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d0d", fontFamily: "'Georgia', serif", color: "#f0ead6" }}>
      {ticker && ticker.length > 0 && <Ticker items={ticker} />}
      <OddsHighlightTicker odds={odds} eliminated={eliminated} />

      {/* Header */}
      <div style={{ background: "linear-gradient(180deg, #1a0a0a 0%, #0d0d0d 100%)", borderBottom: "1px solid #3a1a1a", padding: "28px 24px 16px", textAlign: "center", position: "relative" }}>
        <div style={{ fontSize: "11px", letterSpacing: "6px", color: ACCENT, textTransform: "uppercase", marginBottom: "8px", fontFamily: "Arial Narrow, Arial, sans-serif" }}>The Traitors</div>
        <h1 style={{ fontSize: "clamp(28px, 6vw, 48px)", fontWeight: "700", margin: "0 0 4px", letterSpacing: "2px" }}>BETTING BOARD</h1>
        <div style={{ fontSize: "13px", color: "#888", fontFamily: "Arial, sans-serif", fontStyle: "italic", marginBottom: "6px" }}>Who among them is a Traitor?</div>
        <div style={{ fontSize: "9px", letterSpacing: "2px", color: statusColor, fontFamily: "Arial, sans-serif" }}>● {statusText}</div>
        {admin && <div style={{ position: "absolute", top: "12px", right: "16px", fontSize: "9px", letterSpacing: "2px", color: ACCENT, fontFamily: "Arial, sans-serif", background: "#1a0a0a", border: `1px solid ${ACCENT}44`, borderRadius: "4px", padding: "3px 8px" }}>ADMIN</div>}
      </div>

      <div style={{ maxWidth: "560px", margin: "0 auto", padding: "24px 16px" }}>

        {/* Player odds board */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {sorted.map((name, i) => {
            const pct = odds[name];
            const american = pctToAmerican(pct);
            const tier = getTier(pct);
            const isEditing = editing === name;
            const isTop = i === 0;
            return (
              <div key={name} style={{ background: isTop ? "linear-gradient(135deg, #1f0a0a, #160808)" : "#141414", border: `1px solid ${isTop ? "#5a1a1a" : "#222"}`, borderRadius: "6px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ fontSize: "12px", color: "#555", fontFamily: "Arial Narrow, Arial, sans-serif", minWidth: "20px", textAlign: "center" }}>#{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "17px", fontWeight: "600", color: isTop ? "#f5d0c8" : "#f0ead6" }}>{name}</div>
                  <div style={{ fontSize: "10px", letterSpacing: "2px", color: tier.color, fontFamily: "Arial Narrow, Arial, sans-serif", marginTop: "2px" }}>{tier.label}</div>
                </div>
                <div style={{ width: "80px", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                  <div style={{ width: "100%", height: "3px", background: "#2a2a2a", borderRadius: "2px", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${tier.color}88, ${tier.color})`, transition: "width 0.4s ease" }} />
                  </div>
                  <div style={{ fontSize: "10px", color: "#666", fontFamily: "Arial, sans-serif" }}>{pct}%</div>
                </div>
                <div onClick={() => { if (admin && !isEditing) { setEditing(name); setEditVal(String(pct)); } }} style={{ minWidth: "76px", textAlign: "right", cursor: admin ? "pointer" : "default" }}>
                  {isEditing ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <input autoFocus value={editVal} onChange={e => setEditVal(e.target.value)} onKeyDown={e => { if (e.key === "Enter") commitEdit(name); if (e.key === "Escape") setEditing(null); }} style={{ width: "44px", background: "#1a1a1a", border: `1px solid ${ACCENT}`, borderRadius: "4px", color: ACCENT, fontSize: "14px", fontFamily: "Arial Narrow, Arial, sans-serif", fontWeight: "700", textAlign: "center", padding: "2px 4px", outline: "none" }} placeholder="%" />
                      <button onPointerDown={e => { e.preventDefault(); commitEdit(name); }} style={{ background: ACCENT, border: "none", borderRadius: "4px", color: "#0d0d0d", fontSize: "14px", fontWeight: "700", padding: "2px 7px", cursor: "pointer", lineHeight: "1.4" }}>✓</button>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: "20px", fontFamily: "Arial Narrow, Arial, sans-serif", fontWeight: "700", color: parseFloat(american) < 0 ? "#e05555" : "#5db85d" }}>{american}</div>
                      {admin && <div style={{ fontSize: "9px", color: "#444", fontFamily: "Arial, sans-serif", letterSpacing: "1px" }}>TAP TO EDIT</div>}
                    </div>
                  )}
                </div>
                {admin && (
                  <button onClick={() => setShowRevealModal(name)} style={{ background: "transparent", border: "1px solid #333", borderRadius: "4px", color: "#555", fontSize: "11px", fontFamily: "Arial, sans-serif", letterSpacing: "1px", padding: "4px 8px", cursor: "pointer" }}>OUT</button>
                )}
              </div>
            );
          })}
        </div>

        {/* Eliminated */}
        {eliminated.length > 0 && (
          <div style={{ marginTop: "32px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "4px", color: "#444", fontFamily: "Arial Narrow, Arial, sans-serif", marginBottom: "12px", textAlign: "center" }}>ELIMINATED</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center" }}>
              {eliminated.map(name => (
                <div key={name} style={{ background: "#111", border: `1px solid ${revealed[name] === "traitor" ? "#5a1a1a" : "#1a2a1a"}`, borderRadius: "4px", padding: "6px 14px", fontSize: "13px", color: "#555", display: "flex", alignItems: "center", gap: "8px", textDecoration: "line-through" }}>
                  {name}
                  <span style={{ fontSize: "9px", letterSpacing: "2px", color: revealed[name] === "traitor" ? "#c0392b" : "#27ae60", textDecoration: "none" }}>{revealed[name]?.toUpperCase()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Divider */}
        <div style={{ margin: "32px 0", borderTop: "1px solid #1a1a1a" }} />

        {/* Betting section */}
        <BetForm activePlayers={activePlayers} odds={odds} bettorName={bettorName} onPlaceBet={() => setTimeout(loadBets, 600)} onChangeName={handleChangeName} />

        <div style={{ marginTop: "24px" }}>
          <BetsBoard bets={bets} bettorName={bettorName} odds={odds} onClearBets={handleClearBets} admin={admin} />
        </div>

        {/* Admin controls */}
        {admin && (
          <div style={{ marginTop: "32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button onClick={() => setShowTickerEditor(true)} style={{ background: "transparent", border: `1px solid ${ACCENT}55`, borderRadius: "4px", color: ACCENT, fontSize: "10px", fontFamily: "Arial, sans-serif", letterSpacing: "1px", padding: "4px 10px", cursor: "pointer" }}>EDIT TICKER</button>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <div style={{ fontSize: "10px", color: "#333", fontFamily: "Arial, sans-serif", letterSpacing: "2px" }}>TAP ODDS TO EDIT · TAP OUT TO ELIMINATE</div>
              <button onClick={() => applyUpdate(defaultState)} style={{ background: "transparent", border: "1px solid #2a2a2a", borderRadius: "4px", color: "#333", fontSize: "10px", fontFamily: "Arial, sans-serif", letterSpacing: "1px", padding: "4px 10px", cursor: "pointer" }}>RESET</button>
            </div>
          </div>
        )}
      </div>

      {/* Reveal modal */}
      {showRevealModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "24px" }}>
          <div style={{ background: "#141414", border: "1px solid #333", borderRadius: "8px", padding: "32px 28px", maxWidth: "320px", width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: "11px", letterSpacing: "4px", color: ACCENT, fontFamily: "Arial Narrow, Arial, sans-serif", marginBottom: "8px" }}>ELIMINATING</div>
            <div style={{ fontSize: "26px", fontWeight: "700", marginBottom: "24px" }}>{showRevealModal}</div>
            <div style={{ fontSize: "13px", color: "#888", marginBottom: "20px", fontFamily: "Arial, sans-serif" }}>Were they a Traitor or Faithful?</div>
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={() => handleEliminate(showRevealModal, "traitor")} style={{ flex: 1, background: "#3a0a0a", border: "1px solid #c0392b", borderRadius: "6px", color: "#e05555", fontSize: "13px", fontFamily: "Arial Narrow, Arial, sans-serif", letterSpacing: "2px", padding: "12px", cursor: "pointer", fontWeight: "700" }}>TRAITOR</button>
              <button onClick={() => handleEliminate(showRevealModal, "faithful")} style={{ flex: 1, background: "#0a1f0a", border: "1px solid #27ae60", borderRadius: "6px", color: "#5db85d", fontSize: "13px", fontFamily: "Arial Narrow, Arial, sans-serif", letterSpacing: "2px", padding: "12px", cursor: "pointer", fontWeight: "700" }}>FAITHFUL</button>
            </div>
            <button onClick={() => setShowRevealModal(null)} style={{ marginTop: "12px", background: "transparent", border: "none", color: "#444", fontSize: "12px", fontFamily: "Arial, sans-serif", cursor: "pointer" }}>cancel</button>
          </div>
        </div>
      )}

      {/* Ticker editor */}
      {showTickerEditor && (
        <TickerEditor items={ticker} onSave={newItems => applyUpdate(prev => ({ ...prev, ticker: newItems }))} onClose={() => setShowTickerEditor(false)} />
      )}
    </div>
  );
}
