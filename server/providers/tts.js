// Optional studio-grade TTS via ElevenLabs. If no key, the frontend falls back
// to the (improved) browser voice. Keeps the Augur's voice warm, not robotic.
const DEFAULT_VOICE = "pNInz6obpgDQGcFmaJgB"; // "Adam" — deep, resonant, oracular

export function hasEleven() {
  return Boolean(process.env.ELEVEN_API_KEY);
}
export function ttsMode() {
  return hasEleven() ? "eleven" : "browser";
}

// Returns a Buffer of audio/mpeg, or throws.
export async function elevenSpeak(text) {
  const voice = process.env.ELEVEN_VOICE_ID || DEFAULT_VOICE;
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
    method: "POST",
    headers: {
      "xi-api-key": process.env.ELEVEN_API_KEY,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: process.env.ELEVEN_MODEL || "eleven_turbo_v2_5",
      voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true },
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`ElevenLabs ${res.status}: ${t.slice(0, 200)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}
