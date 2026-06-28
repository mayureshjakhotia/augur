// THE CHANGELING — multiplayer "spot the AI" party game engine.
// In-memory authoritative state (fast realtime) + InsForge write-through (persistence).
import { youSearch, hasYouCom } from "./providers/youcom.js";
import { llmComplete } from "./providers/llm.js";
import { insInsert } from "./providers/insforge.js";

const rooms = new Map(); // code -> room

const PROMPTS = [
  { t: "Your villain origin story, in 6 words.", live: false },
  { t: "A terrible name for a coffee shop.", live: false },
  { t: "Worst possible superpower to have.", live: false },
  { t: "A hot take about today's tech news.", live: true },
  { t: "Describe your morning routine as a lie.", live: false },
  { t: "The real reason the wifi is down.", live: false },
  { t: "A spell that should exist but doesn't.", live: false },
  { t: "Caption a photo you can't see.", live: false },
  { t: "A conspiracy theory about pigeons.", live: false },
  { t: "What's trending right now, but make it weird.", live: true },
];

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
function newCode() {
  let c;
  do {
    c = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");
  } while (rooms.has(c));
  return c;
}
const uid = () => Math.random().toString(36).slice(2, 10);
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export function createRoom(hostName) {
  const code = newCode();
  const hostId = uid();
  const room = {
    code, hostId, status: "lobby", round: 0,
    prompt: null, promptLive: false,
    players: { [hostId]: { id: hostId, name: hostName || "Host", score: 0 } },
    answers: [], votes: {}, result: null, persisted: false,
  };
  rooms.set(code, room);
  insInsert("game_players", { room_code: code, name: room.players[hostId].name, score: 0 }).catch(() => {});
  return { code, playerId: hostId };
}

export function joinRoom(code, name) {
  const room = rooms.get((code || "").toUpperCase());
  if (!room) throw new Error("No coven with that code");
  if (room.status !== "lobby") throw new Error("This round has already begun");
  const id = uid();
  room.players[id] = { id, name: name || "Mage", score: 0 };
  insInsert("game_players", { room_code: room.code, name: room.players[id].name, score: 0 }).catch(() => {});
  return { code: room.code, playerId: id };
}

export async function startRound(code, playerId) {
  const room = get(code);
  if (room.hostId !== playerId) throw new Error("Only the host can begin");
  const humans = Object.keys(room.players).length;
  if (humans < 2) throw new Error("Need at least 2 mages to play");

  room.round += 1;
  const p = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
  room.prompt = p.t; room.promptLive = p.live;
  room.answers = []; room.votes = {}; room.result = null; room.persisted = false;
  room.status = "answering";

  // The Changeling (AI) crafts its answer in the background.
  room.botPromise = makeBotAnswer(p).then((text) => { room.botAnswer = text; });
  return stateFor(room, playerId);
}

async function makeBotAnswer(p) {
  let facts = "";
  if (p.live && hasYouCom()) {
    try {
      const r = await youSearch("today's biggest tech news", { count: 4 });
      facts = "\nReal current facts you may use:\n" + r.slice(0, 4).map((s) => `- ${s.title}`).join("\n");
    } catch {}
  }
  const system =
    "You are the Changeling — an AI secretly playing a human party game. Blend in. " +
    "Write like a witty human texting fast: short, lowercase ok, no period, a little " +
    "imperfect, never robotic or over-explained. Max 12 words. Output ONLY the answer.";
  const user = `Prompt: ${p.t}${facts}\nYour answer (sound human, be funny):`;
  try {
    let t = (await llmComplete(system, user)).trim().replace(/^["']|["']$/g, "");
    t = t.split("\n")[0].slice(0, 120);
    return t || "honestly no idea lol";
  } catch {
    return "honestly no idea lol";
  }
}

export async function submitAnswer(code, playerId, text) {
  const room = get(code);
  if (room.status !== "answering") throw new Error("Not accepting answers");
  if (!room.players[playerId]) throw new Error("Unknown player");
  if (room.answers.find((a) => a.playerId === playerId)) return stateFor(room, playerId);
  room.answers.push({ id: uid(), playerId, text: (text || "").slice(0, 120) || "…" });

  const humanCount = Object.keys(room.players).length;
  if (room.answers.length >= humanCount) {
    await (room.botPromise || Promise.resolve());
    room.answers.push({ id: uid(), playerId: "BOT", text: room.botAnswer || "honestly no idea lol" });
    shuffle(room.answers);
    room.status = "voting";
  }
  return stateFor(room, playerId);
}

export async function castVote(code, playerId, answerId) {
  const room = get(code);
  if (room.status !== "voting") throw new Error("Not voting yet");
  if (!room.players[playerId]) throw new Error("Unknown player");
  room.votes[playerId] = answerId;

  if (Object.keys(room.votes).length >= Object.keys(room.players).length) {
    await resolveRound(room);
  }
  return stateFor(room, playerId);
}

async function resolveRound(room) {
  const botAns = room.answers.find((a) => a.playerId === "BOT");
  const tally = {};
  for (const v of Object.values(room.votes)) tally[v] = (tally[v] || 0) + 1;
  const caughtBy = [];
  for (const [voter, target] of Object.entries(room.votes)) {
    if (target === botAns.id) { room.players[voter].score += 1; caughtBy.push(voter); }
  }
  const voters = Object.keys(room.votes).length;
  const botCaught = caughtBy.length * 2 > voters; // majority found it
  room.result = {
    botAnswerId: botAns.id,
    botAnswer: botAns.text,
    caught: botCaught,
    caughtBy: caughtBy.map((id) => room.players[id]?.name).filter(Boolean),
    tally,
  };
  room.status = "reveal";

  // Persist the full round to InsForge (the shared, durable record).
  if (!room.persisted) {
    room.persisted = true;
    insInsert("game_rounds", {
      room_code: room.code,
      round: room.round,
      prompt: room.prompt,
      bot_answer: botAns.text,
      answers: room.answers.map((a) => ({ text: a.text, isBot: a.playerId === "BOT" })),
      votes: room.result.tally,
      result: botCaught ? "humans" : "changeling",
    }).catch(() => {});
  }
}

export function nextRound(code, playerId) {
  const room = get(code);
  if (room.hostId !== playerId) throw new Error("Only the host can continue");
  room.status = "lobby";
  room.answers = []; room.votes = {}; room.result = null; room.prompt = null;
  return stateFor(room, playerId);
}

export function getState(code, playerId) {
  return stateFor(get(code), playerId);
}

function get(code) {
  const room = rooms.get((code || "").toUpperCase());
  if (!room) throw new Error("No coven with that code");
  return room;
}

// Phase-aware view: never leak who wrote what until reveal.
function stateFor(room, playerId) {
  const players = Object.values(room.players).map((p) => ({ id: p.id, name: p.name, score: p.score }));
  const base = {
    code: room.code, status: room.status, round: room.round,
    prompt: room.prompt, isHost: room.hostId === playerId, you: playerId,
    players, playerCount: players.length,
  };
  if (room.status === "answering") {
    base.answered = room.answers.map((a) => a.playerId).filter((p) => p !== "BOT");
    base.youAnswered = !!room.answers.find((a) => a.playerId === playerId);
  }
  if (room.status === "voting") {
    base.answers = room.answers.map((a) => ({ id: a.id, text: a.text })); // anonymized
    base.youVoted = room.votes[playerId] || null;
    base.votedCount = Object.keys(room.votes).length;
  }
  if (room.status === "reveal") {
    base.answers = room.answers.map((a) => ({
      id: a.id, text: a.text, isBot: a.playerId === "BOT",
      author: a.playerId === "BOT" ? "🎭 The Changeling" : room.players[a.playerId]?.name,
      votes: room.result.tally[a.id] || 0,
    }));
    base.result = room.result;
    base.yourVote = room.votes[playerId] || null;
  }
  return base;
}
