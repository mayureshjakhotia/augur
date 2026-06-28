import React, { useEffect, useState } from "react";

const api = (p, opts) => fetch(p, opts).then((r) => r.json());

// ---- The Augur's voice + atmosphere (no API keys, pure browser) ----
let _voice = null;
function pickVoice() {
  if (_voice) return _voice;
  const vs = window.speechSynthesis?.getVoices?.() || [];
  // Prefer a deep / British / male-ish English voice for oracular gravitas.
  _voice = vs.find((v) => /(daniel|arthur|oliver|google uk english male|rishi)/i.test(v.name))
    || vs.find((v) => /en-GB/i.test(v.lang))
    || vs.find((v) => /en/i.test(v.lang)) || vs[0] || null;
  return _voice;
}
if (typeof window !== "undefined" && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => { _voice = null; pickVoice(); };
}
function speak(text) {
  try {
    const s = window.speechSynthesis;
    if (!s || !text) return;
    s.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice(); if (v) u.voice = v;
    u.rate = 0.82; u.pitch = 0.7; u.volume = 1;
    s.speak(u);
  } catch {}
}
function stopSpeak() { try { window.speechSynthesis?.cancel(); } catch {} }

// A deep, ominous toll — the fates stir.
function toll() {
  try {
    _ac = _ac || new (window.AudioContext || window.webkitAudioContext)();
    if (_ac.state === "suspended") _ac.resume();
    const ac = _ac, now = ac.currentTime;
    [82.4, 110, 164.8].forEach((f, i) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = i === 2 ? "sine" : "triangle"; o.frequency.value = f;
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.22, now + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);
      o.connect(g); g.connect(ac.destination);
      o.start(now); o.stop(now + 2.3);
    });
  } catch {}
}

let _ac = null;
function chime() {
  try {
    _ac = _ac || new (window.AudioContext || window.webkitAudioContext)();
    if (_ac.state === "suspended") _ac.resume();
    const ac = _ac, now = ac.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C E G C — a shimmering arpeggio
    notes.forEach((f, i) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = "sine"; o.frequency.value = f;
      const t = now + i * 0.12;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.18, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
      o.connect(g); g.connect(ac.destination);
      o.start(t); o.stop(t + 1.2);
    });
  } catch {}
}

// Voice input — speak your question to the Augur (Web Speech API).
function startListening(onText, onEnd) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { onEnd?.("unsupported"); return null; }
  const r = new SR();
  r.lang = "en-US"; r.interimResults = false; r.maxAlternatives = 1;
  r.onresult = (e) => onText(e.results[0][0].transcript);
  r.onerror = () => onEnd?.("error");
  r.onend = () => onEnd?.();
  r.start();
  return r;
}

const EXAMPLES = [
  "Will Anthropic release a new Claude model before September 2026?",
  "Will the Fed cut rates at its next meeting?",
  "Will SpaceX reach Mars orbit before 2030?",
  "Will Bitcoin close above $150k this year?",
];

export default function App() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [prophecy, setProphecy] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [record, setRecord] = useState(null);
  const [muted, setMuted] = useState(false);
  const [streamVerse, setStreamVerse] = useState("");
  const [listening, setListening] = useState(false);

  useEffect(() => { refreshAll(); pickVoice(); }, []);
  // Live sync — the ledger & record stay current across every open client (InsForge).
  useEffect(() => {
    const t = setInterval(() => {
      api("/api/prophecies").then(setLedger).catch(() => {});
      api("/api/record").then(setRecord).catch(() => {});
    }, 6000);
    return () => clearInterval(t);
  }, []);
  function refreshAll() {
    api("/api/status").then(setStatus).catch(() => {});
    api("/api/prophecies").then(setLedger).catch(() => {});
    api("/api/record").then(setRecord).catch(() => {});
  }

  // Divine via SSE — the verse channels in token-by-token; falls back to POST.
  async function divine(q = question) {
    if (!q.trim()) return;
    stopSpeak();
    setError(""); setProphecy(null); setStreamVerse(""); setLoading(true); setQuestion(q);
    try { chime(); } catch {}
    try {
      await new Promise((resolve, reject) => {
        const es = new EventSource(`/api/prophecy/stream?question=${encodeURIComponent(q)}`);
        let verse = "", got = false;
        es.addEventListener("verse", (e) => { verse += JSON.parse(e.data).t; setStreamVerse(verse); });
        es.addEventListener("done", (e) => { got = true; es.close(); setProphecy(JSON.parse(e.data)); setLoading(false); resolve(); });
        es.addEventListener("error", () => { es.close(); got ? resolve() : reject(new Error("stream")); });
        es.onerror = () => { es.close(); got ? resolve() : reject(new Error("stream")); };
      });
    } catch {
      try {
        const data = await api("/api/prophecy", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: q }),
        });
        if (data.error) throw new Error(data.error);
        setProphecy(data);
      } catch (e) { setError(String(e.message || e)); }
      setLoading(false);
    }
  }

  function listen() {
    if (listening) return;
    setListening(true);
    startListening(
      (text) => { setQuestion(text); setListening(false); setTimeout(() => divine(text), 200); },
      (err) => { setListening(false); if (err) setError("Voice input unavailable — type your question instead."); }
    );
  }

  async function inscribe(userProbability) {
    if (!prophecy) return;
    await api("/api/prophecies", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: prophecy.question, analysis: prophecy.analysis, sources: prophecy.sources, userProbability }),
    });
    refreshAll();
  }

  return (
    <div className="min-h-screen max-w-5xl mx-auto px-5 py-10">
      <Header status={status} record={record} muted={muted} onToggleMute={() => { stopSpeak(); setMuted((m) => !m); }} />

      {/* Ask */}
      <div className="mt-8">
        <div className="bg-panel/70 backdrop-blur-sm border border-arcane/20 rounded-2xl p-5 shadow-[0_0_60px_-15px_rgba(168,85,247,0.5)]">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && divine()}
              placeholder={listening ? "speak your question, mortal…" : "Ask AUGUR about any uncertain future…"}
              className="flex-1 bg-void/80 border border-arcane/25 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-arcane/70 placeholder:text-slate-500"
            />
            <button
              onClick={listen}
              disabled={loading}
              title="Speak your question"
              className={`rounded-xl px-4 py-3 text-lg transition border ${listening ? "border-rose-400/60 bg-rose-500/20 animate-pulse" : "border-arcane/30 bg-void/80 hover:border-arcane/70"}`}
            >
              {listening ? "🎙️" : "🎤"}
            </button>
            <button
              onClick={() => divine()}
              disabled={loading || !question.trim()}
              className="font-rune font-semibold rounded-xl px-6 py-3 text-sm whitespace-nowrap transition disabled:opacity-40 disabled:cursor-not-allowed text-white bg-gradient-to-r from-arcane to-fuchsia-600 hover:from-fuchsia-500 hover:to-arcane shadow-[0_0_24px_-4px_rgba(168,85,247,0.8)]"
            >
              {loading ? "✦ Divining…" : "🔮 Divine"}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button key={ex} onClick={() => divine(ex)}
                className="text-[11px] bg-void border border-arcane/20 hover:border-arcane/60 rounded-full px-3 py-1 text-slate-400 hover:text-slate-200">
                {ex}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-300">The omens are clouded: {error}</div>}
      {loading && <Ceremony verse={streamVerse} />}
      {prophecy && <ProphecyCard key={prophecy.question} prophecy={prophecy} onInscribe={inscribe} muted={muted} />}

      <Ledger ledger={ledger} onResolved={refreshAll} muted={muted} />

      <footer className="mt-16 mb-6 text-center text-xs text-slate-600">
        <span className="font-rune text-arcane/60">AUGUR</span> · the AI augur that reads the omens & keeps score ·
        omens by You.com · divined on Groq · ledger on InsForge
      </footer>
    </div>
  );
}

function Header({ status, record, muted, onToggleMute }) {
  const badge = (label, value, on) => (
    <div className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border ${on ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-amber-400/30 bg-amber-400/10 text-amber-300"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${on ? "bg-emerald-400 aura" : "bg-amber-400"}`} />
      {label}: {value}
    </div>
  );
  return (
    <header className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="crystal-ball">🔮</span>
            <h1 className="font-rune text-4xl sm:text-5xl font-extrabold tracking-wide glow-text">AUGUR</h1>
          </div>
          <p className="text-slate-400 text-sm mt-2 max-w-lg">
            Ask any question about the future. AUGUR reads the living omens, divines a
            <span className="text-ether"> calibrated forecast with receipts</span> — then comes back and
            <span className="text-arcane"> grades itself</span>. The only AI brave enough to keep score.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button onClick={onToggleMute}
            className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border border-arcane/30 bg-panel/60 text-slate-300 hover:border-arcane/70"
            title={muted ? "The Augur is silent — click to give it voice" : "Silence the Augur"}>
            {muted ? "🔇 Augur muted" : "🔊 Augur speaks"}
          </button>
          {status && (
            <div className="flex flex-wrap gap-2 justify-end">
              {badge("Omens · You.com", status.youcom === "live" ? "live" : "mock", status.youcom === "live")}
              {badge("Mind · Groq", status.llm !== "mock" ? "live" : "mock", status.llm !== "mock")}
              {badge("Ledger · InsForge", status.storage === "insforge" ? "live" : "mock", status.storage === "insforge")}
            </div>
          )}
        </div>
      </div>
      {record && <RecordBar record={record} />}
    </header>
  );
}

function RecordBar({ record }) {
  const acc = record.accuracy;
  return (
    <div className="bg-gradient-to-r from-panel/80 to-panel/40 border border-arcane/20 rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
      <div className="flex items-center gap-5">
        <div className="text-center">
          <div className="font-rune text-3xl font-bold text-ether glow-text">{acc === null ? "—" : acc + "%"}</div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">accuracy</div>
        </div>
        <div className="h-10 w-px bg-white/10" />
        <div className="flex gap-4 text-sm">
          <Stat n={record.total_prophecies} label="prophecies" />
          <Stat n={record.resolved} label="resolved" color="text-slate-200" />
          <Stat n={record.correct} label="hits" color="text-emerald-400" />
          <Stat n={record.pending} label="pending" color="text-amber-400" />
        </div>
      </div>
      <div className="flex items-center gap-5">
        {record.head_to_head?.n > 0 && (
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-0.5">you vs augur</div>
            <div className="font-rune text-sm font-bold">
              <span className="text-gold">{record.head_to_head.you}</span>
              <span className="text-slate-600"> – </span>
              <span className="text-ether">{record.head_to_head.augur}</span>
            </div>
            <div className="text-[9px] text-slate-600">{record.head_to_head.n} duels</div>
          </div>
        )}
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-widest text-slate-500">calibration</span>
          <div className="flex gap-2">
            {record.calibration.map((b) => (
              <div key={b.label} className="text-center">
                <div className="text-[10px] text-slate-400">{b.label}</div>
                <div className={`text-sm font-rune font-bold ${b.hitRate === null ? "text-slate-600" : "text-ether"}`}>
                  {b.hitRate === null ? "·" : b.hitRate + "%"}
                </div>
                <div className="text-[9px] text-slate-600">{b.n} call{b.n === 1 ? "" : "s"}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
const Stat = ({ n, label, color = "text-slate-300" }) => (
  <div className="text-center"><div className={`font-rune font-bold ${color}`}>{n ?? 0}</div><div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div></div>
);

function ProphecyCard({ prophecy, onInscribe, muted }) {
  const a = prophecy.analysis || {};
  const prob = typeof a.probability === "number" ? a.probability : null;
  const [guess, setGuess] = useState(50);
  const [locked, setLocked] = useState(prob === null);
  const [saved, setSaved] = useState(false);

  // The Augur awakens: chime + speak the verse aloud (once per prophecy).
  useEffect(() => {
    if (muted) return;
    chime();
    const v = (a.verse || a.headline || "").replace(/\n/g, ", ");
    const t = setTimeout(() => speak(`${v}.`), 650);
    return () => { clearTimeout(t); stopSpeak(); };
  }, []);

  const delta = prob !== null ? guess - prob : 0;
  const agreeMsg = Math.abs(delta) <= 7 ? "You and AUGUR see eye to eye."
    : delta > 0 ? `You're ${Math.abs(delta)} pts more bullish than AUGUR.`
    : `You're ${Math.abs(delta)} pts more skeptical than AUGUR.`;

  return (
    <div className="mt-6 grid md:grid-cols-3 gap-5">
      <div className="md:col-span-2 bg-panel/70 backdrop-blur-sm border border-arcane/20 rounded-2xl p-6 shadow-[0_0_50px_-20px_rgba(168,85,247,0.6)]">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-rune text-xl font-bold text-slate-100 leading-snug">{prophecy.question}</h2>
          {a.category && <span className="shrink-0 text-[10px] uppercase tracking-widest text-arcane/70 border border-arcane/30 rounded-full px-2 py-0.5">{a.category}</span>}
        </div>

        {a.verse && (
          <div className="mt-4 relative overflow-hidden rounded-xl border border-arcane/25 bg-gradient-to-br from-arcane/10 via-void/40 to-void/60 px-5 py-4 verse-reveal">
            <div className="text-[10px] uppercase tracking-[0.3em] text-arcane/70 font-rune mb-1.5">The Augur speaks</div>
            <p className="font-rune text-base sm:text-lg text-fuchsia-100 leading-relaxed glow-text whitespace-pre-line italic">{a.verse}</p>
          </div>
        )}

        {a.headline && <p className="mt-3 text-sm text-slate-400 leading-snug">{a.headline}</p>}

        {/* Evidence first — the case for & against (You.com-grounded) */}
        <div className="mt-5 grid sm:grid-cols-2 gap-3">
          <CaseList title="The case for" mark="✅" items={a.bull_case} tone="emerald" />
          <CaseList title="The case against" mark="❌" items={a.bear_case} tone="rose" />
        </div>

        {/* You vs AUGUR — lock your call before the reveal */}
        {!locked ? (
          <div className="mt-6 bg-void/60 border border-arcane/30 rounded-xl p-4">
            <div className="text-[11px] uppercase tracking-[0.2em] text-arcane/80 font-rune">Before AUGUR speaks — what's YOUR call?</div>
            <div className="mt-3 flex items-center gap-4">
              <input type="range" min="0" max="100" value={guess} onChange={(e) => setGuess(+e.target.value)}
                className="flex-1 accent-arcane" />
              <span className="font-rune text-2xl font-bold text-ether w-16 text-right">{guess}%</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">slide to your probability the answer is YES</div>
            <button onClick={() => setLocked(true)}
              className="mt-3 font-rune text-sm font-semibold rounded-lg px-5 py-2 text-white bg-gradient-to-r from-arcane to-fuchsia-600 hover:from-fuchsia-500 hover:to-arcane">
              🔒 Lock my call &amp; reveal AUGUR
            </button>
          </div>
        ) : (
          <>
            <div className="mt-6 flex items-center gap-5 flex-wrap">
              {prob !== null && <Orb value={prob} animate />}
              <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-arcane/70 font-rune">AUGUR's Verdict</div>
                <div className="text-xl font-semibold text-ether mt-0.5">{a.verdict || "—"}</div>
                {a.resolve_by && <div className="text-[11px] text-slate-500 mt-1">resolves: {a.resolve_by}</div>}
              </div>
              {prob !== null && (
                <div className="ml-auto text-right">
                  <div className="text-sm"><span className="text-slate-400">You</span> <span className="font-rune font-bold text-gold">{guess}%</span>
                    <span className="text-slate-600 mx-1">vs</span>
                    <span className="font-rune font-bold text-ether">{prob}%</span> <span className="text-slate-400">AUGUR</span></div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{agreeMsg}</div>
                </div>
              )}
            </div>

            {a.reasoning && <p className="mt-5 text-sm text-slate-300 leading-relaxed">{cites(a.reasoning)}</p>}

            {a.wildcard && (
              <div className="mt-5 bg-void/60 border border-gold/20 rounded-xl px-4 py-3">
                <span className="text-[11px] uppercase tracking-[0.2em] text-gold/80 font-rune">The Wildcard · </span>
                <span className="text-sm text-slate-200">{a.wildcard}</span>
              </div>
            )}

            <button
              onClick={() => { onInscribe(guess); setSaved(true); }}
              disabled={saved}
              className="mt-5 text-sm border border-ether/30 hover:border-ether/70 rounded-lg px-4 py-2 text-slate-200 disabled:opacity-50">
              {saved ? "❖ Inscribed to the Ledger" : "❖ Inscribe this prophecy (with your call)"}
            </button>
          </>
        )}
      </div>

      <SourcePanel sources={prophecy.sources} />
    </div>
  );
}

function CaseList({ title, mark, items, tone }) {
  const c = tone === "emerald" ? "border-emerald-400/20 bg-emerald-400/5" : "border-rose-400/20 bg-rose-400/5";
  return (
    <div className={`rounded-xl border ${c} p-3`}>
      <div className="text-[11px] uppercase tracking-widest text-slate-400 font-rune mb-1.5">{mark} {title}</div>
      <ul className="space-y-1">
        {(Array.isArray(items) ? items.slice(0, 2) : []).map((it, i) => (
          <li key={i} className="text-[13px] text-slate-300 leading-snug flex gap-1.5"><span className="text-slate-600">·</span><span>{cites(it)}</span></li>
        ))}
        {(!items || !items.length) && <li className="text-[13px] text-slate-600">—</li>}
      </ul>
    </div>
  );
}

function SourcePanel({ sources }) {
  return (
    <div className="bg-panel/70 backdrop-blur-sm border border-ether/20 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-1.5 h-1.5 rounded-full bg-ether aura" />
        <h3 className="text-sm font-rune font-semibold text-slate-200">Omens Read <span className="text-slate-500">({sources.length})</span></h3>
      </div>
      <p className="text-[11px] text-slate-500 mb-3">Live, cited evidence via You.com. Every claim is traceable.</p>
      <div className="space-y-2.5 max-h-[470px] overflow-y-auto pr-1">
        {sources.map((s, i) => (
          <a key={i} href={s.url} target="_blank" rel="noreferrer"
            className="block bg-void/60 hover:bg-void border border-white/5 hover:border-ether/40 rounded-xl px-3 py-2.5 transition group">
            <div className="flex items-start gap-2">
              <span className="text-[10px] text-ether font-mono mt-0.5">[{i + 1}]</span>
              <div className="min-w-0">
                <div className="text-xs font-medium text-slate-200 group-hover:text-ether line-clamp-2">{s.title}</div>
                <div className="text-[10px] text-slate-500 mt-1 flex gap-2"><span>{s.source}</span>{s.published && <span>· {s.published}</span>}</div>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

function Ledger({ ledger, onResolved, muted }) {
  if (!ledger.length) return null;
  return (
    <div className="mt-14">
      <h3 className="font-rune text-lg font-semibold mb-1 text-slate-200 flex items-center gap-2">
        AUGUR's Ledger
        <span className="inline-flex items-center gap-1 text-[10px] font-body text-emerald-300 border border-emerald-400/30 bg-emerald-400/10 rounded-full px-2 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 aura" /> live · synced via InsForge
        </span>
      </h3>
      <p className="text-xs text-slate-500 mb-4">Every prophecy, on the record — open on another device and watch it sync. Hit <span className="text-ether">Resolve</span> and AUGUR re-reads the omens to grade itself.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        {ledger.map((p) => <LedgerCard key={p.id} p={p} onResolved={onResolved} muted={muted} />)}
      </div>
    </div>
  );
}

function LedgerCard({ p, onResolved, muted }) {
  const [phase, setPhase] = useState("idle"); // idle | deliberating | revealed
  const [local, setLocal] = useState(null); // {status, resolution}
  let a = {}; try { a = typeof p.analysis === "string" ? JSON.parse(p.analysis) : p.analysis || {}; } catch {}
  const status = local?.status || p.status;
  const resolution = local?.resolution || p.resolution;
  const badge = {
    pending: { t: "⏳ pending", c: "text-amber-300 border-amber-400/30 bg-amber-400/10" },
    correct: { t: "✓ correct", c: "text-emerald-300 border-emerald-400/30 bg-emerald-400/10" },
    wrong: { t: "✗ wrong", c: "text-rose-300 border-rose-400/30 bg-rose-400/10" },
  }[status] || { t: status, c: "text-slate-400 border-white/10" };

  async function resolve() {
    setPhase("deliberating");
    toll();
    try {
      const r = await api(`/api/prophecies/${p.id}/resolve`, { method: "POST" });
      const res = { status: r.status, resolution: r.resolution };
      setTimeout(() => {
        setLocal(res); setPhase("revealed");
        if (!muted) {
          const line = res.status === "correct" ? "The fates confirm. The Augur foresaw truly."
            : res.status === "wrong" ? "The fates dissent. The Augur was mistaken."
            : "The threads remain unspun. No verdict yet.";
          setTimeout(() => speak(line), 350);
        }
        setTimeout(() => onResolved(), 3400);
      }, 1100);
    } catch { setPhase("idle"); }
  }

  return (
    <div className="relative bg-panel/60 border border-arcane/15 rounded-xl p-4 overflow-hidden">
      {phase === "deliberating" && (
        <div className="absolute inset-0 z-10 bg-void/85 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="text-3xl crystal-ball">🔮</div>
          <div className="mt-2 font-rune text-arcane/90 tracking-[0.25em] text-[11px] animate-pulse">THE FATES DELIBERATE…</div>
        </div>
      )}
      {phase === "revealed" && (
        <div className={`absolute inset-0 z-10 flex flex-col items-center justify-center backdrop-blur-[1px] ${status === "correct" ? "bg-emerald-500/20" : status === "wrong" ? "bg-rose-500/20" : "bg-amber-500/20"}`}>
          <div className={`stamp-in text-6xl font-bold ${status === "correct" ? "text-emerald-400" : status === "wrong" ? "text-rose-400" : "text-amber-400"}`}>
            {status === "correct" ? "✓" : status === "wrong" ? "✗" : "…"}
          </div>
          <div className="mt-1 font-rune tracking-[0.2em] text-[11px] text-slate-100">THE FATES HAVE SPOKEN</div>
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="font-medium text-sm text-slate-100 leading-snug">{p.question}</div>
        <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full border ${badge.c}`}>{badge.t}</span>
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs">
        <span className="text-ether font-rune font-bold">{p.probability ?? "—"}%</span>
        <span className="text-slate-400">{a.verdict}</span>
        {p.resolve_by && <span className="text-slate-600">· by {p.resolve_by}</span>}
      </div>
      {resolution && (
        <div className={`mt-3 text-xs rounded-lg px-3 py-2 ${status === "correct" ? "bg-emerald-500/10 text-emerald-200" : "bg-rose-500/10 text-rose-200"}`}>
          <span className="font-rune">{status === "correct" ? "AUGUR called it: " : "AUGUR missed: "}</span>{resolution}
        </div>
      )}
      {status === "pending" && phase === "idle" && (
        <button onClick={resolve}
          className="mt-3 text-[11px] border border-ether/30 hover:border-ether/70 rounded-lg px-3 py-1.5 text-ether">
          ⚖️ Resolve — let the fates judge
        </button>
      )}
    </div>
  );
}

function cites(text) {
  if (typeof text !== "string") return text;
  return text.split(/(\[\d+\])/g).map((part, i) =>
    /^\[\d+\]$/.test(part) ? <span key={i} className="text-ether font-mono text-[11px] align-super">{part}</span> : <React.Fragment key={i}>{part}</React.Fragment>
  );
}

function Orb({ value, animate }) {
  const [shown, setShown] = useState(animate ? 0 : value);
  useEffect(() => {
    if (!animate) { setShown(value); return; }
    let raf, start;
    const step = (t) => {
      if (!start) start = t;
      const p = Math.min((t - start) / 800, 1);
      setShown(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, animate]);
  value = shown;
  const r = 30, c = 2 * Math.PI * r, off = c - (value / 100) * c;
  const hue = value >= 66 ? "#34d399" : value >= 40 ? "#22d3ee" : "#fbbf24";
  return (
    <div className="relative w-20 h-20 shrink-0 orb-float">
      <div className="absolute inset-0 rounded-full blur-xl opacity-60" style={{ background: `radial-gradient(circle, ${hue}, transparent 70%)` }} />
      <svg className="w-20 h-20 -rotate-90 relative">
        <circle cx="40" cy="40" r={r} stroke="#2a2150" strokeWidth="5" fill="none" />
        <circle cx="40" cy="40" r={r} stroke={hue} strokeWidth="5" fill="none" strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 6px ${hue})` }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-rune font-bold" style={{ color: hue }}>{value}</span>
        <span className="text-[8px] text-slate-500 -mt-0.5 tracking-widest">% YES</span>
      </div>
    </div>
  );
}

const RITES = [
  "the omens gather…",
  "the threads of fate align…",
  "the veil grows thin…",
  "the Augur stirs…",
];
function Ceremony({ verse }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % RITES.length), 900);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="mt-10 flex flex-col items-center justify-center py-14">
      <div className="relative w-32 h-32">
        <div className="absolute inset-0 rounded-full blur-2xl bg-arcane/40 aura" />
        <div className="absolute inset-0 rounded-full border-2 border-arcane/30 border-t-ether spin-slow" />
        <div className="absolute inset-2 rounded-full border border-ether/20 border-b-arcane spin-slow" style={{ animationDirection: "reverse" }} />
        <div className="absolute inset-0 flex items-center justify-center text-4xl crystal-ball">🔮</div>
      </div>
      {verse ? (
        <p className="mt-8 max-w-xl text-center font-rune text-lg text-fuchsia-100 leading-relaxed glow-text whitespace-pre-line italic">
          {verse}<span className="inline-block w-2 h-5 ml-0.5 bg-ether align-middle animate-pulse" />
        </p>
      ) : (
        <p className="mt-8 font-rune text-arcane/90 tracking-[0.3em] text-sm">{RITES[i].toUpperCase()}</p>
      )}
    </div>
  );
}
