import { env } from "./env";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

/**
 * Call Kimi Code API (or any OpenAI-compatible provider)
 * For Kimi Code: use model "moonshot-v1-32k" or "moonshot-v1-8k" for code tasks
 * For long-form research: use "moonshot-v1-128k" (default)
 */
async function callKimi(
  messages: ChatMessage[],
  temperature = 0.7
): Promise<string> {
  if (!env.aiApiKey) {
    throw new Error(
      "AI_API_KEY (or KIMI_API_KEY) not set. Add it to Vercel environment variables."
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

  const data = (await response.json()) as ChatCompletionResponse;
  return data.choices[0]?.message?.content || "";
}

/**
 * Call MiniMax API (fallback)
 */
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

  const data = (await response.json()) as ChatCompletionResponse;
  return data.choices[0]?.message?.content || "";
}

/**
 * Try Kimi first, fall back to Minimax on any error.
 */
export async function callAIWithFallback(
  messages: ChatMessage[],
  temperature = 0.7
): Promise<string> {
  try {
    return await callKimi(messages, temperature);
  } catch (kimErr: any) {
    console.warn("[AI] Kimi failed, trying Minimax fallback:", kimErr.message);
    try {
      return await callMinimax(messages, temperature);
    } catch (mmErr: any) {
      console.error("[AI] Both Kimi and Minimax failed:", mmErr.message);
      throw new Error(`AI service temporarily unavailable. Kimi: ${kimErr.message}. Minimax: ${mmErr.message}`);
    }
  }
}

/**
 * Streaming generator — yields text chunks as they arrive.
 * Falls back from Kimi → Minimax automatically.
 */
export async function* callAIStream(
  messages: ChatMessage[],
  temperature = 0.7
): AsyncGenerator<string, void, unknown> {
  // Try Kimi stream first
  try {
    yield* streamFromProvider(
      "kimi",
      env.aiBaseUrl,
      env.aiApiKey,
      env.aiModel,
      messages,
      temperature
    );
    return;
  } catch (e: any) {
    console.warn("[AI] Kimi stream failed, trying Minimax:", e.message);
  }

  // Fallback to Minimax stream
  yield* streamFromProvider(
    "minimax",
    env.minimaxBaseUrl,
    env.minimaxApiKey,
    env.minimaxModel,
    messages,
    temperature
  );
}

async function* streamFromProvider(
  name: string,
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
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
      stream: true,
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

export const BANGLA_SYSTEM_PROMPT = `আপনি একজন বিশেষজ্ঞ Amazon FBA পরামর্শদাতা যিনি বাংলাদেশি উদ্যোক্তাদের জন্য লিখছেন।
সব বিষয় স্পষ্ট, সহজ বাংলায় ব্যাখ্যা করুন।
টেকনিক্যাল Amazon শর্তগুলো ইংরেজিতে রাখুন কিন্তু বাংলায় ব্যাখ্যা দিন।
বুলেট পয়েন্ট, টেবিল, এবং ইমোজি ব্যবহার করুন পড়ার সুবিধার জন্য।
অতিরিক্ত জটিল বাক্য এড়িয়ে চলুন।`;
