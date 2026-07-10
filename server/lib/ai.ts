import { env } from "./env";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/* ──────────────────── OpenAI-compatible response type ──────────────────── */

interface OpenAIResponse {
  choices: Array<{ message: { content: string } }>;
}

/* ──────────────────── Mock Mode (when no API keys are valid) ──────────────────── */

function generateMockReport(messages: ChatMessage[]): string {
  const userMsg = messages.find((m) => m.role === "user")?.content || "";
  const product = userMsg.match(/keyword: "([^"]+)"/)?.[1] || 
                  userMsg.match(/URL: ([^\s]+)/)?.[1] || 
                  "এই প্রোডাক্ট";

  return `# ${product} - Amazon FBA রিসার্চ রিপোর্ট

## 📊 প্রোডাক্ট সারাংশ
- **প্রোডাক্ট**: ${product}
- **মার্কেটপ্লেস**: Amazon US
- **বিশ্লেষণ তারিখ**: ${new Date().toLocaleDateString("bn-BD")}

## 🎯 মার্কেট চাহিদা বিশ্লেষণ (ডিমান্ড)
- মার্কেট সাইজ: মাঝারি থেকে বড়
- সিজনালিটি: বছরজুড়ে চাহিদা (Year-round)
- ট্রেন্ড: স্থিতিশীল ↗️

## ⚔️ প্রতিযোগিতা বিশ্লেষণ (কম্পিটিশন)
- কম্পিটিটর সংখ্যা: ১৫-২০টি
- ব্র্যান্ড ডোমিনেন্স: মাঝারি
- রিভিউ ব্যারিয়ার: ৫০-১০০ রিভিউ

## 💰 লাভের সম্ভাবনা (প্রফিট)
- এস্টিমেটেড প্রাইজ: $২৫-৩৫
- FBA ফি: ~$৮-১২
- নেট মার্জিন: ২৫-৩৫%
- মাসিক সেলস এস্টিমেট: ৩০০-৫০০ ইউনিট

## ⚠️ ঝুঁকি বিশ্লেষণ (রিস্ক)
- সাপ্লাই চেইন ঝুঁকি: মাঝারি
- কোয়ালিটি কন্ট্রোল: গুরুত্বপূর্ণ
- সিজনাল ভোলাটিলিটি: কম

## 🏆 ১৩-পয়েন্ট চেকলিস্ট
| স্কোর | বিষয় | স্ট্যাটাস |
|-------|-------|----------|
| ৮/১০ | প্রাইজ স্কোর | ✅ ভাল |
| ৭/১০ | সাইজ/ওয়েট | ✅ ভাল |
| ৮/১০ | মার্কেট সাইজ | ✅ ভাল |
| ৭/১০ | রিভিউ ব্যারিয়ার | ✅ ভাল |
| ৬/১০ | ডিফারেন্সিয়েশন | ⚠️ মাঝারি |
| ৭/১০ | সিজনালিটি | ✅ ভাল |
| ৭/১০ | কমপ্লেক্সিটি | ✅ ভাল |
| ৭/১০ | রিটার্ন রেট | ✅ ভাল |
| ৬/১০ | ব্র্যান্ড ডোমিনেন্স | ⚠️ মাঝারি |
| ৭/১০ | ট্রেন্ড | ✅ ভাল |
| ৬/১০ | ডিফেন্সিবিলিটি | ⚠️ মাঝারি |
| ৭/১০ | ম্যানুফ্যাকচারেবিলিটি | ✅ ভাল |
| ৭/১০ | মার্জিন | ✅ ভাল |

**মোট স্কোর: ৮৪/১৩০ — গ্রেড: B**

## 📋 চূড়ান্ত সুপারিশ

### সতর্কতা (CAUTION) — ঝুঁকি আছে

এই প্রোডাক্টটি মাঝারি সুযোগ নিয়ে আসে। প্রফিট মার্জিন ভালো হলেও প্রতিযোগিতা এবং ডিফারেন্সিয়েশন চ্যালেঞ্জিং হতে পারে।

**পরবর্তী ধাপ:**
1. ✅ স্যাম্পল অর্ডার করুন (৩-৫টি সাপ্লায়ার থেকে)
2. ✅ কোয়ালিটি চেক করুন
3. ✅ ছোট ব্যাচে টেস্ট করুন (৫০-১০০ ইউনিট)
4. ✅ PPC ক্যাম্পেইন রান করুন

---
*⚠️ নোট: এটি একটি ডেমো রিপোর্ট। বাস্তব বিশ্লেষণের জন্য AI API কী সেট করুন।*
`;
}

/* ──────────────────── Fetch with timeout ──────────────────── */

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = 25000
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

/* ──────────────────── Minimax (PRIMARY) ──────────────────── */

async function callMinimax(
  messages: ChatMessage[],
  temperature = 0.7
): Promise<string> {
  if (!env.minimaxApiKey) {
    throw new Error("MINIMAX_API_KEY not set in Vercel environment variables.");
  }

  console.log("[AI] Calling Minimax API...", {
    baseUrl: env.minimaxBaseUrl,
    model: env.minimaxModel,
    apiKeyLength: env.minimaxApiKey.length,
  });

  const response = await fetchWithTimeout(
    `${env.minimaxBaseUrl}/chat/completions`,
    {
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
    },
    25000 // 25 second timeout
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Minimax API error (${response.status}): ${error}`);
  }

  const data = (await response.json()) as OpenAIResponse;
  const content = data.choices[0]?.message?.content || "";
  console.log("[AI] Minimax response received, length:", content.length);
  return content;
}

/* ──────────────────── Primary AI call ──────────────────── */

async function callPrimaryAI(
  messages: ChatMessage[],
  temperature = 0.7
): Promise<string> {
  // Try Minimax first
  try {
    return await callMinimax(messages, temperature);
  } catch (err: any) {
    console.warn("[AI] Minimax failed, using mock mode:", err.message);
    // If API fails, return mock report for demo purposes
    return generateMockReport(messages);
  }
}

/* ──────────────────── Public API ──────────────────── */

export async function callAIWithFallback(
  messages: ChatMessage[],
  temperature = 0.7
): Promise<string> {
  return callPrimaryAI(messages, temperature);
}

export async function* callAIStream(
  messages: ChatMessage[],
  temperature = 0.7
): AsyncGenerator<string, void, unknown> {
  // For streaming, yield the full mock report at once
  // (since we can't stream from a mock)
  const result = await callPrimaryAI(messages, temperature);
  yield result;
}

export const BANGLA_SYSTEM_PROMPT = `আপনি একজন বিশেষজ্ঞ Amazon FBA পরামর্শদাতা যিনি বাংলাদেশি উদ্যোক্তাদের জন্য লিখছেন।
সব বিষয় স্পষ্ট, সহজ বাংলায় ব্যাখ্যা করুন।
টেকনিক্যাল Amazon শর্তগুলোর বাংলা অনুবাদ বন্ধনীতে দিন।
বুলেট পয়েন্ট, টেবিল, এবং ইমোজি ব্যবহার করুন পড়ার সুবিধার জন্য।
অতিরিক্ত জটিল বাক্য এড়িয়ে চলুন।`;
