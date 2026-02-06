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
      "You are a calm, encouraging health coach avatar.",
      "Speak in short, supportive sentences that users can follow in real time.",
      "When a user asks for a physical action, describe it as an immediate, natural gesture the avatar should perform.",
      "Focus on well-being, stress reduction, and achievable next steps.",
      "Be empathetic and non-judgmental; invite users to share how they feel."
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
                language: "en"
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
