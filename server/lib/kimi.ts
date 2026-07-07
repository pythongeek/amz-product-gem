import { env } from "./env";

interface ChatMessage {
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
 * Try to call the primary AI API (Kimi/OpenAI compatible)
 */
async function callPrimaryAI(
  messages: ChatMessage[],
  temperature = 0.7
): Promise<string> {
  if (!env.aiApiKey) {
    throw new Error(
      "Primary AI API key is not configured. Set AI_API_KEY or KIMI_API_KEY in your environment variables."
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
    throw new Error(`Primary AI API error (${response.status}): ${await response.text()}`);
  }

  const data = (await response.json()) as ChatCompletionResponse;
  return data.choices[0]?.message?.content || "";
}

/**
 * Try to call the fallback AI API (MiniMax)
 */
async function callFallbackAI(
  messages: ChatMessage[],
  temperature = 0.7
): Promise<string> {
  const fallbackApiKey = process.env.MINIMAX_API_KEY || "";
  const fallbackBaseUrl = process.env.MINIMAX_BASE_URL || "https://api.minimax.io/v1";
  const fallbackModel = process.env.MINIMAX_MODEL || "abab6.5s-chat";

  if (!fallbackApiKey) {
    throw new Error(
      "Fallback AI API key is not configured. Set MINIMAX_API_KEY in your environment variables."
    );
  }

  const response = await fetch(`${fallbackBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${fallbackApiKey}`,
    },
    body: JSON.stringify({
      model: fallbackModel,
      messages,
      temperature,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Fallback AI API error (${response.status}): ${error}`);
  }

  const data = (await response.json()) as ChatCompletionResponse;
  return data.choices[0]?.message?.content || "";
}

export async function callAI(
  messages: ChatMessage[],
  temperature = 0.7
): Promise<string> {
  // Try primary AI first
  try {
    return await callPrimaryAI(messages, temperature);
  } catch (primaryError) {
    console.warn("Primary AI failed, trying fallback:", primaryError.message);
    
    // Try fallback AI
    try {
      return await callFallbackAI(messages, temperature);
    } catch (fallbackError) {
      // If both fail, throw a combined error
      throw new Error(
        `Both primary and fallback AI failed. Primary: ${primaryError.message}. Fallback: ${fallbackError.message}`
      );
    }
  }
}

export const BANGLA_SYSTEM_PROMPT = `আপনি একজন বিশেষজ্ঞ Amazon FBA পরামর্শদাতা যিনি বাংলাদেশি উদ্যোক্তাদের জন্য লিখছেন। \nসব বিষয় স্পষ্ট, সহজ বাংলায় ব্যাখ্যা করুন। \nটেকনিক্যাল Amazon শর্তগুলো ইংরেজিতে রাখুন কিন্তু বাংলায় ব্যাখ্যা দিন।\nবুলেট পয়েন্ট, টেবিল, এবং ইমোজি ব্যবহার করুন পড়ার সুবিধার জন্য।\nঅতিরিক্ত জটিল বাক্য এড়িয়ে চলুন。`;
