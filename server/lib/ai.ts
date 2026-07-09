import { env } from "./env";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/* ──────────────────── Format detection ──────────────────── */

function detectFormat(): "openai" | "claude" {
  if (env.aiFormat) return env.aiFormat;
  const url = env.aiBaseUrl.toLowerCase();
  if (url.includes("anthropic") || url.includes("claude")) return "claude";
  return "openai";
}

/* ──────────────────── OpenAI-compatible ──────────────────── */

interface OpenAIResponse {
  choices: Array<{ message: { content: string } }>;
}

async function callOpenAI(
  messages: ChatMessage[],
  temperature = 0.7
): Promise<string> {
  if (!env.aiApiKey) {
    throw new Error(
      "AI_API_KEY (or KIMI_API_KEY / OPENAI_API_KEY) not set. Add it to Vercel environment variables."
    );
  }

  const response = await fetch(`${env.aiBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.aiApiKey}`,
    },
    body: JSON.stringify({
      model: env.aiModel,
      messages,
      temperature,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Kimi API error (${response.status}): ${error}`);
  }

  const data = (await response.json()) as OpenAIResponse;
  return data.choices[0]?.message?.content || "";
}

/* ──────────────────── Claude-compatible ──────────────────── */

interface ClaudeResponse {
  content: Array<{ type: string; text: string }>;
  usage?: { input_tokens: number; output_tokens: number };
}

async function callClaude(
  messages: ChatMessage[],
  temperature = 0.7
): Promise<string> {
  if (!env.aiApiKey) {
    throw new Error(
      "AI_API_KEY (or CLAUDE_API_KEY / ANTHROPIC_API_KEY) not set. Add it to Vercel environment variables."
    );
  }

  // Claude uses system as a top-level param, not a message
  const systemMsg = messages.find((m) => m.role === "system");
  const chatMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role, content: m.content }));

  const response = await fetch(`${env.aiBaseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.aiApiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: env.aiModel,
      max_tokens: 4096,
      system: systemMsg?.content,
      messages: chatMessages,
      temperature,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error (${response.status}): ${error}`);
  }

  const data = (await response.json()) as ClaudeResponse;
  return data.content?.[0]?.text || "";
}

/* ──────────────────── Primary AI call ──────────────────── */

async function callPrimaryAI(
  messages: ChatMessage[],
  temperature = 0.7
): Promise<string> {
  const format = detectFormat();
  if (format === "claude") {
    return callClaude(messages, temperature);
  }
  return callOpenAI(messages, temperature);
}

/* ──────────────────── MiniMax (fallback) ──────────────────── */

async function callMinimax(
  messages: ChatMessage[],
  temperature = 0.7
): Promise<string> {
  if (!env.minimaxApiKey) {
    throw new Error("MINIMAX_API_KEY not set");
  }

  const response = await fetch(`${env.minimaxBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.minimaxApiKey}`,
    },
    body: JSON.stringify({
      model: env.minimaxModel,
      messages,
      temperature,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Minimax API error (${response.status}): ${error}`);
  }

  const data = (await response.json()) as OpenAIResponse;
  return data.choices[0]?.message?.content || "";
}

/* ──────────────────── Fallback wrapper ──────────────────── */

export async function callAIWithFallback(
  messages: ChatMessage[],
  temperature = 0.7
): Promise<string> {
  try {
    return await callPrimaryAI(messages, temperature);
  } catch (primaryErr: any) {
    console.warn("[AI] Primary failed, trying Minimax fallback:", primaryErr.message);
    try {
      return await callMinimax(messages, temperature);
    } catch (mmErr: any) {
      console.error("[AI] Both primary and Minimax failed:", mmErr.message);
      throw new Error(
        `AI service temporarily unavailable. Primary: ${primaryErr.message}. Minimax: ${mmErr.message}`
      );
    }
  }
}

/* ──────────────────── Streaming ──────────────────── */

export async function* callAIStream(
  messages: ChatMessage[],
  temperature = 0.7
): AsyncGenerator<string, void, unknown> {
  const format = detectFormat();

  // Try primary stream first
  try {
    if (format === "claude") {
      yield* streamClaude(messages, temperature);
    } else {
      yield* streamOpenAI(messages, temperature);
    }
    return;
  } catch (e: any) {
    console.warn("[AI] Primary stream failed, trying Minimax:", e.message);
  }

  // Fallback to Minimax stream
  yield* streamOpenAI(
    messages,
    temperature,
    env.minimaxBaseUrl,
    env.minimaxApiKey,
    env.minimaxModel
  );
}

async function* streamOpenAI(
  messages: ChatMessage[],
  temperature: number,
  baseUrl: string = env.aiBaseUrl,
  apiKey: string = env.aiApiKey,
  model: string = env.aiModel
): AsyncGenerator<string> {
  if (!apiKey) throw new Error("API key not set");

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
      stream: true,
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`OpenAI stream error ${resp.status}: ${txt}`);
  }

  const reader = resp.body?.getReader();
  if (!reader) throw new Error("No readable body");

  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() ?? "";
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

async function* streamClaude(
  messages: ChatMessage[],
  temperature: number
): AsyncGenerator<string> {
  if (!env.aiApiKey) throw new Error("Claude API key not set");

  const systemMsg = messages.find((m) => m.role === "system");
  const chatMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role, content: m.content }));

  const resp = await fetch(`${env.aiBaseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.aiApiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: env.aiModel,
      max_tokens: 4096,
      system: systemMsg?.content,
      messages: chatMessages,
      temperature,
      stream: true,
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Claude stream error ${resp.status}: ${txt}`);
  }

  const reader = resp.body?.getReader();
  if (!reader) throw new Error("No readable body");

  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          try {
            const json = JSON.parse(data);
            // Claude streaming format: delta.text
            const delta = json.delta?.text ?? "";
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

export const BANGLA_SYSTEM_PROMPT = `আপনি একজন বিশেষজ্ঞ Amazon FBA পরামর্শদাতা যিনি বাংলাদেশি উদ্যোক্তাদের জন্য লিখছেন।
সব বিষয় স্পষ্ট, সহজ বাংলায় ব্যাখ্যা করুন।
টেকনিক্যাল Amazon শর্তগুলো ইংরেজিতে রাখুন কিন্তু বাংলায় ব্যাখ্যা দিন।
বুলেট পয়েন্ট, টেবিল, এবং ইমোজি ব্যবহার করুন পড়ার সুবিধার জন্য।
অতিরিক্ত জটিল বাক্য এড়িয়ে চলুন।`;
