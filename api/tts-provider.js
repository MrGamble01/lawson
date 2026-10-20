// Server-side speech providers. The page never sees these keys.
// ElevenLabs is the default. TTS_PROVIDER=fish swaps in Fish Audio.
"use strict";
const {
  TTS_DEFAULT_KEY, TTS_DEFAULT_VOICE_ID, TTS_MODEL, TTS_MODELS, ttsVoiceByKey, ttsVoiceById,
} = require("../lib/tts-voices");

const VOICE_SETTINGS = {
  stability: 0.45,
  similarity_boost: 0.8,
  style: 0.15,
  use_speaker_boost: true,
};

function providerName() {
  return String(process.env.TTS_PROVIDER || "").trim().toLowerCase() === "fish" ? "fish" : "elevenlabs";
}

function providerConfigured() {
  if (providerName() === "fish") return !!process.env.FISH_API_KEY;
  return !!process.env.ELEVENLABS_API_KEY;
}

function selectedModel() {
  const want = String(process.env.ELEVENLABS_MODEL || "").trim();
  return TTS_MODELS.includes(want) ? want : TTS_MODEL;
}

// The Sarah option follows ELEVENLABS_VOICE_ID only when that id is itself
// a premade default. A library id is ignored so a free account cannot 402.
function voiceIdForKey(key) {
  const voice = ttsVoiceByKey(key);
  if (!voice) return null;
  if (voice.key === TTS_DEFAULT_KEY) {
    const envId = String(process.env.ELEVENLABS_VOICE_ID || "").trim();
    if (envId && ttsVoiceById(envId)) return envId;
    return TTS_DEFAULT_VOICE_ID;
  }
  return voice.id;
}

function elevenLabsSpeechRequest({ text, voiceId, apiKey, model }) {
  return {
    url: `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
    headers: {
      "xi-api-key": apiKey || "",
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: {
      text,
      model_id: model || selectedModel(),
      voice_settings: VOICE_SETTINGS,
    },
  };
}

function fishSpeechRequest({ text, apiKey, referenceId, model }) {
  return {
    url: "https://api.fish.audio/v1/tts",
    headers: {
      Authorization: `Bearer ${apiKey || ""}`,
      "Content-Type": "application/json",
      model: model || "s2.1-pro",
    },
    body: {
      text,
      reference_id: referenceId || "",
      format: "mp3",
      mp3_bitrate: 128,
    },
  };
}

function buildSpeechRequest({ text, voiceKey }) {
  if (providerName() === "fish") {
    return fishSpeechRequest({
      text,
      apiKey: process.env.FISH_API_KEY || "",
      referenceId: process.env.FISH_REFERENCE_ID || "",
      model: process.env.FISH_MODEL || "s2.1-pro",
    });
  }
  return elevenLabsSpeechRequest({
    text,
    voiceId: voiceIdForKey(voiceKey),
    apiKey: process.env.ELEVENLABS_API_KEY || "",
    model: selectedModel(),
  });
}

module.exports = {
  providerName, providerConfigured, selectedModel, voiceIdForKey,
  elevenLabsSpeechRequest, fishSpeechRequest, buildSpeechRequest,
};
