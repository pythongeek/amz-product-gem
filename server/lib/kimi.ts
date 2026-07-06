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

export async function callAI(
  messages: ChatMessage[],
  temperature = 0.7
): Promise<string> {
  if (!env.aiApiKey) {
    throw new Error(
      "AI API key is not configured. Set AI_API_KEY or KIMI_API_KEY in your environment variables."
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
    throw new Error(`AI API error (${response.status}): ${error}`);
  }

  const data = (await response.json()) as ChatCompletionResponse;
  return data.choices[0]?.message?.content || "";
}

export const BANGLA_SYSTEM_PROMPT = `আপনি একজন বিশেষজ্ঞ Amazon FBA পরামর্শদাতা যিনি বাংলাদেশি উদ্যোক্তাদের জন্য লিখছেন। 
সব বিষয় স্পষ্ট, সহজ বাংলায় ব্যাখ্যা করুন। 
টেকনিক্যাল Amazon শর্তগুলো ইংরেজিতে রাখুন কিন্তু বাংলায় ব্যাখ্যা দিন।
বুলেট পয়েন্ট, টেবিল, এবং ইমোজি ব্যবহার করুন পড়ার সুবিধার জন্য।
অতিরিক্ত জটিল বাক্য এড়িয়ে চলুন।`;
