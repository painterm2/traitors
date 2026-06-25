import { useState, useEffect, useRef } from "react";

const PLAYERS = ["Alex", "Santi", "Dean", "Annie", "Nat", "Jordan", "Skyler", "Sammie"];
const STORAGE_KEY = "traitors-game-state";
const ACCENT = "#e8b84b";

// Admin access via ?admin=traitors2024 in the URL
const ADMIN_SECRET = "traitors2024";
const isAdmin = () => new URLSearchParams(window.location.search).get("admin") === ADMIN_SECRET;

const INITIAL_TICKER = [
  { id: 1, text: "🔪 MURDER — Lucy was found dead in the castle last night" },
  { id: 2, text: "🚪 BANISHED — Michael and Kim were voted out by the Faithfuls yesterday" },
  { id: 3, text: "📈 ODDS SHIFT — Alex's Traitor odds have risen sharply following last night's events" },
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

function Ticker({ items }) {
  const trackRef = useRef(null);
  // Build a long string by repeating items so scroll looks seamless
  const repeated = [...items, ...items, ...items];

  return (
    <div style={{
      background: "#0a0a0a",
      borderBottom: "1px solid #2a1a00",
      overflow: "hidden",
      height: "34px",
      display: "flex",
      alignItems: "center",
      position: "relative",
    }}>
      {/* Label badge */}
      <div style={{
        flexShrink: 0,
        background: ACCENT,
        color: "#0d0d0d",
        fontSize: "9px",
        fontFamily: "Arial Narrow, Arial, sans-serif",
        fontWeight: "700",
        letterSpacing: "2px",
        padding: "0 10px",
        height: "100%",
        display: "flex",
        alignItems: "center",
        zIndex: 1,
      }}>
        BREAKING
      </div>
      <div style={{ overflow: "hidden", flex: 1, position: "relative" }}>
        <div
          ref={trackRef}
          style={{
            display: "flex",
            whiteSpace: "nowrap",
            animation: "ticker-scroll 40s linear infinite",
          }}
        >
          {repeated.map((item, i) => (
            <span key={i} style={{
              display: "inline-block",
              fontSize: "11px",
              fontFamily: "Arial, sans-serif",
              color: "#ccc",
              letterSpacing: "0.5px",
              paddingRight: "80px",
            }}>
              {item.text}
            </span>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
      `}</style>
    </div>
  );
}

function OddsHighlightTicker({ odds, eliminated }) {
  const activePlayers = PLAYERS.filter(p => !eliminated.includes(p));
  const sorted = [...activePlayers].sort((a, b) => odds[b] - odds[a]);

  return (
    <div style={{
      background: "#0d0d0d",
      borderBottom: "1px solid #1f1f1f",
      overflow: "hidden",
      height: "28px",
      display: "flex",
      alignItems: "center",
    }}>
      <div style={{ flexShrink: 0, padding: "0 10px", fontSize: "9px", fontFamily: "Arial Narrow, Arial, sans-serif", color: "#555", letterSpacing: "2px" }}>
        ODDS
      </div>
      <div style={{ overflow: "hidden", flex: 1 }}>
        <div style={{
          display: "flex",
          whiteSpace: "nowrap",
          animation: "ticker-scroll 30s linear infinite",
        }}>
          {[...sorted, ...sorted].map((name, i) => {
            const pct = odds[name];
            const american = pctToAmerican(pct);
            const isNeg = parseFloat(american) < 0;
            return (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "6px", paddingRight: "36px" }}>
                <span style={{ fontSize: "11px", fontFamily: "Arial Narrow, Arial, sans-serif", color: "#aaa", fontWeight: "600" }}>{name}</span>
                <span style={{ fontSize: "11px", fontFamily: "Arial Narrow, Arial, sans-serif", fontWeight: "700", color: isNeg ? "#e05555" : "#5db85d" }}>{american}</span>
                <span style={{ fontSize: "10px", color: "#444" }}>·</span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TickerEditor({ items, onSave, onClose }) {
  const [list, setList] = useState(items.map(i => ({ ...i })));
  const [newText, setNewText] = useState("");

  const add = () => {
    if (!newText.trim()) return;
    setList(prev => [...prev, { id: Date.now(), text: newText.trim() }]);
    setNewText("");
  };

  const remove = (id) => setList(prev => prev.filter(i => i.id !== id));

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "24px" }}>
      <div style={{ background: "#141414", border: "1px solid #333", borderRadius: "8px", padding: "28px", maxWidth: "480px", width: "100%" }}>
        <div style={{ fontSize: "11px", letterSpacing: "4px", color: ACCENT, fontFamily: "Arial Narrow, Arial, sans-serif", marginBottom: "16px" }}>EDIT TICKER NEWS</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px", maxHeight: "260px", overflowY: "auto" }}>
          {list.map(item => (
            <div key={item.id} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span style={{ flex: 1, fontSize: "12px", color: "#ccc", fontFamily: "Arial, sans-serif" }}>{item.text}</span>
              <button onClick={() => remove(item.id)} style={{ background: "transparent", border: "1px solid #c0392b", borderRadius: "4px", color: "#c0392b", fontSize: "11px", padding: "2px 8px", cursor: "pointer" }}>✕</button>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
          <input
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && add()}
            placeholder="Add news item..."
            style={{ flex: 1, background: "#1a1a1a", border: `1px solid ${ACCENT}`, borderRadius: "4px", color: "#f0ead6", fontSize: "13px", fontFamily: "Arial, sans-serif", padding: "6px 10px", outline: "none" }}
          />
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

export default function TraitorsOdds() {
  const [gameState, setGameState] = useState(null);
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
        if (!parsed.ticker) parsed.ticker = INITIAL_TICKER;
        setGameState(parsed);
      } else {
        setGameState(defaultState);
      }
      if (isInitial) setSyncStatus("synced");
    } catch (e) {
      setGameState(prev => prev ?? defaultState);
      if (isInitial) setSyncStatus("error");
    }
  };

  useEffect(() => { loadFromStorage(true); }, []);

  useEffect(() => {
    const id = setInterval(() => {
      if (justSaved.current) { justSaved.current = false; return; }
      loadFromStorage(false);
    }, 8000);
    return () => clearInterval(id);
  }, []);

  const saveState = async (newState) => {
    setSyncStatus("saving");
    justSaved.current = true;
    try {
      await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: JSON.stringify(newState), secret: ADMIN_SECRET }),
      });
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

  const commitEdit = (name) => {
    const val = parseFloat(editVal);
    if (!isNaN(val) && val >= 1 && val <= 99) {
      applyUpdate(prev => ({ ...prev, odds: { ...prev.odds, [name]: val } }));
    }
    setEditing(null);
  };

  const handleEliminate = (name, role) => {
    applyUpdate(prev => ({
      ...prev,
      eliminated: [...prev.eliminated, name],
      revealed: { ...prev.revealed, [name]: role },
    }));
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
      {/* Breaking news ticker */}
      {ticker && ticker.length > 0 && <Ticker items={ticker} />}

      {/* Odds ticker */}
      <OddsHighlightTicker odds={odds} eliminated={eliminated} />

      {/* Header */}
      <div style={{
        background: "linear-gradient(180deg, #1a0a0a 0%, #0d0d0d 100%)",
        borderBottom: "1px solid #3a1a1a",
        padding: "28px 24px 16px",
        textAlign: "center",
        position: "relative",
      }}>
        <div style={{ fontSize: "11px", letterSpacing: "6px", color: ACCENT, textTransform: "uppercase", marginBottom: "8px", fontFamily: "Arial Narrow, Arial, sans-serif" }}>
          The Traitors
        </div>
        <h1 style={{ fontSize: "clamp(28px, 6vw, 48px)", fontWeight: "700", margin: "0 0 4px", letterSpacing: "2px" }}>
          BETTING BOARD
        </h1>
        <div style={{ fontSize: "13px", color: "#888", fontFamily: "Arial, sans-serif", fontStyle: "italic", marginBottom: "6px" }}>
          Who among them is a Traitor?
        </div>
        <div style={{ fontSize: "9px", letterSpacing: "2px", color: statusColor, fontFamily: "Arial, sans-serif" }}>
          ● {statusText}
        </div>
        {admin && (
          <div style={{ position: "absolute", top: "12px", right: "16px", fontSize: "9px", letterSpacing: "2px", color: ACCENT, fontFamily: "Arial, sans-serif", background: "#1a0a0a", border: `1px solid ${ACCENT}44`, borderRadius: "4px", padding: "3px 8px" }}>
            ADMIN
          </div>
        )}
      </div>

      <div style={{ maxWidth: "560px", margin: "0 auto", padding: "24px 16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {sorted.map((name, i) => {
            const pct = odds[name];
            const american = pctToAmerican(pct);
            const tier = getTier(pct);
            const isEditing = editing === name;
            const isTop = i === 0;

            return (
              <div key={name} style={{
                background: isTop ? "linear-gradient(135deg, #1f0a0a, #160808)" : "#141414",
                border: `1px solid ${isTop ? "#5a1a1a" : "#222"}`,
                borderRadius: "6px", padding: "14px 16px",
                display: "flex", alignItems: "center", gap: "12px",
              }}>
                <div style={{ fontSize: "12px", color: "#555", fontFamily: "Arial Narrow, Arial, sans-serif", minWidth: "20px", textAlign: "center" }}>
                  #{i + 1}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "17px", fontWeight: "600", color: isTop ? "#f5d0c8" : "#f0ead6" }}>{name}</div>
                  <div style={{ fontSize: "10px", letterSpacing: "2px", color: tier.color, fontFamily: "Arial Narrow, Arial, sans-serif", marginTop: "2px" }}>
                    {tier.label}
                  </div>
                </div>

                <div style={{ width: "80px", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                  <div style={{ width: "100%", height: "3px", background: "#2a2a2a", borderRadius: "2px", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${tier.color}88, ${tier.color})`, transition: "width 0.4s ease" }} />
                  </div>
                  <div style={{ fontSize: "10px", color: "#666", fontFamily: "Arial, sans-serif" }}>{pct}%</div>
                </div>

                {/* Odds display — editable only for admin */}
                <div
                  onClick={() => { if (admin && !isEditing) { setEditing(name); setEditVal(String(pct)); } }}
                  style={{ minWidth: "76px", textAlign: "right", cursor: admin ? "pointer" : "default" }}
                >
                  {isEditing ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <input
                        autoFocus
                        value={editVal}
                        onChange={(e) => setEditVal(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") commitEdit(name); if (e.key === "Escape") setEditing(null); }}
                        style={{
                          width: "44px", background: "#1a1a1a", border: `1px solid ${ACCENT}`,
                          borderRadius: "4px", color: ACCENT, fontSize: "14px",
                          fontFamily: "Arial Narrow, Arial, sans-serif", fontWeight: "700",
                          textAlign: "center", padding: "2px 4px", outline: "none",
                        }}
                        placeholder="%"
                      />
                      <button
                        onPointerDown={(e) => { e.preventDefault(); commitEdit(name); }}
                        style={{
                          background: ACCENT, border: "none", borderRadius: "4px",
                          color: "#0d0d0d", fontSize: "14px", fontWeight: "700",
                          padding: "2px 7px", cursor: "pointer", lineHeight: "1.4",
                        }}
                      >✓</button>
                    </div>
                  ) : (
                    <div>
                      <div style={{
                        fontSize: "20px", fontFamily: "Arial Narrow, Arial, sans-serif", fontWeight: "700",
                        color: parseFloat(american) < 0 ? "#e05555" : "#5db85d",
                      }}>{american}</div>
                      {admin && <div style={{ fontSize: "9px", color: "#444", fontFamily: "Arial, sans-serif", letterSpacing: "1px" }}>TAP TO EDIT</div>}
                    </div>
                  )}
                </div>

                {admin && (
                  <button
                    onClick={() => setShowRevealModal(name)}
                    style={{
                      background: "transparent", border: "1px solid #333", borderRadius: "4px",
                      color: "#555", fontSize: "11px", fontFamily: "Arial, sans-serif",
                      letterSpacing: "1px", padding: "4px 8px", cursor: "pointer",
                    }}
                  >OUT</button>
                )}
              </div>
            );
          })}
        </div>

        {eliminated.length > 0 && (
          <div style={{ marginTop: "32px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "4px", color: "#444", fontFamily: "Arial Narrow, Arial, sans-serif", marginBottom: "12px", textAlign: "center" }}>
              ELIMINATED
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center" }}>
              {eliminated.map(name => (
                <div key={name} style={{
                  background: "#111", border: `1px solid ${revealed[name] === "traitor" ? "#5a1a1a" : "#1a2a1a"}`,
                  borderRadius: "4px", padding: "6px 14px", fontSize: "13px", color: "#555",
                  display: "flex", alignItems: "center", gap: "8px", textDecoration: "line-through",
                }}>
                  {name}
                  <span style={{ fontSize: "9px", letterSpacing: "2px", color: revealed[name] === "traitor" ? "#c0392b" : "#27ae60", textDecoration: "none" }}>
                    {revealed[name]?.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {admin && (
          <div style={{ marginTop: "32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => setShowTickerEditor(true)}
                style={{
                  background: "transparent", border: `1px solid ${ACCENT}55`, borderRadius: "4px",
                  color: ACCENT, fontSize: "10px", fontFamily: "Arial, sans-serif",
                  letterSpacing: "1px", padding: "4px 10px", cursor: "pointer",
                }}
              >EDIT TICKER</button>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <div style={{ fontSize: "10px", color: "#333", fontFamily: "Arial, sans-serif", letterSpacing: "2px" }}>
                TAP ODDS TO EDIT · TAP OUT TO ELIMINATE
              </div>
              <button
                onClick={() => applyUpdate(defaultState)}
                style={{
                  background: "transparent", border: "1px solid #2a2a2a", borderRadius: "4px",
                  color: "#333", fontSize: "10px", fontFamily: "Arial, sans-serif",
                  letterSpacing: "1px", padding: "4px 10px", cursor: "pointer",
                }}
              >RESET</button>
            </div>
          </div>
        )}
      </div>

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

      {showTickerEditor && (
        <TickerEditor
          items={ticker}
          onSave={(newItems) => applyUpdate(prev => ({ ...prev, ticker: newItems }))}
          onClose={() => setShowTickerEditor(false)}
        />
      )}
    </div>
  );
}
