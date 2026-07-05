import { env } from "./env";

interface KimiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface KimiResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export async function callKimi(
  messages: KimiMessage[],
  temperature = 0.7
): Promise<string> {
  if (!env.kimiApiKey) {
    throw new Error("Kimi API key is not configured");
  }

  const response = await fetch(`${env.kimiBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.kimiApiKey}`,
    },
    body: JSON.stringify({
      model: "moonshot-v1-128k",
      messages,
      temperature,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Kimi API error: ${error}`);
  }

  const data = (await response.json()) as KimiResponse;
  return data.choices[0]?.message?.content || "";
}

export const BANGLA_SYSTEM_PROMPT = `আপনি একজন বিশেষজ্ঞ Amazon FBA পরামর্শদাতা যিনি বাংলাদেশি উদ্যোক্তাদের জন্য লিখছেন। 
সব বিষয় স্পষ্ট, সহজ বাংলায় ব্যাখ্যা করুন। 
টেকনিক্যাল Amazon শর্তগুলো ইংরেজিতে রাখুন কিন্তু বাংলায় ব্যাখ্যা দিন।
বুলেট পয়েন্ট, টেবিল, এবং ইমোজি ব্যবহার করুন পড়ার সুবিধার জন্য।
অতিরিক্ত জটিল বাক্য এড়িয়ে চলুন।`;
