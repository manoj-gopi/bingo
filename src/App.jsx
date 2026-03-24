import { useState, useEffect, useCallback, useRef } from "react";

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
  const isMarked = (r,c) => marked.has(`${r}-${c}`) || grid[r][c] === "FREE";
  let rows = 0, cols = 0, diagonals = 0;

  for (let r = 0; r < 5; r++) {
    if ([0,1,2,3,4].every(c => isMarked(r,c))) rows++;
  }
  for (let c = 0; c < 5; c++) {
    if ([0,1,2,3,4].every(r => isMarked(r,c))) cols++;
  }
  if ([0,1,2,3,4].every(i => isMarked(i,i))) diagonals++;
  if ([0,1,2,3,4].every(i => isMarked(i,4-i))) diagonals++;

  return { diagonals, rows, cols };
}

function checkWin(marked, grid) {
  const { diagonals, rows, cols } = getCompletedLines(marked, grid);
  return diagonals + rows + cols >= 5;
}

function roomKey(code) { return `bingo_room_${code}`; }
function saveRoom(code, data) { localStorage.setItem(roomKey(code), JSON.stringify({...data, _ts: Date.now()})); }
function loadRoom(code) {
  try { return JSON.parse(localStorage.getItem(roomKey(code))); } catch { return null; }
}

function Lobby({ onJoin, onCreate }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [tab, setTab] = useState("create");
  const [err, setErr] = useState("");
  const [size, setSize] = useState(5);

  const handleCreate = () => {
    if (!name.trim()) return setErr("Enter your name");
    const newCode = Math.random().toString(36).substring(2,7).toUpperCase();
    onCreate(name.trim(), newCode, size);
  };
  const handleJoin = () => {
    if (!name.trim()) return setErr("Enter your name");
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) return setErr("Enter room code");
    const room = loadRoom(normalizedCode);
    if (!room) return setErr("Room not found");
    if (room.started) return setErr("Game already in progress");
    if (room.players?.some(p => p.name === name.trim())) return setErr("Name already exists in room");
    onJoin(name.trim(), normalizedCode);
  };

  const inputStyle = {
    width:"100%", background:"#0f0f1a", border:`1px solid ${COLORS.cardBorder}`,
    borderRadius:"0.6rem", padding:"0.75rem 1rem", color:COLORS.text,
    fontSize:"1rem", fontFamily:"inherit", outline:"none", boxSizing:"border-box"
  };

  return (
    <div style={{minHeight:"100vh", background:COLORS.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:"'Space Grotesk', sans-serif", padding:"2rem"}}>
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Bebas+Neue&display=swap" rel="stylesheet"/>
      <div style={{textAlign:"center", marginBottom:"2.5rem"}}>
        <div style={{fontSize:"5rem", fontFamily:"'Bebas Neue', sans-serif", letterSpacing:"0.2em", color:COLORS.accentLight, lineHeight:1}}>BINGO</div>
        <div style={{color:COLORS.muted, fontSize:"1rem", marginTop:"0.5rem"}}>Multiplayer · Room-Based</div>
      </div>
      <div style={{background:COLORS.card, border:`1px solid ${COLORS.cardBorder}`, borderRadius:"1.25rem", padding:"2rem", width:"100%", maxWidth:"420px"}}>
        <div style={{display:"flex", background:"#0f0f1a", borderRadius:"0.75rem", padding:"4px", marginBottom:"1.75rem", gap:"4px"}}>
          {["create","join"].map(t => (
            <button key={t} onClick={()=>{setTab(t);setErr("");}} style={{flex:1, padding:"0.6rem", border:"none", borderRadius:"0.6rem", cursor:"pointer", fontWeight:600, fontSize:"0.9rem", fontFamily:"inherit", transition:"all 0.2s", background: tab===t ? COLORS.accent : "transparent", color: tab===t ? "#fff" : COLORS.muted}}>
              {t === "create" ? "🏠 Create Room" : "🚪 Join Room"}
            </button>
          ))}
        </div>
        <div style={{display:"flex", flexDirection:"column", gap:"1rem"}}>
          <div>
            <label style={{color:COLORS.muted, fontSize:"0.8rem", display:"block", marginBottom:"0.4rem"}}>YOUR NAME</label>
            <input value={name} onChange={e=>{setName(e.target.value);setErr("");}} placeholder="Enter your name..." maxLength={20} style={inputStyle}/>
          </div>
          <div>
            <label style={{color:COLORS.muted, fontSize:"0.8rem", display:"block", marginBottom:"0.4rem"}}>BOARD SIZE</label>
            <select value={size} onChange={e=>{setSize(Number(e.target.value));setErr("");}} style={{...inputStyle, padding:"0.7rem 1rem", fontSize:"1rem"}}>
              {[5,6,7,8,9,10].map(n => <option key={n} value={n}>{n} × {n} (1–{n*n})</option>)}
            </select>
          </div>
          {tab === "join" && (
            <div>
              <label style={{color:COLORS.muted, fontSize:"0.8rem", display:"block", marginBottom:"0.4rem"}}>ROOM CODE</label>
              <input value={code} onChange={e=>{setCode(e.target.value.toUpperCase());setErr("");}} placeholder="e.g. XKCD9" maxLength={6}
                style={{...inputStyle, color:COLORS.accentLight, fontSize:"1.25rem", fontFamily:"'Bebas Neue', monospace", letterSpacing:"0.2em"}}/>
            </div>
          )}
          {err && <div style={{color:COLORS.red, fontSize:"0.85rem", background:"#ef444420", padding:"0.6rem 0.9rem", borderRadius:"0.5rem"}}>{err}</div>}
          <button onClick={tab==="create" ? handleCreate : handleJoin}
            style={{marginTop:"0.5rem", padding:"0.9rem", background:`linear-gradient(135deg, ${COLORS.accent}, #9333ea)`, color:"#fff", border:"none", borderRadius:"0.75rem", fontWeight:700, fontSize:"1.05rem", cursor:"pointer", fontFamily:"inherit"}}>
            {tab === "create" ? "Create & Enter Room →" : "Join Room →"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Waiting({ roomCode, players, isHost, onStart, onRefresh, playerName }) {
  return (
    <div style={{minHeight:"100vh", background:COLORS.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:"'Space Grotesk', sans-serif", padding:"2rem"}}>
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Bebas+Neue&display=swap" rel="stylesheet"/>
      <div style={{background:COLORS.card, border:`1px solid ${COLORS.cardBorder}`, borderRadius:"1.25rem", padding:"2.5rem", width:"100%", maxWidth:"460px", textAlign:"center"}}>
        <div style={{fontSize:"0.9rem", color:COLORS.muted, marginBottom:"0.5rem"}}>ROOM CODE</div>
        <div style={{fontSize:"3.5rem", fontFamily:"'Bebas Neue', sans-serif", letterSpacing:"0.3em", color:COLORS.accentLight, marginBottom:"0.25rem"}}>{roomCode}</div>
        <div style={{fontSize:"0.8rem", color:COLORS.muted, marginBottom:"2rem"}}>Share this code with friends</div>
        <div style={{background:"#0f0f1a", borderRadius:"1rem", padding:"1rem", marginBottom:"2rem"}}>
          <div style={{fontSize:"0.8rem", color:COLORS.muted, marginBottom:"0.75rem", textAlign:"left"}}>PLAYERS ({players.length})</div>
          {players.map((p,i) => (
            <div key={i} style={{display:"flex", alignItems:"center", gap:"0.75rem", padding:"0.5rem 0", borderBottom: i<players.length-1?`1px solid ${COLORS.cardBorder}`:"none"}}>
              <div style={{width:"32px", height:"32px", borderRadius:"50%", background: i===0?COLORS.gold:"#2a2a4a", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.85rem", fontWeight:700, color:i===0?"#000":COLORS.muted}}>
                {p.name[0].toUpperCase()}
              </div>
              <span style={{color:COLORS.text}}>{p.name} {p.name===playerName?"(you)":""}</span>
              {i===0 && <span style={{marginLeft:"auto", fontSize:"0.75rem", color:COLORS.gold, fontWeight:600}}>HOST</span>}
            </div>
          ))}
        </div>
        <div style={{display:"flex", gap:"0.75rem"}}>
          <button onClick={onRefresh} style={{flex:1, padding:"0.75rem", background:"transparent", border:`1px solid ${COLORS.cardBorder}`, borderRadius:"0.75rem", color:COLORS.muted, cursor:"pointer", fontFamily:"inherit", fontWeight:600}}>↻ Refresh</button>
          {isHost ? (
            <button onClick={onStart} style={{flex:2, padding:"0.75rem", background:`linear-gradient(135deg, ${COLORS.accent}, #9333ea)`, color:"#fff", border:"none", borderRadius:"0.75rem", fontWeight:700, cursor:"pointer", fontFamily:"inherit", fontSize:"1rem"}}>Start Game →</button>
          ) : (
            <div style={{flex:2, padding:"0.75rem", color:COLORS.muted, fontSize:"0.9rem", display:"flex", alignItems:"center", justifyContent:"center"}}>Waiting for host…</div>
          )}
        </div>
      </div>
    </div>
  );
}

function BingoCard({ grid, marked, onMark, disabled, won }) {
  const size = grid.length;
  return (
    <div style={{display:"inline-block"}}>
      <div style={{display:"grid", gridTemplateColumns:`repeat(${size}, 1fr)`, gap:"4px", marginBottom:"4px"}}>
        {Array.from({ length: size }, (_, i) => (`${i + 1}`)).map(label => (
          <div key={label} style={{width:"60px", height:"32px", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue', sans-serif", fontSize:"1.4rem", letterSpacing:"0.1em", color: won ? COLORS.gold : COLORS.accentLight}}>{label}</div>
        ))}
      </div>
      {grid.map((row, r) => (
        <div key={r} style={{display:"grid", gridTemplateColumns:`repeat(${size}, 1fr)`, gap:"4px", marginBottom:"4px"}}>
          {row.map((cell, c) => {
            const key = `${r}-${c}`;
            const isFree = cell === "FREE";
            const isMarked = marked.has(key) || isFree;
            return (
              <button key={c} onClick={() => !disabled && !isFree && onMark(key)}
                style={{width:"60px", height:"60px", border: isMarked ? `2px solid ${won ? COLORS.gold : COLORS.marked}` : `1px solid ${COLORS.cardBorder}`, borderRadius:"0.5rem", background: isFree ? `${COLORS.gold}22` : isMarked ? `${COLORS.marked}22` : "#0f0f1a", color: isFree ? COLORS.gold : isMarked ? COLORS.marked : COLORS.text, fontWeight: isMarked ? 700 : 400, fontSize: isFree ? "0.65rem" : "1.1rem", cursor: disabled||isFree?"default":"pointer", fontFamily:"'Space Grotesk', sans-serif", transition:"all 0.15s", transform: isMarked ? "scale(1.05)" : "scale(1)"}}>
                {isFree ? "FREE" : cell}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function CalledBall({ num }) {
  return (
    <div style={{display:"inline-flex", flexDirection:"column", alignItems:"center", justifyContent:"center", width:"48px", height:"48px", borderRadius:"50%", background:`${COLORS.accent}33`, border:`1.5px solid ${COLORS.accent}`, fontSize:"0.75rem", fontWeight:700, color:COLORS.accentLight, lineHeight:1, gap:"1px"}}>
      <span style={{fontSize:"0.9rem"}}>{num}</span>
    </div>
  );
}

function GameScreen({ room, playerName, onBingo, onLeave, onCallNumber, onCallSpecificNumber, onSendChat }) {
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
  const lineCounts = grid.length ? getCompletedLines(marked, grid) : { diagonals: 0, rows: 0, cols: 0 };
  const completedLines = lineCounts.diagonals + lineCounts.rows + lineCounts.cols;

  const handleMark = useCallback((key) => {
    const [r,c] = key.split("-").map(Number);
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
    <div style={{minHeight:"100vh", background:COLORS.bg, fontFamily:"'Space Grotesk', sans-serif", padding:"1rem"}}>
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Bebas+Neue&display=swap" rel="stylesheet"/>
      {winner && (
        <div style={{position:"fixed", top:0, left:0, right:0, bottom:0, background:"#000000cc", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100}}>
          <div style={{background:COLORS.card, border:`2px solid ${COLORS.gold}`, borderRadius:"1.5rem", padding:"3rem", textAlign:"center", maxWidth:"360px"}}>
            <div style={{fontSize:"4rem"}}>🎉</div>
            <div style={{fontFamily:"'Bebas Neue', sans-serif", fontSize:"3rem", letterSpacing:"0.2em", color:COLORS.gold}}>{winner === playerName ? "YOU WIN!" : `${winner} WINS!`}</div>
            <div style={{color:COLORS.muted, marginBottom:"2rem"}}>BINGO!</div>
            <button onClick={onLeave} style={{padding:"0.75rem 2rem", background:`linear-gradient(135deg, ${COLORS.accent}, #9333ea)`, color:"#fff", border:"none", borderRadius:"0.75rem", fontWeight:700, cursor:"pointer", fontFamily:"inherit", fontSize:"1rem"}}>Back to Lobby</button>
          </div>
        </div>
      )}
      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1rem"}}>
        <div style={{fontFamily:"'Bebas Neue', sans-serif", fontSize:"1.8rem", letterSpacing:"0.2em", color:COLORS.accentLight}}>BINGO</div>
        <div style={{display:"flex", gap:"0.5rem", alignItems:"center"}}>
          <span style={{color:COLORS.muted, fontSize:"0.8rem"}}>Room: </span>
          <span style={{color:COLORS.accentLight, fontWeight:700, letterSpacing:"0.1em"}}>{room.code}</span>
        </div>
        <button onClick={onLeave} style={{padding:"0.4rem 0.9rem", background:"transparent", border:`1px solid ${COLORS.cardBorder}`, borderRadius:"0.6rem", color:COLORS.muted, cursor:"pointer", fontFamily:"inherit", fontSize:"0.8rem"}}>Leave</button>
      </div>
      <div style={{display:"flex", gap:"1rem", flexWrap:"wrap", justifyContent:"center"}}>
        <div style={{flex:"1 1 240px", maxWidth:"280px"}}>
          {calledNums.length > 0 && (
            <div style={{background:COLORS.card, border:`1px solid ${COLORS.cardBorder}`, borderRadius:"1rem", padding:"1.25rem", marginBottom:"1rem", textAlign:"center"}}>
              <div style={{color:COLORS.muted, fontSize:"0.75rem", marginBottom:"0.5rem"}}>LAST CALLED</div>
              <div style={{fontFamily:"'Bebas Neue', sans-serif", fontSize:"4rem", lineHeight:1, color:COLORS.accentLight}}>{calledNums[calledNums.length-1]}</div>
              <div style={{color:COLORS.muted, fontSize:"0.8rem", marginTop:"0.25rem"}}>Number {calledNums.length} of 75</div>
            </div>
          )}
          {isHost && !winner && (
            <button onClick={onCallNumber} style={{width:"100%", padding:"0.85rem", background:`linear-gradient(135deg, ${COLORS.accent}, #9333ea)`, color:"#fff", border:"none", borderRadius:"0.75rem", fontWeight:700, cursor:"pointer", fontFamily:"inherit", fontSize:"1rem", marginBottom:"1rem"}}>
              🎱 Call Next Number
            </button>
          )}
          {!isHost && !winner && <div style={{color:COLORS.muted, fontSize:"0.85rem", textAlign:"center", marginBottom:"1rem"}}>Waiting for host to call...</div>}
          <div style={{background:COLORS.card, border:`1px solid ${COLORS.cardBorder}`, borderRadius:"1rem", padding:"1rem", marginBottom:"1rem"}}>
            <div style={{color:COLORS.muted, fontSize:"0.75rem", marginBottom:"0.75rem"}}>PLAYERS</div>
            {room.players.map((p,i) => (
              <div key={i} style={{display:"flex", alignItems:"center", gap:"0.5rem", padding:"0.4rem 0", fontSize:"0.9rem"}}>
                <div style={{width:"8px", height:"8px", borderRadius:"50%", background: p.won ? COLORS.gold : COLORS.green}}></div>
                <span style={{color: p.name===playerName ? COLORS.accentLight : COLORS.text}}>{p.name} {p.name===playerName?"(you)":""}</span>
                {i===0 && <span style={{marginLeft:"auto", fontSize:"0.7rem", color:COLORS.gold}}>HOST</span>}
                {p.won && <span style={{marginLeft:"auto", fontSize:"0.7rem", color:COLORS.gold}}>BINGO!</span>}
              </div>
            ))}
          </div>
          <div style={{background:COLORS.card, border:`1px solid ${COLORS.cardBorder}`, borderRadius:"1rem", padding:"1rem", marginBottom:"1rem"}}>
            <div style={{color:COLORS.muted, fontSize:"0.75rem", marginBottom:"0.5rem"}}>LINES COMPLETED ({completedLines}/5)</div>
            <div style={{display:"flex", justifyContent:"space-between", color:COLORS.text, fontSize:"0.85rem", marginBottom:"0.75rem"}}>
              <span>Diagonals: {lineCounts.diagonals}</span>
              <span>Rows: {lineCounts.rows}</span>
              <span>Cols: {lineCounts.cols}</span>
            </div>
            <div style={{color:COLORS.muted, fontSize:"0.75rem", marginBottom:"0.75rem"}}>CALLED ({calledNums.length})</div>
            <div style={{display:"flex", flexWrap:"wrap", gap:"4px"}}>
              {calledNums.map(n => <CalledBall key={n} num={n}/>)}
              {calledNums.length === 0 && <span style={{color:COLORS.muted, fontSize:"0.85rem"}}>None yet</span>}
            </div>
          </div>

          <div style={{background:COLORS.card, border:`1px solid ${COLORS.cardBorder}`, borderRadius:"1rem", padding:"1rem", marginBottom:"1rem"}}>
            <div style={{color:COLORS.muted, fontSize:"0.75rem", marginBottom:"0.5rem"}}>CALL NUMBER (all players view)</div>
            <div style={{display:"flex", gap:"0.5rem", marginBottom:"0.75rem"}}>
              <input value={numberInput} onChange={e => setNumberInput(e.target.value)} placeholder="Type num" style={{flex:1, background:COLORS.bg, border:`1px solid ${COLORS.cardBorder}`, borderRadius:"0.5rem", padding:"0.5rem"}}/>
              <button onClick={() => { onCallSpecificNumber(numberInput); setNumberInput(""); }} style={{padding:"0.5rem .8rem", background:COLORS.accent, border:"none", borderRadius:"0.5rem", color:"#fff", cursor:"pointer"}}>Call</button>
            </div>
            <div style={{color:COLORS.muted, fontSize:"0.75rem"}}>Host may also use auto-call.</div>
          </div>

          <div style={{background:COLORS.card, border:`1px solid ${COLORS.cardBorder}`, borderRadius:"1rem", padding:"1rem", maxHeight:"180px", overflowY:"auto"}}>
            <div style={{color:COLORS.muted, fontSize:"0.75rem", marginBottom:"0.75rem"}}>CHAT</div>
            {(room.chat||[]).map((m, i) => (
              <div key={i} style={{marginBottom:"0.45rem"}}>
                <span style={{fontWeight:700, color:m.name === playerName ? COLORS.accentLight : COLORS.text}}>{m.name}: </span>
                <span style={{color:COLORS.text}}>{m.text}</span>
              </div>
            ))}
            {!room.chat?.length && <div style={{color:COLORS.muted, fontSize:"0.8rem"}}>No messages yet</div>}
            <div style={{display:"flex", gap:"0.5rem", marginTop:"0.75rem"}}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Type message..." style={{flex:1, background:COLORS.bg, border:`1px solid ${COLORS.cardBorder}`, borderRadius:"0.5rem", padding:"0.5rem"}}/>
              <button onClick={()=>{ onSendChat(chatInput); setChatInput(""); }} style={{padding:"0.5rem .8rem", background:COLORS.accent, border:"none", borderRadius:"0.5rem", color:"#fff", cursor:"pointer"}}>Send</button>
            </div>
          </div>
        </div>
        <div style={{flex:"1 1 340px", display:"flex", flexDirection:"column", alignItems:"center"}}>
          <div style={{background:COLORS.card, border:`1px solid ${won ? COLORS.gold : COLORS.cardBorder}`, borderRadius:"1rem", padding:"1.25rem"}}>
            <div style={{color:COLORS.muted, fontSize:"0.75rem", textAlign:"center", marginBottom:"0.75rem"}}>{playerName}'s CARD</div>
            <BingoCard grid={grid} marked={marked} onMark={handleMark} disabled={!!winner} won={won}/>
            {!winner && <div style={{marginTop:"1rem", color:COLORS.muted, fontSize:"0.8rem", textAlign:"center"}}>Click daubed numbers to mark • 5 in a row wins!</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BingoApp() {
  const [screen, setScreen] = useState("lobby");
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [room, setRoom] = useState(null);
  const pollRef = useRef(null);

  const syncRoom = useCallback((code) => {
    const r = loadRoom(code || roomCode);
    if (r) setRoom(r);
    return r;
  }, [roomCode]);

  useEffect(() => {
    if (screen === "waiting" || screen === "game") {
      pollRef.current = setInterval(() => {
        const r = syncRoom();
        if (r?.started && screen === "waiting") setScreen("game");
      }, 1000);
      return () => clearInterval(pollRef.current);
    }
  }, [screen, syncRoom]);

  const handleCreate = (name, code, size) => {
    const newRoom = {
      code,
      size,
      players: [{ name, card: generateCard(size), won: false }],
      called: [],
      chat: [],
      started: false,
      winner: null
    };
    saveRoom(code, newRoom);
    setPlayerName(name); setRoomCode(code); setRoom(newRoom); setScreen("waiting");
  };

  const handleJoin = (name, code) => {
    const normalizedCode = code.trim().toUpperCase();
    const r = loadRoom(normalizedCode);
    if (!r) return;
    const sanitizedName = name.trim();
    const updated = {
      ...r,
      players: [
        ...r.players.filter(p => p.name !== sanitizedName),
        { name: sanitizedName, card: generateCard(r.size || 5), won: false }
      ]
    };
    saveRoom(normalizedCode, updated);
    setPlayerName(sanitizedName);
    setRoomCode(normalizedCode);
    setRoom(updated);
    setScreen(r.started ? "game" : "waiting");
  };

  const handleStart = () => {
    const r = loadRoom(roomCode);
    const updated = { ...r, started: true };
    saveRoom(roomCode, updated); setRoom(updated); setScreen("game");
  };

  const handleCallNumber = () => {
    const r = loadRoom(roomCode);
    const size = r?.size || 5;
    const remaining = Array.from({length:size*size},(_,i)=>i+1).filter(n=>!r.called.includes(n));
    if (!remaining.length) return;
    const pick = remaining[Math.floor(Math.random()*remaining.length)];
    const updated = { ...r, called: [...r.called, pick] };
    saveRoom(roomCode, updated); setRoom(updated);
  };

  const handleCallSpecificNumber = (number) => {
    const r = loadRoom(roomCode);
    if (!r) return;
    const size = r.size || 5;
    const num = Number(number);
    if (!Number.isInteger(num) || num < 1 || num > size * size || r.called.includes(num)) return;
    const updated = { ...r, called: [...r.called, num] };
    saveRoom(roomCode, updated); setRoom(updated);
  };

  const handleSendChat = (text) => {
    const r = loadRoom(roomCode);
    if (!r || !text.trim()) return;
    const message = { name: playerName, text: text.trim(), ts: Date.now() };
    const updated = { ...r, chat: [...(r.chat||[]), message] };
    saveRoom(roomCode, updated); setRoom(updated);
  };

  const handleBingo = () => {
    const r = loadRoom(roomCode);
    if (r.winner) return;
    const updated = { ...r, winner: playerName, players: r.players.map(p => p.name===playerName?{...p,won:true}:p) };
    saveRoom(roomCode, updated); setRoom(updated);
  };

  const handleLeave = () => {
    clearInterval(pollRef.current);
    setScreen("lobby"); setRoom(null); setRoomCode(""); setPlayerName("");
  };

  if (screen === "lobby") return <Lobby onCreate={handleCreate} onJoin={handleJoin}/>;
  if (screen === "waiting") return <Waiting roomCode={roomCode} players={room?.players||[]} isHost={room?.players?.[0]?.name===playerName} playerName={playerName} onStart={handleStart} onRefresh={()=>syncRoom()}/>;
  if (screen === "game") return <GameScreen room={room||loadRoom(roomCode)} playerName={playerName} onBingo={handleBingo} onLeave={handleLeave} onCallNumber={handleCallNumber} onCallSpecificNumber={handleCallSpecificNumber} onSendChat={handleSendChat}/>;
}
