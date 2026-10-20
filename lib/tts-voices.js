// Storyteller voices shared by the page and the server.
// Free ElevenLabs accounts can call premade default voices only. Library
// voices (Rachel and the rest) return 402 paid_plan_required.
const TTS_VOICES = [
  { key: "sarah", id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", blurb: "soft and friendly", recommended: true },
  { key: "lily", id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily", blurb: "warm and bright" },
];
const TTS_DEFAULT_KEY = "sarah";
const TTS_DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";
const TTS_MODEL = "eleven_flash_v2_5";
const TTS_MODELS = ["eleven_flash_v2_5", "eleven_turbo_v2_5"];
const TTS_MAX_CHARS = 500;

function normTtsText(text) {
  return String(text == null ? "" : text).replace(/\s+/g, " ").trim();
}
function ttsVoiceByKey(key) {
  return TTS_VOICES.find((v) => v.key === key) || null;
}
function ttsVoiceById(id) {
  return TTS_VOICES.find((v) => v.id === id) || null;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    TTS_VOICES, TTS_DEFAULT_KEY, TTS_DEFAULT_VOICE_ID, TTS_MODEL, TTS_MODELS, TTS_MAX_CHARS,
    normTtsText, ttsVoiceByKey, ttsVoiceById,
  };
}
