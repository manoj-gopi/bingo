import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import "./App.css";
import { db } from "./firebase";
import { ref, set, get, onValue } from "firebase/database";

const COLORS = {
  bg: "#0f0f1a",
  card: "#1a1a2e",
  cardBorder: "#2a2a4a",
  accent: "#7c3aed",
  accentLight: "#a78bfa",
  gold: "#f59e0b",
  green: "#10b981",
  red: "#ef4444",
  text: "#e2e8f0",
  muted: "#94a3b8",
  marked: "#10b981",
};

function generateCard(size = 5) {
  const total = size * size;
  const numbers = Array.from({ length: total }, (_, i) => i + 1);
  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
  }
  const grid = Array.from({ length: size }, (_, r) => numbers.slice(r * size, r * size + size));
  if (size % 2 === 1) {
    const mid = Math.floor(size / 2);
    grid[mid][mid] = "FREE";
  }
  return grid;
}

function getCompletedLines(marked, grid) {
  const size = grid.length;
  if (size === 0) return { diagonals: 0, rows: 0, cols: 0, completedRows: [], completedCols: [], completedDiagonals: [] };

  const isMarked = (r, c) => marked.has(`${r}-${c}`) || grid[r][c] === "FREE";
  let rows = 0, cols = 0, diagonals = 0;
  const completedRows = [], completedCols = [], completedDiagonals = [];

  for (let r = 0; r < size; r++) {
    if (Array.from({ length: size }, (_, c) => c).every(c => isMarked(r, c))) {
      rows++;
      completedRows.push(r);
    }
  }
  for (let c = 0; c < size; c++) {
    if (Array.from({ length: size }, (_, r) => r).every(r => isMarked(r, c))) {
      cols++;
      completedCols.push(c);
    }
  }
  if (Array.from({ length: size }, (_, i) => i).every(i => isMarked(i, i))) {
    diagonals++;
    completedDiagonals.push('main');
  }
  if (Array.from({ length: size }, (_, i) => i).every(i => isMarked(i, size - 1 - i))) {
    diagonals++;
    completedDiagonals.push('anti');
  }

  return { diagonals, rows, cols, completedRows, completedCols, completedDiagonals };
}

function checkWin(marked, grid) {
  const { diagonals, rows, cols } = getCompletedLines(marked, grid);
  return diagonals + rows + cols >= 5;
}

// ── Firebase helpers ────────────────────────────────────────────────────────
async function saveRoom(code, data) {
  console.log("[Firebase] saveRoom called with code:", code);
  await set(ref(db, `rooms/${code}`), { ...data, _ts: Date.now() });
  console.log("[Firebase] saveRoom done:", code);
}

async function loadRoom(code) {
  console.log("[Firebase] loadRoom called with code:", code);
  const snap = await get(ref(db, `rooms/${code}`));
  console.log("[Firebase] loadRoom exists:", snap.exists());
  return snap.exists() ? snap.val() : null;
}

// ── Lobby ───────────────────────────────────────────────────────────────────
function Lobby({ onJoin, onCreate }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [tab, setTab] = useState("create");
  const [err, setErr] = useState("");
  const [size, setSize] = useState(5);
  const [roomName, setRoomName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = () => {
    if (!name.trim()) return setErr("Enter your name");
    if (!roomName.trim()) return setErr("Enter room name");
    const newCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    onCreate(name.trim(), newCode, size, roomName.trim());
  };

  const handleJoin = async () => {
    if (!name.trim()) return setErr("Enter your name");
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) return setErr("Enter room code");
    setLoading(true);
    setErr("");
    try {
      const room = await loadRoom(normalizedCode);
      if (!room) return setErr("Room not found — check the code");
      if (room.started) return setErr("Game already in progress");
      if (room.players?.some(p => p.name === name.trim())) return setErr("Name already taken in this room");
      onJoin(name.trim(), normalizedCode);
    } catch {
      setErr("Connection error — try again");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%", background: "#0f0f1a", border: `1px solid ${COLORS.cardBorder}`,
    borderRadius: "0.6rem", padding: "0.75rem 1rem", color: COLORS.text,
    fontSize: "1rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box"
  };

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Space Grotesk', sans-serif", padding: "2rem" }}>
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Bebas+Neue&display=swap" rel="stylesheet" />
      <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
        <div className="bingo-title" style={{ fontSize: "5rem", fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.2em", color: COLORS.accentLight, lineHeight: 1 }}>BINGO</div>
        <div style={{ color: COLORS.muted, fontSize: "1rem", marginTop: "0.5rem" }}>Multiplayer · Room-Based</div>
      </div>
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}`, borderRadius: "1.25rem", padding: "2rem", width: "100%", maxWidth: "420px" }}>
        <div style={{ display: "flex", background: "#0f0f1a", borderRadius: "0.75rem", padding: "4px", marginBottom: "1.75rem", gap: "4px" }}>
          {["create", "join"].map(t => (
            <button key={t} onClick={() => { setTab(t); setErr(""); }} style={{ flex: 1, padding: "0.6rem", border: "none", borderRadius: "0.6rem", cursor: "pointer", fontWeight: 600, fontSize: "0.9rem", fontFamily: "inherit", transition: "all 0.2s", background: tab === t ? COLORS.accent : "transparent", color: tab === t ? "#fff" : COLORS.muted }}>
              {t === "create" ? "🏠 Create Room" : "🚪 Join Room"}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ color: COLORS.muted, fontSize: "0.8rem", display: "block", marginBottom: "0.4rem" }}>YOUR NAME</label>
            <input value={name} onChange={e => { setName(e.target.value); setErr(""); }} placeholder="Enter your name..." maxLength={20} style={inputStyle} />
          </div>
          {tab === "create" && (
            <div>
              <label style={{ color: COLORS.muted, fontSize: "0.8rem", display: "block", marginBottom: "0.4rem" }}>ROOM NAME</label>
              <input value={roomName} onChange={e => { setRoomName(e.target.value); setErr(""); }} placeholder="Enter room name..." maxLength={30} style={inputStyle} />
            </div>
          )}
          <div>
            <label style={{ color: COLORS.muted, fontSize: "0.8rem", display: "block", marginBottom: "0.4rem" }}>BOARD SIZE</label>
            <select value={size} onChange={e => { setSize(Number(e.target.value)); setErr(""); }} style={{ ...inputStyle, padding: "0.7rem 1rem", fontSize: "1rem" }}>
              {[5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n} × {n} (1–{n * n})</option>)}
            </select>
          </div>
          {tab === "join" && (
            <div>
              <label style={{ color: COLORS.muted, fontSize: "0.8rem", display: "block", marginBottom: "0.4rem" }}>ROOM CODE</label>
              <input value={code} onChange={e => { setCode(e.target.value.toUpperCase()); setErr(""); }} placeholder="e.g. XKCD9" maxLength={6}
                style={{ ...inputStyle, color: COLORS.accentLight, fontSize: "1.25rem", fontFamily: "'Bebas Neue', monospace", letterSpacing: "0.2em" }} />
            </div>
          )}
          {err && <div style={{ color: COLORS.red, fontSize: "0.85rem", background: "#ef444420", padding: "0.6rem 0.9rem", borderRadius: "0.5rem" }}>{err}</div>}
          <button onClick={tab === "create" ? handleCreate : handleJoin} disabled={loading}
            style={{ marginTop: "0.5rem", padding: "0.9rem", background: loading ? COLORS.muted : `linear-gradient(135deg, ${COLORS.accent}, #9333ea)`, color: "#fff", border: "none", borderRadius: "0.75rem", fontWeight: 700, fontSize: "1.05rem", cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
            {loading ? "Connecting…" : tab === "create" ? "Create & Enter Room →" : "Join Room →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Waiting room ────────────────────────────────────────────────────────────
function Waiting({ room, roomCode, players, isHost, onStart, playerName }) {
  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Space Grotesk', sans-serif", padding: "2rem" }}>
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Bebas+Neue&display=swap" rel="stylesheet" />
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}`, borderRadius: "1.25rem", padding: "2.5rem", width: "100%", maxWidth: "460px", textAlign: "center" }}>
        <div style={{ fontSize: "0.9rem", color: COLORS.muted, marginBottom: "0.5rem" }}>ROOM CODE</div>
        <div style={{ fontSize: "2.5rem", fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.3em", color: COLORS.accentLight, marginBottom: "0.25rem" }}>{roomCode}</div>
        <div style={{ fontSize: "0.85rem", color: COLORS.muted, marginBottom: "0.5rem" }}>{room?.name || 'Unnamed Room'}</div>
        <div style={{ fontSize: "0.8rem", color: COLORS.muted, marginBottom: "2rem", background: "#0f0f1a", borderRadius: "0.5rem", padding: "0.5rem 0.75rem", display: "inline-block" }}>
          Share this code with your friends
        </div>
        <div style={{ background: "#0f0f1a", borderRadius: "1rem", padding: "1rem", marginBottom: "2rem" }}>
          <div style={{ fontSize: "0.8rem", color: COLORS.muted, marginBottom: "0.75rem", textAlign: "left" }}>PLAYERS ({players.length})</div>
          {players.map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem 0", borderBottom: i < players.length - 1 ? `1px solid ${COLORS.cardBorder}` : "none" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: i === 0 ? COLORS.gold : "#2a2a4a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", fontWeight: 700, color: i === 0 ? "#000" : COLORS.muted }}>
                {p.name[0].toUpperCase()}
              </div>
              <span style={{ color: COLORS.text }}>{p.name} {p.name === playerName ? "(you)" : ""}</span>
              {i === 0 && <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: COLORS.gold, fontWeight: 600 }}>HOST</span>}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          {isHost ? (
            <button onClick={onStart} style={{ flex: 1, padding: "0.75rem", background: `linear-gradient(135deg, ${COLORS.accent}, #9333ea)`, color: "#fff", border: "none", borderRadius: "0.75rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: "1rem" }}>Start Game →</button>
          ) : (
            <div style={{ flex: 1, padding: "0.75rem", color: COLORS.muted, fontSize: "0.9rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
              <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: COLORS.accent, animation: "turnPulse 1.4s ease-in-out infinite" }}></span>
              Waiting for host…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Bingo card ───────────────────────────────────────────────────────────────
function BingoCard({ grid, marked, onMark, disabled, won, completedLines }) {
  const size = grid.length;
  const [justMarked, setJustMarked] = useState(null);

  const handleClick = (key) => {
    if (disabled) return;
    setJustMarked(key);
    onMark(key);
    setTimeout(() => setJustMarked(null), 400);
  };

  return (
    <div style={{ display: "inline-block" }}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${size}, 1fr)`, gap: "4px", marginBottom: "4px" }}>
        {Array.from({ length: size }, (_, i) => (`${i + 1}`)).map(label => (
          <div key={label} style={{ width: "60px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.4rem", letterSpacing: "0.1em", color: won ? COLORS.gold : COLORS.accentLight }}>{label}</div>
        ))}
      </div>
      {grid.map((row, r) => (
        <div key={r} style={{ display: "grid", gridTemplateColumns: `repeat(${size}, 1fr)`, gap: "4px", marginBottom: "4px" }}>
          {row.map((cell, c) => {
            const key = `${r}-${c}`;
            const isFree = cell === "FREE";
            const isMarked = marked.has(key) || isFree;
            const isCompletedRow = completedLines.completedRows.includes(r);
            const isCompletedCol = completedLines.completedCols.includes(c);
            const isCompletedMainDiag = completedLines.completedDiagonals.includes('main') && r === c;
            const isCompletedAntiDiag = completedLines.completedDiagonals.includes('anti') && r === size - 1 - c;
            const isWinningLine = isCompletedRow || isCompletedCol || isCompletedMainDiag || isCompletedAntiDiag;
            const cellClass = [
              "bingo-cell",
              justMarked === key ? "cell-marked" : "",
              isWinningLine && isMarked ? "cell-winning" : "",
              isFree ? "cell-free" : "",
            ].filter(Boolean).join(" ");
            return (
              <button key={c}
                className={cellClass}
                onClick={() => !disabled && !isFree && handleClick(key)}
                style={{
                  width: "60px", height: "60px",
                  border: isMarked ? `2px solid ${won ? COLORS.gold : isWinningLine ? COLORS.gold : COLORS.marked}` : `1px solid ${COLORS.cardBorder}`,
                  borderRadius: "0.5rem",
                  background: isFree ? `linear-gradient(135deg, ${COLORS.gold}33, ${COLORS.gold}11)` : isMarked ? (isWinningLine ? `${COLORS.gold}22` : `${COLORS.marked}22`) : "#0f0f1a",
                  color: isFree ? COLORS.gold : isMarked ? (isWinningLine ? COLORS.gold : COLORS.marked) : COLORS.text,
                  fontWeight: isMarked ? 700 : 400,
                  fontSize: isFree ? "0.7rem" : "1.1rem",
                  cursor: disabled || isFree ? "default" : "pointer",
                  fontFamily: "'Space Grotesk', sans-serif",
                }}>
                {isFree ? "⭐" : cell}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Confetti ────────────────────────────────────────────────────────────────
const CONFETTI_COLORS = ["#f59e0b", "#7c3aed", "#10b981", "#ef4444", "#a78bfa", "#fbbf24", "#34d399"];

function Confetti() {
  const pieces = useMemo(() => Array.from({ length: 80 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    delay: `${Math.random() * 2}s`,
    duration: `${2 + Math.random() * 2}s`,
    size: `${8 + Math.random() * 8}px`,
    rotate: Math.random() > 0.5 ? "skewX(15deg)" : "skewY(15deg)",
  })), []);
  return (
    <div className="confetti-container">
      {pieces.map(p => (
        <div key={p.id} className="confetti-piece" style={{
          left: p.left, backgroundColor: p.color,
          animationDelay: p.delay, animationDuration: p.duration,
          width: p.size, height: p.size, transform: p.rotate,
        }} />
      ))}
    </div>
  );
}

// ── Lines progress bar ───────────────────────────────────────────────────────
function LinesProgress({ completed, total = 5 }) {
  const pct = Math.min((completed / total) * 100, 100);
  return (
    <div style={{ marginTop: "0.75rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem" }}>
        <span style={{ color: COLORS.muted, fontSize: "0.75rem" }}>LINES COMPLETED</span>
        <span style={{ color: completed >= total ? COLORS.gold : COLORS.accentLight, fontSize: "0.75rem", fontWeight: 700 }}>{completed}/{total}</span>
      </div>
      <div style={{ height: "6px", background: "#0f0f1a", borderRadius: "99px", overflow: "hidden" }}>
        <div className="progress-bar-fill" style={{
          height: "100%", borderRadius: "99px", width: `${pct}%`,
          background: completed >= total
            ? `linear-gradient(90deg, ${COLORS.gold}, #fbbf24)`
            : `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.accentLight})`,
          boxShadow: completed >= total ? `0 0 8px ${COLORS.gold}88` : `0 0 8px ${COLORS.accent}88`,
          transition: "width 0.6s ease",
        }} />
      </div>
    </div>
  );
}

// ── Called ball ──────────────────────────────────────────────────────────────
function CalledBall({ num }) {
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "48px", height: "48px", borderRadius: "50%", background: `${COLORS.accent}33`, border: `1.5px solid ${COLORS.accent}`, fontSize: "0.75rem", fontWeight: 700, color: COLORS.accentLight, lineHeight: 1, gap: "1px" }}>
      <span style={{ fontSize: "0.9rem" }}>{num}</span>
    </div>
  );
}

// ── Game screen ──────────────────────────────────────────────────────────────
function GameScreen({ room, playerName, onBingo, onLeave, onCallSpecificNumber, onSendChat }) {
  const me = room.players.find(p => p.name === playerName);
  const grid = me?.card || [];
  const size = grid.length || room?.size || 5;
  const midPoint = size % 2 === 1 ? Math.floor(size / 2) : null;
  const initialMarked = new Set();
  if (midPoint !== null && grid[midPoint]?.[midPoint] === "FREE") initialMarked.add(`${midPoint}-${midPoint}`);
  const [marked, setMarked] = useState(initialMarked);
  const [chatInput, setChatInput] = useState("");
  const [numberInput, setNumberInput] = useState("");
  const won = me?.won;
  const winner = room.winner;
  const isHost = room.players[0]?.name === playerName;
  const calledNums = room.called || [];
  const lineCounts = grid.length ? getCompletedLines(marked, grid) : { diagonals: 0, rows: 0, cols: 0, completedRows: [], completedCols: [], completedDiagonals: [] };
  const completedLines = lineCounts.diagonals + lineCounts.rows + lineCounts.cols;
  const currentPlayerIndex = room.players.findIndex(p => p.name === playerName);
  const isMyTurn = room.currentTurn === currentPlayerIndex;

  const handleMark = useCallback((key) => {
    const [r, c] = key.split("-").map(Number);
    const cell = grid[r]?.[c];
    if (!calledNums.includes(cell) && cell !== "FREE") return;
    setMarked(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      if (checkWin(next, grid)) setTimeout(() => onBingo(), 50);
      return next;
    });
  }, [grid, calledNums, onBingo]);

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, fontFamily: "'Space Grotesk', sans-serif", padding: "1rem" }}>
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Bebas+Neue&display=swap" rel="stylesheet" />
      {winner && <Confetti />}
      {winner && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "#000000cc", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div className="win-modal" style={{ background: COLORS.card, border: `2px solid ${COLORS.gold}`, borderRadius: "1.5rem", padding: "3rem", textAlign: "center", maxWidth: "360px", boxShadow: `0 0 60px ${COLORS.gold}44` }}>
            <div style={{ fontSize: "4rem", marginBottom: "0.5rem" }}>🎉</div>
            <div className="bingo-title" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "3rem", letterSpacing: "0.2em", color: COLORS.gold }}>{winner === playerName ? "YOU WIN!" : `${winner} WINS!`}</div>
            <div style={{ color: COLORS.muted, marginBottom: "2rem", letterSpacing: "0.3em", fontSize: "0.9rem" }}>B I N G O !</div>
            <div style={{ display: "flex", gap: "1rem" }}>
              <button onClick={onLeave} style={{ flex: 1, padding: "0.75rem", background: "transparent", border: `1px solid ${COLORS.cardBorder}`, borderRadius: "0.75rem", color: COLORS.muted, cursor: "pointer", fontFamily: "inherit" }}>Leave Room</button>
              {isHost && <button onClick={() => onLeave(true)} style={{ flex: 1, padding: "0.75rem", background: `linear-gradient(135deg, ${COLORS.accent}, #9333ea)`, color: "#fff", border: "none", borderRadius: "0.75rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: "1rem" }}>New Game</button>}
            </div>
          </div>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", letterSpacing: "0.2em", color: COLORS.accentLight }}>BINGO</div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span style={{ color: COLORS.muted, fontSize: "0.8rem" }}>Room: </span>
          <span style={{ color: COLORS.accentLight, fontWeight: 700, letterSpacing: "0.1em" }}>{room.name || room.code}</span>
        </div>
        <button onClick={onLeave} style={{ padding: "0.4rem 0.9rem", background: "transparent", border: `1px solid ${COLORS.cardBorder}`, borderRadius: "0.6rem", color: COLORS.muted, cursor: "pointer", fontFamily: "inherit", fontSize: "0.8rem" }}>Leave</button>
      </div>
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
        <div style={{ flex: "1 1 240px", maxWidth: "280px" }}>
          {calledNums.length > 0 && (
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}`, borderRadius: "1rem", padding: "1.25rem", marginBottom: "1rem", textAlign: "center" }}>
              <div style={{ color: COLORS.muted, fontSize: "0.75rem", marginBottom: "0.5rem" }}>LAST CALLED</div>
              <div key={calledNums[calledNums.length - 1]} className="last-call-pop" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "4rem", lineHeight: 1, color: COLORS.accentLight, display: "inline-block" }}>{calledNums[calledNums.length - 1]}</div>
              <div style={{ color: COLORS.muted, fontSize: "0.8rem", marginTop: "0.25rem" }}>Number {calledNums.length} of {size * size}</div>
            </div>
          )}
          {!winner && <div style={{ color: COLORS.muted, fontSize: "0.85rem", textAlign: "center", marginBottom: "1rem" }}>Type a number using the manual call input below to share with all players</div>}
          <div style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}`, borderRadius: "1rem", padding: "1rem", marginBottom: "1rem" }}>
            <div style={{ color: COLORS.muted, fontSize: "0.75rem", marginBottom: "0.75rem" }}>PLAYERS</div>
            {room.players.map((p, i) => {
              const playerLineCounts = p.card ? getCompletedLines(new Set(p.card.flatMap((row, r) => row.map((cell, c) => cell === "FREE" || room.called?.includes(cell) ? `${r}-${c}` : null).filter(Boolean))), p.card) : { diagonals: 0, rows: 0, cols: 0 };
              const playerCompletedLines = playerLineCounts.diagonals + playerLineCounts.rows + playerLineCounts.cols;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 0", fontSize: "0.9rem" }}>
                  <div className={i === room.currentTurn && !p.won ? "turn-pulse" : ""} style={{ width: "8px", height: "8px", borderRadius: "50%", background: p.won ? COLORS.gold : i === room.currentTurn ? COLORS.accent : COLORS.green }}></div>
                  <span style={{ color: p.name === playerName ? COLORS.accentLight : COLORS.text }}>{p.name} {p.name === playerName ? "(you)" : ""}</span>
                  <span style={{ marginLeft: "auto", color: COLORS.muted, fontSize: "0.8rem" }}>{playerCompletedLines}/5 lines</span>
                  {i === 0 && <span style={{ fontSize: "0.7rem", color: COLORS.gold }}>HOST</span>}
                  {p.won && <span style={{ fontSize: "0.7rem", color: COLORS.gold }}>BINGO!</span>}
                </div>
              );
            })}
          </div>
          <div style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}`, borderRadius: "1rem", padding: "1rem", marginBottom: "1rem" }}>
            <LinesProgress completed={completedLines} />
            <div style={{ display: "flex", justifyContent: "space-between", color: COLORS.muted, fontSize: "0.78rem", marginTop: "0.5rem", marginBottom: "0.75rem" }}>
              <span>Diag: {lineCounts.diagonals}</span>
              <span>Rows: {lineCounts.rows}</span>
              <span>Cols: {lineCounts.cols}</span>
            </div>
            <div style={{ color: COLORS.muted, fontSize: "0.75rem", marginBottom: "0.75rem" }}>CALLED ({calledNums.length})</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
              {calledNums.map(n => <CalledBall key={n} num={n} />)}
              {calledNums.length === 0 && <span style={{ color: COLORS.muted, fontSize: "0.85rem" }}>None yet</span>}
            </div>
          </div>

          {!winner && <div style={{ color: COLORS.muted, fontSize: "0.85rem", textAlign: "center", marginBottom: "1rem" }}>Current Turn: <span style={{ color: isMyTurn ? COLORS.accentLight : COLORS.text, fontWeight: isMyTurn ? 700 : 400 }}>{room.players[room.currentTurn]?.name || 'Unknown'}</span></div>}
          <div style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}`, borderRadius: "1rem", padding: "1rem", marginBottom: "1rem" }}>
            <div style={{ color: COLORS.muted, fontSize: "0.75rem", marginBottom: "0.5rem" }}>CALL NUMBER (all players view)</div>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <input value={numberInput} onChange={e => setNumberInput(e.target.value)} placeholder="Type num" disabled={!isMyTurn || !!winner} style={{ flex: 1, background: COLORS.bg, border: `1px solid ${COLORS.cardBorder}`, borderRadius: "0.5rem", padding: "0.5rem", color: COLORS.text, fontFamily: "inherit", opacity: isMyTurn && !winner ? 1 : 0.5 }} />
              <button onClick={() => { onCallSpecificNumber(numberInput); setNumberInput(""); }} disabled={!isMyTurn || !!winner} style={{ padding: "0.5rem .8rem", background: isMyTurn && !winner ? COLORS.accent : COLORS.muted, border: "none", borderRadius: "0.5rem", color: "#fff", cursor: isMyTurn && !winner ? "pointer" : "not-allowed" }}>Call</button>
            </div>
            <div style={{ color: COLORS.muted, fontSize: "0.75rem" }}>Only the current player can call a number.</div>
          </div>

          <div style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}`, borderRadius: "1rem", padding: "1rem", maxHeight: "180px", overflowY: "auto" }}>
            <div style={{ color: COLORS.muted, fontSize: "0.75rem", marginBottom: "0.75rem" }}>CHAT</div>
            {(room.chat || []).map((m, i) => (
              <div key={i} style={{ marginBottom: "0.45rem" }}>
                <span style={{ fontWeight: 700, color: m.name === playerName ? COLORS.accentLight : COLORS.text }}>{m.name}: </span>
                <span style={{ color: COLORS.text }}>{m.text}</span>
              </div>
            ))}
            {!room.chat?.length && <div style={{ color: COLORS.muted, fontSize: "0.8rem" }}>No messages yet</div>}
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && chatInput.trim()) { onSendChat(chatInput); setChatInput(""); } }}
                placeholder="Type message..." style={{ flex: 1, background: COLORS.bg, border: `1px solid ${COLORS.cardBorder}`, borderRadius: "0.5rem", padding: "0.5rem", color: COLORS.text, fontFamily: "inherit" }} />
              <button onClick={() => { onSendChat(chatInput); setChatInput(""); }} style={{ padding: "0.5rem .8rem", background: COLORS.accent, border: "none", borderRadius: "0.5rem", color: "#fff", cursor: "pointer" }}>Send</button>
            </div>
          </div>
        </div>
        <div style={{ flex: "1 1 340px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ background: COLORS.card, border: `1px solid ${won ? COLORS.gold : COLORS.cardBorder}`, borderRadius: "1rem", padding: "1.25rem" }}>
            <div style={{ color: COLORS.muted, fontSize: "0.75rem", textAlign: "center", marginBottom: "0.75rem" }}>{playerName}'s CARD</div>
            <BingoCard grid={grid} marked={marked} onMark={handleMark} disabled={!!winner} won={won} completedLines={lineCounts} />
            {!winner && <div style={{ marginTop: "1rem", color: COLORS.muted, fontSize: "0.8rem", textAlign: "center" }}>Click daubed numbers to mark · 5 in a row wins!</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── App root ────────────────────────────────────────────────────────────────
export default function BingoApp() {
  const [screen, setScreen] = useState("lobby");
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [room, setRoom] = useState(null);

  // Real-time sync via Firebase onValue (replaces localStorage polling)
  useEffect(() => {
    if ((screen === "waiting" || screen === "game") && roomCode) {
      const roomRef = ref(db, `rooms/${roomCode}`);
      const unsub = onValue(roomRef, (snap) => {
        const r = snap.val();
        if (r) {
          setRoom(r);
          if (r.started && screen === "waiting") setScreen("game");
        }
      });
      return unsub;
    }
  }, [screen, roomCode]);

  const handleCreate = async (name, code, size, roomName) => {
    const newRoom = {
      code, name: roomName, size,
      players: [{ name, card: generateCard(size), won: false }],
      called: [], chat: [], started: false, winner: null, currentTurn: 0,
    };
    try {
      await saveRoom(code, newRoom);
      console.log("[App] handleCreate success, going to waiting");
      setPlayerName(name); setRoomCode(code); setRoom(newRoom); setScreen("waiting");
    } catch (e) {
      console.error("[App] handleCreate FAILED:", e.message, e.code);
      alert("Failed to create room: " + e.message);
    }
  };

  const handleJoin = async (name, code) => {
    const r = await loadRoom(code);
    if (!r) return;
    const updated = {
      ...r,
      players: [
        ...r.players.filter(p => p.name !== name),
        { name, card: generateCard(r.size || 5), won: false },
      ],
    };
    await saveRoom(code, updated);
    setPlayerName(name); setRoomCode(code); setRoom(updated);
    setScreen(r.started ? "game" : "waiting");
  };

  const handleStart = async () => {
    const r = await loadRoom(roomCode);
    const updated = { ...r, started: true };
    await saveRoom(roomCode, updated); setRoom(updated); setScreen("game");
  };

  const handleCallSpecificNumber = async (number) => {
    const r = await loadRoom(roomCode);
    if (!r) return;
    const playerIndex = r.players.findIndex(p => p.name === playerName);
    if (r.currentTurn !== playerIndex) return;
    const size = r.size || 5;
    const num = Number(number);
    if (!Number.isInteger(num) || num < 1 || num > size * size || r.called.includes(num)) return;
    const updated = { ...r, called: [...r.called, num], currentTurn: (r.currentTurn + 1) % r.players.length };
    await saveRoom(roomCode, updated); setRoom(updated);
  };

  const handleSendChat = async (text) => {
    const r = await loadRoom(roomCode);
    if (!r || !text.trim()) return;
    const message = { name: playerName, text: text.trim(), ts: Date.now() };
    const updated = { ...r, chat: [...(r.chat || []), message] };
    await saveRoom(roomCode, updated); setRoom(updated);
  };

  const handleLeave = async (reset = false) => {
    if (reset) {
      const r = await loadRoom(roomCode);
      if (r) {
        const updated = {
          ...r,
          players: r.players.map(p => ({ ...p, card: generateCard(r.size), won: false })),
          called: [], chat: [], started: false, winner: null, currentTurn: 0,
        };
        await saveRoom(roomCode, updated);
        setRoom(updated); setScreen("waiting");
        return;
      }
    }
    setScreen("lobby"); setRoom(null); setRoomCode(""); setPlayerName("");
  };

  const handleBingo = async () => {
    const r = await loadRoom(roomCode);
    if (!r || r.winner) return;
    const updated = { ...r, winner: playerName, players: r.players.map(p => p.name === playerName ? { ...p, won: true } : p) };
    await saveRoom(roomCode, updated); setRoom(updated);
  };

  if (screen === "lobby") return <Lobby onCreate={handleCreate} onJoin={handleJoin} />;
  if (screen === "waiting") return <Waiting room={room} roomCode={roomCode} players={room?.players || []} isHost={room?.players?.[0]?.name === playerName} playerName={playerName} onStart={handleStart} />;
  if (screen === "game") return <GameScreen room={room || {}} playerName={playerName} onBingo={handleBingo} onLeave={handleLeave} onCallSpecificNumber={handleCallSpecificNumber} onSendChat={handleSendChat} />;
}
