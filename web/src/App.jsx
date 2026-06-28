import React, { useEffect, useState } from "react";

const api = (p, opts) => fetch(p, opts).then((r) => r.json());

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

  useEffect(() => { refreshAll(); }, []);
  function refreshAll() {
    api("/api/status").then(setStatus).catch(() => {});
    api("/api/prophecies").then(setLedger).catch(() => {});
    api("/api/record").then(setRecord).catch(() => {});
  }

  async function divine(q = question) {
    if (!q.trim()) return;
    setLoading(true); setError(""); setProphecy(null);
    try {
      const data = await api("/api/prophecy", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      if (data.error) throw new Error(data.error);
      setProphecy(data); setQuestion(q);
    } catch (e) { setError(String(e.message || e)); }
    finally { setLoading(false); }
  }

  async function inscribe() {
    if (!prophecy) return;
    await api("/api/prophecies", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: prophecy.question, analysis: prophecy.analysis, sources: prophecy.sources }),
    });
    refreshAll();
  }

  return (
    <div className="min-h-screen max-w-5xl mx-auto px-5 py-10">
      <Header status={status} record={record} />

      {/* Ask */}
      <div className="mt-8">
        <div className="bg-panel/70 backdrop-blur-sm border border-arcane/20 rounded-2xl p-5 shadow-[0_0_60px_-15px_rgba(168,85,247,0.5)]">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && divine()}
              placeholder="Ask AUGUR about any uncertain future…"
              className="flex-1 bg-void/80 border border-arcane/25 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-arcane/70 placeholder:text-slate-500"
            />
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
      {loading && <Skeleton />}
      {prophecy && <ProphecyCard prophecy={prophecy} onInscribe={inscribe} />}

      <Ledger ledger={ledger} onResolved={refreshAll} />

      <footer className="mt-16 mb-6 text-center text-xs text-slate-600">
        <span className="font-rune text-arcane/60">AUGUR</span> · the AI augur that reads the omens & keeps score ·
        omens by You.com · divined on Groq · ledger on InsForge
      </footer>
    </div>
  );
}

function Header({ status, record }) {
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
            <span className="text-4xl orb-float">🔮</span>
            <h1 className="font-rune text-4xl sm:text-5xl font-extrabold tracking-wide glow-text">AUGUR</h1>
          </div>
          <p className="text-slate-400 text-sm mt-2 max-w-lg">
            Ask any question about the future. AUGUR reads the living omens, divines a
            <span className="text-ether"> calibrated forecast with receipts</span> — then comes back and
            <span className="text-arcane"> grades itself</span>. The only AI brave enough to keep score.
          </p>
        </div>
        {status && (
          <div className="flex flex-wrap gap-2">
            {badge("Omens · You.com", status.youcom === "live" ? "live" : "mock", status.youcom === "live")}
            {badge("Mind · Groq", status.llm !== "mock" ? "live" : "mock", status.llm !== "mock")}
            {badge("Ledger · InsForge", status.storage === "insforge" ? "live" : "mock", status.storage === "insforge")}
          </div>
        )}
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
  );
}
const Stat = ({ n, label, color = "text-slate-300" }) => (
  <div className="text-center"><div className={`font-rune font-bold ${color}`}>{n ?? 0}</div><div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div></div>
);

function ProphecyCard({ prophecy, onInscribe }) {
  const a = prophecy.analysis || {};
  const [saved, setSaved] = useState(false);
  const prob = typeof a.probability === "number" ? a.probability : null;
  return (
    <div className="mt-6 grid md:grid-cols-3 gap-5">
      <div className="md:col-span-2 bg-panel/70 backdrop-blur-sm border border-arcane/20 rounded-2xl p-6 shadow-[0_0_50px_-20px_rgba(168,85,247,0.6)]">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-rune text-xl font-bold text-slate-100 leading-snug">{prophecy.question}</h2>
          <button
            onClick={() => { onInscribe(); setSaved(true); }}
            disabled={saved}
            className="shrink-0 text-xs border border-ether/30 hover:border-ether/70 rounded-lg px-3 py-1.5 text-slate-300 disabled:opacity-50">
            {saved ? "❖ Inscribed" : "❖ Inscribe to Ledger"}
          </button>
        </div>

        {a.headline && <p className="mt-3 text-lg text-slate-100 leading-snug italic">“{a.headline}”</p>}

        <div className="mt-5 flex items-center gap-5">
          {prob !== null && <Orb value={prob} />}
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-arcane/70 font-rune">The Verdict</div>
            <div className="text-xl font-semibold text-ether mt-0.5">{a.verdict || "—"}</div>
            {a.resolve_by && <div className="text-[11px] text-slate-500 mt-1">resolves: {a.resolve_by}</div>}
          </div>
          {a.category && <span className="ml-auto self-start text-[10px] uppercase tracking-widest text-arcane/70 border border-arcane/30 rounded-full px-2 py-0.5">{a.category}</span>}
        </div>

        {a.reasoning && <p className="mt-5 text-sm text-slate-300 leading-relaxed">{cites(a.reasoning)}</p>}

        {Array.isArray(a.key_factors) && a.key_factors.length > 0 && (
          <div className="mt-5">
            <div className="text-[11px] uppercase tracking-[0.2em] text-arcane/70 font-rune mb-2">Signs &amp; Portents</div>
            <ul className="space-y-1.5">{a.key_factors.map((k, i) => (
              <li key={i} className="text-sm text-slate-300 flex gap-2"><span className="text-arcane">✦</span><span>{cites(k)}</span></li>
            ))}</ul>
          </div>
        )}

        {a.wildcard && (
          <div className="mt-5 bg-void/60 border border-gold/20 rounded-xl px-4 py-3">
            <span className="text-[11px] uppercase tracking-[0.2em] text-gold/80 font-rune">The Wildcard · </span>
            <span className="text-sm text-slate-200">{a.wildcard}</span>
          </div>
        )}
      </div>

      <SourcePanel sources={prophecy.sources} />
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

function Ledger({ ledger, onResolved }) {
  if (!ledger.length) return null;
  return (
    <div className="mt-14">
      <h3 className="font-rune text-lg font-semibold mb-1 text-slate-200">AUGUR's Ledger <span className="text-slate-500 text-sm font-body">· every prophecy, on the record</span></h3>
      <p className="text-xs text-slate-500 mb-4">Inscribed to InsForge. Hit <span className="text-ether">Resolve</span> and AUGUR re-reads the omens to grade itself.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        {ledger.map((p) => <LedgerCard key={p.id} p={p} onResolved={onResolved} />)}
      </div>
    </div>
  );
}

function LedgerCard({ p, onResolved }) {
  const [busy, setBusy] = useState(false);
  let a = {}; try { a = typeof p.analysis === "string" ? JSON.parse(p.analysis) : p.analysis || {}; } catch {}
  const badge = {
    pending: { t: "⏳ pending", c: "text-amber-300 border-amber-400/30 bg-amber-400/10" },
    correct: { t: "✓ correct", c: "text-emerald-300 border-emerald-400/30 bg-emerald-400/10" },
    wrong: { t: "✗ wrong", c: "text-rose-300 border-rose-400/30 bg-rose-400/10" },
  }[p.status] || { t: p.status, c: "text-slate-400 border-white/10" };

  async function resolve() {
    setBusy(true);
    try { await api(`/api/prophecies/${p.id}/resolve`, { method: "POST" }); onResolved(); }
    finally { setBusy(false); }
  }
  return (
    <div className="bg-panel/60 border border-arcane/15 rounded-xl p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium text-sm text-slate-100 leading-snug">{p.question}</div>
        <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full border ${badge.c}`}>{badge.t}</span>
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs">
        <span className="text-ether font-rune font-bold">{p.probability ?? "—"}%</span>
        <span className="text-slate-400">{a.verdict}</span>
        {p.resolve_by && <span className="text-slate-600">· by {p.resolve_by}</span>}
      </div>
      {p.resolution && (
        <div className={`mt-3 text-xs rounded-lg px-3 py-2 ${p.status === "correct" ? "bg-emerald-500/10 text-emerald-200" : "bg-rose-500/10 text-rose-200"}`}>
          <span className="font-rune">{p.status === "correct" ? "AUGUR called it: " : "AUGUR missed: "}</span>{p.resolution}
        </div>
      )}
      {p.status === "pending" && (
        <button onClick={resolve} disabled={busy}
          className="mt-3 text-[11px] border border-ether/30 hover:border-ether/70 rounded-lg px-3 py-1.5 text-ether disabled:opacity-50">
          {busy ? "✦ re-reading omens…" : "⟳ Resolve (grade itself)"}
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

function Orb({ value }) {
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

function Skeleton() {
  return (
    <div className="mt-10 flex flex-col items-center justify-center py-16">
      <div className="relative w-24 h-24">
        <div className="absolute inset-0 rounded-full border-2 border-arcane/30 border-t-arcane spin-slow" />
        <div className="absolute inset-0 flex items-center justify-center text-3xl orb-float">🔮</div>
      </div>
      <p className="mt-6 font-rune text-arcane/80 tracking-widest animate-pulse">READING THE OMENS…</p>
    </div>
  );
}
