import { useState, useEffect, useRef } from "react";

const ACCENT   = "#06c8d8";
const GREEN    = "#3dd68c";
const GOLD     = "#ffd166";
const AMBER    = "#f5a623";
const WC_COLOR = "#a78bfa";
const CARD_BG  = "#112240";
const BG       = "#0b1929";

const ADMIN_SECRET = "traitors2024";
const BETTOR_KEY   = "hoop-bettor";
const isAdmin = () => new URLSearchParams(window.location.search).get("admin") === ADMIN_SECRET;

const DIVISIONS = [
  { id: "train",   name: "Train",   color: ACCENT },
  { id: "deploy",  name: "Deploy",  color: AMBER },
  { id: "analyze", name: "Analyze", color: WC_COLOR },
  { id: "test",    name: "Test",    color: GREEN },
];

const DIV_COLORS = { train: ACCENT, deploy: AMBER, analyze: WC_COLOR, test: GREEN };

const BASE_COMPETITORS = [
  { id: "ALLY", div: "train",   seed: 1,    name: "Ally",            odds: -140 },
  { id: "TRWC", div: "train",   seed: "WC", name: "Train Wildcard",  odds: 1800 },
  { id: "TR2",  div: "train",   seed: 2,    name: "TR2",             odds: 650  },
  { id: "TR3",  div: "train",   seed: 3,    name: "TR3",             odds: 1100 },
  { id: "DP1",  div: "deploy",  seed: 1,    name: "DP1",             odds: 280  },
  { id: "DPWC", div: "deploy",  seed: "WC", name: "Deploy Wildcard", odds: 2000 },
  { id: "DP2",  div: "deploy",  seed: 2,    name: "DP2",             odds: 700  },
  { id: "DP3",  div: "deploy",  seed: 3,    name: "DP3",             odds: 1200 },
  { id: "AN1",  div: "analyze", seed: 1,    name: "AN1",             odds: 300  },
  { id: "ANWC", div: "analyze", seed: "WC", name: "Analyze Wildcard",odds: 2200 },
  { id: "AN2",  div: "analyze", seed: 2,    name: "AN2",             odds: 750  },
  { id: "AN3",  div: "analyze", seed: 3,    name: "AN3",             odds: 1300 },
  { id: "TS1",  div: "test",    seed: 1,    name: "TS1",             odds: 260  },
  { id: "TSWC", div: "test",    seed: "WC", name: "Test Wildcard",   odds: 1600 },
  { id: "TS2",  div: "test",    seed: 2,    name: "TS2",             odds: 600  },
  { id: "TS3",  div: "test",    seed: 3,    name: "TS3",             odds: 1000 },
];

const QUICK_STAKES = [10, 25, 50, 100];

const fmtOdds = (n) => n >= 0 ? `+${n}` : `${n}`;
const calcPayout = (amt, odds) => odds > 0 ? amt * (1 + odds / 100) : amt * (1 + 100 / Math.abs(odds));

// Shift odds toward shorter when someone bets on a competitor
const shiftOdds = (competitors, bettedId) =>
  competitors.map(c => {
    if (c.id === bettedId) {
      // shorten implied odds ~5-9% (more negative = shorter)
      if (c.odds < 0) {
        const factor = 1.05 + Math.random() * 0.04;
        return { ...c, odds: Math.round(c.odds * factor) };
      }
      const factor = 0.91 + Math.random() * 0.04;
      return { ...c, odds: Math.max(110, Math.round(c.odds * factor)) };
    }
    // lengthen others slightly
    const drift = 1.004 + Math.random() * 0.006;
    return { ...c, odds: c.odds < 0 ? Math.round(c.odds / drift) : Math.round(c.odds * drift) };
  });

export default function HulaHoop() {
  const [competitors, setCompetitors] = useState(BASE_COMPETITORS);
  const [bets, setBets] = useState([]);
  const [selections, setSelections] = useState([]);
  const [bettorName, setBettorName] = useState(() => localStorage.getItem(BETTOR_KEY) || "");
  const [stake, setStake] = useState("");
  const [slipOpen, setSlipOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [syncStatus, setSyncStatus] = useState("loading");
  const justPlaced = useRef(false);
  const admin = isAdmin();

  const load = async (initial = false) => {
    try {
      const res = await fetch("/api/hoop-bets");
      if (!res.ok) throw new Error(res.status);
      const { bets: b, odds } = await res.json();
      setBets(b || []);
      if (odds && Object.keys(odds).length) {
        setCompetitors(prev => prev.map(c => odds[c.id] !== undefined ? { ...c, odds: odds[c.id] } : c));
      }
      if (initial) setSyncStatus("live");
    } catch {
      if (initial) setSyncStatus("error");
    }
  };

  useEffect(() => { load(true); }, []);

  useEffect(() => {
    const id = setInterval(() => {
      if (justPlaced.current) { justPlaced.current = false; return; }
      load(false);
    }, 8000);
    return () => clearInterval(id);
  }, []);

  const toggleSelection = (id) =>
    setSelections(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      if (next.length > 0) setSlipOpen(true);
      return next;
    });

  const handleSubmitBets = async () => {
    const amt = parseFloat(stake);
    if (!bettorName.trim() || !amt || !selections.length) return;
    setSubmitting(true);
    try {
      let updated = [...competitors];
      for (const id of selections) {
        updated = shiftOdds(updated, id);
        const c = updated.find(x => x.id === id);
        const oddsMap = Object.fromEntries(updated.map(x => [x.id, x.odds]));
        await fetch("/api/hoop-bets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bet: { bettor: bettorName.trim(), player: c.name, cid: id, amount: amt, odds: fmtOdds(c.odds) },
            odds: oddsMap,
          }),
        });
      }
      setCompetitors(updated);
      setSelections([]);
      setStake("");
      setSlipOpen(false);
      justPlaced.current = true;
      setTimeout(() => load(false), 400);
    } catch {}
    setSubmitting(false);
  };

  const handleClearBets = async () => {
    await fetch("/api/hoop-bets", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ secret: ADMIN_SECRET }) });
    setBets([]);
    setCompetitors(BASE_COMPETITORS);
  };

  const handleChangeName = (name) => {
    setBettorName(name);
    localStorage.setItem(BETTOR_KEY, name);
  };

  const sorted = [...competitors].sort((a, b) => a.odds - b.odds);
  const maxOdds = Math.max(...competitors.map(c => c.odds));
  const amt = parseFloat(stake) || 0;
  const totalPayout = selections.reduce((s, id) => {
    const c = competitors.find(x => x.id === id);
    return s + calcPayout(amt, c.odds);
  }, 0);
  const betCounts = bets.reduce((acc, b) => { acc[b.cid] = (acc[b.cid] || 0) + 1; return acc; }, {});

  const statusColor = { live: "#2a3a2a", saving: AMBER, error: "#3a1a1a", loading: "#2a2a2a" }[syncStatus];
  const statusText  = { live: "LIVE", saving: "SAVING", error: "ERROR", loading: "LOADING" }[syncStatus];

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: "Arial, sans-serif", color: "#e0f2fe", paddingBottom: "150px" }}>

      {/* Disclaimer */}
      <div style={{ background: "#0d1f35", borderBottom: `1px solid #1e3a5f`, padding: "5px 16px", textAlign: "center" }}>
        <span style={{ fontSize: "10px", color: "#4a7ba8", letterSpacing: "1.5px", fontWeight: "500" }}>
          ⚠ FOR ENTERTAINMENT ONLY · FAKE BETS · RSUs NOT REAL CURRENCY
        </span>
      </div>

      {/* Header */}
      <div style={{ background: "#112240", borderBottom: "1px solid #1e3a5f", padding: "20px 20px 16px", position: "relative", overflow: "hidden" }}>
        {/* decorative hoop rings */}
        <div style={{ position: "absolute", width: 340, height: 340, borderRadius: "50%", border: "42px solid rgba(6,200,216,0.05)", top: -140, right: -60, pointerEvents: "none" }} />
        <div style={{ position: "absolute", width: 200, height: 200, borderRadius: "50%", border: "28px solid rgba(245,166,35,0.05)", bottom: -90, left: -30, pointerEvents: "none" }} />
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", position: "relative" }}>
          <div>
            <div style={{ fontSize: "9px", letterSpacing: "4px", color: ACCENT, fontWeight: "700", marginBottom: "3px" }}>THE GREAT FY27</div>
            <div style={{ fontSize: "26px", fontWeight: "800", letterSpacing: "1px", lineHeight: 1.1 }}>HULA HOOP<br /><span style={{ color: ACCENT }}>CHALLENGE</span></div>
            <div style={{ display: "flex", gap: "14px", marginTop: "8px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "11px", color: "#6b90b8" }}>📅 September 3</span>
              <span style={{ fontSize: "11px", color: "#6b90b8" }}>🌀 16 competitors · 4 divisions</span>
            </div>
            <div style={{ marginTop: "8px", display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(255,209,102,0.07)", border: "1px solid rgba(255,209,102,0.2)", borderRadius: "20px", padding: "4px 12px" }}>
              <span style={{ fontSize: "11px", color: GOLD, fontWeight: "600" }}>🎰 PRIZE — "Get Out of Jail Free" card from Deal Desk</span>
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: statusColor, border: "1px solid #1e3a5f", borderRadius: "20px", padding: "4px 10px" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: syncStatus === "live" ? GREEN : AMBER }} />
              <span style={{ fontSize: "9px", color: syncStatus === "live" ? GREEN : AMBER, letterSpacing: "1px", fontWeight: "700" }}>{statusText}</span>
            </div>
            {admin && <div style={{ fontSize: "9px", color: ACCENT, letterSpacing: "2px", marginTop: "4px" }}>ADMIN MODE</div>}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "16px 12px" }}>

        {/* Bracket overview */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ fontSize: "10px", fontWeight: "700", color: "#3a5f85", letterSpacing: "3px", marginBottom: "10px" }}>DIVISIONS</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "6px" }}>
            {DIVISIONS.map(div => {
              const comps = competitors.filter(c => c.div === div.id);
              return (
                <div key={div.id} style={{ background: CARD_BG, border: "1px solid #1e3a5f", borderRadius: "8px", overflow: "hidden" }}>
                  <div style={{ padding: "6px 10px", borderBottom: "1px solid #1e3a5f", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", fontWeight: "800", color: div.color, letterSpacing: "0.5px" }}>{div.name}</span>
                    <span style={{ fontSize: "8px", color: "#3a5f85", letterSpacing: "2px", fontWeight: "600" }}>DIV</span>
                  </div>
                  <div style={{ padding: "6px" }}>
                    {comps.map(c => {
                      const isWC = c.seed === "WC";
                      return (
                        <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "3px 4px", fontSize: "10px" }}>
                          <div style={{ fontSize: "7px", fontWeight: "700", padding: "1px 4px", borderRadius: "2px", background: isWC ? "rgba(167,139,250,0.15)" : c.seed === 1 ? "rgba(245,166,35,0.15)" : "rgba(255,255,255,0.05)", color: isWC ? WC_COLOR : c.seed === 1 ? AMBER : "#3a5f85", letterSpacing: "1px", flexShrink: 0 }}>
                            {isWC ? "WC" : `#${c.seed}`}
                          </div>
                          <div style={{ color: "#6b90b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
            {["Div Winners", "→", "Final Four", "→", "Semis", "→"].map((x, i) => (
              x === "→"
                ? <span key={i} style={{ color: "#1e3a5f", fontSize: "12px" }}>→</span>
                : <div key={i} style={{ background: CARD_BG, border: "1px solid #1e3a5f", borderRadius: "5px", padding: "4px 9px", fontSize: "10px", color: "#4a7ba8", fontWeight: "600" }}>{x}</div>
            ))}
            <div style={{ background: "rgba(255,209,102,0.07)", border: `1px solid rgba(255,209,102,0.25)`, borderRadius: "5px", padding: "4px 9px", fontSize: "10px", color: GOLD, fontWeight: "800" }}>🌀 Champion</div>
          </div>
        </div>

        {/* Odds label */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <div style={{ fontSize: "10px", fontWeight: "700", color: "#3a5f85", letterSpacing: "3px" }}>CHAMPIONSHIP ODDS · TAP TO BET</div>
          <div style={{ fontSize: "10px", color: "#3a5f85" }}>odds shift with bets</div>
        </div>

        {/* Odds board */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "24px" }}>
          {sorted.map((c, i) => {
            const selected = selections.includes(c.id);
            const isWC = c.seed === "WC";
            const divColor = DIV_COLORS[c.div];
            const div = DIVISIONS.find(d => d.id === c.div);
            const barPct = (1 - (c.odds - 110) / (maxOdds - 110)) * 100;
            const cnt = betCounts[c.id] || 0;

            return (
              <div key={c.id}
                onClick={() => toggleSelection(c.id)}
                style={{ background: selected ? "rgba(6,200,216,0.07)" : CARD_BG, border: `1px solid ${selected ? ACCENT : "#1e3a5f"}`, borderRadius: "9px", padding: "10px 13px", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", transition: "border-color 0.12s" }}
              >
                <div style={{ fontSize: "10px", color: "#3a5f85", fontWeight: "700", minWidth: "18px", textAlign: "center" }}>#{i + 1}</div>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: divColor, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#e0f2fe", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                    <div style={{ fontSize: "8px", fontWeight: "700", padding: "1px 5px", borderRadius: "3px", background: isWC ? "rgba(167,139,250,0.15)" : c.seed === 1 ? "rgba(245,166,35,0.15)" : "rgba(255,255,255,0.05)", color: isWC ? WC_COLOR : c.seed === 1 ? AMBER : "#4a7ba8", letterSpacing: "1px" }}>
                      {isWC ? "WILDCARD" : `SEED ${c.seed}`}
                    </div>
                    <div style={{ fontSize: "10px", color: "#4a7ba8" }}>{div.name}</div>
                    {cnt > 0 && <div style={{ fontSize: "9px", color: "#3a5f85" }}>{cnt} bet{cnt > 1 ? "s" : ""}</div>}
                  </div>
                </div>
                {/* bar */}
                <div style={{ flex: 1, maxWidth: 60, height: 3, background: "#1e3a5f", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ width: `${barPct}%`, height: "100%", background: divColor, borderRadius: 2, transition: "width 0.5s" }} />
                </div>
                {/* odds button */}
                <div style={{ background: selected ? ACCENT : "#162d50", border: `1px solid ${selected ? ACCENT : "#1e3a5f"}`, borderRadius: "7px", padding: "7px 11px", textAlign: "right", minWidth: 68, flexShrink: 0, transition: "all 0.12s" }}>
                  <div style={{ fontSize: "16px", fontWeight: "800", color: selected ? "#000" : GREEN, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{fmtOdds(c.odds)}</div>
                  <div style={{ fontSize: "8px", color: selected ? "rgba(0,0,0,0.6)" : "#4a7ba8", letterSpacing: "1px", marginTop: "2px" }}>{selected ? "ADDED ✓" : "TO WIN"}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent bets */}
        {bets.length > 0 && (
          <div style={{ marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <div style={{ fontSize: "10px", fontWeight: "700", color: "#3a5f85", letterSpacing: "3px" }}>RECENT ACTION</div>
              {admin && <button onClick={handleClearBets} style={{ background: "transparent", border: "1px solid #1e3a5f", borderRadius: "5px", color: "#3a5f85", fontSize: "10px", padding: "4px 10px", cursor: "pointer", fontFamily: "Arial, sans-serif" }}>Clear All</button>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {[...bets].reverse().slice(0, 8).map(b => {
                const ts = b.ts ? new Date(b.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
                const pos = !String(b.odds).startsWith("-");
                return (
                  <div key={b.id} style={{ display: "flex", alignItems: "center", gap: "8px", background: CARD_BG, border: "1px solid #1e3a5f", borderRadius: "7px", padding: "7px 11px" }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#162d50", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: "800", color: "#4a7ba8", flexShrink: 0 }}>{b.bettor?.[0]?.toUpperCase()}</div>
                    <div style={{ flex: 1, fontSize: "11px", color: "#6b90b8" }}>
                      <span style={{ color: "#e0f2fe", fontWeight: "600" }}>{b.bettor}</span> bet {b.amount} RSUs on <span style={{ color: ACCENT }}>{b.player}</span>
                    </div>
                    <div style={{ fontSize: "12px", fontWeight: "800", color: pos ? GREEN : "#f06060", fontVariantNumeric: "tabular-nums" }}>{b.odds}</div>
                    {ts && <div style={{ fontSize: "9px", color: "#3a5f85" }}>{ts}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bet slip */}
      {(selections.length > 0 || slipOpen) && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200, display: "flex", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: "600px", background: "#112240", borderTop: "2px solid #1e3a5f", borderRadius: "16px 16px 0 0", boxShadow: "0 -8px 40px rgba(0,0,0,0.6)" }}>

            {/* Header */}
            <div onClick={() => setSlipOpen(o => !o)} style={{ padding: "13px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", userSelect: "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                <div style={{ background: selections.length > 0 ? ACCENT : "#1e3a5f", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "800", color: selections.length > 0 ? "#000" : "#4a7ba8" }}>{selections.length}</div>
                <span style={{ fontSize: "14px", fontWeight: "800", color: "#e0f2fe", letterSpacing: "1px" }}>FAKE BET SLIP</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {amt > 0 && selections.length > 0 && <span style={{ fontSize: "12px", fontWeight: "700", color: GREEN }}>Win: {totalPayout.toFixed(0)} RSUs</span>}
                <span style={{ color: "#3a5f85" }}>{slipOpen ? "▾" : "▴"}</span>
              </div>
            </div>

            {slipOpen && (
              <div style={{ padding: "0 14px 16px" }}>
                {selections.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "18px", color: "#4a7ba8", fontSize: "12px" }}>Tap any odds to add a selection</div>
                ) : (
                  <>
                    {selections.map(id => {
                      const c = competitors.find(x => x.id === id);
                      const div = DIVISIONS.find(d => d.id === c.div);
                      const payout = amt > 0 ? calcPayout(amt, c.odds).toFixed(0) : null;
                      return (
                        <div key={id} style={{ background: BG, border: "1px solid #1e3a5f", borderRadius: "8px", padding: "10px 12px", display: "flex", alignItems: "center", gap: "10px", marginBottom: "7px" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "13px", fontWeight: "700", color: "#e0f2fe" }}>{c.name}</div>
                            <div style={{ fontSize: "10px", color: "#4a7ba8", marginTop: "1px" }}>To win championship · {div.name}{payout ? ` · → ${payout} RSUs` : ""}</div>
                          </div>
                          <div style={{ fontSize: "18px", fontWeight: "800", color: GREEN, fontVariantNumeric: "tabular-nums" }}>{fmtOdds(c.odds)}</div>
                          <button onClick={() => setSelections(p => p.filter(x => x !== id))} style={{ background: "transparent", border: "none", color: "#3a5f85", fontSize: "18px", cursor: "pointer" }}>×</button>
                        </div>
                      );
                    })}

                    <input value={bettorName} onChange={e => handleChangeName(e.target.value)} placeholder="Your name" style={{ width: "100%", background: BG, border: "1px solid #1e3a5f", borderRadius: "7px", color: "#e0f2fe", fontSize: "13px", fontFamily: "Arial, sans-serif", padding: "9px 12px", outline: "none", marginBottom: "9px", boxSizing: "border-box" }} />

                    <div style={{ background: BG, border: "1px solid #1e3a5f", borderRadius: "8px", padding: "9px 12px", marginBottom: "9px" }}>
                      <div style={{ fontSize: "9px", fontWeight: "700", letterSpacing: "2px", color: "#4a7ba8", marginBottom: "6px" }}>STAKE PER BET (RSUs)</div>
                      <div style={{ display: "flex", gap: "5px", marginBottom: "7px" }}>
                        {QUICK_STAKES.map(q => (
                          <button key={q} onClick={() => setStake(String(q))} style={{ flex: 1, padding: "5px 0", background: stake === String(q) ? "#162d50" : "#112240", border: `1px solid ${stake === String(q) ? ACCENT : "#1e3a5f"}`, borderRadius: "5px", color: stake === String(q) ? ACCENT : "#4a7ba8", fontSize: "11px", fontWeight: "700", cursor: "pointer", fontFamily: "Arial, sans-serif" }}>{q}</button>
                        ))}
                      </div>
                      <input value={stake} onChange={e => setStake(e.target.value)} type="number" min="1" placeholder="Enter amount" style={{ width: "100%", background: "transparent", border: "none", color: "#e0f2fe", fontSize: "22px", fontWeight: "800", outline: "none", fontFamily: "Arial, sans-serif", fontVariantNumeric: "tabular-nums", boxSizing: "border-box" }} />
                    </div>

                    {amt > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", background: BG, border: "1px solid #1e3a5f", borderRadius: "8px", padding: "9px 12px", marginBottom: "9px" }}>
                        <div>
                          <div style={{ fontSize: "9px", color: "#4a7ba8", letterSpacing: "2px", fontWeight: "700" }}>TOTAL STAKE</div>
                          <div style={{ fontSize: "15px", fontWeight: "700", fontVariantNumeric: "tabular-nums", marginTop: "2px" }}>{(amt * selections.length).toFixed(0)} RSUs</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "9px", color: "#4a7ba8", letterSpacing: "2px", fontWeight: "700" }}>POTENTIAL PAYOUT</div>
                          <div style={{ fontSize: "15px", fontWeight: "700", color: GREEN, fontVariantNumeric: "tabular-nums", marginTop: "2px" }}>{totalPayout.toFixed(0)} RSUs</div>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleSubmitBets}
                      disabled={submitting || !bettorName.trim() || !amt}
                      style={{ width: "100%", padding: "13px", border: "none", borderRadius: "8px", fontFamily: "Arial, sans-serif", fontSize: "15px", fontWeight: "800", letterSpacing: "1px", cursor: submitting || !bettorName.trim() || !amt ? "default" : "pointer", background: submitting || !bettorName.trim() || !amt ? "#1e3a5f" : GREEN, color: submitting || !bettorName.trim() || !amt ? "#4a7ba8" : "#0b1929" }}
                    >
                      {submitting ? "PLACING..." : `PLACE FAKE ${selections.length > 1 ? `${selections.length} BETS` : "BET"}`}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
