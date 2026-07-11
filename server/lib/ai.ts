import { env } from "./env";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/* ──────────────────── Anthropic-compatible response type ──────────────────── */

interface AnthropicContentBlock {
  type: string;
  text: string;
}

interface AnthropicResponse {
  id?: string;
  type?: string;
  content?: AnthropicContentBlock[];
  error?: {
    message: string;
  };
}

/* ──────────────────── Fetch with timeout ──────────────────── */

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = 55000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

/* ──────────────────── Minimax (PRIMARY) — Anthropic-compatible ──────────────────── */

async function callMinimax(
  messages: ChatMessage[],
  temperature = 0.7,
  maxTokens = 4000
): Promise<string> {
  if (!env.minimaxApiKey) {
    throw new Error(
      "MINIMAX_API_KEY not set in Vercel environment variables."
    );
  }

  console.log("[AI] Calling Minimax API (Anthropic format)...", {
    model: env.minimaxModel,
    apiKeyLength: env.minimaxApiKey.length,
  });

  // Anthropic format: system is top-level, not a message
  let systemPrompt = "";
  const anthropicMessages: { role: "user" | "assistant"; content: string }[] = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      systemPrompt = msg.content;
    } else {
      anthropicMessages.push({ role: msg.role, content: msg.content });
    }
  }

  const requestBody: Record<string, unknown> = {
    model: env.minimaxModel,
    max_tokens: maxTokens,
    messages: anthropicMessages,
    temperature,
  };

  if (systemPrompt) {
    requestBody.system = systemPrompt;
  }

  const response = await fetchWithTimeout(
    `${env.minimaxBaseUrl}/v1/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.minimaxApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(requestBody),
    },
    55000 // 55 second timeout (Vercel max is 60s for cron, 10s for HTTP)
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Minimax API error (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as AnthropicResponse;

  if (data.error) {
    throw new Error(`Minimax API error: ${data.error.message}`);
  }

  const textContent = data.content?.find((c) => c.type === "text");
  const content = textContent?.text || "";
  console.log("[AI] Minimax response received, length:", content.length);
  return content;
}

/* ──────────────────── Public API ──────────────────── */

export async function callAIWithFallback(
  messages: ChatMessage[],
  temperature = 0.7,
  maxTokens = 4000
): Promise<string> {
  try {
    return await callMinimax(messages, temperature, maxTokens);
  } catch (error: any) {
    console.error("[CRITICAL AI FAILURE ALERT] AI research call failed!", {
      errorMessage: error.message,
      errorStack: error.stack,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
}

export async function* callAIStream(
  messages: ChatMessage[],
  temperature = 0.7,
  maxTokens = 4000
): AsyncGenerator<string, void, unknown> {
  const result = await callMinimax(messages, temperature, maxTokens);
  yield result;
}

export const BANGLA_SYSTEM_PROMPT = `আপনি একজন বিশেষজ্ঞ Amazon FBA পরামর্শদাতা যিনি বাংলাদেশি উদ্যোক্তাদের জন্য প্রফেশনাল রিপোর্ট তৈরি করেন।

## রিপোর্ট ফরম্যাট নিয়ম:

১. **শিরোনাম**: বড় হেডিং (#) দিয়ে প্রোডাক্ট নাম ও "Amazon FBA রিসার্চ রিপোর্ট" লিখুন
২. **ইমোজি ব্যবহার**: প্রতিটি সেকশনের শুরুতে উপযুক্ত ইমোজি ব্যবহার করুন
৩. **টেবিল**: তুলনামূলক ডেটা টেবিল আকারে উপস্থাপন করুন
৪. **বুলেট পয়েন্ট**: তথ্য বুলেট পয়েন্টে সাজান
৫. **হাইলাইট**: গুরুত্বপূর্ণ সংখ্যা বা শব্দ **বোল্ড** করে হাইলাইট করুন
৬. **সেকশন বিভাজন**: প্রতিটি সেকশন ## হেডিং দিয়ে আলাদা করুন
৭. **স্কোর কার্ড**: ১৩-পয়েন্ট চেকলিস্ট টেবিল আকারে দিন
৮. **রেজাল্ট বক্স**: চূড়ান্ত সুপারিশ আলাদা বক্সের মতো হাইলাইট করুন

## ভাষা শৈলী:
- স্পষ্ট, সহজ বাংলায় লিখুন
- টেকনিক্যাল টার্ম (BSR, FBA, PPC, MOQ) ইংরেজিতে রেখে বাংলায় ব্যাখ্যা দিন
- অতিরিক্ত জটিল বাক্য এড়িয়ে চলুন
- ব্যবসায়িক টোন ব্যবহার করুন (পেশাদার কিন্তু বন্ধুত্বপূর্ণ)`;


export async function buildGroundedSystemPrompt(marketplace: string) {
  const { getFeeRates, getPlaybookChunks } = await import("../queries/knowledge-base");
  const fees = await getFeeRates(marketplace, "referral");
  const fulfillment = await getFeeRates(marketplace, "fulfillment");
  const playbook = await getPlaybookChunks("profitability", 2);
  const today = new Date().toLocaleDateString("bn-BD");

  return `${BANGLA_SYSTEM_PROMPT}

## গ্রাউন্ডেড ডেটা (${marketplace}, as of ${today}):
রেফারেল ফি: ${JSON.stringify(fees)}
ফুলফিলমেন্ট ফি: ${JSON.stringify(fulfillment)}
প্রফিটেবিলিটি ফর্মুলা: ${playbook.map((p) => p.content).join("\n")}

নিয়ম: উপরের ডেটা ছাড়া অন্য কোনো ফি সংখ্যা অনুমান করবেন না। যদি তথ্য না থাকে, "নিশ্চিত না" লিখুন।`;
}
