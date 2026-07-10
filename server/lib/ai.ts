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

  return `# 📊 ${product} - Amazon FBA রিসার্চ রিপোর্ট

---

## 📋 রিপোর্ট ওভারভিউ
| তথ্য | বিবরণ |
|------|--------|
| **প্রোডাক্ট** | ${product} |
| **মার্কেটপ্লেস** | Amazon US |
| **বিশ্লেষণ তারিখ** | ${new Date().toLocaleDateString("bn-BD")} |
| **রিপোর্ট টাইপ** | AI-জেনারেটেড বিশ্লেষণ |

---

# 📊 মার্কেট অ্যানালাইসিস

| মেট্রিক | ভ্যালু | মন্তব্য |
|---------|--------|--------|
| মার্কেট সাইজ | মাঝারি-বড় | স্থিতিশীল চাহিদা |
| সিজনালিটি | বছরজুড়ে | Year-round demand |
| ট্রেন্ড | ↗️ রাইজিং | ইতিবাচক গ্রোথ |
| চাহিদা স্কোর | **৭/১০** | ভালো চাহিদা |

**মার্কেট ইনসাইট:**
- ✅ এই প্রোডাক্টের চাহিদা সারা বছর স্থিতিশীল
- ✅ সিজনাল পিক: নভেম্বর-জানুয়ারি (Q4)
- ⚠️ নতুন সেলারদের জন্য মাঝারি প্রতিযোগিতা

---

# ⚔️ কম্পিটিশন অ্যানালাইসিস

| মেট্রিক | ভ্যালু | মন্তব্য |
|---------|--------|--------|
| কম্পিটিটর সংখ্যা | ১৫-২০টি | মাঝারি প্রতিযোগিতা |
| অ্যাভারেজ রিভিউ | ৫০-২০০ | এন্ট্রি সম্ভব |
| ব্র্যান্ড ডোমিনেন্স | ৪০% | মিশ্র মার্কেট |
| এন্ট্রি ব্যারিয়ার | **৬/১০** | মাঝারি |

**কম্পিটিশন ল্যান্ডস্কেপ:**
- 🏆 টপ সেলার: ৫০০+ রিভিউ
- 📈 মিড-টিয়ার: ৫০-২০০ রিভিউ
- 🎯 এন্ট্রি লেভেল: ১০-৫০ রিভিউ

---

# 💰 প্রফিটাবিলিটি অ্যানালাইসিস

| মেট্রিক | ভ্যালু | মন্তব্য |
|---------|--------|--------|
| এস্টিমেটেড প্রাইজ | **$২৫-৩৫** | সুইট স্পট |
| FBA ফি | ~$৮-১২ | স্ট্যান্ডার্ড |
| সোর্সিং কস্ট | $৮-১৫ | আলিবাবা/১৬৮৮ |
| নেট মার্জিন | **২৫-৩৫%** | ভালো |
| মাসিক সেলস | ৩০০-৫০০ ইউনিট | সম্ভাবনা |

**প্রফিট ক্যালকুলেশন:**
- সেলিং প্রাইজ: $৩০.০০
- FBA ফি: -$১০.০০
- সোর্সিং কস্ট: -$১২.০০
- প্রফিট: $৮.০০ (২৭% মার্জিন)

---

# ⚠️ রিস্ক অ্যানালাইসিস

### 🔴 হাই রিস্ক
- কোয়ালিটি কন্ট্রোল (সাপ্লায়ার ভেরিয়েশন)
- স্টকআউট (ইনভেন্টরি ম্যানেজমেন্ট)

### 🟡 মিডিয়াম রিস্ক
- প্রাইজ ওয়ার (কম্পিটিটর আন্ডারকাটিং)
- রিভিউ ম্যানিপুলেশন (অ্যামাজন পলিসি)

### 🟢 লো রিস্ক
- সিজনালিটি (বছরজুড়ে চাহিদা)
- লিস্টিং সাসপেনশন (কমপ্লায়েন্ট সহজ)

---

# 🏆 ১৩-পয়েন্ট ভ্যালিডেশন স্কোর

| # | ক্রাইটেরিয়া | স্কোর | ম্যাক্স | স্ট্যাটাস |
|---|-------------|-------|--------|----------|
| ১ | প্রাইজ স্কোর | **৮** | ১০ | ✅ |
| ২ | সাইজ/ওয়েট | **৭** | ১০ | ✅ |
| ৩ | মার্কেট সাইজ | **৮** | ১০ | ✅ |
| ৪ | রিভিউ ব্যারিয়ার | **৭** | ১০ | ✅ |
| ৫ | ডিফারেন্সিয়েশন | **৬** | ১০ | ⚠️ |
| ৬ | সিজনালিটি | **৭** | ১০ | ✅ |
| ৭ | কমপ্লেক্সিটি | **৭** | ১০ | ✅ |
| ৮ | রিটার্ন রেট | **৭** | ১০ | ✅ |
| ৯ | ব্র্যান্ড ডোমিনেন্স | **৬** | ১০ | ⚠️ |
| ১০ | ট্রেন্ড | **৭** | ১০ | ✅ |
| ১১ | ডিফেন্সিবিলিটি | **৬** | ১০ | ⚠️ |
| ১২ | ম্যানুফ্যাকচারেবিলিটি | **৭** | ১০ | ✅ |
| ১৩ | মার্জিন | **৭** | ১০ | ✅ |
| | **মোট** | **৮৪** | **১৩০** | |

---

# 🎯 চূড়ান্ত সুপারিশ

## গ্রেড: **B** | স্কোর: **৮৪/১৩০**

### ⚠️ সতর্কতা (CAUTION) — ঝুঁকি আছে

> এই প্রোডাক্টটি মাঝারি সুযোগ নিয়ে আসে। প্রফিট মার্জিন ভালো হলেও প্রতিযোগিতা এবং ডিফারেন্সিয়েশন চ্যালেঞ্জিং হতে পারে।

---

## 📋 পরবর্তী ধাপ (Action Plan)

| ধাপ | কাজ | টাইমলাইন |
|-----|-----|----------|
| ১ | ✅ স্যাম্পল অর্ডার (৩-৫ সাপ্লায়ার) | সপ্তাহ ১ |
| ২ | ✅ কোয়ালিটি চেক ও তুলনা | সপ্তাহ ২ |
| ৩ | ✅ ছোট ব্যাচ টেস্ট (৫০-১০০ ইউনিট) | সপ্তাহ ৩-৪ |
| ৪ | ✅ PPC ক্যাম্পেইন লঞ্চ | সপ্তাহ ৫ |

---

*📝 নোট: এটি একটি ডেমো রিপোর্ট। বাস্তব বিশ্লেষণের জন্য AI API কী সেট করুন।*
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
