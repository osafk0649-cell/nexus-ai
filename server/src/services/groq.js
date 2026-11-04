const endpoint = "https://api.groq.com/openai/v1/chat/completions";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// "try again in 25.8s" / "1m2.5s" / "850ms" se wait time nikalta hai
function getWaitMs(message) {
  const match = message.match(/try again in\s+(?:(\d+)m)?\s*([\d.]+)?(ms|s)?/i);
  if (!match) return 5000;
  const minutes = Number(match[1] || 0);
  const value = Number(match[2] || 0);
  const unit = (match[3] || "s").toLowerCase();
  const ms = minutes * 60000 + (unit === "ms" ? value : value * 1000);
  return Math.ceil(ms) + 500;
}

export async function askGroq({ system, user, json = false, temperature = 0.3 }) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is missing. Add it to server/.env.");
  }

  const primary = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
  const fallback = process.env.GROQ_FALLBACK_MODEL || "openai/gpt-oss-20b";
  const models = primary === fallback ? [primary] : [primary, fallback];
  const maxTokens = Number(process.env.GROQ_MAX_TOKENS) || 1500;

  const buildBody = (model) => {
    const body = {
      model,
      temperature,
      max_completion_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ]
    };
    // reasoning_effort sirf gpt-oss models pe chalta hai
    if (model.startsWith("openai/gpt-oss")) body.reasoning_effort = "low";
    if (json) body.response_format = { type: "json_object" };
    return body;
  };

  let lastError;
  const maxAttempts = 5;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const model = models[attempt % models.length];

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(buildBody(model))
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok) {
      return data.choices?.[0]?.message?.content || "";
    }

    const message = data?.error?.message || `Groq API request failed (${response.status})`;
    lastError = new Error(message);

    // "Request too large" wait karne se fix nahi hota, to retry nahi karenge
    const tooLarge = /request too large|reduce your message size/i.test(message);
    if (response.status !== 429 || tooLarge || attempt === maxAttempts - 1) break;

    // Pehli baar rate limit mile to turant dusre model pe jao (uska alag limit bucket hota hai).
    // Uske baad Groq ke bataye time tak ruk ke retry karo.
    if (attempt === 0 && models.length > 1) continue;
    await sleep(getWaitMs(message));
  }

  throw lastError;
}

export function parseJson(text) {
  try { return JSON.parse(text); } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("The AI returned an invalid JSON response. Please retry.");
  }
}