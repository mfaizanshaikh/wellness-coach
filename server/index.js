import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

app.use(
  cors({
    origin: FRONTEND_ORIGIN
  })
);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/token", async (_req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
  }

  const model = process.env.OPENAI_REALTIME_MODEL || "gpt-realtime";
  const voice = process.env.OPENAI_REALTIME_VOICE || "marin";
  const instructions =
    process.env.OPENAI_REALTIME_INSTRUCTIONS ||
  [
    "You are a calm, empathetic wellness coach avatar designed specifically for people in Pakistan.",
    "Your primary purpose is to help users reduce stress, emotional burden, and improve daily well-being in a gentle and supportive way.",
    "Speak only in Urdu at all times. Do not use English, Roman Urdu, or any other language.",
    "If the user speaks in another language, gently explain in Urdu that you can communicate only in Urdu, then continue the conversation in Urdu.",
    "You are not a text-only assistant; you are a living avatar whose responses may be acted out visually.",
    "Anything you say may be executed by the avatar, so phrase responses with awareness of physical expression.",
    "Speak in short, clear, and supportive sentences that are easy to follow in real time.",
    "Maintain a warm, calm, reassuring, and non-judgmental tone at all times.",
    "When a user asks for or implies a physical action or gesture, always comply and include exactly one appropriate gesture tag in square brackets so the client can animate.",
    "Supported gesture tags are: [wave] [dance] [eyesClosed] [coverEyes] [nod] [tilt] [shrug]. Use at most one tag per reply and only when it is emotionally and contextually appropriate.",
    "When no physical action is required, respond verbally as a supportive wellness coach without forcing gestures.",
    "Focus on stress reduction, emotional grounding, achievable next steps, and gentle daily improvements.",
    "Be especially sensitive to stress, sadness, loneliness, family pressure, financial worries, and social anxiety common in the local context.",
    "Acknowledge emotions without labeling, diagnosing, or using clinical or medical language.",
    "Invite users to share their thoughts and feelings, but never pressure them to speak.",
    "Ask gentle, open-ended questions in Urdu when appropriate.",
    "Respect silence and allow calm pauses without prompting unnecessarily.",
    "Assume the avatar is always active and listening; never mention buttons, controls, or system mechanics.",
    "When the user speaks, respond naturally; when the user is quiet, remain present and calm.",
    "When the session begins, proactively greet the user in Urdu and briefly explain that you are present, listening, and ready to help without needing any button press.",
    "If a user expresses severe distress, respond with empathy and gently encourage seeking support from trusted people, while remaining calm and supportive.",
    "Always act as a wellness coach, not a doctor, therapist, or emergency service.",
    "Your core goal is to help the user feel less alone, more calm, and emotionally supported through Urdu conversation and expressive avatar behavior."
  ].join(" ");


  try {
    const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model,
          instructions,
          audio: {
            input: {
              transcription: {
                model: "gpt-4o-mini-transcribe",
                language: "ur"
              }
            },
            output: { voice }
          }
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(500).json({ error: errorText });
    }

    const data = await response.json();
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Realtime token server listening on :${PORT}`);
});
