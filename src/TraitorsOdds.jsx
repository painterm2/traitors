import { useState, useEffect, useRef } from "react";

const PLAYERS = ["Alex", "Santi", "Dean", "Annie", "Nat", "Jordan", "Skyler", "Sammie"];
const STORAGE_KEY = "traitors-game-state";
const BETTOR_KEY = "traitors-bettor-name";
const ACCENT = "#e8b84b";
const GREEN = "#53d258";
const CARD_BG = "#1a1a1a";

const ADMIN_SECRET = "traitors2024";
const isAdmin = () => new URLSearchParams(window.location.search).get("admin") === ADMIN_SECRET;

const INITIAL_TICKER = [
  { id: 1, text: "🔪 MURDER — Lucy was found dead in the castle last night" },
  { id: 2, text: "🚪 BANISHED — Michael and Kim were voted out by the Faithfuls yesterday" },
  { id: 3, text: "📈 ODDS SHIFT — Alex's Traitor odds have risen sharply following last night's events" },
  { id: 4, text: "⚽ WC2026 — USA 4-1 Paraguay (Jun 12) · USMNT tops Group D, advance to Round of 32" },
  { id: 5, text: "⚽ WC2026 — Brazil 3-0 Haiti (Jun 19) · Vinicius Jr. hat-trick; Brazil leads Group C" },
  { id: 6, text: "⚽ WC2026 — Argentina 2-0 Austria (Jun 22) · Messi double keeps Albiceleste in top spot" },
  { id: 7, text: "⚽ WC2026 — Portugal 5-0 Uzbekistan (Jun 23) · Ronaldo with brace in Group K demolition" },
  { id: 8, text: "⚽ WC2026 — England 0-0 Ghana (Jun 23) · Southgate's men drop points in Group L stalemate" },
  { id: 9, text: "⚽ WC2026 — Mexico 3-0 Czechia (Jun 24) · El Tri clinch knockout spot with convincing win" },
  { id: 10, text: "⚽ WC2026 — Canada 6-0 Qatar (Jun 18) · Historic thrashing as hosts reach knockouts for first time" },
  { id: 11, text: "⚽ WC2026 — Group stage Matchday 3 concludes today — knockout bracket set tonight" },
  { id: 12, text: "🏀 NBA FINALS — OKC Thunder win Game 6 to claim 2026 NBA Championship; SGA Finals MVP" },
  { id: 13, text: "🏎️ F1 — Spanish GP: Norris wins pole; race Sunday at Circuit de Barcelona-Catalunya" },
  { id: 14, text: "⚾ MLB — Yankees 7, Red Sox 3 | Dodgers 5, Giants 2 | Ohtani goes 3-for-4 with HR" },
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

const QUICK_STAKES = [10, 25, 50, 100];

const printBetSlip = (myBets, bettorName) => {
  const rows = myBets.map(b => {
    const payout = calcPayout(b.amount, b.odds).toFixed(2);
    const pos = parseFloat(b.odds) >= 0;
    return `<tr>
      <td>${b.player}</td>
      <td class="${pos ? "pos" : "neg"}">${b.odds}</td>
      <td>${b.amount} RSUs</td>
      <td class="payout">${payout} RSUs</td>
    </tr>`;
  }).join("");
  const total = myBets.reduce((s, b) => s + b.amount, 0);
  const totalPayout = myBets.reduce((s, b) => s + calcPayout(b.amount, b.odds), 0).toFixed(2);

  const win = window.open("", "_blank");
  win.document.write(`<!DOCTYPE html><html><head><title>Bet Slip — ${bettorName}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#111;color:#f0ead6;font-family:Arial,sans-serif;display:flex;justify-content:center;padding:40px 20px;min-height:100vh}
    .slip{width:380px}
    .slip-header{background:#1a0a0a;border:1px solid #e8b84b;border-bottom:none;border-radius:8px 8px 0 0;padding:28px 24px;text-align:center}
    .label{font-size:10px;letter-spacing:5px;color:#e8b84b;margin-bottom:6px}
    .title{font-size:24px;font-weight:700;letter-spacing:3px;font-family:Georgia,serif}
    .bettor{font-size:14px;color:#aaa;margin-top:6px}
    .date{font-size:10px;color:#555;margin-top:3px}
    table{width:100%;border-collapse:collapse;border:1px solid #2a2a2a;border-top:none;border-bottom:none}
    th{font-size:9px;letter-spacing:2px;color:#555;text-align:left;padding:10px 16px 8px;background:#141414;border-bottom:1px solid #222}
    td{font-size:13px;padding:11px 16px;border-bottom:1px solid #1a1a1a;background:#141414}
    .pos{color:#53d258;font-weight:700}.neg{color:#e05555;font-weight:700}.payout{color:#e8b84b;font-weight:700}
    .totals-row{display:flex;justify-content:space-between;padding:12px 16px;background:#0f0f0f;border:1px solid #2a2a2a;border-top:1px solid #333}
    .totals-row:last-of-type{border-radius:0 0 8px 8px}
    .tl{color:#777;font-size:11px;letter-spacing:1px}.tv{color:#e8b84b;font-weight:700;font-size:13px}
    .footer{text-align:center;padding:16px;font-size:9px;color:#333;letter-spacing:2px}
    @media print{body{background:#fff;color:#111}.slip-header{background:#f5f5f5;border-color:#aaa}td,th{background:#fff}.totals-row{background:#f5f5f5}.label,.date,.tl,.footer{color:#666}.title,.bettor{color:#111}.payout,.tv{color:#555}}
  </style></head><body>
  <div class="slip">
    <div class="slip-header">
      <div class="label">THE TRAITORS</div>
      <div class="title">BET SLIP</div>
      <div class="bettor">${bettorName}</div>
      <div class="date">${new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}</div>
    </div>
    <table><thead><tr><th>SELECTION</th><th>ODDS</th><th>STAKE</th><th>TO WIN</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <div class="totals-row"><span class="tl">TOTAL STAKE</span><span class="tv">${total} RSUs</span></div>
    <div class="totals-row"><span class="tl">TOTAL PAYOUT</span><span class="tv">${totalPayout} RSUs</span></div>
    <div class="footer">FOR ENTERTAINMENT ONLY · RSUs ARE NOT REAL CURRENCY</div>
  </div>
  <script>window.onload=()=>window.print()</script>
  </body></html>`);
  win.document.close();
};

// ── Tickers ──────────────────────────────────────────────────────────────────

function Ticker({ items }) {
  const doubled = [...items, ...items];
  return (
    <div style={{ background: "#0a0a0a", borderBottom: "1px solid #222", overflow: "hidden", height: "32px", display: "flex", alignItems: "center" }}>
      <div style={{ flexShrink: 0, background: ACCENT, color: "#000", fontSize: "9px", fontFamily: "Arial, sans-serif", fontWeight: "800", letterSpacing: "2px", padding: "0 12px", height: "100%", display: "flex", alignItems: "center" }}>BREAKING</div>
      <div style={{ overflow: "hidden", flex: 1 }}>
        <div style={{ display: "flex", whiteSpace: "nowrap", animation: "news-scroll 30s linear infinite" }}>
          {doubled.map((item, i) => (
            <span key={i} style={{ display: "inline-block", fontSize: "11px", fontFamily: "Arial, sans-serif", color: "#bbb", paddingRight: "80px" }}>{item.text}</span>
          ))}
        </div>
      </div>
      <style>{`@keyframes news-scroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
    </div>
  );
}

function OddsHighlightTicker({ odds, eliminated }) {
  const active = PLAYERS.filter(p => !eliminated.includes(p));
  const sorted = [...active].sort((a, b) => odds[b] - odds[a]);
  return (
    <div style={{ background: "#111", borderBottom: "1px solid #222", overflow: "hidden", height: "26px", display: "flex", alignItems: "center" }}>
      <div style={{ flexShrink: 0, padding: "0 12px", fontSize: "9px", fontFamily: "Arial, sans-serif", fontWeight: "700", color: "#444", letterSpacing: "2px" }}>LIVE</div>
      <style>{`@keyframes odds-scroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
      <div style={{ overflow: "hidden", flex: 1 }}>
        <div key={sorted.map(n => `${n}${odds[n]}`).join()} style={{ display: "flex", whiteSpace: "nowrap", animation: "odds-scroll 20s linear infinite" }}>
          {[...sorted, ...sorted].map((name, i) => {
            const american = pctToAmerican(odds[name]);
            const pos = parseFloat(american) >= 0;
            return (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "5px", paddingRight: "32px" }}>
                <span style={{ fontSize: "11px", fontFamily: "Arial, sans-serif", fontWeight: "600", color: "#888" }}>{name}</span>
                <span style={{ fontSize: "11px", fontFamily: "Arial, sans-serif", fontWeight: "700", color: pos ? GREEN : "#e05555" }}>{american}</span>
                <span style={{ fontSize: "10px", color: "#333" }}>|</span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Ticker editor ─────────────────────────────────────────────────────────────

function TickerEditor({ items, onSave, onClose }) {
  const [list, setList] = useState(items.map(i => ({ ...i })));
  const [newText, setNewText] = useState("");
  const add = () => { if (!newText.trim()) return; setList(p => [...p, { id: Date.now(), text: newText.trim() }]); setNewText(""); };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: "24px" }}>
      <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "10px", padding: "28px", maxWidth: "480px", width: "100%" }}>
        <div style={{ fontSize: "11px", letterSpacing: "4px", color: ACCENT, fontFamily: "Arial, sans-serif", fontWeight: "700", marginBottom: "16px" }}>EDIT TICKER</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px", maxHeight: "240px", overflowY: "auto" }}>
          {list.map(item => (
            <div key={item.id} style={{ display: "flex", gap: "8px", alignItems: "center", background: "#111", borderRadius: "6px", padding: "8px 12px" }}>
              <span style={{ flex: 1, fontSize: "12px", color: "#ccc", fontFamily: "Arial, sans-serif" }}>{item.text}</span>
              <button onClick={() => setList(p => p.filter(i => i.id !== item.id))} style={{ background: "transparent", border: "none", color: "#555", fontSize: "16px", cursor: "pointer", padding: "0 4px" }}>×</button>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
          <input value={newText} onChange={e => setNewText(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} placeholder="Add headline..." style={{ flex: 1, background: "#111", border: "1px solid #333", borderRadius: "6px", color: "#f0ead6", fontSize: "13px", padding: "8px 12px", outline: "none" }} />
          <button onClick={add} style={{ background: ACCENT, border: "none", borderRadius: "6px", color: "#000", fontSize: "13px", fontWeight: "700", padding: "8px 16px", cursor: "pointer" }}>ADD</button>
        </div>
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ background: "transparent", border: "1px solid #333", borderRadius: "6px", color: "#555", fontSize: "12px", padding: "8px 16px", cursor: "pointer" }}>Cancel</button>
          <button onClick={() => { onSave(list); onClose(); }} style={{ background: ACCENT, border: "none", borderRadius: "6px", color: "#000", fontSize: "12px", fontWeight: "700", padding: "8px 20px", cursor: "pointer" }}>SAVE</button>
        </div>
      </div>
    </div>
  );
}

// ── Recent Bets feed ──────────────────────────────────────────────────────────

function RecentBets({ bets }) {
  if (!bets.length) return null;
  const recent = [...bets].reverse().slice(0, 8);
  return (
    <div style={{ marginBottom: "20px" }}>
      <div style={{ fontSize: "11px", fontWeight: "700", color: "#555", letterSpacing: "2px", marginBottom: "8px", padding: "0 4px" }}>RECENT ACTION</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {recent.map(b => {
          const pos = parseFloat(b.odds) >= 0;
          const ts = b.timestamp ? new Date(b.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
          return (
            <div key={b.id} style={{ display: "flex", alignItems: "center", gap: "8px", background: "#111", borderRadius: "7px", padding: "7px 12px", border: "1px solid #1e1e1e" }}>
              <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#1e1e1e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: "800", color: "#666", flexShrink: 0 }}>{b.bettor?.[0]?.toUpperCase()}</div>
              <span style={{ fontSize: "12px", color: "#888", fontFamily: "Arial, sans-serif", flex: 1 }}>
                <span style={{ color: "#bbb", fontWeight: "600" }}>{b.bettor}</span> bet {b.amount} RSUs on <span style={{ color: "#e8b84b" }}>{b.player}</span>
              </span>
              <span style={{ fontSize: "12px", fontWeight: "800", color: pos ? GREEN : "#e05555", flexShrink: 0 }}>{b.odds}</span>
              {ts && <span style={{ fontSize: "10px", color: "#444", flexShrink: 0 }}>{ts}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Bet Slip (sticky bottom drawer) ──────────────────────────────────────────

const parlayDecimal = (names, odds) => names.reduce((acc, n) => {
  const a = parseFloat(pctToAmerican(odds[n]));
  const dec = a > 0 ? 1 + a / 100 : 1 + 100 / Math.abs(a);
  return acc * dec;
}, 1);

const decimalToAmerican = (dec) => {
  if (dec >= 2) return `+${Math.round((dec - 1) * 100)}`;
  return `-${Math.round(100 / (dec - 1))}`;
};

function BetSlip({ selections, odds, onRemove, onClear, bettorName, onChangeName, onSubmit, submitting }) {
  const [stake, setStake] = useState("");
  const [open, setOpen] = useState(false);
  const [parlay, setParlay] = useState(false);
  const count = selections.length;

  useEffect(() => { if (count > 0) setOpen(true); }, [count]);
  useEffect(() => { if (count < 2) setParlay(false); }, [count]);

  const amt = parseFloat(stake) || 0;
  const parlayDec = count > 1 ? parlayDecimal(selections, odds) : 1;
  const parlayPayout = amt * parlayDec;
  const parlayAmerican = count > 1 ? decimalToAmerican(parlayDec) : null;
  const totalPayout = parlay ? parlayPayout : selections.reduce((s, name) => s + calcPayout(amt, pctToAmerican(odds[name])), 0);

  const handleSubmit = async () => {
    if (!bettorName.trim()) return;
    if (!amt || amt <= 0) return;
    if (parlay) {
      await onSubmit([{
        bettor: bettorName.trim(),
        player: selections.join(" + "),
        amount: amt,
        odds: parlayAmerican,
        pct: null,
        isParlay: true,
        legs: selections,
      }]);
    } else {
      await onSubmit(selections.map(name => ({
        bettor: bettorName.trim(),
        player: name,
        amount: amt,
        odds: pctToAmerican(odds[name]),
        pct: odds[name],
      })));
    }
    setStake("");
  };

  if (count === 0 && !open) return null;

  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200, display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: "560px", background: "#1a1a1a", borderTop: "2px solid #333", borderRadius: "16px 16px 0 0", boxShadow: "0 -8px 40px rgba(0,0,0,0.7)" }}>

        {/* Header bar */}
        <div onClick={() => setOpen(o => !o)} style={{ padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", userSelect: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ background: count > 0 ? ACCENT : "#333", borderRadius: "50%", width: "22px", height: "22px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "800", color: "#000", fontFamily: "Arial, sans-serif", flexShrink: 0 }}>{count}</div>
            <span style={{ fontSize: "13px", fontWeight: "700", color: "#f0ead6", fontFamily: "Arial, sans-serif", letterSpacing: "1px" }}>{parlay ? "FAKE PARLAY SLIP" : "FAKE BET SLIP"}</span>
            {parlay && parlayAmerican && <span style={{ fontSize: "11px", fontWeight: "800", color: ACCENT, fontFamily: "Arial, sans-serif" }}>{parlayAmerican}</span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {amt > 0 && count > 0 && <span style={{ fontSize: "12px", color: GREEN, fontFamily: "Arial, sans-serif", fontWeight: "700" }}>To win: {totalPayout.toFixed(2)} RSUs</span>}
            <span style={{ color: "#555", fontSize: "18px" }}>{open ? "▾" : "▴"}</span>
          </div>
        </div>

        {open && (
          <div style={{ padding: "0 16px 20px" }}>

            {/* Selections */}
            {count === 0 ? (
              <div style={{ textAlign: "center", padding: "20px", color: "#444", fontSize: "13px", fontFamily: "Arial, sans-serif" }}>Tap any odds to add a selection</div>
            ) : (
              <>
                {/* Parlay toggle (only when 2+ selections) */}
                {count >= 2 && (
                  <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
                    <button onClick={() => setParlay(false)} style={{ flex: 1, background: !parlay ? "#1a1a1a" : "transparent", border: `1px solid ${!parlay ? ACCENT : "#2a2a2a"}`, borderRadius: "7px", color: !parlay ? ACCENT : "#555", fontSize: "11px", fontWeight: "700", fontFamily: "Arial, sans-serif", letterSpacing: "1px", padding: "7px", cursor: "pointer" }}>
                      SINGLES ({count})
                    </button>
                    <button onClick={() => setParlay(true)} style={{ flex: 1, background: parlay ? "#1a1a1a" : "transparent", border: `1px solid ${parlay ? ACCENT : "#2a2a2a"}`, borderRadius: "7px", color: parlay ? ACCENT : "#555", fontSize: "11px", fontWeight: "700", fontFamily: "Arial, sans-serif", letterSpacing: "1px", padding: "7px", cursor: "pointer" }}>
                      PARLAY {parlayAmerican ? `(${parlayAmerican})` : ""}
                    </button>
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "14px" }}>
                  {parlay ? (
                    /* Parlay card — single combined bet */
                    <div style={{ background: "#111", borderRadius: "8px", padding: "12px 14px", border: `1px solid ${ACCENT}44` }}>
                      <div style={{ fontSize: "10px", color: ACCENT, letterSpacing: "2px", fontFamily: "Arial, sans-serif", fontWeight: "700", marginBottom: "8px" }}>PARLAY · {count} LEGS</div>
                      {selections.map(name => {
                        const american = pctToAmerican(odds[name]);
                        const pos = parseFloat(american) >= 0;
                        return (
                          <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "5px", marginBottom: "5px", borderBottom: "1px solid #1a1a1a" }}>
                            <span style={{ fontSize: "13px", color: "#ccc", fontFamily: "Arial, sans-serif" }}>{name} is a Traitor</span>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ fontSize: "13px", fontWeight: "700", color: pos ? GREEN : "#e05555", fontFamily: "Arial, sans-serif" }}>{american}</span>
                              <button onClick={() => onRemove(name)} style={{ background: "transparent", border: "none", color: "#444", fontSize: "16px", cursor: "pointer", padding: "0", lineHeight: 1 }}>×</button>
                            </div>
                          </div>
                        );
                      })}
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                        <span style={{ fontSize: "11px", color: "#666", fontFamily: "Arial, sans-serif", letterSpacing: "1px" }}>COMBINED ODDS</span>
                        <span style={{ fontSize: "16px", fontWeight: "800", color: ACCENT, fontFamily: "Arial, sans-serif" }}>{parlayAmerican}</span>
                      </div>
                      {amt > 0 && <div style={{ fontSize: "11px", color: "#666", fontFamily: "Arial, sans-serif", textAlign: "right", marginTop: "2px" }}>→ {parlayPayout.toFixed(2)} RSUs</div>}
                    </div>
                  ) : (
                    selections.map(name => {
                      const american = pctToAmerican(odds[name]);
                      const pos = parseFloat(american) >= 0;
                      const payout = calcPayout(amt, american);
                      const tier = getTier(odds[name]);
                      return (
                        <div key={name} style={{ background: "#111", borderRadius: "8px", padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px", border: "1px solid #2a2a2a" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ fontSize: "14px", fontWeight: "700", color: "#f0ead6", fontFamily: "Arial, sans-serif" }}>{name}</span>
                              <span style={{ fontSize: "9px", color: tier.color, letterSpacing: "1px", fontFamily: "Arial, sans-serif" }}>{tier.label}</span>
                            </div>
                            <div style={{ fontSize: "11px", color: "#555", fontFamily: "Arial, sans-serif", marginTop: "2px" }}>Is a Traitor</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: "18px", fontWeight: "800", color: pos ? GREEN : "#e05555", fontFamily: "Arial, sans-serif" }}>{american}</div>
                            {amt > 0 && <div style={{ fontSize: "10px", color: "#666", fontFamily: "Arial, sans-serif" }}>→ {payout.toFixed(2)}</div>}
                          </div>
                          <button onClick={() => onRemove(name)} style={{ background: "transparent", border: "none", color: "#444", fontSize: "20px", cursor: "pointer", padding: "0 4px", lineHeight: 1 }}>×</button>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}

            {count > 0 && (
              <>
                {/* Name input */}
                <input
                  value={bettorName}
                  onChange={e => onChangeName(e.target.value)}
                  placeholder="Your name"
                  style={{ width: "100%", background: "#111", border: "1px solid #2a2a2a", borderRadius: "8px", color: "#f0ead6", fontSize: "14px", fontFamily: "Arial, sans-serif", padding: "10px 14px", outline: "none", marginBottom: "10px", boxSizing: "border-box" }}
                />

                {/* Stake */}
                <div style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: "8px", padding: "10px 14px", marginBottom: "10px" }}>
                  <div style={{ fontSize: "10px", color: "#555", fontFamily: "Arial, sans-serif", letterSpacing: "1px", marginBottom: "6px" }}>STAKE (RSUs)</div>
                  <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
                    {QUICK_STAKES.map(q => (
                      <button key={q} onClick={() => setStake(String(q))} style={{ flex: 1, background: stake === String(q) ? ACCENT : "#1a1a1a", border: `1px solid ${stake === String(q) ? ACCENT : "#333"}`, borderRadius: "6px", color: stake === String(q) ? "#000" : "#888", fontSize: "12px", fontWeight: "700", fontFamily: "Arial, sans-serif", padding: "6px 0", cursor: "pointer" }}>+{q}</button>
                    ))}
                  </div>
                  <input
                    value={stake}
                    onChange={e => setStake(e.target.value)}
                    placeholder="Custom amount"
                    type="number"
                    min="1"
                    style={{ width: "100%", background: "transparent", border: "none", color: "#f0ead6", fontSize: "20px", fontWeight: "700", fontFamily: "Arial, sans-serif", outline: "none", boxSizing: "border-box" }}
                  />
                </div>

                {/* Payout summary */}
                {amt > 0 && (
                  <div style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: "8px", padding: "10px 14px", marginBottom: "10px", display: "flex", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: "10px", color: "#555", fontFamily: "Arial, sans-serif", letterSpacing: "1px" }}>TOTAL STAKE</div>
                      <div style={{ fontSize: "16px", fontWeight: "700", color: "#f0ead6", fontFamily: "Arial, sans-serif" }}>{parlay ? amt.toFixed(0) : (amt * count).toFixed(0)} RSUs</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "10px", color: "#555", fontFamily: "Arial, sans-serif", letterSpacing: "1px" }}>POTENTIAL PAYOUT</div>
                      <div style={{ fontSize: "16px", fontWeight: "700", color: GREEN, fontFamily: "Arial, sans-serif" }}>{totalPayout.toFixed(2)} RSUs</div>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={submitting || !bettorName.trim() || !amt}
                  style={{ width: "100%", background: submitting || !bettorName.trim() || !amt ? "#2a2a2a" : GREEN, border: "none", borderRadius: "8px", color: submitting || !bettorName.trim() || !amt ? "#555" : "#000", fontSize: "15px", fontWeight: "800", fontFamily: "Arial, sans-serif", letterSpacing: "1px", padding: "14px", cursor: submitting || !bettorName.trim() || !amt ? "default" : "pointer" }}
                >
                  {submitting ? "PLACING..." : parlay ? `PLACE PARLAY (${parlayAmerican})` : `PLACE ${count > 1 ? `${count} BETS` : "BET"}`}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Bets board ────────────────────────────────────────────────────────────────

function BetsBoard({ bets, bettorName, odds, onClearBets, admin }) {
  const myBets = bets.filter(b => b.bettor?.toLowerCase() === bettorName?.toLowerCase());
  const grouped = bets.reduce((acc, b) => { if (!acc[b.bettor]) acc[b.bettor] = []; acc[b.bettor].push(b); return acc; }, {});

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ fontSize: "12px", fontWeight: "700", color: "#f0ead6", fontFamily: "Arial, sans-serif", letterSpacing: "1px" }}>ALL BETS</div>
          {bets.length > 0 && <div style={{ background: "#2a2a2a", borderRadius: "20px", padding: "2px 8px", fontSize: "11px", color: "#888", fontFamily: "Arial, sans-serif" }}>{bets.length}</div>}
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {myBets.length > 0 && (
            <button onClick={() => printBetSlip(myBets, bettorName)} style={{ background: ACCENT, border: "none", borderRadius: "6px", color: "#000", fontSize: "11px", fontWeight: "700", fontFamily: "Arial, sans-serif", letterSpacing: "1px", padding: "6px 12px", cursor: "pointer" }}>
              MY SLIP ↗
            </button>
          )}
          {admin && bets.length > 0 && (
            <button onClick={onClearBets} style={{ background: "transparent", border: "1px solid #333", borderRadius: "6px", color: "#555", fontSize: "11px", padding: "6px 12px", cursor: "pointer", fontFamily: "Arial, sans-serif" }}>Clear All</button>
          )}
        </div>
      </div>

      {bets.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px", color: "#333", fontSize: "13px", fontFamily: "Arial, sans-serif", border: "1px dashed #222", borderRadius: "8px" }}>
          No bets placed yet — be the first
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {Object.entries(grouped).map(([bettor, bettorBets]) => {
            const isMe = bettor.toLowerCase() === bettorName?.toLowerCase();
            const totalStake = bettorBets.reduce((s, b) => s + b.amount, 0);
            const totalPayout = bettorBets.reduce((s, b) => s + calcPayout(b.amount, b.odds), 0);
            return (
              <div key={bettor} style={{ background: CARD_BG, border: `1px solid ${isMe ? ACCENT + "55" : "#252525"}`, borderRadius: "10px", overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", background: isMe ? "#1f1c14" : "#1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #222" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: isMe ? ACCENT : "#2a2a2a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "800", color: isMe ? "#000" : "#666", fontFamily: "Arial, sans-serif" }}>
                      {bettor[0]?.toUpperCase()}
                    </div>
                    <span style={{ fontSize: "14px", fontWeight: "700", color: isMe ? ACCENT : "#f0ead6", fontFamily: "Arial, sans-serif" }}>{bettor}{isMe && " (you)"}</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "11px", color: "#555", fontFamily: "Arial, sans-serif" }}>{totalStake} RSUs staked</div>
                    <div style={{ fontSize: "11px", color: GREEN, fontFamily: "Arial, sans-serif", fontWeight: "700" }}>→ {totalPayout.toFixed(0)} potential</div>
                  </div>
                </div>
                {bettorBets.map(b => {
                  const pos = parseFloat(b.odds) >= 0;
                  const tier = b.pct ? getTier(b.pct) : null;
                  return (
                    <div key={b.id} style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid #111" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                          {b.isParlay && <span style={{ fontSize: "9px", background: ACCENT + "22", color: ACCENT, letterSpacing: "1px", fontFamily: "Arial, sans-serif", fontWeight: "700", padding: "1px 5px", borderRadius: "3px" }}>PARLAY</span>}
                          <div style={{ fontSize: "13px", fontWeight: "600", color: "#f0ead6", fontFamily: "Arial, sans-serif" }}>{b.isParlay ? b.player.split(" + ").join(" · ") : `${b.player} is a Traitor`}</div>
                        </div>
                        {tier && <div style={{ fontSize: "10px", color: tier.color, letterSpacing: "1px", fontFamily: "Arial, sans-serif", marginTop: "2px" }}>{tier.label}</div>}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "16px", fontWeight: "800", color: pos ? GREEN : "#e05555", fontFamily: "Arial, sans-serif" }}>{b.odds}</div>
                        <div style={{ fontSize: "10px", color: "#555", fontFamily: "Arial, sans-serif" }}>{b.amount} → {calcPayout(b.amount, b.odds).toFixed(0)} RSUs</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function TraitorsOdds() {
  const [gameState, setGameState] = useState(null);
  const [bets, setBets] = useState([]);
  const [selections, setSelections] = useState([]);
  const [bettorName, setBettorName] = useState(() => localStorage.getItem(BETTOR_KEY) || "");
  const [editing, setEditing] = useState(null);
  const [editVal, setEditVal] = useState("");
  const [showRevealModal, setShowRevealModal] = useState(null);
  const [showTickerEditor, setShowTickerEditor] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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
      if (res.ok) { const { bets } = await res.json(); setBets(bets || []); }
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
      const res = await fetch("/api/state", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value: JSON.stringify(newState), secret: ADMIN_SECRET }) });
      if (!res.ok) throw new Error(res.status);
      setSyncStatus("saved");
      setTimeout(() => setSyncStatus("synced"), 1500);
    } catch { setSyncStatus("error"); justSaved.current = false; }
  };

  const applyUpdate = (updater) => {
    setGameState(prev => { const next = typeof updater === "function" ? updater(prev) : updater; saveState(next); return next; });
  };

  const handleSubmitBets = async (betList) => {
    setSubmitting(true);
    try {
      for (const bet of betList) {
        await fetch("/api/bets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bet }) });
      }
      setSelections([]);
      setTimeout(loadBets, 400);
    } catch {}
    setSubmitting(false);
  };

  const handleClearBets = async () => {
    await fetch("/api/bets", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ secret: ADMIN_SECRET }) });
    setBets([]);
  };

  const handleChangeName = (name) => {
    setBettorName(name);
    localStorage.setItem(BETTOR_KEY, name);
  };

  const toggleSelection = (name) => {
    setSelections(prev => prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]);
  };

  const commitEdit = (name) => {
    const val = parseFloat(editVal);
    if (!isNaN(val) && val >= 1 && val <= 99) applyUpdate(prev => ({ ...prev, odds: { ...prev.odds, [name]: val } }));
    setEditing(null);
  };

  const handleEliminate = (name, role) => {
    applyUpdate(prev => ({ ...prev, eliminated: [...prev.eliminated, name], revealed: { ...prev.revealed, [name]: role } }));
    setShowRevealModal(null);
  };

  if (!gameState) {
    return (
      <div style={{ minHeight: "100vh", background: "#0d0d0d", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#444", fontFamily: "Arial, sans-serif", letterSpacing: "3px", fontSize: "12px" }}>LOADING...</div>
      </div>
    );
  }

  const { odds, eliminated, revealed, ticker } = gameState;
  const activePlayers = PLAYERS.filter(p => !eliminated.includes(p));
  const sorted = [...activePlayers].sort((a, b) => odds[b] - odds[a]);
  const statusText = { loading: "LOADING", saving: "SAVING...", saved: "SAVED ✓", synced: "LIVE", error: "ERROR" }[syncStatus];
  const statusColor = { saving: ACCENT, saved: GREEN, synced: "#3a3a3a", error: "#c0392b", loading: "#3a3a3a" }[syncStatus];

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d0d", fontFamily: "Arial, sans-serif", color: "#f0ead6", paddingBottom: "120px" }}>
      {/* Disclaimer banner */}
      <div style={{ background: "#1c1000", borderBottom: "2px solid #e8b84b44", padding: "7px 16px", textAlign: "center" }}>
        <span style={{ fontSize: "11px", fontFamily: "Arial, sans-serif", color: ACCENT, letterSpacing: "2px", fontWeight: "700" }}>⚠ FOR ENTERTAINMENT ONLY — BETS & RSUs ARE NOT REAL</span>
      </div>
      {ticker && ticker.length > 0 && <Ticker items={ticker} />}
      <OddsHighlightTicker odds={odds} eliminated={eliminated} />

      {/* Header */}
      <div style={{ background: "#111", borderBottom: "1px solid #222", padding: "20px 20px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: "10px", letterSpacing: "4px", color: ACCENT, fontWeight: "700", marginBottom: "4px" }}>THE TRAITORS</div>
          <div style={{ fontSize: "22px", fontWeight: "800", letterSpacing: "1px", fontFamily: "Georgia, serif" }}>BETTING BOARD</div>
          <div style={{ fontSize: "11px", color: "#555", marginTop: "2px" }}>Who among them is a Traitor?</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "20px", padding: "4px 10px" }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: statusColor }} />
            <span style={{ fontSize: "10px", color: statusColor, letterSpacing: "1px", fontWeight: "700" }}>{statusText}</span>
          </div>
          {admin && <div style={{ fontSize: "9px", color: ACCENT, letterSpacing: "2px", marginTop: "4px" }}>ADMIN MODE</div>}
        </div>
      </div>

      <div style={{ maxWidth: "560px", margin: "0 auto", padding: "16px 12px" }}>

        {/* Section label */}
        <div style={{ fontSize: "11px", fontWeight: "700", color: "#555", letterSpacing: "2px", marginBottom: "10px", padding: "0 4px" }}>
          TRAITOR ODDS · TAP TO BET
        </div>

        {/* Player cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {sorted.map((name, i) => {
            const pct = odds[name];
            const american = pctToAmerican(pct);
            const tier = getTier(pct);
            const selected = selections.includes(name);
            const isEditing = editing === name;
            const pos = parseFloat(american) >= 0;

            return (
              <div key={name} style={{ background: selected ? "#1c1c14" : CARD_BG, border: `1px solid ${selected ? ACCENT + "88" : "#252525"}`, borderRadius: "10px", padding: "12px 14px", display: "flex", alignItems: "center", gap: "12px", transition: "border-color 0.15s" }}>
                {/* Rank */}
                <div style={{ fontSize: "11px", color: "#444", fontWeight: "700", minWidth: "18px", textAlign: "center" }}>#{i + 1}</div>

                {/* Name + tier */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "15px", fontWeight: "700", color: "#f0ead6" }}>{name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "3px" }}>
                    <div style={{ height: "3px", width: "60px", background: "#2a2a2a", borderRadius: "2px", overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: tier.color, transition: "width 0.4s" }} />
                    </div>
                    <span style={{ fontSize: "9px", color: tier.color, letterSpacing: "1px", fontWeight: "700" }}>{tier.label}</span>
                  </div>
                </div>

                {/* Odds button */}
                {isEditing ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <input autoFocus value={editVal} onChange={e => setEditVal(e.target.value)} onKeyDown={e => { if (e.key === "Enter") commitEdit(name); if (e.key === "Escape") setEditing(null); }} style={{ width: "50px", background: "#111", border: `1px solid ${ACCENT}`, borderRadius: "6px", color: ACCENT, fontSize: "14px", fontWeight: "700", textAlign: "center", padding: "4px", outline: "none" }} placeholder="%" />
                    <button onPointerDown={e => { e.preventDefault(); commitEdit(name); }} style={{ background: ACCENT, border: "none", borderRadius: "6px", color: "#000", fontSize: "14px", fontWeight: "700", padding: "4px 8px", cursor: "pointer" }}>✓</button>
                  </div>
                ) : (
                  <button
                    onClick={() => { if (admin) { setEditing(name); setEditVal(String(pct)); } else { toggleSelection(name); } }}
                    onLongPress={() => admin && (setEditing(name), setEditVal(String(pct)))}
                    style={{
                      background: selected ? ACCENT : "#111",
                      border: `2px solid ${selected ? ACCENT : pos ? GREEN + "55" : "#e0555555"}`,
                      borderRadius: "8px", padding: "8px 14px", cursor: "pointer",
                      textAlign: "center", minWidth: "70px", transition: "all 0.15s",
                    }}
                  >
                    <div style={{ fontSize: "17px", fontWeight: "800", color: selected ? "#000" : pos ? GREEN : "#e05555", lineHeight: 1 }}>{american}</div>
                    <div style={{ fontSize: "9px", color: selected ? "#000" : "#555", marginTop: "2px", letterSpacing: "1px" }}>{selected ? "ADDED ✓" : "BET"}</div>
                  </button>
                )}

                {admin && !isEditing && (
                  <button onClick={() => setShowRevealModal(name)} style={{ background: "transparent", border: "1px solid #2a2a2a", borderRadius: "6px", color: "#444", fontSize: "10px", letterSpacing: "1px", padding: "6px 8px", cursor: "pointer" }}>OUT</button>
                )}
              </div>
            );
          })}
        </div>

        {/* Eliminated */}
        {eliminated.length > 0 && (
          <div style={{ marginTop: "24px" }}>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "#444", letterSpacing: "2px", marginBottom: "10px", padding: "0 4px" }}>ELIMINATED</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {eliminated.map(name => (
                <div key={name} style={{ background: "#111", border: `1px solid ${revealed[name] === "traitor" ? "#5a1a1a" : "#1a2a1a"}`, borderRadius: "6px", padding: "6px 14px", fontSize: "12px", color: "#444", display: "flex", alignItems: "center", gap: "8px", textDecoration: "line-through" }}>
                  {name}
                  <span style={{ fontSize: "9px", letterSpacing: "2px", color: revealed[name] === "traitor" ? "#c0392b" : "#27ae60", textDecoration: "none", fontWeight: "700" }}>{revealed[name]?.toUpperCase()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent bets feed + full board */}
        <div style={{ marginTop: "28px", paddingTop: "24px", borderTop: "1px solid #1a1a1a" }}>
          <RecentBets bets={bets} />
          <BetsBoard bets={bets} bettorName={bettorName} odds={odds} onClearBets={handleClearBets} admin={admin} />
        </div>

        {/* Admin controls */}
        {admin && (
          <div style={{ marginTop: "28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button onClick={() => setShowTickerEditor(true)} style={{ background: "transparent", border: `1px solid ${ACCENT}44`, borderRadius: "6px", color: ACCENT, fontSize: "11px", fontWeight: "700", letterSpacing: "1px", padding: "6px 12px", cursor: "pointer" }}>EDIT TICKER</button>
            <button onClick={() => applyUpdate(defaultState)} style={{ background: "transparent", border: "1px solid #2a2a2a", borderRadius: "6px", color: "#444", fontSize: "11px", padding: "6px 12px", cursor: "pointer" }}>RESET GAME</button>
          </div>
        )}
      </div>

      {/* Reveal modal */}
      {showRevealModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "24px" }}>
          <div style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "12px", padding: "32px", maxWidth: "320px", width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: "10px", letterSpacing: "4px", color: ACCENT, fontWeight: "700", marginBottom: "8px" }}>ELIMINATING</div>
            <div style={{ fontSize: "28px", fontWeight: "800", marginBottom: "24px", fontFamily: "Georgia, serif" }}>{showRevealModal}</div>
            <div style={{ fontSize: "13px", color: "#666", marginBottom: "20px" }}>Traitor or Faithful?</div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => handleEliminate(showRevealModal, "traitor")} style={{ flex: 1, background: "#2a0808", border: "1px solid #c0392b", borderRadius: "8px", color: "#e05555", fontSize: "13px", fontWeight: "800", letterSpacing: "2px", padding: "14px", cursor: "pointer" }}>TRAITOR</button>
              <button onClick={() => handleEliminate(showRevealModal, "faithful")} style={{ flex: 1, background: "#0a1f0a", border: "1px solid #27ae60", borderRadius: "8px", color: "#5db85d", fontSize: "13px", fontWeight: "800", letterSpacing: "2px", padding: "14px", cursor: "pointer" }}>FAITHFUL</button>
            </div>
            <button onClick={() => setShowRevealModal(null)} style={{ marginTop: "12px", background: "transparent", border: "none", color: "#444", fontSize: "12px", cursor: "pointer" }}>cancel</button>
          </div>
        </div>
      )}

      {showTickerEditor && (
        <TickerEditor items={ticker} onSave={items => applyUpdate(prev => ({ ...prev, ticker: items }))} onClose={() => setShowTickerEditor(false)} />
      )}

      {/* Sticky bet slip */}
      <BetSlip
        selections={selections}
        odds={odds}
        onRemove={name => setSelections(p => p.filter(n => n !== name))}
        onClear={() => setSelections([])}
        bettorName={bettorName}
        onChangeName={handleChangeName}
        onSubmit={handleSubmitBets}
        submitting={submitting}
      />
    </div>
  );
}
