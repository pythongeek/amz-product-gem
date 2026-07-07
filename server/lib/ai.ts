import { callAI as callKimi, BANGLA_SYSTEM_PROMPT as KIMI_BANGLA_SYSTEM_PROMPT } from "./kimi";
import { env } from "./env";

/**
 * Minimax wrapper – same shape as kimi.callAI
 * Uses the same OpenAI-compatible schema Minimax exposes.
 */
export async function callMinimax(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  temperature = 0.7
): Promise<string> {
  if (!env.minimaxApiKey) {
    throw new Error("MINIMAX_API_KEY not set");
  }

  const base = env.minimaxBaseUrl ?? "https://api.minimax.chat/v1";

  const resp = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.minimaxApiKey}`,
    },
    body: JSON.stringify({
      model: env.minimaxModel ?? "abab6.5s-chat",
      messages,
      temperature,
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Minimax error ${resp.status}: ${txt}`);
  }

  const data = (await resp.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return data.choices[0]?.message?.content ?? "";
}

/**
 * Try Kimi first, fall back to Minimax on any error (network, 429, 5xx, etc.).
 */
export async function callAIWithFallback(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  temperature = 0.7
): Promise<string> {
  try {
    return await callKimi(messages, temperature);
  } catch (kimErr: any) {
    // Log but don’t expose internal details to the user
    console.warn("[AI] Kimi failed, trying Minimax fallback:", kimErr.message);
    try {
      return await callMinimax(messages, temperature);
    } catch (mmErr: any) {
      console.error("[AI] Both Kimi and Minimax failed:", mmErr.message);
      // Re-throw a generic error so the API layer can return a 502/504 nicely
      throw new Error("AI service temporarily unavailable");
    }
  }
}

export async function* callAIStream(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  temperature = 0.7
): AsyncGenerator<string, void, unknown> {
  // Try Kimi stream
  try {
    yield* await streamFromProvider(
      "kimi",
      env.aiBaseUrl ?? "https://api.moonshot.cn/v1", // Use aiBaseUrl for Kimi
      env.aiApiKey, // Use aiApiKey for Kimi
      env.aiModel ?? "moonshot-v1-128k", // Use aiModel for Kimi
      messages,
      temperature
    );
    return; // success
  } catch (e: any) {
    console.warn("[AI] Kimi stream failed, trying Minimax:", e.message);
  }

  // Fallback to Minimax stream
  yield* await streamFromProvider(
    "minimax",
    env.minimaxBaseUrl ?? "https://api.minimax.chat/v1",
    env.minimaxApiKey,
    env.minimaxModel ?? "abab6.5s-chat",
    messages,
    temperature
  );
}

// Generic SSE helper
async function* streamFromProvider(
  name: string,
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: any[],
  temperature: number
): AsyncGenerator<string> {
  if (!apiKey) {
    throw new Error(`${name.toUpperCase()}_API_KEY not set`);
  }

  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      stream: true, // <-- important
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`${name} stream error ${resp.status}: ${txt}`);
  }

  const reader = resp.body?.getReader();
  if (!reader) throw new Error(`${name}: no readable body`);

  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // Split by "\n\n" (SSE event boundary)
      let lines = buffer.split("\n\n");
      buffer = lines.pop() ?? ""; // keep incomplete tail
      for (const line of lines) {
        if (!line.trim()) continue;
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") return;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content ?? "";
            if (delta) yield delta;
          } catch {
            // ignore malformed lines
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export const BANGLA_SYSTEM_PROMPT = KIMI_BANGLA_SYSTEM_PROMPT;
