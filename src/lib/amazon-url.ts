import { z } from "zod";

/**
 * Accepts either a raw keyword ("plant basket") or a full Amazon search URL
 * like https://www.amazon.com/s?k=plant+basket&crid=...&sprefix=...
 * and returns the normalized keyword plus detected marketplace.
 * 
 * Examples:
 * - "plant basket" → { keyword: "plant basket", marketplace: "US" }
 * - "https://www.amazon.com/s?k=plant+basket&crid=..." → { keyword: "plant basket", marketplace: "US" }
 * - "https://www.amazon.co.uk/s?k=plant+basket" → { keyword: "plant basket", marketplace: "UK" }
 */
export function parseAmazonSearchInput(input: string): {
  keyword: string;
  marketplace: "US" | "UK" | "DE" | "CA" | "FR" | "IT" | "ES" | "JP";
} {
  const trimmed = input.trim();

  try {
    const url = new URL(trimmed);
    const k = url.searchParams.get("k");
    if (k) {
      const host = url.hostname;
      const marketplace = detectMarketplaceFromHost(host);
      return { keyword: decodeURIComponent(k.replace(/\+/g, " ")), marketplace };
    }
  } catch {
    // not a URL — fall through to treating input as a raw keyword
  }

  // If not a URL or no 'k' param, treat as raw keyword
  return { keyword: trimmed, marketplace: "US" };
}

function detectMarketplaceFromHost(host: string): "US" | "UK" | "DE" | "CA" | "FR" | "IT" | "ES" | "JP" {
  if (host.includes(".co.uk")) return "UK";
  if (host.includes(".de")) return "DE";
  if (host.includes(".fr")) return "FR";
  if (host.includes(".it")) return "IT";
  if (host.includes(".es")) return "ES";
  if (host.includes(".ca")) return "CA";
  if (host.includes(".co.jp")) return "JP";
  return "US";
}

// Zod schema for validation
export const AmazonSearchInputSchema = z.object({
  input: z.string().min(1, "Input is required"),
  marketplace: z.enum(["US", "UK", "DE", "CA", "FR", "IT", "ES", "JP"]).optional(),
});

export type AmazonSearchInput = z.infer<typeof AmazonSearchInputSchema>;